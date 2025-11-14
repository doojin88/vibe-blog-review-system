# 광고주용 체험단 상세 페이지 구현 계획

## 1. 개요

### 1.1 페이지 정보
- **경로**: `/dashboard/campaigns/[id]`
- **접근 권한**: 광고주 전용 (해당 체험단 소유자만)
- **목적**: 체험단 신청자 관리 및 인플루언서 선정

### 1.2 핵심 기능
1. 체험단 상세 정보 조회 (읽기 전용)
2. 신청자 리스트 조회 및 정렬
3. 모집 조기 종료
4. 인플루언서 선정 (선정/반려)

### 1.3 참고 문서
- PRD: `/docs/prd.md` (섹션 3.3.3)
- Userflow: `/docs/userflow.md` (섹션 2.2.3, 2.3)
- Usecase: `/docs/usecases/7-campaign-management-dashboard/spec.md`, `/docs/usecases/8-influencer-selection/spec.md`
- Database: `/docs/database.md`
- Common Modules: `/docs/common-modules.md`

---

## 2. 아키텍처 설계

### 2.1 디렉토리 구조

```
src/
├── app/
│   └── dashboard/
│       └── campaigns/
│           └── [id]/
│               ├── page.tsx                  # 메인 페이지 (Server Component)
│               └── loading.tsx               # 로딩 UI (Suspense)
│
├── features/
│   └── campaign-detail/
│       ├── components/
│       │   ├── campaign-info-card.tsx        # 체험단 정보 카드
│       │   ├── applicants-table.tsx          # 신청자 리스트 테이블
│       │   ├── early-close-button.tsx        # 모집 조기 종료 버튼
│       │   ├── selection-dialog.tsx          # 인플루언서 선정 Dialog
│       │   └── campaign-status-badge.tsx     # 상태 뱃지
│       │
│       ├── hooks/
│       │   ├── useCampaignDetail.ts          # 체험단 상세 조회 훅
│       │   ├── useApplicants.ts              # 신청자 리스트 조회 훅
│       │   ├── useEarlyClose.ts              # 조기 종료 mutation 훅
│       │   └── useSelection.ts               # 선정 mutation 훅
│       │
│       ├── constants/
│       │   └── status-map.ts                 # 상태 관련 상수
│       │
│       ├── lib/
│       │   └── dto.ts                        # 프론트엔드 DTO 재노출
│       │
│       └── backend/
│           ├── route.ts                      # Hono 라우터 정의
│           ├── service.ts                    # Supabase 접근 로직
│           ├── schema.ts                     # Zod 스키마
│           └── error.ts                      # 에러 코드 정의
```

### 2.2 데이터 흐름

```
[사용자]
   ↓
[page.tsx] (Server Component)
   ↓ (초기 데이터 로드 - 선택사항)
[Client Components]
   ↓
[React Query Hooks]
   ↓
[API Client] (@/lib/remote/api-client)
   ↓
[Hono Backend Routes] (src/features/campaign-detail/backend/route.ts)
   ↓
[Service Layer] (src/features/campaign-detail/backend/service.ts)
   ↓
[Supabase Client] (@/backend/supabase/client)
   ↓
[Database] (campaigns, applications, influencers)
```

---

## 3. 백엔드 구현 계획

### 3.1 API 엔드포인트

#### 3.1.1 GET /api/campaigns/:id
**목적**: 체험단 상세 정보 조회

**요청**:
- Path Parameter: `id` (체험단 ID)
- Headers: 인증 세션 쿠키

**응답**:
```typescript
{
  campaign: {
    id: number;
    title: string;
    description: string;
    recruitment_start_date: string;
    recruitment_end_date: string;
    recruitment_count: number;
    benefits: string;
    mission: string;
    store_name: string;
    store_address: string;
    store_phone: string;
    category: CampaignCategory;
    status: CampaignStatus;
    created_at: string;
    updated_at: string;
    advertiser: {
      id: number;
      business_name: string;
    };
  };
}
```

