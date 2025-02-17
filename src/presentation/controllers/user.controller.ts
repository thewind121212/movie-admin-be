
import { Controller, Body, Get, Post, Response, HttpStatus } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
// import { extname } from 'path';

@Controller('user')
export class UserController {

  @Post('auth/registerRequest')
  async registerRequest(
    @Body('email') email: string,
    @Response() res: ExpressResponse
  ) {
    
    console.log('email', email)

    return res.status(HttpStatus.OK).json({ message: 'Register request sent' });
  }
}
