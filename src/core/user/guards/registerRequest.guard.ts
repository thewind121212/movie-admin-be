import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { UserRepositories } from '../repositories/user.repositories';

@Injectable()
export class RegisterRequestGuard implements CanActivate {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly userrepositories: UserRepositories,
  ) {
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    const isValid = RegisterRequest.validate(body.email);

    if (!isValid) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'Invalid email',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const userExist = await this.userrepositories.getUser(body.email);
    if (userExist) {
      throw new HttpException(
        {
          status: 'fail',
          data: null,
          message: 'User already exist',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }
}
