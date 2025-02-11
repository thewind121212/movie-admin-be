import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { Request } from 'express';
import { MovieRepository } from './movie.repositories';

@Injectable()
export class MovieGuard implements CanActivate {
    constructor(private readonly movieRepository: MovieRepository) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        const uploadTiket = request.headers['x-upload-ticket']
        if (!uploadTiket) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Upload ticket not found!'
                },
                HttpStatusCode.Forbidden
            )
        }
        const isValidTicket = await this.movieRepository.checkTicketIsValid(uploadTiket as string)

        if (isValidTicket.isValid) {
            return true
        } else {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: isValidTicket.message,
                },
                isValidTicket.status ? isValidTicket.status : HttpStatusCode.Forbidden
            )

        }


    }
}