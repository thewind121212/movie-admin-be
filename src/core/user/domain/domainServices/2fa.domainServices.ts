import crypto from 'bcrypt';
import { LOGIN_EXT } from '../../user.config';
import { UserRepositories } from '../../repositories/user.repositories';
import { UserSecurity } from '../../security/user.security';

export  async function enableTOTP(
    email: string,
    password: string,
    userRepositories: UserRepositories,
    userSecurityServices: UserSecurity,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
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

      const isPasswordMatch = await crypto.compare(password, user.password);
      if (!isPasswordMatch) {
        return {
          isError: true,
          message: 'Invalid password',
        };
      }

      const genTOTP = await userSecurityServices.generateOTP(email);

      if (!genTOTP.qrCodeImageURL) {
        throw new Error('Error generating qr code');
      }

      return {
        isError: false,
        message: 'TOTP enabled successfully',
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

export   async function disableTOTP(
    email: string,
    password: string,
    userRepositories: UserRepositories,
  ): Promise<{
    isError: boolean;
    isInternalError?: boolean;
    message: string;
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

      const isPasswordMatch = await crypto.compare(password, user.password);
      if (!isPasswordMatch) {
        return {
          isError: true,
          message: 'Invalid password',
        };
      }

      await userRepositories.updateUser(email, 'totpSecret', null);

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

export  async function verifyTOTP(
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

      const verifyResult = userSecurityServices.verifyOTP(
        email,
        token,
        user,
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

