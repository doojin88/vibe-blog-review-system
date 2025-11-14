# 회원가입 페이지 구현 계획

## 1. 개요

### 1.1 목적
신규 사용자가 이메일 기반 회원가입을 통해 계정을 생성하고, 광고주 또는 인플루언서 역할을 선택하여 서비스 이용을 시작할 수 있도록 한다.

### 1.2 페이지 경로
- `/signup` - 회원가입 페이지

### 1.3 참고 문서
- PRD: `/docs/prd.md` (섹션 3.1.3)
- Userflow: `/docs/userflow.md` (섹션 1.1.1, 1.1.2)
- Usecase: `/docs/usecases/1-signup-and-role-selection/spec.md`
- Database: `/docs/database.md` (섹션 4.1, 4.2)
- Common Modules: `/docs/common-modules.md`

---

## 2. 현재 상태 분석

### 2.1 기존 구현 현황

#### ✅ 완료된 부분
1. **기본 회원가입 폼** (`/src/app/signup/page.tsx`)
   - 이메일, 비밀번호, 비밀번호 확인 입력
   - Supabase Auth 연동 (`signUp`)
   - 폼 유효성 검증 (클라이언트)
   - 에러 메시지 표시
   - 로그인 페이지 링크

2. **공통 모듈**
   - `CurrentUserContext`: 사용자 인증 상태 관리
   - `useCurrentUser` 훅: 인증 상태 접근
   - Supabase Browser Client: 인증 API 호출

3. **Profile API** (`/api/profile`)
   - 사용자 역할 조회 (advertiser/influencer/null)
   - 프로필 등록 여부 확인 (hasProfile)
   - 프로필 정보 반환

#### ❌ 미구현 부분
1. **역할 선택 단계**
   - Step 1 (이메일/비밀번호) → Step 2 (역할 선택) 분리
   - 역할 선택 UI (라디오 버튼 또는 카드 선택)
   - 역할별 온보딩 리다이렉션

2. **상태 관리**
   - 다단계 폼 상태 관리
   - 역할 선택 임시 저장

3. **UI 개선**
   - shadcn-ui 컴포넌트 활용 (Button, Card, Label, RadioGroup)
   - 접근성 개선 (aria-label, 키보드 네비게이션)
   - 반응형 디자인

### 2.2 기존 코드와의 충돌 가능성

#### 충돌 없음
- 기존 `/signup/page.tsx`를 **완전 교체**하는 방식
- 기존 공통 모듈을 그대로 활용
- 새로운 파일 추가 없음 (기존 파일 수정만)

#### 주의사항
- `CurrentUserContext`의 `refresh()` 함수 활용 (회원가입 후 사용자 정보 갱신)
- Profile API 응답 형식 준수 (`ProfileResponse`)

---

## 3. 구현 계획

### 3.1 Step 1: 이메일/비밀번호 입력 단계

#### 3.1.1 UI 구성
```tsx
<Card>
  <CardHeader>
    <CardTitle>회원가입</CardTitle>
    <CardDescription>이메일과 비밀번호를 입력해주세요</CardDescription>
  </CardHeader>
  <CardContent>
    <Form {...form}>
      <FormField name="email" />
      <FormField name="password" />
      <FormField name="confirmPassword" />
    </Form>
  </CardContent>
  <CardFooter>
    <Button type="submit">다음</Button>
  </CardFooter>
</Card>
```

#### 3.1.2 검증 로직
- 이메일 형식 검증 (Zod: `z.string().email()`)
- 비밀번호 최소 길이 (Zod: `z.string().min(8)`)
- 비밀번호 일치 여부 (Zod: `refine`)

#### 3.1.3 Zod 스키마
```typescript
const SignupStep1Schema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});
```

#### 3.1.4 처리 로직
1. 폼 제출 시 클라이언트 검증 (react-hook-form + Zod)
2. Supabase Auth `signUp()` 호출
3. 성공 시 Step 2로 전환 (역할 선택)
4. 실패 시 에러 메시지 표시

---

### 3.2 Step 2: 역할 선택 단계

