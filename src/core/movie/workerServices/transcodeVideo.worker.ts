import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import fs from 'fs';
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
    job: Job<{ videoPath: string; outputPath: string, videoName: string, videoId: string, }>,
  ) {

    const { videoPath, outputPath, videoName } = job.data;


    console.log(`Transcoding video from ${videoPath} begins...`);

    await this.dockerServices.runFFmpegDocker(videoPath, videoName);
    this.s3Service.removePathFromS3('movie-raw', videoPath.split('/').pop() as string);
    return { success: true, message: 'Video transcoding completed!' };
  }
}
