import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { Application } from '../lib/dto';

interface UseApplicantsOptions {
  sort?: 'latest' | 'oldest';
  status?: string;
}

export function useApplicants(
  campaignId: number,
  options?: UseApplicantsOptions
) {
  return useQuery({
    queryKey: ['applicants', campaignId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.sort) params.append('sort', options.sort);
      if (options?.status) params.append('status', options.status);

      const { data } = await apiClient.get<{ applications: Application[] }>(
        `/api/campaigns/${campaignId}/applications?${params.toString()}`
      );
      return data;
    },
    staleTime: 60 * 1000,
    enabled: !!campaignId && campaignId > 0,
  });
}
