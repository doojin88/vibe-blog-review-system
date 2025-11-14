# 프로젝트 구현 및 수정 가이드

## 목차

1. [Supabase 이메일 인증 및 세션 유지](#1-supabase-이메일-인증-및-세션-유지)
2. [Hono API 라우트 관리](#2-hono-api-라우트-관리)
3. [페이지 및 경로 정리](#3-페이지-및-경로-정리)

---

## 1. Supabase 이메일 인증 및 세션 유지

### 1.1 이메일 리디렉션 URL 설정

**파일**: `src/features/auth/backend/service.ts` 

회원가입 요청 시 Supabase Auth에 이메일 확인 후 리디렉션할 URL을 지정합니다.

```typescript
// 이메일 확인 후 리다이렉트할 URL 설정
// 환경 변수가 없으면 Supabase가 기본 URL을 사용하도록 undefined 전달
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const emailRedirectTo = siteUrl
  ? `${siteUrl}/auth/callback`
  : undefined;

const { data: authData, error: authError } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    emailRedirectTo,  // 이메일 링크 클릭 시 이동할 URL
    data: {
      role: data.role,  // user_metadata에 역할 정보 저장
    },
  },
});
```

**핵심 포인트**:
- `emailRedirectTo`는 사용자가 이메일의 확인 링크를 클릭했을 때 리디렉션될 URL
- `NEXT_PUBLIC_SITE_URL` 환경 변수로 동적 설정
- `data` 객체의 정보는 `user_metadata`로 저장됨 (역할 정보 포함)

**관련 커밋**: `b117a40` - "update signup flow to redirect to login after email verification"

### 1.2 Public Path 설정

**파일**: `src/constants/auth.ts`

콜백 페이지는 인증 없이 접근 가능해야 하므로 PUBLIC_PATHS에 포함:

```typescript
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/campaigns',
  '/auth/callback'  // 이메일 확인 링크가 이 페이지로 리다이렉트
];
```

### 1.3 콜백 페이지 구조

**파일**: `src/app/auth/callback/page.tsx`

클라이언트 컴포넌트에서 URL의 토큰을 추출하여 세션을 생성합니다.

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';

type AuthCallbackPageProps = {
  params: Promise<Record<string, never>>;
};

export default function AuthCallbackPage({ params }: AuthCallbackPageProps) {
  void params;
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseBrowserClient();

      try {
        // URL 파싱 (hash fragment 및 query parameter 모두 확인)
        // ... 토큰 추출 로직
      } catch (error) {
        // ... 에러 처리
      }
    };

    handleCallback();
  }, [router]);

  // ... JSX
}
```

### 1.4 URL 토큰 추출

**파일**: `src/app/auth/callback/page.tsx` 

Supabase는 다양한 방식으로 토큰을 전달할 수 있으므로 여러 형식을 지원해야 합니다:

```typescript
// URL 전체 확인 (디버깅용)
console.log('전체 URL:', window.location.href);
console.log('Hash:', window.location.hash);
console.log('Search:', window.location.search);

// URL에서 hash fragment와 query parameter 모두 확인
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const searchParams = new URLSearchParams(window.location.search);

// 두 위치 모두에서 찾기 (fallback 로직)
const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
const type = hashParams.get('type') || searchParams.get('type');
const code = hashParams.get('code') || searchParams.get('code');
const errorParam = hashParams.get('error') || searchParams.get('error');
const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

console.log('콜백 처리 시작:', {
  type,
  hasCode: !!code,
  hasAccessToken: !!accessToken,
  hasRefreshToken: !!refreshToken,
  error: errorParam,
  errorDescription
});
```

**지원하는 형식**:
1. **Hash Fragment**: `#access_token=...&refresh_token=...` (기본 방식)
2. **Query Parameter**: `?code=...` (권장 방식 - 더 안전)
3. **Error Parameter**: `?error=access_denied&error_description=...`

### 1.5 세션 생성 (3가지 경로)

#### 경로 1: Code 기반 (권장)

**파일**: `src/app/auth/callback/page.tsx` 

```typescript
if (code) {
  console.log('코드로 세션 교환 시도');
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('코드 교환 실패:', error);
    // 에러 처리...
    throw new Error(`세션을 생성할 수 없습니다: ${error.message || '알 수 없는 오류'}}`);
  }

  if (!data.session) {
    throw new Error('세션을 생성할 수 없습니다.');
  }

  session = data.session;
  console.log('코드 교환 성공, 세션 생성됨');
}
```

