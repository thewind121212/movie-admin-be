
import { Injectable, Logger } from '@nestjs/common';
import { RegisterRequestJWTPayloadType } from '../type/User.type';
import { UserRepositories } from '../repositories/user.repositories';
import jwt from 'jsonwebtoken';
import otpauth from 'otpauth'
import ms from 'ms'
import qr from 'qrcode'


@Injectable()
export class UserSecurity {
    private readonly logger = new Logger(UserSecurity.name)

    constructor(
        private readonly userRepositories: UserRepositories
    ) {
    }


    // sign JWT 
    public signJWT(data: any, exp: ms.StringValue, purpose: string): string | null {
        try {
            const defaultPayload = {
                purpose,
            }

            const payload: RegisterRequestJWTPayloadType = {
                ...defaultPayload,
                ...data,
                sub: data,
            }

            const jwtOptions: jwt.SignOptions = {
                expiresIn: exp,
                algorithm: 'HS256',
                audience: 'wliafdew-movie-uploader-user',
                issuer: 'wliafdew-movie-uploader',
            }
            if (!process.env.JWT_SECRET) {
                this.logger.error('JWT_SECRET is not defined')
                throw new Error('JWT_SECRET is not defined')
            }

            const token = jwt.sign(payload, process.env.JWT_SECRET as string, jwtOptions)
            return token

        } catch (error) {
            this.logger.error(error)
            return null
        }
    }


    // verify JWT

    public verifyJWT(token: string): {
        message: 'Token is valid' | 'Token is expired' | 'Invalid token' | 'Token verification error:',
        email: string | null
        userId?: string | null,
        isValid: boolean,
    } {
        try {
            if (!process.env.JWT_SECRET) {
                this.logger.error('JWT_SECRET is not defined')
                throw new Error('JWT_SECRET is not defined')
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET as string, {
                audience: 'wliafdew-movie-uploader-user',
                issuer: 'wliafdew-movie-uploader',
                algorithms: ['HS256'],
            })

            return {
                message: 'Token is valid',
                email: typeof decoded !== 'string' && 'email' in decoded ? decoded.email : null,
                userId: typeof decoded !== 'string' && 'userId' in decoded ? decoded.userId : null,
                isValid: true,
            }



        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return {
                    message: 'Token is expired',
                    email: null,
                    isValid: false,
                }
            } else if (error instanceof jwt.JsonWebTokenError) {
                return {
                    message: 'Invalid token',
                    email: null,
                    isValid: false,
                }
            } else {
                return {
                    message: 'Token verification error:',
                    email: null,
                    isValid: false,
                }
            }
        }
    }


    // generate OTP

    public async generateOTP(email: string): Promise<{
        qrCodeImageURL?: string,
        isError: boolean,
        isInterNalError: boolean,
        message: string,
    }> {

        try {



            //gen secret
            const secret = new otpauth.Secret({ size: 20 }).base32


            //gen totp
            const totp = new otpauth.TOTP({
                issuer: 'Wliafdew Movie Uploader',
                label: email,
                algorithm: 'SHA256',
                digits: 6,
                period: 30,
                secret: secret,
            })

            // save secret to db 
            this.userRepositories.updateUser(email, 'totpSecret', secret)

            const qrCode = await qr.toDataURL(totp.toString())


            return {
                isError: false,
                isInterNalError: false,
                message: 'OTP generated',
                qrCodeImageURL: qrCode,
            }


        } catch (error) {
            this.logger.error(error)
            return {
                isError: true,
                isInterNalError: true,
                message: 'Internal server error',
            }

        }
    }


    // verify OTP

    public async verifyOTP(email: string, token: string): Promise<{
        isInterNalError: boolean,
        isError: boolean,
        message: string,
    }> {

        try {
            const user = await this.userRepositories.getUser(email)

            if (!user) {
                return {
                    isError: true,
                    message: 'User not found',
                    isInterNalError: false,
                }
            }

            if (!user.totpSecret) {
                return {
                    isError: true,
                    message: 'User does not have 2FA TOTP enable',
                    isInterNalError: false,
                }
            }

            const totp = new otpauth.TOTP({
                issuer: 'Wliafdew Movie Uploader',
                label: email,
                algorithm: 'SHA256',
                digits: 6,
                period: 30,
                secret: user.totpSecret,
            })

            const isValid = totp.validate({ token, window: 1 })

            if (isValid === 0 || isValid === -1) {
                return {
                    isError: false,
                    isInterNalError: false,
                    message: 'TOTP is valid',
                }
            }

            return {
                isError: true,
                isInterNalError: false,
                message: 'TOTP is invalid',
            }


        } catch (error) {
            this.logger.error(error)
            return {
                isError: true,
                isInterNalError: true,
                message: 'Internal server error',
            }

        }
    }

}