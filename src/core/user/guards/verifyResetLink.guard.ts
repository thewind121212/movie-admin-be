

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UserSecurity } from '../security/user.security';
import { UserRepositories } from '../repositories/user.repositories';
import { FORGOT_PASS_EXT, tokenName } from '../user.config';


@Injectable()
export class VerifyResetLinkGuard implements CanActivate {

    constructor(
        private readonly userSecurity: UserSecurity,
        private readonly userRepositories: UserRepositories
    ) {

    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const  token  = request.headers[tokenName.FORGOT_PASSWORD] as string;

        if (!token) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Token not found'
                },
                HttpStatus.UNAUTHORIZED
            )
        }

        // validate token
        const tokenResult = await this.userSecurity.verifyJWT(token, 'FORGOT_PASSWORD')
        if (!tokenResult.isValid || !tokenResult.userId) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: tokenResult.message
                },
                HttpStatus.UNAUTHORIZED
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
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }


        if (!isUsed) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Your used this link or it expired please try again!'
                },
                HttpStatus.FORBIDDEN
            )
        }


        return true
    }

}
