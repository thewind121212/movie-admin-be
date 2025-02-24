import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { HttpStatusCode } from 'axios';
import { UserRepositories } from 'src/core/user/repositories/user.repositories';
import { RegistrationRequests, User } from '@prisma/client'
import { is } from 'drizzle-orm';


@Injectable()
export class ApproveRegisterRequestGuard implements CanActivate {

    constructor(
        private readonly userRepository: UserRepositories
    ) {

    }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const request = context.switchToHttp().getRequest();
        const body = request.body
        const isValid = RegisterRequest.validate(body.email)
        let registerRequest: RegistrationRequests | null = null
        let isUserExist: User | null = null

        if (!isValid) {
            throw new HttpException(
                {
                    status: 'error',
                    data: null,
                    message: 'Invalid email'
                },
                HttpStatusCode.BadRequest
            )
        }
        try {

             [isUserExist, registerRequest] = await Promise.all([
                this.userRepository.getUser(body.email),
                this.userRepository.findRegisterRequest(body.email)
            ])
        } catch (error) {
            throw new HttpException(
                {
                    status: 'error',
                    data: null,
                    message: 'Internal server error'
                },
                HttpStatusCode.InternalServerError
            )
        }

        if (isUserExist) {
            throw new HttpException(
                {
                    status: 'error',
                    data: null,
                    message: 'User already exist'
                },
                HttpStatusCode.BadRequest
            )
        }

        if (!registerRequest) {
            throw new HttpException(
                {
                    status: 'error',
                    data: null,
                    message: 'Register request not found'
                },
                HttpStatusCode.NotFound
            )
        }

        return true
    }

}