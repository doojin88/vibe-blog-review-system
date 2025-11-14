'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CampaignDetailResponse } from '../lib/dto';

export function useCampaignDetail(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data } = await apiClient.get<CampaignDetailResponse>(
        `/api/campaigns/${campaignId}`
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
}
