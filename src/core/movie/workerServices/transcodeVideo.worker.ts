import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import { S3Service } from 'src/Infrastructure/s3/s3.service';

@Injectable()
@Processor('video-transform')
export class VideoTranscodingProcessor {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly dockerServices: DockerService,
    // eslint-disable-next-line no-unused-vars
    private readonly s3Service: S3Service,
  ) {}

  @Process('video-transcoding')
  async handleVideoTranscoding(
    job: Job<{
      videoPath: string;
      outputPath: string;
      videoName: string;
      videoId: string;
    }>,
  ) {
    const { videoPath, videoName } = job.data;

    console.log(`Transcoding video from ${videoPath} begins...`);

    if (!process.env.TRANSCODE_ENV) {
      console.log('Transcoding environment not set');
      return { success: false, message: 'Transcoding environment not set' };
    }

    if (process.env.TRANSCODE_ENV === 'docker') {
      console.log('Transcoding video using docker');
      await this.dockerServices.runFFmpegDocker(videoPath, videoName);
    }

    if (process.env.TRANSCODE_ENV === 'host') {
      console.log('Transcoding video using host');
      await this.dockerServices.runOnHostFFmpeg(videoPath, videoName);
    }

    this.s3Service.removePathFromS3(
      'movie-raw',
      videoPath.split('/').pop() as string,
    );
    console.log(`Transcoding video from ${videoPath} completed!`);

    return { success: true, message: 'Video transcoding completed!' };
  }
}
