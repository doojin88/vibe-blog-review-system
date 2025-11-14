'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CreateInfluencerInput, InfluencerResponse } from '../lib/dto';

export function useCreateInfluencer() {
  return useMutation({
    mutationFn: async (input: CreateInfluencerInput) => {
      const response = await apiClient.post<InfluencerResponse>(
        '/influencers',
        input
      );
      return response.data;
    },
  });
}
