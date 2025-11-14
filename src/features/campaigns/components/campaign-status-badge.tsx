'use client';

import { Badge } from '@/components/ui/badge';

type CampaignStatus = '모집중' | '모집종료' | '선정완료';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

const statusConfig: Record<
  CampaignStatus,
  { variant: 'default' | 'secondary' | 'outline'; label: string }
> = {
  모집중: { variant: 'default', label: '모집중' },
  모집종료: { variant: 'secondary', label: '모집종료' },
  선정완료: { variant: 'outline', label: '선정완료' },
};

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
