# 광고주 정보 등록 페이지 구현 계획

## 1. 개요

### 1.1 페이지 정보
- **경로**: `/onboarding/advertiser`
- **목적**: 회원가입 후 광고주 역할을 선택한 사용자의 사업자 정보 등록
- **유스케이스**: UC-006 광고주 정보 등록
- **우선순위**: P0 (MVP 필수)

### 1.2 참고 문서
- PRD: `/docs/prd.md` (섹션 3.3.1)
- Userflow: `/docs/userflow.md` (섹션 2.1.3)
- Usecase: `/docs/usecases/6-advertiser-profile-registration/spec.md`
- Database: `/docs/database.md` (섹션 4.1)
- Common Modules: `/docs/common-modules.md`

### 1.3 선행 조건
- ✅ 데이터베이스 `advertisers` 테이블 생성 완료
- ✅ 백엔드 공통 모듈 (Hono, 미들웨어, HTTP 헬퍼) 구현 완료
- ✅ `/api/profile` 엔드포인트 구현 완료
- ⚠️ shadcn-ui 추가 컴포넌트 필요 (Dialog, Calendar/DatePicker)
- ⚠️ 공통 유틸리티 함수 필요 (날짜 검증, 전화번호/사업자등록번호 포맷팅)

---

## 2. 페이지 구조

### 2.1 화면 구성

#### 2.1.1 레이아웃
```
┌─────────────────────────────────────────┐
│  Header (선택적)                         │
├─────────────────────────────────────────┤
│  Progress Indicator                     │
│  [1.회원가입] → [2.역할선택] → [3.정보입력] │
├─────────────────────────────────────────┤
│  Title: "광고주 정보 등록"                │
│  Subtitle: "체험단 등록을 위해..."         │
├─────────────────────────────────────────┤
│  Section 1: 공통 정보                    │
│  ┌───────────────────────────────────┐  │
│  │ 이름 (Input)                       │  │
│  │ 생년월일 (DatePicker)               │  │
│  │ 휴대폰번호 (Input)                  │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Section 2: 사업자 정보                  │
│  ┌───────────────────────────────────┐  │
│  │ 업체명 (Input)                      │  │
│  │ 주소 (Input)                        │  │
│  │ 업장 전화번호 (Input)                │  │
│  │ 사업자등록번호 (Input)               │  │
│  │ 대표자명 (Input)                     │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  [제출] 버튼                             │
└─────────────────────────────────────────┘
```

#### 2.1.2 반응형 디자인
- **모바일 (320px~767px)**: 1열 레이아웃, 전체 너비 입력 필드
- **태블릿 (768px~1023px)**: 1열 레이아웃, 최대 너비 600px 중앙 정렬
- **데스크톱 (1024px 이상)**: 1열 레이아웃, 최대 너비 800px 중앙 정렬

### 2.2 상태 관리

#### 2.2.1 클라이언트 상태 (React Hook Form)
```typescript
type AdvertiserOnboardingForm = {
  // 공통 정보
  name: string;
  birth_date: string; // YYYY-MM-DD
  phone: string;

  // 사업자 정보
  business_name: string;
  address: string;
  business_phone: string;
  business_registration_number: string;
  representative_name: string;
}
```

#### 2.2.2 서버 상태 (React Query)
- **Mutation**: `useCreateAdvertiserProfile`
  - API: `POST /api/advertisers`
  - onSuccess: `/dashboard` 페이지로 리다이렉트
  - onError: 에러 메시지 표시

#### 2.2.3 전역 상태
- 없음 (모든 상태는 폼 또는 React Query로 관리)

---

## 3. 백엔드 API 구현

### 3.1 파일 구조
```
src/features/advertiser/
├── backend/
│   ├── route.ts          # Hono 라우터 (POST /api/advertisers)
│   ├── service.ts        # Supabase 비즈니스 로직
│   ├── schema.ts         # Zod 스키마 (요청/응답)
│   └── error.ts          # 에러 코드 정의
└── lib/
    └── dto.ts            # 프론트엔드 DTO 재노출
```

### 3.2 API 엔드포인트

#### 3.2.1 POST /api/advertisers

**요청**
```typescript
{
  name: string;             // 이름 (2자 이상)
  birth_date: string;       // 생년월일 (YYYY-MM-DD, 만 19세 이상)
  phone: string;            // 휴대폰번호 (010-XXXX-XXXX)
  business_name: string;    // 업체명
  address: string;          // 주소
  business_phone: string;   // 업장 전화번호
  business_registration_number: string; // 사업자등록번호 (XXX-XX-XXXXX)
  representative_name: string; // 대표자명
}
```

