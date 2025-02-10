import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from './core/movie/movie.module';
import { CategoryModule } from './core/category/category.module';

@Module({
  imports: [ConfigModule.forRoot(), MovieModule, CategoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
