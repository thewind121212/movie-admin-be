import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma-client/prisma-client.service';
import { responseLoader } from 'src/utils/preloadResponse';

@Injectable()
export class MovieServices {
  constructor(private prisma: PrismaService) { }
  async listAllCategory(): Promise<string> {
    //check db connection ready
    const data = await this.prisma.movieCategory.findMany()
    console.log(data)
    return data.toString();
  }

  async createCategory(name: string, description: string): Promise<{
    statusCode: HttpStatus,
    message: string,
    status: string,
    data: any
  }> {
    try {
      const isHave = await this.prisma.movieCategory.findFirst({
        where: {
          name: name
        }
      });

      if (isHave) {
        return {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Category already exist',
          status: 'error',
          data: null,
        }
      }

      const data = await this.prisma.movieCategory.create({
        data: {
          name: name,
          description: description
        },
      });
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Category created successfully',
        status: 'success',
        data: data,
      }

    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create category',
        status: 'error',
        data: null,
      }
    }
  }
}
