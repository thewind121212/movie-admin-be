import { Module } from '@nestjs/common';
import { MovieController } from './category.controller';
import { MovieServices } from './category.service';

@Module({
  imports: [],
  controllers: [MovieController],
  providers: [MovieServices],
})
export class CategoryModule {}
