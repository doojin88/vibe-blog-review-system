# 체험단 관리 대시보드 구현 계획

## 1. 개요

### 1.1 목적
광고주가 자신이 등록한 체험단을 효율적으로 관리하고, 신규 체험단을 등록하며, 지원한 인플루언서를 확인하여 선정하는 통합 관리 기능을 구현합니다.

### 1.2 범위
- **대시보드 페이지** (`/dashboard`): 체험단 리스트 조회 및 신규 등록
- **체험단 상세 페이지** (`/dashboard/campaigns/:id`): 신청자 관리 및 선정

### 1.3 참고 문서
- PRD: `/docs/prd.md` (섹션 3.3.2, 3.3.3)
- Userflow: `/docs/userflow.md` (섹션 2.2.1, 2.2.2, 2.2.3)
- Usecase: `/docs/usecases/7-campaign-management-dashboard/spec.md`
- Database: `/docs/database.md` (campaigns, applications 테이블)

---

## 2. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Layer                         │
├─────────────────────────────────────────────────────────────┤
│ /dashboard (page.tsx)                                        │
│  ├─ CampaignListSection                                      │
│  │   ├─ CampaignTable (카드/테이블 뷰)                       │
│  │   └─ CampaignStatusFilter                                │
│  └─ CreateCampaignDialog                                     │
│      └─ CampaignForm (react-hook-form + zod)                │
├─────────────────────────────────────────────────────────────┤
│ /dashboard/campaigns/[id] (page.tsx)                        │
│  ├─ CampaignInfoCard                                         │
│  ├─ ApplicantsTable                                          │
│  ├─ CloseRecruitmentButton                                   │
│  └─ SelectInfluencersDialog                                  │
│      └─ ApplicantsSelectList (체크박스)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Backend Layer                          │
├─────────────────────────────────────────────────────────────┤
│ src/features/campaign/backend/                               │
│  ├─ route.ts                                                 │
│  │   ├─ GET    /api/campaigns                               │
│  │   ├─ POST   /api/campaigns                               │
│  │   ├─ GET    /api/campaigns/:id                           │
│  │   ├─ GET    /api/campaigns/:id/applications              │
│  │   ├─ PATCH  /api/campaigns/:id/status                    │
│  │   └─ PATCH  /api/applications/bulk                       │
│  ├─ service.ts                                               │
│  ├─ schema.ts                                                │
│  └─ error.ts                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Database Layer                         │
├─────────────────────────────────────────────────────────────┤
│ campaigns (체험단)                                           │
│  - 광고주별 조회                                             │
│  - 상태 업데이트 (모집중 → 모집종료 → 선정완료)             │
├─────────────────────────────────────────────────────────────┤
│ applications (지원서)                                        │
│  - 체험단별 신청자 조회                                      │
│  - 일괄 상태 업데이트 (선정/반려)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 단계별 구현 계획

### Phase 1: 백엔드 API 구현

#### 3.1.1 Schema 정의 (`src/features/campaign/backend/schema.ts`)

**목적**: 요청/응답 데이터 검증 및 타입 정의

**구현 내용**:

```typescript
// 요청 스키마
export const CreateCampaignSchema = z.object({
  title: z.string().min(5, '체험단명은 5자 이상이어야 합니다').max(100),
  description: z.string().min(20, '설명은 20자 이상이어야 합니다').max(2000),
  recruitment_start_date: z.string().refine((date) => {
    return new Date(date) > new Date(); // 오늘 이후
  }, '모집 시작일은 오늘 이후여야 합니다'),
  recruitment_end_date: z.string(),
  recruitment_count: z.number().min(1, '모집 인원은 1명 이상이어야 합니다'),
  benefits: z.string().min(1, '제공 혜택을 입력해주세요'),
  mission: z.string().min(1, '미션을 입력해주세요'),
  store_name: z.string().min(1),
  store_address: z.string().min(1),
  store_phone: z.string().min(1),
  category: z.enum(['음식점', '카페', '뷰티', '패션', '생활', '기타']),
}).refine((data) => {
  return new Date(data.recruitment_end_date) >= new Date(data.recruitment_start_date);
}, {
  message: '모집 종료일은 시작일 이후여야 합니다',
  path: ['recruitment_end_date'],
});

export const UpdateCampaignStatusSchema = z.object({
  status: z.enum(['모집중', '모집종료', '선정완료']),
});

export const BulkUpdateApplicationsSchema = z.object({
  campaign_id: z.number(),
  selected_application_ids: z.array(z.number()).min(1, '최소 1명 이상 선정해주세요'),
});

export const CampaignQuerySchema = z.object({
  advertiser_id: z.string().optional(),
  status: z.enum(['모집중', '모집종료', '선정완료']).optional(),
  sort: z.enum(['latest', 'oldest']).optional().default('latest'),
});

// 응답 스키마
export const CampaignResponseSchema = z.object({
  id: z.number(),
  advertiser_id: z.number(),
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
  category: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  applicants_count: z.number().optional(), // 신청자 수
});

export const ApplicationResponseSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  influencer_id: z.number(),
  message: z.string(),
  visit_date: z.string(),
  status: z.string(),
  applied_at: z.string(),
  influencer: z.object({
    id: z.number(),
    name: z.string(),
    channel_name: z.string(),
    channel_link: z.string(),
    followers_count: z.number(),
  }),
});
```

