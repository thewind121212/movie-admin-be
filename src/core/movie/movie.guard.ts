import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { Request } from 'express';
import { MovieServices } from './services/movie.service';

@Injectable()
export class MovieGuard implements CanActivate {
    constructor(private readonly movieServices: MovieServices) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        const uploadTicket = request.headers['x-upload-ticket']
        if (!uploadTicket) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Upload ticket not found!'
                },
                HttpStatusCode.Forbidden
            )
        }

        const isValidTicket = await this.movieServices.uploadTicketValidator(uploadTicket as string)

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