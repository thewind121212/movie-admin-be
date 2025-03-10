export const REGISTER_REQUEST_RETRY_DAY = 3;
 //for token
export type JWT_PURPOSE_TYPE =
  | 'REGISTER_REQUEST'
  | 'FORGOT_PASSWORD'
  | 'REFRESH'
  | 'AUTHENTICATION'

  //for redis
export const USER_PASSWORD_SALT_ROUND = 10;
export const RECOVERY_CODE_SALT_ROUND = 10;
export const FORGOT_PASS_EXT = '-FORGOT_PASSWORD';
export const LOGIN_EXT = '-LOGIN';
export const REQUEST_2FA_TOTP = '-REQUEST_2FA_TOTPT';
export const USER_S3_BUCKET = 'user';

export const tokenName = {
  REGISTER_REQUEST: 'x-register-token',
  FORGOT_PASSWORD: 'x-forgot-password-token',
  NONCE_2FA: 'x-2fa-nonce',
};
