

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
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
                HttpStatus.UNAUTHORIZED
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
                HttpStatus.BAD_REQUEST
            )
        }

        return true
    }

}
