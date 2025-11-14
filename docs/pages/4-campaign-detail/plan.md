# 체험단 상세 페이지 구현 계획

## 1. 개요

### 1.1 페이지 정보
- **경로**: `/campaigns/[id]`
- **목적**: 체험단 상세 정보 확인 및 지원 가능 여부 판단
- **접근 권한**: 모든 사용자 (비로그인 포함)
- **관련 문서**:
  - PRD 섹션 3.1.4
  - Userflow 섹션 1.2.2
  - Usecase UC-003 (체험단 탐색 및 리스트 조회)

### 1.2 주요 기능
1. 체험단 상세 정보 표시
2. 사용자 상태에 따른 CTA 버튼 표시
3. 지원 여부 확인
4. 광고주 정보 표시

---

## 2. 프로젝트 상태 파악

### 2.1 기존 구현 상태

#### ✅ 완료된 공통 모듈
1. **백엔드**:
   - Hono 앱 구성 (`src/backend/hono/app.ts`)
   - 공통 미들웨어 (errorBoundary, withAppContext, withSupabase)
   - HTTP 응답 헬퍼 (`src/backend/http/response.ts`)
   - Supabase 클라이언트 (`src/backend/supabase/client.ts`)
   - 환경 변수 설정 (`src/backend/config/index.ts`)

2. **프론트엔드**:
   - API 클라이언트 (`src/lib/remote/api-client.ts`)
   - React Query 설정 (`src/app/providers.tsx`)
   - CurrentUserContext (`src/features/auth/context/current-user-context.tsx`)
   - Profile API (`src/features/profile/backend/route.ts`, `service.ts`, `schema.ts`)

3. **데이터베이스**:
   - campaigns 테이블 (마이그레이션 파일 존재)
   - advertisers, influencers, applications 테이블
   - ENUM 타입 (campaign_status_enum, campaign_category_enum)

#### 🔄 추가 구현 필요
1. **공통 UI 컴포넌트**:
   - Badge (상태 표시용)
   - Date 포맷팅 유틸리티
   - 로딩 스켈레톤 UI

2. **Campaign 기능**:
   - 체험단 상세 조회 API
   - 지원 여부 확인 로직
   - 체험단 상세 페이지 컴포넌트

### 2.2 의존성 확인

#### 선행 조건
- ✅ 데이터베이스 마이그레이션 완료
- ✅ Profile API 구현 완료 (역할 정보 확인)
- ✅ CurrentUserContext 구현 완료
- 🔄 Badge 컴포넌트 (shadcn-ui 설치 필요)

#### 병렬 개발 가능 여부
- ✅ 다른 페이지와 독립적으로 개발 가능
- ✅ 공통 모듈에만 의존
- ⚠️ 지원 페이지(`/campaigns/[id]/apply`)와 일부 연동 필요 (CTA 버튼)

---

## 3. 데이터 구조 및 흐름

### 3.1 데이터베이스 스키마 (참조)

