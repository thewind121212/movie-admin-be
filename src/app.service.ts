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
      ` 
          Your email has been approved. Please click the link below to complete your registration. This link will expire in 15 minutes. 
          If you did not request this, please ignore this email.
          <br/>
          <a href="{{.AlternativeLink}}"
            style="color: rgb(0, 141, 163); --darkreader-inline-color: #5ae9ff; margin-top: 10px;"
            target="_blank"
            data-saferedirecturl=""
            data-darkreader-inline-color="{{.AlternativeLink}}">Register Link!
          </a> 
        `
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
