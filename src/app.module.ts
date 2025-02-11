import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from './core/movie/movie.module';
import { GenreModule } from './core/genre/genre.module';
@Module({
  imports: [ConfigModule.forRoot(), MovieModule, GenreModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
