/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { getVideoDurationFromLog } from './docker.utils';
import path from 'path';
import chokidar from 'chokidar';
import { BATCH_SIZE } from 'src/core/movie/movie.config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';



@Injectable()

export class DockerService {
    private readonly logger = new Logger(DockerService.name);

    constructor(
        @InjectQueue('video-post-process')
        private readonly tsChunkProcessQueue: Queue,
        @Inject('DOCKER') private readonly docker: Docker,
    ) {
    }



    async runFFmpegDocker(inputFilePath: string, outputPath: string, videoName: string): Promise<void> {
        const imageName = 'linuxserver/ffmpeg';
        const segmentPattern = `/output/segment_%03d.ts`;
        const outputPlaylist = `/output/index.m3u8`;

        const cmd = [
            '-i', `${inputFilePath}`,
            '-c:v', 'libx264',
            '-profile:v', 'high',
            '-level', '4.1',
            '-preset', 'medium',
            '-b:v', '6000k',
            '-maxrate', '10M',
            '-bufsize', '20M',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-start_number', '0',
            '-hls_time', '10',
            '-hls_list_size', '0',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segmentPattern,
            '-f', 'hls', outputPlaylist,
        ];


        let unitBatch: string[] = []

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
                persistent: true,
            });
            watcher.on('add', (path) => {
                this.logger.log(`File ${path} has been added`);
                if (unitBatch.length === BATCH_SIZE) {
                    this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: unitBatch, videoName })
                    unitBatch = []
                }
                unitBatch.push(path)
            })
            await container.wait();

            await container.remove();
            if (unitBatch.length > 0) {
                chokidar.watch([...unitBatch], {
                    persistent: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 2000,
                        pollInterval: 100
                    }
                }).on('add', () => {
                    this.tsChunkProcessQueue.add('ts-chunk-process', { tsChunkBatchPaths: unitBatch, videoName })
                })

            }

            watcher.close().then(() => {
                this.logger.log(`Watcher folder ${path.resolve(`./processed/${videoName}`)} closed`);
            })

            this.logger.log(`FFmpeg completed successfully!`);
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

