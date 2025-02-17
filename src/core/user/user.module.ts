import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import  { UserController } from '../../presentation/controllers/user.controller';
import { NodemailerService } from 'src/Infrastructure/nodemailer/nodemailer.service';

@Module({
  providers: [UserService, NodemailerService],
  controllers: [UserController],
})
export class UserModule {}
