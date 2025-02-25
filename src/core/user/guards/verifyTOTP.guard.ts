
import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';


@Injectable()
export class verifyTOTPGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { token, email, nonce } = request.body
        if (!email || !token || !nonce) {
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