**기존 코드와의 통합**:
- Zod 스키마 패턴은 `src/features/example/backend/schema.ts`와 동일
- 모든 스키마는 export하여 프론트엔드에서 재사용 가능

---

#### 3.1.2 Error 코드 정의 (`src/features/campaign/backend/error.ts`)

**목적**: 상황별 에러 코드 표준화

**구현 내용**:

```typescript
export const CampaignErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  RECRUITMENT_COUNT_EXCEEDED: 'RECRUITMENT_COUNT_EXCEEDED',
  NO_APPLICANTS: 'NO_APPLICANTS',
  ALREADY_SELECTED: 'ALREADY_SELECTED',
  DB_ERROR: 'DB_ERROR',
} as const;

export type CampaignServiceError = typeof CampaignErrorCodes[keyof typeof CampaignErrorCodes];
```

**기존 코드와의 통합**:
- `src/features/example/backend/error.ts` 패턴 동일
- `ProfileErrorCodes`와 같은 형식

---

#### 3.1.3 Service Layer (`src/features/campaign/backend/service.ts`)

**목적**: Supabase 접근 및 비즈니스 로직 구현

**주요 함수**:

1. **getCampaignsByAdvertiser**: 광고주의 체험단 리스트 조회
   ```typescript
   export async function getCampaignsByAdvertiser(
     supabase: SupabaseClient,
     advertiserId: number,
     filters?: { status?: string; sort?: string }
   ): Promise<HandlerResult<Campaign[], CampaignServiceError, unknown>>
   ```
   - `campaigns` 테이블 조회 (WHERE advertiser_id = ?)
   - 신청자 수 계산 (JOIN applications, COUNT)
   - 정렬 적용 (created_at DESC/ASC)
   - 필터 적용 (status)

2. **createCampaign**: 신규 체험단 등록
   ```typescript
   export async function createCampaign(
     supabase: SupabaseClient,
     advertiserId: number,
     data: CreateCampaignInput
   ): Promise<HandlerResult<Campaign, CampaignServiceError, unknown>>
   ```
   - `campaigns` 테이블에 INSERT
   - 초기 상태: '모집중'
   - 생성 시각 자동 기록

3. **getCampaignById**: 체험단 상세 조회
   ```typescript
   export async function getCampaignById(
     supabase: SupabaseClient,
     campaignId: number
   ): Promise<HandlerResult<Campaign, CampaignServiceError, unknown>>
   ```
   - `campaigns` 테이블 조회 (WHERE id = ?)
   - 광고주 정보 JOIN

4. **getApplicationsByCampaign**: 신청자 리스트 조회
   ```typescript
   export async function getApplicationsByCampaign(
     supabase: SupabaseClient,
     campaignId: number
   ): Promise<HandlerResult<Application[], CampaignServiceError, unknown>>
   ```
   - `applications` 테이블 조회 (WHERE campaign_id = ?)
   - `influencers` 테이블 JOIN
   - 정렬: applied_at DESC

5. **updateCampaignStatus**: 모집 상태 변경
   ```typescript
   export async function updateCampaignStatus(
     supabase: SupabaseClient,
     campaignId: number,
     advertiserId: number,
     status: string
   ): Promise<HandlerResult<Campaign, CampaignServiceError, unknown>>
   ```
   - 소유권 확인 (advertiser_id = ?)
   - 상태 전환 유효성 검증 (모집중 → 모집종료만 허용)
   - `campaigns` 테이블 UPDATE

6. **bulkUpdateApplications**: 인플루언서 선정 (일괄 처리)
   ```typescript
   export async function bulkUpdateApplications(
     supabase: SupabaseClient,
     campaignId: number,
     advertiserId: number,
     selectedIds: number[]
   ): Promise<HandlerResult<{ selectedCount: number; rejectedCount: number }, CampaignServiceError, unknown>>
   ```
   - 소유권 확인
   - 체험단 상태 확인 (모집종료만 허용)
   - 모집 인원 제한 검증
   - 트랜잭션 처리:
     1. 선정: UPDATE applications SET status = '선정' WHERE id IN (...)
     2. 반려: UPDATE applications SET status = '반려' WHERE campaign_id = ? AND status = '신청완료'
     3. 체험단 상태 변경: UPDATE campaigns SET status = '선정완료'

**에러 처리**:
- 각 함수는 `HandlerResult` 반환
- 성공: `success(data)`
- 실패: `failure(status, code, message, details?)`

**기존 코드와의 통합**:
- `src/features/example/backend/service.ts` 패턴 동일
- `src/features/profile/backend/service.ts`의 getUserProfile과 유사한 구조

---

#### 3.1.4 Route 정의 (`src/features/campaign/backend/route.ts`)

**목적**: Hono 라우터 정의 및 미들웨어 통합

