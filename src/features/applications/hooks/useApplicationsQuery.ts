'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type {
  GetApplicationsQuery,
  GetApplicationsResponse,
} from '../lib/dto';

export function useApplicationsQuery(query: GetApplicationsQuery) {
  return useQuery({
    queryKey: ['applications', query],
    queryFn: async () => {
      const response = await apiClient.get<GetApplicationsResponse>(
        '/api/applications',
        { params: query }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
