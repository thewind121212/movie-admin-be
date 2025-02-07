import { Injectable } from '@nestjs/common';

@Injectable()
export class MovieServices {
  uploadMovie(): string {
    return 'pong';
  }
}
