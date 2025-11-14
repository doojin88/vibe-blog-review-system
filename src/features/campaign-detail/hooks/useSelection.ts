import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { toast } from 'sonner';

interface SelectionParams {
  campaignId: number;
  selectedApplicationIds: number[];
}

export function useSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, selectedApplicationIds }: SelectionParams) => {
      const { data } = await apiClient.patch('/api/applications/bulk', {
        campaign_id: campaignId,
        selected_application_ids: selectedApplicationIds,
      });
      return data;
    },
    onSuccess: (data, { campaignId }) => {
      toast.success(`인플루언서 선정이 완료되었습니다 (선정: ${data.selected_count}명, 반려: ${data.rejected_count}명)`);
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['applicants', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || '선정에 실패했습니다';
      toast.error(message);
    },
  });
}
