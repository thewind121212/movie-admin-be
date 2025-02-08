import { Controller, UseInterceptors, Post, Body, Req } from '@nestjs/common';
import { MovieServices } from './movie.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
// import { extname } from 'path';

@Controller('movie')
export class MovieController {
  constructor(private readonly movieServices: MovieServices) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (
          req: Express.Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          //   const uniqueSuffix =
          //     Date.now() + '-' + Math.round(Math.random() * 1e9);
          //   const ext = extname(file.originalname as string);
          req['uploadedFileName'] = file.originalname;
          cb(null, `${file.originalname}`);
        },
      }),
    }),
  )
  async uploadRoute(@Body() body: any, @Req() req: Request): Promise<string> {
    const movieName = req['uploadedFileName'];
    const data = await this.movieServices.uploadMovie(
      `/uploads/${movieName}`,
      'video',
    );
    return data;
  }
}
