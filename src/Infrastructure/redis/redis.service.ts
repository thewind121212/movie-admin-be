import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;
  private clientCache: Redis;

  constructor() {
    // Create a new Redis client connection
    this.client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.22',
      port: parseInt(process.env.REDIS_PORT!) || 6379,
      db: 1,
    });

    this.clientCache = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.22',
      port: parseInt(process.env.REDIS_PORT!) || 6379,
      db: 4,
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

  // method expose zadd from ioredis
  async zaddUser(key: string, timeStamp: number, id: string): Promise<number> {
    //key is the name of the sorted set
    // score is the score of the member
    // member is the value to be added
    return await this.clientCache.zadd(key,timeStamp , id);
  }

  async zrangeUser(key: string, start: number, stop: number): Promise<string[]> {
    //key is the name of the sorted set
    // start is the start index
    // stop is the stop index
    return await this.clientCache.zrevrange(key, start, stop);
  }


  // Method to set data to Redis
  async set(
    key: string,
    value: string,
    expireInSec: number = 3600,
  ): Promise<boolean> {
    try {

      await this.client.setex(key, expireInSec, value);
      return true
    } catch (error) {
      console.log('Internal Error', error);
      return false

    }
  }



  async setUserCache(
    key: string,
    value: string,
    expireInSec: number = 3600,
  ): Promise<boolean> {
    try {
      await this.clientCache.setex(key, expireInSec, value);
      return true
    } catch (error) {
      console.log('Internal Error', error);
      return false

    }
  }

  async replaceUserSortCache(key: string, oldUseId: string, newUserId: string, newTimeStamp: number): Promise<boolean> {

    try {
      await this.clientCache.zrem(key, oldUseId);
      await this.clientCache.zadd(key, newTimeStamp, newUserId);
      return true
    } catch (error) {

      console.log('Internal Error', error);
      return false
    }

  }

  async getUserCache(key: string): Promise<string | null> {
    return await this.clientCache.get(key);
  }

  // Method to delete a key from Redis
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  // Cleanup and disconnect from Redis on module destroy
  onModuleDestroy() {
    this.client.disconnect();
  }
}