#### campaigns 테이블
```sql
CREATE TABLE public.campaigns (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  advertiser_id bigint NOT NULL REFERENCES public.advertisers(id),
  title text NOT NULL,
  description text NOT NULL,
  recruitment_start_date date NOT NULL,
  recruitment_end_date date NOT NULL,
  recruitment_count int NOT NULL,
  benefits text NOT NULL,
  mission text NOT NULL,
  store_name text NOT NULL,
  store_address text NOT NULL,
  store_phone text NOT NULL,
  category campaign_category_enum NOT NULL,
  status campaign_status_enum NOT NULL DEFAULT '모집중',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 관련 테이블
- `advertisers`: 광고주 정보 (business_name)
- `applications`: 지원 내역 (중복 지원 확인용)

### 3.2 API 스펙

#### GET /api/campaigns/:id

**요청**
- Method: `GET`
- Path: `/api/campaigns/:id`
- Headers:
  - `Cookie: sb-access-token` (선택사항, 로그인한 경우)
- Params:
  - `id` (required): 체험단 ID (bigint)

**응답 (성공 - 200 OK)**
```typescript
{
  campaign: {
    id: number;
    title: string;
    description: string;
    recruitment_start_date: string; // ISO date
    recruitment_end_date: string;   // ISO date
    recruitment_count: number;
    benefits: string;
    mission: string;
    store_name: string;
    store_address: string;
    store_phone: string;
    category: '음식점' | '카페' | '뷰티' | '패션' | '생활' | '기타';
    status: '모집중' | '모집종료' | '선정완료';
    created_at: string; // ISO timestamp
    updated_at: string;
    advertiser: {
      id: number;
      business_name: string;
    };
  };
  hasApplied: boolean; // 로그인한 인플루언서만 true/false, 비로그인은 null
  isOwner: boolean;    // 광고주 본인 여부
}
```

**응답 (실패 - 404 Not Found)**
```typescript
{
  error: {
    code: 'CAMPAIGN_NOT_FOUND';
    message: '존재하지 않는 체험단입니다';
  }
}
```

**응답 (실패 - 500 Internal Server Error)**
```typescript
{
  error: {
    code: 'INTERNAL_SERVER_ERROR';
    message: '서버 오류가 발생했습니다';
  }
}
```

### 3.3 데이터 플로우

```
[사용자] → [페이지 접근] → [GET /api/campaigns/:id]
                                    ↓
                    [campaigns 테이블 조회 + advertisers JOIN]
                                    ↓
              [로그인 사용자인 경우 applications 테이블 조회]
                                    ↓
                        [응답 데이터 구성 및 반환]
                                    ↓
                    [프론트엔드: React Query 캐싱]
                                    ↓
                        [UI 렌더링 + CTA 버튼 상태 결정]
```

---

## 4. 백엔드 구현 계획

### 4.1 파일 구조

```
src/features/campaigns/
├── backend/
│   ├── route.ts         # Hono 라우터 정의
│   ├── service.ts       # Supabase 조회 로직
│   ├── schema.ts        # Zod 스키마 정의
│   └── error.ts         # 에러 코드 정의
└── lib/
    └── dto.ts           # 프론트엔드 DTO 재노출
```

### 4.2 구현 단계

#### Step 1: 에러 코드 정의 (`backend/error.ts`)

```typescript
export const campaignErrorCodes = {
  notFound: 'CAMPAIGN_NOT_FOUND',
  invalidId: 'INVALID_CAMPAIGN_ID',
  fetchError: 'CAMPAIGN_FETCH_ERROR',
} as const;

export type CampaignServiceError = typeof campaignErrorCodes[keyof typeof campaignErrorCodes];
```

**목적**: 일관된 에러 처리 및 타입 안전성 보장

---

#### Step 2: Zod 스키마 정의 (`backend/schema.ts`)

**2.1 요청 파라미터 스키마**
```typescript
import { z } from 'zod';

export const CampaignIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Campaign ID must be a numeric string'),
});

export type CampaignIdParams = z.infer<typeof CampaignIdParamsSchema>;
```

**2.2 응답 스키마**
```typescript
const CampaignCategorySchema = z.enum(['음식점', '카페', '뷰티', '패션', '생활', '기타']);
const CampaignStatusSchema = z.enum(['모집중', '모집종료', '선정완료']);

export const AdvertiserBasicSchema = z.object({
  id: z.number(),
  business_name: z.string(),
});

export const CampaignDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  recruitment_start_date: z.string(),
  recruitment_end_date: z.string(),
  recruitment_count: z.number(),
  benefits: z.string(),
  mission: z.string(),
  store_name: z.string(),
  store_address: z.string(),
  store_phone: z.string(),
  category: CampaignCategorySchema,
  status: CampaignStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  advertiser: AdvertiserBasicSchema,
});

export const CampaignDetailResponseSchema = z.object({
  campaign: CampaignDetailSchema,
  hasApplied: z.boolean().nullable(),
  isOwner: z.boolean(),
});

