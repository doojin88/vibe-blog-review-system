# 홈 페이지 (체험단 탐색) 구현 계획

## 1. 개요

### 1.1 목적
홈 페이지는 모집 중인 체험단을 탐색하는 메인 페이지입니다. 사용자(인플루언서 및 일반 방문자)는 다양한 체험단을 확인하고 필터링/정렬을 통해 원하는 체험단을 찾을 수 있습니다.

### 1.2 페이지 정보
- **URL**: `/`
- **접근 권한**: 누구나 접근 가능 (비로그인 포함)
- **주요 기능**:
  - 체험단 리스트 카드 뷰 표시
  - 카테고리, 모집 상태별 필터링
  - 최신순, 마감임박순 정렬
  - 체험단 카드 클릭 시 상세 페이지 이동

### 1.3 참고 문서
- PRD: `/docs/prd.md` (섹션 3.1.1)
- Userflow: `/docs/userflow.md` (섹션 1.2.1)
- Usecase: `/docs/usecases/3-campaign-browsing/spec.md`
- Database: `/docs/database.md` (섹션 4.3, 10.1)
- Common Modules: `/docs/common-modules.md`

---

## 2. 데이터 흐름 분석

### 2.1 데이터 읽기
```
[Frontend: /]
    ↓
[useCampaigns Hook]
    ↓ GET /api/campaigns?status=모집중&sort=latest
[Backend: route.ts]
    ↓
[service.ts: getCampaigns()]
    ↓ SQL Query
[Database: campaigns + advertisers]
    ↓ JOIN
[Response: { campaigns: [...], total: N }]
    ↓
[Frontend: CampaignCard 그리드 렌더링]
```

### 2.2 필터링 데이터 흐름
```
[사용자: 카테고리 선택]
    ↓
[Frontend: 쿼리 파라미터 업데이트]
    ↓ ?category=카페
[useCampaigns Hook 재실행]
    ↓
[Backend: WHERE category = '카페']
    ↓
[Database: 필터링된 결과]
    ↓
[Frontend: 업데이트된 리스트 렌더링]
```

### 2.3 데이터베이스 쿼리 예시
```sql
-- 기본 체험단 리스트 조회
SELECT
  campaigns.id,
  campaigns.title,
  campaigns.recruitment_count,
  campaigns.recruitment_end_date,
  campaigns.status,
  campaigns.category,
  campaigns.created_at,
  advertisers.business_name as store_name
FROM campaigns
JOIN advertisers ON campaigns.advertiser_id = advertisers.id
WHERE campaigns.status = '모집중'
  AND (campaigns.category = :category OR :category IS NULL)
ORDER BY campaigns.created_at DESC
LIMIT 20 OFFSET :offset;
```

---

## 3. 백엔드 구현 계획

### 3.1 API 엔드포인트

#### GET /api/campaigns

**목적**: 체험단 리스트 조회 및 필터링

**요청**:
- Method: `GET`
- Path: `/api/campaigns`
- Query Parameters:
  - `category?`: 카테고리 필터 (음식점, 카페, 뷰티, 패션, 생활, 기타)
  - `status?`: 모집 상태 필터 (모집중, 모집종료, 선정완료), 기본값: 모집중
  - `sort?`: 정렬 기준 (latest, deadline), 기본값: latest
  - `page?`: 페이지 번호 (1부터 시작), 기본값: 1
  - `limit?`: 페이지당 개수, 기본값: 20

**응답**:
```typescript
// 성공 (200 OK)
{
  campaigns: [
    {
      id: number;
      title: string;
      recruitmentCount: number;
      recruitmentEndDate: string; // ISO 8601
      status: '모집중' | '모집종료' | '선정완료';
      category: '음식점' | '카페' | '뷰티' | '패션' | '생활' | '기타';
      storeName: string;
      createdAt: string; // ISO 8601
    }
  ];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 실패 (400 Bad Request)
{
  error: {
    code: 'INVALID_QUERY_PARAMS';
    message: '잘못된 쿼리 파라미터입니다';
    details?: ZodError;
  }
}

// 실패 (500 Internal Server Error)
{
  error: {
    code: 'CAMPAIGN_FETCH_ERROR';
    message: '체험단 목록을 불러오는데 실패했습니다';
  }
}
```

