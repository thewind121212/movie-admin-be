import { Injectable } from "@nestjs/common";
import { UserRepositories } from "../repositories/user.repositories";
import { registerEmailTemplate } from "src/email-templates/register";
import { MailOptions } from "nodemailer/lib/smtp-transport";


@Injectable()
export class UserDomainServices {

    constructor(
        private readonly userRepositories: UserRepositories
    ) { }

    async registerRequest(email: string): Promise<{
        isError: boolean,
        isInternalError?: boolean,
        message: string,
        mailOptions?: MailOptions
    }> {

        try {
            this.userRepositories.createRegisterRequest({ email })


            const emailContent = registerEmailTemplate(
                'Thank you for registering with us!',
                "You will receive a separate email with a registration link once your email is approved. Please allow up to 2 business days for processing."
            )

            const mailOptions = {
                from: 'admin@wliafdew.dev',
                to: email,
                subject: 'Register request',
                html: emailContent,
            }

            return {
                isError: false,
                message: 'Register request created successfully',
                mailOptions,
            }

        } catch (error) {
            return {
                isError: true,
                isInternalError: true,
                message: 'Error creating register request'
            }
        }


    }

}