export type CampaignDetail = z.infer<typeof CampaignDetailSchema>;
export type CampaignDetailResponse = z.infer<typeof CampaignDetailResponseSchema>;
```

**목적**: 타입 안전성 및 런타임 검증

---

#### Step 3: 서비스 로직 구현 (`backend/service.ts`)

**3.1 체험단 상세 조회**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { campaignErrorCodes, type CampaignServiceError } from './error';
import type { CampaignDetailResponse } from './schema';

export async function getCampaignDetail(
  supabase: SupabaseClient,
  campaignId: number,
  currentUserId?: string,
  currentUserRole?: 'advertiser' | 'influencer' | null
): Promise<HandlerResult<CampaignDetailResponse, CampaignServiceError, unknown>> {
  try {
    // 1. 체험단 상세 정보 조회 (advertiser JOIN)
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        advertiser:advertisers!inner(id, business_name)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaignData) {
      if (campaignError?.code === 'PGRST116') {
        return failure(404, campaignErrorCodes.notFound, '존재하지 않는 체험단입니다');
      }
      throw campaignError;
    }

    // 2. 광고주 본인 여부 확인
    let isOwner = false;
    if (currentUserId && currentUserRole === 'advertiser') {
      const { data: advertiserData } = await supabase
        .from('advertisers')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (advertiserData) {
        isOwner = advertiserData.id === campaignData.advertiser_id;
      }
    }

    // 3. 지원 여부 확인 (로그인한 인플루언서만)
    let hasApplied: boolean | null = null;
    if (currentUserId && currentUserRole === 'influencer') {
      const { data: influencerData } = await supabase
        .from('influencers')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (influencerData) {
        const { data: applicationData } = await supabase
          .from('applications')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('influencer_id', influencerData.id)
          .single();

        hasApplied = !!applicationData;
      }
    }

    // 4. 응답 데이터 구성
    const response: CampaignDetailResponse = {
      campaign: {
        id: campaignData.id,
        title: campaignData.title,
        description: campaignData.description,
        recruitment_start_date: campaignData.recruitment_start_date,
        recruitment_end_date: campaignData.recruitment_end_date,
        recruitment_count: campaignData.recruitment_count,
        benefits: campaignData.benefits,
        mission: campaignData.mission,
        store_name: campaignData.store_name,
        store_address: campaignData.store_address,
        store_phone: campaignData.store_phone,
        category: campaignData.category,
        status: campaignData.status,
        created_at: campaignData.created_at,
        updated_at: campaignData.updated_at,
        advertiser: campaignData.advertiser,
      },
      hasApplied,
      isOwner,
    };

    return success(response);
  } catch (error) {
    return failure(
      500,
      campaignErrorCodes.fetchError,
      '체험단 정보를 불러오는데 실패했습니다',
      error
    );
  }
}
```

**목적**:
- 체험단 정보 조회
- 광고주 정보 JOIN
- 지원 여부 및 소유권 확인
- 에러 핸들링

---

#### Step 4: Hono 라우터 구현 (`backend/route.ts`)

```typescript
import type { Hono } from 'hono';
import { respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { CampaignIdParamsSchema } from './schema';
import { getCampaignDetail } from './service';

export const registerCampaignRoutes = (app: Hono<AppEnv>) => {
  // GET /api/campaigns/:id - 체험단 상세 조회
  app.get('/campaigns/:id', async (c) => {
    const logger = getLogger(c);

    // 1. 파라미터 검증
    const parsedParams = CampaignIdParamsSchema.safeParse({
      id: c.req.param('id'),
    });

    if (!parsedParams.success) {
      logger.warn('Invalid campaign ID parameter', parsedParams.error);
      return respond(
        c,
        {
          ok: false,
          status: 400,
          error: {
            code: 'INVALID_CAMPAIGN_ID',
            message: '유효하지 않은 체험단 ID입니다',
            details: parsedParams.error.format(),
          },
        }
      );
    }

    const campaignId = parseInt(parsedParams.data.id, 10);
    const supabase = getSupabase(c);

    // 2. 현재 사용자 정보 확인 (선택사항)
    const { data: { user } } = await supabase.auth.getUser();
    let currentUserRole: 'advertiser' | 'influencer' | null = null;

    if (user) {
      // 역할 확인 (advertisers 또는 influencers 테이블 조회)
      const { data: advertiserData } = await supabase
        .from('advertisers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (advertiserData) {
        currentUserRole = 'advertiser';
      } else {
        const { data: influencerData } = await supabase
          .from('influencers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (influencerData) {
          currentUserRole = 'influencer';
        }
      }
    }

    // 3. 서비스 로직 실행
    const result = await getCampaignDetail(
      supabase,
      campaignId,
      user?.id,
      currentUserRole
    );

    if (!result.ok) {
      logger.error('Failed to fetch campaign detail', result.error);
    }

    return respond(c, result);
  });
};
```

