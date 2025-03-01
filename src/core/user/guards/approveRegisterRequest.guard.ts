import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { UserRepositories } from 'src/core/user/repositories/user.repositories';
import { RegistrationRequests, User } from '@prisma/client';

@Injectable()
export class ApproveRegisterRequestGuard implements CanActivate {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly userRepository: UserRepositories) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    const isValid = RegisterRequest.validate(body.email);
    let registerRequest: RegistrationRequests | null = null;
    let isUserExist: User | null = null;

    if (!isValid) {
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'Invalid email',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      [isUserExist, registerRequest] = await Promise.all([
        this.userRepository.getUser(body.email),
        this.userRepository.findRegisterRequest(body.email),
      ]);
    } catch (error) {
      console.log('Internal server error', error);
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (isUserExist) {
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'User already exist',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!registerRequest) {
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'Register request not found',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }
}
