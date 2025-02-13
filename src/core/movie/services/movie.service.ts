import { HttpStatus, Injectable } from '@nestjs/common';
import { Movie } from '../Domain/movie.entity';
import { MovieRepository } from '../Repositories/movie.repositories';
import { MovieDomainServices } from '../Domain/movie.domainServices';
import { registerMovieUploadTicketService } from './registerUploadMovie';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class MovieServices {
  constructor(
    @InjectQueue('video-transform')
    private readonly videoEncodingQueue: Queue,
    private readonly movieRepository: MovieRepository,
    private readonly movieDomainServices: MovieDomainServices
  ) { }

  async uploadMovie(
    inputFilePath: string,
    outputPath: string,
    uploadTicket: string,
  ): Promise<{
    message: string,
    status: HttpStatus
  }> {

    const ticketData = await this.movieRepository.getTicketData(uploadTicket)

    if (!ticketData) return {
      message: 'Invalid upload ticket',
      status: HttpStatus.BAD_REQUEST
    }


    const resultWriteMovieRepository = await this.movieRepository.writeUploadMovieMetaData(ticketData, inputFilePath)

    if (!('id' in resultWriteMovieRepository)) {
      return {
        message: 'Failed to upload movie',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      }
    }

    const movieEntity = new Movie(
      {
        name: ticketData.name,
        description: ticketData.desc,
        releaseYear: ticketData.releaseYear,
        createdAt: new Date(),
        updatedAt: new Date(),
        dislikes: resultWriteMovieRepository.dislikes,
        likes: resultWriteMovieRepository.likes,
        views: resultWriteMovieRepository.views,
        isPublished: resultWriteMovieRepository.isPublished,
        status: 'UPLOADED',
        id: resultWriteMovieRepository.id
      }
    )



    void this.videoEncodingQueue.add('video-transcoding', {
      videoPath: inputFilePath,
      outputPath: outputPath,
      videoName: movieEntity._id,
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
    const isMaxQueue = await this.movieDomainServices.isMaxBullQueue()
    if (isMaxQueue) {
      return {
        message: 'Too many movies being processed. Please try again later',
        isValid: false,
        status: HttpStatus.TOO_MANY_REQUESTS
      }
    }

    const ticketData = await this.movieRepository.getTicketData(uploadTicket)
    if (!ticketData) {
      return {
        isValid: false,
        message: "Ticket not found or Ticket expried!"
      }
    }

    const isValidTicket = await this.movieDomainServices.checkTicketIsValid(ticketData, uploadTicket)

    return isValidTicket

  }


  registerMovieUploadTicket = registerMovieUploadTicketService
}
