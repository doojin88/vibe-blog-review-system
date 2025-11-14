'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { CampaignStatusFilter } from './CampaignStatusFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type CampaignStatus = '모집중' | '모집종료' | '선정완료' | '전체';

export function CampaignListSection() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus>('전체');

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-campaigns', { status: statusFilter === '전체' ? undefined : statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== '전체') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/dashboard/campaigns?${params.toString()}`);
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
        <p className="text-red-500">캠페인을 불러올 수 없습니다</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          새로고침
        </Button>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  if (campaigns.length === 0) {
    return (
      <div>
        <CampaignStatusFilter value={statusFilter} onChange={setStatusFilter} />
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">진행 중인 캠페인이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CampaignStatusFilter value={statusFilter} onChange={setStatusFilter} />
      <div className="grid gap-4">
        {campaigns.map((campaign: any) => (
          <div key={campaign.id} className="p-4 border rounded-lg">
            <h3 className="font-semibold">{campaign.title}</h3>
            <p className="text-sm text-gray-500">{campaign.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
