# 내 지원 목록 페이지 구현 계획

## 1. 페이지 개요

### 1.1 페이지 정보
- **경로**: `/my/applications`
- **역할**: 인플루언서 전용
- **목적**: 지원한 체험단 목록 및 상태 확인

### 1.2 관련 문서
- PRD: `/docs/prd.md` (섹션 3.2.3)
- Userflow: `/docs/userflow.md` (섹션 1.2.4)
- Usecase: `/docs/usecases/5-my-applications/spec.md`
- Database: `/docs/database.md` (applications, campaigns 테이블)
- Common Modules: `/docs/common-modules.md`

---

## 2. 요구사항 분석

### 2.1 기능 요구사항

#### 2.1.1 필수 기능 (P0)
1. **지원 목록 조회**
   - 인플루언서가 지원한 체험단 목록 표시
   - 테이블 뷰로 렌더링
   - 컬럼: 체험단명, 지원일, 상태, 방문 예정일
   - 기본 정렬: 지원일 최신순

2. **상태 뱃지 표시**
   - 신청완료: 파란색
   - 선정: 초록색
   - 반려: 회색

3. **체험단 상세 이동**
   - 체험단명 클릭 시 `/campaigns/:id` 페이지로 이동

4. **빈 상태 처리**
   - 지원 내역이 없을 경우 빈 상태 메시지 표시
   - "체험단 둘러보기" 버튼 제공

#### 2.1.2 선택 기능 (P1)
1. **상태 필터링**
   - 전체, 신청완료, 선정, 반려 필터
   - 드롭다운 UI

2. **정렬 변경**
   - 지원일 최신순 (기본값)
   - 지원일 오래된순

### 2.2 비기능 요구사항

#### 2.2.1 접근 제어
- 비로그인 사용자: `/login?redirect=/my/applications`로 리다이렉트
- 광고주 계정: 홈 페이지로 리다이렉트 + "인플루언서 전용 페이지입니다" 메시지
- 인플루언서 정보 미등록: `/onboarding/influencer`로 리다이렉트

#### 2.2.2 성능
- API 응답 시간: 500ms 이내
- 초기 페이지 로딩: 3초 이내 (First Contentful Paint)
- React Query 캐시: 5분 유지

#### 2.2.3 UX
- 로딩 중: 스켈레톤 UI 표시
- 에러 발생: 에러 메시지 + 재시도 버튼
- 모바일 반응형 디자인 지원

---

## 3. 데이터베이스 스키마

### 3.1 관련 테이블

#### applications (지원서)
```sql
id                bigint        PRIMARY KEY
campaign_id       bigint        FK → campaigns.id
influencer_id     bigint        FK → influencers.id
message           text          각오 한마디
visit_date        date          방문 예정일
status            enum          '신청완료', '선정', '반려'
applied_at        timestamptz   지원 시각
created_at        timestamptz   레코드 생성 시각
updated_at        timestamptz   레코드 수정 시각
```

#### campaigns (체험단)
```sql
id                    bigint        PRIMARY KEY
advertiser_id         bigint        FK → advertisers.id
title                 text          체험단명
description           text          설명
recruitment_end_date  date          모집 종료일
status                enum          '모집중', '모집종료', '선정완료'
...
```

### 3.2 조회 쿼리
```sql
SELECT
  applications.id,
  applications.message,
  applications.visit_date,
  applications.status,
  applications.applied_at,
  campaigns.title AS campaign_title,
  campaigns.status AS campaign_status,
  campaigns.recruitment_end_date,
  campaigns.id AS campaign_id
FROM
  public.applications
JOIN
  public.campaigns ON applications.campaign_id = campaigns.id
WHERE
  applications.influencer_id = :influencer_id
  -- AND applications.status = :status (필터 적용 시)
ORDER BY
  applications.applied_at DESC -- 또는 ASC (정렬 옵션)
LIMIT 20
OFFSET 0;
```

---

## 4. API 설계

### 4.1 엔드포인트

#### GET /api/applications

**목적**: 현재 인플루언서의 지원 목록 조회

**인증**: 필수 (세션 쿠키)

**쿼리 파라미터**:
```typescript
{
  status?: 'all' | '신청완료' | '선정' | '반려';  // 기본값: 'all'
  sort?: 'latest' | 'oldest';                    // 기본값: 'latest'
  limit?: number;                                // 기본값: 20
  offset?: number;                               // 기본값: 0
}
```

