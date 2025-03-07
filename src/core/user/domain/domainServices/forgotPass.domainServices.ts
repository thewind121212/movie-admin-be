
import { MailOptions } from 'nodemailer/lib/smtp-transport';
import { FORGOT_PASS_EXT } from '../../user.config';
import { registerEmailTemplate } from 'src/email-templates/register';
import { UserRepositories } from '../../repositories/user.repositories';
import { UserSecurity } from '../../security/user.security';
import crypto from 'bcrypt';


export async function forgotPassword(body: { email: string }, userRepositories: UserRepositories, userSecurityServices: UserSecurity ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const user = await userRepositories.getUser(body.email);
      if (!user) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      const forgotPasswordToken = userSecurityServices.signJWT(
        { email: body.email, userId: user.id },
        '15m',
        'FORGOT_PASSWORD',
        true
      );
      if (!forgotPasswordToken) {
        throw new Error('Error signing token');
      }
      const reditsWriteResult = await userRepositories.writeToRedis(
        user.id + FORGOT_PASS_EXT,
        JSON.stringify({}),
        '15m',
      );

      if (!reditsWriteResult) {
        return {
          isError: true,
          message: 'Error writing reset password token',
        };
      }

      const emailContent = registerEmailTemplate(
        'Your reset password request!',
        ` 
                You have requested to reset your password. Please click the link below to create a new password. This link will expire in 15 minutes.
                If you did not request this, please ignore this email.
                <br/>
                <a href="${process.env.FRONTEND_URL}/reset-password?p=${forgotPasswordToken}"
                style="color: rgb(0, 141, 163); --darkreader-inline-color: #5ae9ff; margin-top: 10px;"
                target="_blank"
                data-saferedirecturl="">Reset Link!
               </a> 
            `,
      );

      const mailOptions = {
        from: 'admin@wliafdew.dev',
        to: body.email,
        subject: 'Register request',
        html: emailContent,
      };

      return {
        isError: false,
        message: 'Forgot password email sent',
        mailOptions,
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error forgot password',
      };
    }
  }

 export  async function submitForgotPassword(body: {
    token: string;
    password: string;
  },
  userRepositories: UserRepositories,
  userSecurityServices: UserSecurity,
): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const tokenResult = await userSecurityServices.verifyJWT(
        body.token,
        'FORGOT_PASSWORD',
      );
      if (!tokenResult.isValid || !tokenResult.userId || !tokenResult.email) {
        return {
          isError: true,
          message: 'Invalid token',
        };
      }
      const isTokenUsed = await userRepositories.checkIsKeyIsExist(
        tokenResult.userId + FORGOT_PASS_EXT,
      );
      if (isTokenUsed === null) {
        throw new Error('Error checking token');
      }

      if (!isTokenUsed) {
        return {
          isError: true,
          message: 'Token already used',
        };
      }

      const newPass = await crypto.hash(body.password, 10);

      const user = await userRepositories.updateUser(
        tokenResult.email,
        'password',
        newPass,
      );

      if (!user) {
        throw new Error('Error updating user password');
      }

      const removeResult = await userRepositories.removeKey(
        tokenResult.userId + FORGOT_PASS_EXT,
      );
      const invalidTokenResult = await userRepositories.removeKey(
        `${user.email}-${'FORGOT_PASSWORD'}`,
      );

      if (!invalidTokenResult) {
        throw new Error('Error removing invalid token');
      }

      if (!removeResult) {
        throw new Error('Error removing reset password token');
      }

      const emailContent = registerEmailTemplate(
        'Your password has been reset!',
        'You have successfully reset your password. You can now login to your account.',
      );

      const mailOptions = {
        from: 'admin@wliafdew.dev',
        to: tokenResult.email,
        subject: 'Register request',
        html: emailContent,
      };

      return {
        isError: false,
        message: 'Password reset successfully',
        mailOptions,
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error submit forgot password',
      };
    }
  }