**목적**:
- 파라미터 검증
- 사용자 인증 정보 확인
- 서비스 로직 호출
- 에러 로깅 및 응답

---

#### Step 5: DTO 재노출 (`lib/dto.ts`)

```typescript
export {
  CampaignDetailSchema,
  CampaignDetailResponseSchema,
  type CampaignDetail,
  type CampaignDetailResponse,
} from '../backend/schema';
```

**목적**: 프론트엔드에서 백엔드 스키마 재사용

---

#### Step 6: Hono 앱에 라우터 등록

**파일**: `src/backend/hono/app.ts`

```typescript
import { registerCampaignRoutes } from '@/features/campaigns/backend/route';

// ... 기존 코드 ...

export function createHonoApp() {
  // ... 기존 미들웨어 ...

  registerExampleRoutes(app);
  registerProfileRoutes(app);
  registerCampaignRoutes(app); // ✅ 추가

  return app;
}
```

---

## 5. 프론트엔드 구현 계획

### 5.1 파일 구조

```
src/features/campaigns/
├── components/
│   ├── campaign-detail-skeleton.tsx   # 로딩 스켈레톤 UI
│   ├── campaign-info-section.tsx      # 체험단 정보 섹션
│   ├── campaign-cta-button.tsx        # CTA 버튼 컴포넌트
│   └── campaign-status-badge.tsx      # 상태 뱃지 컴포넌트
├── hooks/
│   └── useCampaignDetail.ts           # React Query 훅
└── lib/
    └── dto.ts                          # DTO 재노출 (백엔드와 공유)

src/app/campaigns/[id]/
└── page.tsx                            # 체험단 상세 페이지
```

### 5.2 구현 단계

#### Step 1: React Query 훅 구현 (`hooks/useCampaignDetail.ts`)

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CampaignDetailResponse } from '../lib/dto';

export function useCampaignDetail(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data } = await apiClient.get<CampaignDetailResponse>(
        `/api/campaigns/${campaignId}`
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    retry: 3,
  });
}
```

**목적**:
- 체험단 상세 정보 조회
- 캐싱 및 자동 갱신
- 로딩/에러 상태 관리

---

#### Step 2: 상태 뱃지 컴포넌트 (`components/campaign-status-badge.tsx`)

```typescript
'use client';

import { Badge } from '@/components/ui/badge';

type CampaignStatus = '모집중' | '모집종료' | '선정완료';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

const statusConfig: Record<
  CampaignStatus,
  { variant: 'default' | 'secondary' | 'outline'; label: string }
> = {
  모집중: { variant: 'default', label: '모집중' },
  모집종료: { variant: 'secondary', label: '모집종료' },
  선정완료: { variant: 'outline', label: '선정완료' },
};

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

**목적**: 일관된 상태 표시

---

#### Step 3: 체험단 정보 섹션 컴포넌트 (`components/campaign-info-section.tsx`)

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils/date';
import type { CampaignDetail } from '../lib/dto';
import { CampaignStatusBadge } from './campaign-status-badge';

interface CampaignInfoSectionProps {
  campaign: CampaignDetail;
}

