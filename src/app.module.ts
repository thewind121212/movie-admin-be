import { Module } from '@nestjs/common';
import { AppController } from './presentation/controllers/app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from './core/movie/movie.module';
import { GenreModule } from './core/genre/genre.module';
import { UserModule } from './core/user/user.module';
import { NodemailerService } from './Infrastructure/nodemailer/nodemailer.service';
import { UserSecurity } from './core/user/security/user.security';
import { UserRepositories } from './core/user/repositories/user.repositories';
import { RedisService } from './Infrastructure/redis/redis.service';
import { PrismaService } from './Infrastructure/prisma-client/prisma-client.service';

@Module({
  imports: [ConfigModule.forRoot(), MovieModule, GenreModule, UserModule],
  controllers: [AppController],
  providers: [
    AppService,
    NodemailerService,
    UserRepositories,
    UserSecurity,
    PrismaService,
    RedisService,
  ],
})
export class AppModule {}
