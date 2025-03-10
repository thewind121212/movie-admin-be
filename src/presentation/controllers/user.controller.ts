import {
  Controller,
  Body,
  Post,
  Response,
  HttpStatus,
  UseGuards,
  Request,
  Delete,
  Put,
} from '@nestjs/common';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { UserService } from 'src/core/user/services/user.service';
import { ResponseType } from 'src/interface/response.interface';
//guard
import { RegisterRequestGuard } from 'src/core/user/guards/registerRequest.guard';
import { ApproveRegisterRequestGuard } from 'src/core/user/guards/approveRegisterRequest.guard';
import { ValidateTokenRegisterRequestGuard } from 'src/core/user/guards/validateJWTRegisterRequest.guard';
import { RegisterGuard } from 'src/core/user/guards/register.guard';
import { LoginGuard } from 'src/core/user/guards/login.guard';
import { ForgotPasswordGuard } from 'src/core/user/guards/forgotPassword.guard';
import { VerifyResetLinkGuard } from 'src/core/user/guards/verifyResetLink.guard';
import { SubmitForgotPassGuard } from 'src/core/user/guards/submitForgotPassword.guard';
import { verifyAccessTokenGuard } from 'src/core/user/guards/verifyAccessToken.guard';
import { refreshAccessTokenGuard } from 'src/core/user/guards/refeshAccessToken.guard';
import { requestTOTPGuard } from 'src/core/user/guards/requestTOTP.guard';
import { verifyTOTPGuard } from 'src/core/user/guards/verifyTOTP.guard';
import { tokenName } from 'src/core/user/user.config';
import { IsValidAccessTokenGuard } from 'src/core/user/guards/isvalidAccessToken.guard';
import { getUserGuard } from 'src/core/user/guards/getUser.guard';
import { editUserGuard } from 'src/core/user/guards/editUserGuard.guard';
import formidable from 'formidable';
import { ChangePassGuard } from 'src/core/user/guards/changePassword.guard';
import { enableTOTPGuard } from 'src/core/user/guards/enableTOTP.guard';
import { disableTOTPGuard } from 'src/core/user/guards/disableTOTP.guard';