**응답 (200 OK)**:
```typescript
{
  applications: Array<{
    id: number;
    campaignId: number;
    campaignTitle: string;
    campaignStatus: 'モ집중' | '모집종료' | '선정완료';
    status: '신청완료' | '선정' | '반려';
    message: string;
    visitDate: string;      // YYYY-MM-DD
    appliedAt: string;      // ISO 8601
  }>;
  total: number;
}
```

**에러 응답**:
```typescript
// 401 Unauthorized
{
  error: {
    code: 'UNAUTHORIZED';
    message: '로그인이 필요합니다';
  }
}

// 403 Forbidden
{
  error: {
    code: 'FORBIDDEN';
    message: '인플루언서만 접근할 수 있습니다';
  }
}

// 403 Forbidden
{
  error: {
    code: 'PROFILE_NOT_FOUND';
    message: '인플루언서 정보를 먼저 등록해주세요';
  }
}

// 500 Internal Server Error
{
  error: {
    code: 'INTERNAL_ERROR';
    message: '지원 목록 조회에 실패했습니다';
  }
}
```

---

## 5. 백엔드 구현

### 5.1 파일 구조
```
src/features/applications/
├── backend/
│   ├── route.ts        # Hono 라우터 (GET /api/applications)
│   ├── service.ts      # Supabase 조회 로직
│   ├── schema.ts       # Zod 요청/응답 스키마
│   └── error.ts        # 에러 코드 정의
└── lib/
    └── dto.ts          # 프론트엔드 DTO 재노출
```

### 5.2 구현 단계

#### Step 1: 에러 코드 정의
**파일**: `src/features/applications/backend/error.ts`

```typescript
export const ApplicationErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApplicationErrorCode =
  (typeof ApplicationErrorCodes)[keyof typeof ApplicationErrorCodes];
```

#### Step 2: Zod 스키마 정의
**파일**: `src/features/applications/backend/schema.ts`

```typescript
import { z } from 'zod';

// 요청 쿼리 파라미터 스키마
export const GetApplicationsQuerySchema = z.object({
  status: z
    .enum(['all', '신청완료', '선정', '반려'])
    .optional()
    .default('all'),
  sort: z.enum(['latest', 'oldest']).optional().default('latest'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type GetApplicationsQuery = z.infer<typeof GetApplicationsQuerySchema>;

// 응답 아이템 스키마
export const ApplicationItemSchema = z.object({
  id: z.number(),
  campaignId: z.number(),
  campaignTitle: z.string(),
  campaignStatus: z.enum(['모집중', '모집종료', '선정완료']),
  status: z.enum(['신청완료', '선정', '반려']),
  message: z.string(),
  visitDate: z.string(), // YYYY-MM-DD
  appliedAt: z.string(), // ISO 8601
});

export type ApplicationItem = z.infer<typeof ApplicationItemSchema>;

// 응답 스키마
export const GetApplicationsResponseSchema = z.object({
  applications: z.array(ApplicationItemSchema),
  total: z.number(),
});

export type GetApplicationsResponse = z.infer<
  typeof GetApplicationsResponseSchema
>;
```

#### Step 3: 서비스 로직 구현
**파일**: `src/features/applications/backend/service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GetApplicationsQuery, ApplicationItem } from './schema';

/**
 * 인플루언서의 지원 목록을 조회합니다.
 * @param supabase - Supabase 서버 클라이언트
 * @param influencerId - 인플루언서 ID
 * @param query - 쿼리 파라미터
 * @returns 지원 목록 및 총 개수
 */
export async function getApplications(
  supabase: SupabaseClient,
  influencerId: number,
  query: GetApplicationsQuery
): Promise<{ applications: ApplicationItem[]; total: number }> {
  const { status, sort, limit, offset } = query;

  // 1. Build query
  let queryBuilder = supabase
    .from('applications')
    .select(
      `
      id,
      campaign_id,
      message,
      visit_date,
      status,
      applied_at,
      campaigns:campaign_id (
        title,
        status
      )
    `,
      { count: 'exact' }
    )
    .eq('influencer_id', influencerId);

  // 2. Apply status filter
  if (status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  // 3. Apply sorting
  if (sort === 'latest') {
    queryBuilder = queryBuilder.order('applied_at', { ascending: false });
  } else {
    queryBuilder = queryBuilder.order('applied_at', { ascending: true });
  }

  // 4. Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  // 5. Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    throw error;
  }

  // 6. Transform data
  const applications: ApplicationItem[] = (data || []).map((item) => ({
    id: item.id,
    campaignId: item.campaign_id,
    campaignTitle: (item.campaigns as any)?.title || '',
    campaignStatus: (item.campaigns as any)?.status || '모집중',
    status: item.status,
    message: item.message,
    visitDate: item.visit_date,
    appliedAt: item.applied_at,
  }));

  return {
    applications,
    total: count || 0,
  };
}

/**
 * 인플루언서 ID를 조회합니다.
 * @param supabase - Supabase 서버 클라이언트
 * @param userId - 사용자 ID
 * @returns 인플루언서 ID 또는 null
 */
export async function getInfluencerId(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('influencers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data?.id || null;
}
```

