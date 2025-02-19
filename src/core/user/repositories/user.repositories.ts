import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/Infrastructure/prisma-client/prisma-client.service";
import { RegistrationRequests } from '@prisma/client';


@Injectable()
export class UserRepositories {
    private readonly logger = new Logger(UserRepositories.name)

    constructor(
        private readonly prisma: PrismaService,
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


}