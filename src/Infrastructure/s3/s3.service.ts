import { Inject, Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { scanFolder } from 'src/core/movie/movie.utils';

@Injectable()
export class S3Service {
  public s3: AWS.S3
  private readonly logger = new Logger(S3Service.name);
  constructor(@Inject('S3') private readonly s3Client: AWS.S3) {
    this.s3 = s3Client;
  }

  uploadHLSToS3(folderPath: string, S3Path: string, filename: string) {
    scanFolder(folderPath, this.s3Client, filename);
  }

  async upLoadToS3(bucketName: string, key: string, fileBuffer: Buffer<ArrayBufferLike>) {
    const params = {
      Bucket: bucketName,
      Key: String(key),
      Body: fileBuffer,
      ACL: 'public-read',
    }
    try {
      let s3Response = await this.s3Client.upload(params).promise();
      return s3Response;
    } catch (e) {
      console.log(e);
    }
  }

}