**장점**: 가장 안전함 (토큰이 URL에 노출되지 않음)

#### 경로 2: Access/Refresh Token 기반

**파일**: `src/app/auth/callback/page.tsx` 

```typescript
else if (accessToken && refreshToken) {
  console.log('토큰으로 세션 설정 시도');
  const {
    data,
    error: sessionError,
  } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    console.error('세션 설정 실패:', sessionError);
    throw new Error(`세션을 설정할 수 없습니다: ${sessionError.message}`);
  }

  if (!data.session) {
    throw new Error('세션을 설정할 수 없습니다.');
  }

  session = data.session;
  console.log('토큰으로 세션 설정 성공');
}
```

**사용 시기**: Legacy 방식 또는 특정 OAuth 플로우

#### 경로 3: 기존 세션 확인

**파일**: `src/app/auth/callback/page.tsx` 

```typescript
else {
  console.log('토큰 없음, 기존 세션 확인 시도');
  const {
    data: { session: existingSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('세션 가져오기 실패:', sessionError);
    throw new Error(`세션을 가져올 수 없습니다: ${sessionError.message}`);
  }

  if (!existingSession) {
    console.error('세션 없음 - URL에 토큰이 없고 기존 세션도 없습니다');
    throw new Error('유효한 세션을 찾을 수 없습니다. 이메일 확인 링크가 올바른지 확인해주세요.');
  }

  session = existingSession;
  console.log('기존 세션 사용');
}
```

**사용 시기**: 미들웨어에서 이미 세션이 설정된 경우

### 1.6 에러 핸들링

**파일**: `src/app/auth/callback/page.tsx` 

만료되거나 이미 사용된 링크를 감지하고 처리:

```typescript
// 코드 교환 시 에러 처리
if (error) {
  console.error('코드 교환 실패:', error);

  // 이미 처리된 링크인지 확인
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = 'code' in error ? (error.code as string) : '';
  const errorStatus = 'status' in error ? (error.status as number) : 0;

  const isInvalidLink =
    errorMessage.includes('expired') ||
    errorMessage.includes('already used') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('used') ||
    errorCode === 'invalid_grant' ||
    errorStatus === 400;

  if (isInvalidLink) {
    window.alert('해당 링크 정보가 유효하지 않습니다.');
    window.location.href = '/';
    return;
  }

  throw new Error(`세션을 생성할 수 없습니다: ${error.message || '알 수 없는 오류'}`);
}
```

**감지 조건**:
- 에러 메시지에 'expired', 'already used', 'invalid', 'used' 포함
- 에러 코드가 'invalid_grant'
- HTTP 상태 코드가 400

### .7 사용자 역할 및 프로필 확인

**파일**: `src/app/auth/callback/page.tsx`

세션 생성 후 사용자의 역할을 확인합니다. 두 가지 위치에서 찾습니다:

```typescript
// 사용자 역할 확인 (user_metadata에서 먼저 시도, 없으면 users 테이블에서 조회)
let userRole = session.user.user_metadata?.role;

if (!userRole) {
  console.log('user_metadata에 role 없음, users 테이블에서 조회 시도');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', session.user.id)
    .single<{ id: string; role: string }>();

  if (userError) {
    console.error('사용자 정보 조회 실패:', userError);
    throw new Error('사용자 정보를 찾을 수 없습니다.');
  }

  if (!userData) {
    console.error('사용자 정보 없음');
    throw new Error('사용자 정보를 찾을 수 없습니다.');
  }

  userRole = userData.role;
  console.log('users 테이블에서 역할 조회 성공:', userRole);
} else {
  console.log('user_metadata에서 역할 확인:', userRole);
}

if (!userRole) {
  console.error('사용자 역할 없음:', session.user.user_metadata);
  throw new Error('사용자 역할을 확인할 수 없습니다.');
}
```

**조회 순서**:
1. **user_metadata**: 회원가입 시 설정된 역할 (빠름)
2. **users 테이블**: 데이터베이스 저장 역할 (확실함)

### 1.8 역할별 리디렉션

**파일**: `src/app/auth/callback/page.tsx` 

사용자의 역할과 프로필 상태에 따라 적절한 페이지로 리디렉션:

#### 광고주 (advertiser)

```typescript
if (userRole === 'advertiser') {
  const { data: advertiserProfile, error: profileError } = await supabase
    .from('advertiser_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('광고주 프로필 조회 에러:', profileError);
  }

  redirectPath = advertiserProfile
    ? '/campaigns/manage'      // 프로필 있음: 캠페인 관리 페이지
    : '/onboarding/advertiser'; // 프로필 없음: 온보딩 페이지

  console.log('리다이렉트 경로 결정 (광고주):', { hasProfile: !!advertiserProfile, redirectPath });
}
```

**리디렉션 규칙**:
- 광고주 프로필 있음 → `/campaigns/manage`
- 광고주 프로필 없음 → `/onboarding/advertiser`

#### 인플루언서 (influencer)

```typescript
else if (userRole === 'influencer') {
  const { data: influencerProfile, error: profileError } = await supabase
    .from('influencer_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('인플루언서 프로필 조회 에러:', profileError);
  }

  redirectPath = influencerProfile
    ? '/'                              // 프로필 있음: 홈페이지
    : '/influencer/profile/setup';     // 프로필 없음: 프로필 설정 페이지

  console.log('리다이렉트 경로 결정 (인플루언서):', { hasProfile: !!influencerProfile, redirectPath });
}
```

**리디렉션 규칙**:
- 인플루언서 프로필 있음 → `/`
- 인플루언서 프로필 없음 → `/influencer/profile/setup`

### 1.9 리디렉션 실행

**파일**: `src/app/auth/callback/page.tsx` 

```typescript
// hash fragment 제거 (보안)
window.history.replaceState(null, '', window.location.pathname);

// 성공 상태 설정
setStatus('success');
toast.success('이메일 인증이 완료되었습니다.');

console.log('리다이렉트 실행:', redirectPath);

// 리다이렉트 실행 (window.location.href 사용으로 더 확실한 리다이렉트)
setTimeout(() => {
  window.location.href = redirectPath;
}, 500);
```

**주의사항**:
- `window.history.replaceState()`로 URL에서 토큰 정보 제거 (보안)
- `window.location.href`로 리다이렉트 (라우터보다 확실)
- 500ms 딜레이로 UI 업데이트 보장

### 1.10 세션 유지 메커니즘

#### Browser Client (클라이언트 사이드)

**파일**: `src/lib/supabase/browser-client.ts`

```typescript
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/constants/env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

export const getSupabaseBrowserClient = () => {
  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  return client;
};
```

**특징**:
- **싱글톤 패턴**: 클라이언트 인스턴스 재사용 (메모리 효율)
- **자동 세션 저장**: 브라우저 로컬 스토리지에 세션 자동 저장
- **자동 세션 복원**: 페이지 새로고침 시 로컬 스토리지에서 복원

#### Server Client (서버 사이드)

**파일**: `src/lib/supabase/server-client.ts`

```typescript
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/constants/env";
import type { Database } from "./types";

type WritableCookieStore = Awaited<ReturnType<typeof cookies>> & {
  set?: (options: {
    name: string;
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  }) => void;
};

export const createSupabaseServerClient = async (): Promise<
  SupabaseClient<Database>
> => {
  const cookieStore = (await cookies()) as WritableCookieStore;

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookieStore.set === "function") {
                cookieStore.set({ name, value, ...options });
              }
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};
```

**특징**:
- **쿠키 기반 세션**: 서버에서 쿠키를 통해 세션 관리
- **에러 처리**: Server Component에서 호출 시 에러 무시 (미들웨어가 처리)
- **타입 안전성**: `WritableCookieStore` 타입으로 안정성 확보

#### Middleware (세션 리프레시)

**파일**: `middleware.ts` 

모든 요청마다 자동으로 세션을 리프레시하고 쿠키를 동기화합니다:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { env } from "@/constants/env";
import {
  LOGIN_PATH,
  isAuthEntryPath,
  shouldProtectPath,
} from "@/constants/auth";
import { match } from "ts-pattern";

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
    });
  });

  return to;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Supabase 서버 클라이언트 생성
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options }); // 응답 쿠키에도 설정
          });
        },
      },
    }
  );

  // 세션 리프레시 및 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증이 필요한 경로 보호
  const decision = match({ user, pathname: request.nextUrl.pathname })
    .when(
      ({ user: currentUser, pathname }) =>
        !currentUser && shouldProtectPath(pathname),
      ({ pathname }) => {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = LOGIN_PATH;
        loginUrl.searchParams.set("redirectedFrom", pathname);

        return copyCookies(response, NextResponse.redirect(loginUrl));
      }
    )
    .otherwise(() => response);

  return decision;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**역할**:

1. **세션 자동 리프레시**: 모든 요청마다 `getUser()` 호출로 세션 상태 확인
2. **쿠키 동기화**: `request.cookies` ↔ `response.cookies` 동기화
3. **경로 보호**: 인증이 필요한 경로 접근 시 로그인 페이지로 리다이렉트
4. **리다이렉트 URL 저장**: 로그인 후 원래 페이지로 돌아갈 수 있도록 `redirectedFrom` 쿼리 파라미터 설정

**쿠키 동기화 흐름**:
```
클라이언트 요청
  ↓
Middleware 실행
  ↓
request.cookies에서 기존 세션 읽기
  ↓
supabase.auth.getUser()로 세션 검증/리프레시
  ↓
새로운 쿠키가 필요하면 setAll 호출
  ↓
request.cookies와 response.cookies 모두에 저장
  ↓
response 반환 (쿠키 포함)
  ↓
클라이언트가 새 쿠키 받음
```

### 1.11 환경 변수

프로젝트의 `.env.local` 파일에 다음 환경 변수가 설정되어야 합니다:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 이메일 리디렉션 URL (선택사항)
# 설정하지 않으면 Supabase의 기본 프로젝트 URL 사용
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 1.12 인증 흐름 전체 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 회원가입 요청                                                 │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/auth/signup                                           │
│ {email, password, role}                                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Supabase Auth 생성                                           │
├─────────────────────────────────────────────────────────────────┤
│ supabase.auth.signUp({                                          │
│   email,                                                        │
│   password,                                                     │
│   options: {                                                    │
│     emailRedirectTo: 'https://domain.com/auth/callback',       │
│     data: { role }                                              │
│   }                                                             │
│ })                                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. 이메일 발송                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Supabase가 확인 링크를 포함한 이메일 발송                        │
│ 링크 예: https://domain.com/auth/callback?code=xyz              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 사용자가 이메일 링크 클릭                                      │
├─────────────────────────────────────────────────────────────────┤
│ 브라우저가 /auth/callback?code=xyz로 이동                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Middleware 실행                                              │
├─────────────────────────────────────────────────────────────────┤
│ - 요청 쿠키에서 기존 세션 확인                                   │
│ - supabase.auth.getUser() 호출                                  │
│ - 응답 쿠키 업데이트                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. 콜백 페이지 로드 (/auth/callback)                            │
├─────────────────────────────────────────────────────────────────┤
│ - URL에서 code 추출                                             │
│ - useEffect에서 handleCallback() 실행                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. 세션 생성                                                     │
├─────────────────────────────────────────────────────────────────┤
│ supabase.auth.exchangeCodeForSession(code)                      │
│ 또는 setSession({access_token, refresh_token})                 │
│ 또는 getSession() (기존 세션 확인)                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. 사용자 정보 조회                                              │
├─────────────────────────────────────────────────────────────────┤
│ - session.user.user_metadata.role 확인                          │
│ - 없으면 users 테이블에서 role 조회                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. 프로필 확인 및 리디렉션 경로 결정                             │
├─────────────────────────────────────────────────────────────────┤
│ advertiser:                                                     │
│   - profile 있음 → /campaigns/manage                            │
│   - profile 없음 → /onboarding/advertiser                       │
│                                                                 │
│ influencer:                                                     │
│   - profile 있음 → /                                            │
│   - profile 없음 → /influencer/profile/setup                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. 리디렉션 실행                                                │
├─────────────────────────────────────────────────────────────────┤
│ - window.history.replaceState()로 URL 정리 (보안)               │
│ - window.location.href로 최종 페이지로 이동                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. 세션 유지                                                    │
├─────────────────────────────────────────────────────────────────┤
│ - Browser: 로컬 스토리지에 세션 저장                             │
│ - Server: 쿠키에 세션 저장                                      │
│ - Middleware: 모든 요청마다 세션 리프레시                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.13 보안 고려사항

