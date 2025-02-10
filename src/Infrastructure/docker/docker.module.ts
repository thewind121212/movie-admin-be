import { Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import Docker from 'dockerode';

@Module({
  providers: [
    {
      provide: 'DOCKER',
      useFactory: () => {
        return new Docker({ socketPath: '/var/run/docker.sock' });
      },
    },
    DockerService,
  ],
  exports: [DockerService],
})
export class DockerModule {}
