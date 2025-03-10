
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class enableTOTPGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { userId, token } = request.body;
    if (!userId || !token) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid request missing required fields',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }
}