### 3.2 파일 구조
```
src/features/campaign/
├── backend/
│   ├── route.ts        # GET /api/campaigns 라우터
│   ├── service.ts      # getCampaigns() 서비스 로직
│   ├── schema.ts       # Zod 스키마 (쿼리, 응답)
│   └── error.ts        # 에러 코드 정의
├── components/
│   ├── campaign-card.tsx       # 체험단 카드 UI
│   ├── campaign-filter.tsx     # 필터 및 정렬 UI
│   └── campaign-list.tsx       # 체험단 리스트 컨테이너
├── hooks/
│   └── useCampaigns.ts         # React Query 훅
├── lib/
│   └── dto.ts                  # 프론트엔드 DTO 재노출
└── constants/
    └── index.ts                # 카테고리, 정렬 옵션 상수
```

### 3.3 백엔드 구현 단계

#### Step 1: schema.ts 작성
```typescript
// src/features/campaign/backend/schema.ts
import { z } from 'zod';

// ENUM 타입 정의
export const CampaignStatusEnum = z.enum(['모집중', '모집종료', '선정완료']);
export const CampaignCategoryEnum = z.enum(['음식점', '카페', '뷰티', '패션', '생활', '기타']);
export const SortEnum = z.enum(['latest', 'deadline']);

// 쿼리 파라미터 스키마
export const GetCampaignsQuerySchema = z.object({
  category: CampaignCategoryEnum.optional(),
  status: CampaignStatusEnum.optional().default('모집중'),
  sort: SortEnum.optional().default('latest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type GetCampaignsQuery = z.infer<typeof GetCampaignsQuerySchema>;

// 데이터베이스 Row 스키마
export const CampaignRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  recruitment_count: z.number(),
  recruitment_end_date: z.string(),
  status: CampaignStatusEnum,
  category: CampaignCategoryEnum,
  created_at: z.string(),
  business_name: z.string(),
});

export type CampaignRow = z.infer<typeof CampaignRowSchema>;

// 응답 스키마
export const CampaignListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  recruitmentCount: z.number(),
  recruitmentEndDate: z.string(),
  status: CampaignStatusEnum,
  category: CampaignCategoryEnum,
  storeName: z.string(),
  createdAt: z.string(),
});

export type CampaignListItem = z.infer<typeof CampaignListItemSchema>;

export const GetCampaignsResponseSchema = z.object({
  campaigns: z.array(CampaignListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type GetCampaignsResponse = z.infer<typeof GetCampaignsResponseSchema>;
```

#### Step 2: error.ts 작성
```typescript
// src/features/campaign/backend/error.ts
export const campaignErrorCodes = {
  invalidQuery: 'INVALID_QUERY_PARAMS',
  fetchError: 'CAMPAIGN_FETCH_ERROR',
  validationError: 'CAMPAIGN_VALIDATION_ERROR',
} as const;

export type CampaignServiceError = typeof campaignErrorCodes[keyof typeof campaignErrorCodes];
```

#### Step 3: service.ts 작성
```typescript
// src/features/campaign/backend/service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import {
  CampaignRowSchema,
  CampaignListItemSchema,
  type GetCampaignsQuery,
  type GetCampaignsResponse,
  type CampaignRow,
} from './schema';
import { campaignErrorCodes, type CampaignServiceError } from './error';

const CAMPAIGNS_TABLE = 'campaigns';
const ADVERTISERS_TABLE = 'advertisers';

export const getCampaigns = async (
  client: SupabaseClient,
  query: GetCampaignsQuery,
): Promise<HandlerResult<GetCampaignsResponse, CampaignServiceError, unknown>> => {
  const { category, status, sort, page, limit } = query;
  const offset = (page - 1) * limit;

  // 기본 쿼리 작성
  let queryBuilder = client
    .from(CAMPAIGNS_TABLE)
    .select(
      `
      id,
      title,
      recruitment_count,
      recruitment_end_date,
      status,
      category,
      created_at,
      ${ADVERTISERS_TABLE}!inner(business_name)
    `,
      { count: 'exact' },
    );

  // 필터 적용
  if (status) {
    queryBuilder = queryBuilder.eq('status', status);
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  // 정렬 적용
  if (sort === 'latest') {
    queryBuilder = queryBuilder.order('created_at', { ascending: false });
  } else if (sort === 'deadline') {
    queryBuilder = queryBuilder.order('recruitment_end_date', { ascending: true });
  }

  // 페이지네이션 적용
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    return failure(500, campaignErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return success({
      campaigns: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    });
  }

  // 데이터 변환 (snake_case → camelCase)
  const campaigns = data.map((row: any) => {
    const flatRow: CampaignRow = {
      id: row.id,
      title: row.title,
      recruitment_count: row.recruitment_count,
      recruitment_end_date: row.recruitment_end_date,
      status: row.status,
      category: row.category,
      created_at: row.created_at,
      business_name: row.advertisers.business_name,
    };

    const rowParse = CampaignRowSchema.safeParse(flatRow);

    if (!rowParse.success) {
      throw new Error('Campaign row failed validation');
    }

    const mapped = {
      id: rowParse.data.id,
      title: rowParse.data.title,
      recruitmentCount: rowParse.data.recruitment_count,
      recruitmentEndDate: rowParse.data.recruitment_end_date,
      status: rowParse.data.status,
      category: rowParse.data.category,
      storeName: rowParse.data.business_name,
      createdAt: rowParse.data.created_at,
    };

    const parsed = CampaignListItemSchema.safeParse(mapped);

    if (!parsed.success) {
      throw new Error('Campaign payload failed validation');
    }

    return parsed.data;
  });

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const response: GetCampaignsResponse = {
    campaigns,
    total,
    page,
    limit,
    totalPages,
  };

  const responseParse = GetCampaignsResponseSchema.safeParse(response);

  if (!responseParse.success) {
    return failure(
      500,
      campaignErrorCodes.validationError,
      'Campaign response failed validation',
      responseParse.error.format(),
    );
  }

  return success(responseParse.data);
};
```

