

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { UserSecurity } from '../security/user.security';
import { HttpStatusCode } from 'axios';


@Injectable()
export class ValidateTokenRegisterRequestGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity
    ) {

    }


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { token } = request.body
        if (!token) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: 'Token not found'
                },
                HttpStatusCode.Forbidden
            )
        }

        const { isValid, email } = this.userSecurity.verifyJWT(token)
        if (!isValid) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: 'Invalid token please try again'
                },
                HttpStatusCode.Forbidden
            )
        }

        request.body.email = email
        return true
    }

}
