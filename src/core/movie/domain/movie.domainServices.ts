import { HttpStatus, Injectable } from '@nestjs/common';
import crypto from 'bcrypt';
import {
  TICKET_HASH_SALT_ROUND,
  VIDEO_PROCESSING_QUEUE_LIMIT,
} from '../movie.config';
import { MovieRepository } from '../repositories/movie.repositories';
import { ticketRegisterType } from 'src/interface/movie.interface';

@Injectable()
export class MovieDomainServices {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly movieRepository: MovieRepository) {}

  static validateDataCreateTicket(
    name: string,
    description: string,
    genres: string[],
    releaseYear: number,
  ): {
    isValid: boolean;
    message: string;
  } {
    if (!name) {
      return {
        isValid: false,
        message: 'Missing name movie',
      };
    }
    if (!description) {
      return {
        isValid: false,
        message: 'Missing description movie',
      };
    }
    if (!genres) {
      return {
        isValid: false,
        message: 'Missing genres movie',
      };
    }
    if (!releaseYear) {
      return {
        isValid: false,
        message: 'Missing release year movie',
      };
    }
    return {
      isValid: true,
      message: 'Valid',
    };
  }

  static hashTheTicket = (
    name: string,
    description: string,
    releaseYear: number,
  ): string => {
    const timeStamp = new Date().getTime().toString();
    const hashData = crypto.hashSync(
      name + description + releaseYear + timeStamp,
      TICKET_HASH_SALT_ROUND,
    );
    return hashData;
  };

  async isMaxBullQueue(): Promise<boolean> {
    const currentQueue = await this.movieRepository.getWaitingCount();
    if (currentQueue >= VIDEO_PROCESSING_QUEUE_LIMIT) {
      return true;
    }
    return false;
  }

  async checkTicketIsValid(
    ticketData: ticketRegisterType,
    hashTicketKey: string,
  ): Promise<{
    isValid: boolean;
    message?: string;
    status?: HttpStatus;
  }> {
    if (ticketData.status === 'PROCESSING') {
      return {
        isValid: false,
        message: 'This ticket had been processing!',
      };
    }

    if (ticketData.status === 'COMPLETED') {
      return {
        isValid: false,
        message: 'This ticket is completed',
      };
    }

    const uploadStatus = await this.movieRepository.updateTicket(
      hashTicketKey,
      'PROCESSING',
      ticketData,
    );

    if (!uploadStatus) {
      return {
        isValid: false,
        message: 'Can not uploaded for this ticket',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    return {
      isValid: true,
      message: 'Movie uploadding please keep the broswer open when uploading',
    };
  }
}
