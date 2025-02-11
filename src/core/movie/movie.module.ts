import { Module } from '@nestjs/common';
import { MovieController } from '../../presentation/controllers/movie.controller';
import { MovieServices } from './services/movie.service';
import { DockerModule } from 'src/Infrastructure/docker/docker.module';
import { BullModule } from '@nestjs/bull';
import { VideoTranscodingProcessor } from 'src/core/movie/transcodeVideo.worker';
import { S3Module } from 'src/Infrastructure/s3/s3.module';
import { RedisService } from 'src/Infrastructure/redis/redis.service';
import { MovieRepository } from './movie.repositories';
import { MovieGuard } from './movie.guard';
import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
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
  providers: [MovieServices, VideoTranscodingProcessor, RedisService, MovieRepository, MovieGuard, PrismaService],
})
export class MovieModule {}
