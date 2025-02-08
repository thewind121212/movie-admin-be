import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class MovieServices {
  constructor(
    @InjectQueue('video-transform')
    private readonly videoEncodingQueue: Queue,
  ) {}

  async uploadMovie(
    inputFilePath: string,
    outputPath: string,
  ): Promise<string> {
    console.log(inputFilePath, outputPath);

    const workCount = await this.videoEncodingQueue.getActiveCount();
    if (workCount > 5) {
      return 'Too many movies being processed. Please try again later';
    }

    void this.videoEncodingQueue.add('video-transcoding', {
      videoPath: inputFilePath,
      outputPath: outputPath,
    });
    return 'Movie processing started';
  }
}
