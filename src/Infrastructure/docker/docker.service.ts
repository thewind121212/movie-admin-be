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
import { spawn, exec } from 'child_process';
import { checkQueueFinished } from 'src/core/movie/workerServices/postProcessTsChunk.worker';
import { CONCURRENT_TS_CHUNK_PROCESS, FFMPEG_PROCESS_INTERVAL } from 'src/core/movie/movie.config';
import { promisify } from 'util';
import cliProgress from 'cli-progress';
import chalk from 'chalk';



// this is a workaround to use promisify with exec
const execPromise = promisify(exec);

// config output



@Injectable()

export class DockerService {
    private readonly logger = new Logger(DockerService.name);

    constructor(
        @InjectQueue('video-post-process')
        // eslint-disable-next-line no-unused-vars
        private readonly tsChunkProcessQueue: Queue,
        // eslint-disable-next-line no-unused-vars
        @Inject('DOCKER') private readonly docker: Docker,
        // eslint-disable-next-line no-unused-vars
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
            '-c:a', 'copy',
            '-hls_time', '4',
            '-hls_list_size', '0',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segmentPatternHost,
            '-f', 'hls', outputPlaylistHost,
        ];

        const processedDir = path.resolve(`./processed/${videoName}`);

        let batchPool: string[] = [];

        let tsChunkCount = 0;
        let thumbnails: string[] = [];

        const watcher = chokidar.watch(processedDir, {});



