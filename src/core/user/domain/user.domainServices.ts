import { Injectable } from "@nestjs/common";
import { UserRepositories } from "../repositories/user.repositories";
import { registerEmailTemplate } from "src/email-templates/register";
import { MailOptions } from "nodemailer/lib/smtp-transport";
import { UserSecurity } from "../security/user.security";
import { CodeStarNotifications } from "aws-sdk";


@Injectable()
export class UserDomainServices {

    constructor(
        private readonly userRepositories: UserRepositories,
        private readonly userSecurityServices: UserSecurity
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


    async approveRegisterRequest(email: string): Promise<{
        isError: boolean,
        isInternalError?: boolean,
        message: string,
        mailOptions?: MailOptions
    }> {
        try {
            const signToken = this.userSecurityServices.signJWT({
                email
            }, '15m', 'register-request-approval')

            if (!signToken) {
                throw new Error('Error signing token')
            }

            const emailContent = registerEmailTemplate(
                'Thank you for patience!',
                ` 
                Your email has been approved. Please click the link below to complete your registration. This link will expire in 15 minutes. 
                If you did not request this, please ignore this email.
                <br/>
                <a href="{{.AlternativeLink}}"
                style="color: rgb(0, 141, 163); --darkreader-inline-color: #5ae9ff; margin-top: 10px;"
                target="_blank"
                data-saferedirecturl=""
                data-darkreader-inline-color="${process.env.FRONTEND_URL}?p=${signToken}">Register Link!
               </a> 
            `
            )

            const mailOptions = {
                from: 'admin@wliafdew.dev',
                to: email,
                subject: 'Register request',
                html: emailContent,
            }


            return {
                isError: false,
                message: 'Register request approved',
                mailOptions
            }

        } catch (error) {
            return {
                isError: true,
                isInternalError: true,
                message: 'Error approving register request'
            }
        }
    }

}