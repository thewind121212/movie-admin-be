import { UserRepositories } from "../../repositories/user.repositories";
import crypto from 'bcrypt';
import { MailOptions } from 'nodemailer/lib/smtp-transport';
import { registerEmailTemplate } from 'src/email-templates/register';
import { LOGIN_EXT, USER_PASSWORD_SALT_ROUND } from "../../user.config";
import { UserSecurity } from "../../security/user.security";

export async function register(data: {
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

export async function login(credentials: { email: string; password: string }, userRepositories: UserRepositories, userSecurityServices: UserSecurity): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    token?: string;
    refreshToken?: string;
    message: string;
    email?: string;
    userId?: string;
    is2FAEnabled?: boolean;
    twoFAnonce?: string;
}> {
    try {
        // is email valid
        const user = await userRepositories.getUser(credentials.email);
        if (!user) {
            return {
                isError: true,
                message: 'Invalid password or email',
            };
        }

        //compare password
        const isPasswordMatch = await crypto.compare(
            credentials.password,
            user.password,
        );

        if (!isPasswordMatch) {
            return {
                isError: true,
                message: 'Invalid password or email',
            };
        }

        //after all valid gen access token
        const token = userSecurityServices.signJWT(
            { email: credentials.email, userId: user.id },
            '1h',
            'AUTHENTICATION',
            true,
        );
        if (!token) {
            throw new Error('Error signing token');
        }

        //after gen acces token gen refresh token
        const refreshToken = userSecurityServices.signJWT(
            { email: credentials.email, userId: user.id },
            '7d',
            'REFRESH',
            true
        );
        if (!refreshToken) {
            throw new Error('Error signing refresh token');
        }

        //if 2fa is enable
        if (user.totpSecret && user.totpSecret !== '') {
            // generate nonce
            const nonce = userSecurityServices.genNonce();

            //save nonce to redis
            const reditsWriteResult = await userRepositories.writeToRedis(
                `${user.id}${LOGIN_EXT}`,
                JSON.stringify({
                    token,
                    nonce,
                    refreshToken,
                }),
                '15m',
            );

            if (!reditsWriteResult) {
                throw new Error('Error writing nonce');
            }

            return {
                isError: false,
                message: 'User need to verify TOTP',
                is2FAEnabled: true,
                twoFAnonce: nonce,
            };
        }

        return {
            isError: false,
            message: 'User logged in successfully',
            token,
            userId: user.id,
            refreshToken,
        };
    } catch (error) {
        console.log('Internal Error', error);
        return {
            isError: true,
            isInternalError: true,
            message: 'Error login',
        };
    }
}

export async function logout(
    accessToken: string,
    userRepositories: UserRepositories,
    userSecurityServices: UserSecurity
): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
}> {
    try {
        //verify access token

        const verifyAccessTokenResult = await userSecurityServices.verifyJWT(
            accessToken,
            'AUTHENTICATION'
        )

        if (!verifyAccessTokenResult.isValid) {
            return {
                isError: true,
                message: 'Invalid access token',
            }
        }

        //invalid refresh token from redis
        const invalidResult = await userRepositories.removeKey(
            `${verifyAccessTokenResult.email}-REFRESH`
        )

        //invalid access token from redis
        const invalidAccessToken = await userRepositories.removeKey(
            `${verifyAccessTokenResult.email}-AUTHENTICATION`
        )

        if (!invalidResult || !invalidAccessToken) {
            throw new Error('Error removing refresh token')
        }

        // all process success
        return {
            isError: false,
            message: 'Logout successfully',
        };

    } catch (error) {
        console.log('Internal Error', error);
        return {
            isError: true,
            isInternalError: true,
            message: 'Error during logout',
        };
    }
}


export async function changePassword(payload: {
    userId: string;
    oldPassword: string;
    newPassword: string;
  },
  userRepositories: UserRepositories,
): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {


    try {
      // get user from database

      const user = await userRepositories.getUser('_', payload.userId);
      if (!user) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      //compare old password
      const isPasswordMatch = await crypto.compare(
        payload.oldPassword,
        user.password,
      );

      if (!isPasswordMatch) {
        return {
          isError: true,
          message: 'Invalid password',
        };
      }

      //hash new password
      payload.newPassword = await crypto.hash(payload.newPassword, USER_PASSWORD_SALT_ROUND );

      //update password
      await userRepositories.updateUser(user.email, 'password', payload.newPassword);


      const emailContent = registerEmailTemplate(
        'Password changed!',
        `You have successfully changed your password at ${new Date().toISOString().split('T')[0]} . If you did not perform this action, please contact us immediately.`,
      );


        const mailOptions = {
            from: 'admin@wliafdew.dev',
            to: user.email,
            subject: 'Register request',
            html: emailContent,
        };


      return {
        isError: false,
        message: 'Change password successfully',
        mailOptions,
      }



    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error change password',
      };

    }
  }

