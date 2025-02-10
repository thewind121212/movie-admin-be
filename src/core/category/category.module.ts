import { Module } from '@nestjs/common';
import { MovieController } from '../../presentation/controllers/category.controller';
import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
import { CategoryService } from './servies/category.service';
import { CategoryRepository } from './category.repositories';

@Module({
  imports: [],
  controllers: [MovieController],
  providers: [CategoryService, PrismaService, CategoryRepository],
})
export class CategoryModule { }
