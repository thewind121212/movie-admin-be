

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { UserSecurity } from '../security/user.security';


@Injectable()
export class refreshAccessTokenGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity
    ) {

    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        console.log(req.headers)

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

        console.log(req.headers.authorization)


        const verifyResult = await this.userSecurity.verifyJWT(req.headers.authorization, 'REFRESH')


        //if token is invalid
        if (verifyResult.message !== 'Token is expired' && verifyResult.isValid === false) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid token'
                },
                HttpStatusCode.Unauthorized
            )

        }
        //if token is expired
        if (verifyResult.message === 'Token is expired' && verifyResult.isValid === false) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Refresh token is expired , please login again'
                },
                HttpStatusCode.Unauthorized
            )
        }


        // if token is valid
        if (verifyResult.message === 'Token is valid' && verifyResult.isValid === true) {
            // refresh token the token
            const { email, userId } = verifyResult
            const newAccessToken = this.userSecurity.signJWT({ email, userId }, '1h', 'REFRESH')
            req.body = {
                ...req.body,
                token: newAccessToken
            }
        }


        return true
    }

}
