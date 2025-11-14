'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useSelection } from '../hooks/useSelection';
import type { Application } from '../lib/dto';

interface SelectionDialogProps {
  campaignId: number;
  applications: Application[];
  recruitmentCount: number;
}

export function SelectionDialog({
  campaignId,
  applications,
  recruitmentCount,
}: SelectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { mutate: selectInfluencers, isPending } = useSelection();

  const pendingApplications = applications.filter(
    (app) => app.status === '신청완료'
  );

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((appId) => appId !== id);
      }
      if (prev.length >= recruitmentCount) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === Math.min(pendingApplications.length, recruitmentCount)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        pendingApplications.slice(0, recruitmentCount).map((app) => app.id)
      );
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;

    selectInfluencers(
      { campaignId, selectedApplicationIds: selectedIds },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSelectedIds([]);
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!isPending) {
      setIsOpen(open);
      if (!open) {
        setSelectedIds([]);
      }
    }
  };

  if (pendingApplications.length === 0) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>인플루언서 선정</Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>인플루언서 선정</DialogTitle>
            <DialogDescription>
              선정할 인플루언서를 선택해주세요. (최대 {recruitmentCount}명)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isPending}
              >
                {selectedIds.length === Math.min(pendingApplications.length, recruitmentCount)
                  ? '전체 해제'
                  : '전체 선택'}
              </Button>
              <p className="text-sm text-muted-foreground">
                {recruitmentCount}명 중 {selectedIds.length}명 선정
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold w-12"></th>
                    <th className="text-left p-3 font-semibold">이름</th>
                    <th className="text-left p-3 font-semibold">SNS 채널</th>
                    <th className="text-left p-3 font-semibold">팔로워</th>
                    <th className="text-left p-3 font-semibold">각오 한마디</th>
                    <th className="text-left p-3 font-semibold">방문 예정일</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplications.map((app) => {
                    const isSelected = selectedIds.includes(app.id);
                    const isDisabled =
                      !isSelected && selectedIds.length >= recruitmentCount;

                    return (
                      <tr
                        key={app.id}
                        className={`border-b hover:bg-muted/50 ${
                          isDisabled ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(app.id)}
                            disabled={isDisabled || isPending}
                          />
                        </td>
                        <td className="p-3">{app.influencer.name}</td>
                        <td className="p-3">
                          <a
                            href={app.influencer.channel_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {app.influencer.channel_name}
                          </a>
                        </td>
                        <td className="p-3">
                          {app.influencer.followers_count.toLocaleString()}명
                        </td>
                        <td className="p-3 max-w-xs truncate">{app.message}</td>
                        <td className="p-3">
                          {format(new Date(app.visit_date), 'yyyy.MM.dd', { locale: ko })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0 || isPending}
            >
              {isPending ? '처리 중...' : `선정 완료 (${selectedIds.length}명)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
