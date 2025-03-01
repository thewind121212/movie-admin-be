export const REGISTER_REQUEST_RETRY_DAY = 3;
export type JWT_PURPOSE_TYPE =
  | 'REGISTER_REQUEST'
  | 'FORGOT_PASSWORD'
  | 'REFRESH'
  | 'AUTHENTICATION';
export const USER_PASSWORD_SALT_ROUND = 10;
export const FORGOT_PASS_EXT = '-FORGOT_PASSWORD';
export const LOGIN_EXT = '-LOGIN';

export const tokenName = {
  REGISTER_REQUEST: 'x-register-token',
  FORGOT_PASSWORD: 'x-forgot-password-token',
  NONCE_2FA: 'x-2fa-nonce',
};