**응답 (성공 - 201 Created)**
```typescript
{
  id: number;
  user_id: string;
  name: string;
  birth_date: string;
  phone: string;
  business_name: string;
  address: string;
  business_phone: string;
  business_registration_number: string;
  representative_name: string;
  created_at: string;
  updated_at: string;
}
```

**응답 (실패)**
- `400 Bad Request`: 유효성 검증 실패
  - `VALIDATION_ERROR`: 필드별 에러 메시지
- `401 Unauthorized`: 인증 실패
  - `UNAUTHORIZED`: "로그인이 필요합니다"
- `409 Conflict`: 중복 등록
  - `ADVERTISER_ALREADY_EXISTS`: "이미 등록된 정보가 있습니다"
- `500 Internal Server Error`: 서버 에러
  - `INTERNAL_ERROR`: "일시적인 오류가 발생했습니다"

### 3.3 Zod 스키마

#### 3.3.1 요청 스키마
```typescript
// src/features/advertiser/backend/schema.ts
import { z } from 'zod';

// 휴대폰번호 형식: 010-XXXX-XXXX
const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

// 사업자등록번호 형식: XXX-XX-XXXXX
const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/;

export const createAdvertiserSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  birth_date: z.string().refine(
    (date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      // 정확한 만 나이 계산
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)
        ? age - 1
        : age;

      return actualAge >= 19;
    },
    { message: '광고주는 만 19세 이상만 가입할 수 있습니다' }
  ),
  phone: z.string().regex(PHONE_REGEX, '휴대폰번호는 010-XXXX-XXXX 형식으로 입력해주세요'),
  business_name: z.string().min(1, '업체명을 입력해주세요'),
  address: z.string().min(1, '주소를 입력해주세요'),
  business_phone: z.string().min(1, '업장 전화번호를 입력해주세요'),
  business_registration_number: z.string().regex(
    BUSINESS_NUMBER_REGEX,
    '사업자등록번호는 XXX-XX-XXXXX 형식으로 입력해주세요'
  ),
  representative_name: z.string().min(1, '대표자명을 입력해주세요'),
});

export type CreateAdvertiserInput = z.infer<typeof createAdvertiserSchema>;
```

#### 3.3.2 응답 스키마
```typescript
export const advertiserSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  name: z.string(),
  birth_date: z.string(),
  phone: z.string(),
  business_name: z.string(),
  address: z.string(),
  business_phone: z.string(),
  business_registration_number: z.string(),
  representative_name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Advertiser = z.infer<typeof advertiserSchema>;
```

### 3.4 Service 로직

#### 3.4.1 createAdvertiser
```typescript
// src/features/advertiser/backend/service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateAdvertiserInput, Advertiser } from './schema';

export async function createAdvertiser(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAdvertiserInput
): Promise<Advertiser> {
  // 1. 중복 등록 확인
  const { data: existingAdvertiser, error: checkError } = await supabase
    .from('advertisers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (existingAdvertiser) {
    throw new Error('ADVERTISER_ALREADY_EXISTS');
  }

  // 2. 광고주 정보 삽입
  const { data, error } = await supabase
    .from('advertisers')
    .insert({
      user_id: userId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Advertiser;
}
```

### 3.5 Route 구현

```typescript
// src/features/advertiser/backend/route.ts
import { Hono } from 'hono';
import type { AppContext } from '@/backend/hono/context';
import { success, failure, respond } from '@/backend/http/response';
import { createAdvertiserSchema } from './schema';
import { createAdvertiser } from './service';
import { AdvertiserErrorCodes } from './error';

const app = new Hono<AppContext>();

app.post('/', async (c) => {
  try {
    const supabase = c.get('supabase');

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, AdvertiserErrorCodes.UNAUTHORIZED, '로그인이 필요합니다')
      );
    }

    // 2. 요청 데이터 검증
    const body = await c.req.json();
    const parseResult = createAdvertiserSchema.safeParse(body);

    if (!parseResult.success) {
      return respond(
        c,
        failure(
          400,
          AdvertiserErrorCodes.VALIDATION_ERROR,
          '입력 데이터가 올바르지 않습니다',
          parseResult.error.flatten().fieldErrors
        )
      );
    }

    // 3. 광고주 정보 생성
    const advertiser = await createAdvertiser(supabase, user.id, parseResult.data);

    return respond(c, success(advertiser, 201));
  } catch (error) {
    const logger = c.get('logger');
    logger.error('Failed to create advertiser', error);

    if (error instanceof Error && error.message === 'ADVERTISER_ALREADY_EXISTS') {
      return respond(
        c,
        failure(409, AdvertiserErrorCodes.ALREADY_EXISTS, '이미 등록된 정보가 있습니다')
      );
    }

    return respond(
      c,
      failure(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다')
    );
  }
});

export default app;
```

