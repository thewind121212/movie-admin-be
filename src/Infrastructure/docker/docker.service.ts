/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import path from 'path';


@Injectable()

export class DockerService {
    private readonly logger = new Logger(DockerService.name);

    constructor(
        @Inject('DOCKER') private readonly docker: Docker,
    ) { }



    async runFFmpegDocker(inputFilePath: string, outputPath: string, videoName: string): Promise<void> {
        const imageName = 'linuxserver/ffmpeg';
        const filename = inputFilePath.replace('/uploads', '').split('.')[0];
        const segmentPattern = `/output/segment_%03d.ts`;
        const outputPlaylist = `/output/index.m3u8`;

        const cmd = [
            '-i', `${inputFilePath}`,
            '-c:v', 'libx264',
            '-profile:v', 'high',
            '-level', '4.1',
            '-preset', 'medium',
            '-b:v', '8000k',
            '-maxrate', '10M',
            '-bufsize', '20M',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-start_number', '0',
            '-hls_time', '6',
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
}

