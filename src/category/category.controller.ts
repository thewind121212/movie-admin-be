import { Controller, Body, Get, Post, Response, HttpStatus } from '@nestjs/common';
import { MovieServices } from './category.service';
import { Response as ExpressResponse } from 'express';
// import { extname } from 'path';

@Controller('category')
export class MovieController {
  constructor(private readonly movieServices: MovieServices) { }

  @Get('list')
  async getCategory(): Promise<string> {
    return this.movieServices.listAllCategory();
  }

  @Post('create')
  async createCategory(
    @Body('name') name: string,
    @Body('description') description: string,
    @Response() res: ExpressResponse
  ) {

    const { statusCode, message, status, data } = await this.movieServices.createCategory(name, description);
    return res.status(statusCode).send({ message, status, data });
  }
}
