import { Injectable } from '@nestjs/common';
import { UserRepositories } from '../../repositories/user.repositories';
import { MailOptions } from 'nodemailer/lib/smtp-transport';
import { UserSecurity } from '../../security/user.security';
import { S3Service } from 'src/Infrastructure/s3/s3.service';
import { User } from '@prisma/client';
import { approveRegisterRequest, registerRequest } from './requestRegister.domainServices';
import { forgotPassword, submitForgotPassword } from './forgotPass.domainServices'
import { login, logout, register, changePassword } from './auth.domainServices'
import { verifyTOTP, requestEnableTOTP, disableTOTP, enableTOTP } from './2fa.domainServices'
import { getUser, editUser, uploadAvatar } from './profile.domainServices'
import { getAllUsers } from './getUsers.domainSErvices';


@Injectable()
export class UserDomainServices {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly userRepositories: UserRepositories,
    // eslint-disable-next-line no-unused-vars
    private readonly userSecurityServices: UserSecurity,
    // eslint-disable-next-line no-unused-vars
    private readonly s3Service: S3Service,
  ) { }


  // Perform register request login logout  

  async registerRequest(email: string): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    return await registerRequest(email, this.userRepositories)
  }

  approveRegisterRequest(email: string): {
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  } {
    return approveRegisterRequest(email, this.userSecurityServices);
  }

  async register(data: {
    email: string;
    password: string;
    token: string;
    name: string;
  }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    return await register(data, this.userRepositories)
  }




  async changePassword(payload: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    return await changePassword(payload, this.userRepositories)
  }


  async login(credentials: { email: string; password: string }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    token?: string;
    userId?: string;
    refreshToken?: string;
    message: string;
    is2FAEnabled?: boolean;
    twoFAnonce?: string;
  }> {
    return await login(credentials, this.userRepositories, this.userSecurityServices)
  }



  async logout(
    accessToken: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    return await logout(accessToken, this.userRepositories, this.userSecurityServices)
  }




  // Perform forgot password

  async forgotPassword(body: { email: string }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {

    return await forgotPassword(body, this.userRepositories, this.userSecurityServices)

  }

  async submitForgotPassword(body: {
    token: string;
    password: string;
  }): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    mailOptions?: MailOptions;
  }> {
    return await submitForgotPassword(body, this.userRepositories, this.userSecurityServices)
  }



  // Perform 2FA totp
  async requestEnableTOTP(
    email: string,
    password: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    serect?: string;
    recoveryCodes?: string[];
    qrCodeImageURL?: string;
  }> {
    return await requestEnableTOTP(email, password, this.userRepositories, this.userSecurityServices)
  }


  // Perform 2FA totp
  async enableTOTP(
    userId: string,
    token: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    return await enableTOTP(userId, token, this.userRepositories, this.userSecurityServices)
  }

  async disableTOTP(
    userId: string,
    token: string,
    removeMethod: 'token' | 'recoveryPass'
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    return await disableTOTP(userId, token, removeMethod, this.userRepositories, this.userSecurityServices)
  }

  async verifyTOTP(
    email: string,
    token: string,
    nonce: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    token?: string;
    userId?: string;
    refreshToken?: string;
  }> {
    return await verifyTOTP(email, token, nonce, this.userRepositories, this.userSecurityServices)
  }




  async getUser(
    userId: string,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    user?: User;
  }> {
    return await getUser(userId, this.userRepositories)
  }


  async editUser(
    userId: string, data: {
      name?: string, birthDate?: Date, gender?: string, country?: string, timeZone?: string, bio?: string
    }
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {

    return await editUser(userId, data, this.userRepositories)
  }


  async uploadAvatar(
    userId: string, avatar: string, name: string
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {

    return await uploadAvatar(userId, avatar, name, this.userRepositories, this.s3Service)
  }



  async getAllUsers(): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    users?: Partial<User>[];
    total?: number;
  }> {
    return await getAllUsers(this.userRepositories)
  }

}
