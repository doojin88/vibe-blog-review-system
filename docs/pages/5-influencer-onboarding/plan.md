# 인플루언서 정보 등록 페이지 구현 계획

## 1. 개요

### 1.1 페이지 정보
- **경로**: `/onboarding/influencer`
- **목적**: 회원가입 후 인플루언서 역할을 선택한 사용자의 프로필 정보 등록
- **접근 권한**: 로그인한 사용자 중 인플루언서 역할 선택 완료자만 접근 가능
- **우선순위**: P0 (MVP 필수)

### 1.2 참고 문서
- **PRD**: `/docs/prd.md` - 섹션 3.2.1
- **Userflow**: `/docs/userflow.md` - 섹션 1.1.3
- **Usecase**: `/docs/usecases/2-influencer-profile-registration/spec.md`
- **Database**: `/docs/database.md` - 섹션 4.2
- **Common Modules**: `/docs/common-modules.md`

### 1.3 설계 원칙
- **DRY 준수**: 공통 모듈 적극 활용 (유틸리티 함수, UI 컴포넌트)
- **타입 안전성**: Zod 스키마 기반 서버/클라이언트 검증
- **사용자 경험**: 실시간 검증, 명확한 에러 메시지, 부드러운 전환
- **코드베이스 준수**: CLAUDE.md 가이드라인 엄격히 따름

---

## 2. 기능 요구사항

### 2.1 핵심 기능
1. **인플루언서 정보 입력 폼**
   - 공통 정보: 이름, 생년월일, 휴대폰번호
   - 인플루언서 정보: SNS 채널명, 채널 링크, 팔로워 수
2. **실시간 유효성 검증**
   - 클라이언트: React Hook Form + Zod
   - 서버: Zod 스키마로 2차 검증
3. **중복 등록 방지**
   - 이미 등록된 사용자는 자동으로 홈으로 리다이렉트
4. **성공 시 처리**
   - 토스트 메시지 표시
   - 홈 페이지로 리다이렉트
   - React Query 캐시 무효화

### 2.2 비기능 요구사항
- **성능**: 페이지 로딩 2초 이내, API 응답 300ms 이내
- **보안**: 서버 사이드 검증 필수, SQL Injection/XSS 방지
- **접근성**: 키보드 네비게이션, 스크린 리더 호환
- **반응형**: 모바일 우선 디자인 (320px~)

---

## 3. 데이터 플로우

### 3.1 입력 데이터
```typescript
{
  name: string;              // 이름 (필수, 2자 이상)
  birth_date: string;        // 생년월일 (필수, YYYY-MM-DD, 만 14세 이상)
  phone: string;             // 휴대폰번호 (필수, 01XXXXXXXXX)
  channel_name: string;      // SNS 채널명 (필수, 1자 이상)
  channel_link: string;      // 채널 링크 (필수, URL 형식)
  followers_count: number;   // 팔로워 수 (필수, 0 이상 정수)
}
```

### 3.2 처리 흐름
```
[사용자 입력]
    ↓
[클라이언트 검증] (React Hook Form + Zod)
    ↓
[POST /api/influencers] (API 호출)
    ↓
[서버 검증] (Zod 스키마)
    ↓
[인증 확인] (Supabase Auth)
    ↓
[중복 확인] (influencers 테이블 조회)
    ↓
[데이터 삽입] (INSERT INTO influencers)
    ↓
[성공 응답] (200 OK)
    ↓
[토스트 + 리다이렉트] (홈 페이지)
```

### 3.3 출력 데이터 (성공 시)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": "uuid",
    "name": "홍길동",
    "birth_date": "1995-05-15",
    "phone": "01012345678",
    "channel_name": "길동TV",
    "channel_link": "https://youtube.com/@gildongtv",
    "followers_count": 5000,
    "created_at": "2025-11-14T12:00:00Z",
    "updated_at": "2025-11-14T12:00:00Z"
  },
  "message": "인플루언서 정보가 등록되었습니다"
}
```

---

## 4. 구현 단계

### Phase 1: 백엔드 API 구현

#### 4.1.1 Zod 스키마 정의
**파일**: `src/features/influencers/backend/schema.ts`

**내용**:
```typescript
import { z } from 'zod';
import { subYears } from 'date-fns';

