

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { UserSecurity } from '../security/user.security';
import { UserRepositories } from '../repositories/user.repositories';
import { FORGOT_PASS_EXT } from '../user.config';


@Injectable()
export class VerifyResetLinkGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity,
        private readonly userRepositories: UserRepositories
    ) {

    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { token } = request.body
        if (!token) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Token not found'
                },
                HttpStatusCode.BadRequest
            )
        }

        // validate token
        const tokenResult = this.userSecurity.verifyJWT(token)
        if (!tokenResult.isValid || !tokenResult.userId) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: tokenResult.message
                },
                HttpStatusCode.BadRequest
            )
        }

        // check if this token is user or not

        const isUsed = await this.userRepositories.checkIsKeyIsExist(tokenResult.userId + FORGOT_PASS_EXT)

        if (isUsed === null) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Internal server error'
                },
                HttpStatusCode.InternalServerError
            )
        }


        if (!isUsed) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Your used this link or it expired please try again!'
                },
                HttpStatusCode.BadRequest
            )
        }


        return true
    }

}
