'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { GetCampaignsResponseSchema } from '@/features/campaign/lib/dto';

export type UseCampaignsParams = {
  category?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

const fetchCampaigns = async (params: UseCampaignsParams) => {
  try {
    const { data } = await apiClient.get('/api/campaigns', { params });
    return GetCampaignsResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '체험단 목록을 불러오는데 실패했습니다',
    );
    throw new Error(message);
  }
};

export const useCampaigns = (params: UseCampaignsParams = {}) =>
  useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => fetchCampaigns(params),
    staleTime: 60 * 1000,
  });
