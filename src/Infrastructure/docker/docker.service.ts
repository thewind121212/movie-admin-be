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
            '-c:v', 'libx264',
            '-c:a', 'copy',
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

        const watcher = chokidar.watch(processedDir, {
            ignored: (file) => file.endsWith('.webp'),
        });

        watcher.on('add', (filePath) => {
            this.logger.log(`File ${filePath} has been added`);

            if (batchPool.length === BATCH_SIZE) {
                this.logger.warn('ffmpegLog:', ffmpegLog);
                console.log('Batch pool is full, processing...');
                this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName }, {
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

        if (batchPool.length > 0) {
            await new Promise(async (resolve) => {
                chokidar.watch(processedDir, {
                    persistent: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 2000,
                        pollInterval: 100,
                    },
                }).once('add', async () => {
                    await this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName }, {
                        jobId: `${videoName}-${uuidv4()}`,
                    });
                    resolve(true);
                });
            });
            this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                jobId: `${videoName}-${uuidv4()}`,
            });
        } else {
            this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                jobId: `${videoName}-${uuidv4()}`,
            });
        }

        //wait the bull with movie name to finish
        const isQueueFinished = await this.checkQueue(this.tsChunkProcessQueue, videoName);
        if (isQueueFinished) {
            this.logger.log('Queue finished');
            //clear the queue
            this.tsChunkProcessQueue.clean(0, 'completed');
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
            this.tsChunkProcessQueue.clean(0, 'completed');
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

    async renderTSchunkThumnail(videoName: string, tsChunkName: string) {
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

