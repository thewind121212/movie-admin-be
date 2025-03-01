

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { tokenName } from '../user.config';


@Injectable()
export class SubmitForgotPassGuard implements CanActivate {

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.headers[tokenName.FORGOT_PASSWORD]
        if (!token) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Token is required'
                },
                HttpStatusCode.Forbidden
            )
        }

        const {  password} = request.body
        if (!password) {
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
