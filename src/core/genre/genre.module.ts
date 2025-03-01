import { Module } from '@nestjs/common';
import { GenreController } from '../../presentation/controllers/genre.controller';
import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
import { GenreService } from './services/genre.service';
import { GenreRepository } from './genre.repositories';

@Module({
  imports: [],
  controllers: [GenreController],
  providers: [GenreService, PrismaService, GenreRepository],
})
export class GenreModule {}