**에러**:
- 401: 비로그인
- 403: 권한 없음 (다른 광고주의 체험단)
- 404: 체험단 없음

---

#### 3.1.2 GET /api/campaigns/:id/applications
**목적**: 체험단 신청자 리스트 조회

**요청**:
- Path Parameter: `id` (체험단 ID)
- Query Parameters:
  - `sort` (optional): `latest` (기본값) | `oldest`
  - `status` (optional): 상태 필터 (신청완료/선정/반려)
- Headers: 인증 세션 쿠키

**응답**:
```typescript
{
  applications: Array<{
    id: number;
    message: string;
    visit_date: string;
    status: ApplicationStatus;
    applied_at: string;
    influencer: {
      id: number;
      name: string;
      channel_name: string;
      channel_link: string;
      followers_count: number;
    };
  }>;
}
```

**에러**:
- 401: 비로그인
- 403: 권한 없음

---

#### 3.1.3 PATCH /api/campaigns/:id/status
**목적**: 체험단 모집 조기 종료

**요청**:
- Path Parameter: `id` (체험단 ID)
- Body:
```typescript
{
  status: '모집종료';
}
```
- Headers: 인증 세션 쿠키

**응답**:
```typescript
{
  campaign: {
    id: number;
    status: '모집종료';
    updated_at: string;
  };
}
```

**에러**:
- 401: 비로그인
- 403: 권한 없음
- 400: 이미 종료된 체험단

---

#### 3.1.4 PATCH /api/applications/bulk
**목적**: 인플루언서 선정 (일괄 업데이트)

**요청**:
- Body:
```typescript
{
  campaign_id: number;
  selected_application_ids: number[];
}
```
- Headers: 인증 세션 쿠키

**응답**:
```typescript
{
  selected_count: number;
  rejected_count: number;
  campaign: {
    id: number;
    status: '선정완료';
  };
}
```

**에러**:
- 401: 비로그인
- 403: 권한 없음
- 400: 선정 인원 초과 / 0명 선택 / 이미 선정완료 / 신청자 없음

---

### 3.2 백엔드 파일 구조

#### 3.2.1 src/features/campaign-detail/backend/schema.ts
```typescript
import { z } from 'zod';

// 체험단 상세 응답 스키마
export const CampaignDetailSchema = z.object({
  campaign: z.object({
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
    category: z.enum(['음식점', '카페', '뷰티', '패션', '생활', '기타']),
    status: z.enum(['모집중', '모집종료', '선정완료']),
    created_at: z.string(),
    updated_at: z.string(),
    advertiser: z.object({
      id: z.number(),
      business_name: z.string(),
    }),
  }),
});

// 신청자 리스트 응답 스키마
export const ApplicantsSchema = z.object({
  applications: z.array(
    z.object({
      id: z.number(),
      message: z.string(),
      visit_date: z.string(),
      status: z.enum(['신청완료', '선정', '반려']),
      applied_at: z.string(),
      influencer: z.object({
        id: z.number(),
        name: z.string(),
        channel_name: z.string(),
        channel_link: z.string(),
        followers_count: z.number(),
      }),
    })
  ),
});

// 조기 종료 요청 스키마
export const EarlyCloseSchema = z.object({
  status: z.literal('모집종료'),
});

// 선정 요청 스키마
export const SelectionSchema = z.object({
  campaign_id: z.number().int().positive(),
  selected_application_ids: z.array(z.number().int().positive()).min(1),
});
```

---

