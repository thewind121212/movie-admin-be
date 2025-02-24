

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { UserSecurity } from '../security/user.security';


@Injectable()
export class verifyAccessTokenGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity
    ) {

    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();


        if (!req.headers.authorization) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid request missing required fields'
                },
                HttpStatusCode.BadRequest
            )
        }


        const verifyResult = this.userSecurity.verifyJWT(req.headers.authorization)


        if (verifyResult.message !== 'Token is expired' && verifyResult.isValid === false) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: verifyResult.message
                },
                HttpStatusCode.BadRequest
            )
        }

        if (verifyResult.message === 'Token is expired' && verifyResult.isValid === false) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Token is expired , process refresh token'
                },
                HttpStatusCode.Unauthorized
            )
        }

        return true
    }

}
