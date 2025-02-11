import { HttpStatus, Injectable } from "@nestjs/common";
import { RedisService } from "src/Infrastructure/redis/redis.service";
import { ticketRegisterType } from "src/interface/movie.interface";

@Injectable()
export class MovieRepository {
    constructor(private readonly redisService: RedisService) { }

    async registerTicket(hashTicketKey: string, name: string): Promise<{
        completed: boolean
        message?: string
    }> {
        try {
            const registerTicket: ticketRegisterType = {
                hashTicketKey,
                status: 'REGISTER',
                name,
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

    async updateUploadTicket(hashTicketKey: string, status: 'REGISTER' | 'PROCESSING' | 'COMPLETED', name: string): Promise<boolean> {
        try {
            const registerTicket: ticketRegisterType = {
                hashTicketKey,
                status: status,
                name,
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
        const { status, name }: ticketRegisterType = JSON.parse(redisRetrive)

        if (status === 'PROCESSING') {
            return {
                isValid: false,
                message: "This ticket had been processing!"
            }
        }

        if (status === 'COMPLETED') {
            return {
                isValid: false,
                message: "This ticket is completed"
            }
        }

        const uploadStatus = await this.updateUploadTicket(hashTicketKey, 'PROCESSING', name)

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

}