#### 3.2.2 src/features/campaign-detail/backend/error.ts
```typescript
export const CAMPAIGN_DETAIL_ERROR = {
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  ALREADY_CLOSED: 'ALREADY_CLOSED',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  SELECTION_COUNT_EXCEEDED: 'SELECTION_COUNT_EXCEEDED',
  NO_SELECTION: 'NO_SELECTION',
  NO_APPLICANTS: 'NO_APPLICANTS',
  INVALID_STATUS: 'INVALID_STATUS',
} as const;

export type CampaignDetailErrorCode = (typeof CAMPAIGN_DETAIL_ERROR)[keyof typeof CAMPAIGN_DETAIL_ERROR];
```

---

#### 3.2.3 src/features/campaign-detail/backend/service.ts
**주요 함수**:
1. `getCampaignDetail(campaignId: number, advertiserId: number)`
   - 체험단 상세 조회
   - 소유권 검증
   - advertisers 테이블 JOIN

2. `getApplicants(campaignId: number, advertiserId: number, sort?: 'latest' | 'oldest', status?: string)`
   - 신청자 리스트 조회
   - 소유권 검증
   - influencers 테이블 JOIN
   - 정렬 및 필터 적용

3. `earlyClosure(campaignId: number, advertiserId: number)`
   - 모집 조기 종료
   - 소유권 및 상태 검증
   - campaigns 테이블 업데이트

4. `selectInfluencers(campaignId: number, advertiserId: number, selectedIds: number[])`
   - 인플루언서 선정
   - 소유권 및 상태 검증
   - 선정 인원 제한 검증
   - 트랜잭션 처리:
     - 선정된 신청자 상태 업데이트 ('선정')
     - 미선정 신청자 상태 업데이트 ('반려')
     - 체험단 상태 업데이트 ('선정완료')

---

#### 3.2.4 src/features/campaign-detail/backend/route.ts
**라우터 등록**:
```typescript
import { Hono } from 'hono';
import type { AppContext } from '@/backend/hono/context';
import * as service from './service';
import * as schema from './schema';
import { respond, success, failure } from '@/backend/http/response';

export function registerCampaignDetailRoutes(app: Hono) {
  // GET /api/campaigns/:id
  app.get('/api/campaigns/:id', async (c: AppContext) => {
    // 구현...
  });

  // GET /api/campaigns/:id/applications
  app.get('/api/campaigns/:id/applications', async (c: AppContext) => {
    // 구현...
  });

  // PATCH /api/campaigns/:id/status
  app.patch('/api/campaigns/:id/status', async (c: AppContext) => {
    // 구현...
  });

  // PATCH /api/applications/bulk
  app.patch('/api/applications/bulk', async (c: AppContext) => {
    // 구현...
  });
}
```

---

### 3.3 데이터베이스 쿼리

#### 3.3.1 체험단 상세 조회
```sql
SELECT
  campaigns.*,
  advertisers.id AS advertiser_id,
  advertisers.business_name AS advertiser_business_name
FROM campaigns
JOIN advertisers ON campaigns.advertiser_id = advertisers.id
WHERE campaigns.id = :campaign_id;
```

#### 3.3.2 신청자 리스트 조회
```sql
SELECT
  applications.*,
  influencers.id AS influencer_id,
  influencers.name AS influencer_name,
  influencers.channel_name,
  influencers.channel_link,
  influencers.followers_count
FROM applications
JOIN influencers ON applications.influencer_id = influencers.id
WHERE applications.campaign_id = :campaign_id
ORDER BY applications.applied_at DESC;
```

#### 3.3.3 선정 인원 제한 검증
```sql
SELECT recruitment_count
FROM campaigns
WHERE id = :campaign_id;
```

#### 3.3.4 인플루언서 선정 (트랜잭션)
```sql
BEGIN;

-- 선정된 신청자
UPDATE applications
SET status = '선정'
WHERE id = ANY(:selected_ids);

-- 미선정 신청자
UPDATE applications
SET status = '반려'
WHERE campaign_id = :campaign_id
  AND status = '신청완료'
  AND id <> ALL(:selected_ids);

-- 체험단 상태 업데이트
UPDATE campaigns
SET status = '선정완료'
WHERE id = :campaign_id;

COMMIT;
```

