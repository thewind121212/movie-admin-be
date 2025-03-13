import { User } from "@prisma/client";
import { UserRepositories } from "../../repositories/user.repositories";

export async function getAllUsers(userRepositories : UserRepositories): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
    users?: Partial<User>[];
    total?: number;
  }> {

    try {
    const allUser = await userRepositories.getAllUser()
    if (!allUser) {
      return {
        isError: true,
        message: 'Internal error',
        isInternalError: true
      }
    }
    return {
      isError: false,
      message: 'Success',
      users: allUser.users,
      total: allUser.total
    }

      
    } catch (error) {
      console.log(error)
      return {
        isError: true,
        message: 'Internal error',
        isInternalError: true
      } 
    }
  }