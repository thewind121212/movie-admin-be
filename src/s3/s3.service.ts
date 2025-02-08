import { Inject, Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
  private s3: AWS.S3;
  private readonly logger = new Logger(S3Service.name);
  constructor(@Inject('S3') private readonly s3Client: AWS.S3) {
    this.s3 = s3Client;
  }

  uploadHLSToS3() {
    return 'pong';
  }
}
