import { HttpStatus, Injectable } from "@nestjs/common";
import { RedisService } from "src/Infrastructure/redis/redis.service";
import { ticketRegisterType } from "src/interface/movie.interface";
import { PrismaService } from "src/Infrastructure/prisma-client/prisma-client.service";
import { Movie } from "@prisma/client";
import { DockerService } from 'src/Infrastructure/docker/docker.service';

@Injectable()
export class MovieRepository {
    constructor(private readonly redisService: RedisService,
        private readonly prisma: PrismaService,
        private readonly docker: DockerService
    ) { }

    async registerTicket(hashTicketKey: string, name: string, desc: string, releaseYear: number): Promise<{
        completed: boolean
        message?: string
    }> {
        try {
            const registerTicket: ticketRegisterType = {
                hashTicketKey,
                status: 'REGISTER',
                name,
                desc,
                releaseYear,
            }
            await this.redisService.set(hashTicketKey, JSON.stringify(registerTicket), 300);
            return {
                completed: true,
                message: "Ticket registered successfully"
            };
        } catch (error) {
            return {
                completed: false,
                message: "Failed to register ticket internally error"
            }
        }
    }

    async updateUploadTicket(hashTicketKey: string, status: 'REGISTER' | 'PROCESSING' | 'COMPLETED', ticketData: ticketRegisterType): Promise<boolean> {
        try {
            const registerTicket: ticketRegisterType = {
                ...ticketData,
                hashTicketKey,
                status: status,
            }
            await this.redisService.set(hashTicketKey, JSON.stringify(registerTicket), 300)
            return true
        } catch (error) {
            return false
        }
    }


    async getTicketData(hashTicketKey: string): Promise<ticketRegisterType | null> {
        try {
            console.log(hashTicketKey)
            const redisRetrive = await this.redisService.get(hashTicketKey)

            if (!redisRetrive) return null
            const ticketData: ticketRegisterType = JSON.parse(redisRetrive)
            return ticketData
        } catch (error) {
            console.log("Internal Error", error)
            return null
        }
    }


    async checkTicketIsValid(hashTicketKey: string): Promise<{
        isValid: boolean,
        message?: string,
        status?: HttpStatus,
    }> {
        const redisRetrive = await this.redisService.get(hashTicketKey)
        if (!redisRetrive) {
            return {
                isValid: false,
                message: "Ticket not found or Ticket expried!"
            }
        }
        const ticketData: ticketRegisterType = JSON.parse(redisRetrive)

        if (ticketData.status === 'PROCESSING') {
            return {
                isValid: false,
                message: "This ticket had been processing!"
            }
        }

        if (ticketData.status === 'COMPLETED') {
            return {
                isValid: false,
                message: "This ticket is completed"
            }
        }

        const uploadStatus = await this.updateUploadTicket(hashTicketKey, 'PROCESSING', ticketData)

        if (!uploadStatus) {
            return {
                isValid: false,
                message: "Can not uploaded for this ticket",
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }

        return {
            isValid: true,
            message: 'Movie uploadding please keep the broswer open when uploading'
        }
    }
    async 

    async writeUploadMovieMetaData(ticketData: ticketRegisterType,
        moviePath: string,
    ): Promise<Movie | {
        isError: boolean,
        message?: string
    }> {

        const { name, desc, releaseYear } = ticketData

        const durationResult =  await this.docker.calcDurationMovie(moviePath)

        if (durationResult.isError) {
            return  durationResult
        }

        try {
            const createResult = await this.prisma.movie.create({
                data: {
                    name,
                    description: desc,
                    releaseYear,
                    duration: durationResult.duration,
                    thumbnailUrl: '',
                    hlsFilePathS3: '',
                    views: 0,
                    likes: 0,
                    dislikes: 0,
                    typeId: '1',
                    status: 'UPLOADED',
                    isPublished: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            })
            return createResult

        } catch (error) {
            return {
                isError: true,
                message: error.message
            }
        }
    }

}