#### Step 4: Hono 라우터 구현
**파일**: `src/features/applications/backend/route.ts`

```typescript
import { Hono } from 'hono';
import type { AppContext } from '@/backend/hono/context';
import { success, failure, respond } from '@/backend/http/response';
import { ApplicationErrorCodes } from './error';
import { GetApplicationsQuerySchema } from './schema';
import { getApplications, getInfluencerId } from './service';

const app = new Hono<AppContext>();

/**
 * GET /api/applications
 * 현재 인플루언서의 지원 목록을 조회합니다.
 */
app.get('/', async (c) => {
  try {
    const supabase = c.get('supabase');

    // 1. Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(
          401,
          ApplicationErrorCodes.UNAUTHORIZED,
          '로그인이 필요합니다'
        )
      );
    }

    // 2. Get influencer ID
    const influencerId = await getInfluencerId(supabase, user.id);

    if (!influencerId) {
      return respond(
        c,
        failure(
          403,
          ApplicationErrorCodes.PROFILE_NOT_FOUND,
          '인플루언서 정보를 먼저 등록해주세요'
        )
      );
    }

    // 3. Parse query parameters
    const rawQuery = c.req.query();
    const parseResult = GetApplicationsQuerySchema.safeParse(rawQuery);

    if (!parseResult.success) {
      return respond(
        c,
        failure(400, 'INVALID_REQUEST', '잘못된 요청입니다', {
          errors: parseResult.error.errors,
        })
      );
    }

    const query = parseResult.data;

    // 4. Get applications
    const result = await getApplications(supabase, influencerId, query);

    return respond(c, success(result));
  } catch (error) {
    c.get('logger').error('Failed to get applications', error);
    return respond(
      c,
      failure(
        500,
        ApplicationErrorCodes.INTERNAL_ERROR,
        '지원 목록 조회에 실패했습니다'
      )
    );
  }
});

export default app;
```

#### Step 5: Hono 앱에 라우터 등록
**파일**: `src/backend/hono/app.ts`

기존 파일에 다음 코드 추가:
```typescript
import applicationsRoutes from '@/features/applications/backend/route';

// ... 기존 코드 ...

app.route('/applications', applicationsRoutes);
```

#### Step 6: DTO 재노출
**파일**: `src/features/applications/lib/dto.ts`

```typescript
export type {
  GetApplicationsQuery,
  GetApplicationsResponse,
  ApplicationItem,
} from '../backend/schema';
```

### 5.3 기존 코드와의 충돌 방지

#### 5.3.1 확인 사항
- ✅ `/api/profile` 엔드포인트는 이미 구현되어 있음
- ✅ Hono 앱 구조는 기존 `profile` 기능과 동일한 패턴 사용
- ✅ `applications` 테이블은 마이그레이션으로 생성 예정

#### 5.3.2 주의사항
1. **라우터 등록**: `src/backend/hono/app.ts`에서 `/applications` 경로로 등록
2. **에러 코드**: `ApplicationErrorCodes`는 독립적으로 정의
3. **스키마**: `GetApplicationsQuerySchema`는 다른 기능과 충돌하지 않음

---

## 6. 프론트엔드 구현

### 6.1 파일 구조
```
src/features/applications/
├── hooks/
│   └── useApplicationsQuery.ts    # React Query 훅
├── components/
│   ├── applications-table.tsx     # 지원 목록 테이블
│   ├── application-status-badge.tsx  # 상태 뱃지
│   └── applications-empty-state.tsx  # 빈 상태 UI
└── lib/
    └── dto.ts                     # DTO 재노출 (이미 작성)

src/app/my/applications/
└── page.tsx                       # 페이지 컴포넌트
```

### 6.2 구현 단계