### 3.6 에러 코드 정의

```typescript
// src/features/advertiser/backend/error.ts
export const AdvertiserErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ALREADY_EXISTS: 'ADVERTISER_ALREADY_EXISTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

### 3.7 Hono 앱 등록

```typescript
// src/backend/hono/app.ts 에 추가
import advertiserRoutes from '@/features/advertiser/backend/route';

export function createHonoApp() {
  // ... 기존 코드

  // 기능별 라우터 등록
  app.route('/api/advertisers', advertiserRoutes);

  return app;
}
```

---

## 4. 프론트엔드 구현

### 4.1 파일 구조
```
src/features/advertiser/
├── components/
│   ├── advertiser-onboarding-form.tsx   # 메인 폼 컴포넌트
│   └── advertiser-form-fields.tsx       # 재사용 가능한 필드 컴포넌트
├── hooks/
│   └── useCreateAdvertiser.ts           # React Query mutation 훅
└── lib/
    ├── dto.ts                            # schema.ts 재노출
    └── validation.ts                     # 클라이언트 검증 로직

src/app/onboarding/advertiser/
└── page.tsx                              # Next.js 페이지
```

### 4.2 페이지 컴포넌트

```typescript
// src/app/onboarding/advertiser/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { AdvertiserOnboardingForm } from '@/features/advertiser/components/advertiser-onboarding-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdvertiserOnboardingPage() {
  const router = useRouter();
  const { user, status, isAuthenticated } = useCurrentUser();

  // 1. 인증 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?redirect=/onboarding/advertiser');
    }
  }, [status, router]);

  // 2. 이미 프로필이 있는 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (user?.role === 'advertiser' && user?.hasProfile) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // 로딩 중
  if (status === 'loading' || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      {/* Progress Indicator */}
      <div className="mb-8 flex items-center justify-center space-x-4 text-sm">
        <span className="text-muted-foreground">1. 회원가입</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-muted-foreground">2. 역할선택</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold">3. 정보입력</span>
      </div>

      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>광고주 정보 등록</CardTitle>
          <CardDescription>
            체험단 등록 및 관리를 위해 광고주 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvertiserOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 폼 컴포넌트

```typescript
// src/features/advertiser/components/advertiser-onboarding-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAdvertiser } from '../hooks/useCreateAdvertiser';
import { createAdvertiserSchema, type CreateAdvertiserInput } from '../lib/dto';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar'; // 추가 필요
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // 추가 필요
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function AdvertiserOnboardingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const createAdvertiser = useCreateAdvertiser();

  const form = useForm<CreateAdvertiserInput>({
    resolver: zodResolver(createAdvertiserSchema),
    defaultValues: {
      name: '',
      birth_date: '',
      phone: '',
      business_name: '',
      address: '',
      business_phone: '',
      business_registration_number: '',
      representative_name: '',
    },
  });

  const onSubmit = async (data: CreateAdvertiserInput) => {
    try {
      await createAdvertiser.mutateAsync(data);

      toast({
        title: '광고주 정보가 등록되었습니다',
        description: '체험단 관리 대시보드로 이동합니다.',
      });

      router.push('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '등록에 실패했습니다',
        description: error instanceof Error ? error.message : '일시적인 오류가 발생했습니다',
      });
    }
  };

  // 전화번호 자동 하이픈 삽입
  const handlePhoneChange = (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }

    field.onChange(formatted);
  };

  // 사업자등록번호 자동 하이픈 삽입
  const handleBusinessNumberChange = (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length > 3 && value.length <= 5) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 5) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`;
    }

    field.onChange(formatted);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* 공통 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">공통 정보</h3>

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
              <FormItem className="flex flex-col">
                <FormLabel>생년월일 *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value && 'text-muted-foreground'
                        }`}
                      >
                        {field.value ? (
                          format(new Date(field.value), 'yyyy년 MM월 dd일', { locale: ko })
                        ) : (
                          <span>생년월일을 선택해주세요</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
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
                    placeholder="010-1234-5678"
                    {...field}
                    onChange={handlePhoneChange(field)}
                    maxLength={13}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* 사업자 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">사업자 정보</h3>

          {/* 업체명 */}
          <FormField
            control={form.control}
            name="business_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>업체명 *</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동네 식당" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 주소 */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>주소 *</FormLabel>
                <FormControl>
                  <Input placeholder="서울시 강남구 테헤란로 123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 업장 전화번호 */}
          <FormField
            control={form.control}
            name="business_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>업장 전화번호 *</FormLabel>
                <FormControl>
                  <Input placeholder="02-1234-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 사업자등록번호 */}
          <FormField
            control={form.control}
            name="business_registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>사업자등록번호 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123-45-67890"
                    {...field}
                    onChange={handleBusinessNumberChange(field)}
                    maxLength={12}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 대표자명 */}
          <FormField
            control={form.control}
            name="representative_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대표자명 *</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 제출 버튼 */}
        <Button
          type="submit"
          className="w-full"
          disabled={createAdvertiser.isPending}
        >
          {createAdvertiser.isPending ? '처리 중...' : '제출'}
        </Button>
      </form>
    </Form>
  );
}
```