**구현 내용**:

```typescript
import { Hono } from "hono";
import type { AppContext } from "@/backend/hono/context";
import { success, failure, respond } from "@/backend/http/response";
import { CampaignErrorCodes } from "./error";
import {
  getCampaignsByAdvertiser,
  createCampaign,
  getCampaignById,
  getApplicationsByCampaign,
  updateCampaignStatus,
  bulkUpdateApplications,
} from "./service";
import {
  CreateCampaignSchema,
  UpdateCampaignStatusSchema,
  BulkUpdateApplicationsSchema,
  CampaignQuerySchema,
} from "./schema";

const app = new Hono<AppContext>();

/**
 * GET /api/campaigns
 * 광고주의 체험단 리스트 조회
 */
app.get("/", async (c) => {
  try {
    const supabase = c.get("supabase");
    const logger = c.get("logger");

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, "로그인이 필요합니다"));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from("advertisers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, "광고주 정보가 없습니다"));
    }

    // Parse query params
    const query = c.req.query();
    const parsedQuery = CampaignQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      return respond(
        c,
        failure(400, "INVALID_QUERY", "잘못된 쿼리 파라미터입니다", parsedQuery.error.format())
      );
    }

    // Get campaigns
    const result = await getCampaignsByAdvertiser(
      supabase,
      advertiser.id,
      parsedQuery.data
    );

    return respond(c, result);
  } catch (error) {
    c.get("logger").error("Failed to get campaigns", error);
    return respond(c, failure(500, "INTERNAL_ERROR", "체험단 목록 조회에 실패했습니다"));
  }
});

/**
 * POST /api/campaigns
 * 신규 체험단 등록
 */
app.post("/", async (c) => {
  try {
    const supabase = c.get("supabase");

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, "로그인이 필요합니다"));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from("advertisers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, "광고주 정보가 없습니다"));
    }

    // Parse request body
    const body = await c.req.json();
    const parsedBody = CreateCampaignSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(400, "INVALID_REQUEST", "입력 데이터가 올바르지 않습니다", parsedBody.error.format())
      );
    }

    // Create campaign
    const result = await createCampaign(supabase, advertiser.id, parsedBody.data);

    if (!result.ok) {
      return respond(c, result);
    }

    return respond(c, success(result.data, 201));
  } catch (error) {
    c.get("logger").error("Failed to create campaign", error);
    return respond(c, failure(500, "INTERNAL_ERROR", "체험단 등록에 실패했습니다"));
  }
});

/**
 * GET /api/campaigns/:id
 * 체험단 상세 조회
 */
app.get("/:id", async (c) => {
  try {
    const supabase = c.get("supabase");
    const campaignId = Number(c.req.param("id"));

    if (isNaN(campaignId)) {
      return respond(c, failure(400, "INVALID_PARAM", "잘못된 체험단 ID입니다"));
    }

    const result = await getCampaignById(supabase, campaignId);

    return respond(c, result);
  } catch (error) {
    c.get("logger").error("Failed to get campaign", error);
    return respond(c, failure(500, "INTERNAL_ERROR", "체험단 조회에 실패했습니다"));
  }
});

/**
 * GET /api/campaigns/:id/applications
 * 체험단 신청자 리스트 조회
 */
app.get("/:id/applications", async (c) => {
  try {
    const supabase = c.get("supabase");
    const campaignId = Number(c.req.param("id"));

    if (isNaN(campaignId)) {
      return respond(c, failure(400, "INVALID_PARAM", "잘못된 체험단 ID입니다"));
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, "로그인이 필요합니다"));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from("advertisers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, "광고주 정보가 없습니다"));
    }

    // Verify ownership
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("advertiser_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return respond(c, failure(404, CampaignErrorCodes.CAMPAIGN_NOT_FOUND, "체험단을 찾을 수 없습니다"));
    }

    if (campaign.advertiser_id !== advertiser.id) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, "접근 권한이 없습니다"));
    }

    // Get applications
    const result = await getApplicationsByCampaign(supabase, campaignId);

    return respond(c, result);
  } catch (error) {
    c.get("logger").error("Failed to get applications", error);
    return respond(c, failure(500, "INTERNAL_ERROR", "신청자 목록 조회에 실패했습니다"));
  }
});

/**
 * PATCH /api/campaigns/:id/status
 * 모집 상태 변경 (조기 종료)
 */
app.patch("/:id/status", async (c) => {
  try {
    const supabase = c.get("supabase");
    const campaignId = Number(c.req.param("id"));

    if (isNaN(campaignId)) {
      return respond(c, failure(400, "INVALID_PARAM", "잘못된 체험단 ID입니다"));
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, "로그인이 필요합니다"));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from("advertisers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, "광고주 정보가 없습니다"));
    }

    // Parse request body
    const body = await c.req.json();
    const parsedBody = UpdateCampaignStatusSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(400, "INVALID_REQUEST", "입력 데이터가 올바르지 않습니다", parsedBody.error.format())
      );
    }

    // Update status
    const result = await updateCampaignStatus(
      supabase,
      campaignId,
      advertiser.id,
      parsedBody.data.status
    );

    return respond(c, result);
  } catch (error) {
    c.get("logger").error("Failed to update campaign status", error);
    return respond(c, failure(500, "INTERNAL_ERROR", "상태 변경에 실패했습니다"));
  }
});

/**
 * PATCH /api/applications/bulk
 * 인플루언서 선정 (일괄 업데이트)
 */
app.patch("/applications/bulk", async (c) => {
  try {
    const supabase = c.get("supabase");

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, "로그인이 필요합니다"));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from("advertisers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, "광고주 정보가 없습니다"));
    }

    // Parse request body
    const body = await c.req.json();
    const parsedBody = BulkUpdateApplicationsSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(400, "INVALID_REQUEST", "입력 데이터가 올바르지 않습니다", parsedBody.error.format())
      );
    }

    // Bulk update
    const result = await bulkUpdateApplications(
      supabase,
      parsedBody.data.campaign_id,
      advertiser.id,
      parsedBody.data.selected_application_ids
    );

    return respond(c, result);
  } catch (error) {
    c.get("logger").error("Failed to bulk update applications", error);
    return respond(c, failure(500, "INTERNAL_ERROR", "선정 처리에 실패했습니다"));
  }
});

export default app;
```

