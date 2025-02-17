import { Injectable } from '@nestjs/common';
import { NodemailerService } from './Infrastructure/nodemailer/nodemailer.service';
import { registerEmailTemplate } from './email-templates/register';

@Injectable()
export class AppService {

  constructor(
    private readonly nodeMailerService: NodemailerService,
  ) { }

  ping(): string {
    return 'pong';
  }


  async sendEmail() {

    const content = registerEmailTemplate(
      'Thank you for registering with us!',
      "You will receive a separate email with a registration link once your email is approved. Please allow up to 2 business days for processing."
    )
    const email = {
      from: 'adminMovie@wliafdew.dev',
      to: 'linh@wliafdew.dev',
      subject: 'Test email',
      html: content,
    }

    await this.nodeMailerService.nodemailer.sendMail(email);
  }
}
