import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { GetAvatarGuard } from 'src/Infrastructure/s3/guards/getAvatar.guard';
import { Response as ExpressResponse} from 'express';
import { S3Service } from 'src/Infrastructure/s3/s3.service';



@Controller('s3')
export class S3Controller {


    constructor(
        // eslint-disable-next-line no-unused-vars
        private readonly S3services: S3Service,
    ) {}

@Get('avatar/:userId')
@UseGuards(GetAvatarGuard)

async getAvatar(
    @Param() params: {
        userId: string;
    },
    @Res() res: ExpressResponse 
) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const userId = params.userId;
    const imageBuffer  = await this.S3services.getAvatar(userId);

    if (!imageBuffer) {
        return res.status(404).send('Avatar not found');
    }
    res.setHeader('Content-Type', 'image/png'); 
    res.send(imageBuffer); 
    

}


}



