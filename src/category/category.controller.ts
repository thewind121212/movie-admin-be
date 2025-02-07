import { Controller, UseInterceptors, Post, Body } from '@nestjs/common';
import { MovieServices } from './category.service';
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
          cb(null, `${file.originalname as string}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadFile(@Body() body: any): string {
    console.log(body);
    return 'upload file';
  }
}
