import { Controller, Get, Response, Headers, HttpStatus } from '@nestjs/common';
import { AppService } from '../../app.service';

import { Response as ExpressResponse } from 'express';

@Controller()
export class AppController {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly appService: AppService) {}

  @Get()
  ping(
    @Headers('Authorization') authorization: string,
    @Response() res: ExpressResponse,
  ) {
    // this.appService.ping();
    return res.status(HttpStatus.OK).json({ message: 'pong' });
  }
}
