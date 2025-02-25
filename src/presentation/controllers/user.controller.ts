
import { Controller, Body, Post, Response, HttpStatus, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
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
import { toggleTOTPGuard } from 'src/core/user/guards/toggleTOTP.guard';
import { verifyTOTPGuard } from 'src/core/user/guards/verifyTOTP.guard';

@Controller('user')
export class UserController {

  constructor(
    private readonly userService: UserService
  ) {
  }

  @Post('auth/registerRequest/create')
  @UseGuards(RegisterRequestGuard)
  async registerRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse
  ): Promise<ExpressResponse> {
    const { status, message } = await this.userService.registerRequest(email);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }


  @Post('auth/registerRequest/vaildate')
  @UseGuards(ValidateTokenRegisterRequestGuard)
  async validateRegisterRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse
  ) {
    const response: ResponseType = {
      message: 'Register request is valid',
      data: {
        email,
      },
      created_at: new Date()
    }

    return res.status(HttpStatus.OK).json({ ...response });
  }


  @Post('auth/registerRequest/approve')
  @UseGuards(ApproveRegisterRequestGuard)
  async approveRegisterRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse
  ) {
    const { status, message } = await this.userService.approveRegisterRequest(email);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }


  @Post('auth/register')
  @UseGuards(RegisterGuard)
  async register(
    @Body() body: { email: string, password: string, token: string, name: string },
    @Response() res: ExpressResponse
  ) {
    const { email, password, token, name } = body;
    const { status, message } = await this.userService.register({ email, password, token, name });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }

  @Post('auth/login')
  @UseGuards(LoginGuard)
  async login(
    @Body() body: { email: string, password: string },
    @Response() res: ExpressResponse
  ) {
    const credential = body;

    const { status, message, token, refreshToken } = await this.userService.login(credential);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    if ((!token || !refreshToken) && status === HttpStatus.OK) {
      response.message = "Internal server error";
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ ...response });
    }
    response.data = { token, refreshToken };
    return res.status(status).json({ ...response });
  }


  @Post('auth/forgot/request')
  @UseGuards(ForgotPasswordGuard)
  async requestForgotPassword(
    @Body() body: { email: string },
    @Response() res: ExpressResponse
  ) {
    const { email } = body;
    const { status, message } = await this.userService.forgotPassword({ email });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }

  @Post('auth/forgot/verify')
  @UseGuards(VerifyResetLinkGuard)
  async forgotPassword(
    @Body() body: { token: string },
    @Response() res: ExpressResponse
  ) {
    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Reset Link is valid',
      data: null,
      created_at: new Date()
    });
  }

  @Post('auth/forgot/submit')
  @UseGuards(SubmitForgotPassGuard)
  async submitForgotPassword(
    @Body() body: { token: string, password: string },
    @Response() res: ExpressResponse
  ) {
    const { token, password } = body;
    const { status, message } = await this.userService.submitForgotPassword({ token, password });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }


  @Post('auth/token/verifyAccessToken')
  @UseGuards(verifyAccessTokenGuard)
  async verifyAccessToken(
    @Body() body: { token: string, password: string },
    @Response() res: ExpressResponse
  ) {
    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Access token is valid',
      data: null,
      created_at: new Date()
    })
  }


  @Post('auth/token/refreshAccessToken')
  @UseGuards(refreshAccessTokenGuard)
  async refeshAccessToken(
    @Body() body: { token: string },
    @Response() res: ExpressResponse
  ) {

    return res.status(HttpStatus.CREATED).json({
      message: 'Token is refreshed',
      data: {
        newAccessToken: body.token
      },
      created_at: new Date()
    })
  }



  @Post('auth/2FA/enableTOTP')
  @UseGuards(toggleTOTPGuard)
  async enableTOTP(
    @Body() body: { email: string, password: string },
    @Response() res: ExpressResponse
  ) {
    const { status, message, qrCodeImageURL } = await this.userService.enableTOTP(body.email, body.password);
    const response: ResponseType = {
      message,
      data: {
        qrCodeImageURL: qrCodeImageURL ? qrCodeImageURL : null
      },
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }

  @Post('auth/2FA/disableTOTP')
  @UseGuards(toggleTOTPGuard)
  async disableTOTP(
    @Body() body: { email: string, password: string },
    @Response() res: ExpressResponse
  ) {
    const { status, message } = await this.userService.disableTOTP(body.email, body.password);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }


  @Post('auth/2FA/verifyTOTP')
  @UseGuards(verifyTOTPGuard)
  async verifyTOTP(
    @Body() body: { token: string, email: string },
    @Response() res: ExpressResponse
  ) {
    const { status, message } = await this.userService.verifyTOTP(body.email, body.token);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }

}