### 4.4 React Query 훅

```typescript
// src/features/advertiser/hooks/useCreateAdvertiser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CreateAdvertiserInput, Advertiser } from '../lib/dto';

export function useCreateAdvertiser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdvertiserInput): Promise<Advertiser> => {
      const response = await apiClient.post<Advertiser>('/api/advertisers', input);
      return response.data;
    },
    onSuccess: () => {
      // 프로필 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
```

### 4.5 DTO 재노출

```typescript
// src/features/advertiser/lib/dto.ts
export {
  createAdvertiserSchema,
  advertiserSchema,
  type CreateAdvertiserInput,
  type Advertiser,
} from '../backend/schema';
```

---

## 5. 필요한 shadcn-ui 컴포넌트

### 5.1 추가 설치 필요
```bash
npx shadcn@latest add calendar
npx shadcn@latest add popover
```

### 5.2 이미 설치된 컴포넌트 (확인됨)
- ✅ button
- ✅ input
- ✅ form
- ✅ label
- ✅ card
- ✅ separator
- ✅ toast

---

## 6. 공통 유틸리티 함수 (선택적)

### 6.1 날짜 검증
```typescript
// src/lib/utils/date.ts
import { differenceInYears } from 'date-fns';

export function isAdultAge(birthDate: string | Date, minAge: number = 19): boolean {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const age = differenceInYears(new Date(), birth);
  return age >= minAge;
}
```

### 6.2 전화번호 포맷팅
```typescript
// src/lib/utils/format.ts
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

export function formatBusinessNumber(bizNo: string): string {
  const cleaned = bizNo.replace(/[^0-9]/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }

  return bizNo;
}
```

---

## 7. 데이터베이스 확인

### 7.1 필요한 테이블
- ✅ `advertisers` 테이블 (마이그레이션 확인 필요)

### 7.2 테이블 구조 검증
```sql
-- 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'advertisers'
);

-- 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'advertisers'
ORDER BY ordinal_position;
```

---

## 8. 구현 순서

### Phase 1: 백엔드 구현
1. ✅ `src/features/advertiser/backend/error.ts` 작성
2. ✅ `src/features/advertiser/backend/schema.ts` 작성
3. ✅ `src/features/advertiser/backend/service.ts` 작성
4. ✅ `src/features/advertiser/backend/route.ts` 작성
5. ✅ `src/backend/hono/app.ts` 에 라우터 등록
6. ✅ `src/features/advertiser/lib/dto.ts` 작성

### Phase 2: 프론트엔드 공통 모듈
7. ⚠️ shadcn-ui 컴포넌트 추가 설치 (calendar, popover)
8. ⚠️ 공통 유틸리티 함수 작성 (선택적)

### Phase 3: 프론트엔드 구현
9. ✅ `src/features/advertiser/hooks/useCreateAdvertiser.ts` 작성
10. ✅ `src/features/advertiser/components/advertiser-onboarding-form.tsx` 작성
11. ✅ `src/app/onboarding/advertiser/page.tsx` 작성

### Phase 4: 테스트 및 검증
12. ⚠️ 수동 테스트 (회원가입 → 역할 선택 → 정보 등록)
13. ⚠️ 에러 케이스 테스트 (유효성 검증, 중복 등록 등)

---

