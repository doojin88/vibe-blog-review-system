# 체험단 지원 페이지 구현 계획

## 1. 페이지 개요

### 1.1 기본 정보
- **경로**: `/campaigns/:id/apply`
- **목적**: 인플루언서가 체험단에 지원서를 작성하고 제출
- **접근 권한**: 인플루언서 로그인 + 프로필 등록 완료자만
- **참고 문서**:
  - PRD: `/docs/prd.md` (섹션 3.2.2)
  - Userflow: `/docs/userflow.md` (섹션 1.2.3)
  - Usecase: `/docs/usecases/4-campaign-application/spec.md`

### 1.2 주요 기능
1. 체험단 요약 정보 표시 (제목, 모집 인원, 마감일)
2. 지원서 작성 폼 (각오 한마디, 방문 예정일)
3. 실시간 유효성 검증
4. 지원서 제출
5. 권한 및 자격 검증
6. 중복 지원 방지

---

## 2. 아키텍처 설계

### 2.1 전체 구조

```
┌────────────────────────────────────────────┐
│         Frontend (Client Component)        │
│  /campaigns/:id/apply                      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  CampaignApplyPage                   │  │
│  │  - 권한 검증                          │  │
│  │  - 체험단 요약 표시                   │  │
│  │  - 지원서 폼 렌더링                   │  │
│  └───────────┬──────────────────────────┘  │
│              │                              │
│  ┌───────────▼──────────────────────────┐  │
│  │  CampaignApplicationForm             │  │
│  │  - React Hook Form                   │  │
│  │  - Zod 클라이언트 검증               │  │
│  │  - 실시간 유효성 검증                │  │
│  └───────────┬──────────────────────────┘  │
│              │                              │
│  ┌───────────▼──────────────────────────┐  │
│  │  useApplyCampaign                    │  │
│  │  - React Query Mutation              │  │
│  │  - POST /api/applications            │  │
│  └──────────────────────────────────────┘  │
└─────────────────┬──────────────────────────┘
                  │ HTTP
┌─────────────────▼──────────────────────────┐
│         Backend (Hono Router)              │
│  POST /api/applications                    │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  registerApplicationRoutes           │  │
│  │  - Zod 서버 검증                     │  │
│  │  - 세션 인증                         │  │
│  │  - 권한 검증                         │  │
│  └───────────┬──────────────────────────┘  │
│              │                              │
│  ┌───────────▼──────────────────────────┐  │
│  │  createApplication                   │  │
│  │  - 체험단 상태 확인                  │  │
│  │  - 중복 지원 확인                    │  │
│  │  - applications 테이블 INSERT        │  │
│  └──────────────────────────────────────┘  │
└─────────────────┬──────────────────────────┘
                  │
┌─────────────────▼──────────────────────────┐
│         Database (Supabase PostgreSQL)     │
│                                             │
│  - applications 테이블                     │
│  - campaigns 테이블 (조회)                 │
│  - influencers 테이블 (조회)               │
└────────────────────────────────────────────┘
```

---

## 3. 백엔드 구현 계획

### 3.1 디렉토리 구조

```
src/features/application/
├── backend/
│   ├── route.ts         # Hono 라우터 (POST /api/applications)
│   ├── service.ts       # Supabase 비즈니스 로직
│   ├── schema.ts        # Zod 요청/응답 스키마
│   └── error.ts         # 에러 코드 정의
└── lib/
    └── dto.ts           # 프론트엔드 DTO 재노출
```

### 3.2 route.ts 구현

#### 3.2.1 엔드포인트 정의

**POST /api/applications**

- **목적**: 체험단 지원서 제출
- **인증**: 필수 (Supabase Auth 세션)
- **역할**: 인플루언서만

#### 3.2.2 요청 처리 흐름

```typescript
import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { CreateApplicationSchema } from './schema';
import { createApplication } from './service';
import { ApplicationErrorCodes } from './error';

export const registerApplicationRoutes = (app: Hono<AppEnv>) => {
  app.post('/applications', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    // 1. 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, ApplicationErrorCodes.UNAUTHORIZED, '로그인이 필요합니다')
      );
    }

    // 2. 요청 바디 파싱 및 검증
    const body = await c.req.json();
    const parsedBody = CreateApplicationSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          ApplicationErrorCodes.INVALID_REQUEST,
          '요청 데이터가 유효하지 않습니다',
          parsedBody.error.format()
        )
      );
    }

    // 3. 서비스 레이어 호출
    const result = await createApplication(supabase, user.id, parsedBody.data);

    if (!result.ok) {
      logger.error('Failed to create application', result.error);
    }

    return respond(c, result);
  });
};
```