#### 3.2.1 UI 구성
```tsx
<Card>
  <CardHeader>
    <CardTitle>역할 선택</CardTitle>
    <CardDescription>사용하실 서비스를 선택해주세요</CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup onValueChange={setSelectedRole}>
      <Card className={selectedRole === 'advertiser' ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle>광고주</CardTitle>
          <CardDescription>체험단을 등록하고 인플루언서를 선정합니다</CardDescription>
        </CardHeader>
      </Card>
      <Card className={selectedRole === 'influencer' ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle>인플루언서</CardTitle>
          <CardDescription>체험단에 지원하고 리뷰를 작성합니다</CardDescription>
        </CardHeader>
      </Card>
    </RadioGroup>
  </CardContent>
  <CardFooter>
    <Button onClick={handleRoleSubmit} disabled={!selectedRole}>
      다음
    </Button>
  </CardFooter>
</Card>
```

#### 3.2.2 상태 관리
- React Hook: `useState<'advertiser' | 'influencer' | null>(null)`
- 역할 미선택 시 "다음" 버튼 비활성화

#### 3.2.3 처리 로직
1. 역할 선택 확인
2. 선택한 역할에 따라 리다이렉트:
   - 광고주 → `/onboarding/advertiser`
   - 인플루언서 → `/onboarding/influencer`

---

### 3.3 다단계 폼 상태 관리

#### 3.3.1 상태 정의
```typescript
type SignupStep = 'credentials' | 'role';

const [currentStep, setCurrentStep] = useState<SignupStep>('credentials');
const [credentials, setCredentials] = useState({ email: '', password: '' });
const [selectedRole, setSelectedRole] = useState<'advertiser' | 'influencer' | null>(null);
```

#### 3.3.2 단계 전환 로직
```typescript
// Step 1 → Step 2
const handleCredentialsSubmit = async (data: SignupStep1Data) => {
  const result = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (result.error) {
    setErrorMessage(result.error.message);
    return;
  }

  await refresh(); // CurrentUserContext 갱신
  setCredentials({ email: data.email, password: data.password });
  setCurrentStep('role');
};

// Step 2 → 온보딩
const handleRoleSubmit = () => {
  if (selectedRole === 'advertiser') {
    router.push('/onboarding/advertiser');
  } else if (selectedRole === 'influencer') {
    router.push('/onboarding/influencer');
  }
};
```

---

### 3.4 에러 처리

#### 3.4.1 클라이언트 검증 에러
- react-hook-form의 `errors` 객체 활용
- 각 필드 하단에 에러 메시지 표시 (FormMessage)

#### 3.4.2 서버 에러
- Supabase Auth 에러 메시지 표시
  - 이메일 중복: "이미 등록된 이메일입니다"
  - 네트워크 오류: "일시적인 오류가 발생했습니다"

#### 3.4.3 에러 코드 매핑
```typescript
const getErrorMessage = (error: AuthError): string => {
  switch (error.message) {
    case 'User already registered':
      return '이미 등록된 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.';
    case 'Password should be at least 6 characters':
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    default:
      return error.message ?? '회원가입에 실패했습니다.';
  }
};
```

---

### 3.5 접근 제어

#### 3.5.1 이미 로그인된 사용자
- `useCurrentUser` 훅으로 인증 상태 확인
- 로그인된 경우 홈으로 리다이렉트

```typescript
useEffect(() => {
  if (isAuthenticated) {
    router.replace('/');
  }
}, [isAuthenticated, router]);
```

#### 3.5.2 프로필 등록 완료 사용자
- Profile API로 역할 확인
- 역할이 이미 설정된 경우 홈으로 리다이렉트

---

### 3.6 UI/UX 개선

#### 3.6.1 반응형 디자인
- 모바일: 단일 컬럼 레이아웃
- 데스크톱: 좌우 분할 (폼 + 이미지)

#### 3.6.2 접근성
- 모든 입력 필드에 `Label` 연결
- 에러 메시지에 `aria-live="polite"` 적용
- 키보드 네비게이션 지원 (Tab, Enter)

#### 3.6.3 로딩 상태
- 제출 버튼에 로딩 스피너 표시
- 로딩 중 폼 비활성화

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      등록 중...
    </>
  ) : (
    '다음'
  )}
</Button>
```

---

## 4. 파일 구조

### 4.1 수정할 파일
```
src/app/signup/
└── page.tsx           # 기존 파일 완전 교체
```

### 4.2 신규 파일 (없음)
- 모든 로직을 `page.tsx` 내에 구현
- 공통 모듈 활용 (shadcn-ui, CurrentUserContext)

---

## 5. 데이터 흐름

### 5.1 회원가입 플로우
```
[사용자] → [Step 1: 이메일/비밀번호]
    ↓
