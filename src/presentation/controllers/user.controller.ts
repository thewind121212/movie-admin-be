
import { Controller, Body, Post, Response, HttpStatus, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { RegisterRequestGuard } from 'src/core/user/guards/registerRequest.guard';
import { ApproveRegisterRequestGuard } from 'src/core/user/guards/approveRegisterRequest.guard';
import { ValidateTokenRegisterRequestGuard } from 'src/core/user/guards/validateJWTRegisterRequest.guard';
import { UserService } from 'src/core/user/services/user.service';
import { ResponseType } from 'src/interface/response.interface';
import { Register } from 'src/core/user/guards/register.guard';

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
  @UseGuards(Register)
  async register(
    @Body() body: { email: string, password: string, token: string, name: string },
    @Response() res: ExpressResponse
  ) {
    const {email, password, token, name} = body;
    const { status, message } = await this.userService.register({ email, password, token, name });
    const response: ResponseType = {
      message,
      data: null,
      created_at: new Date()
    }
    return res.status(status).json({ ...response });
  }
}
