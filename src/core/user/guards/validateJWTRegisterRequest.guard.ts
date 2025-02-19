

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { UserSecurity } from '../security/user.security';
import { HttpStatusCode } from 'axios';
import { UserRepositories } from '../repositories/user.repositories';


@Injectable()
export class ValidateTokenRegisterRequestGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity,
        private readonly userRepositories: UserRepositories
    ) {

    }


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // check is user already exist



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

        if (!email) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: 'Invalid token please try again'
                },
                HttpStatusCode.Forbidden
        )}
    
        const isUserExist = await this.userRepositories.findUser(email)

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
