
import { Injectable, Logger } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';
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
        message: string,
        email: string | null,
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
                isValid: true,
            }



        } catch (error) {
            this.logger.error(error.message)
            return {
                message: error.message,
                email: null,
                isValid: false,
            }
        }
    }

}