export const throwError = (message: string, statusCode: number = 500) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  throw error;
};