---

## 4. 프론트엔드 구현 계획

### 4.1 페이지 컴포넌트

#### 4.1.1 app/dashboard/campaigns/[id]/page.tsx
**역할**: 메인 페이지 (Client Component)

**주요 로직**:
1. 인증 상태 확인 (useCurrentUser)
2. 광고주 역할 확인
3. 체험단 상세 조회 (useCampaignDetail)
4. 신청자 리스트 조회 (useApplicants)
5. 상태별 UI 표시

**Props**:
```typescript
interface PageProps {
  params: Promise<{ id: string }>;
}
```

**구조**:
```tsx
'use client';

export default function CampaignDetailPage({ params }: PageProps) {
  // 1. params 언래핑
  const unwrappedParams = use(params);
  const campaignId = Number(unwrappedParams.id);

  // 2. 인증 및 권한 확인
  const { user, isAuthenticated, isLoading: userLoading } = useCurrentUser();

  // 3. 체험단 상세 조회
  const { data: campaignData, isLoading: campaignLoading } = useCampaignDetail(campaignId);

  // 4. 신청자 리스트 조회
  const { data: applicantsData, isLoading: applicantsLoading } = useApplicants(campaignId);

  // 5. 로딩 상태
  if (userLoading || campaignLoading || applicantsLoading) {
    return <LoadingSpinner />;
  }

  // 6. 권한 확인
  if (!isAuthenticated || user?.role !== 'advertiser') {
    redirect('/dashboard');
  }

  // 7. UI 렌더링
  return (
    <div className="container mx-auto py-8">
      <CampaignInfoCard campaign={campaignData.campaign} />
      <ApplicantsTable
        applications={applicantsData.applications}
        campaignStatus={campaignData.campaign.status}
        recruitmentCount={campaignData.campaign.recruitment_count}
      />
      {campaignData.campaign.status === '모집중' && (
        <EarlyCloseButton campaignId={campaignId} />
      )}
      {campaignData.campaign.status === '모집종료' && (
        <SelectionDialog
          campaignId={campaignId}
          applications={applicantsData.applications}
          recruitmentCount={campaignData.campaign.recruitment_count}
        />
      )}
    </div>
  );
}
```

---

### 4.2 컴포넌트 설계

#### 4.2.1 campaign-info-card.tsx
**목적**: 체험단 정보 표시 (읽기 전용)

**Props**:
```typescript
interface CampaignInfoCardProps {
  campaign: CampaignDetail;
}
```

**UI 구조**:
- Card 컴포넌트 사용
- 상태 뱃지 표시
- 주요 정보:
  - 제목, 설명
  - 모집 인원, 모집 기간
  - 제공 혜택, 미션
  - 매장 정보 (업체명, 주소, 전화번호)
  - 카테고리

---

#### 4.2.2 applicants-table.tsx
**목적**: 신청자 리스트 테이블

**Props**:
```typescript
interface ApplicantsTableProps {
  applications: Application[];
  campaignStatus: CampaignStatus;
  recruitmentCount: number;
}
```

**UI 구조**:
- Table 컴포넌트 사용 (shadcn-ui)
- 컬럼:
  - 체크박스 (선정 Dialog에서만 표시)
  - 이름
  - SNS 채널명
  - 팔로워 수
  - 각오 한마디
  - 방문 예정일
  - 지원일
  - 상태 뱃지 (선정완료 상태에만 표시)
- 정렬: 지원일 최신순 (기본값)
- 빈 상태: "아직 지원한 인플루언서가 없습니다"

---

#### 4.2.3 early-close-button.tsx
**목적**: 모집 조기 종료 버튼

**Props**:
```typescript
interface EarlyCloseButtonProps {
  campaignId: number;
}
```

**로직**:
1. 버튼 클릭 시 확인 모달 표시
2. 확인 시 `useEarlyClose` mutation 실행
3. 성공 시 토스트 메시지 표시
4. React Query 캐시 무효화

