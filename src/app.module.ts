import { Module } from '@nestjs/common';
import { AppController } from './presentation/controllers/app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from './core/movie/movie.module';
import { GenreModule } from './core/genre/genre.module';
import { DockerService } from './Infrastructure/docker/docker.service';


@Module({
  imports: [ConfigModule.forRoot(), MovieModule, GenreModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