**기존 코드와의 통합**:
- `src/features/profile/backend/route.ts`와 동일한 패턴 (Hono 앱 인스턴스 생성 및 export)
- `src/backend/hono/app.ts`에 라우터 등록:
  ```typescript
  import campaignRoutes from '@/features/campaign/backend/route';
  app.route('/api/campaigns', campaignRoutes);
  ```

---

### Phase 2: 프론트엔드 컴포넌트 구현

#### 3.2.1 대시보드 페이지 (`src/app/dashboard/page.tsx`)

**목적**: 체험단 리스트 조회 및 신규 등록 UI

**구현 내용**:

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { CampaignListSection } from '@/features/campaign/components/CampaignListSection';
import { CreateCampaignDialog } from '@/features/campaign/components/CreateCampaignDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated } = useCurrentUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <div>로그인이 필요합니다...</div>; // 또는 redirect
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">체험단 관리 대시보드</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          신규 체험단 등록
        </Button>
      </div>

      <CampaignListSection />

      <CreateCampaignDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
```

**접근 제어**:
- Middleware에서 광고주 역할 확인 (추천)
- 또는 페이지 컴포넌트에서 `useCurrentUser` 훅으로 역할 확인

**기존 코드와의 통합**:
- `useCurrentUser` 훅 활용
- Next.js App Router의 Client Component 패턴 준수

---

#### 3.2.2 CampaignListSection 컴포넌트

**목적**: 체험단 리스트 표시 및 필터링

**구현 내용**:

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { CampaignTable } from './CampaignTable';
import { CampaignStatusFilter } from './CampaignStatusFilter';
import { Skeleton } from '@/components/ui/skeleton';

type CampaignStatus = '모집중' | '모집종료' | '선정완료' | '전체';

export function CampaignListSection() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus>('전체');

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', { status: statusFilter === '전체' ? undefined : statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== '전체') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/api/campaigns?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">체험단 목록을 불러오는데 실패했습니다</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          재시도
        </Button>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">등록된 체험단이 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      <CampaignStatusFilter value={statusFilter} onChange={setStatusFilter} />
      <CampaignTable campaigns={campaigns} />
    </div>
  );
}
```

**기존 코드와의 통합**:
- React Query의 `useQuery` 훅 활용
- `apiClient` 사용 (`src/lib/remote/api-client.ts`)
- shadcn-ui 컴포넌트 활용

---

#### 3.2.3 CampaignTable 컴포넌트

**목적**: 체험단 리스트 테이블 렌더링

**구현 내용**:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type Campaign = {
  id: number;
  title: string;
  status: string;
  recruitment_count: number;
  applicants_count: number;
  created_at: string;
};

type Props = {
  campaigns: Campaign[];
};

