/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { getVideoDurationFromLog } from './docker.utils';
import path from 'path';
import chokidar from 'chokidar';
import { BATCH_SIZE } from 'src/core/movie/movie.config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { checkQueueFinished } from 'src/core/movie/workerServices/postProcessTsChunk.worker';
import { S3Service } from '../s3/s3.service';
import { clear } from 'console';



// this is a workaround to use promisify with exec
// const execPromise = promisify(spawn);

// config output



@Injectable()

export class DockerService {
    private readonly logger = new Logger(DockerService.name);

    constructor(
        @InjectQueue('video-post-process')
        private readonly tsChunkProcessQueue: Queue,
        @Inject('DOCKER') private readonly docker: Docker,
        @Inject('CHECK_QUEUE_FINISHED') private readonly checkQueue: typeof checkQueueFinished,
    ) {
    }

    async runOnHostFFmpeg(inputFilePath: string, videoName: string): Promise<void> {

        // unlink recursively the processed folder
        await fs.promises.rm(path.resolve(`./processed/${videoName}`), { recursive: true, force: true });
        await fs.promises.mkdir(path.resolve(`./processed/${videoName}`), { recursive: true });
        await fs.promises.mkdir(path.resolve(`./processed/${videoName}/thumbnail`), { recursive: true });


        const segmentPatternHost = `${path.resolve('processed')}/${videoName}/segment_%03d.ts`;
        const outputPlaylistHost = `${path.resolve('processed')}/${videoName}/index.m3u8`;

        const cmd = [
            '-i', inputFilePath,
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '128k',
            '-crf', '22',
            '-b:a', '128k',
            '-hls_time', '4',
            '-hls_list_size', '0',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segmentPatternHost,
            '-f', 'hls', outputPlaylistHost,
        ];

        const processedDir = path.resolve(`./processed/${videoName}`);

        let batchPool: string[] = [];
        let ffmpegLog = '';

        let tsChunkCount = 0;
        let thumbnails: string[] = [];

        const watcher = chokidar.watch(processedDir, {
            ignored: (file) => file.endsWith('.webp'),
        });

        const watcherThumbnail = chokidar.watch(`${path.resolve(`./processed/${videoName}/thumbnail`)}`, {
            ignored: (file) => file.endsWith('.ts'),
        });

        watcherThumbnail.on('add', (filePath) => {
            thumbnails.push(filePath);
        });


        watcher.on('add', (filePath) => {
            this.logger.log(`File ${filePath} has been added`);
            tsChunkCount++;
            if (batchPool.length === BATCH_SIZE) {
                // this.logger.warn('ffmpegLog:', ffmpegLog);
                console.log('Batch pool is full, processing...');
                this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName, batchType: 'normal' }, {
                    jobId: `${videoName}-${uuidv4()}`,
                });
                batchPool = [];
                batchPool.length = 0;  // Reset the batch pool after processing
                ffmpegLog = ''; // Reset the ffmpeg log after process batch
            }
            batchPool.push(filePath);
        });


        const process = spawn('ffmpeg', cmd);

        process.stdout.on('data', (data) => {
            this.logger.log(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            ffmpegLog += data + '\n';
        });

        await new Promise((resolve) => {
            process.on('close', async () => {
                this.logger.log('FFmpeg processing completed');
                resolve(true);
            });
        })

        // athouth the process is completed, we need to check if there are any remaining files in the batch pool

        const restBatch: string[] = []

        await new Promise((resolve) => {
            const interval = setInterval(() => {
                this.logger.log('Checking for remaining batch...');
                if (batchPool.length > 0) {
                    this.logger.log('OPPS! Remaining batch detected');
                    restBatch.push(...batchPool);
                    batchPool = [];
                    batchPool.length = 0;
                } else {
                    this.logger.log('No remaining batch detected');
                    clearInterval(interval);
                    resolve(true);
                }
            }, 5000);
        })

        if (restBatch.length > 0) {
            this.logger.log('Processing remaining batch...');
            this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: restBatch, videoName, batchType: 'rest' }, {
                jobId: `${videoName}-${uuidv4()}`,
            });
        }


        await new Promise((resolve) => {
            const interval = setInterval(() => {
                this.logger.log('Thumbnail Rendered: ' + `${(thumbnails.length / tsChunkCount * 100).toFixed(2)} ` + '%');
                if (thumbnails.length === tsChunkCount - 1) {
                    this.logger.log('Snapshot count is equal to ts chunk count');
                    clearInterval(interval);
                    resolve(true);
                }
            }, 5000);
        })


        this.tsChunkProcessQueue.add('upload-snapshot', { snapShotPaths: thumbnails, videoName }, {
            jobId: `${videoName}-${uuidv4()}`,
        });


        const isQueueFinished = await this.checkQueue(this.tsChunkProcessQueue, videoName);
        if (isQueueFinished) {
            this.logger.log('Queue finished');
            await new Promise((resolve) => { setTimeout(() => { resolve(true) }, 3000) });
            watcher.close().then(() => {
                this.logger.log(`Watcher folder ${path.resolve(`./processed/${videoName}`)} closed`);
            })
            watcherThumbnail.close().then(() => {
                this.logger.log(`Watcher folder ${path.resolve(`./processed/${videoName}/thumbnail`)} closed`);
            }
            )
            batchPool = [];
            batchPool.length = 0;
            thumbnails = [];
            thumbnails.length = 0;
            tsChunkCount = 0;
            this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                jobId: `${videoName}-${uuidv4()}`,
            })

            return
        }


    }


    async runFFmpegDocker(inputFilePath: string, videoName: string): Promise<void> {
        const imageName = 'linuxserver/ffmpeg';

        //clearn up the folder at start
        await fs.promises.rm(path.resolve(`./processed/${videoName}`), { recursive: true, force: true });

        const segmentPattern = `/output/segment_%03d.ts`;
        const outputPlaylist = `/output/index.m3u8`;

        const cmd = [
            '-i', inputFilePath,
            '-c:v', 'libx264',
            '-c:a', 'copy',
            '-crf', '22',
            '-b:a', '128k',
            '-hls_time', '4',
            '-hls_list_size', '0',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segmentPattern,
            '-f', 'hls', outputPlaylist,
        ];


        let batchPool: string[] = []

        try {

            const container = await this.docker.createContainer({
                Image: imageName,
                Cmd: cmd,
                HostConfig: {
                    Binds: [
                        `${path.resolve(`./processed/${videoName}`)}:/output:rw`,
                        `${path.resolve(`./processed/${videoName}`)}:/output/thumbnail:rw`,
                    ],
                },
            });

            await container.start();


            const watcher = chokidar.watch(`${path.resolve(`./processed/${videoName}`)}`, {
                ignored: (file) => file.endsWith('.webp'),
            });
            watcher.on('add', (path) => {
                this.logger.log(`File ${path} has been added`);
                if (batchPool.length === BATCH_SIZE) {
                    this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName }, {
                        jobId: `${videoName}-${uuidv4()}`,
                    })
                    batchPool = []
                    batchPool.length = 0;
                }
                batchPool.push(path)
            })
            await container.wait();

            await container.remove();
            if (batchPool.length > 0) {
                await new Promise(async (resolve) =>
                    chokidar.watch([...batchPool], {
                        persistent: true,
                        awaitWriteFinish: {
                            stabilityThreshold: 2000,
                            pollInterval: 100
                        }
                    }).once('add', async () => {
                        await this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName }, {
                            jobId: `${videoName}-${uuidv4()}`,
                        })
                        return resolve(true)
                    }))
                this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                    jobId: `${videoName}-${uuidv4()}`,
                })
            } else {
                this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                    jobId: `${videoName}-${uuidv4()}`,
                })
            }

            watcher.close().then(() => {
                this.logger.log(`Watcher folder ${path.resolve(`./processed/${videoName}`)} closed`);
            })


            this.logger.log(`FFmpeg completed successfully!`);
            // check if the queue is finished
            const isQueueFinished = await this.checkQueue(this.tsChunkProcessQueue, videoName);
            if (isQueueFinished) {
                this.logger.log('Queue finished');
                return
            }

        } catch (error) {
            this.logger.error(`Error running FFmpeg in Docker: ${error}`);
            throw error;
        }
    }


    async calcDurationMovie(movieS3path: string): Promise<{
        isError: boolean,
        message?: string,
        duration: number,
    }> {

        try {
            const container = this.docker.getContainer('ffmpeg-container')

            const cmd = [
                'ffmpeg',
                '-i', `${movieS3path}`,
            ];


            const exec = await container.exec({
                Cmd: cmd,
                AttachStderr: true,
                AttachStdout: true,
            })


            const stream = await exec.start({ hijack: true, stdin: true });

            let outputLog = ''

            const returnData: {
                isError: boolean,
                message?: string,
                duration: number,
            } = {
                isError: true,
                duration: 0
            }

            await new Promise((resolve) => {
                stream.on('data', (chunk) => {
                    outputLog = outputLog + chunk.toString()
                });

                stream.on('end', () => {
                    console.log('Exec command finished');
                    returnData.duration = getVideoDurationFromLog(outputLog)
                    returnData.isError = false
                    resolve(returnData)
                });

                stream.on('error', (err) => {
                    console.error('Error during exec command:', err);
                    console.log(err)
                    returnData.message = err.message
                    resolve(returnData)
                });
            })


            return returnData

        } catch (error) {
            return {
                message: error,
                isError: true,
                duration: 0,
            }
        }


    }

    async renderTSchunkThumnail(videoName: string, tsChunkName: string): Promise<void> {
        const container = this.docker.getContainer('ffmpeg-container')
        const cmd = [
            "ffmpeg",
            "-i", `/output/${videoName}/${tsChunkName}`,
            "-ss", "00:00:01",
            "-vframes", "1",
            "-c:v", "libwebp",
            "-q:v", "50",
            `/output/${videoName}/thumbnail/${tsChunkName.replace('.ts', '')}.webp`
        ]


        const exec = await container.exec({
            Cmd: cmd,
            AttachStderr: true,
            AttachStdout: true,
        })
        const stream = await exec.start({ hijack: true, stdin: true });

        stream.on('end', () => {
            console.log('Exec command finished');
        });

        stream.on('error', (err) => {
            console.error('Error during exec command:', err);
        });



    }
}