#### 3.2.3 Hono 앱 등록

**위치**: `src/backend/hono/app.ts`

```typescript
import { registerApplicationRoutes } from '@/features/application/backend/route';

export function createHonoApp(): Hono<AppEnv> {
  // ... 기존 코드

  // 라우터 등록
  registerApplicationRoutes(app);

  return app;
}
```

### 3.3 service.ts 구현

#### 3.3.1 createApplication 함수

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import type { CreateApplicationRequest, ApplicationResponse } from './schema';
import { ApplicationErrorCodes, type ApplicationServiceError } from './error';

export const createApplication = async (
  client: SupabaseClient,
  userId: string,
  data: CreateApplicationRequest
): Promise<HandlerResult<ApplicationResponse, ApplicationServiceError, unknown>> => {
  // 1. 인플루언서 ID 조회
  const { data: influencer, error: influencerError } = await client
    .from('influencers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (influencerError) {
    return failure(
      500,
      ApplicationErrorCodes.DATABASE_ERROR,
      '인플루언서 정보 조회 실패'
    );
  }

  if (!influencer) {
    return failure(
      403,
      ApplicationErrorCodes.PROFILE_NOT_FOUND,
      '인플루언서 프로필을 먼저 등록해주세요'
    );
  }

  // 2. 체험단 조회 및 모집 상태 확인
  const { data: campaign, error: campaignError } = await client
    .from('campaigns')
    .select('id, status, recruitment_end_date')
    .eq('id', data.campaign_id)
    .maybeSingle();

  if (campaignError) {
    return failure(
      500,
      ApplicationErrorCodes.DATABASE_ERROR,
      '체험단 정보 조회 실패'
    );
  }

  if (!campaign) {
    return failure(
      404,
      ApplicationErrorCodes.CAMPAIGN_NOT_FOUND,
      '존재하지 않는 체험단입니다'
    );
  }

  if (campaign.status !== '모집중') {
    return failure(
      403,
      ApplicationErrorCodes.CAMPAIGN_CLOSED,
      '모집이 종료된 체험단입니다'
    );
  }

  // 3. 중복 지원 확인
  const { data: existingApplication, error: checkError } = await client
    .from('applications')
    .select('id')
    .eq('campaign_id', data.campaign_id)
    .eq('influencer_id', influencer.id)
    .maybeSingle();

  if (checkError) {
    return failure(
      500,
      ApplicationErrorCodes.DATABASE_ERROR,
      '지원 내역 조회 실패'
    );
  }

  if (existingApplication) {
    return failure(
      409,
      ApplicationErrorCodes.ALREADY_APPLIED,
      '이미 지원한 체험단입니다'
    );
  }

  // 4. 지원서 생성
  const { data: application, error: insertError } = await client
    .from('applications')
    .insert({
      campaign_id: data.campaign_id,
      influencer_id: influencer.id,
      message: data.message,
      visit_date: data.visit_date,
      status: '신청완료',
      applied_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError) {
    return failure(
      500,
      ApplicationErrorCodes.CREATE_FAILED,
      '지원서 제출에 실패했습니다'
    );
  }

  return success({
    id: application.id,
    campaign_id: application.campaign_id,
    influencer_id: application.influencer_id,
    message: application.message,
    visit_date: application.visit_date,
    status: application.status,
    applied_at: application.applied_at,
    created_at: application.created_at,
    updated_at: application.updated_at,
  });
};
```

### 3.4 schema.ts 구현

```typescript
import { z } from 'zod';

/**
 * 지원서 생성 요청 스키마
 */
export const CreateApplicationSchema = z.object({
  campaign_id: z.number().int().positive(),
  message: z.string().min(10, '각오 한마디는 10자 이상이어야 합니다').max(500, '각오 한마디는 500자 이하여야 합니다'),
  visit_date: z.string().refine(
    (date) => {
      const visitDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return visitDate >= today;
    },
    { message: '방문 예정일은 오늘 이후 날짜를 선택해주세요' }
  ),
});

export type CreateApplicationRequest = z.infer<typeof CreateApplicationSchema>;

/**
 * 지원서 응답 스키마
 */
export const ApplicationResponseSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  influencer_id: z.number(),
  message: z.string(),
  visit_date: z.string(),
  status: z.enum(['신청완료', '선정', '반려']),
  applied_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ApplicationResponse = z.infer<typeof ApplicationResponseSchema>;
```

### 3.5 error.ts 구현

```typescript
export const ApplicationErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_CLOSED: 'CAMPAIGN_CLOSED',
  ALREADY_APPLIED: 'ALREADY_APPLIED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CREATE_FAILED: 'CREATE_FAILED',
} as const;

