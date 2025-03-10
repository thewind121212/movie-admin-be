import bcrypt from 'bcrypt';
import { REQUEST_2FA_TOTP, LOGIN_EXT } from '../../user.config';
import { UserRepositories } from '../../repositories/user.repositories';
import { UserSecurity } from '../../security/user.security';
import { User } from '@prisma/client';


export async function requestEnableTOTP(
  email: string,
  password: string,
  userRepositories: UserRepositories,
  userSecurityServices: UserSecurity,
): Promise<{
  isError: boolean;
  isInternalError?: boolean;
  message: string;
  recoveryCodes?: string[];
  qrCodeImageURL?: string;
}> {
  try {
    const user = await userRepositories.getUser(email);

    if (!user) {
      return {
        isError: true,
        message: 'User not found',
      };
    }

    if (user?.totpSecret && user.totpSecret !== '') {
      return {
        isError: true,
        message: 'User already have 2FA TOTP enable',
      };
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return {
        isError: true,
        message: 'Invalid password',
      };
    }

    const genTOTP = await userSecurityServices.generateTOTP(email);

    if (!genTOTP.secret) {
      throw new Error('Error generating secret');
    }
    const totpEncoded = userSecurityServices.encryptAES256(genTOTP.secret)

    if (!genTOTP.qrCodeImageURL) {
      throw new Error('Error generating qr code');
    }

    //get the recovery pass for 2fa

    const recoveryPass = userSecurityServices.generateMutiRecoveryCodes(5)
    //get thewrite to redis for temporary storage
    await userRepositories.writeToRedis(
      `${user.id}${REQUEST_2FA_TOTP}`,
      JSON.stringify({
        serect: totpEncoded,
        recoveryPass: recoveryPass.hashedPass,
      }),
      '15m'
    )

    return {
      isError: false,
      message: 'TOTP enabled successfully',
      recoveryCodes: recoveryPass.rawPass,
      qrCodeImageURL: genTOTP.qrCodeImageURL,
    };

  } catch (error) {
    console.log('Internal Error', error);
    return {
      isError: true,
      isInternalError: true,
      message: 'Error enabling TOTP',
    };
  }
}

export async function disableTOTP(
  userId: string,
  token: string,
  removeMethod: 'token' | 'recoveryPass',
  userRepositories: UserRepositories,
  userSecurityServices: UserSecurity,
): Promise<{
  isError: boolean;
  isInternalError?: boolean;
  message: string;
}> {
  try {
    const user = await userRepositories.getUser('_', userId);

    if (!user) {
      return {
        isError: true,
        message: 'User not found',
      };
    }

    if (!user?.totpSecret || user.totpSecret === '') {
      return {
        isError: true,
        message: 'User does not have 2FA TOTP enable',
      };
    }
    // this method is use know token from totp
    if (removeMethod === 'token') {

      const serect = userSecurityServices.decryptAES256(user.totpSecret)
      const verifyResult = userSecurityServices.verifyTOTP(
        user.email,
        token,
        serect,
      );

      if (verifyResult.isError) {
        return {
          isError: true,
          message: verifyResult.message,
        };
      }

    }

    // this method is use know token from totp

    if (removeMethod === 'recoveryPass') {
      ///get the recovery pass from the user
      if (!user.recoveryCode) return { isError: true, message: 'User does not have recovery pass please contact support now!' }
      const recoveryPass = JSON.parse(user.recoveryCode)

      for (let i = 0; i < recoveryPass.length; i++) {
        const compare = bcrypt.compareSync(token, recoveryPass[i])
        if (compare) {
          break;
        }
        if (i === recoveryPass.length - 1) return { isError: true, message: 'Invalid recovery pass' }
      }

    }

      await userRepositories.updateUser('_', '_', '_', userId, true, { totpSecret: '', twoFaStatus: "DISABLED", recoveryCode: '' } as User)



    return {
      isError: false,
      message: 'TOTP disable successfully',
    };
  } catch (error) {
    console.log('Internal Error', error);
    return {
      isError: true,
      isInternalError: true,
      message: 'Error disabling TOTP',
    };
  }
}

