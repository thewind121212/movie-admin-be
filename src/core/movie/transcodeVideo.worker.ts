import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import path from 'path';

@Injectable()
@Processor('video-transform')
export class VideoTranscodingProcessor {
  constructor(
    private readonly dockerServices: DockerService,
    private readonly s3Service: S3Service,
  ) { }

  @Process('video-transcoding')
  async handleVideoTranscoding(
    job: Job<{ videoPath: string; outputPath: string }>,
  ) {
    console.log('Processing video job:', job.id);

    const { videoPath, outputPath } = job.data;

    console.log(`Transcoding video from ${videoPath} begins...`);

    console.log(outputPath);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.dockerServices.runFFmpegDocker(videoPath, outputPath);
    const filename = videoPath.replace('/uploads', '').split('.')[0];
    this.s3Service.uploadHLSToS3(
      path.resolve(`./processed/${filename}`),
      outputPath,
      filename,
    );

    return { success: true, message: 'Video transcoding completed!' };
  }
}
