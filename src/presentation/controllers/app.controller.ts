import { Controller, Get, Header,  Response, Headers } from '@nestjs/common';
import { AppService } from '../../app.service';

import { Response as ExpressResponse} from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  async ping(
    @Headers('Authorization') authorization: string,
    @Response() res: ExpressResponse
  ) {
    // this.appService.ping();
    return res.status(401).json({ message: 'pong' });
  }
}
