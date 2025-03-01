

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';


@Injectable()
export class toggleTOTPGuard implements CanActivate {

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { email, password } = request.body
        if (!email || !password) {
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
