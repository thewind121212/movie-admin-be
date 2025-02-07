import { Module } from '@nestjs/common';
import { MovieController } from './movie.controller';
import { MovieServices } from './movie.service';

@Module({
  imports: [],
  controllers: [MovieController],
  providers: [MovieServices],
})
export class MovieModule {}