        watcher.on('add', (filePath) => {
            if (filePath.endsWith('.webp')) {
                thumbnails.push(filePath);
                return
            }

            tsChunkCount++;
            if (batchPool.length === BATCH_SIZE) {
                void this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName, batchType: 'normal' }, {
                    jobId: `${videoName}-${uuidv4()}`,
                });
                batchPool = [];
                batchPool.length = 0;
            }
            batchPool.push(filePath);
        });


        const process = spawn('ffmpeg', cmd);

        process.stdout.on('data', (data) => {
            this.logger.log(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            this.logger.error(`stderr: ${data}`);
        });

        process.on('error', (error) => {
            this.logger.error(`error: ${error}`);
        });

        await new Promise((resolve) => {
            process.on('close', () => {
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
            void this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: restBatch, videoName, batchType: 'rest' }, {
                jobId: `${videoName}-${uuidv4()}`,
            });
        }


        const progressBar = new cliProgress.SingleBar({
            format: `Progress snapshot segment | ${chalk.blue('{bar}')} | {percentage}%`,
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true
        }, cliProgress.Presets.rect);

        progressBar.start(tsChunkCount, thumbnails.length);

        await new Promise((resolve) => {
            const interval = setInterval(() => {
                progressBar.update(thumbnails.length);
                if (thumbnails.length === tsChunkCount - 1) {
                    progressBar.update(tsChunkCount);
                    console.log('\n');
                    this.logger.log('All snapshot has been processed');
                    progressBar.stop();
                    clearInterval(interval);
                    resolve(true);
                }
            }, 5000);
        })


        void this.tsChunkProcessQueue.add('upload-snapshot', { snapShotPaths: thumbnails, videoName }, {
            jobId: `${videoName}-${uuidv4()}`,
        });


        const isQueueFinished = await this.checkQueue(this.tsChunkProcessQueue, videoName);
        if (isQueueFinished) {
            this.logger.log('Queue finished');
            await new Promise((resolve) => { setTimeout(() => { resolve(true) }, 3000) });
            void watcher.close().then(() => {
                this.logger.log(`Watcher folder ${path.resolve(`./processed/${videoName}`)} closed`);
            })
            batchPool = [];
            batchPool.length = 0;
            thumbnails = [];
            thumbnails.length = 0;
            tsChunkCount = 0;
            void this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                jobId: `${videoName}-${uuidv4()}`,
            })

            return
        }


    }


    async runFFmpegDocker(inputFilePath: string, videoName: string): Promise<void> {
        const imageName = 'linuxserver/ffmpeg';


        // unlink recursively the processed folder
        await fs.promises.rm(path.resolve(`./processed/${videoName}`), { recursive: true, force: true });
        await fs.promises.mkdir(path.resolve(`./processed/${videoName}`), { recursive: true });
        await fs.promises.mkdir(path.resolve(`./processed/${videoName}/thumbnail`), { recursive: true });

        //clearn up the folder at start
        await fs.promises.rm(path.resolve(`./processed/${videoName}`), { recursive: true, force: true });

        const segmentPattern = `/output/segment_%03d.ts`;
        const outputPlaylist = `/output/index.m3u8`;

        const cmd = [
            '-i', inputFilePath,
            '-c:v', 'copy',
            '-c:a', 'copy',
            '-hls_time', '4',
            '-hls_list_size', '0',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segmentPattern,
            '-f', 'hls', outputPlaylist,
        ];




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


            const processedDir = path.resolve(`./processed/${videoName}`);


            let batchPool: string[] = [];

            let tsChunkCount = 0;
            let thumbnails: string[] = [];

            const watcher = chokidar.watch(processedDir, {
            });





            watcher.on('add', (filePath) => {
                if (filePath.endsWith('.webp')) {
                    thumbnails.push(filePath);
                    return
                }
                tsChunkCount++;
                if (batchPool.length === BATCH_SIZE) {
                    void this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: batchPool, videoName, batchType: 'normal' }, {
                        jobId: `${videoName}-${uuidv4()}`,
                    });
                    batchPool = [];
                    batchPool.length = 0;
                }
                batchPool.push(filePath);
            });


            await container.start();


            await container.wait();

            this.logger.log('FFmpeg processing completed');


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
                void this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: restBatch, videoName, batchType: 'rest' }, {
                    jobId: `${videoName}-${uuidv4()}`,
                });
            }


            const progressBar = new cliProgress.SingleBar({
                format: `Progress snapshot segment | ${chalk.blue('{bar}')} | {percentage}%`,
                barCompleteChar: '█',
                barIncompleteChar: '░',
                hideCursor: true
            }, cliProgress.Presets.rect);

            progressBar.start(tsChunkCount, thumbnails.length);

            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    progressBar.update(thumbnails.length);
                    if (thumbnails.length === tsChunkCount - 1) {
                        progressBar.update(tsChunkCount);
                        console.log('\n');
                        this.logger.log('All snapshot has been processed');
                        progressBar.stop();
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 5000);
            })


            void this.tsChunkProcessQueue.add('upload-snapshot', { snapShotPaths: thumbnails, videoName }, {
                jobId: `${videoName}-${uuidv4()}`,
            });


            const isQueueFinished = await this.checkQueue(this.tsChunkProcessQueue, videoName);
            if (isQueueFinished) {
                this.logger.log('Queue finished');
                await new Promise((resolve) => { setTimeout(() => { resolve(true) }, 3000) });

                await container.remove();
                void watcher.close().then(() => {
                    this.logger.log(`Watcher folder ${path.resolve(`./processed/${videoName}`)} closed`);
                })
                batchPool = [];
                batchPool.length = 0;
                thumbnails = [];
                thumbnails.length = 0;
                tsChunkCount = 0;
                void this.tsChunkProcessQueue.add('clean-up-ts-chunk', { videoName }, {
                    jobId: `${videoName}-${uuidv4()}`,
                })

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

    async getFFmpegProcessCount(containerName) {
        try {
            const { stdout } = await execPromise(`docker exec ${containerName} pgrep -c ffmpeg`);
            return parseInt(stdout.trim(), 10);
        } catch (error) {
            if (error.stderr.includes("pgrep: process not found") || error.code === 1) {
                return 0; // No FFmpeg process running
            }
            console.error("Error checking FFmpeg process count:", error);
            return 0; // Default to 0 in case of unexpected errors
        }
    }

    async waitForAvailableSlot(containerName: string, maxProcesses: number, interval = 2000) {
        while (true) {
            const pidProcessing = await this.getFFmpegProcessCount(containerName);
            if (pidProcessing < maxProcesses) {
                return;
            }
            this.logger.error(`FFmpeg process is full (${pidProcessing}/${maxProcesses}), waiting for the next interval`);
            await new Promise(resolve => setTimeout(resolve, interval));
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



        await this.waitForAvailableSlot('ffmpeg-container', CONCURRENT_TS_CHUNK_PROCESS, FFMPEG_PROCESS_INTERVAL);


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

