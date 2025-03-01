import { ResponseType } from 'src/interface/response.interface';

export const responseLoader = (
  status: string,
  message: string,
  data: any,
): ResponseType => {
  return {
    status,
    data,
    created_at: new Date(),
    updated_at: new Date(),
    message,
  };
};
