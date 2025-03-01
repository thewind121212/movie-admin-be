import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserSecurity } from '../security/user.security';

@Injectable()
export class refreshAccessTokenGuard implements CanActivate {
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
        HttpStatus.BAD_GATEWAY,
      );
    }

    const verifyResult = await this.userSecurity.verifyJWT(
      req.headers.authorization,
      'REFRESH',
    );

    //if token is invalid
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
    //if token is expired
    if (
      verifyResult.message === 'Token is expired' &&
      verifyResult.isValid === false
    ) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Refresh token is expired , please login again',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // if token is valid
    if (
      verifyResult.message === 'Token is valid' &&
      verifyResult.isValid === true
    ) {
      // refresh token the token
      const { email, userId } = verifyResult;
      const newAccessToken = this.userSecurity.signJWT(
        { email, userId },
        '1h',
        'AUTHENTICATION',
      );
      req.body = {
        ...req.body,
        token: newAccessToken,
      };
    }

    return true;
  }
}
