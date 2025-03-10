import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/Infrastructure/redis/redis.service';
import { ticketRegisterType } from 'src/interface/movie.interface';
import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
import { Movie } from '@prisma/client';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class MovieRepository {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly redisService: RedisService,
    @InjectQueue('video-transform')
    // eslint-disable-next-line no-unused-vars
    private readonly videoEncodingQueue: Queue,
    // eslint-disable-next-line no-unused-vars
    private readonly prisma: PrismaService,
    // eslint-disable-next-line no-unused-vars
    private readonly docker: DockerService,
  ) {}

  async getWaitingCount(): Promise<number> {
    const workCount = await this.videoEncodingQueue.getWaitingCount();
    return workCount;
  }

  async registerTicket(
    hashTicketKey: string,
    name: string,
    desc: string,
    releaseYear: number,
  ): Promise<{
    completed: boolean;
    message?: string;
  }> {
    try {
      const registerTicket: ticketRegisterType = {
        hashTicketKey,
        status: 'REGISTER',
        name,
        desc,
        releaseYear,
      };
      await this.redisService.set(
        hashTicketKey,
        JSON.stringify(registerTicket),
        300,
      );
      return {
        completed: true,
        message: 'Ticket registered successfully',
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        completed: false,
        message: 'Failed to register ticket internally error',
      };
    }
  }

  async updateTicket(
    hashTicketKey: string,
    status: 'REGISTER' | 'PROCESSING' | 'COMPLETED',
    ticketData: ticketRegisterType,
  ): Promise<boolean> {
    try {
      const registerTicket: ticketRegisterType = {
        ...ticketData,
        hashTicketKey,
        status: status,
      };
      await this.redisService.set(
        hashTicketKey,
        JSON.stringify(registerTicket),
        300,
      );
      return true;
    } catch (error) {
      console.log('Internal Error', error);
      return false;
    }
  }

  async getTicketData(
    hashTicketKey: string,
  ): Promise<ticketRegisterType | null> {
    try {
      const redisRetrive = await this.redisService.get(hashTicketKey);

      if (!redisRetrive) return null;
      const ticketData: ticketRegisterType = JSON.parse(redisRetrive);
      return ticketData;
    } catch (error) {
      console.log('Internal Error', error);
      return null;
    }
  }

  async writeUploadMovieMetaData(
    ticketData: ticketRegisterType,
    moviePath: string,
  ): Promise<
    | Movie
    | {
        isError: boolean;
        message?: string;
      }
  > {
    const { name, desc, releaseYear } = ticketData;

    const durationResult = await this.docker.calcDurationMovie(moviePath);

    if (durationResult.isError) {
      return durationResult;
    }

    try {
      const createResult = await this.prisma.movie.create({
        data: {
          name,
          description: desc,
          releaseYear,
          duration: durationResult.duration,
          thumbnailUrl: '',
          hlsFilePathS3: '',
          views: 0,
          likes: 0,
          dislikes: 0,
          typeId: '1',
          status: 'UPLOADED',
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return createResult;
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        message: error.message,
      };
    }
  }
}
