import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
import { RegistrationRequests, User } from '@prisma/client';
import { RedisService } from 'src/Infrastructure/redis/redis.service';
import ms from 'ms';

@Injectable()
export class UserRepositories {
  private readonly logger = new Logger(UserRepositories.name);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly prisma: PrismaService,
    // eslint-disable-next-line no-unused-vars
    private readonly redis: RedisService,
  ) { }

  // create register request
  async createRegisterRequest(data: {
    email: string;
  }): Promise<RegistrationRequests | null> {
    try {
      const registerRequest = await this.prisma.registrationRequests.create({
        data: {
          email: data.email,
        },
      });
      return registerRequest;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  // find register request
  async findRegisterRequest(
    email: string,
  ): Promise<RegistrationRequests | null> {
    try {
      const registerRequest = await this.prisma.registrationRequests.findUnique(
        {
          where: {
            email,
          },
        },
      );
      return registerRequest;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  // find and up request
  async findAndUpdateRegisterRequest(
    email: string,
  ): Promise<RegistrationRequests | null> {
    try {
      const registerRequest = await this.prisma.registrationRequests.update({
        where: {
          email,
        },
        data: {
          updatedAt: new Date(),
        },
      });
      return registerRequest;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  //find user in user db
  async getUser(email: string, userId?: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: userId ? { id: userId } : { email },
      });
      return user;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  // create user
  async createUser(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<User | null> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password: data.password,
          name: data.name,
        },
      });
      return user;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }


  // get all user and total user
  async getAllUser(): Promise<{
    users: Partial<User>[];
    total: number;
  } | null> {
    try {


      const [users, total]  = await this.prisma.$transaction([
        this.prisma.user.findMany(
          {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              createdAt: true,
              updatedAt: true,
              timeZone: true,
              country: true,
            }
          }
        ),
        this.prisma.user.count(),
      ]);

      return  {
        users,
        total,
      }

    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }


  // update user

  async updateUser(
    email: string,
    field: string,
    updateData: any,
    userId?: string,
    mutiple?: boolean,
    mutipleData?: User,
  ): Promise<User | null> {
    try {
      if (mutiple) {
        const user = await this.prisma.user.update({
          where: userId ? { id: userId } : { email },
          data: {
            ...mutipleData
          },
        });
        return user
      }

      const user = await this.prisma.user.update({
        where: userId ? { id: userId } : { email },
        data: {
          [field]: updateData,
        },
      });

      return user;



    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  // write reset password password to redis
  async writeToRedis(
    id: string,
    token: string,
    ex: ms.StringValue,
  ): Promise<boolean> {
    try {
      await this.redis.set(id, token, ms(ex) / 1000);
      return true;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  // retrieve reset password token from redis

  async checkIsKeyIsExist(key: string): Promise<boolean | null> {
    try {
      const token = await this.redis.exists(key);
      if (token === 1) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  // remove reset password token from redis

  async removeKey(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  // get value from redis

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  async getValueFromRedis(key: string): Promise<any | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }

      const valueAsJson = JSON.parse(value);

      return valueAsJson;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
}