export type ApplicationServiceError =
  (typeof ApplicationErrorCodes)[keyof typeof ApplicationErrorCodes];
```

---

## 4. 프론트엔드 구현 계획

### 4.1 디렉토리 구조

```
src/features/application/
├── components/
│   ├── campaign-application-form.tsx   # 지원서 작성 폼
│   └── campaign-summary-card.tsx        # 체험단 요약 카드
├── hooks/
│   ├── useApplyCampaign.ts             # 지원서 제출 Mutation
│   └── useCampaignDetail.ts            # 체험단 상세 조회 Query
└── lib/
    └── dto.ts                           # DTO 재노출

src/app/campaigns/[id]/apply/
└── page.tsx                             # 지원 페이지
```

### 4.2 page.tsx 구현

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useCampaignDetail } from '@/features/application/hooks/useCampaignDetail';
import { CampaignSummaryCard } from '@/features/application/components/campaign-summary-card';
import { CampaignApplicationForm } from '@/features/application/components/campaign-application-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignApplyPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser();
  const campaignId = Number(params.id);

  // 1. 인증 및 권한 검증
  useEffect(() => {
    if (!isUserLoading) {
      // 비로그인
      if (!isAuthenticated) {
        router.push(`/login?redirect=/campaigns/${campaignId}/apply`);
        return;
      }

      // 인플루언서가 아닌 경우
      if (user?.role !== 'influencer') {
        router.push(`/campaigns/${campaignId}`);
        return;
      }

      // 프로필 미등록
      if (!user?.hasProfile) {
        router.push(`/onboarding/influencer?redirect=/campaigns/${campaignId}/apply`);
        return;
      }
    }
  }, [isUserLoading, isAuthenticated, user, campaignId, router]);

  // 2. 체험단 정보 조회
  const {
    data: campaign,
    isLoading: isCampaignLoading,
    error: campaignError,
  } = useCampaignDetail(campaignId);

  // 3. 로딩 상태
  if (isUserLoading || isCampaignLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // 4. 에러 처리
  if (campaignError || !campaign) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>체험단을 찾을 수 없습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 5. 모집 상태 확인
  if (campaign.status !== '모집중') {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>모집이 종료되었습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              이 체험단은 더 이상 지원을 받지 않습니다.
            </p>
            <Button onClick={() => router.push(`/campaigns/${campaignId}`)}>
              체험단 상세 보기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      {/* 체험단 요약 카드 */}
      <CampaignSummaryCard campaign={campaign} className="mb-6" />

      {/* 지원서 작성 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>체험단 지원하기</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignApplicationForm campaignId={campaignId} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 campaign-application-form.tsx 구현

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useApplyCampaign } from '@/features/application/hooks/useApplyCampaign';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const applicationFormSchema = z.object({
  message: z
    .string()
    .min(10, '각오 한마디는 10자 이상이어야 합니다')
    .max(500, '각오 한마디는 500자 이하여야 합니다'),
  visit_date: z.date({
    required_error: '방문 예정일을 선택해주세요',
  }),
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

interface CampaignApplicationFormProps {
  campaignId: number;
}

export function CampaignApplicationForm({ campaignId }: CampaignApplicationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: apply, isPending } = useApplyCampaign();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      message: '',
    },
  });

  const onSubmit = (values: ApplicationFormValues) => {
    apply(
      {
        campaign_id: campaignId,
        message: values.message,
        visit_date: format(values.visit_date, 'yyyy-MM-dd'),
      },
      {
        onSuccess: () => {
          toast({
            title: '지원 완료',
            description: '체험단 지원이 완료되었습니다',
          });
          router.push('/my/applications');
        },
        onError: (error: any) => {
          toast({
            title: '지원 실패',
            description: error.message || '지원서 제출에 실패했습니다',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const messageLength = form.watch('message')?.length || 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 각오 한마디 */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>각오 한마디</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="체험단에 지원하는 각오를 작성해주세요 (10자 이상)"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {messageLength} / 500자
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 방문 예정일 */}
        <FormField
          control={form.control}
          name="visit_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>방문 예정일</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP', { locale: ko })
                      ) : (
                        <span>방문 예정일을 선택해주세요</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                오늘 이후 날짜만 선택 가능합니다
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? '제출 중...' : '지원하기'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 4.4 campaign-summary-card.tsx 구현

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UsersIcon } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Campaign } from '@/features/campaign/lib/dto';

interface CampaignSummaryCardProps {
  campaign: Campaign;
  className?: string;
}

export function CampaignSummaryCard({ campaign, className }: CampaignSummaryCardProps) {
  const daysLeft = differenceInDays(
    new Date(campaign.recruitment_end_date),
    new Date()
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-2xl">{campaign.title}</CardTitle>
          <Badge variant={campaign.status === '모집중' ? 'default' : 'secondary'}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              모집 인원: <strong>{campaign.recruitment_count}명</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              마감일:{' '}
              <strong>
                {format(new Date(campaign.recruitment_end_date), 'PPP', { locale: ko })}
                {daysLeft > 0 && ` (D-${daysLeft})`}
              </strong>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.5 useApplyCampaign.ts 구현

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import type { CreateApplicationRequest, ApplicationResponse } from '@/features/application/lib/dto';

export const useApplyCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationResponse, Error, CreateApplicationRequest>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/applications', data);
      return response.data;
    },
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (error) => {
      console.error('Failed to apply campaign', error);
      throw new Error(extractApiErrorMessage(error));
    },
  });
};
```