#### Step 4: route.ts 작성
```typescript
// src/features/campaign/backend/route.ts
import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { GetCampaignsQuerySchema } from './schema';
import { getCampaigns } from './service';
import { campaignErrorCodes } from './error';

export const registerCampaignRoutes = (app: Hono<AppEnv>) => {
  app.get('/campaigns', async (c) => {
    const queryParams = c.req.query();
    const parsedQuery = GetCampaignsQuerySchema.safeParse(queryParams);

    if (!parsedQuery.success) {
      return respond(
        c,
        failure(
          400,
          campaignErrorCodes.invalidQuery,
          '잘못된 쿼리 파라미터입니다',
          parsedQuery.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await getCampaigns(supabase, parsedQuery.data);

    if (!result.ok) {
      logger.error('Failed to fetch campaigns', result.error.message);
    }

    return respond(c, result);
  });
};
```

#### Step 5: Hono 앱에 라우터 등록
```typescript
// src/backend/hono/app.ts (기존 파일 수정)
import { registerCampaignRoutes } from '@/features/campaign/backend/route';

// createHonoApp 함수 내부에 추가
registerCampaignRoutes(app);
```

---

## 4. 프론트엔드 구현 계획

### 4.1 상수 정의

#### Step 1: constants/index.ts 작성
```typescript
// src/features/campaign/constants/index.ts
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
```

### 4.2 DTO 재노출

#### Step 2: lib/dto.ts 작성
```typescript
// src/features/campaign/lib/dto.ts
export {
  CampaignListItemSchema,
  GetCampaignsResponseSchema,
  type CampaignListItem,
  type GetCampaignsResponse,
} from '@/features/campaign/backend/schema';
```

### 4.3 React Query 훅

#### Step 3: hooks/useCampaigns.ts 작성
```typescript
// src/features/campaign/hooks/useCampaigns.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { GetCampaignsResponseSchema } from '@/features/campaign/lib/dto';

export type UseCampaignsParams = {
  category?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

const fetchCampaigns = async (params: UseCampaignsParams) => {
  try {
    const { data } = await apiClient.get('/api/campaigns', { params });
    return GetCampaignsResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '체험단 목록을 불러오는데 실패했습니다');
    throw new Error(message);
  }
};

export const useCampaigns = (params: UseCampaignsParams = {}) =>
  useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => fetchCampaigns(params),
    staleTime: 60 * 1000, // 1분
  });
```

### 4.4 UI 컴포넌트

#### Step 4: components/campaign-card.tsx 작성
```typescript
// src/features/campaign/components/campaign-card.tsx
'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users } from 'lucide-react';
import { formatRelative } from '@/lib/utils/date';
import type { CampaignListItem } from '@/features/campaign/lib/dto';
import Link from 'next/link';

type CampaignCardProps = {
  campaign: CampaignListItem;
};

export const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const daysUntilDeadline = formatRelative(campaign.recruitmentEndDate);

  const statusColor = {
    모집중: 'bg-blue-500',
    모집종료: 'bg-yellow-500',
    선정완료: 'bg-green-500',
  }[campaign.status];

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-2">{campaign.title}</h3>
            <Badge className={statusColor}>{campaign.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{campaign.storeName}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{campaign.recruitmentCount}명 모집</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{daysUntilDeadline}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Badge variant="outline">{campaign.category}</Badge>
        </CardFooter>
      </Card>
    </Link>
  );
};
```

