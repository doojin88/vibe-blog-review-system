'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

type Props = {
  campaignId: number;
};

export function CloseRecruitmentButton({ campaignId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const closeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch(`/api/campaigns/${campaignId}/status`, {
        status: '모집종료',
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '모집이 종료되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: '모집 종료에 실패했습니다',
        description: error.response?.data?.error?.message || '다시 시도해주세요',
        variant: 'destructive',
      });
    },
  });

  const handleClick = () => {
    if (confirm('정말 모집을 종료하시겠습니까?')) {
      closeMutation.mutate();
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleClick}
      disabled={closeMutation.isPending}
    >
      <AlertCircle className="mr-2 h-4 w-4" />
      {closeMutation.isPending ? '처리 중...' : '모집 조기 종료'}
    </Button>
  );
}
