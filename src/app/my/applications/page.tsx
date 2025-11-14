'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useApplicationsQuery } from '@/features/applications/hooks/useApplicationsQuery';
import { ApplicationsTable } from '@/features/applications/components/applications-table';
import { ApplicationsEmptyState } from '@/features/applications/components/applications-empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  // 필터 및 정렬 상태
  const [status, setStatus] = useState<
    'all' | '신청완료' | '선정' | '반려'
  >('all');
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest');

  // 데이터 조회 (조건부 호출 방지)
  const {
    data,
    isLoading: isDataLoading,
    error,
    refetch,
  } = useApplicationsQuery({
    status,
    sort,
    limit: 20,
    offset: 0,
  });

  // 접근 제어는 useEffect에서 처리
  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.push('/login?redirect=/my/applications');
      return;
    }

    if (user.role !== 'influencer') {
      router.push('/');
      return;
    }

    if (!user.hasProfile) {
      router.push('/onboarding/influencer');
      return;
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isDataLoading;

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-2xl font-bold">내 지원 목록</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-2xl font-bold">내 지원 목록</h1>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="mb-4 text-destructive">
            지원 목록을 불러오는데 실패했습니다.
          </p>
          <Button onClick={() => refetch()}>재시도</Button>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (data && data.applications.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-2xl font-bold">내 지원 목록</h1>
        <ApplicationsEmptyState />
      </div>
    );
  }

  // 정상 상태
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">내 지원 목록</h1>

      {/* 필터 및 정렬 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="w-full sm:w-48">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="신청완료">신청완료</SelectItem>
              <SelectItem value="선정">선정</SelectItem>
              <SelectItem value="반려">반려</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 테이블 */}
      {data && <ApplicationsTable applications={data.applications} />}
    </div>
  );
}
