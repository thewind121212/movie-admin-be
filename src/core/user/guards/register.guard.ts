
import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { HttpStatusCode } from 'axios';
import { UserRepositories } from '../repositories/user.repositories';
import { UserSecurity } from '../security/user.security';


@Injectable()
export class Register implements CanActivate {

    constructor(
        private readonly userRepositories: UserRepositories,
        private readonly userSecurity: UserSecurity
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const {email, password, name , token } = request.body
        if (!email || !password || !name || !token) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid request missing required fields'
                },
                HttpStatusCode.BadRequest
            )
        }

        // validate email
        const isValidEmail = RegisterRequest.validate(email)
        if (!isValidEmail) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid email'
                },
                HttpStatusCode.BadRequest
            )
        }

        // check if email already exist

        const user = await this.userRepositories.findUser(email)
        if (user) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'User already exist'
                },
                HttpStatusCode.BadRequest
            )
        }

        // validate token
        const tokenResult = this.userSecurity.verifyJWT(token)
        if (!tokenResult.isValid || (email !== tokenResult.email)) {
            throw new HttpException(
                {
                    status: 'Forbidden',
                    data: null,
                    message: 'Invalid token please try again'
                },
                HttpStatusCode.Forbidden
            )
        }
        return true
    }

}
