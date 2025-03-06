import { Injectable } from '@nestjs/common';
import { UserRepositories } from '../repositories/user.repositories';
import { registerEmailTemplate } from 'src/email-templates/register';
import { MailOptions } from 'nodemailer/lib/smtp-transport';
import { UserSecurity } from '../security/user.security';
import { REGISTER_REQUEST_RETRY_DAY, USER_S3_BUCKET } from '../user.config';
import { DateTime } from 'luxon';
import crypto from 'bcrypt';
import { FORGOT_PASS_EXT, LOGIN_EXT } from '../user.config';
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import { User } from '@prisma/client';
import fs from 'fs';
import path from 'path';


@Injectable()
export class UserDomainServices {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly userRepositories: UserRepositories,
    // eslint-disable-next-line no-unused-vars
    private readonly userSecurityServices: UserSecurity,
    // eslint-disable-next-line no-unused-vars
    private readonly s3Service: S3Service,
  ) { }

  async registerRequest(email: string): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const registerRequest = await this.userRepositories.findRegisterRequest(email);

      if (!registerRequest) {
        await this.userRepositories.createRegisterRequest({ email });
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
          await this.userRepositories.findAndUpdateRegisterRequest(email);
        }
      }

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
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error creating register request',
      };
    }
  }

  approveRegisterRequest(email: string): {
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  } {
    try {
      const signToken = this.userSecurityServices.signJWT(
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

  async register(data: {
    email: string;
    password: string;
    token: string;
    name: string;
  }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const hashedPassword = await crypto.hash(data.password, 10);
      await this.userRepositories.createUser({
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

  async login(credentials: { email: string; password: string }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    token?: string;
    refreshToken?: string;
    message: string;
    is2FAEnabled?: boolean;
    twoFAnonce?: string;
  }> {
    try {
      // is email valid
      const user = await this.userRepositories.getUser(credentials.email);
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
      const token = this.userSecurityServices.signJWT(
        { email: credentials.email, userId: user.id },
        '1h',
        'AUTHENTICATION',
        true,
      );
      if (!token) {
        throw new Error('Error signing token');
      }

      //after gen acces token gen refresh token
      const refreshToken = this.userSecurityServices.signJWT(
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
        const nonce = this.userSecurityServices.genNonce();

        //save nonce to redis
        const reditsWriteResult = await this.userRepositories.writeToRedis(
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

  async forgotPassword(body: { email: string }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const user = await this.userRepositories.getUser(body.email);
      if (!user) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      const forgotPasswordToken = this.userSecurityServices.signJWT(
        { email: body.email, userId: user.id },
        '15m',
        'FORGOT_PASSWORD',
        true
      );
      if (!forgotPasswordToken) {
        throw new Error('Error signing token');
      }
      const reditsWriteResult = await this.userRepositories.writeToRedis(
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

  async submitForgotPassword(body: {
    token: string;
    password: string;
  }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    try {
      const tokenResult = await this.userSecurityServices.verifyJWT(
        body.token,
        'FORGOT_PASSWORD',
      );
      if (!tokenResult.isValid || !tokenResult.userId || !tokenResult.email) {
        return {
          isError: true,
          message: 'Invalid token',
        };
      }
      const isTokenUsed = await this.userRepositories.checkIsKeyIsExist(
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

      const user = await this.userRepositories.updateUser(
        tokenResult.email,
        'password',
        newPass,
      );

      if (!user) {
        throw new Error('Error updating user password');
      }

      const removeResult = await this.userRepositories.removeKey(
        tokenResult.userId + FORGOT_PASS_EXT,
      );
      const invalidTokenResult = await this.userRepositories.removeKey(
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

  async enableTOTP(
    email: string,
    password: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    qrCodeImageURL?: string;
  }> {
    try {
      const user = await this.userRepositories.getUser(email);

      if (!user) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      if (user?.totpSecret && user.totpSecret !== '') {
        return {
          isError: true,
          message: 'User already have 2FA TOTP enable',
        };
      }

      const isPasswordMatch = await crypto.compare(password, user.password);
      if (!isPasswordMatch) {
        return {
          isError: true,
          message: 'Invalid password',
        };
      }

      const genTOTP = await this.userSecurityServices.generateOTP(email);

      if (!genTOTP.qrCodeImageURL) {
        throw new Error('Error generating qr code');
      }

      return {
        isError: false,
        message: 'TOTP enabled successfully',
        qrCodeImageURL: genTOTP.qrCodeImageURL,
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error enabling TOTP',
      };
    }
  }

  async disableTOTP(
    email: string,
    password: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    try {
      const user = await this.userRepositories.getUser(email);

      if (!user) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      if (!user?.totpSecret || user.totpSecret === '') {
        return {
          isError: true,
          message: 'User does not have 2FA TOTP enable',
        };
      }

      const isPasswordMatch = await crypto.compare(password, user.password);
      if (!isPasswordMatch) {
        return {
          isError: true,
          message: 'Invalid password',
        };
      }

      await this.userRepositories.updateUser(email, 'totpSecret', null);

      return {
        isError: false,
        message: 'TOTP disable successfully',
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error disabling TOTP',
      };
    }
  }

  async verifyTOTP(
    email: string,
    token: string,
    nonce: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    token?: string;
    refreshToken?: string;
  }> {
    try {
      const user = await this.userRepositories.getUser(email);

      if (!user) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      if (!user?.totpSecret || user.totpSecret === '') {
        return {
          isError: true,
          message: 'User does not have 2FA TOTP enable',
        };
      }

      const cachingLogin = await this.userRepositories.getValueFromRedis(
        `${user?.id}${LOGIN_EXT}`,
      );
      if (!cachingLogin) {
        return {
          isError: true,
          message: 'Nonce not found',
        };
      }

      if (cachingLogin.nonce !== nonce) {
        return {
          isError: true,
          message: 'Invalid nonce',
        };
      }

      if (!cachingLogin.token || !cachingLogin.refreshToken) {
        throw new Error('Error getting token');
      }

      const verifyResult = this.userSecurityServices.verifyOTP(
        email,
        token,
        user,
      );

      if (verifyResult.isError) {
        return {
          isError: true,
          message: verifyResult.message,
        };
      }

      if (verifyResult.isInterNalError) {
        throw new Error('Error verifying OTP');
      }

      return {
        isError: false,
        message: 'Access granted TOTP verified successfully',
        refreshToken: cachingLogin.refreshToken,
        token: cachingLogin.token,
      };
    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error verifying TOTP',
      };
    }
  }



  async logout(
    accessToken: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    try {
      //verify access token

      const verifyAccessTokenResult = await this.userSecurityServices.verifyJWT(
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
      const invalidResult = await this.userRepositories.removeKey(
        `${verifyAccessTokenResult.email}-REFRESH`
      )

      //invalid access token from redis
      const invalidAccessToken = await this.userRepositories.removeKey(
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

  async getUser(
    userId: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    user?: User;
  }> {
    try {

      // get user from database 
      const userData = await this.userRepositories.getUser('_', userId);

      if (!userData) {
        return {
          isError: true,
          message: 'User not found',
        };
      }


      //remove sensitive data
      const userDataClone = { ...userData };
      delete (userDataClone as Partial<User>).password;
      delete (userDataClone as Partial<User>).totpSecret;




      return {
        isError: false,
        message: 'User retrieved successfully',
        user: userDataClone,
      };

    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error retrieving user',
      };
    }
  }


  async editUser(
    userId: string, data: {
      name?: string, birthDate?: Date, gender?: string, country?: string, timeZone?: string, bio?: string
    }
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    try {

      for (const key in data) {
        if (!data[key]) {
          delete data[key];
        }
      }


      // get user from database 
      const userData = await this.userRepositories.updateUser('_', '_', '_', userId, true, data as User);

      if (!userData) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      return {
        isError: false,
        message: 'User retrieved successfully',
      };

    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error retrieving user',
      };
    }
  }


  async uploadAvatar(
    userId: string, avatar: string, name: string
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    try {
      //verify is user exist

      const user = await this.userRepositories.getUser('_', userId);


      if (!user) {
        return {
          isError: true,
          message: 'Invalid access token',
        }
      }





      //perform upload to s3

      const newAvatar = `${user.id}/avatar/avatar${path.extname(name)}`
      const readStream = fs.createReadStream(avatar)
      await this.s3Service.upLoadToS3(USER_S3_BUCKET, newAvatar, readStream)

      //clean up old avatar on s3 this will be not efficient if the avatar is large so i run this in background
      //if the error happen i need cached to redis and crond job to clean up the old avatar
      this.s3Service.s3.listObjectsV2({
        Bucket: USER_S3_BUCKET,
        Prefix: `${user.id}/avatar/`,
        MaxKeys: 1000
      }, (err, data) => {
        if (err) {
          console.log("Internal Error", err)
          return
        }
        if (!data.Contents) return
        for (const content of data.Contents) {
          if (content.Key === newAvatar) continue
          this.s3Service.s3.deleteObject({
            Bucket: USER_S3_BUCKET,
            Key: content.Key!
          }, (err) => {
            if (err) {
              console.log("Internal Error", err)
              return
            }
          })
          console.log(`Deleted ${content.Key}`)
        }
      })




      return {
        isError: false,
        message: 'Avatar uploaded successfully',
      };



    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error uploading user avatar',
      };
    }
  }
}