// 만 14세 이상 검증 헬퍼
const isAtLeast14YearsOld = (birthDate: string) => {
  const date = new Date(birthDate);
  const minAge = subYears(new Date(), 14);
  return date <= minAge;
};

// 휴대폰번호 형식 검증 (01XXXXXXXXX)
const phoneRegex = /^01[0-9]{8,9}$/;

// URL 형식 검증
const urlRegex = /^https?:\/\/.+/;

export const createInfluencerSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)')
    .refine(isAtLeast14YearsOld, '만 14세 이상만 가입할 수 있습니다'),
  phone: z.string()
    .regex(phoneRegex, '올바른 휴대폰번호 형식을 입력해주세요 (예: 01012345678)'),
  channel_name: z.string().min(1, 'SNS 채널명을 입력해주세요'),
  channel_link: z.string()
    .regex(urlRegex, '올바른 URL 형식을 입력해주세요 (예: https://...)'),
  followers_count: z.number()
    .int('팔로워 수는 정수여야 합니다')
    .min(0, '팔로워 수는 0 이상이어야 합니다'),
});

export type CreateInfluencerInput = z.infer<typeof createInfluencerSchema>;

export const influencerResponseSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  name: z.string(),
  birth_date: z.string(),
  phone: z.string(),
  channel_name: z.string(),
  channel_link: z.string(),
  followers_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type InfluencerResponse = z.infer<typeof influencerResponseSchema>;
```

**검증 사항**:
- ✅ `date-fns` 라이브러리 활용 (공통 모듈 확인 완료)
- ✅ Zod 스키마로 타입 안전성 보장
- ✅ 명확한 에러 메시지 제공

---

#### 4.1.2 에러 코드 정의
**파일**: `src/features/influencers/backend/error.ts`

**내용**:
```typescript
export const InfluencerErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_PROFILE: 'DUPLICATE_PROFILE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type InfluencerErrorCode = typeof InfluencerErrorCodes[keyof typeof InfluencerErrorCodes];
```

**검증 사항**:
- ✅ 일관된 에러 코드 네이밍
- ✅ 타입 안전한 에러 코드 사용

---

#### 4.1.3 서비스 로직 구현
**파일**: `src/features/influencers/backend/service.ts`

**내용**:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateInfluencerInput, InfluencerResponse } from './schema';

/**
 * 인플루언서 프로필 생성
 */
export async function createInfluencerProfile(
  supabase: SupabaseClient,
  userId: string,
  input: CreateInfluencerInput
): Promise<InfluencerResponse> {
  // 중복 확인
  const { data: existing, error: checkError } = await supabase
    .from('influencers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    throw new Error('DUPLICATE_PROFILE');
  }

  // 삽입
  const { data, error } = await supabase
    .from('influencers')
    .insert({
      user_id: userId,
      name: input.name,
      birth_date: input.birth_date,
      phone: input.phone,
      channel_name: input.channel_name,
      channel_link: input.channel_link,
      followers_count: input.followers_count,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as InfluencerResponse;
}

/**
 * 인플루언서 프로필 조회 (user_id 기준)
 */
export async function getInfluencerByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<InfluencerResponse | null> {
  const { data, error } = await supabase
    .from('influencers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116: 결과 없음 (정상)
    throw error;
  }

  return data as InfluencerResponse | null;
}
```

**검증 사항**:
- ✅ Supabase 클라이언트 활용 (공통 모듈)
- ✅ 중복 확인 로직 포함
- ✅ 에러 핸들링 명확화

---

#### 4.1.4 Hono 라우터 구현
**파일**: `src/features/influencers/backend/route.ts`

