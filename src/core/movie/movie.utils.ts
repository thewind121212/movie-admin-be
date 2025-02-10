
import * as AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';


const uploadFile = async (filePath: string, s3: AWS.S3, bucketName: string, key: string) => {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
    };
    try {
        const data = await s3.upload(uploadParams).promise();
    } catch (err) {
        console.error('Error uploading file:', err);
    }
}

export const scanFolder = async (folderPath: string, s3: AWS.S3, filename: string) => {
    const files = fs.readdirSync(folderPath);
    const concurrencyLimit = 10;
    let currentIndex = 0;
    const uploadPromises: Promise<void>[] = [];

    while (currentIndex < files.length) {
        const batch = files.slice(currentIndex, currentIndex + concurrencyLimit);

        batch.forEach((file) => {
            const fullFilePath = path.resolve(folderPath, file);
            uploadPromises.push(uploadFile(fullFilePath, s3, 'movie-bucket', `${filename}/${file}`));
        });

        await Promise.all(uploadPromises);
        currentIndex += concurrencyLimit;
    }

    console.log('All files uploaded.');
}
