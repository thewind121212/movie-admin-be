import { Controller, Get, Response } from '@nestjs/common';
import { AppService } from '../../app.service';

import { Response as ExpressResponse } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  async ping(
    @Response() res: ExpressResponse
  ) {
    // return this.appService.ping();

    return res.status(200).json({
      message: 'pong',
      data: null,
      created_at: new Date()
    });

  }
}