**내용**:
```typescript
import { Hono } from 'hono';
import type { AppContext } from '@/backend/hono/context';
import { success, failure, respond } from '@/backend/http/response';
import { createInfluencerSchema } from './schema';
import { createInfluencerProfile } from './service';
import { InfluencerErrorCodes } from './error';

const app = new Hono<AppContext>();

/**
 * POST /api/influencers
 * 인플루언서 프로필 생성
 */
app.post('/', async (c) => {
  try {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, InfluencerErrorCodes.UNAUTHORIZED, '로그인이 필요합니다')
      );
    }

    // 2. 요청 데이터 파싱 및 검증
    const body = await c.req.json();
    const parseResult = createInfluencerSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return respond(
        c,
        failure(
          400,
          InfluencerErrorCodes.VALIDATION_ERROR,
          '입력 데이터가 유효하지 않습니다',
          errors
        )
      );
    }

    // 3. 프로필 생성
    const profile = await createInfluencerProfile(
      supabase,
      user.id,
      parseResult.data
    );

    logger.info('Influencer profile created', { userId: user.id, profileId: profile.id });

    return respond(
      c,
      success(profile, 200)
    );
  } catch (error) {
    const logger = c.get('logger');
    logger.error('Failed to create influencer profile', error);

    // 중복 등록 에러
    if (error instanceof Error && error.message === 'DUPLICATE_PROFILE') {
      return respond(
        c,
        failure(409, InfluencerErrorCodes.DUPLICATE_PROFILE, '이미 등록된 정보가 있습니다')
      );
    }

    return respond(
      c,
      failure(500, InfluencerErrorCodes.INTERNAL_ERROR, '프로필 등록에 실패했습니다')
    );
  }
});

export default app;
```

**검증 사항**:
- ✅ Hono 앱 컨텍스트 활용 (공통 모듈)
- ✅ `success`/`failure`/`respond` 헬퍼 사용
- ✅ 에러 핸들링 체계적으로 구현
- ✅ 로거 활용

---

#### 4.1.5 Hono 앱에 라우터 등록
**파일**: `src/backend/hono/app.ts` (수정)

**변경 사항**:
```typescript
// ... 기존 import
import influencersRoutes from '@/features/influencers/backend/route';

export function createHonoApp() {
  // ... 기존 코드

  // Register routes
  app.route('/api/profile', profileRoutes);
  app.route('/api/influencers', influencersRoutes); // 추가
  app.route('/api/example', exampleRoutes);

  return app;
}
```

**검증 사항**:
- ✅ 라우터 경로 충돌 없음 (`/api/influencers`)
- ✅ 기존 라우터 구조와 일관성 유지

---

### Phase 2: 프론트엔드 구현

#### 4.2.1 DTO 재노출
**파일**: `src/features/influencers/lib/dto.ts`

**내용**:
```typescript
export {
  createInfluencerSchema,
  type CreateInfluencerInput,
  type InfluencerResponse,
} from '../backend/schema';
```

**검증 사항**:
- ✅ DRY 준수 (백엔드 스키마 재사용)
- ✅ 프론트엔드에서 타입 안전성 확보

---

#### 4.2.2 React Query 훅 구현
**파일**: `src/features/influencers/hooks/useCreateInfluencer.ts`

**내용**:
```typescript
'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CreateInfluencerInput, InfluencerResponse } from '../lib/dto';

export function useCreateInfluencer() {
  return useMutation({
    mutationFn: async (input: CreateInfluencerInput) => {
      const response = await apiClient.post<{ data: InfluencerResponse }>(
        '/api/influencers',
        input
      );
      return response.data.data;
    },
  });
}
```

**검증 사항**:
- ✅ `apiClient` 활용 (공통 모듈)
- ✅ React Query 패턴 준수
- ✅ `'use client'` 디렉티브 사용

---

#### 4.2.3 페이지 컴포넌트 구현
**파일**: `src/app/onboarding/influencer/page.tsx`

