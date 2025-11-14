export const InfluencerErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_PROFILE: 'DUPLICATE_PROFILE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type InfluencerErrorCode = typeof InfluencerErrorCodes[keyof typeof InfluencerErrorCodes];
