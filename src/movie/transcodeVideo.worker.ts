import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/docker/docker.service';

@Injectable()
@Processor('video-transform')
export class VideoTranscodingProcessor {
  constructor(private readonly dockerServices: DockerService) {}

  @Process('video-transcoding')
  async handleVideoTranscoding(
    job: Job<{ videoPath: string; outputPath: string }>,
  ) {
    console.log('Processing video job:', job.id);

    const { videoPath, outputPath } = job.data;

    console.log(`Transcoding video from ${videoPath} begins...`);

    await this.dockerServices.runFFmpegDocker(videoPath, outputPath);

    return { success: true, message: 'Video transcoding completed!' };
  }
}
