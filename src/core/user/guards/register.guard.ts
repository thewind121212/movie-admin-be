import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { UserRepositories } from '../repositories/user.repositories';
import { UserSecurity } from '../security/user.security';
import { tokenName } from '../user.config';

@Injectable()
export class RegisterGuard implements CanActivate {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly userRepositories: UserRepositories,
    // eslint-disable-next-line no-unused-vars
    private readonly userSecurity: UserSecurity,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email, password, name } = request.body;
    const token = request.headers[tokenName.REGISTER_REQUEST];
    if (!email || !password || !name || !token) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid request missing required fields',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // validate email
    const isValidEmail = RegisterRequest.validate(email);
    if (!isValidEmail) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid email',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // check if email already exist
    const user = await this.userRepositories.getUser(email);
    if (user) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'User already exist',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // validate token
    const tokenResult = await this.userSecurity.verifyJWT(
      token,
      'REGISTER_REQUEST',
    );
    if (!tokenResult.isValid || email !== tokenResult.email) {
      throw new HttpException(
        {
          status: 'Forbidden',
          data: null,
          message: 'Invalid token please try again',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
