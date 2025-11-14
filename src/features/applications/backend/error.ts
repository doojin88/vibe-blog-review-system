export const ApplicationErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApplicationErrorCode =
  (typeof ApplicationErrorCodes)[keyof typeof ApplicationErrorCodes];
