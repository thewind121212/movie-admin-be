

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Injectable()
export class ChangePassGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const { oldPassword, newPassword, userId } = request.body;

        if (!userId || !oldPassword || !newPassword) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Missing required fields',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        return true;
    }
}