export async function verifyTOTP(
  email: string,
  token: string,
  nonce: string,
  userRepositories: UserRepositories,
  userSecurityServices: UserSecurity,
): Promise<{
  isError: boolean;
  isInternalError?: boolean;
  message: string;
  token?: string;
  userId?: string;
  refreshToken?: string;
}> {
  try {
    const user = await userRepositories.getUser(email);

    if (!user) {
      return {
        isError: true,
        message: 'User not found',
      };
    }

    if (!user?.totpSecret || user.totpSecret === '') {
      return {
        isError: true,
        message: 'User does not have 2FA TOTP enable',
      };
    }

    const cachingLogin = await userRepositories.getValueFromRedis(
      `${user?.id}${LOGIN_EXT}`,
    );
    if (!cachingLogin) {
      return {
        isError: true,
        message: 'Nonce not found',
      };
    }

    if (cachingLogin.nonce !== nonce) {
      return {
        isError: true,
        message: 'Invalid nonce',
      };
    }

    if (!cachingLogin.token || !cachingLogin.refreshToken) {
      throw new Error('Error getting token');
    }

    const serect = userSecurityServices.decryptAES256(user.totpSecret)

    const verifyResult = userSecurityServices.verifyTOTP(
      email,
      token,
      serect,
    );

    if (verifyResult.isError) {
      return {
        isError: true,
        message: verifyResult.message,
      };
    }

    if (verifyResult.isInterNalError) {
      throw new Error('Error verifying OTP');
    }

    await userRepositories.removeKey(`${user.id}${LOGIN_EXT}`);

    return {
      isError: false,
      message: 'Access granted TOTP verified successfully',
      refreshToken: cachingLogin.refreshToken,
      userId: user.id,
      token: cachingLogin.token,
    };
  } catch (error) {
    console.log('Internal Error', error);
    return {
      isError: true,
      isInternalError: true,
      message: 'Error verifying TOTP',
    };
  }
}


export async function enableTOTP(
  userId: string,
  token: string,
  userRepositories: UserRepositories,
  userSecurityServices: UserSecurity,
): Promise<{
  isError: boolean;
  isInternalError?: boolean;
  message: string;
}> {
  try {
    //check if the user exist and have totp already ?
    const user = await userRepositories.getUser('_', userId)
    if (!user) return { isError: true, message: 'User not found' }
    if (user.totpSecret) return { isError: true, message: 'User already have 2FA TOTP enable' }

    // check i exprired to enable or not 
    const getTempTOTP: {
      serect: string,
      recoveryPass: string[]
    } = await userRepositories.getValueFromRedis(`${user.id}${REQUEST_2FA_TOTP}`,)
    if (!getTempTOTP) return { isError: true, message: 'Request not found try again' }

    const decryptSerect = userSecurityServices.decryptAES256(getTempTOTP.serect)


    // verify the TOTP token
    const verify = userSecurityServices.verifyTOTP(user.email, token, decryptSerect)
    if (verify.isError) return { isError: true, message: verify.message }

    if (!verify.isError) {
      // save the totp secret to the user 
      await userRepositories.updateUser('_', '_', '_', userId, true, { totpSecret: getTempTOTP.serect, twoFaStatus: 'ENABLED', recoveryCode: JSON.stringify(getTempTOTP.recoveryPass) } as User)
      // delete the temp totp
      await userRepositories.removeKey(`${user.id}${REQUEST_2FA_TOTP}`)
    }


    return {
      isError: false,
      message: 'TOTP enabled successfully'
    }

  } catch (error) {
    console.log(error)

    return {
      isError: true,
      isInternalError: true,
      message: 'Error enabling TOTP',
    }

  }
}

