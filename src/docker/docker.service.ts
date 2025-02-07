import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' }); // Docker socket
  }

  async runFFmpeg(
    inputPath: string,
    outputPath: string,
    imageName: string,
  ): Promise<void> {
    try {
      const container = await this.docker.createContainer({
        Image: imageName, // Your FFmpeg image name
        Cmd: ['ffmpeg', '-i', inputPath, '-vf', 'format=hsl', outputPath],
        Volumes: {
          '/app/uploads': { bind: './uploads', mode: 'ro' },
          '/app/processed': { bind: './processed', mode: 'rw' },
        },
      });

      await container.start();
      const result = await container.wait();
      await container.remove();

      if (result.StatusCode !== 0) {
        throw new Error(`FFmpeg failed with status code ${result.StatusCode}`);
      }

      this.logger.log(`FFmpeg completed successfully!`);
    } catch (error) {
      this.logger.error(`Error running FFmpeg in Docker: ${error}`);
      throw error; // Re-throw the error for the caller to handle
    }
  }
}
