import { Controller, UseInterceptors, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ResponseType } from '../../interface/response.interface';
import { MovieServices } from '../../core/movie/services/movie.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MovieGuard } from 'src/core/movie/movie.guard';
// import { extname } from 'path';

@Controller('movie')
export class MovieController {
  constructor(private readonly movieServices: MovieServices) { }


  @Post('upload/uploadMovie')
  @UseGuards(MovieGuard)
  // @UseInterceptors(
  //   FileInterceptor('file', {
  //     storage: diskStorage({
  //       destination: './uploads',
  //       filename: (
  //         req: Express.Request,
  //         file: Express.Multer.File,
  //         cb: (error: Error | null, filename: string) => void,
  //       ) => {
  //         //   const uniqueSuffix =
  //         //     Date.now() + '-' + Math.eround(Math.random() * 1e9);
  //         //   const ext = extname(file.originalname as string);
  //         req['uploadedFileName'] = file.originalname;
  //         cb(null, `${file.originalname}`);
  //       },
  //     }),
  //   }),
  // )
  async uploadMovie(@Body() body: {
    name: string;
    description: string
  }, @Req() req: Request): Promise<string> {
    const movieName = req['uploadedFileName'];
    const data = await this.movieServices.uploadMovie(
      `/uploads/${movieName}`,
      'video',
    );
    return data;
  }

  @Post('upload/registerUploadTicket')
  async verifyMovie(@Body() body: {
    name: string;
    description: string
    genres: string[],
    releaseYear: number,
  }, @Req() req: Request): Promise<ResponseType> {
    const result = await this.movieServices.registerMovieUploadTicket(
      body.name,
      body.description,
      body.genres,
      body.releaseYear,
    );

    return result;
  }
}
