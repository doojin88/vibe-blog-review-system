export const ProfileErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
} as const;

export type ProfileErrorCode =
  (typeof ProfileErrorCodes)[keyof typeof ProfileErrorCodes];
