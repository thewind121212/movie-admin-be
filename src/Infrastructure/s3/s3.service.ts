import { Inject, Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { ReadStream } from 'fs';
import { scanFolder } from 'src/core/movie/movie.utils';

@Injectable()
export class S3Service {
  public s3: AWS.S3;
  private readonly logger = new Logger(S3Service.name);
  constructor(@Inject('S3') private readonly s3Client: AWS.S3) {
    this.s3 = s3Client;
  }

  uploadHLSBunchTsFilesToS3(
    folderPath: string,
    S3Path: string,
    filename: string,
  ) {
    void scanFolder(folderPath, this.s3Client, filename);
  }

  removePathFromS3(bucketName: string, key: string) {
    const params = {
      Bucket: bucketName,
      Key: key,
    };
    this.s3Client.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });
  }

  async upLoadToS3(bucketName: string, key: string, fileStream: ReadStream) {
    const params = {
      Bucket: bucketName,
      Key: String(key),
      Body: fileStream,
      ACL: 'public-read',
    };
    try {
      const s3Response = await this.s3Client.upload(params).promise();
      return s3Response;
    } catch (e) {
      console.log(e);
    }
  }
}
