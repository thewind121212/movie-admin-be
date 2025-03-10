import { HttpStatus, Injectable } from '@nestjs/common';
import { UserDomainServices } from '../domain/domainServices/user.domainServices';
import { NodemailerService } from 'src/Infrastructure/nodemailer/nodemailer.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly userDomainServices: UserDomainServices,
    // eslint-disable-next-line no-unused-vars
    private readonly mailService: NodemailerService,
  ) { }

  async registerRequest(email: string): Promise<{
    message: string;
    status: HttpStatus;
  }> {
    const registerRequestResult =
      await this.userDomainServices.registerRequest(email);

    if (registerRequestResult.isInternalError) {
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    if (registerRequestResult.isError) {
      return {
        message: registerRequestResult.message,
        status: HttpStatus.BAD_REQUEST,
      };
    }

    void this.mailService.nodemailer.sendMail(
      registerRequestResult.mailOptions!,
    );

    return {
      message: 'Email registered successfully',
      status: HttpStatus.CREATED,
    };
  }

  approveRegisterRequest(email: string): {
    message: string;
    status: HttpStatus;
  } {
    try {
      const approveRegsiterRequestResult =
        this.userDomainServices.approveRegisterRequest(email);

      if (approveRegsiterRequestResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (approveRegsiterRequestResult.isError) {
        return {
          message: approveRegsiterRequestResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      void this.mailService.nodemailer.sendMail(
        approveRegsiterRequestResult.mailOptions!,
      );

      return {
        message: 'Email approved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async register(body: {
    email: string;
    password: string;
    token: string;
    name: string;
  }): Promise<{
    message: string;
    status: HttpStatus;
  }> {
    try {
      const registerResult = await this.userDomainServices.register(body);

      if (registerResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (registerResult.isError) {
        return {
          message: registerResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      void this.mailService.nodemailer.sendMail(registerResult.mailOptions!);
      return {
        message: 'User registered successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async login(credentials: { email: string; password: string }): Promise<{
    message: string;
    status: HttpStatus;
    userId?: string,
    email?: string;
    twoFAnonce?: string;
    token?: string;
    refreshToken?: string;
  }> {
    try {
      const loginResult = await this.userDomainServices.login(credentials);
      console.log(loginResult)

      if (loginResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (loginResult.isError) {
        return {
          message: loginResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (loginResult.is2FAEnabled) {
        return {
          message: 'Created process for 2FA enabled with TOTP',
          status: HttpStatus.CREATED,
          twoFAnonce: loginResult.twoFAnonce,
        };
      }

      return {
        message: loginResult.message,
        token: loginResult.token,
        userId: loginResult.userId,
        refreshToken: loginResult.refreshToken,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async forgotPassword(body: { email: string }): Promise<{
    message: string;
    status: HttpStatus;
  }> {
    try {
      const forgotPasswordResult =
        await this.userDomainServices.forgotPassword(body);

      if (forgotPasswordResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (forgotPasswordResult.isError) {
        return {
          message: forgotPasswordResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      void this.mailService.nodemailer.sendMail(
        forgotPasswordResult.mailOptions!,
      );
      return {
        message: 'Email sent successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async submitForgotPassword(body: {
    token: string;
    password: string;
  }): Promise<{
    message: string;
    status: HttpStatus;
  }> {
    try {
      const submitForgotPasswordResult =
        await this.userDomainServices.submitForgotPassword(body);

      if (submitForgotPasswordResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (submitForgotPasswordResult.isError) {
        return {
          message: submitForgotPasswordResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      void this.mailService.nodemailer.sendMail(
        submitForgotPasswordResult.mailOptions!,
      );

      return {
        message: submitForgotPasswordResult.message,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async enableTOTP(
    email: string,
    password: string,
  ): Promise<{
    message: string;
    status: HttpStatus;
    qrCodeImageURL?: string;
  }> {
    try {
      const enableTOTPResult = await this.userDomainServices.enableTOTP(
        email,
        password,
      );

      if (enableTOTPResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (enableTOTPResult.isError) {
        return {
          message: enableTOTPResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: enableTOTPResult.message,
        status: HttpStatus.CREATED,
        qrCodeImageURL: enableTOTPResult.qrCodeImageURL,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }



  async changePassword(payload: { currentPassword: string, newPassword : string ,userId:string }): Promise<{
    message: string;
    status: HttpStatus;
  }> {
    try {
      const changePasswordResult =
        await this.userDomainServices.changePassword(payload);

      if (changePasswordResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (changePasswordResult.isError) {
        return {
          message: changePasswordResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      void this.mailService.nodemailer.sendMail(
        changePasswordResult.mailOptions!,
      );

      return {
        message: 'Password changed successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }




  async disableTOTP(
    email: string,
    password: string,
  ): Promise<{
    message: string;
    status: HttpStatus;
    qrCodeImageURL?: string;
  }> {
    try {
      const enableTOTPResult = await this.userDomainServices.disableTOTP(
        email,
        password,
      );

      if (enableTOTPResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (enableTOTPResult.isError) {
        return {
          message: enableTOTPResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: enableTOTPResult.message,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async verifyTOTP(
    email: string,
    token: string,
    nonce: string,
  ): Promise<{
    message: string;
    status: HttpStatus;
    token?: string;
    userId?: string;
    refreshToken?: string;
  }> {
    try {
      const enableTOTPResult = await this.userDomainServices.verifyTOTP(
        email,
        token,
        nonce,
      );

      if (enableTOTPResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (enableTOTPResult.isError) {
        return {
          message: enableTOTPResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: enableTOTPResult.message,
        token: enableTOTPResult.token,
        refreshToken: enableTOTPResult.refreshToken,
        userId: enableTOTPResult.userId,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }


  async logout(accessToken: string): Promise<{
    message: string;
    status: HttpStatus;
  }> {
    try {
      const logoutResult = await this.userDomainServices.logout(accessToken);

      if (logoutResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (logoutResult.isError) {
        return {
          message: logoutResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: logoutResult.message,
        status: HttpStatus.OK,
      }


    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }



  async getUser(userId: string): Promise<{
    message: string;
    data: User | null;
    status: HttpStatus;
  }> {
    try {
      const getUserResult = await this.userDomainServices.getUser(userId);

      if (getUserResult.isInternalError) {
        return {
          message: 'Internal server error',
          data: null,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (getUserResult.isError || !getUserResult.user) {
        return {
          message: getUserResult.message,
          data: null,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: getUserResult.message,
        data: {
          ...getUserResult.user,
        },
        status: HttpStatus.OK,
      }

    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        data: null,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async editUser(userId: string, data: {
    name?: string, birthDate?: Date, gender?: string, country?: string, timeZone?: string, bio?: string
  }): Promise<{
    message: string;
    status: HttpStatus;
  }> {

    try {
      const getUserResult = await this.userDomainServices.editUser(userId, data);

      if (getUserResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (getUserResult.isError) {
        return {
          message: getUserResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: getUserResult.message,
        status: HttpStatus.OK,
      }

    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

  }


  async uploadAvatar(userId: string | undefined, file: string, name: string): Promise<{
    message: string;
    status: HttpStatus;
  }> {

    try {
      if (!userId) {
        return {
          message: 'Access token is required',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      const getUserResult = await this.userDomainServices.uploadAvatar(userId, file, name);


      if (getUserResult.isInternalError) {
        return {
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      if (getUserResult.isError) {
        return {
          message: getUserResult.message,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      return {
        message: getUserResult.message,
        status: HttpStatus.OK,
      }

    } catch (error) {
      console.log('Internal server error', error);
      return {
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

  }

}
