
//Movie Category Repository

import { PrismaService } from 'src/Infrastructure/prisma-client/prisma-client.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GenreRepository {
    constructor(private readonly prisma: PrismaService) { }

    //create category
    async createGenre(name: string, description: string): Promise<{
        status: boolean,
        message: string,
        id?: string,
    }> {
        try {
            const data = await this.prisma.movieGenre.create({
                data: {
                    name: name,
                    description: description!,
                },
            });
            return {
                message: 'Category created successfully',
                status: true,
                id: data.id
            }

        } catch (error) {
            return {
                message: 'Failed to create category' + error,
                status: false,
            }
        }
    }

    //check if category already exist
    async checkIfCategoryExist(name: string): Promise<{
        isExist: boolean
        message: string
    }> {
        try {
            const isHave = await this.prisma.movieGenre.findFirst({
                where: {
                    name: name,
                }
            });

            if (isHave) {
                return {
                    isExist: true,
                    message: 'Category already exist'
                }
            }


            return {
                isExist: false,
                message: 'Category does not exist'
            }

        } catch (error) {
            return {
                isExist: false,
                message: 'Failed to check category internal server error'
            }
        }

    }




    //get all categories


}