### 4.6 useCampaignDetail.ts 구현

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import type { Campaign } from '@/features/campaign/lib/dto';

export const useCampaignDetail = (campaignId: number) => {
  return useQuery<Campaign, Error>({
    queryKey: ['campaigns', campaignId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/campaigns/${campaignId}`);
      return response.data;
    },
    enabled: !!campaignId && campaignId > 0,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};
```

---

## 5. 필수 UI 컴포넌트

### 5.1 shadcn-ui 컴포넌트 추가 필요

```bash
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add skeleton
```

### 5.2 기존 컴포넌트 활용

- ✅ `button`
- ✅ `card`
- ✅ `form`
- ✅ `textarea`
- ✅ `label`
- ✅ `badge`
- ✅ `toast`

---

## 6. 의존성

### 6.1 백엔드 의존성

#### 6.1.1 필수 선행 구현
- ✅ Hono 앱 구성 (`src/backend/hono/app.ts`)
- ✅ 공통 미들웨어 (`src/backend/middleware/`)
- ✅ HTTP 응답 헬퍼 (`src/backend/http/response.ts`)
- ✅ Supabase 클라이언트 (`src/backend/supabase/client.ts`)
- ⚠️ 데이터베이스 마이그레이션 (applications 테이블)

#### 6.1.2 공통 모듈
- ✅ `failure`, `success`, `respond` 헬퍼 함수
- ✅ `getSupabase`, `getLogger` 컨텍스트 함수
- ✅ Zod 스키마 검증

### 6.2 프론트엔드 의존성

#### 6.2.1 필수 선행 구현
- ✅ API 클라이언트 (`src/lib/remote/api-client.ts`)
- ✅ React Query 설정 (`src/app/providers.tsx`)
- ✅ CurrentUserContext (`src/features/auth/context/current-user-context.tsx`)
- ⚠️ CurrentUser 타입 확장 (role, hasProfile 필드)
- ⚠️ `/api/profile` 엔드포인트 (역할 정보 조회)

#### 6.2.2 외부 라이브러리
- ✅ `react-hook-form` (폼 상태 관리)
- ✅ `@hookform/resolvers/zod` (Zod 통합)
- ✅ `date-fns` (날짜 포맷팅)
- ✅ `lucide-react` (아이콘)

---

## 7. 데이터베이스 마이그레이션

### 7.1 applications 테이블

**파일**: `supabase/migrations/0006_create_applications_table.sql`

```sql
CREATE TYPE application_status_enum AS ENUM ('신청완료', '선정', '반려');

CREATE TABLE IF NOT EXISTS public.applications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id bigint NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  message text NOT NULL,
  visit_date date NOT NULL,
  status application_status_enum NOT NULL DEFAULT '신청완료',
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_unique_application UNIQUE (campaign_id, influencer_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_applications_campaign_id ON public.applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_influencer_id ON public.applications(influencer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications(applied_at DESC);

-- updated_at 트리거
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS 비활성화
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- 테이블 설명
COMMENT ON TABLE public.applications IS '인플루언서가 체험단에 지원한 내역을 저장하는 테이블. 중복 지원을 방지하고 선정 상태를 관리합니다.';
COMMENT ON COLUMN public.applications.id IS '지원서 고유 식별자';
COMMENT ON COLUMN public.applications.campaign_id IS '지원한 체험단 ID (외래키)';
COMMENT ON COLUMN public.applications.influencer_id IS '지원한 인플루언서 ID (외래키)';
COMMENT ON COLUMN public.applications.message IS '각오 한마디';
COMMENT ON COLUMN public.applications.visit_date IS '방문 예정일';
COMMENT ON COLUMN public.applications.status IS '지원 상태 (신청완료, 선정, 반려)';
COMMENT ON COLUMN public.applications.applied_at IS '지원 시각';
COMMENT ON COLUMN public.applications.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN public.applications.updated_at IS '레코드 수정 시각 (트리거로 자동 업데이트)';
```

### 7.2 마이그레이션 적용

```bash
# 사용자가 Supabase에 직접 적용
# SQL Editor에 위 스크립트 복사 후 실행
```

---

## 8. 에러 처리

### 8.1 백엔드 에러 코드

| 에러 코드 | HTTP 상태 | 메시지 | 사용자 액션 |
|----------|-----------|--------|-----------|
| `UNAUTHORIZED` | 401 | 로그인이 필요합니다 | 로그인 페이지로 리다이렉트 |
| `INVALID_REQUEST` | 400 | 요청 데이터가 유효하지 않습니다 | 폼 필드별 에러 표시 |
| `PROFILE_NOT_FOUND` | 403 | 인플루언서 프로필을 먼저 등록해주세요 | 온보딩 페이지로 리다이렉트 |
| `CAMPAIGN_NOT_FOUND` | 404 | 존재하지 않는 체험단입니다 | 홈으로 리다이렉트 |
| `CAMPAIGN_CLOSED` | 403 | 모집이 종료된 체험단입니다 | 체험단 상세 페이지로 리다이렉트 |
| `ALREADY_APPLIED` | 409 | 이미 지원한 체험단입니다 | 내 지원 목록으로 리다이렉트 |
| `DATABASE_ERROR` | 500 | 데이터베이스 오류가 발생했습니다 | 재시도 버튼 표시 |
| `CREATE_FAILED` | 500 | 지원서 제출에 실패했습니다 | 재시도 버튼 표시 |

### 8.2 프론트엔드 에러 처리

#### 8.2.1 클라이언트 검증 에러
- React Hook Form이 실시간으로 필드별 에러 표시
- Zod 스키마로 타입 안전성 보장

#### 8.2.2 서버 에러 처리
- `extractApiErrorMessage` 헬퍼로 에러 메시지 추출
- Toast 컴포넌트로 사용자에게 알림
- 적절한 페이지로 리다이렉트

---

## 9. 테스트 시나리오

### 9.1 성공 케이스

| 테스트 ID | 시나리오 | 입력 | 기대 결과 |
|----------|---------|------|----------|
| TC-001 | 정상 지원 | 각오: 50자, 방문일: 내일 | 201 Created, 지원서 생성 성공 |
| TC-002 | 최소 길이 | 각오: 10자, 방문일: 내일 | 201 Created, 지원서 생성 성공 |
| TC-003 | 최대 길이 | 각오: 500자, 방문일: 1개월 후 | 201 Created, 지원서 생성 성공 |

### 9.2 실패 케이스

| 테스트 ID | 시나리오 | 입력 | 기대 결과 |
|----------|---------|------|----------|
| TC-004 | 각오 한마디 부족 | 각오: 5자 | 400, "10자 이상이어야 합니다" |
| TC-005 | 각오 한마디 초과 | 각오: 600자 | 400, "500자 이하여야 합니다" |
| TC-006 | 과거 방문일 | 방문일: 어제 | 400, "오늘 이후 날짜를 선택해주세요" |
| TC-007 | 중복 지원 | 이미 지원한 체험단 | 409, "이미 지원한 체험단입니다" |
| TC-008 | 모집 종료 | 모집종료된 체험단 | 403, "모집이 종료된 체험단입니다" |
| TC-009 | 비로그인 | 세션 없음 | 401 → 로그인 페이지로 리다이렉트 |
| TC-010 | 프로필 미등록 | 인플루언서 정보 없음 | 403 → 온보딩 페이지로 리다이렉트 |
| TC-011 | 광고주 계정 | 역할: advertiser | 403 → 체험단 상세 페이지로 리다이렉트 |

---

## 10. 체크리스트

### 10.1 구현 전 확인 사항

- [ ] `applications` 테이블 마이그레이션 완료
- [ ] `campaigns` 테이블 존재 확인
- [ ] `influencers` 테이블 존재 확인
- [ ] `/api/profile` 엔드포인트 구현 완료
- [ ] `CurrentUser` 타입에 `role`, `hasProfile` 필드 추가
- [ ] shadcn-ui 컴포넌트 설치 (calendar, popover, skeleton)

### 10.2 백엔드 구현 체크리스트

- [ ] `src/features/application/backend/route.ts` 구현
- [ ] `src/features/application/backend/service.ts` 구현
- [ ] `src/features/application/backend/schema.ts` 구현
- [ ] `src/features/application/backend/error.ts` 구현
- [ ] `src/backend/hono/app.ts`에 라우터 등록
- [ ] Supabase 세션 인증 검증
- [ ] 인플루언서 ID 조회 로직
- [ ] 체험단 상태 확인 로직
- [ ] 중복 지원 확인 로직
- [ ] 에러 처리 및 로깅

### 10.3 프론트엔드 구현 체크리스트

- [ ] `src/app/campaigns/[id]/apply/page.tsx` 구현
- [ ] `src/features/application/components/campaign-application-form.tsx` 구현
- [ ] `src/features/application/components/campaign-summary-card.tsx` 구현
- [ ] `src/features/application/hooks/useApplyCampaign.ts` 구현
- [ ] `src/features/application/hooks/useCampaignDetail.ts` 구현
- [ ] `src/features/application/lib/dto.ts` 구현
- [ ] 권한 및 자격 검증 (인증, 역할, 프로필)
- [ ] 모집 상태 검증
- [ ] React Hook Form 통합
- [ ] Zod 클라이언트 검증
- [ ] 실시간 유효성 검증
- [ ] 성공/실패 토스트 메시지
- [ ] 적절한 페이지 리다이렉트
- [ ] 로딩 및 에러 상태 처리

### 10.4 테스트 체크리스트

- [ ] 정상 지원 시나리오
- [ ] 각오 한마디 길이 검증 (최소/최대)
- [ ] 방문 예정일 검증 (과거 날짜)
- [ ] 중복 지원 방지
- [ ] 모집 종료 체험단 지원 시도
- [ ] 비로그인 상태 접근
- [ ] 인플루언서 정보 미등록 상태 접근
- [ ] 광고주 계정으로 접근
- [ ] 네트워크 오류 처리
- [ ] 캐시 무효화 확인

---

## 11. 코드 충돌 방지

### 11.1 기존 코드베이스와의 충돌 확인

#### 11.1.1 백엔드
- ✅ `src/features/example/backend/route.ts` - 충돌 없음 (별도 feature 폴더)
- ✅ `src/backend/hono/app.ts` - 라우터 등록 추가만 필요
- ✅ 공통 미들웨어 - 재사용 (수정 없음)

#### 11.1.2 프론트엔드
- ✅ `src/features/auth/` - 재사용 (수정 없음)
- ⚠️ `CurrentUser` 타입 - `role`, `hasProfile` 필드 추가 필요
- ✅ 공통 UI 컴포넌트 - 재사용 (수정 없음)

### 11.2 명명 규칙

- Feature 폴더: `src/features/application/`
- 라우터 등록 함수: `registerApplicationRoutes`
- 서비스 함수: `createApplication`, `getApplicationById` 등
- 에러 코드: `ApplicationErrorCodes`
- React Hook: `useApplyCampaign`, `useCampaignDetail`
- 컴포넌트: `CampaignApplicationForm`, `CampaignSummaryCard`

---

## 12. 구현 순서

### Phase 1: 데이터베이스 준비
1. ✅ `campaigns` 테이블 확인
2. ✅ `influencers` 테이블 확인
3. ⚠️ `applications` 테이블 마이그레이션 실행

### Phase 2: 백엔드 구현
1. `src/features/application/backend/error.ts` 작성
2. `src/features/application/backend/schema.ts` 작성
3. `src/features/application/backend/service.ts` 작성
4. `src/features/application/backend/route.ts` 작성
5. `src/backend/hono/app.ts`에 라우터 등록
6. `src/features/application/lib/dto.ts` 작성

### Phase 3: 프론트엔드 공통 모듈
1. shadcn-ui 컴포넌트 추가 (calendar, popover, skeleton)
2. `useCampaignDetail` 훅 구현 (또는 campaigns feature에서 재사용)
3. `useApplyCampaign` 훅 구현

### Phase 4: 프론트엔드 페이지 구현
1. `campaign-summary-card.tsx` 컴포넌트 구현
2. `campaign-application-form.tsx` 컴포넌트 구현
3. `page.tsx` 구현 (권한 검증, 레이아웃)

### Phase 5: 테스트 및 검증
1. 로컬 환경에서 전체 플로우 테스트
2. 에러 케이스 테스트
3. 캐시 무효화 확인

---

## 13. 참고 사항

### 13.1 DRY 원칙 준수

- **HTTP 응답 헬퍼 재사용**: `success`, `failure`, `respond`
- **공통 미들웨어 재사용**: `withSupabase`, `errorBoundary`
- **API 클라이언트 재사용**: `apiClient`, `extractApiErrorMessage`
- **UI 컴포넌트 재사용**: shadcn-ui 컴포넌트
- **Zod 스키마 공유**: 백엔드/프론트엔드 간 타입 안전성 보장

### 13.2 코드 스타일

- **TypeScript**: strict 모드 사용
- **파일명**: kebab-case (예: `campaign-application-form.tsx`)
- **컴포넌트명**: PascalCase (예: `CampaignApplicationForm`)
- **함수명**: camelCase (예: `createApplication`)
- **상수**: UPPER_SNAKE_CASE (예: `APPLICATION_ERROR_CODES`)

### 13.3 성능 고려사항

- **React Query 캐싱**: staleTime 5분 설정
- **낙관적 업데이트**: 미적용 (데이터 무결성 우선)
- **인덱스 활용**: `campaign_id`, `influencer_id`로 빠른 조회
- **유니크 제약**: DB 레벨에서 중복 지원 방지

---

## 14. 완료 기준

### 14.1 기능 완료 기준

- [ ] 인플루언서가 체험단 지원서를 작성하고 제출할 수 있다
- [ ] 각오 한마디 및 방문 예정일 유효성 검증이 작동한다
- [ ] 중복 지원이 방지된다
- [ ] 비로그인 사용자는 로그인 페이지로 리다이렉트된다
- [ ] 인플루언서 정보 미등록 사용자는 온보딩 페이지로 리다이렉트된다
- [ ] 광고주는 지원 페이지에 접근할 수 없다
- [ ] 모집 종료된 체험단은 지원할 수 없다
- [ ] 지원 성공 시 "내 지원 목록" 페이지로 리다이렉트된다

### 14.2 품질 기준

- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] 모든 에러 케이스 처리됨
- [ ] 로딩 및 에러 상태 UI 구현됨
- [ ] 접근성 기준 충족 (키보드 네비게이션, 포커스 관리)
- [ ] 반응형 디자인 (모바일, 태블릿, 데스크톱)

---

## 15. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