#### Step 5: components/campaign-filter.tsx 작성
```typescript
// src/features/campaign/components/campaign-filter.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CAMPAIGN_CATEGORIES, CAMPAIGN_STATUSES, SORT_OPTIONS } from '@/features/campaign/constants';

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
        <Select value={category} onValueChange={onCategoryChange}>
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
        <Select value={status} onValueChange={onStatusChange}>
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
        <Select value={sort} onValueChange={onSortChange}>
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
```

#### Step 6: components/campaign-list.tsx 작성
```typescript
// src/features/campaign/components/campaign-list.tsx
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
    setPage(1); // 필터 변경 시 첫 페이지로
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error?.message || '체험단 목록을 불러오는데 실패했습니다'}</p>
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }

  if (!data || data.campaigns.length === 0) {
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
        {data.campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>

      {data.page < data.totalPages && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleLoadMore} variant="outline">
            더보기 ({data.page} / {data.totalPages})
          </Button>
        </div>
      )}
    </div>
  );
};
```

### 4.5 페이지 구현

#### Step 7: app/page.tsx 작성
```typescript
// src/app/page.tsx
import { CampaignList } from '@/features/campaign/components/campaign-list';

export default function HomePage() {
  return (
    <main>
      <CampaignList />
    </main>
  );
}
```

---

## 5. 유틸리티 함수 구현

### 5.1 날짜 포맷팅 유틸리티

#### Step 8: lib/utils/date.ts 작성
```typescript
// src/lib/utils/date.ts
import { differenceInDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 날짜를 포맷팅합니다.
 */
export const formatDate = (date: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: ko });
};

/**
 * D-Day 형식으로 반환합니다. (예: "D-7", "D-Day", "종료")
 */
export const formatRelative = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const diff = differenceInDays(dateObj, today);

  if (diff < 0) {
    return '종료';
  } else if (diff === 0) {
    return 'D-Day';
  } else {
    return `D-${diff}`;
  }
};

/**
 * 과거 날짜인지 확인합니다.
 */
export const isPast = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
};

/**
 * 미래 날짜인지 확인합니다.
 */
export const isFuture = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > new Date();
};
```

---

## 6. 의존성 확인 및 설치

### 6.1 필요한 shadcn-ui 컴포넌트 확인

기존 설치 여부 확인:
- ✅ `card`: 이미 설치됨
- ✅ `badge`: 이미 설치됨
- ✅ `button`: 이미 설치됨
- ✅ `select`: 이미 설치됨
- ✅ `label`: 이미 설치됨

### 6.2 추가 설치 필요 여부

현재 필요한 모든 컴포넌트가 이미 설치되어 있습니다.

---

## 7. 구현 순서

### Phase 1: 백엔드 구현
1. `src/features/campaign/backend/schema.ts` 작성
2. `src/features/campaign/backend/error.ts` 작성
3. `src/features/campaign/backend/service.ts` 작성
4. `src/features/campaign/backend/route.ts` 작성
5. `src/backend/hono/app.ts` 에 라우터 등록

### Phase 2: 유틸리티 구현
1. `src/lib/utils/date.ts` 작성

### Phase 3: 프론트엔드 구현
1. `src/features/campaign/constants/index.ts` 작성
2. `src/features/campaign/lib/dto.ts` 작성
3. `src/features/campaign/hooks/useCampaigns.ts` 작성
4. `src/features/campaign/components/campaign-card.tsx` 작성
5. `src/features/campaign/components/campaign-filter.tsx` 작성
6. `src/features/campaign/components/campaign-list.tsx` 작성
7. `src/app/page.tsx` 작성

### Phase 4: 테스트 및 검증
1. API 엔드포인트 테스트 (Postman 또는 브라우저)
2. 필터링 동작 확인
3. 정렬 동작 확인
4. 페이지네이션 동작 확인
5. 에러 처리 확인 (빈 상태, 네트워크 오류)
6. 반응형 디자인 확인 (모바일, 태블릿, 데스크톱)

---

## 8. 예외 처리 및 엣지 케이스

### 8.1 빈 상태 처리
- **시나리오**: 필터 조건에 맞는 체험단이 없음
- **처리 방법**: "모집 중인 체험단이 없습니다" 메시지 표시

### 8.2 네트워크 오류
- **시나리오**: API 요청 실패
- **처리 방법**:
  - React Query 자동 재시도 (3회)
  - 실패 시 에러 메시지 + "다시 시도" 버튼 표시

### 8.3 유효하지 않은 필터 파라미터
- **시나리오**: 잘못된 카테고리, 정렬 기준 전달
- **처리 방법**:
  - 백엔드: Zod 검증 실패 → 400 Bad Request
  - 프론트엔드: 기본값으로 폴백