**UI**:
- Button 컴포넌트 (variant: "outline")
- 확인 모달 (AlertDialog)

---

#### 4.2.4 selection-dialog.tsx
**목적**: 인플루언서 선정 Dialog

**Props**:
```typescript
interface SelectionDialogProps {
  campaignId: number;
  applications: Application[];
  recruitmentCount: number;
}
```

**State**:
```typescript
const [selectedIds, setSelectedIds] = useState<number[]>([]);
const [isOpen, setIsOpen] = useState(false);
```

**로직**:
1. Dialog 오픈 버튼 클릭
2. 신청자 리스트 표시 (체크박스 포함)
3. 체크박스 선택 시 selectedIds 업데이트
4. 선정 인원 실시간 표시 ("5명 중 3명 선정")
5. 선정 완료 버튼 클릭 시 `useSelection` mutation 실행
6. 성공 시 Dialog 닫기, 토스트 메시지 표시
7. React Query 캐시 무효화

**UI**:
- Dialog 컴포넌트 (shadcn-ui)
- Table with Checkbox
- 선정 인원 표시 (하단)
- 버튼: "선정 완료" (Primary), "취소" (Secondary)

**검증**:
- 선정 인원 초과 시 추가 체크박스 비활성화
- 0명 선택 시 "선정 완료" 버튼 비활성화

---

#### 4.2.5 campaign-status-badge.tsx
**목적**: 상태 뱃지 컴포넌트

**Props**:
```typescript
interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}
```

**UI**:
- Badge 컴포넌트 (shadcn-ui)
- 색상:
  - 모집중: blue
  - 모집종료: yellow
  - 선정완료: green

---

### 4.3 React Query 훅

#### 4.3.1 useCampaignDetail.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CampaignDetail } from '../lib/dto';

export function useCampaignDetail(campaignId: number) {
  return useQuery({
    queryKey: ['campaign-detail', campaignId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ campaign: CampaignDetail }>(
        `/api/campaigns/${campaignId}`
      );
      return data;
    },
    staleTime: 60 * 1000, // 1분
    enabled: !!campaignId && campaignId > 0,
  });
}
```

---

#### 4.3.2 useApplicants.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { Application } from '../lib/dto';

interface UseApplicantsOptions {
  sort?: 'latest' | 'oldest';
  status?: string;
}

export function useApplicants(campaignId: number, options?: UseApplicantsOptions) {
  return useQuery({
    queryKey: ['applicants', campaignId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.sort) params.append('sort', options.sort);
      if (options?.status) params.append('status', options.status);

      const { data } = await apiClient.get<{ applications: Application[] }>(
        `/api/campaigns/${campaignId}/applications?${params.toString()}`
      );
      return data;
    },
    staleTime: 60 * 1000, // 1분
    enabled: !!campaignId && campaignId > 0,
  });
}
```

---

#### 4.3.3 useEarlyClose.ts
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { toast } from '@/components/ui/use-toast';

