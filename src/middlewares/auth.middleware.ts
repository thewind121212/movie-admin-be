import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserSecurity } from 'src/core/user/security/user.security';

@Injectable()
export class AuthMiddleware implements NestMiddleware {

  constructor(
    private readonly userSecurity: UserSecurity
  ) { }

  async use(req: Request, res: Response, next: NextFunction
  ) {
    // check if access token is valid 

    if (!req.headers.authorization) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid request missing required fields'
        },
        HttpStatus.BAD_REQUEST
      )
    }


    const verifyResult = await this.userSecurity.verifyJWT(req.headers.authorization, 'AUTHENTICATION')


    if (verifyResult.message !== 'Token is expired' && verifyResult.isValid === false) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: verifyResult.message
        },
        HttpStatus.UNAUTHORIZED
      )
    }

    if (verifyResult.message === 'Token is expired' && verifyResult.isValid === false) {
      // refresh token the token

      // if the refresh token is invalid
      const refreshToken = req.cookies['refresh_token']




      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Token is expired, please login again'
        },
        HttpStatus.UNAUTHORIZED
      )
    }

    next();
  }
}