#### Step 1: React Query 훅
**파일**: `src/features/applications/hooks/useApplicationsQuery.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/remote/api-client';
import type {
  GetApplicationsQuery,
  GetApplicationsResponse,
} from '../lib/dto';

export function useApplicationsQuery(query: GetApplicationsQuery) {
  return useQuery({
    queryKey: ['applications', query],
    queryFn: async () => {
      const response = await apiClient.get<GetApplicationsResponse>(
        '/api/applications',
        { params: query }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}
```

#### Step 2: 상태 뱃지 컴포넌트
**파일**: `src/features/applications/components/application-status-badge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import type { ApplicationItem } from '../lib/dto';

type ApplicationStatus = ApplicationItem['status'];

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' }
> = {
  신청완료: { label: '신청완료', variant: 'default' },
  선정: { label: '선정', variant: 'success' },
  반려: { label: '반려', variant: 'secondary' },
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

#### Step 3: 빈 상태 컴포넌트
**파일**: `src/features/applications/components/applications-empty-state.tsx`

```typescript
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
```

#### Step 4: 테이블 컴포넌트
**파일**: `src/features/applications/components/applications-table.tsx`

```typescript
'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApplicationStatusBadge } from './application-status-badge';
import type { ApplicationItem } from '../lib/dto';

interface ApplicationsTableProps {
  applications: ApplicationItem[];
}

