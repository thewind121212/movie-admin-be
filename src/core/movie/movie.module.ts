import { Module } from '@nestjs/common';
import { MovieController } from '../../presentation/controllers/movie.controller';
import { MovieServices } from './services/movie.service';
import { DockerModule } from 'src/Infrastructure/docker/docker.module';
import { BullModule } from '@nestjs/bull';
import { VideoTranscodingProcessor } from 'src/core/movie/workerServices/transcodeVideo.worker';
import { S3Module } from 'src/Infrastructure/s3/s3.module';
import { RedisService } from 'src/Infrastructure/redis/redis.service';
import { MovieRepository } from './repositories/movie.repositories';
import { MovieGuard } from './guards/uploadMovie.guard';
import { MovieDomainServices } from './domain/movie.domainServices';
import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
@Module({
  imports: [
    DockerModule,
    BullModule.registerQueue({
      name: 'video-transform',
      redis: {
        host: "10.10.0.162",
        port: parseInt(process.env.REDIS_PORT!) || 6379,
        db: 0,
      },
      defaultJobOptions: {
        removeOnFail: true,
      },
    }),
    S3Module,
  ],
  controllers: [MovieController],
  providers: [
    MovieServices,
    VideoTranscodingProcessor,
    RedisService,
    MovieRepository,
    MovieGuard,
    PrismaService,
    MovieDomainServices,
  ],
})
export class MovieModule { }
