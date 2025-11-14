import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CreateAdvertiserInput, Advertiser } from '../lib/dto';

export function useCreateAdvertiser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdvertiserInput): Promise<Advertiser> => {
      const response = await apiClient.post<Advertiser>('/api/advertisers', input);
      return response.data;
    },
    onSuccess: () => {
      // 프로필 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
