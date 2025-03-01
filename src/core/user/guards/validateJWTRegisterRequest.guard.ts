

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { UserSecurity } from '../security/user.security';
import { HttpStatusCode } from 'axios';
import { UserRepositories } from '../repositories/user.repositories';
import { tokenName } from '../user.config';


@Injectable()
export class ValidateTokenRegisterRequestGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity,
        private readonly userRepositories: UserRepositories
    ) {

    }


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();


        const token = request.headers[tokenName.REGISTER_REQUEST]


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



        const { isValid, email, message } = await this.userSecurity.verifyJWT(token, 'REGISTER_REQUEST')
        if (!isValid) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: message,
                },
                HttpStatusCode.Forbidden
            )
        }

        if (!email) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: 'Invalid token'
                },
                HttpStatusCode.Forbidden
            )
        }

        const isUserExist = await this.userRepositories.getUser(email)

        if (isUserExist) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: 'User already exist'
                },
                HttpStatusCode.Forbidden
            )
        }

        request.body.email = email
        return true
    }

}
