import { Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import { tsChunkProcesser } from 'src/core/movie/workerServices/postProcessTsChunk.worker';
import Docker from 'dockerode';
import { BullModule } from '@nestjs/bull';
import { S3Service } from '../s3/s3.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video-post-process',
      redis: {
        host: 'localhost',
        port: 6379,
        db: 3,
      },
    }),
    S3Module
  ]
  ,
  providers: [
    {
      provide: 'DOCKER',
      useFactory: () => {
        return new Docker({ socketPath: '/var/run/docker.sock' });
      },
    },
    DockerService,
    tsChunkProcesser,
  ],
  exports: [DockerService],
  
})
export class DockerModule {}