export function CampaignTable({ campaigns }: Props) {
  const router = useRouter();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case '모집중':
        return 'default'; // 파란색
      case '모집종료':
        return 'secondary'; // 노란색
      case '선정완료':
        return 'success'; // 초록색
      default:
        return 'outline';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>체험단명</TableHead>
          <TableHead>모집 상태</TableHead>
          <TableHead>신청자 수</TableHead>
          <TableHead>모집 인원</TableHead>
          <TableHead>생성일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow
            key={campaign.id}
            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
            className="cursor-pointer hover:bg-gray-50"
          >
            <TableCell className="font-medium">{campaign.title}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(campaign.status)}>
                {campaign.status}
              </Badge>
            </TableCell>
            <TableCell>{campaign.applicants_count || 0}명</TableCell>
            <TableCell>{campaign.recruitment_count}명</TableCell>
            <TableCell>
              {format(new Date(campaign.created_at), 'PPP', { locale: ko })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**추가 패키지 필요**:
```bash
npm install date-fns
```

**기존 코드와의 통합**:
- shadcn-ui `Table`, `Badge` 컴포넌트 활용
- date-fns로 날짜 포맷팅 (프로젝트 가이드라인)

---

#### 3.2.4 CreateCampaignDialog 컴포넌트

**목적**: 신규 체험단 등록 Dialog

**구현 내용**:

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { CreateCampaignSchema } from '@/features/campaign/lib/dto';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCampaignSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateCampaignDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [isConfirmClose, setIsConfirmClose] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCampaignSchema),
    defaultValues: {
      title: '',
      description: '',
      recruitment_start_date: '',
      recruitment_end_date: '',
      recruitment_count: 1,
      benefits: '',
      mission: '',
      store_name: '',
      store_address: '',
      store_phone: '',
      category: '음식점',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiClient.post('/api/campaigns', data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '체험단이 등록되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: '체험단 등록에 실패했습니다',
        description: error.response?.data?.error?.message || '다시 시도해주세요',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && form.formState.isDirty) {
      // 작성 중인 내용이 있으면 확인
      if (confirm('작성 중인 내용이 있습니다. 정말 닫으시겠습니까?')) {
        form.reset();
        onOpenChange(false);
      }
    } else {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>신규 체험단 등록</DialogTitle>
          <DialogDescription>
            체험단 정보를 입력하고 등록하세요.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 체험단명 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>체험단명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 강남 맛집 체험단" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 설명 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="체험단에 대한 상세 설명을 입력하세요"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 모집 기간 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recruitment_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>모집 시작일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recruitment_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>모집 종료일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 모집 인원 */}
            <FormField
              control={form.control}
              name="recruitment_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>모집 인원 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 제공 혜택 */}
            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제공 혜택 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="예: 무료 식사 제공"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 미션 */}
            <FormField
              control={form.control}
              name="mission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>미션 및 요구사항 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="예: 방문 후 블로그 리뷰 작성"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 매장 정보 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">매장 정보</h3>

              <FormField
                control={form.control}
                name="store_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>업체명 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="store_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="store_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 카테고리 */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="음식점">음식점</SelectItem>
                      <SelectItem value="카페">카페</SelectItem>
                      <SelectItem value="뷰티">뷰티</SelectItem>
                      <SelectItem value="패션">패션</SelectItem>
                      <SelectItem value="생활">생활</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**기존 코드와의 통합**:
- react-hook-form + zod (프로젝트 가이드라인)
- shadcn-ui Form 컴포넌트 활용
- React Query의 `useMutation` 및 캐시 무효화

---

#### 3.2.5 체험단 상세 페이지 (`src/app/dashboard/campaigns/[id]/page.tsx`)

**목적**: 체험단 정보 및 신청자 리스트 표시

**구현 내용**:

```typescript
'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { CampaignInfoCard } from '@/features/campaign/components/CampaignInfoCard';
import { ApplicantsTable } from '@/features/campaign/components/ApplicantsTable';
import { CloseRecruitmentButton } from '@/features/campaign/components/CloseRecruitmentButton';
import { SelectInfluencersDialog } from '@/features/campaign/components/SelectInfluencersDialog';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  params: Promise<{ id: string }>;
};

export default function CampaignDetailPage({ params }: Props) {
  const { id } = use(params);
  const campaignId = Number(id);

  const { data: campaignData, isLoading: isCampaignLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/campaigns/${campaignId}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: applicantsData, isLoading: isApplicantsLoading } = useQuery({
    queryKey: ['campaign-applications', campaignId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/campaigns/${campaignId}/applications`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isCampaignLoading || isApplicantsLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  const campaign = campaignData?.campaign;
  const applications = applicantsData?.applications || [];

  if (!campaign) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-red-500">체험단을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">{campaign.title}</h1>

        {/* 상태별 액션 버튼 */}
        <div className="flex gap-2">
          {campaign.status === '모집중' && (
            <CloseRecruitmentButton campaignId={campaignId} />
          )}
          {campaign.status === '모집종료' && applications.length > 0 && (
            <SelectInfluencersDialog
              campaignId={campaignId}
              recruitmentCount={campaign.recruitment_count}
              applications={applications}
            />
          )}
        </div>
      </div>

      <CampaignInfoCard campaign={campaign} />

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">신청자 리스트</h2>
        {applications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            아직 지원한 인플루언서가 없습니다
          </div>
        ) : (
          <ApplicantsTable applications={applications} />
        )}
      </div>
    </div>
  );
}
```

**기존 코드와의 통합**:
- Next.js 15의 async params 패턴 사용 (`use(params)`)
- React Query로 병렬 데이터 로딩

---

#### 3.2.6 SelectInfluencersDialog 컴포넌트

**목적**: 인플루언서 선정 Dialog

**구현 내용**:

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { UserCheck } from 'lucide-react';

type Application = {
  id: number;
  message: string;
  visit_date: string;
  influencer: {
    id: number;
    name: string;
    channel_name: string;
    followers_count: number;
  };
};

type Props = {
  campaignId: number;
  recruitmentCount: number;
  applications: Application[];
};

export function SelectInfluencersDialog({
  campaignId,
  recruitmentCount,
  applications,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const selectMutation = useMutation({
    mutationFn: async (selectedApplicationIds: number[]) => {
      const response = await apiClient.patch('/api/applications/bulk', {
        campaign_id: campaignId,
        selected_application_ids: selectedApplicationIds,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '인플루언서 선정이 완료되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-applications', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setOpen(false);
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast({
        title: '선정 처리에 실패했습니다',
        description: error.response?.data?.error?.message || '다시 시도해주세요',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (applicationId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(applicationId)) {
        return prev.filter((id) => id !== applicationId);
      }
      // 모집 인원 초과 방지
      if (prev.length >= recruitmentCount) {
        toast({
          title: `최대 ${recruitmentCount}명까지 선정할 수 있습니다`,
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, applicationId];
    });
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast({
        title: '최소 1명 이상 선정해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (selectedIds.length > recruitmentCount) {
      toast({
        title: `최대 ${recruitmentCount}명까지 선정할 수 있습니다`,
        variant: 'destructive',
      });
      return;
    }

    selectMutation.mutate(selectedIds);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserCheck className="mr-2 h-4 w-4" />
          체험단 선정
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>체험단 선정</DialogTitle>
          <DialogDescription>
            선정할 인플루언서를 선택하세요 ({selectedIds.length}/{recruitmentCount}명 선정)
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">선택</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>SNS 채널명</TableHead>
              <TableHead>팔로워 수</TableHead>
              <TableHead>각오 한마디</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(app.id)}
                    onCheckedChange={() => handleToggle(app.id)}
                    disabled={
                      !selectedIds.includes(app.id) &&
                      selectedIds.length >= recruitmentCount
                    }
                  />
                </TableCell>
                <TableCell>{app.influencer.name}</TableCell>
                <TableCell>{app.influencer.channel_name}</TableCell>
                <TableCell>{app.influencer.followers_count.toLocaleString()}명</TableCell>
                <TableCell className="max-w-xs truncate">{app.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectMutation.isPending || selectedIds.length === 0}
          >
            {selectMutation.isPending ? '처리 중...' : '선정 완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**기존 코드와의 통합**:
- shadcn-ui Dialog, Checkbox, Table 컴포넌트 활용
- React Query의 `useMutation` 및 다중 캐시 무효화

---

### Phase 3: DTO 및 타입 정의

#### 3.3.1 DTO 재노출 (`src/features/campaign/lib/dto.ts`)

**목적**: 백엔드 스키마를 프론트엔드에서 재사용

**구현 내용**:

```typescript
// 백엔드 스키마를 프론트엔드에서 재사용
export {
  CreateCampaignSchema,
  UpdateCampaignStatusSchema,
  BulkUpdateApplicationsSchema,
  CampaignResponseSchema,
  ApplicationResponseSchema,
} from '@/features/campaign/backend/schema';

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type Campaign = z.infer<typeof CampaignResponseSchema>;
export type Application = z.infer<typeof ApplicationResponseSchema>;
```

**기존 코드와의 통합**:
- `src/features/profile/lib/dto.ts` 패턴 동일

---

## 4. 상태 관리 전략

### 4.1 서버 상태 (React Query)

**캐시 키 구조**:
```typescript
['campaigns'] // 전체 리스트
['campaigns', { status: '모집중' }] // 필터 적용
['campaign', campaignId] // 특정 체험단 상세
['campaign-applications', campaignId] // 특정 체험단 신청자
```

**캐시 무효화 전략**:
- 체험단 생성 → `['campaigns']` 무효화
- 모집 상태 변경 → `['campaign', id]`, `['campaigns']` 무효화
- 인플루언서 선정 → `['campaign', id]`, `['campaign-applications', id]`, `['campaigns']` 무효화

**staleTime 설정**: 5분 (공통 모듈 계획에 따름)

### 4.2 클라이언트 상태 (React State)

**로컬 상태**:
- Dialog 열림/닫힘 (`useState`)
- 필터 상태 (`useState`)
- 체크박스 선택 상태 (`useState`)

**전역 상태 (Zustand)**: 필요 없음 (현재 페이지에서는 불필요)

---

## 5. 접근 제어 및 권한 관리

### 5.1 Middleware 기반 접근 제어 (권장)

**구현 위치**: `src/middleware.ts` (또는 별도 미들웨어)

**검증 항목**:
1. 로그인 여부 확인 (Supabase Auth)
2. 광고주 역할 확인 (`advertisers` 테이블 조회)
3. 광고주 정보 등록 여부 확인

**리다이렉트**:
- 비로그인 → `/login?redirect=/dashboard`
- 광고주 정보 미등록 → `/onboarding/advertiser`
- 인플루언서 계정 → `/` (홈) + 에러 메시지

### 5.2 API 레벨 권한 검증

**각 API 엔드포인트에서 검증**:
1. 사용자 인증 확인 (`supabase.auth.getUser()`)
2. 광고주 프로필 조회 (`advertisers` 테이블)
3. 소유권 확인 (`campaigns.advertiser_id = current_advertiser_id`)

**에러 응답**:
- 401: 비로그인
- 403: 권한 없음 (광고주 아님, 다른 광고주의 체험단)
- 404: 리소스 없음

---

## 6. 에러 처리 전략

### 6.1 백엔드 에러

**에러 코드 정의** (`error.ts`):
- `UNAUTHORIZED`: 비로그인
- `FORBIDDEN`: 권한 없음
- `CAMPAIGN_NOT_FOUND`: 체험단 없음
- `INVALID_STATUS_TRANSITION`: 잘못된 상태 전환
- `RECRUITMENT_COUNT_EXCEEDED`: 모집 인원 초과
- `NO_APPLICANTS`: 신청자 없음
- `ALREADY_SELECTED`: 이미 선정 완료
- `DB_ERROR`: 데이터베이스 오류

**에러 응답 형식**:
```json
{
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "체험단을 찾을 수 없습니다",
    "details": {}
  }
}
```

### 6.2 프론트엔드 에러

**React Query 에러 처리**:
- `onError` 콜백에서 toast 메시지 표시
- 재시도 버튼 제공
- 명확한 에러 메시지 표시

**유효성 검증 에러**:
- react-hook-form의 인라인 에러 메시지
- Zod 에러 포맷팅

**네트워크 에러**:
- React Query의 자동 재시도 (최대 3회)
- 실패 시 에러 메시지 + 재시도 버튼

---

## 7. 테스트 계획

### 7.1 수동 테스트 시나리오

#### 시나리오 1: 체험단 등록
1. 대시보드 접근
2. "신규 체험단 등록" 버튼 클릭
3. 필수 필드 입력
4. 제출
5. 리스트에 새 체험단 표시 확인

#### 시나리오 2: 모집 조기 종료
1. 체험단 상세 페이지 접근 (모집중 상태)
2. "모집 조기 종료" 버튼 클릭
3. 확인 모달에서 "확인" 클릭
4. 상태가 "모집종료"로 변경 확인
5. "체험단 선정" 버튼 표시 확인

#### 시나리오 3: 인플루언서 선정
1. 체험단 상세 페이지 접근 (모집종료 상태)
2. "체험단 선정" 버튼 클릭
3. 신청자 중 3명 선택
4. "선정 완료" 버튼 클릭
5. 상태가 "선정완료"로 변경 확인
6. 신청자 리스트에 선정/반려 뱃지 표시 확인

### 7.2 엣지케이스 테스트

| 케이스 | 기대 결과 |
|--------|----------|
| 비로그인 상태에서 대시보드 접근 | `/login`으로 리다이렉트 |
| 인플루언서가 대시보드 접근 | 에러 메시지 + 홈으로 리다이렉트 |
| 다른 광고주의 체험단 접근 | 403 에러 |
| 신규 등록 시 종료일 < 시작일 | 유효성 검증 에러 |
| 선정 시 모집 인원 초과 | 에러 메시지 + 제출 불가 |
| 선정 시 0명 선택 | 에러 메시지 + 제출 불가 |
| 신청자 없는 상태에서 선정 버튼 | 버튼 비활성화 또는 숨김 |

---

## 8. 성능 최적화

### 8.1 React Query 캐싱
- staleTime: 5분
- 불필요한 API 요청 최소화
- 캐시 무효화 전략으로 데이터 일관성 유지

### 8.2 코드 스플리팅
- Next.js 동적 import 활용 (필요시)
- Dialog 컴포넌트 lazy loading (선택사항)

### 8.3 데이터베이스 쿼리 최적화
- 인덱스 활용:
  - `campaigns.advertiser_id`
  - `campaigns.status`
  - `campaigns(status, created_at DESC)` (복합 인덱스)
  - `applications.campaign_id`
  - `applications.influencer_id`
- JOIN 최적화: 필요한 컬럼만 SELECT

---

## 9. 배포 전 체크리스트

### 9.1 백엔드
- [ ] Schema 정의 완료 (schema.ts)
- [ ] Error 코드 정의 완료 (error.ts)
- [ ] Service 함수 구현 완료 (service.ts)
- [ ] Route 정의 완료 (route.ts)
- [ ] Hono 앱에 라우터 등록 (app.ts)

### 9.2 프론트엔드
- [ ] 대시보드 페이지 구현 (page.tsx)
- [ ] 체험단 상세 페이지 구현 ([id]/page.tsx)
- [ ] CreateCampaignDialog 구현
- [ ] SelectInfluencersDialog 구현
- [ ] CampaignTable 구현
- [ ] ApplicantsTable 구현
- [ ] DTO 재노출 (dto.ts)

### 9.3 접근 제어
- [ ] Middleware 구현 (또는 페이지 레벨 검증)
- [ ] API 레벨 권한 검증
- [ ] 에러 핸들링

### 9.4 테스트
- [ ] 수동 테스트 시나리오 통과
- [ ] 엣지케이스 테스트 통과
- [ ] 네트워크 오류 시나리오 테스트

### 9.5 UI/UX
- [ ] 반응형 디자인 확인 (모바일/태블릿/데스크톱)
- [ ] 로딩 상태 표시 (Skeleton UI)
- [ ] 에러 메시지 표시
- [ ] 빈 상태 메시지 표시
- [ ] 토스트 메시지 동작 확인

---

## 10. 추가 구현 필요 사항

### 10.1 shadcn-ui 컴포넌트 설치

**필요한 컴포넌트**:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add form
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add skeleton
```

