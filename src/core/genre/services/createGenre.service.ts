
import { HttpStatus } from '@nestjs/common';
import { Genre } from '../genre.entity'
import { GenreRepository } from '../genre.repositories';

export async function createGenre(name: string, description: string, genreRepository :GenreRepository): Promise<{
    statusCode: HttpStatus,
    message: string,
    status: string,
    data: any
}> {
    // Validate and create the entity

    const [isValidName, isValidDescription] = [Genre.isValidName(name), Genre.isValidDescription(description)];

    if (!isValidName.isValid) {
        return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: isValidName.message,
            status: 'error',
            data: null
        }
    }

    if (!isValidDescription.isValid) {
        return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: isValidDescription.message,
            status: 'error',
            data: null
        }
    }


    const isExist = await genreRepository.checkIfCategoryExist(name);
    if (isExist.isExist) {
        return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: isExist.message,
            status: 'error',
            data: null
        }
    }


    const { status, message, id } = await genreRepository.createGenre(name, description);


    if (!status) {
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message,
            status: 'error',
            data: null
        }
    }
    else {
        return {
            statusCode: HttpStatus.CREATED,
            message,
            status: 'success',
            data: null
        }
    }
}
