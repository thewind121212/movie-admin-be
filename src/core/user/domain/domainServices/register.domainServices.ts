



import { UserSecurity } from "../../security/user.security";

import { DateTime } from 'luxon';
import { MailOptions } from 'nodemailer/lib/smtp-transport';

import { REGISTER_REQUEST_RETRY_DAY} from '../../user.config';
import { registerEmailTemplate } from 'src/email-templates/register';
import { UserRepositories } from '../../repositories/user.repositories';
import crypto from 'bcrypt';

export  async function registerRequest(email: string, userRepositories : UserRepositories ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      // EXTRACT: Move this register request handling to a separate function
      // like "handleRegisterRequestCreationOrUpdate(email)"
      const registerRequest = await userRepositories.findRegisterRequest(email);

      if (!registerRequest) {
        await userRepositories.createRegisterRequest({ email });
      } else {
        const now = DateTime.now();
        const lastRequest = DateTime.fromJSDate(registerRequest.updatedAt);
        const dayDiff = now.diff(lastRequest, 'days').days;

        if (dayDiff < REGISTER_REQUEST_RETRY_DAY) {
          return {
            isError: true,
            message: `Your request being processed. Please wait for ${(REGISTER_REQUEST_RETRY_DAY - dayDiff).toFixed()} days before requesting again`,
          };
        } else {
          await userRepositories.findAndUpdateRegisterRequest(email);
        }
      }

      // EXTRACT: Move email preparation to a separate function
      // like "prepareRegisterRequestEmail(email)"
      const emailContent = registerEmailTemplate(
        'Thank you for registering with us!',
        'You will receive a separate email with a registration link once your email is approved. Please allow up to 2 business days for processing.',
      );

      const mailOptions = {
        from: 'admin@wliafdew.dev',
        to: email,
        subject: 'Register request',
        html: emailContent,
      };

      return {
        isError: false,
        message: 'Register request created successfully',
        mailOptions,
      };
    } catch (error) {
      // EXTRACT: Move error handling to a common error handler function
      // like "handleRegisterRequestError(error)"
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error creating register request',
      };
    }
  }


export function approveRegisterRequest(email: string, userSecurityServices: UserSecurity): {
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
} {
    try {
        const signToken = userSecurityServices.signJWT(
            {
                email,
            },
            '3d',
            'REGISTER_REQUEST',
            false
        );

        if (!signToken) {
            throw new Error('Error signing token');
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
            `,
        );

        const mailOptions = {
            from: 'admin@wliafdew.dev',
            to: email,
            subject: 'Register request',
            html: emailContent,
        };

        return {
            isError: false,
            message: 'Register request approved',
            mailOptions,
        };
    } catch (error) {
        console.log('Internal Error', error);
        return {
            isError: true,
            isInternalError: true,
            message: 'Error approving register request',
        };
    }
}

export  async function register(data: {
    email: string;
    password: string;
    token: string;
    name: string;
  },
  userRepositories: UserRepositories,
): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const hashedPassword = await crypto.hash(data.password, 10);
      await userRepositories.createUser({
        email: data.email,
        password: hashedPassword,
        name: data.name,
      });

      const emailContent = registerEmailTemplate(
        'Welcome to our platform!',
        'You have successfully registered with us. You can now login to your account.',
      );

      const mailOptions = {
        from: 'admin@wliafdew.dev',
        to: data.email,
        subject: 'Register request',
        html: emailContent,
      };

      return {
        isError: false,
        message: 'User created successfully',
        mailOptions,
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error create user',
      };
    }
  }



