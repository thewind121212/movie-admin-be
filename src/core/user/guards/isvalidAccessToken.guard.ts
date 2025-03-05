
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Injectable()
export class IsValidAccessTokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const accessToken = request.headers.authorization;
        if (!accessToken) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Access token is required',
                },
                HttpStatus.UNAUTHORIZED,
            );
        }

        return true;
    }
}
