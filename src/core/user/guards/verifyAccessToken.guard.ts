import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserSecurity } from '../security/user.security';

@Injectable()
export class verifyAccessTokenGuard implements CanActivate {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly userSecurity: UserSecurity) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    if (!req.headers.authorization) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid request missing required fields',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    
    const verifyResult = await this.userSecurity.verifyJWT(
      req.headers.authorization,
      'AUTHENTICATION',
    );

    if (
      verifyResult.message !== 'Token is expired' &&
      verifyResult.isValid === false
    ) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: verifyResult.message,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (
      verifyResult.message === 'Token is expired' &&
      verifyResult.isValid === false
    ) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Token is expired , process refresh token',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    req.body.user = verifyResult;
    return true;
  }
}
