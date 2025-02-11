import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { RedisService } from 'src/Infrastructure/redis/redis.service';
import { Movie } from '../movie.entity';
import { ResponseType } from 'src/interface/response.interface';
import { hashTheTicket } from '../movie.utils';
import { MovieRepository } from '../movie.repositories';

@Injectable()
export class MovieServices {
  constructor(
    @InjectQueue('video-transform')
    private readonly videoEncodingQueue: Queue,
    private readonly redisService: RedisService,
    private readonly movieRepository: MovieRepository
  ) { }

  async uploadMovie(
    inputFilePath: string,
    outputPath: string,
  ): Promise<string> {
    console.log(inputFilePath, outputPath);

    this.redisService.set('movie', 'processing', 3600);


    // const workCount = await this.videoEncodingQueue.getActiveCount();
    // if (workCount > 5) {
    //   return 'Too many movies being processed. Please try again later';
    // }

    // void this.videoEncodingQueue.add('video-transcoding', {
    //   videoPath: inputFilePath,
    //   outputPath: outputPath,
    // });
    return 'Movie processing started';
  }

  async registerMovieUploadTicket(
    name: string,
    description: string,
    genres: string[],
    releaseYear: number,
  ): Promise<ResponseType> {
    const isValidRegister = Movie.validateRegisterUploadTicket(name, description, genres, releaseYear)
    if (!isValidRegister.isValid) {
      return {
        message: isValidRegister.message,
        status: 'error',
        data: null,
        created_at: new Date()
      }
    }

    const hashTicket = hashTheTicket(name, description, releaseYear);
    const writeTicketToRedis = await this.movieRepository.registerTicket(hashTicket);

    if (!writeTicketToRedis.completed) {
      return {
        message: 'Failed to register movie upload ticket',
        status: 'error',
        data: null,
        created_at: new Date()
      }
    }

    return {
      message: 'Movie upload ticket registered',
      status: 'success',
      data: {
        uploadTicket: hashTicket
      },
      created_at: new Date()
    }
  }


}
