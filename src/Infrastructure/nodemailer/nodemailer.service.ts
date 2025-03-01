import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class NodemailerService {
  public nodemailer: Transporter;

  constructor() {
    this.nodemailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: isNaN(Number(process.env.SMTP_PORT))
        ? 1025
        : Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendTestEmail() {
    const mailOptions = {
      from: 'adminMoive@wliafdew.dev',
      to: 'linhtran@wliafdew.dev',
      subject: 'Test email',
      html: '<h1>Test email</h1>',
    };
    try {
      await this.nodemailer.sendMail(mailOptions);
    } catch (error) {
      console.log(error);
    }
  }
}
