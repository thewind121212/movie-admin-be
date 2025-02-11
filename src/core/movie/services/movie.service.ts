import { HttpStatus, Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Movie } from '../movie.entity';
import { ResponseType } from 'src/interface/response.interface';
import { hashTheTicket } from '../movie.utils';
import { MovieRepository } from '../movie.repositories';

@Injectable()
export class MovieServices {
  constructor(
    @InjectQueue('video-transform')
    private readonly videoEncodingQueue: Queue,
    private readonly movieRepository: MovieRepository
  ) { }

  async uploadMovie(
    inputFilePath: string,
    outputPath: string,
    uploadTicket: string,
  ): Promise<{
    message: string,
    status: HttpStatus
  }> {

    const workCount = await this.videoEncodingQueue.getWaitingCount()
    if (workCount > 5) {
      return  {
        message: 'Too many movies being processed. Please try again later',
        status: HttpStatus.TOO_MANY_REQUESTS
      }
    }


    const ticketData = await this.movieRepository.getTicketData(uploadTicket)

    if (!ticketData) return {
      message: 'Invalid upload ticket',
      status: HttpStatus.BAD_REQUEST
    }

    void this.videoEncodingQueue.add('video-transcoding', {
      videoPath: inputFilePath,
      outputPath: outputPath,
      videoName: ticketData.name
    });
    return {
      message: 'Movie is being processed',
      status: HttpStatus.CREATED
    }
  }

  async uploadTicketValidator(uploadTicket: string): Promise<{
    isValid: boolean,
    message?: string,
    status?: HttpStatus,
  }> {
    const workCount = await this.videoEncodingQueue.getWaitingCount()
    if (workCount > 5) {
      return {
        message: 'Too many movies being processed. Please try again later',
        isValid: false,
        status: HttpStatus.TOO_MANY_REQUESTS
      }
    }

    const isValidTicket = await this.movieRepository.checkTicketIsValid(uploadTicket as string)
    return isValidTicket

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
    const writeTicketToRedis = await this.movieRepository.registerTicket(hashTicket, name);

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