### 10.2 추가 패키지 설치

```bash
npm install date-fns
npm install @hookform/resolvers
```

### 10.3 공통 모듈 확인

**Phase 1에서 구현되어야 할 공통 모듈**:
- [x] Hono 앱 구성
- [x] 공통 미들웨어
- [x] HTTP 응답 헬퍼
- [x] Supabase 클라이언트
- [x] API 클라이언트
- [ ] 데이터베이스 마이그레이션 (campaigns, applications 테이블)

---

## 11. 참고 사항

### 11.1 기존 코드 패턴

**라우터 패턴**:
- `src/features/example/backend/route.ts`: 함수 기반 라우터 등록
- `src/features/profile/backend/route.ts`: Hono 앱 인스턴스 export

**본 구현에서는 profile 패턴 사용 (Hono 앱 인스턴스 export)**

### 11.2 Hono 앱 통합

`src/backend/hono/app.ts`에 라우터 등록:

```typescript
import campaignRoutes from '@/features/campaign/backend/route';

// ...

app.route('/api/campaigns', campaignRoutes);
```

### 11.3 트랜잭션 처리

**Supabase 트랜잭션**:
- Supabase는 기본적으로 트랜잭션을 지원하지 않음
- 대안:
  1. 여러 UPDATE 쿼리를 순차 실행
  2. 에러 발생 시 수동 롤백 (이전 상태로 복구)
  3. 또는 PostgreSQL의 트랜잭션 사용 (Supabase Raw SQL)

