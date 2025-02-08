import { Inject, Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { scanFolder } from 'src/utils/upload.utils';

@Injectable()
export class S3Service {
  private s3: AWS.S3
  private readonly logger = new Logger(S3Service.name);
  constructor(@Inject('S3') private readonly s3Client: AWS.S3) {
    this.s3 = s3Client;
  }

  uploadHLSToS3(folderPath: string, S3Path: string, filename: string) {
    console.log(folderPath, S3Path);
    scanFolder(folderPath, this.s3Client, filename);
    this.s3.headBucket({ Bucket: 'movie-bucket' }, (err, data) => {
      if (err) {
        this.logger.error('loi');
      } else {
        this.logger.log(data);
      }
    });
  }
}
