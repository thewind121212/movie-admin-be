import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private client: Redis;

    constructor() {
        // Create a new Redis client connection
        this.client = new Redis({
            host: 'localhost',
            port: 6379,
            db: 1,
        });
    }

    //Method to check if a key exists in Redis
    async exists(key: string): Promise<number> {
        return await this.client.exists(key);
    }

    //Method to check redis healtht
    async healthCheck(): Promise<string> {
        return await this.client.ping();
    }

    // Method to get data from Redis
    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    // Method to set data to Redis
    async set(key: string, value: string, expireInSec: number = 3600): Promise<'OK'> {
        return await this.client.setex(key, expireInSec, value);
    }

    // Method to delete a key from Redis
    async del(key: string): Promise<number> {
        return await this.client.del(key);
    }

    // Cleanup and disconnect from Redis on module destroy
    async onModuleDestroy() {
        await this.client.disconnect();
    }
}
