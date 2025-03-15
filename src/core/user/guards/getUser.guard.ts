

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Injectable()
export class GetUserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const queryParams: { limit: string, page: string, search?: string } = request.query;


        const allowLimit = [10, 20, 50, 100];


        const { limit, page } = queryParams;

        if (isNaN(Number(limit)) || isNaN(Number(page))) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Limit and Page should be a number',
                },
                HttpStatus.BAD_REQUEST,
            );
        }


        if (!allowLimit.includes(Number(limit))) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Limit should be 10, 20, 50, or 100',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        if (Number(page) < 1) {
            throw new HttpException(
                {
                    status: 'fail',
                    data: null,
                    message: 'Page should be greater than 1',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        return true;
    }
}
