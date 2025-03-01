import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { MovieServices } from '../services/movie.service';
import { MovieDomainServices } from '../domain/movie.domainServices';

@Injectable()
export class MovieGuard implements CanActivate {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly movieServices: MovieServices,
    // eslint-disable-next-line no-unused-vars
    private readonly movieDomainServices: MovieDomainServices,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const isMaxQueue = await this.movieDomainServices.isMaxBullQueue();

    if (isMaxQueue) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Too many movies being processed. Please try again later',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const uploadTicket = request.headers['x-upload-ticket'];
    if (!uploadTicket) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Upload ticket not found!',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const isValidTicket = await this.movieServices.uploadTicketValidator(
      uploadTicket as string,
    );

    if (isValidTicket.isValid) {
      return true;
    } else {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: isValidTicket.message,
        },
        isValidTicket.status ? isValidTicket.status : HttpStatus.FORBIDDEN,
      );
    }
  }
}
