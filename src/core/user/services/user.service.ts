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
        if (registerRequestResult.isError) {
            return {
                message: registerRequestResult.message,
                status: HttpStatus.BAD_REQUEST
            }
        }

        if (registerRequestResult.isInternalError) {
            return {
                message: 'Internal server error',
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
        await this.mailService.nodemailer.sendMail(registerRequestResult.mailOptions!);

        return {
            message: 'Email registered successfully',
            status: HttpStatus.CREATED
        }
    }

}
