import { Module } from '@nestjs/common';
import { AppController } from './presentation/controllers/app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from './core/movie/movie.module';
import { GenreModule } from './core/genre/genre.module';
import { UserModule } from './core/user/user.module';
import { NodemailerService } from './Infrastructure/nodemailer/nodemailer.service';


@Module({
  imports: [ConfigModule.forRoot(), MovieModule, GenreModule, UserModule],
  controllers: [AppController],
  providers: [AppService, NodemailerService],
})
export class AppModule { }
