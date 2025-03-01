import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';


@Injectable()
export class RegisterRequestGuard implements CanActivate {


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const body = request.body
        const isValid = RegisterRequest.validate(body.email)
        if (!isValid) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid email'
                },
                HttpStatus.BAD_REQUEST
            )
        }
        return true
    }

}