export function useEarlyClose() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: number) => {
      const { data } = await apiClient.patch(
        `/api/campaigns/${campaignId}/status`,
        { status: '모집종료' }
      );
      return data;
    },
    onSuccess: (_, campaignId) => {
      toast({
        title: '모집이 조기 종료되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }); // 대시보드 리스트
    },
    onError: (error) => {
      toast({
        title: '모집 종료에 실패했습니다',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

---

#### 4.3.4 useSelection.ts
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { toast } from '@/components/ui/use-toast';

interface SelectionParams {
  campaignId: number;
  selectedApplicationIds: number[];
}

export function useSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, selectedApplicationIds }: SelectionParams) => {
      const { data } = await apiClient.patch('/api/applications/bulk', {
        campaign_id: campaignId,
        selected_application_ids: selectedApplicationIds,
      });
      return data;
    },
    onSuccess: (_, { campaignId }) => {
      toast({
        title: '인플루언서 선정이 완료되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['applicants', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }); // 대시보드 리스트
    },
    onError: (error) => {
      toast({
        title: '선정에 실패했습니다',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

---

### 4.4 상태 관리

#### 전역 상태 (Zustand)
- 사용하지 않음 (React Query로 서버 상태 관리)

#### 로컬 상태
- `selectedIds`: 선정 Dialog 내 체크박스 선택 상태
- `isOpen`: Dialog 열림/닫힘 상태

---

### 4.5 UI/UX 요구사항

#### 로딩 상태
- 초기 로딩: 스켈레톤 UI 표시
- Mutation 중: 버튼 비활성화 + 로딩 스피너

#### 에러 처리
- API 에러 시 토스트 메시지 표시
- 권한 없음: 대시보드로 리다이렉트
- 404: "존재하지 않는 체험단입니다" 에러 페이지

#### 빈 상태
- 신청자 없음: "아직 지원한 인플루언서가 없습니다" 메시지

#### 반응형 디자인
- 모바일: 카드 뷰로 변경 (테이블 대신)
- 태블릿 이상: 테이블 뷰 유지

---

## 5. 구현 단계

### Phase 1: 백엔드 구현
1. ✅ 데이터베이스 스키마 확인 (campaigns, applications, influencers)
2. 🔄 Zod 스키마 정의 (`schema.ts`)
3. 🔄 에러 코드 정의 (`error.ts`)
4. 🔄 Service Layer 구현 (`service.ts`)
   - `getCampaignDetail`
   - `getApplicants`
   - `earlyClosure`
   - `selectInfluencers`
5. 🔄 Hono 라우터 등록 (`route.ts`)
   - GET /api/campaigns/:id
   - GET /api/campaigns/:id/applications
   - PATCH /api/campaigns/:id/status
   - PATCH /api/applications/bulk
6. 🔄 Hono 앱에 라우터 등록 (`src/backend/hono/app.ts`)

### Phase 2: 프론트엔드 - 데이터 레이어
1. 🔄 DTO 타입 정의 및 재노출 (`lib/dto.ts`)
2. 🔄 React Query 훅 구현
   - `useCampaignDetail.ts`
   - `useApplicants.ts`
   - `useEarlyClose.ts`
   - `useSelection.ts`

### Phase 3: 프론트엔드 - UI 컴포넌트
1. 🔄 기본 컴포넌트 구현
   - `campaign-status-badge.tsx`
   - `campaign-info-card.tsx`
2. 🔄 테이블 컴포넌트 구현
   - `applicants-table.tsx`
3. 🔄 액션 컴포넌트 구현
   - `early-close-button.tsx`
   - `selection-dialog.tsx`

### Phase 4: 프론트엔드 - 페이지 통합
1. 🔄 메인 페이지 구현 (`app/dashboard/campaigns/[id]/page.tsx`)
2. 🔄 로딩 UI 구현 (`loading.tsx`)
3. 🔄 에러 처리 및 권한 확인
4. 🔄 반응형 디자인 적용

### Phase 5: 테스트 및 검증
1. 🔄 백엔드 API 테스트
   - Postman/Thunder Client로 엔드포인트 검증
2. 🔄 프론트엔드 기능 테스트
   - 체험단 상세 조회
   - 신청자 리스트 조회
   - 모집 조기 종료
   - 인플루언서 선정
3. 🔄 엣지케이스 테스트
   - 권한 없음
   - 이미 종료된 체험단
   - 선정 인원 초과
   - 0명 선택
4. 🔄 UI/UX 검증
   - 로딩 상태
   - 에러 메시지
   - 빈 상태
   - 반응형 디자인

---

## 6. 기존 코드베이스와의 충돌 방지

### 6.1 확인된 기존 모듈
- ✅ `src/features/auth/*`: 인증 관련 (CurrentUserContext 사용)
- ✅ `src/features/profile/*`: 프로필 조회 API
- ✅ `src/features/example/*`: 예시 코드 (무시 가능)

### 6.2 충돌 방지 전략
1. **독립적인 feature 폴더**: `src/features/campaign-detail/` 사용
2. **공통 모듈 활용**:
   - `@/lib/remote/api-client`: HTTP 요청
   - `@/backend/http/response`: 응답 헬퍼
   - `@/backend/hono/context`: Hono 컨텍스트
   - `@/features/auth/hooks/useCurrentUser`: 인증 상태
3. **라우터 등록 시점 조정**: `src/backend/hono/app.ts`에서 `registerCampaignDetailRoutes` 추가

### 6.3 공통 모듈 요구사항
**필요한 shadcn-ui 컴포넌트**:
- ✅ Button, Card, Badge, Table
- ✅ Dialog (이미 설치됨)
- 🔄 AlertDialog (설치 필요)
- 🔄 Checkbox (설치 필요)

**설치 명령어**:
```bash
npx shadcn@latest add alert-dialog
npx shadcn@latest add checkbox
```

---

## 7. 검증 체크리스트

### 7.1 백엔드
- [ ] 모든 API 엔드포인트가 정상 동작하는가?
- [ ] 권한 검증이 서버 사이드에서 수행되는가?
- [ ] Zod 스키마로 요청 데이터가 검증되는가?
- [ ] 트랜잭션이 올바르게 처리되는가?
- [ ] 에러 메시지가 명확한가?

### 7.2 프론트엔드
- [ ] React Query로 서버 상태가 관리되는가?
- [ ] 로딩/에러 상태가 올바르게 표시되는가?
- [ ] 권한 없는 사용자가 접근 시 리다이렉트되는가?
- [ ] 반응형 디자인이 모든 화면 크기에서 동작하는가?
- [ ] 토스트 메시지가 적절히 표시되는가?

### 7.3 비즈니스 로직
- [ ] 선정 인원 제한이 클라이언트/서버 양쪽에서 검증되는가?
- [ ] 0명 선택 시 버튼이 비활성화되는가?
- [ ] 이미 종료된 체험단에 조기 종료 시도 시 에러가 발생하는가?
- [ ] 이미 선정완료된 체험단에 재선정 시도 시 에러가 발생하는가?
- [ ] 트랜잭션 실패 시 롤백되는가?

---

## 8. 참고 사항

### 8.1 DRY 원칙 준수
- 공통 타입은 `lib/dto.ts`에서 재노출
- 공통 로직은 Service Layer에서 처리
- UI 컴포넌트는 재사용 가능하도록 Props 설계

### 8.2 타입 안전성
- 모든 API 응답은 Zod 스키마로 검증
- 프론트엔드 DTO는 백엔드 스키마와 동기화
- React Query 훅은 제네릭 타입 활용

### 8.3 성능 최적화
- React Query 캐싱 (staleTime: 1분)
- 테이블 가상화 (신청자 수가 많을 경우)
- 이미지 최적화 (Next.js Image 컴포넌트)

### 8.4 접근성
- 키보드 네비게이션 지원
- ARIA 레이블 적용
- 스크린 리더 호환

---

## 9. 다음 단계

### 구현 후 작업
1. **대시보드 리스트 페이지** (`/dashboard`) 구현
2. **신규 체험단 등록** Dialog 구현
3. **체험단 수정/삭제** 기능 (P1)
4. **선정 결과 알림** 발송 (P1)

### 개선 사항 (추후 고려)
1. 신청자 수가 많을 경우 페이지네이션 또는 무한 스크롤
2. 신청자 정렬 옵션 확장 (팔로워 수, 지원일)
3. 신청자 필터링 (상태별)
4. 선정 취소 기능
5. 체험단 통계 대시보드

---

## 10. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
