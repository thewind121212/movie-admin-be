import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import * as AWS from 'aws-sdk';

@Module({
  providers: [
    {
      provide: 'S3',
      useFactory: () => {
        return new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          endpoint: process.env.END_POINT,
          s3ForcePathStyle: true,
          signatureVersion: 'v4',
        });
      },
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class S3Module {}
