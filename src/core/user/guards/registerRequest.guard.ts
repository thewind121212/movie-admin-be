import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { HttpStatusCode } from 'axios';


@Injectable()
export class RegisterRequestGuard implements CanActivate {


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const body = request.body
        const isValid = RegisterRequest.validate(body.email)
        if (!isValid) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid email'
                },
                HttpStatusCode.BadRequest
            )
        }
        return true
    }

}
