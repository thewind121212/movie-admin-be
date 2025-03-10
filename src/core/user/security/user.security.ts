import { Injectable, Logger } from '@nestjs/common';
import { RegisterRequestJWTPayloadType } from '../type/User.type';
import { UserRepositories } from '../repositories/user.repositories';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import otpauth from 'otpauth';
import ms from 'ms';
import qr from 'qrcode';
import { JWT_PURPOSE_TYPE, RECOVERY_CODE_SALT_ROUND } from '../user.config';

@Injectable()
export class UserSecurity {
  private readonly logger = new Logger(UserSecurity.name);

  // eslint-disable-next-line no-unused-vars
  constructor(private readonly userRepositories: UserRepositories) { }

  // sign JWT
  public signJWT(
    data: any,
    exp: ms.StringValue,
    purpose: JWT_PURPOSE_TYPE,
    writeRedis: boolean = false,
  ): string | null {
    try {
      const defaultPayload = {
        purpose,
      };

      const payload: RegisterRequestJWTPayloadType = {
        ...defaultPayload,
        ...data,
        sub: data,
      };

      const jwtOptions: jwt.SignOptions = {
        expiresIn: exp,
        algorithm: 'HS256',
        audience: 'wliafdew-movie-uploader-user',
        issuer: 'wliafdew-movie-uploader',
      };
      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not defined');
        throw new Error('JWT_SECRET is not defined');
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET, jwtOptions);
      // save token to redis for one valid token at a time

      if (writeRedis) {
        const writeRedisResult = this.userRepositories.writeToRedis(
          `${data.email}-${purpose}`,
          JSON.stringify({ token: token }),
          exp,
        );
        if (!writeRedisResult) {
          throw new Error('Failed to write token to redis');
        }
      }

      return token;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  // verify JWT

  public async verifyJWT(
    token: string,
    purpose: JWT_PURPOSE_TYPE,
    retriveFromRedis: boolean = true,
  ): Promise<{
    message:
    | 'Token is valid'
    | 'Token is expired'
    | 'Invalid token'
    | 'Token verification error:'
    | 'Invalid token please try again with the latest token'
    | 'Invalid token type';
    email: string | null;
    userId?: string | null;
    isValid: boolean;
  }> {
    try {
      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not defined');
        throw new Error('JWT_SECRET is not defined');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        audience: 'wliafdew-movie-uploader-user',
        issuer: 'wliafdew-movie-uploader',
        algorithms: ['HS256'],
      });

      const tokenPurpose =
        typeof decoded !== 'string' && 'purpose' in decoded
          ? decoded.purpose
          : null;
      const email =
        typeof decoded !== 'string' && 'email' in decoded
          ? decoded.email
          : null;

      if (tokenPurpose !== purpose || !email) {
        return {
          message: 'Invalid token type',
          email: null,
          isValid: false,
        };
      }

      if (retriveFromRedis) {
        const redisToken: { token: string } =
          await this.userRepositories.getValueFromRedis(`${email}-${purpose}`);

        if (!redisToken) {
          throw new Error('Token not found in redis');
        }

        if (redisToken.token !== token) {
          return {
            email: null,
            isValid: false,
            message: 'Invalid token please try again with the latest token',
          };
        }
      }


      return {
        message: 'Token is valid',
        email:
          typeof decoded !== 'string' && 'email' in decoded
            ? decoded.email
            : null,
        userId:
          typeof decoded !== 'string' && 'userId' in decoded
            ? decoded.userId
            : null,
        isValid: true,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          message: 'Token is expired',
          email: null,
          isValid: false,
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          message: 'Invalid token',
          email: null,
          isValid: false,
        };
      } else {
        return {
          message: 'Token verification error:',
          email: null,
          isValid: false,
        };
      }
    }
  }

  // generate OTP

  public async generateTOTP(email: string): Promise<{
    qrCodeImageURL?: string;
    isError: boolean;
    isInterNalError: boolean;
    secret?: string;
    message: string;
  }> {
    try {
      //gen secret
      const secret = new otpauth.Secret({ size: 20 }).base32;

      //gen totp
      const totp = new otpauth.TOTP({
        issuer: 'Wliafdew Movie Uploader',
        label: email,
        algorithm: 'SHA256',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const qrCode = await qr.toDataURL(totp.toString());

      return {
        isError: false,
        isInterNalError: false,
        message: 'OTP generated',
        secret,
        qrCodeImageURL: qrCode,
      };
    } catch (error) {
      this.logger.error(error);
      return {
        isError: true,
        isInterNalError: true,
        message: 'Internal server error',
      };
    }
  }

  // verify OTP

  public verifyTOTP(
    email: string,
    token: string,
    serect: string,
  ): {
    isInterNalError: boolean;
    isError: boolean;
    message: string;
  } {
    try {
      if (!serect) {
        return {
          isError: true,
          message: 'Secret is required',
          isInterNalError: false,
        };
      }


      const totp = new otpauth.TOTP({
        issuer: 'Wliafdew Movie Uploader',
        label: email,
        algorithm: 'SHA256',
        digits: 6,
        period: 30,
        secret: serect,
      });

      const isValid = totp.validate({ token, window: 1 });

      if (isValid === 0 || isValid === -1) {
        return {
          isError: false,
          isInterNalError: false,
          message: 'TOTP is valid',
        };
      }

      return {
        isError: true,
        isInterNalError: false,
        message: 'TOTP is invalid',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        isError: true,
        isInterNalError: true,
        message: 'Internal server error',
      };
    }
  }

  public genNonce(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    return nonce;
  }

  public generateMutiRecoveryCodes(amount: number): {
    rawPass: string[];
    hashedPass: string[];
  } {
    const hashedPass: string[] = [];
    const rawPass: string[] = [];
    for (let i = 0; i < amount; i++) {
      const pass = this.generateRecoveryCode();
      const passHashed = bcrypt.hashSync(pass, RECOVERY_CODE_SALT_ROUND);
      rawPass.push(pass);
      hashedPass.push(passHashed)
    }
    return {
      rawPass,
      hashedPass,
    };

  }
  generateRecoveryCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; 
    let recoveryCode = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        recoveryCode += characters[randomIndex];
    }

    return recoveryCode;
}


  public encryptAES256(data: string): string {
    // using ebc so dont need iv
    const key = process.env.AES_KEY;
    const iv = process.env.AES_IV;
    if (!key || !iv) {
      this.logger.error('AES_KEY is not defined or invalid');
      process.exit(1);
    }

    const cipher = crypto.createCipheriv('aes-256-cbc', key.substring(0, 32), iv.substring(0, 16));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }


  public decryptAES256(data: string): string {
    const key = process.env.AES_KEY;
    const iv = process.env.AES_IV;
    if (!key || !iv) {
      this.logger.error('AES_KEY is not defined or invalid');
      process.exit(1);
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key.substring(0, 32), iv.substring(0, 16));
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;

  }
}

