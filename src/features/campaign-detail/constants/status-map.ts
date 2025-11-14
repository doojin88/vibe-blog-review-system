export const CAMPAIGN_STATUS_MAP = {
  모집중: {
    label: '모집중',
    variant: 'default' as const,
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  모집종료: {
    label: '모집종료',
    variant: 'secondary' as const,
    className: 'bg-yellow-500 hover:bg-yellow-600',
  },
  선정완료: {
    label: '선정완료',
    variant: 'default' as const,
    className: 'bg-green-500 hover:bg-green-600',
  },
} as const;

export const APPLICATION_STATUS_MAP = {
  신청완료: {
    label: '신청완료',
    variant: 'outline' as const,
    className: '',
  },
  선정: {
    label: '선정',
    variant: 'default' as const,
    className: 'bg-green-500 hover:bg-green-600',
  },
  반려: {
    label: '반려',
    variant: 'secondary' as const,
    className: '',
  },
} as const;

export type CampaignStatus = keyof typeof CAMPAIGN_STATUS_MAP;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS_MAP;
