
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Injectable()
export class getProfileGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const { userId } = request.body;

        if (!userId) {
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
