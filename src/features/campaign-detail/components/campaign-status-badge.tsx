'use client';

import { Badge } from '@/components/ui/badge';
import { CAMPAIGN_STATUS_MAP, type CampaignStatus } from '../constants/status-map';
import { cn } from '@/lib/utils';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = CAMPAIGN_STATUS_MAP[status];

  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
