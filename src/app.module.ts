import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from './movie/movie.module';
import { CategoryModule } from './category/category.module';
import { DockerModule } from './docker/docker.module';

@Module({
  imports: [ConfigModule.forRoot(), MovieModule, CategoryModule, DockerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
