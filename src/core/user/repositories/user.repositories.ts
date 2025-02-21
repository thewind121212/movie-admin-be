import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/Infrastructure/prisma-client/prisma-client.service";
import { RegistrationRequests, User } from '@prisma/client';
import { RedisService } from "src/Infrastructure/redis/redis.service";


@Injectable()
export class UserRepositories {
    private readonly logger = new Logger(UserRepositories.name)

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) { }



    // create register request
    async createRegisterRequest(data: { email: string }): Promise<RegistrationRequests | null> {

        try {
            const registerRequest = await this.prisma.registrationRequests.create({
                data: {
                    email: data.email,
                }
            })
            return registerRequest
        } catch (error) {
            this.logger.error(error)
            return null
        }
    }

    // find register request
    async findRegisterRequest(email: string): Promise<RegistrationRequests | null> {
        try {
            const registerRequest = await this.prisma.registrationRequests.findUnique({
                where: {
                    email
                }
            })
            return registerRequest
        } catch (error) {

            this.logger.error(error)
            return null
        }
    }

    // find and up request
    async findAndUpdateRegisterRequest(email: string): Promise<RegistrationRequests | null> {
        try {
            const registerRequest = await this.prisma.registrationRequests.update({
                where: {
                    email
                },
                data: {
                    updatedAt: new Date()
                }
            })
            return registerRequest
        } catch (error) {
            this.logger.error(error)
            return null
        }

    }

    //find user in user db 
    async findUser(email: string): Promise<User | null> {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    email
                }
            })
            return user
        } catch (error) {
            this.logger.error(error)
            return null
        }
    }

    // create user
    async createUser(data: { email: string, password: string, name: string }): Promise<User | null> {
        try {
            const user = await this.prisma.user.create({
                data: {
                    email: data.email,
                    password: data.password,
                    name: data.name
                }
            })
            return user
        } catch (error) {
            this.logger.error(error)
            return null
        }
    }


    // update user

    async updateUser(email: string, field: string, updateData): Promise<User | null> {
        try {
            const user = await this.prisma.user.update({
                where: {
                    email
                },
                data: {
                    [field]: updateData
                }
            })
            return user
        } catch (error) {
            this.logger.error(error)
            return null
        }
    }

    // write reset password password to redis
    async writeResetPasswordToken(id: string, token: string): Promise<boolean> {
        try {
            await this.redis.set(id, token, 60 * 15)
            return true
        } catch (error) {
            this.logger.error(error)
            return false
        }
    }

    // retrieve reset password token from redis

    async checkIsKeyIsExist(key: string): Promise<boolean | null> {
        try {
            const token = await this.redis.exists(key)
            if (token === 1) {
                return true
            } else {
                return false
            }
        } catch (error) {
            this.logger.error(error)
            return null
        }
    }

    // remove reset password token from redis

    async removeResetPasswordToken(key: string): Promise<boolean> {
        try {
            await this.redis.del(key)
            return true
        } catch (error) {
            this.logger.error(error)
            return false
        }
    }


}