export function ApplicationsTable({ applications }: ApplicationsTableProps) {
  return (
    <Table>
      <TableCaption>지원한 체험단 목록</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>체험단명</TableHead>
          <TableHead>지원일</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>방문 예정일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.id}>
            <TableCell>
              <Link
                href={`/campaigns/${application.campaignId}`}
                className="hover:underline"
              >
                {application.campaignTitle}
              </Link>
            </TableCell>
            <TableCell>
              {format(new Date(application.appliedAt), 'yyyy-MM-dd', {
                locale: ko,
              })}
            </TableCell>
            <TableCell>
              <ApplicationStatusBadge status={application.status} />
            </TableCell>
            <TableCell>
              {format(new Date(application.visitDate), 'yyyy-MM-dd', {
                locale: ko,
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### Step 5: 페이지 컴포넌트
**파일**: `src/app/my/applications/page.tsx`

```typescript
'use client';

import { useState } from 'react';
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
import { useRouter } from 'next/navigation';

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  // 필터 및 정렬 상태
  const [status, setStatus] = useState<
    'all' | '신청완료' | '선정' | '반려'
  >('all');
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest');

  // 접근 제어
  if (!isUserLoading) {
    if (!user) {
      router.push('/login?redirect=/my/applications');
      return null;
    }

    if (user.role !== 'influencer') {
      router.push('/');
      return null;
    }

    if (!user.hasProfile) {
      router.push('/onboarding/influencer');
      return null;
    }
  }

  // 데이터 조회
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
      <div className="mb-6 flex gap-4">
        <div className="w-48">
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

        <div className="w-48">
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
```

### 6.3 필요한 shadcn-ui 컴포넌트

#### 확인 필요
- ✅ `Button` (이미 설치됨)
- ✅ `Badge` (이미 설치됨)
- ✅ `Select` (이미 설치됨)
- ❌ `Table` (설치 필요)

#### 설치 명령어
```bash
npx shadcn@latest add table
```

---

## 7. 접근 제어 구현

### 7.1 Middleware 활용

**파일**: `src/middleware.ts`

보호된 경로에 `/my/applications` 추가:
```typescript
const protectedPaths = [
  '/onboarding',
  '/dashboard',
  '/my/applications', // 추가
  '/campaigns/:id/apply',
];
```

### 7.2 클라이언트 사이드 접근 제어

페이지 컴포넌트에서 다음 순서로 검증:
1. **로그인 여부**: `useCurrentUser` 훅으로 확인
2. **역할 확인**: `user.role === 'influencer'`
3. **프로필 등록 여부**: `user.hasProfile === true`

각 단계에서 조건 불만족 시 적절한 페이지로 리다이렉트

---

## 8. 에러 처리

### 8.1 백엔드 에러

| 에러 코드 | HTTP 상태 | 메시지 | 처리 |
|----------|----------|--------|-----|
| UNAUTHORIZED | 401 | 로그인이 필요합니다 | 로그인 페이지로 리다이렉트 |
| PROFILE_NOT_FOUND | 403 | 인플루언서 정보를 먼저 등록해주세요 | 온보딩 페이지로 리다이렉트 |
| INTERNAL_ERROR | 500 | 지원 목록 조회에 실패했습니다 | 에러 메시지 표시 + 재시도 버튼 |

### 8.2 프론트엔드 에러 처리

#### React Query 에러 핸들링
```typescript
const { error } = useApplicationsQuery({ ... });

if (error) {
  // axios error에서 메시지 추출
  const message = extractApiErrorMessage(error);
  // 에러 UI 표시
}
```

#### 네트워크 에러
- React Query의 `retry` 옵션으로 3회 재시도
- 3회 실패 후 에러 메시지 + 재시도 버튼 표시

---

## 9. 성능 최적화

### 9.1 React Query 캐싱
- `staleTime`: 5분 (300,000ms)
- `cacheTime`: 10분 (기본값)
- 쿼리 키: `['applications', query]` (필터/정렬 포함)

### 9.2 데이터베이스 인덱스
- `idx_applications_influencer_id`: influencer_id 조회 최적화
- `idx_applications_applied_at`: applied_at 정렬 최적화
- `idx_applications_status`: status 필터링 최적화

### 9.3 스켈레톤 UI
- 로딩 중 5개의 스켈레톤 행 표시
- 사용자에게 즉각적인 피드백 제공

---

## 10. 테스트 시나리오

### 10.1 정상 케이스

| 테스트 케이스 | 전제 조건 | 기대 결과 |
|------------|---------|---------|
| TC-001 | 인플루언서 로그인, 지원 내역 3건 | 3건의 지원 내역이 테이블에 표시됨 |
| TC-002 | TC-001 상태 + 상태 필터 "선정" | "선정" 상태인 지원 내역만 표시됨 |
| TC-003 | TC-001 상태 + 정렬 "오래된순" | 지원일 오래된순으로 정렬되어 표시됨 |
| TC-004 | TC-001 상태 + 체험단명 클릭 | 해당 체험단 상세 페이지로 이동 |
| TC-005 | 인플루언서 로그인, 지원 내역 없음 | 빈 상태 메시지 + "체험단 둘러보기" 버튼 |

### 10.2 에러 케이스

| 테스트 케이스 | 전제 조건 | 기대 결과 |
|------------|---------|---------|
| TC-006 | 비로그인 상태 | `/login?redirect=/my/applications`로 리다이렉트 |
| TC-007 | 광고주로 로그인 | 홈 페이지로 리다이렉트 + 에러 메시지 |
| TC-008 | 인플루언서 정보 미등록 | `/onboarding/influencer`로 리다이렉트 |
| TC-009 | API 요청 실패 (3회) | 에러 메시지 + 재시도 버튼 표시 |

---

## 11. 구현 순서 및 체크리스트

### 11.1 백엔드 구현 (우선순위 높음)

- [ ] **Step 1**: 에러 코드 정의 (`error.ts`)
- [ ] **Step 2**: Zod 스키마 정의 (`schema.ts`)
- [ ] **Step 3**: 서비스 로직 구현 (`service.ts`)
  - [ ] `getApplications` 함수
  - [ ] `getInfluencerId` 함수
- [ ] **Step 4**: Hono 라우터 구현 (`route.ts`)
  - [ ] GET /api/applications 엔드포인트
  - [ ] 인증 검증
  - [ ] 쿼리 파라미터 파싱
  - [ ] 에러 핸들링
- [ ] **Step 5**: Hono 앱에 라우터 등록 (`src/backend/hono/app.ts`)
- [ ] **Step 6**: DTO 재노출 (`lib/dto.ts`)

### 11.2 프론트엔드 구현

- [ ] **Step 1**: shadcn-ui 컴포넌트 설치
  - [ ] `npx shadcn@latest add table`
- [ ] **Step 2**: React Query 훅 구현 (`hooks/useApplicationsQuery.ts`)
- [ ] **Step 3**: 상태 뱃지 컴포넌트 (`components/application-status-badge.tsx`)
- [ ] **Step 4**: 빈 상태 컴포넌트 (`components/applications-empty-state.tsx`)
- [ ] **Step 5**: 테이블 컴포넌트 (`components/applications-table.tsx`)
- [ ] **Step 6**: 페이지 컴포넌트 (`app/my/applications/page.tsx`)
  - [ ] 접근 제어
  - [ ] 필터 및 정렬 UI
  - [ ] 로딩 상태
  - [ ] 에러 상태
  - [ ] 빈 상태
  - [ ] 정상 상태

### 11.3 통합 테스트

- [ ] **Test 1**: 백엔드 API 단독 테스트 (Postman 또는 curl)
- [ ] **Test 2**: 프론트엔드 + 백엔드 통합 테스트
- [ ] **Test 3**: 접근 제어 테스트 (비로그인, 광고주, 프로필 미등록)
- [ ] **Test 4**: 필터 및 정렬 기능 테스트
- [ ] **Test 5**: 에러 처리 테스트 (네트워크 에러, 서버 에러)

---

## 12. 기존 코드와의 충돌 확인

### 12.1 확인 사항

#### ✅ 충돌 없음
1. **라우터 경로**: `/api/applications`는 다른 기능과 중복되지 않음
2. **파일 구조**: `src/features/applications/` 폴더는 독립적
3. **에러 코드**: `ApplicationErrorCodes`는 다른 기능과 분리됨
4. **스키마**: `GetApplicationsQuerySchema`는 고유함

#### ✅ 기존 코드 활용
1. **Hono 앱 구조**: `src/features/profile/backend/route.ts` 패턴 참고
2. **서비스 로직**: `src/features/profile/backend/service.ts` 패턴 참고
3. **CurrentUser 컨텍스트**: 이미 구현된 `useCurrentUser` 훅 활용
4. **API 클라이언트**: 이미 구현된 `apiClient` 활용

### 12.2 주의사항

1. **데이터베이스 마이그레이션**:
   - `applications` 테이블이 생성되어 있어야 함
   - `/docs/common-modules.md`의 마이그레이션 파일 참고

2. **CurrentUser 타입 확장**:
   - `role` 및 `hasProfile` 속성이 이미 구현되어 있어야 함
   - `/api/profile` 엔드포인트와 통합되어 있어야 함

3. **shadcn-ui 컴포넌트**:
   - `Table` 컴포넌트 설치 필요

---

## 13. 추가 개선 사항 (P1 이상)

### 13.1 페이지네이션 (P1)
- "더 보기" 버튼 또는 무한 스크롤
- React Query의 `useInfiniteQuery` 활용

### 13.2 실시간 상태 업데이트 (P2)
- 광고주가 선정/반려 처리 시 실시간 반영
- Supabase Realtime 구독 고려

### 13.3 삭제된 체험단 처리 (P2)
- 체험단이 삭제된 경우 "(삭제됨)" 표시
- 클릭 시 404 페이지 표시

---

## 14. 최종 검증 체크리스트

### 14.1 기능 검증
- [ ] 지원 목록이 정상적으로 표시되는가?
- [ ] 상태 뱃지가 올바른 색상으로 표시되는가?
- [ ] 필터링이 정상 작동하는가?
- [ ] 정렬이 정상 작동하는가?
- [ ] 체험단명 클릭 시 상세 페이지로 이동하는가?
- [ ] 빈 상태 UI가 표시되는가?

### 14.2 접근 제어 검증
- [ ] 비로그인 사용자가 로그인 페이지로 리다이렉트되는가?
- [ ] 광고주가 홈 페이지로 리다이렉트되는가?
- [ ] 인플루언서 정보 미등록 시 온보딩 페이지로 이동하는가?

### 14.3 에러 처리 검증
- [ ] 네트워크 에러 시 에러 메시지가 표시되는가?
- [ ] 재시도 버튼이 정상 작동하는가?
- [ ] 서버 에러 시 적절한 에러 메시지가 표시되는가?

### 14.4 성능 검증
- [ ] 초기 로딩 시간이 3초 이내인가?
- [ ] API 응답 시간이 500ms 이내인가?
- [ ] React Query 캐싱이 정상 작동하는가?

---

## 15. 참고 문서

### 15.1 내부 문서
- `/docs/prd.md` (섹션 3.2.3)
- `/docs/userflow.md` (섹션 1.2.4)
- `/docs/usecases/5-my-applications/spec.md`
- `/docs/database.md` (applications, campaigns 테이블)
- `/docs/common-modules.md` (백엔드/프론트엔드 공통 모듈)

### 15.2 외부 문서
- [React Query 공식 문서](https://tanstack.com/query/latest)
- [Hono 공식 문서](https://hono.dev/)
- [Supabase 공식 문서](https://supabase.com/docs)
- [shadcn-ui 공식 문서](https://ui.shadcn.com/)

---

## 16. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
