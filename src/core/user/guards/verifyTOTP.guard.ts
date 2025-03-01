
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { tokenName } from '../user.config';


@Injectable()
export class verifyTOTPGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const nonce = request.headers[tokenName.NONCE_2FA]

        const { email, token } = request.body
        if (!email || !token || !nonce) {
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
