import { Injectable } from "@nestjs/common";
import { UserRepositories } from "../repositories/user.repositories";
import { registerEmailTemplate } from "src/email-templates/register";
import { MailOptions } from "nodemailer/lib/smtp-transport";
import { UserSecurity } from "../security/user.security";
import { REGISTER_REQUEST_RETRY_DAY } from "../user.config";
import { DateTime } from 'luxon';
import crypto from 'bcrypt'



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
            const [registerRequest, user] = await Promise.all([
                this.userRepositories.findRegisterRequest(email),
                this.userRepositories.findUser(email)
            ])

            if (user) {
                return {
                    isError: true,
                    message: 'User already exist'
                }
            }


            if (!registerRequest) {
                await this.userRepositories.createRegisterRequest({ email })
            } else {
                const now = DateTime.now()
                const lastRequest = DateTime.fromJSDate(registerRequest.updatedAt)
                const dayDiff = now.diff(lastRequest, 'days').days

                if (dayDiff < REGISTER_REQUEST_RETRY_DAY) {
                    return {
                        isError: true,
                        message: `Your request being processed. Please wait for ${(REGISTER_REQUEST_RETRY_DAY - dayDiff).toFixed()} days before requesting again`
                    }
                } else {
                    await this.userRepositories.findAndUpdateRegisterRequest(email)
                }
            }


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
            }, '3d', 'register-request-approval')

            if (!signToken) {
                throw new Error('Error signing token')
            }

            const emailContent = registerEmailTemplate(
                'Thank you for patience!',
                ` 
                Your email has been approved. Please click the link below to complete your registration. This link will expire in 3 days. 
                If you did not request this, please ignore this email.
                <br/>
                <a href="${process.env.FRONTEND_URL}/register?p=${signToken}"
                style="color: rgb(0, 141, 163); --darkreader-inline-color: #5ae9ff; margin-top: 10px;"
                target="_blank"
                data-saferedirecturl="">Register Link!
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

    async register(data: { email: string, password: string, token: string, name: string }): Promise<{
        isError: boolean,
        isInternalError?: boolean,
        message: string
        mailOptions?: MailOptions
    }> {
        try {
            const hashedPassword = await crypto.hash(data.password, 10)
            await this.userRepositories.createUser({
                email: data.email,
                password: hashedPassword,
                name: data.name

            })

            const emailContent = registerEmailTemplate(
                'Welcome to our platform!',
                "You have successfully registered with us. You can now login to your account."
            )


            const mailOptions = {
                from: 'admin@wliafdew.dev',
                to: data.email,
                subject: 'Register request',
                html: emailContent,
            }


            return {
                isError: false,
                message: 'User created successfully',
                mailOptions
            }

        } catch (error) {
            return {
                isError: true,
                isInternalError: true,
                message: 'Error create user'
            }

        }
    }

    async login(credentials: { email: string, password: string }): Promise<{
        isError: boolean,
        isInternalError?: boolean,
        token?: string,
        message: string
    }> {



        try {


            // is email valid
            const user = await this.userRepositories.findUser(credentials.email)
            if (!user) {
                return {
                    isError: true,
                    message: 'User not found'
                }
            }


            //compare password
            const isPasswordMatch = await crypto.compare(credentials.password, user.password)

            if (!isPasswordMatch) {
                return {
                    isError: true,
                    message: 'Invalid password'
                }
            }

            //after all valid gen token 

            const token = this.userSecurityServices.signJWT({ email: credentials.email, userId: user.id}, '3d', 'login')
            if (!token) {
                throw new Error('Error signing token')
            }

            return {
                isError: false,
                message: 'User logged in successfully',
                token,
            }

        } catch (error) {
            return {
                isError: true,
                isInternalError: true,
                message: 'Error login'
            }

        }

    }

}