import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class LoginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    if (!body.email || !body.password) {
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
