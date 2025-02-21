import { HttpStatus, Injectable } from '@nestjs/common';
import { UserDomainServices } from '../domain/user.domainServices';
import { NodemailerService } from 'src/Infrastructure/nodemailer/nodemailer.service';

@Injectable()
export class UserService {
    constructor(
        private readonly userDomainServices: UserDomainServices,
        private readonly mailService: NodemailerService
    ) { }

    async registerRequest(email: string): Promise<{
        message: string,
        status: HttpStatus
    }> {
        const registerRequestResult = await this.userDomainServices.registerRequest(email);

        if (registerRequestResult.isInternalError) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }


        if (registerRequestResult.isError) {
            return {
                message: registerRequestResult.message,
                status: HttpStatus.BAD_REQUEST
            }
        }

        this.mailService.nodemailer.sendMail(registerRequestResult.mailOptions!);

        return {
            message: 'Email registered successfully',
            status: HttpStatus.CREATED
        }
    }


    async approveRegisterRequest(email: string): Promise<{
        message: string,
        status: HttpStatus
    }> {

        try {
            const approveRegsiterRequestResult = await this.userDomainServices.approveRegisterRequest(email)

            if (approveRegsiterRequestResult.isInternalError) {
                return {
                    message: 'Internal server error',
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                }
            }

            if (approveRegsiterRequestResult.isError) {
                return {
                    message: approveRegsiterRequestResult.message,
                    status: HttpStatus.BAD_REQUEST
                }
            }


            this.mailService.nodemailer.sendMail(approveRegsiterRequestResult.mailOptions!);

            return {
                message: 'Email approved successfully',
                status: HttpStatus.OK
            }

        } catch (error) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }

        }
    }


    async register(body: { email: string, password: string, token: string, name: string }): Promise<{
        message: string,
        status: HttpStatus
    }> {
        try {
            const registerResult = await this.userDomainServices.register(body)

            if (registerResult.isInternalError) {
                return {
                    message: 'Internal server error',
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                }
            }

            if (registerResult.isError) {
                return {
                    message: registerResult.message,
                    status: HttpStatus.BAD_REQUEST
                }
            }

            this.mailService.nodemailer.sendMail(registerResult.mailOptions!);
            return {
                message: 'User registered successfully',
                status: HttpStatus.CREATED
            }


        } catch (error) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }


    async login(credentials: { email: string, password: string }): Promise<{
        message: string,
        status: HttpStatus
        token?: string
    }> {
        try {
            const loginResult = await this.userDomainServices.login(credentials)

            if (loginResult.isInternalError) {
                return {
                    message: 'Internal server error',
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                }
            }

            if (loginResult.isError) {
                return {
                    message: loginResult.message,
                    status: HttpStatus.BAD_REQUEST
                }
            }

            return {
                message: loginResult.message,
                token: loginResult.token,
                status: HttpStatus.OK
            }

        } catch (error) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    async forgotPassword(body: { email: string }): Promise<{
        message: string,
        status: HttpStatus
    }> {
        try {
            const forgotPasswordResult = await this.userDomainServices.forgotPassword(body)

            if (forgotPasswordResult.isInternalError) {
                return {
                    message: 'Internal server error',
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                }
            }

            if (forgotPasswordResult.isError) {
                return {
                    message: forgotPasswordResult.message,
                    status: HttpStatus.BAD_REQUEST
                }
            }

            this.mailService.nodemailer.sendMail(forgotPasswordResult.mailOptions!);
            return {
                message: 'Email sent successfully',
                status: HttpStatus.OK
            }

        } catch (error) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    async submitForgotPassword(body: { token: string, password: string }): Promise<{
        message: string,
        status: HttpStatus
    }> {
        try {
            const submitForgotPasswordResult = await this.userDomainServices.submitForgotPassword(body)

            if (submitForgotPasswordResult.isInternalError) {
                return {
                    message: 'Internal server error',
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                }
            }

            if (submitForgotPasswordResult.isError) {
                return {
                    message: submitForgotPasswordResult.message,
                    status: HttpStatus.BAD_REQUEST
                }
            }


            this.mailService.nodemailer.sendMail(submitForgotPasswordResult.mailOptions!);

            return {
                message: submitForgotPasswordResult.message,
                status: HttpStatus.OK
            }

        } catch (error) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

}
