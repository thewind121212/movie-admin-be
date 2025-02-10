import { Controller, Body, Get, Post, Response, HttpStatus } from '@nestjs/common';
import { GenreService } from '../../core/genre/services/genre.service';
import { Response as ExpressResponse } from 'express';
// import { extname } from 'path';

@Controller('genre')
export class GenreController {
  constructor(private readonly genreService: GenreService) { }

  @Post('create')
  async createGenre(
    @Body('name') name: string,
    @Body('description') description: string,
    @Response() res: ExpressResponse
  ) {

    const { statusCode, message, status, data } = await this.genreService.createGenre(name, description);
    return res.status(statusCode).send({ message, status, data });
  }
}
