import { Injectable } from "@nestjs/common";
import { RedisService } from "src/Infrastructure/redis/redis.service";

@Injectable()
export class MovieRepository {
    constructor(private readonly redisService: RedisService) { }

    async registerTicket(hashTicket: string): Promise<{
        completed: boolean
        message?: string
    }> {
        try {
            await this.redisService.set(hashTicket, '', 300);
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

}