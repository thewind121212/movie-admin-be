import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserSecurity } from '../security/user.security';
import { UserRepositories } from '../repositories/user.repositories';
import { tokenName } from '../user.config';

@Injectable()
export class ValidateTokenRegisterRequestGuard implements CanActivate {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly userSecurity: UserSecurity,
    // eslint-disable-next-line no-unused-vars
    private readonly userRepositories: UserRepositories,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = request.headers[tokenName.REGISTER_REQUEST];


    if (!token) {
      throw new HttpException(
        {
          status: 'Forbidden',
          data: null,
          message: 'Token not found',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { isValid, email, message } = await this.userSecurity.verifyJWT(
      token,
      'APPROVE_REGISTER_REQUEST',
      true
    );
    if (!isValid) {
      throw new HttpException(
        {
          status: 'Forbidden',
          data: null,
          message: message,
        },
        HttpStatus.BAD_REQUEST,
      ); 
    }

    if (!email) {
      throw new HttpException(
        {
          status: 'Forbidden',
          data: null,
          message: 'Invalid token',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isUserExist = await this.userRepositories.getUser(email);

    if (isUserExist) {
      throw new HttpException(
        {
          status: 'Forbidden',
          data: null,
          message: 'User already exist',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    request.body.email = email;
    return true;
  }
}
