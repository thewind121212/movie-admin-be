import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Response,
  Get,
} from '@nestjs/common';
import { ResponseType } from '../../interface/response.interface';
import { MovieServices } from '../../core/movie/services/movie.service';
import { MovieGuard } from 'src/core/movie/guards/uploadMovie.guard';
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import { RAW_MOVIE_BUCKET } from 'src/core/movie/movie.config';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import formidable from 'formidable';
import path from 'path';
import { DockerService } from 'src/Infrastructure/docker/docker.service';
import fs from 'fs';

@Controller('movie')
export class MovieController {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly movieServices: MovieServices,
    // eslint-disable-next-line no-unused-vars
    public readonly S3services: S3Service,
    // eslint-disable-next-line no-unused-vars
    private readonly docker: DockerService,
  ) {}

  @Post('upload/uploadMovie')
  @UseGuards(MovieGuard)
  uploadMovie(
    @Body()
    body: {
      name: string;
      description: string;
    },
    @Req() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 1024 * 10, //10Gb
    });

    const uploadTicket = req.headers['x-upload-ticket'];
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing file:', err);
        return res.status(400).json({ message: 'File upload error' });
      }
      const fileArray = files.file as formidable.File[];

      if (!fileArray[0]) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (!fileArray[0].originalFilename) {
        return res.status(400).json({ message: 'No file name was provide' });
      }

      const fileStream = fs.createReadStream(fileArray[0].filepath);
      // console.log(fileStream)

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extName = path.extname(fileArray[0].originalFilename);
      const movileName = uniqueSuffix.trimEnd() + extName;

      await this.S3services.upLoadToS3(
        RAW_MOVIE_BUCKET,
        movileName,
        fileStream,
      );
      console.log(uploadTicket);
      const uploadResult = await this.movieServices.uploadMovie(
        `${process.env.S3_SERVICE_ENDPOINT}/${RAW_MOVIE_BUCKET}/${movileName}`,
        'video',
        uploadTicket as string,
      );
      const response: ResponseType = {
        message: uploadResult.message,
        data: null,
      };
      return res.status(uploadResult.status).send(response);
    });
  }

  @Post('upload/registerUploadTicket')
  async verifyMovie(
    @Body()
    body: {
      name: string;
      description: string;
      genres: string[];
      releaseYear: number;
    },
  ): Promise<ResponseType> {
    const result = await this.movieServices.registerMovieUploadTicket(
      body.name,
      body.description,
      body.genres,
      body.releaseYear,
    );

    return result;
  }

  @Get('test')
  async testRoute(): Promise<string> {
    await fs.promises.rm(path.resolve(`processed/cm737dd4s0001syxek3g3zd7e`), {
      recursive: true,
      force: true,
    });
    return 'l';
  }
}
