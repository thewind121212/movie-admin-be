import { Module } from '@nestjs/common';
import { MovieController } from './movie.controller';
import { MovieServices } from './movie.service';
import { DockerModule } from 'src/docker/docker.module';
import { BullModule } from '@nestjs/bull';
import { VideoTranscodingProcessor } from 'src/movie/transcodeVideo.worker';
import { S3Module } from 'src/s3/s3.module';
@Module({
  imports: [
    DockerModule,
    BullModule.registerQueue({
      name: 'video-transform',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    S3Module,
  ],
  controllers: [MovieController],
  providers: [MovieServices, VideoTranscodingProcessor],
})
export class MovieModule {}
