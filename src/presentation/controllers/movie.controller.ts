import { Controller, UseInterceptors, Post, Body, Req, UseGuards, UploadedFile, Response, Get } from '@nestjs/common';
import { ResponseType } from '../../interface/response.interface';
import { MovieServices } from '../../core/movie/services/movie.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MovieGuard } from 'src/core/movie/movie.guard';
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import { RAW_MOVIE_BUCKET } from 'src/core/movie/movie.config';
import { Response as ExpressResponse } from 'express';
import path from 'path';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import fs from 'fs';


@Controller('movie')
export class MovieController {
  constructor(private readonly movieServices: MovieServices,
    public readonly S3services: S3Service,
    private readonly docker: DockerService
  ) { }


  @Post('upload/uploadMovie')
  @UseGuards(MovieGuard)
  @UseInterceptors(
    FileInterceptor('file'),
  )
  async uploadMovie(@Body() body: {
    name: string;
    description: string
  }, @Req() req: Request, @UploadedFile() file: Express.Multer.File, @Response() res: ExpressResponse ) { 
    const uploadTicket = req.headers['x-upload-ticket']
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extName = path.extname(file.originalname)
    const movileName = uniqueSuffix.trimEnd() + extName 
    await this.S3services.upLoadToS3(RAW_MOVIE_BUCKET, movileName, file.buffer);
     const uploadResult = await this.movieServices.uploadMovie(`${process.env.S3_SERVICE_ENDPOINT}/${RAW_MOVIE_BUCKET}/${movileName}`, 'video', uploadTicket)
     const response : ResponseType = {
      message: uploadResult.message,
      data: null,
     }
    return  res.status(uploadResult.status).send(response)
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

  @Get('test') 
  async testRoute() : Promise<string> {
    await fs.promises.rm(path.resolve(`processed/cm737dd4s0001syxek3g3zd7e`), { recursive: true , force: true });
    return 'l'
  }
}