**권장 방식**: 순차 실행 후 에러 발생 시 롤백

---

## 12. 구현 우선순위

### P0 (MVP 필수)
1. ✅ Schema 정의 (schema.ts)
2. ✅ Error 코드 정의 (error.ts)
3. ✅ Service Layer (service.ts)
4. ✅ Route 정의 (route.ts)
5. ✅ 대시보드 페이지 (page.tsx)
6. ✅ 체험단 상세 페이지 ([id]/page.tsx)
7. ✅ CreateCampaignDialog
8. ✅ SelectInfluencersDialog
9. ✅ CampaignTable
10. ✅ ApplicantsTable

### P1 (2차 개발)
- 체험단 수정 기능 (PATCH /api/campaigns/:id)
- 체험단 삭제 기능 (DELETE /api/campaigns/:id)
- 필터 고도화 (카테고리, 날짜 범위 등)
- 신청자 상세 정보 모달

### P2 (추후 고려)
- 이미지 업로드 (체험단 썸네일)
- 선정 결과 알림 (이메일, 푸시)
- 통계 대시보드 (신청자 수 추이 등)
- 체험단 복제 기능

---

## 13. 예상 작업 시간

| 단계 | 예상 시간 |
|------|----------|
| Phase 1: 백엔드 API 구현 | 4-6시간 |
| Phase 2: 프론트엔드 컴포넌트 구현 | 6-8시간 |
| Phase 3: DTO 및 타입 정의 | 1시간 |
| 접근 제어 및 권한 관리 | 2시간 |
| 에러 처리 및 테스트 | 2-3시간 |
| UI/UX 개선 및 디버깅 | 2-3시간 |
| **총 예상 시간** | **17-23시간** |

