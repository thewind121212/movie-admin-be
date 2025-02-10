
import { HttpStatus } from '@nestjs/common';
import { Category } from '../category.entity'
import { CategoryRepository } from '../category.repositories';

export async function createCategory(name: string, description: string, categoryRepository : CategoryRepository): Promise<{
    statusCode: HttpStatus,
    message: string,
    status: string,
    data: any
}> {
    // Validate and create the entity

    const [isValidName, isValidDescription] = [Category.isValidName(name), Category.isValidDescription(description)];

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


    const isExist = await categoryRepository.checkIfCategoryExist(name);
    if (isExist.isExist) {
        return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: isExist.message,
            status: 'error',
            data: null
        }
    }


    const { status, message, id } = await categoryRepository.createCategory(name, description);


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
