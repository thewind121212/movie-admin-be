
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

    const { status, message, token } = await this.userService.login(credential);
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    if (!token && status === HttpStatus.OK) {
      response.message = "Internal server error";
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ ...response });
    }
    response.data = { token };
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

}
