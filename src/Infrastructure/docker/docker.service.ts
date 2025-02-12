/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { getVideoDurationFromLog } from './docker.utils';
import path from 'path';


@Injectable()

export class DockerService {
    private readonly logger = new Logger(DockerService.name);

    constructor(
        @Inject('DOCKER') private readonly docker: Docker,
    ) { }



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
        try {
            const container = await this.docker.createContainer({
                Image: imageName,
                Cmd: cmd,
                HostConfig: {
                    Binds: [
                        `${path.resolve(`./processed/${videoName}`)}:/output:rw`,
                    ],
                },
            });

            await container.start();
            await container.wait();
            void container.remove();

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

}