1. **Hash Fragment 제거**: URL에서 토큰 정보 노출 방지
   ```typescript
   window.history.replaceState(null, '', window.location.pathname);
   ```

2. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용
   ```env
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # https 필수
   ```

3. **쿠키 보안 옵션**: httpOnly, secure, sameSite 설정
   - Middleware에서 자동 처리됨

4. **CSRF 방지**: 상태 검증 (code를 사용하므로 자동 처리)

5. **Rate Limiting**: Supabase 프로젝트에서 설정
   - 대시보드 → Authentication → Rate Limiting

### 1.14 트러블슈팅

#### 문제: 콜백 페이지에서 세션을 찾을 수 없음

**원인**:
- `emailRedirectTo`가 설정되지 않음
- 이메일 링크가 만료됨
- 링크가 이미 사용됨

**해결**:
1. 환경 변수 확인: `NEXT_PUBLIC_SITE_URL` 설정 확인
2. 콘솔 로그 확인: URL, code, tokens 파라미터 확인
3. Supabase 대시보드 확인: Auth logs에서 실패 이유 확인

#### 문제: 리디렉션 후 세션이 유지되지 않음

**원인**:
- Middleware에서 쿠키 동기화 실패
- 브라우저 쿠키 정책 문제 (httpOnly, secure 등)

**해결**:
1. Middleware 확인: 쿠키 설정 로직 검토
2. 브라우저 개발자 도구 확인: 쿠키 설정 확인
3. Supabase 설정 확인: 쿠키 옵션 검토

#### 문제: 역할이 확인되지 않음

**원인**:
- `user_metadata.role`이 설정되지 않음
- `users` 테이블에 해당 사용자가 없음

**해결**:
1. signUp 옵션 확인: `data: { role }` 설정 확인
2. 데이터베이스 확인: users 테이블에 사용자 레코드 존재 확인
3. 콘솔 로그 확인: 역할 조회 로그 검토

---

## 2. Hono API 라우트 관리

### 2.1 라우트 등록 순서 문제

#### 문제점

기존에는 각 기능별 라우트를 개별 Hono 인스턴스로 생성한 후 `app.route()` 메서드로 마운트했습니다.

```typescript
// 변경 전 (잘못된 방식)
import { authRoutes } from '@/features/auth/backend/route';
import { advertiserRoutes } from '@/features/advertiser/backend/route';
import { influencerRoutes } from '@/features/influencer/backend/route';

// app.ts에서
app.route('/auth', authRoutes);
app.route('/advertisers', advertiserRoutes);
app.route('/influencers', influencerRoutes);
```

**문제**:

- 라우트 파일에서 prefix를 다시 정의해야 함 (중복)
- 라우트 등록 방식이 일관성 없음
- API 경로 관리가 어려움

#### 해결 방법

모든 라우트를 `registerXxxRoutes(app)` 함수로 통일하고 전체 경로를 명시적으로 지정:

```typescript
// 변경 후 (올바른 방식)
import { registerAuthRoutes } from '@/features/auth/backend/route';
import { registerAdvertiserRoutes } from '@/features/advertiser/backend/route';
import { registerInfluencerRoutes } from '@/features/influencer/backend/route';

// auth/backend/route.ts
export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  app.post('/api/auth/signup', zValidator('json', SignupRequestSchema), async (c) => {
    const supabase = c.get('supabase');
    const data = c.req.valid('json');
    const result = await createUser(supabase, data);
    return respond(c, result);
  });
};

// advertiser/backend/route.ts
export const registerAdvertiserRoutes = (app: Hono<AppEnv>) => {
  app.post(
    '/api/advertisers/profile',
    withAuth(),
    requireRole('advertiser'),
    zValidator('json', AdvertiserProfileRequestSchema),
    async (c) => {
      const supabase = c.get('supabase');
      const userId = c.get('userId')!;
      const data = c.req.valid('json');
      const result = await createAdvertiserProfile(supabase, userId, data);
      return respond(c, result);
    }
  );
};

// influencer/backend/route.ts
export const registerInfluencerRoutes = (app: Hono<AppEnv>) => {
  app.post(
    '/api/influencers/profile',
    withAuth(),
    requireRole('influencer'),
    zValidator('json', InfluencerProfileRequestSchema),
    async (c) => {
      const supabase = c.get('supabase');
      const userId = c.get('userId')!;
      const data = c.req.valid('json');
      const result = await createInfluencerProfile(supabase, userId, data);
      return respond(c, result);
    }
  );
};

// app.ts에서
registerAuthRoutes(app);
registerAdvertiserRoutes(app);
registerInfluencerRoutes(app);
```

