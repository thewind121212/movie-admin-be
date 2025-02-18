import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from 'src/presentation/controllers/user.controller';
import { NodemailerService } from 'src/Infrastructure/nodemailer/nodemailer.service';
import { UserRepositories } from './repositories/user.repositories';
import { UserDomainServices } from './domain/user.domainServices';
import { PrismaService } from "src/Infrastructure/prisma-client/prisma-client.service";
import { RegisterRequestGuard } from './guards/registerRequest.guard';
import { UserSecurity } from './security/user.security';

@Module({
  controllers: [UserController],
  providers: [UserService,
    NodemailerService,
    UserRepositories,
    UserDomainServices,
    PrismaService,
    UserSecurity,
    RegisterRequestGuard],
})
export class UserModule { }
