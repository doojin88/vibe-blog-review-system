export const campaignErrorCodes = {
  invalidQuery: 'INVALID_QUERY_PARAMS',
  fetchError: 'CAMPAIGN_FETCH_ERROR',
  validationError: 'CAMPAIGN_VALIDATION_ERROR',
} as const;

export type CampaignServiceError =
  typeof campaignErrorCodes[keyof typeof campaignErrorCodes];