[Supabase Auth signUp]
    ↓
[auth.users 테이블에 사용자 생성]
    ↓
[CurrentUserContext refresh()]
    ↓
[Step 2: 역할 선택]
    ↓
[광고주 선택] → /onboarding/advertiser
[인플루언서 선택] → /onboarding/influencer
```

### 5.2 상태 전환
```
currentStep: 'credentials'
    ↓ (signUp 성공)
currentStep: 'role'
    ↓ (역할 선택 완료)
router.push(onboarding 페이지)
```

---

## 6. 구현 단계별 체크리스트

### Phase 1: Zod 스키마 정의
- [ ] `SignupStep1Schema` 정의 (email, password, confirmPassword)
- [ ] 비밀번호 일치 검증 (`refine`)

### Phase 2: Step 1 (이메일/비밀번호) 구현
- [ ] shadcn-ui `Card`, `Form`, `Input` 컴포넌트 활용
- [ ] react-hook-form + Zod 통합
- [ ] Supabase Auth `signUp()` 호출
- [ ] 성공 시 Step 2로 전환
- [ ] 에러 메시지 표시

### Phase 3: Step 2 (역할 선택) 구현
- [ ] shadcn-ui `RadioGroup`, `Card` 컴포넌트 활용
- [ ] 역할 선택 상태 관리
- [ ] 선택된 역할에 시각적 하이라이트
- [ ] 역할별 온보딩 리다이렉트

### Phase 4: 다단계 폼 연결
- [ ] `currentStep` 상태로 Step 전환
- [ ] Step 1 → Step 2 데이터 전달
- [ ] 뒤로가기 지원 (Step 2 → Step 1)

### Phase 5: 접근 제어
- [ ] 로그인된 사용자 리다이렉트
- [ ] 프로필 등록 완료 사용자 리다이렉트

### Phase 6: UI/UX 개선
- [ ] 반응형 레이아웃
- [ ] 로딩 스피너
- [ ] 접근성 개선 (aria-label, 키보드 네비게이션)
- [ ] 에러 메시지 스타일링

### Phase 7: 테스트
- [ ] 정상 플로우 테스트 (Step 1 → Step 2 → 온보딩)
- [ ] 이메일 중복 테스트
- [ ] 비밀번호 불일치 테스트
- [ ] 역할 미선택 테스트
- [ ] 이미 로그인된 사용자 테스트

---

## 7. 컴포넌트 구조

### 7.1 최종 컴포넌트 트리
```tsx
<SignupPage>
  {currentStep === 'credentials' && (
    <SignupCredentialsStep
      onSuccess={(credentials) => {
        setCredentials(credentials);
        setCurrentStep('role');
      }}
    />
  )}

  {currentStep === 'role' && (
    <SignupRoleSelectionStep
      onBack={() => setCurrentStep('credentials')}
      onRoleSelect={(role) => {
        router.push(`/onboarding/${role}`);
      }}
    />
  )}
</SignupPage>
```

### 7.2 컴포넌트 분리 (선택사항)
필요시 Step별 컴포넌트 분리:
```
src/features/signup/
├── components/
│   ├── signup-credentials-step.tsx
│   └── signup-role-selection-step.tsx
└── schemas/
    └── signup-schema.ts
```

**현재 계획**: 단일 파일 (`page.tsx`) 내에 모든 로직 구현

---

## 8. 필요한 shadcn-ui 컴포넌트

### 8.1 이미 설치된 컴포넌트
- ✅ Button
- ✅ Card (CardHeader, CardContent, CardFooter, CardTitle, CardDescription)
- ✅ Form (FormField, FormItem, FormLabel, FormControl, FormMessage)
- ✅ Input
- ✅ Label

### 8.2 추가 설치 필요 컴포넌트
- ⚠️ RadioGroup (역할 선택)

### 8.3 설치 명령어
```bash
npx shadcn@latest add radio-group
```

---

## 9. 참고 코드 예시

### 9.1 Step 1: 이메일/비밀번호
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const SignupStep1Schema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type SignupStep1Data = z.infer<typeof SignupStep1Schema>;

export function SignupCredentialsStep({ onSuccess }: { onSuccess: (data: SignupStep1Data) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refresh } = useCurrentUser();
  const supabase = getSupabaseBrowserClient();

  const form = useForm<SignupStep1Data>({
    resolver: zodResolver(SignupStep1Schema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: SignupStep1Data) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "회원가입에 실패했습니다.");
      setIsSubmitting(false);
      return;
    }

    await refresh();
    onSuccess(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>이메일과 비밀번호를 입력해주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="최소 8자 이상" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="비밀번호를 다시 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "등록 중..." : "다음"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-slate-500">
          이미 계정이 있으신가요?{" "}
          <a href="/login" className="font-medium text-slate-700 underline hover:text-slate-900">
            로그인으로 이동
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
```

