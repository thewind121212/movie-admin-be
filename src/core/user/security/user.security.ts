
import { Injectable, Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { RegisterRequestJWTPayloadType } from '../type/User.type';
import ms from 'ms';


@Injectable()
export class UserSecurity {
    private readonly logger = new Logger(UserSecurity.name)

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

}