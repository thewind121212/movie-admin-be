import { Module } from '@nestjs/common';
import { MovieController } from './category.controller';
import { MovieServices } from './category.service';
import { PrismaService } from 'src/prisma-client/prisma-client.service';

@Module({
  imports: [],
  controllers: [MovieController],
  providers: [MovieServices, PrismaService],
})
export class CategoryModule {}