### 9.2 Step 2: 역할 선택
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function SignupRoleSelectionStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'advertiser' | 'influencer' | null>(null);

  const handleRoleSubmit = () => {
    if (selectedRole === 'advertiser') {
      router.push('/onboarding/advertiser');
    } else if (selectedRole === 'influencer') {
      router.push('/onboarding/influencer');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>역할 선택</CardTitle>
        <CardDescription>사용하실 서비스를 선택해주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup onValueChange={(value) => setSelectedRole(value as 'advertiser' | 'influencer')}>
          <Card className={`cursor-pointer ${selectedRole === 'advertiser' ? 'border-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="advertiser" id="advertiser" />
                <Label htmlFor="advertiser" className="cursor-pointer">
                  <CardTitle>광고주</CardTitle>
                  <CardDescription>체험단을 등록하고 인플루언서를 선정합니다</CardDescription>
                </Label>
              </div>
            </CardHeader>
          </Card>
          <Card className={`cursor-pointer ${selectedRole === 'influencer' ? 'border-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="influencer" id="influencer" />
                <Label htmlFor="influencer" className="cursor-pointer">
                  <CardTitle>인플루언서</CardTitle>
                  <CardDescription>체험단에 지원하고 리뷰를 작성합니다</CardDescription>
                </Label>
              </div>
            </CardHeader>
          </Card>
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          이전
        </Button>
        <Button onClick={handleRoleSubmit} disabled={!selectedRole}>
          다음
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 10. 테스트 시나리오

### 10.1 정상 플로우
| 단계 | 입력 | 기대 결과 |
|------|------|----------|
| 1    | 이메일: `test@example.com`<br>비밀번호: `password123`<br>확인: `password123` | Step 2로 전환 |
| 2    | 역할: 인플루언서 | `/onboarding/influencer`로 리다이렉트 |

### 10.2 검증 실패
| 테스트 케이스 | 입력 | 기대 결과 |
|--------------|------|----------|
| 이메일 형식 오류 | `invalid-email` | "올바른 이메일 형식을 입력해주세요" |
| 비밀번호 짧음 | `1234567` | "비밀번호는 최소 8자 이상이어야 합니다" |
| 비밀번호 불일치 | 비밀번호: `password123`<br>확인: `password456` | "비밀번호가 일치하지 않습니다" |
| 역할 미선택 | (선택 안 함) | "다음" 버튼 비활성화 |

### 10.3 이메일 중복
| 입력 | 기대 결과 |
|------|----------|
| 이미 등록된 이메일 | "이미 등록된 이메일입니다" |

---

## 11. DRY 준수 체크리스트

### 11.1 공통 모듈 재사용
- ✅ `CurrentUserContext` 활용 (인증 상태 관리)
- ✅ `useCurrentUser` 훅 활용 (인증 상태 접근)
- ✅ `getSupabaseBrowserClient` 활용 (Supabase Auth 호출)
- ✅ shadcn-ui 컴포넌트 활용 (Button, Card, Form, Input)

### 11.2 중복 코드 방지
- ✅ 에러 메시지 매핑 함수 (`getErrorMessage`)
- ✅ Zod 스키마 분리 (`SignupStep1Schema`)
- ✅ Step별 컴포넌트 분리 (선택사항)

---

## 12. 코드 충돌 확인

### 12.1 기존 파일 수정
- **`src/app/signup/page.tsx`**: 완전 교체
  - 기존 로직과 충돌 없음 (새로운 구현으로 대체)

### 12.2 신규 파일 추가
- 없음

### 12.3 공통 모듈 의존성
- `CurrentUserContext`: 변경 없음 (기존 그대로 활용)
- Profile API: 변경 없음 (기존 그대로 활용)
- shadcn-ui: RadioGroup 추가 설치 필요

---

## 13. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
