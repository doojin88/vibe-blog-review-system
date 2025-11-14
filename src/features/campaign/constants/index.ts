export const CAMPAIGN_CATEGORIES = [
  { value: '음식점', label: '음식점' },
  { value: '카페', label: '카페' },
  { value: '뷰티', label: '뷰티' },
  { value: '패션', label: '패션' },
  { value: '생활', label: '생활' },
  { value: '기타', label: '기타' },
] as const;

export const CAMPAIGN_STATUSES = [
  { value: '모집중', label: '모집중' },
  { value: '모집종료', label: '모집종료' },
  { value: '선정완료', label: '선정완료' },
] as const;

export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'deadline', label: '마감임박순' },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
