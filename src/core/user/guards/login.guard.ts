
import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';


@Injectable()
export class LoginGuard implements CanActivate {

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const body = request.body
        if (!body.email || !body.password) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid request missing required fields'
                },
                HttpStatusCode.BadRequest
            )
        }

        return true
    }

}
