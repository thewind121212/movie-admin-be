
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class disableTOTPGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { userId, token, removeMethod } = request.body;
    if (!userId || !token || !removeMethod) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid request missing required fields',
        },
        HttpStatus.BAD_REQUEST,
      );
    }


    if (removeMethod !== 'token' && removeMethod !== 'recoveryPass') {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid remove method',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }
}