### 8.4 로딩 상태
- **처리 방법**: 스켈레톤 UI 대신 중앙 로딩 스피너 표시 (간결성 우선)

---

## 9. 기존 코드와의 충돌 방지

### 9.1 네이밍 규칙 준수
- 라우터: `registerCampaignRoutes(app)`
- 서비스: `getCampaigns()`
- 스키마: `GetCampaignsQuerySchema`, `GetCampaignsResponseSchema`
- 에러 코드: `campaignErrorCodes`

### 9.2 파일 분리
- `src/features/campaign/` 폴더에 모든 관련 코드 격리
- 공통 모듈(`@/backend/`, `@/lib/`, `@/components/ui/`) 재사용
- 다른 기능과 독립적으로 개발 가능

### 9.3 DRY 원칙 준수
- 기존 `example` 기능의 패턴 그대로 적용
- 공통 응답 헬퍼(`success`, `failure`, `respond`) 재사용
- React Query 패턴 일관성 유지

---

## 10. 테스트 시나리오

### 10.1 성공 케이스

| 테스트 케이스 ID | 입력값 | 기대 결과 |
|----------------|--------|----------|
| TC-HOME-01 | 홈 페이지 접근, 필터 없음 | 모집중인 체험단 최신순으로 20개 표시 |
| TC-HOME-02 | 카테고리 필터: "카페" | 카테고리가 "카페"인 체험단만 표시 |
| TC-HOME-03 | 정렬: "마감임박순" | 마감일이 가까운 순으로 정렬 |
| TC-HOME-04 | 페이지네이션: "더보기" 클릭 | 다음 20개 체험단 추가 로드 |
| TC-HOME-05 | 체험단 카드 클릭 | `/campaigns/:id` 페이지로 이동 |

### 10.2 실패 케이스

| 테스트 케이스 ID | 입력값 | 기대 결과 |
|----------------|--------|----------|
| TC-HOME-06 | 필터: 존재하지 않는 카테고리 | 기본값으로 폴백 (전체) |
| TC-HOME-07 | 네트워크 오류 발생 | 에러 메시지 + "다시 시도" 버튼 |
| TC-HOME-08 | 모든 필터 적용 후 결과 없음 | "모집 중인 체험단이 없습니다" 메시지 |

---

## 11. 성능 최적화

### 11.1 데이터베이스 쿼리 최적화
- 복합 인덱스 활용: `idx_campaigns_status_created_at`
- JOIN 최소화: 필요한 컬럼만 선택
- 페이지네이션: 한 번에 20개씩만 로드

### 11.2 프론트엔드 최적화
- React Query 캐싱: 1분간 staleTime 설정
- 이미지 최적화: Next.js Image 컴포넌트 사용 (추후 placeholder 대체 시)
- Code Splitting: 페이지 단위 자동 분리 (Next.js 기본 기능)

### 11.3 응답 시간 목표
- API 응답 시간: 500ms 이내
- 페이지 로딩 시간: 3초 이내 (First Contentful Paint)

---

## 12. 접근성 (A11y)

### 12.1 키보드 네비게이션
- Tab 키로 필터 및 카드 간 이동 가능
- Enter 키로 카드 클릭 (Link 컴포넌트 기본 기능)

### 12.2 스크린 리더 호환
- 모든 이미지에 alt 텍스트 (추후 이미지 추가 시)
- ARIA 레이블 적용 (Label, Select 컴포넌트 사용)

### 12.3 색상 대비
- Badge 컴포넌트: 충분한 대비 확보
- 텍스트: 4.5:1 이상 대비 유지 (shadcn-ui 기본값)

---

## 13. 보안

### 13.1 SQL Injection 방지
- Supabase Parameterized Query 사용
- 직접 SQL 작성 금지

### 13.2 XSS 방지
- React의 자동 이스케이핑
- `dangerouslySetInnerHTML` 사용 금지

### 13.3 권한 검증
- 체험단 리스트는 누구나 조회 가능 (비로그인 포함)
- 백엔드에서 추가 권한 검증 불필요

---

## 14. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |

---

## 15. 참고 자료

- PRD: `/docs/prd.md` (섹션 3.1.1)
- Userflow: `/docs/userflow.md` (섹션 1.2.1)
- Usecase: `/docs/usecases/3-campaign-browsing/spec.md`
- Database: `/docs/database.md` (섹션 4.3, 10.1)
- Common Modules: `/docs/common-modules.md`
- Example Feature: `/src/features/example/`
- CLAUDE.md: 프로젝트 개발 가이드라인
