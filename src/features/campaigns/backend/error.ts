export const CampaignErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  RECRUITMENT_COUNT_EXCEEDED: 'RECRUITMENT_COUNT_EXCEEDED',
  NO_APPLICANTS: 'NO_APPLICANTS',
  ALREADY_SELECTED: 'ALREADY_SELECTED',
  DB_ERROR: 'DB_ERROR',
  INVALID_CAMPAIGN_ID: 'INVALID_CAMPAIGN_ID',
  CAMPAIGN_FETCH_ERROR: 'CAMPAIGN_FETCH_ERROR',
} as const;

export type CampaignServiceError = typeof CampaignErrorCodes[keyof typeof CampaignErrorCodes];

// Legacy error codes mapping for backward compatibility
export const campaignErrorCodes = {
  notFound: CampaignErrorCodes.CAMPAIGN_NOT_FOUND,
  invalidId: CampaignErrorCodes.INVALID_CAMPAIGN_ID,
  fetchError: CampaignErrorCodes.CAMPAIGN_FETCH_ERROR,
} as const;