---

## 14. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0  | 2025-11-14 | Claude | 초기 작성 |

---

## 부록

### A. API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/campaigns | 광고주의 체험단 리스트 조회 |
| POST | /api/campaigns | 신규 체험단 등록 |
| GET | /api/campaigns/:id | 체험단 상세 조회 |
| GET | /api/campaigns/:id/applications | 신청자 리스트 조회 |
| PATCH | /api/campaigns/:id/status | 모집 상태 변경 (조기 종료) |
| PATCH | /api/applications/bulk | 인플루언서 선정 (일괄 처리) |

### B. 데이터베이스 테이블 요약

| 테이블 | 주요 컬럼 | 용도 |
|--------|----------|------|
| campaigns | id, advertiser_id, title, status | 체험단 정보 |
| applications | id, campaign_id, influencer_id, status | 지원서 정보 |
| advertisers | id, user_id, business_name | 광고주 프로필 |
| influencers | id, user_id, channel_name, followers_count | 인플루언서 프로필 |

### C. 컴포넌트 계층 구조

```
/dashboard (page.tsx)
├─ CampaignListSection
│  ├─ CampaignStatusFilter
│  └─ CampaignTable
└─ CreateCampaignDialog
   └─ CampaignForm (react-hook-form)

/dashboard/campaigns/[id] (page.tsx)
├─ CampaignInfoCard
├─ ApplicantsTable
├─ CloseRecruitmentButton
└─ SelectInfluencersDialog
   └─ ApplicantsSelectList (체크박스)
```
