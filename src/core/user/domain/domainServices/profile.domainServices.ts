import { User } from "@prisma/client";
import { UserRepositories } from "../../repositories/user.repositories";
import { S3Service } from "src/Infrastructure/s3/s3.service";
import fs from 'fs'
import path from 'path'
import { USER_S3_BUCKET } from "../../user.config";

export async function getUser(
    userId: string,
    userRepositories: UserRepositories,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    user?: User;
  }> {
    try {

      // get user from database 
      const userData = await userRepositories.getUser('_', userId);

      if (!userData) {
        return {
          isError: true,
          message: 'User not found',
        };
      }


      //remove sensitive data
      const userDataClone = { ...userData };
      delete (userDataClone as Partial<User>).password;
      delete (userDataClone as Partial<User>).totpSecret;




      return {
        isError: false,
        message: 'User retrieved successfully',
        user: userDataClone,
      };

    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error retrieving user',
      };
    }
  }


export   async function editUser(
    userId: string, data: {
      name?: string, birthDate?: Date, gender?: string, country?: string, timeZone?: string, bio?: string
    },
    userRepositories: UserRepositories
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    try {

      for (const key in data) {
        if (!data[key]) {
          delete data[key];
        }
      }


      // get user from database 
      const userData = await userRepositories.updateUser('_', '_', '_', userId, true, data as User);

      if (!userData) {
        return {
          isError: true,
          message: 'User not found',
        };
      }

      return {
        isError: false,
        message: 'User retrieved successfully',
      };

    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error retrieving user',
      };
    }
  }


export async function uploadAvatar(
    userId: string, avatar: string, name: string, userRepositories: UserRepositories, s3Service: S3Service
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
  }> {
    try {
      //verify is user exist

      const user = await userRepositories.getUser('_', userId);


      if (!user) {
        return {
          isError: true,
          message: 'Invalid access token',
        }
      }


      //perform upload to s3

      const newAvatar = `${user.id}/avatar/avatar${path.extname(name)}`
      const readStream = fs.createReadStream(avatar)
      await s3Service.upLoadToS3(USER_S3_BUCKET, newAvatar, readStream)

      //clean up old avatar on s3 this will be not efficient if the avatar is large so i run this in background
      //if the error happen i need cached to redis and crond job to clean up the old avatar
      s3Service.s3.listObjectsV2({
        Bucket: USER_S3_BUCKET,
        Prefix: `${user.id}/avatar/`,
        MaxKeys: 1000
      }, (err, data) => {
        if (err) {
          console.log("Internal Error", err)
          return
        }
        if (!data.Contents) return
        for (const content of data.Contents) {
          if (content.Key === newAvatar) continue
          s3Service.s3.deleteObject({
            Bucket: USER_S3_BUCKET,
            Key: content.Key!
          }, (err) => {
            if (err) {
              console.log("Internal Error", err)
              return
            }
          })
          console.log(`Deleted ${content.Key}`)
        }
      })




      return {
        isError: false,
        message: 'Avatar uploaded successfully',
      };



    } catch (error) {
      console.log('Internal Error', error);
      return {
        isError: true,
        isInternalError: true,
        message: 'Error uploading user avatar',
      };
    }
  }