'use client';

import { Badge } from '@/components/ui/badge';
import type { ApplicationItem } from '../lib/dto';

type ApplicationStatus = ApplicationItem['status'];

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' }
> = {
  신청완료: { label: '신청완료', variant: 'default' },
  선정: { label: '선정', variant: 'success' },
  반려: { label: '반려', variant: 'secondary' },
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