**내용**:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useCreateInfluencer } from '@/features/influencers/hooks/useCreateInfluencer';
import { createInfluencerSchema, type CreateInfluencerInput } from '@/features/influencers/lib/dto';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export default function InfluencerOnboardingPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const createInfluencer = useCreateInfluencer();

  const form = useForm<CreateInfluencerInput>({
    resolver: zodResolver(createInfluencerSchema),
    defaultValues: {
      name: '',
      birth_date: '',
      phone: '',
      channel_name: '',
      channel_link: '',
      followers_count: 0,
    },
  });

  // 비로그인 사용자 리다이렉트
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/onboarding/influencer');
    }
  }, [user, isUserLoading, router]);

  // 이미 등록된 사용자 리다이렉트
  useEffect(() => {
    if (!isUserLoading && user?.role === 'influencer' && user?.hasProfile) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (data: CreateInfluencerInput) => {
    try {
      await createInfluencer.mutateAsync(data);
      toast.success('인플루언서 정보가 등록되었습니다');
      router.push('/');
    } catch (error) {
      toast.error('프로필 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (isUserLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>인플루언서 정보 등록</CardTitle>
          <CardDescription>
            체험단 지원을 위해 프로필을 완성해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 이름 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 생년월일 */}
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>생년월일 *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 휴대폰번호 */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>휴대폰번호 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="01012345678"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SNS 채널명 */}
              <FormField
                control={form.control}
                name="channel_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SNS 채널명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="길동TV" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 채널 링크 */}
              <FormField
                control={form.control}
                name="channel_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>채널 링크 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/@gildongtv"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 팔로워 수 */}
              <FormField
                control={form.control}
                name="followers_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>팔로워 수 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="w-full"
                disabled={createInfluencer.isPending}
              >
                {createInfluencer.isPending ? '처리 중...' : '등록 완료'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**검증 사항**:
- ✅ `'use client'` 디렉티브 사용 (프로젝트 요구사항)
- ✅ React Hook Form + Zod Resolver 사용
- ✅ shadcn-ui 컴포넌트 활용
- ✅ `useCurrentUser` 훅으로 인증 상태 확인
- ✅ 비로그인/이미 등록된 사용자 리다이렉트
- ✅ 토스트 메시지 표시 (sonner)

---

### Phase 3: 인증 컨텍스트 확장

#### 4.3.1 CurrentUser 타입 확장
**파일**: `src/features/auth/types.ts` (수정)

**변경 사항**:
```typescript
export interface CurrentUser {
  id: string;
  email: string;
  role: 'advertiser' | 'influencer' | null;  // 추가
  hasProfile: boolean;                       // 추가
}

export interface CurrentUserSnapshot {
  user: CurrentUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}
```

**검증 사항**:
- ✅ 역할 정보 포함
- ✅ 프로필 등록 여부 포함

---

#### 4.3.2 loadCurrentUser 개선
**파일**: `src/features/auth/server/load-current-user.ts` (수정)

**변경 사항**:
```typescript
import { createSupabaseServerClient } from '@/backend/supabase/client';
import type { CurrentUserSnapshot } from '../types';

export async function loadCurrentUser(): Promise<CurrentUserSnapshot> {
  const supabase = createSupabaseServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      status: 'unauthenticated',
    };
  }

  // 역할 및 프로필 조회
  const [advertiser, influencer] = await Promise.all([
    supabase.from('advertisers').select('id').eq('user_id', user.id).single(),
    supabase.from('influencers').select('id').eq('user_id', user.id).single(),
  ]);

  let role: 'advertiser' | 'influencer' | null = null;
  let hasProfile = false;

  if (advertiser.data) {
    role = 'advertiser';
    hasProfile = true;
  } else if (influencer.data) {
    role = 'influencer';
    hasProfile = true;
  }

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role,
      hasProfile,
    },
    status: 'authenticated',
  };
}
```

**검증 사항**:
- ✅ 역할 및 프로필 정보 서버 사이드에서 로드
- ✅ 병렬 쿼리로 성능 최적화

---

#### 4.3.3 profile API 응답 개선
**파일**: `src/features/profile/backend/service.ts` (수정)

**변경 사항**:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const [advertiser, influencer] = await Promise.all([
    supabase.from('advertisers').select('*').eq('user_id', userId).single(),
    supabase.from('influencers').select('*').eq('user_id', userId).single(),
  ]);

  if (advertiser.data) {
    return {
      role: 'advertiser' as const,
      hasProfile: true,
      profile: advertiser.data,
    };
  }

  if (influencer.data) {
    return {
      role: 'influencer' as const,
      hasProfile: true,
      profile: influencer.data,
    };
  }

  return {
    role: null,
    hasProfile: false,
    profile: null,
  };
}
```

**검증 사항**:
- ✅ 역할 및 프로필 정보 반환
- ✅ 병렬 쿼리로 성능 최적화

---

### Phase 4: 추가 UI 컴포넌트

#### 4.4.1 필요한 shadcn-ui 컴포넌트 확인

**이미 설치된 컴포넌트** (확인 완료):
- ✅ button, input, label, form
- ✅ card, badge, toast, toaster
- ✅ select, textarea, checkbox
- ✅ sheet (모바일 네비게이션용)

**추가 설치 필요**:
- 🔄 dialog (향후 체험단 등록에 사용)
- 🔄 table (향후 신청자 리스트에 사용)

**설치 명령어** (사용자가 실행):
```bash
npx shadcn@latest add dialog
npx shadcn@latest add table
```

**검증 사항**:
- ✅ 현재 페이지 구현에 필요한 컴포넌트는 모두 설치됨
- 🔄 향후 페이지를 위한 컴포넌트는 사용자가 설치

---

## 5. 에러 처리 전략

### 5.1 클라이언트 사이드 에러

#### 5.1.1 유효성 검증 실패
- **처리**: React Hook Form이 필드별 에러 메시지 표시
- **UI**: 필드 하단에 빨간색 텍스트로 에러 메시지
- **사용자 액션**: 제출 버튼 비활성화 (모든 필드 유효할 때까지)

#### 5.1.2 네트워크 오류
- **처리**: React Query의 retry 로직 (최대 3회)
- **UI**: 토스트 메시지 "일시적인 오류가 발생했습니다"
- **사용자 액션**: 재시도 가능

### 5.2 서버 사이드 에러

#### 5.2.1 401 Unauthorized
- **처리**: 로그인 페이지로 리다이렉트
- **UI**: 토스트 메시지 "로그인이 필요합니다"

#### 5.2.2 400 Bad Request (검증 오류)
- **처리**: 필드별 에러 메시지 추출하여 표시
- **UI**: 각 필드 하단에 에러 메시지

#### 5.2.3 409 Conflict (중복 등록)
- **처리**: 홈 페이지로 리다이렉트
- **UI**: 토스트 메시지 "이미 등록된 정보가 있습니다"

#### 5.2.4 500 Internal Server Error
- **처리**: 에러 로깅 + 사용자 친화적 메시지
- **UI**: 토스트 메시지 "프로필 등록에 실패했습니다. 다시 시도해주세요."

---

## 6. 테스트 전략

### 6.1 단위 테스트 (선택사항)
- Zod 스키마 검증 테스트
- 서비스 로직 테스트 (Supabase 모킹)

### 6.2 통합 테스트 (선택사항)
- API 엔드포인트 테스트
- 페이지 렌더링 및 폼 제출 테스트

### 6.3 수동 테스트 (필수)

#### 6.3.1 성공 케이스
- [ ] 유효한 모든 필드 입력 → 200 OK, 홈 리다이렉트
- [ ] 팔로워 수 0 입력 → 정상 처리
- [ ] 생년월일 만 14세 정확히 → 정상 처리

#### 6.3.2 실패 케이스
- [ ] 이름 1자 입력 → 에러 메시지 "이름은 2자 이상이어야 합니다"
- [ ] 생년월일 만 13세 → 에러 메시지 "만 14세 이상만 가입할 수 있습니다"
- [ ] 휴대폰번호 형식 오류 → 에러 메시지
- [ ] 채널 링크 형식 오류 → 에러 메시지
- [ ] 팔로워 수 음수 → 에러 메시지
- [ ] 이미 등록된 사용자 재제출 → 409 Conflict

#### 6.3.3 엣지 케이스
- [ ] 비로그인 상태 접근 → 로그인 페이지 리다이렉트
- [ ] 제출 버튼 연속 클릭 → 중복 제출 방지
- [ ] 네트워크 연결 끊김 → 재시도 로직 작동

---

## 7. 파일 구조 요약

```
src/
├── app/
│   └── onboarding/
│       └── influencer/
│           └── page.tsx                    # 페이지 컴포넌트
├── features/
│   ├── influencers/
│   │   ├── backend/
│   │   │   ├── route.ts                    # Hono 라우터
│   │   │   ├── service.ts                  # Supabase 서비스 로직
│   │   │   ├── schema.ts                   # Zod 스키마
│   │   │   └── error.ts                    # 에러 코드
│   │   ├── hooks/
│   │   │   └── useCreateInfluencer.ts      # React Query 훅
│   │   └── lib/
│   │       └── dto.ts                      # DTO 재노출
│   ├── auth/
│   │   ├── types.ts                        # CurrentUser 타입 (수정)
│   │   └── server/
│   │       └── load-current-user.ts        # 서버 사이드 로드 (수정)
│   └── profile/
│       └── backend/
│           └── service.ts                  # 역할 조회 로직 (수정)
└── backend/
    └── hono/
        └── app.ts                          # 라우터 등록 (수정)
```

---

## 8. 구현 체크리스트

### 8.1 백엔드 (Phase 1)
- [ ] `src/features/influencers/backend/schema.ts` 작성
- [ ] `src/features/influencers/backend/error.ts` 작성
- [ ] `src/features/influencers/backend/service.ts` 작성
- [ ] `src/features/influencers/backend/route.ts` 작성
- [ ] `src/backend/hono/app.ts` 라우터 등록

### 8.2 프론트엔드 (Phase 2)
- [ ] `src/features/influencers/lib/dto.ts` 작성
- [ ] `src/features/influencers/hooks/useCreateInfluencer.ts` 작성
- [ ] `src/app/onboarding/influencer/page.tsx` 작성

### 8.3 인증 컨텍스트 확장 (Phase 3)
- [ ] `src/features/auth/types.ts` 수정
- [ ] `src/features/auth/server/load-current-user.ts` 수정
- [ ] `src/features/profile/backend/service.ts` 수정

### 8.4 테스트 (Phase 4)
- [ ] 수동 테스트 실행 (섹션 6.3 참고)
- [ ] 에러 케이스 모두 확인
- [ ] 리다이렉트 동작 확인

---

## 9. 주의사항

### 9.1 코드 충돌 방지
- ✅ `/api/influencers` 경로는 현재 사용되지 않음 (확인 완료)
- ✅ `src/features/influencers/` 폴더는 신규 생성
- ✅ 기존 `profile` 서비스 로직 수정 시 API 응답 형식 유지

### 9.2 DRY 준수
- ✅ Zod 스키마를 클라이언트/서버에서 공유
- ✅ 공통 유틸리티 함수 활용 (`date-fns`)
- ✅ shadcn-ui 컴포넌트 재사용

### 9.3 타입 안전성
- ✅ 모든 API 응답에 타입 정의
- ✅ Zod 스키마로 런타임 검증
- ✅ TypeScript strict 모드 활용

---

## 10. 향후 개선 사항

### 10.1 1차 범위 제외 기능
- 프로필 수정 페이지
- 프로필 이미지 업로드
- 휴대폰번호 자동 포맷팅
- Date Picker UI 개선 (Popover 기반)

### 10.2 성능 최적화
- 페이지 로딩 스켈레톤 UI
- 폼 입력 debounce 적용
- React Query 캐시 전략 최적화

---

## 11. 참고 자료

### 11.1 공통 모듈 확인 사항
- ✅ `/api/profile` 엔드포인트 존재 (역할 조회용)
- ✅ `useCurrentUser` 훅 존재
- ✅ `apiClient` 존재
- ✅ shadcn-ui 기본 컴포넌트 설치됨
- ✅ 유틸리티 함수 (`date-fns`, `format.ts`) 존재

### 11.2 데이터베이스 마이그레이션
- ✅ `influencers` 테이블 생성 완료 (0004_create_influencers_table.sql)
- ✅ ENUM 타입 생성 완료 (0002_create_enums.sql)
- ✅ 인덱스 생성 완료 (0008_create_indexes.sql)
- ✅ RLS 비활성화 완료 (0009_disable_rls.sql)

### 11.3 관련 문서
- PRD: `/docs/prd.md` - 섹션 3.2.1
- Userflow: `/docs/userflow.md` - 섹션 1.1.3
- Usecase: `/docs/usecases/2-influencer-profile-registration/spec.md`
- Database: `/docs/database.md` - 섹션 4.2
- Common Modules: `/docs/common-modules.md`

---

## 12. 완성 조건

이 페이지 구현이 완료되었다고 판단하는 기준:

1. **백엔드 API 동작 확인**
   - `POST /api/influencers` 엔드포인트 정상 응답
   - 중복 등록 방지 동작 확인
   - 에러 핸들링 정상 동작

2. **프론트엔드 UI 동작 확인**
   - 폼 렌더링 정상
   - 실시간 검증 동작
   - 제출 시 홈 리다이렉트
   - 토스트 메시지 표시

3. **인증 플로우 확인**
   - 비로그인 사용자 리다이렉트
   - 이미 등록된 사용자 리다이렉트
   - `useCurrentUser` 훅에서 역할 정보 확인

4. **테스트 완료**
   - 섹션 6.3의 모든 테스트 케이스 통과

---

## 13. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