**장점**:
- 라우트 등록 방식 일관성 확보
- API 경로를 명시적으로 관리
- 코드 재사용성 향상

### 2.2 동적 라우트와 정적 라우트의 순서 문제

#### 문제점

Hono에서 동적 라우트(`/api/campaigns/:id`)가 정적 라우트(`/api/campaigns/me`)보다 먼저 등록되면, `/api/campaigns/me` 요청이 `/api/campaigns/:id`로 매칭되어 UUID 검증 오류가 발생합니다.

```typescript
// 변경 전 (잘못된 순서)
registerCampaignRoutes(app);        // /api/campaigns/:id
registerCampaignsRoutes(app);       // /api/campaigns/me
```

**결과**: `me`를 UUID로 검증하려다가 실패

#### 해결 방법

더 구체적인 라우트를 먼저 등록:

```typescript
// 변경 후 (올바른 순서)
registerCampaignsRoutes(app);       // /api/campaigns/me (먼저 등록)
registerCampaignRoutes(app);        // /api/campaigns/:id
```

#### UUID 검증 강화

클라이언트 측 쿼리 hook에서 사전 검증:

```typescript
import { UuidSchema } from '@/backend/schemas/common';

const isValidUUID = (id: string): boolean => {
  return UuidSchema.safeParse(id).success;
};

export const useCampaignDetail = (campaignId: string) => {
  return useQuery({
    queryKey: queryKeys.campaign(campaignId),
    queryFn: async () => {
      // 사전 검증: UUID가 유효하지 않으면 쿼리 실행 안 함
      if (!isValidUUID(campaignId)) {
        throw new Error('유효하지 않은 체험단 ID입니다.');
      }

      try {
        const { data } = await apiClient.get<{
          success: true;
          data: CampaignDetailResponse;
        }>(`/api/campaigns/${campaignId}`);
        return data.data;
      } catch (error) {
        // ...
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: isValidUUID(campaignId),  // UUID 유효성 확인 후 쿼리 실행
    retry: (failureCount, error) => {
      if (error.message.includes('not found') || error.message.includes('유효하지 않은')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
```

---

## 3. 페이지 및 경로 정리

### 3.1 라우트 등록 체크리스트

새로운 API 라우트를 추가할 때 다음을 확인하세요:

```typescript
// 1. 라우트 파일 생성 (e.g., src/features/xxx/backend/route.ts)
export const registerXxxRoutes = (app: Hono<AppEnv>) => {
  app.get('/api/xxx/list', async (c) => {
    // ...
  });
  app.post('/api/xxx/create', withAuth(), async (c) => {
    // ...
  });
};

// 2. app.ts에서 등록
registerXxxRoutes(app);

// 3. ROUTES 상수에 추가 (필요시)
export const ROUTES = {
  XXX_LIST: '/xxx/list',
  XXX_CREATE: '/xxx/create',
};

// 4. 동적 라우트 순서 확인
// 정적 라우트를 동적 라우트보다 먼저 등록
registerXxxRoutes(app);      // /api/xxx/list
registerXxxDetailRoutes(app); // /api/xxx/:id
```

---

## 배운 점

1. **라우트 등록 방식의 일관성**: 모든 라우트를 같은 방식으로 등록하면 관리가 쉬움
2. **라우트 순서의 중요성**: 구체적인 라우트를 먼저 등록해야 매칭 오류를 피할 수 있음
3. **경로 상수 관리**: `ROUTES` 상수로 모든 경로를 관리하면 변경 시 실수를 줄일 수 있음
4. **스키마 검증의 유연성**: 선택사항인 필드는 검증을 유연하게 설정
5. **데이터 정규화**: 다양한 데이터 소스의 형식을 통일하면 검증이 수월함
6. **인증 흐름의 복잡성**: 이메일 인증 및 세션 유지는 여러 계층(middleware, client, server)이 함께 작동해야 함
7. **보안의 중요성**: URL에서 토큰 정보를 제거하고, HTTPS를 사용하며, 쿠키 옵션을 적절히 설정해야 함