@Controller('user')
export class UserController {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly userService: UserService,

  ) { }

  @Post('auth/registerRequest/create')
  @UseGuards(RegisterRequestGuard)
  async registerRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse,
  ): Promise<ExpressResponse> {
    const { status, message } = await this.userService.registerRequest(email);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/registerRequest/validate')
  @UseGuards(ValidateTokenRegisterRequestGuard)
  validateRegisterRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse,
  ) {
    const response: ResponseType = {
      message: 'Register request is valid',
      data: {
        email,
      },
      created_at: new Date(),
    };

    return res.status(HttpStatus.OK).json({ ...response });
  }

  @Post('auth/registerRequest/approve')
  @UseGuards(ApproveRegisterRequestGuard)
  approveRegisterRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse,
  ) {
    const { status, message } = this.userService.approveRegisterRequest(email);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/register')
  @UseGuards(RegisterGuard)
  async register(
    @Body() body: { email: string; password: string; name: string },
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const { email, password, name } = body;

    // Note: No need to check because the guard will check it
    const registerToken = req.headers[tokenName.REGISTER_REQUEST] as string;

    const { status, message } = await this.userService.register({
      email,
      password,
      token: registerToken,
      name,
    });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/login')
  @UseGuards(LoginGuard)
  async login(
    @Body() body: { email: string; password: string },
    @Response() res: ExpressResponse,
  ) {
    const credential = body;

    const { status, message, token, refreshToken, twoFAnonce, userId } =
      await this.userService.login(credential);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    if ((!token || !refreshToken) && status === HttpStatus.OK) {
      response.message = 'Internal server error';
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ ...response });
    }

    if (status === HttpStatus.CREATED && !twoFAnonce) {
      response.message = 'Internal server error';
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ ...response });
    }

    if (status === HttpStatus.OK) {
      return res
        .status(status)
        .json({ ...response, data: { token, refreshToken, userId } });
    } else if (status === HttpStatus.CREATED) {
      return res.status(status).json({
        ...response,
        data: { nonce: twoFAnonce, isTwoFaEnabled: true },
      });
    } else {
      return res.status(status).json({ ...response });
    }
  }


  @Put('auth/changePassword')
  @UseGuards(ChangePassGuard)
  async changePassword(
    @Body() body: { currentPassword: string, newPassword: string, userId: string },
    @Response() res: ExpressResponse,
  ) {
    const { currentPassword, newPassword, userId } = body;
    const { status, message } = await this.userService.changePassword({
      currentPassword,
      newPassword,
      userId,
    });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/forgot/request')
  @UseGuards(ForgotPasswordGuard)
  async requestForgotPassword(
    @Body() body: { email: string },
    @Response() res: ExpressResponse,
  ) {
    const { email } = body;
    const { status, message } = await this.userService.forgotPassword({
      email,
    });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }



  @Post('auth/forgot/verify')
  @UseGuards(VerifyResetLinkGuard)
  forgotPassword(
    @Body() body: { token: string },
    @Response() res: ExpressResponse,
  ) {
    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Reset Link is valid',
      data: null,
      created_at: new Date(),
    });
  }

  @Post('auth/forgot/submit')
  @UseGuards(SubmitForgotPassGuard)
  async submitForgotPassword(
    @Body() body: { token: string; password: string },
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const { password } = body;
    const token = req.headers[tokenName.FORGOT_PASSWORD] as string;
    const { status, message } = await this.userService.submitForgotPassword({
      token,
      password,
    });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/token/verifyAccessToken')
  @UseGuards(verifyAccessTokenGuard)
  verifyAccessToken(@Response() res: ExpressResponse,
    @Body() body: {
      user: {
        email: string,
        userId: number,
      }
    }
  ) {
    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Access token is valid',
      data: {
        email: body.user.email,
        userId: body.user.userId,
      },
      created_at: new Date(),
    });
  }

  @Post('auth/token/refreshAccessToken')
  @UseGuards(refreshAccessTokenGuard)
  refeshAccessToken(
    @Body() body: { token: string, email: string, userId: number },
    @Response() res: ExpressResponse,
  ) {
    return res.status(HttpStatus.CREATED).json({
      message: 'Token is refreshed',
      data: {
        email: body.email,
        userId: body.userId,
        newAccessToken: body.token,
      },
      created_at: new Date(),
    });
  }

  @Post('auth/2FA/requestEnableTOTP')
  @UseGuards(requestTOTPGuard)
  async requesetEnableTOTP(
    @Body() body: { email: string; password: string },
    @Response() res: ExpressResponse,
  ) {
    const { status, message, qrCodeImageURL, recoveryCodes } =
      await this.userService.requestEnableTOTP(body.email, body.password);
    const response: ResponseType = {
      message,
      data: {
        recoveryCodes: recoveryCodes ? recoveryCodes : null,
        qrCodeImageURL: qrCodeImageURL ? qrCodeImageURL : null,
      },
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }


  @Post('auth/2FA/enableTOTP')
  @UseGuards(enableTOTPGuard)
  async enableTOTP(
    @Body() body: { userId: string; token: string },
    @Response() res: ExpressResponse,
  ) {
    const { status, message } =
      await this.userService.enableTOTP(body.userId, body.token);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/2FA/disableTOTP')
  @UseGuards(disableTOTPGuard)
  async disableTOTP(
    @Body() body: { userId: string; token: string, removeMethod: 'token' | 'recoveryPass' },
    @Response() res: ExpressResponse,
  ) {

    const { status, message } = await this.userService.disableTOTP(
      body.userId,
      body.token,
      body.removeMethod,
    );
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };
    return res.status(status).json({ ...response });
  }

  @Post('auth/2FA/verifyTOTP')
  @UseGuards(verifyTOTPGuard)
  async verifyTOTP(
    @Body() body: { token: string; email: string },
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const nonce = req.headers[tokenName.NONCE_2FA] as string;
    const { status, message, token, refreshToken, userId } =
      await this.userService.verifyTOTP(body.email, body.token, nonce);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };

    if (token && refreshToken) {
      response.data = { token, refreshToken, userId };
    }

    return res.status(status).json({ ...response });
  }

  @Delete('auth/logout')
  @UseGuards(IsValidAccessTokenGuard)
  async logOut(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const { message, status } =
      await this.userService.logout(req.headers.authorization as string);



    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date(),
    };

    return res.status(status).json({ ...response });
  }


  @Post('/getUser')
  @UseGuards(getUserGuard)
  async getUserProfile(
    @Body() body: { userId: string },
    @Response() res: ExpressResponse,
  ) {
    const { message, status, data } = await this.userService.getUser(body.userId);

    const response: ResponseType = {
      message,
      data: data,
      created_at: new Date(),
    };

    return res.status(status).json({ ...response });

  }


  @Put('/editUser')
  @UseGuards(editUserGuard)
  async editUserProfile(
    @Body() body: { userId: string, name?: string, birthDate?: Date, gender?: string, country?: string, timeZone?: string, bio?: string },
    @Response() res: ExpressResponse,
  ) {

    const assumeData = {
      name: body.name,
      birthDate: body.birthDate,
      gender: body.gender,
      country: body.country,
      timeZone: body.timeZone,
      bio: body.bio,
    }

    const { message, status } = await this.userService.editUser(body.userId, assumeData);


    return res.status(status).json({
      message,
      data: null,
      created_at: new Date
    });

  }


  @Post('/uploadAvatar')
  uploadUserAvatar(
    @Body() body: { userId: string },
    @Response() res: ExpressResponse,
    @Request() req: ExpressRequest,
  ) {

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 10, //10Mb
    });


    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing file:', err);
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'File upload error' });
      }
      if (!files) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
      }

      const fileArray = files.file as formidable.File[];

      if (!fileArray) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
      }

      if (!fileArray[0]) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
      }

      if (!fileArray[0].originalFilename) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file name was provide' });
      }

      if (!fields.userId || !fields.userId[0]) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'User ID is required' });
      }

      await this.userService.uploadAvatar(fields.userId[0], fileArray[0].filepath, fileArray[0].originalFilename);

      return res.status(HttpStatus.CREATED).json({ message: 'Avatar uploaded' });
    });

  }

}





