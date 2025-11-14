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
import { useEarlyClose } from '../hooks/useEarlyClose';

interface EarlyCloseButtonProps {
  campaignId: number;
}

export function EarlyCloseButton({ campaignId }: EarlyCloseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: closeEarly, isPending } = useEarlyClose();

  const handleConfirm = () => {
    closeEarly(campaignId, {
      onSuccess: () => {
        setIsOpen(false);
      },
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        모집 조기 종료
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>모집을 조기 종료하시겠습니까?</DialogTitle>
            <DialogDescription>
              조기 종료 후에는 더 이상 지원자를 받을 수 없습니다.
              종료 후 인플루언서 선정을 진행할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? '처리 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
