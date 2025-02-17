
import { Controller, Body, Get, Post, Response, HttpStatus, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { RegisterRequestGuard } from 'src/core/user/guards/registerRequest.guard';
import { UserService } from 'src/core/user/services/user.service';
// import { extname } from 'path';

@Controller('user')
export class UserController {

  constructor(
    private readonly userService: UserService
  ) {
  }

  @Post('auth/registerRequest')
  @UseGuards(RegisterRequestGuard)
  async registerRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse
  ) {
    const { status, message } = await this.userService.registerRequest(email);
    return res.status(status).json({ message });
  }
}
