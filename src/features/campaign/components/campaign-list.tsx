'use client';

import { useState } from 'react';
import { useCampaigns } from '@/features/campaign/hooks/useCampaigns';
import { CampaignCard } from './campaign-card';
import { CampaignFilter } from './campaign-filter';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const CampaignList = () => {
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('모집중');
  const [sort, setSort] = useState<string>('latest');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading, isError, error, refetch } = useCampaigns({
    category: category || undefined,
    status: status || undefined,
    sort: sort || undefined,
    page,
  });

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && page === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">
          {error?.message || '체험단 목록을 불러오는데 실패했습니다'}
        </p>
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }

  if (!data || (data.campaigns.length === 0 && page === 1)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">모집 중인 체험단이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CampaignFilter
        category={category}
        status={status}
        sort={sort}
        onCategoryChange={handleCategoryChange}
        onStatusChange={handleStatusChange}
        onSortChange={handleSortChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>

      {data && data.page < data.totalPages && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleLoadMore} variant="outline">
            더보기 ({data.page} / {data.totalPages})
          </Button>
        </div>
      )}
    </div>
  );
};
