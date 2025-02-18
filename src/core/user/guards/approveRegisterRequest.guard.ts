import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { RegisterRequest } from '../domain/user.entity';
import { HttpStatusCode } from 'axios';
import { UserRepositories } from 'src/core/user/repositories/user.repositories';
import { RegistrationRequests } from '@prisma/client'


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
            registerRequest = await this.userRepository.findRegisterRequest(body.email)
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