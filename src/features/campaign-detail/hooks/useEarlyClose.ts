import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { toast } from 'sonner';

export function useEarlyClose() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: number) => {
      const { data } = await apiClient.patch(
        `/api/campaigns/${campaignId}/status`,
        { status: '모집종료' }
      );
      return data;
    },
    onSuccess: (_, campaignId) => {
      toast.success('모집이 조기 종료되었습니다');
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || '모집 종료에 실패했습니다';
      toast.error(message);
    },
  });
}