## 9. 에러 처리 전략

### 9.1 클라이언트 검증 (React Hook Form + Zod)
- 실시간 필드 검증 (onChange)
- 제출 전 최종 검증 (onSubmit)
- 에러 메시지는 각 필드 하단에 표시

### 9.2 서버 검증 (Zod)
- 모든 요청 데이터 재검증
- 400 Bad Request + 필드별 에러 반환

### 9.3 비즈니스 로직 에러
- 중복 등록: 409 Conflict
- 인증 실패: 401 Unauthorized
- 서버 에러: 500 Internal Server Error

### 9.4 사용자 피드백
- 성공: Toast 메시지 ("광고주 정보가 등록되었습니다")
- 실패: Toast 메시지 (에러 내용)
- 로딩: 제출 버튼 비활성화 + "처리 중..." 표시

---

## 10. 접근 제어

### 10.1 페이지 접근 제어
- 비로그인 사용자: `/login?redirect=/onboarding/advertiser` 로 리다이렉트
- 이미 광고주 프로필이 있는 사용자: `/dashboard` 로 리다이렉트

### 10.2 API 접근 제어
- 비로그인 요청: 401 Unauthorized
- 중복 등록 시도: 409 Conflict

---

## 11. 사용자 경험 개선

### 11.1 입력 편의성
- 전화번호/사업자등록번호 자동 하이픈 삽입
- Date Picker로 생년월일 선택 편의 제공
- Placeholder 텍스트로 입력 형식 안내

### 11.2 피드백
- 실시간 유효성 검증 (debounce 적용)
- 성공 시 Toast 메시지 + 자동 리다이렉트
- 에러 시 명확한 에러 메시지

### 11.3 로딩 상태
- 제출 버튼: "제출" → "처리 중..."
- 버튼 비활성화로 중복 제출 방지

---

## 12. 잠재적 이슈 및 해결 방안

### 12.1 이슈: Date Picker 한글 로케일
**해결**: date-fns의 `ko` 로케일 사용

### 12.2 이슈: 전화번호/사업자등록번호 형식 통일
**해결**: onChange 핸들러에서 자동 포맷팅

### 12.3 이슈: 중복 제출 방지
**해결**: isPending 상태로 버튼 비활성화

### 12.4 이슈: 이미 등록된 사용자 재접근
**해결**: useEffect로 프로필 존재 여부 확인 후 리다이렉트

---

## 13. 테스트 체크리스트

### 13.1 성공 케이스
- [ ] 모든 필드에 유효한 값 입력 → 등록 성공
- [ ] Toast 메시지 표시 확인
- [ ] `/dashboard` 페이지로 리다이렉트 확인
- [ ] 데이터베이스에 레코드 생성 확인

### 13.2 실패 케이스
- [ ] 이름 미입력 → 에러 메시지 표시
- [ ] 생년월일 미선택 → 에러 메시지 표시
- [ ] 만 19세 미만 생년월일 → 에러 메시지 표시
- [ ] 휴대폰번호 형식 오류 → 에러 메시지 표시
- [ ] 사업자등록번호 형식 오류 → 에러 메시지 표시
- [ ] 중복 등록 시도 → 409 Conflict + Toast 메시지
- [ ] 비로그인 상태 접근 → 로그인 페이지로 리다이렉트

### 13.3 UX 검증
- [ ] 전화번호 자동 하이픈 삽입 동작 확인
- [ ] 사업자등록번호 자동 하이픈 삽입 동작 확인
- [ ] Date Picker 한글 표시 확인
- [ ] 로딩 중 버튼 비활성화 확인
- [ ] 반응형 레이아웃 확인 (모바일/태블릿/데스크톱)

---

## 14. 참고 사항

### 14.1 기존 코드베이스와의 충돌 방지
- ✅ `src/features/advertiser/` 폴더는 독립적으로 작업 가능
- ✅ 공통 모듈 (`/api/profile`, CurrentUserContext) 활용
- ✅ 기존 스타일 가이드 준수 (CLAUDE.md)

### 14.2 재사용 가능성
- 인플루언서 정보 등록 페이지에서 공통 정보 입력 부분 재사용 가능
- 전화번호/사업자등록번호 포맷팅 로직 공통 유틸리티로 분리

### 14.3 향후 개선 사항 (P1 이후)
- 도로명 주소 API 연동 (Daum 우편번호 서비스 등)
- 사업자등록번호 실제 검증 API 연동
- 프로필 수정 기능 추가

---

## 15. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
