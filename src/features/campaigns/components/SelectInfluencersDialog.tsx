'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserCheck } from 'lucide-react';
import type { Application } from '@/features/campaigns/lib/dto';

type Props = {
  campaignId: number;
  recruitmentCount: number;
  applications: Application[];
};

export function SelectInfluencersDialog({
  campaignId,
  recruitmentCount,
  applications,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectMutation = useMutation({
    mutationFn: async (selectedApplicationIds: number[]) => {
      const response = await apiClient.patch('/api/applications/bulk', {
        campaign_id: campaignId,
        selected_application_ids: selectedApplicationIds,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '인플루언서 선정이 완료되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-applications', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setOpen(false);
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast({
        title: '선정 처리에 실패했습니다',
        description: error.response?.data?.error?.message || '다시 시도해주세요',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (applicationId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(applicationId)) {
        return prev.filter((id) => id !== applicationId);
      }
      if (prev.length >= recruitmentCount) {
        toast({
          title: `최대 ${recruitmentCount}명까지 선정할 수 있습니다`,
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, applicationId];
    });
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast({
        title: '최소 1명 이상 선정해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (selectedIds.length > recruitmentCount) {
      toast({
        title: `최대 ${recruitmentCount}명까지 선정할 수 있습니다`,
        variant: 'destructive',
      });
      return;
    }

    selectMutation.mutate(selectedIds);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserCheck className="mr-2 h-4 w-4" />
          체험단 선정
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>체험단 선정</DialogTitle>
          <DialogDescription>
            선정할 인플루언서를 선택하세요 ({selectedIds.length}/{recruitmentCount}명 선정)
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">선택</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>SNS 채널명</TableHead>
                <TableHead>팔로워 수</TableHead>
                <TableHead>각오 한마디</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(app.id)}
                      onCheckedChange={() => handleToggle(app.id)}
                      disabled={
                        !selectedIds.includes(app.id) &&
                        selectedIds.length >= recruitmentCount
                      }
                    />
                  </TableCell>
                  <TableCell>{app.influencer.name}</TableCell>
                  <TableCell>{app.influencer.channel_name}</TableCell>
                  <TableCell>{app.influencer.followers_count.toLocaleString()}명</TableCell>
                  <TableCell className="max-w-xs truncate">{app.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectMutation.isPending || selectedIds.length === 0}
          >
            {selectMutation.isPending ? '처리 중...' : '선정 완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