export function CampaignInfoSection({ campaign }: CampaignInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {campaign.advertiser.business_name}
        </p>
      </div>

      {/* 모집 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>모집 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">모집 인원</span>
            <span className="font-medium">{campaign.recruitment_count}명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">모집 기간</span>
            <span className="font-medium">
              {formatDate(campaign.recruitment_start_date)} ~{' '}
              {formatDate(campaign.recruitment_end_date)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">카테고리</span>
            <span className="font-medium">{campaign.category}</span>
          </div>
        </CardContent>
      </Card>

      {/* 설명 */}
      <Card>
        <CardHeader>
          <CardTitle>체험단 소개</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{campaign.description}</p>
        </CardContent>
      </Card>

      {/* 제공 혜택 */}
      <Card>
        <CardHeader>
          <CardTitle>제공 혜택</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{campaign.benefits}</p>
        </CardContent>
      </Card>

      {/* 미션 및 요구사항 */}
      <Card>
        <CardHeader>
          <CardTitle>미션 및 요구사항</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{campaign.mission}</p>
        </CardContent>
      </Card>

      {/* 매장 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>매장 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">업체명</span>
            <span className="font-medium">{campaign.store_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">주소</span>
            <span className="font-medium">{campaign.store_address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">전화번호</span>
            <span className="font-medium">{campaign.store_phone}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**목적**: 체험단 상세 정보 시각화

---

#### Step 4: CTA 버튼 컴포넌트 (`components/campaign-cta-button.tsx`)

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { CampaignDetailResponse } from '../lib/dto';

interface CampaignCTAButtonProps {
  campaignId: number;
  campaignStatus: '모집중' | '모집종료' | '선정완료';
  hasApplied: boolean | null;
  isOwner: boolean;
}

export function CampaignCTAButton({
  campaignId,
  campaignStatus,
  hasApplied,
  isOwner,
}: CampaignCTAButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useCurrentUser();

  // 광고주 본인인 경우 버튼 숨김
  if (isOwner) {
    return null;
  }

  // 비로그인 사용자
  if (!isAuthenticated) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push('/login')}
      >
        로그인 후 지원하기
      </Button>
    );
  }

  // 로그인한 사용자
  const profile = user?.profile;

  // 역할이 없거나 프로필 미등록
  if (!user?.role || !user?.hasProfile) {
    const redirectPath =
      user?.role === 'advertiser'
        ? '/onboarding/advertiser'
        : '/onboarding/influencer';

    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push(redirectPath)}
      >
        프로필 등록 후 지원하기
      </Button>
    );
  }

  // 광고주는 지원 불가
  if (user.role === 'advertiser') {
    return null;
  }

  // 이미 지원한 경우
  if (hasApplied) {
    return (
      <Button size="lg" className="w-full" disabled>
        지원 완료
      </Button>
    );
  }

  // 모집 종료 또는 선정 완료
  if (campaignStatus !== '모집중') {
    return (
      <Button size="lg" className="w-full" disabled>
        모집 종료
      </Button>
    );
  }

  // 지원 가능
  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => router.push(`/campaigns/${campaignId}/apply`)}
    >
      지원하기
    </Button>
  );
}
```

**목적**: 사용자 상태에 따른 CTA 버튼 조건부 렌더링

**조건별 버튼 상태**:
1. 비로그인: "로그인 후 지원하기" → `/login`
2. 역할 미선택 또는 프로필 미등록: "프로필 등록 후 지원하기" → `/onboarding/{role}`
3. 광고주: 버튼 숨김
4. 이미 지원: "지원 완료" (비활성화)
5. 모집 종료/선정 완료: "모집 종료" (비활성화)
6. 인플루언서 + 모집중 + 미지원: "지원하기" → `/campaigns/:id/apply`
7. 광고주 본인: 버튼 숨김

---

#### Step 5: 로딩 스켈레톤 UI (`components/campaign-detail-skeleton.tsx`)

```typescript
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CampaignDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      {/* 헤더 스켈레톤 */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>

      {/* 카드 스켈레톤 x 5 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}

      {/* CTA 버튼 스켈레톤 */}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

**목적**: 로딩 중 사용자 경험 개선

---

#### Step 6: 페이지 컴포넌트 (`app/campaigns/[id]/page.tsx`)

```typescript
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaignDetail } from '@/features/campaigns/hooks/useCampaignDetail';
import { CampaignInfoSection } from '@/features/campaigns/components/campaign-info-section';
import { CampaignCTAButton } from '@/features/campaigns/components/campaign-cta-button';
import { CampaignDetailSkeleton } from '@/features/campaigns/components/campaign-detail-skeleton';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const { data, isLoading, error } = useCampaignDetail(id);

  // 로딩 중
  if (isLoading) {
    return <CampaignDetailSkeleton />;
  }

  // 에러 처리
  if (error) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">체험단을 불러올 수 없습니다</h1>
          <p className="text-muted-foreground">
            {error.response?.data?.error?.message || '일시적인 오류가 발생했습니다'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-primary underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!data) {
    return null;
  }

  const { campaign, hasApplied, isOwner } = data;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* 체험단 정보 */}
      <CampaignInfoSection campaign={campaign} />

      {/* CTA 버튼 */}
      <div className="mt-8">
        <CampaignCTAButton
          campaignId={campaign.id}
          campaignStatus={campaign.status}
          hasApplied={hasApplied}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
```

**목적**:
- 체험단 상세 정보 표시
- 로딩/에러 상태 처리
- CTA 버튼 표시

---

## 6. 유틸리티 구현

### 6.1 날짜 포맷팅 유틸리티 (`src/lib/utils/date.ts`)

```typescript
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * ISO 날짜 문자열을 지정된 형식으로 포맷팅합니다.
 */
export function formatDate(
  date: string | Date,
  formatString: string = 'yyyy-MM-dd'
): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, formatString, { locale: ko });
}

/**
 * ISO 날짜 문자열을 "YYYY년 MM월 DD일" 형식으로 포맷팅합니다.
 */
export function formatDateKorean(date: string | Date): string {
  return formatDate(date, 'yyyy년 MM월 dd일');
}
```

**목적**: 일관된 날짜 표시

---

## 7. 추가 구현 필요 사항

### 7.1 shadcn-ui 컴포넌트 추가

**설치 명령어**:
```bash
npx shadcn@latest add badge
npx shadcn@latest add skeleton
```

**설치 후 확인**:
- `src/components/ui/badge.tsx`
- `src/components/ui/skeleton.tsx`

---

## 8. 테스트 시나리오

### 8.1 백엔드 API 테스트

| 테스트 케이스 | 입력 | 기대 결과 |
|--------------|------|----------|
| 정상 조회 (비로그인) | `GET /api/campaigns/1` | 200 OK, `hasApplied: null` |
| 정상 조회 (인플루언서, 미지원) | `GET /api/campaigns/1` (인증) | 200 OK, `hasApplied: false` |
| 정상 조회 (인플루언서, 지원 완료) | `GET /api/campaigns/1` (인증) | 200 OK, `hasApplied: true` |
| 정상 조회 (광고주 본인) | `GET /api/campaigns/1` (인증) | 200 OK, `isOwner: true` |
| 존재하지 않는 ID | `GET /api/campaigns/99999` | 404 Not Found, `CAMPAIGN_NOT_FOUND` |
| 유효하지 않은 ID | `GET /api/campaigns/abc` | 400 Bad Request, `INVALID_CAMPAIGN_ID` |

### 8.2 프론트엔드 UI 테스트

| 테스트 케이스 | 사용자 상태 | 기대 결과 |
|--------------|-----------|----------|
| 비로그인 사용자 | - | "로그인 후 지원하기" 버튼 표시 |
| 인플루언서 (프로필 미등록) | role: null | "프로필 등록 후 지원하기" 버튼 표시 |
| 인플루언서 (지원 가능) | role: influencer, hasApplied: false | "지원하기" 버튼 활성화 |
| 인플루언서 (지원 완료) | role: influencer, hasApplied: true | "지원 완료" 버튼 비활성화 |
| 광고주 (타인 체험단) | role: advertiser, isOwner: false | 버튼 숨김 |
| 광고주 (본인 체험단) | role: advertiser, isOwner: true | 버튼 숨김 |
| 모집 종료 | status: '모집종료' | "모집 종료" 버튼 비활성화 |

---

## 9. 구현 체크리스트

### 9.1 백엔드

- [ ] `src/features/campaigns/backend/error.ts` 작성
- [ ] `src/features/campaigns/backend/schema.ts` 작성
- [ ] `src/features/campaigns/backend/service.ts` 작성
- [ ] `src/features/campaigns/backend/route.ts` 작성
- [ ] `src/features/campaigns/lib/dto.ts` 작성
- [ ] `src/backend/hono/app.ts` 에 라우터 등록
- [ ] API 엔드포인트 수동 테스트 (Postman 또는 curl)

### 9.2 프론트엔드

- [ ] `npx shadcn@latest add badge` 실행
- [ ] `npx shadcn@latest add skeleton` 실행
- [ ] `src/lib/utils/date.ts` 작성
- [ ] `src/features/campaigns/hooks/useCampaignDetail.ts` 작성
- [ ] `src/features/campaigns/components/campaign-status-badge.tsx` 작성
- [ ] `src/features/campaigns/components/campaign-info-section.tsx` 작성
- [ ] `src/features/campaigns/components/campaign-cta-button.tsx` 작성
- [ ] `src/features/campaigns/components/campaign-detail-skeleton.tsx` 작성
- [ ] `src/app/campaigns/[id]/page.tsx` 작성
- [ ] 브라우저 테스트 (다양한 사용자 상태)

### 9.3 통합 테스트

- [ ] 비로그인 상태에서 체험단 상세 조회 가능
- [ ] 인플루언서가 지원하기 버튼 클릭 시 `/campaigns/:id/apply` 로 이동
- [ ] 광고주가 본인 체험단 조회 시 버튼 숨김
- [ ] 모집 종료된 체험단 조회 시 "모집 종료" 버튼 비활성화
- [ ] 존재하지 않는 체험단 조회 시 404 에러 페이지 표시
- [ ] 로딩 중 스켈레톤 UI 표시

---

## 10. 주의사항 및 제약사항

### 10.1 DRY 원칙 준수
- 기존 `ProfileService.getUserProfile` 로직 참고
- 기존 `example/backend/route.ts` 패턴 재사용
- 공통 HTTP 응답 헬퍼(`success`, `failure`, `respond`) 활용

### 10.2 코드베이스 충돌 방지
- `src/features/campaigns/` 폴더에 격리
- 다른 페이지와 독립적으로 개발
- 공통 모듈만 의존 (auth, profile)

### 10.3 타입 안전성
- 모든 API 응답은 Zod 스키마로 검증
- 프론트엔드에서 백엔드 스키마 재사용 (`lib/dto.ts`)
- TypeScript strict 모드 준수

### 10.4 에러 처리
- 모든 에러는 `failure` 헬퍼로 표준화
- 사용자에게 명확한 에러 메시지 표시
- 로그는 서버 사이드에서만 출력

### 10.5 성능 최적화
- React Query 캐싱 활용 (staleTime: 5분)
- 불필요한 API 호출 방지
- 로딩 스켈레톤 UI로 UX 개선

---

## 11. 다음 단계

### 11.1 구현 완료 후
1. ✅ 백엔드 API 엔드포인트 테스트
2. ✅ 프론트엔드 UI 테스트
3. ✅ 통합 테스트
4. ✅ 코드 리뷰 및 리팩토링

### 11.2 연관 페이지 개발
- **5-campaign-apply**: 체험단 지원 페이지 (`/campaigns/:id/apply`)
  - CTA 버튼에서 이동
  - 지원서 작성 폼
- **1-home**: 체험단 리스트 페이지 (`/`)
  - 체험단 카드 클릭 시 상세 페이지로 이동

---

## 12. 참고 문서

- `/docs/prd.md` - 섹션 3.1.4 (체험단 상세)
- `/docs/userflow.md` - 섹션 1.2.2 (체험단 상세 조회)
- `/docs/usecases/3-campaign-browsing/spec.md` - UC-003
- `/docs/database.md` - 섹션 4.3 (campaigns 테이블)
- `/docs/common-modules.md` - 공통 모듈 작업 계획
- `CLAUDE.md` - 프로젝트 개발 가이드라인

---

## 13. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
