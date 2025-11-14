'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  SORT_OPTIONS,
} from '@/features/campaign/constants';

type CampaignFilterProps = {
  category?: string;
  status?: string;
  sort?: string;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
};

export const CampaignFilter = ({
  category,
  status,
  sort,
  onCategoryChange,
  onStatusChange,
  onSortChange,
}: CampaignFilterProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Label htmlFor="category">카테고리</Label>
        <Select value={category || ''} onValueChange={onCategoryChange}>
          <SelectTrigger id="category">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">전체</SelectItem>
            {CAMPAIGN_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label htmlFor="status">모집 상태</Label>
        <Select value={status || ''} onValueChange={onStatusChange}>
          <SelectTrigger id="status">
            <SelectValue placeholder="모집중" />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_STATUSES.map((stat) => (
              <SelectItem key={stat.value} value={stat.value}>
                {stat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label htmlFor="sort">정렬</Label>
        <Select value={sort || ''} onValueChange={onSortChange}>
          <SelectTrigger id="sort">
            <SelectValue placeholder="최신순" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
