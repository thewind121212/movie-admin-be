import { Inject, Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { scanFolder } from 'src/core/movie/movie.utils';

@Injectable()
export class S3Service {
  private s3: AWS.S3
  private readonly logger = new Logger(S3Service.name);
  constructor(@Inject('S3') private readonly s3Client: AWS.S3) {
    this.s3 = s3Client;
  }

  uploadHLSToS3(folderPath: string, S3Path: string, filename: string) {
    scanFolder(folderPath, this.s3Client, filename);
  }
}
