

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export class editUserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        const allowField = ['name', 'birthDate', 'gender', 'country', 'timeZone', 'bio', 'userId'];

        const keys = Object.keys(request.body);

        if (!keys.includes('userId')) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Missing required fields',
                },
                HttpStatus.BAD_REQUEST,
            );
        }


        if (keys.length === 0) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Missing required fields',
                },
                HttpStatus.BAD_REQUEST,
            );
        }


        if (keys.includes('birthDate')) {
            const luxonDate = DateTime.fromFormat(request.body.birthDate, 'dd/MM/yyyy');
            if (!luxonDate.isValid) {
                throw new HttpException(
                    {
                        status: 'fail',
                        data: null,
                        message: 'Invalid date format',
                    },
                    HttpStatus.BAD_REQUEST,
                );
            } else {
                request.body.birthDate = luxonDate.toJSDate();
            }
        }


        const isAllow = keys.every((key) => allowField.includes(key));

        if (!isAllow) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Invalid fields',
                },
                HttpStatus.BAD_REQUEST,
            );
        }


        return true;
    }
}
