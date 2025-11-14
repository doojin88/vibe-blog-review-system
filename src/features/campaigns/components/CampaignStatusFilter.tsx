'use client';

import { Button } from '@/components/ui/button';

type CampaignStatus = '전체' | '모집중' | '모집종료' | '선정완료';

type Props = {
  value: CampaignStatus;
  onChange: (status: CampaignStatus) => void;
};

export function CampaignStatusFilter({ value, onChange }: Props) {
  const statuses: CampaignStatus[] = ['전체', '모집중', '모집종료', '선정완료'];

  return (
    <div className="flex gap-2 mb-6">
      {statuses.map((status) => (
        <Button
          key={status}
          variant={value === status ? 'default' : 'outline'}
          onClick={() => onChange(status)}
        >
          {status}
        </Button>
      ))}
    </div>
  );
}
