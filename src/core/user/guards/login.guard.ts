
import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { UserRepositories } from '../repositories/user.repositories';
import { UserSecurity } from '../security/user.security';


@Injectable()
export class Login implements CanActivate {

    constructor(
        private readonly userRepositories: UserRepositories,
        private readonly userSecurity: UserSecurity,
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { email, password} = request.body
        if (!email || !password) {
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
