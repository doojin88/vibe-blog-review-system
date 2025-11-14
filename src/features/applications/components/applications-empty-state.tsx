'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ApplicationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">📋</div>
      <h3 className="mb-2 text-lg font-semibold">
        아직 지원한 체험단이 없습니다
      </h3>
      <p className="mb-6 text-sm text-muted-foreground">
        다양한 체험단을 둘러보고 지원해보세요
      </p>
      <Button asChild>
        <Link href="/">체험단 둘러보기</Link>
      </Button>
    </div>
  );
}
