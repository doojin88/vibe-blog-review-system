'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { CampaignTable } from './CampaignTable';
import { CampaignStatusFilter } from './CampaignStatusFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Campaign } from '@/features/campaigns/lib/dto';

type CampaignStatus = '모집중' | '모집종료' | '선정완료' | '전체';

export function CampaignListSection() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus>('전체');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns', { status: statusFilter === '전체' ? undefined : statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== '전체') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/api/campaigns?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">체험단 목록을 불러오는데 실패했습니다</p>
        <Button onClick={() => refetch()} variant="outline">
          재시도
        </Button>
      </div>
    );
  }

  const campaigns = (data?.campaigns as Campaign[]) || [];

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">등록된 체험단이 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      <CampaignStatusFilter value={statusFilter} onChange={setStatusFilter} />
      <CampaignTable campaigns={campaigns} />
    </div>
  );
}
