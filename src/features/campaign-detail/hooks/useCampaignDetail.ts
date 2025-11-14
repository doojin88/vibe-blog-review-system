import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CampaignDetail } from '../lib/dto';

export function useCampaignDetail(campaignId: number) {
  return useQuery({
    queryKey: ['campaign-detail', campaignId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ campaign: CampaignDetail }>(
        `/api/campaigns/${campaignId}`
      );
      return data;
    },
    staleTime: 60 * 1000,
    enabled: !!campaignId && campaignId > 0,
  });
}
