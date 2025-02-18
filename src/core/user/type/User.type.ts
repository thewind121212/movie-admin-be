export interface RegisterRequestJWTPayloadType {
    purpose: 'register-request-approval';
    email: string;
    sub: {
      email: string;
    };
    iat: number;
    exp: number;
    aud: 'wliafdew-movie-uploader-user';
    iss: 'wliafdew-movie-uploader';
  }