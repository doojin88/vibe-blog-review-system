# Clerk + Next.js 15 통합 가이드 (검증 완료)

**최종 업데이트**: 2025년 10월 26일  
**대상 버전**: Next.js 15.x LTS, @clerk/nextjs 6.34.0+, React 19

---

## 목차

1. [통합 방식 개요](#통합-방식-개요)
2. [SDK를 통한 인증 구현](#sdk를-통한-인증-구현)
3. [API를 통한 사용자 데이터 접근](#api를-통한-사용자-데이터-접근)
4. [Webhook을 통한 이벤트 수신](#webhook을-통한-이벤트-수신)
5. [보안 고려사항](#보안-고려사항)
6. [프로덕션 체크리스트](#프로덕션-체크리스트)

---

## 통합 방식 개요

Clerk는 3가지 주요 연동 방식을 제공합니다.

### 1. SDK 연동 (필수)
**목적**: 프론트엔드 및 서버사이드 인증 처리  
**사용 시나리오**:
- 사용자 로그인/회원가입 UI 표시
- 보호된 페이지 접근 제어
- 서버 컴포넌트에서 인증 상태 확인
- 클라이언트 컴포넌트에서 사용자 정보 접근

### 2. Backend API 연동 (선택)
**목적**: 프로그래밍 방식으로 사용자 관리  
**사용 시나리오**:
- 관리자 대시보드에서 사용자 생성/삭제
- 사용자 메타데이터 프로그래밍 방식 업데이트
- 세션 관리 및 강제 로그아웃
- 조직/팀 관리 자동화

### 3. Webhook 연동 (권장)
**목적**: 실시간 사용자 이벤트 수신  
**사용 시나리오**:
- 신규 가입 시 데이터베이스에 사용자 레코드 생성
- 사용자 프로필 변경 시 동기화
- 사용자 삭제 시 관련 데이터 정리
- 감사 로그 작성

---

## SDK를 통한 인증 구현

### 사용 기능

SDK를 통해 다음 기능을 구현합니다:

1. **사용자 인증 플로우**: 로그인, 회원가입, 로그아웃
2. **세션 관리**: 자동 토큰 갱신, 세션 검증
3. **라우트 보호**: 미들웨어 및 서버 컴포넌트 기반 접근 제어
4. **사용자 프로필 관리**: 프로필 정보 읽기 및 수정
5. **조직 관리**: 다중 조직 지원 및 역할 기반 접근 제어

### 설치 및 세팅

#### 1단계: 패키지 설치

```bash
npm install @clerk/nextjs
```

**검증된 버전**: @clerk/nextjs v6.34.0 이상 (2025년 10월 기준)

#### 2단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Clerk Dashboard에서 발급받은 키
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# 리다이렉션 URL (선택사항)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**중요**: `.env.local`을 `.gitignore`에 추가하여 커밋하지 않도록 합니다.

#### 3단계: ClerkProvider 설정

`app/layout.tsx`:

```tsx
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: 'Next.js 15 + Clerk',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="ko">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**중요 변경사항 (v6)**: ClerkProvider는 더 이상 전체 앱을 동적 렌더링으로 전환하지 않습니다. v5 동작을 원하면 `<ClerkProvider dynamic>` 사용.

#### 4단계: 미들웨어 설정

프로젝트 루트에 `middleware.ts` 생성:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 공개 라우트 정의 (인증 불필요)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // 공개 라우트가 아닌 경우 인증 필요
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Next.js 내부 파일 및 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 라우트는 항상 실행
    '/(api|trpc)(.*)',
  ],
}
```

**핵심 변경사항 (v6)**:
- `clerkMiddleware`는 기본적으로 모든 라우트를 공개로 설정
- 보호가 필요한 라우트는 `await auth.protect()` 명시 필요
- `auth()` 헬퍼가 비동기로 변경됨 (`await` 필수)

#### 5단계: 인증 페이지 생성

```bash
mkdir -p app/sign-in/[[...sign-in]]
mkdir -p app/sign-up/[[...sign-up]]
```

`app/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}
```

`app/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp routing="path" path="/sign-up" />
    </div>
  )
}
```

### 인증정보 관리 방법

#### 환경별 API 키 관리

```bash
# 개발 환경 (.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# 프로덕션 환경 (Vercel/배포 플랫폼 환경변수 설정)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

#### 키 보안 원칙

1. **Publishable Key**: 클라이언트 노출 가능 (`NEXT_PUBLIC_` 접두사)
2. **Secret Key**: 절대 클라이언트에 노출 금지 (서버 전용)
3. **키 로테이션**: Clerk Dashboard에서 정기적으로 키 재발급
4. **접근 제어**: Secret Key는 CI/CD 및 배포 플랫폼의 시크릿 관리 기능 사용

### SDK 호출 방법

#### Server Components에서 인증 사용

```typescript
// app/dashboard/page.tsx
import { currentUser, auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // 1. 간단한 인증 상태만 필요한 경우 (권장)
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // 2. 전체 사용자 객체가 필요한 경우
  const user = await currentUser()

  return (
    <div>
      <h1>대시보드</h1>
      <p>User ID: {user?.id}</p>
      <p>이메일: {user?.emailAddresses[0]?.emailAddress}</p>
      <p>이름: {user?.firstName} {user?.lastName}</p>
    </div>
  )
}
```

**성능 고려사항**:
- `auth()`: 세션에서 직접 읽음 (빠름, Rate Limit 영향 없음)
- `currentUser()`: Backend API 호출 (느림, Rate Limit 카운트됨)
- **원칙**: userId만 필요하면 `auth()` 사용, 전체 프로필이 필요할 때만 `currentUser()` 사용

#### API Route에서 인증 사용

```typescript
// app/api/user-data/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await currentUser()

  return NextResponse.json({
    userId: user?.id,
    email: user?.emailAddresses[0]?.emailAddress,
    createdAt: user?.createdAt,
  })
}
```

#### Client Components에서 인증 사용

```tsx
'use client'

import { useUser, useAuth, useClerk } from '@clerk/nextjs'

export default function ProfileComponent() {
  // 1. useUser - 사용자 프로필 데이터
  const { isLoaded, isSignedIn, user } = useUser()

  // 2. useAuth - 인증 상태 및 메서드
  const { getToken, userId } = useAuth()

  // 3. useClerk - Clerk SDK 전체 접근
  const { signOut, openSignIn } = useClerk()

  if (!isLoaded) {
    return <div>로딩 중...</div>
  }

  if (!isSignedIn) {
    return <button onClick={() => openSignIn()}>로그인</button>
  }

  return (
    <div>
      <p>환영합니다, {user.firstName}님!</p>
      <p>이메일: {user.emailAddresses[0].emailAddress}</p>
      <button onClick={() => signOut()}>로그아웃</button>
    </div>
  )
}
```

**Hooks 사용 패턴**:
- `useUser()`: 사용자 프로필 데이터 및 업데이트 메서드
- `useAuth()`: 인증 상태, 토큰 발급, 권한 확인
- `useClerk()`: 모달 열기, 고급 SDK 기능

#### 세션 토큰으로 API 호출

```tsx
'use client'

import { useAuth } from '@clerk/nextjs'

export default function ApiCallExample() {
  const { getToken } = useAuth()

  const callProtectedAPI = async () => {
    const token = await getToken()
    
    const response = await fetch('/api/protected', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    
    const data = await response.json()
    return data
  }

  return (
    <button onClick={callProtectedAPI}>
      보호된 API 호출
    </button>
  )
}
```

**검증된 정보**: JWT 토큰은 60초마다 자동 갱신되며, `getToken()`은 항상 유효한 토큰을 반환합니다.

---

## API를 통한 사용자 데이터 접근

### 사용 기능

Backend API를 통해 다음 작업을 수행합니다:

1. **사용자 CRUD**: 프로그래밍 방식 사용자 생성/조회/수정/삭제
2. **메타데이터 관리**: public/private/unsafe 메타데이터 업데이트
3. **세션 관리**: 활성 세션 조회, 강제 로그아웃
4. **조직 관리**: 조직 생성, 멤버 추가/제거, 역할 할당

### 설치 및 세팅

Clerk Backend API는 별도 SDK 없이 HTTP 요청으로 사용 가능하나, 타입 안정성을 위해 `@clerk/backend` 사용 권장:

```bash
npm install @clerk/backend
```

### 인증정보 관리 방법

Backend API는 `CLERK_SECRET_KEY`를 사용합니다:

```bash
# .env.local
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

API 요청 시 헤더에 포함:

```bash
Authorization: Bearer sk_test_xxxxxxxxxxxxx
```

### API 호출 방법

#### 방법 1: REST API 직접 호출

```typescript
// lib/clerk-api.ts
const CLERK_API_BASE = 'https://api.clerk.com/v1'
const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

async function getUser(userId: string) {
  const response = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

async function updateUserMetadata(userId: string, metadata: any) {
  const response = await fetch(`${CLERK_API_BASE}/users/${userId}/metadata`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: metadata,
    }),
  })
  
  return response.json()
}

async function deleteUser(userId: string) {
  const response = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
    },
  })
  
  return response.ok
}
```

#### 방법 2: @clerk/backend SDK 사용

```typescript
// lib/clerk-backend.ts
import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

// 사용자 조회
export async function getUser(userId: string) {
  return await clerkClient.users.getUser(userId)
}

// 사용자 메타데이터 업데이트
export async function updateUserMetadata(userId: string, metadata: any) {
  return await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: metadata,
  })
}

// 사용자 삭제
export async function deleteUser(userId: string) {
  return await clerkClient.users.deleteUser(userId)
}

// 사용자 목록 조회 (페이지네이션)
export async function listUsers(offset = 0, limit = 10) {
  return await clerkClient.users.getUserList({
    offset,
    limit,
  })
}
```

#### API Route에서 사용 예시

```typescript
// app/api/admin/users/[userId]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUser, updateUserMetadata, deleteUser } from '@/lib/clerk-backend'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId: adminId } = await auth()
  
  // 관리자 권한 확인 로직 추가 필요
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await getUser(params.userId)
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId: adminId } = await auth()
  
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  
  try {
    const user = await updateUserMetadata(params.userId, body.metadata)
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId: adminId } = await auth()
  
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await deleteUser(params.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
```

#### Rate Limiting 주의사항

**검증된 정보 (2025년 7월 업데이트)**:

- **개발 환경**: 100 요청 / 10초
- **프로덕션 환경**: 1,000 요청 / 10초

**최적화 전략**:
1. `currentUser()` 호출 최소화 (클라이언트 `useUser()` 선호)
2. 필요한 경우에만 Backend API 사용
3. 고빈도 동기화는 Webhook 사용 (Rate Limit 없음)
4. 캐싱 전략 구현

---

## Webhook을 통한 이벤트 수신

### 사용 기능

Webhook을 통해 다음 이벤트를 실시간으로 수신합니다:

1. **사용자 이벤트**: `user.created`, `user.updated`, `user.deleted`
2. **세션 이벤트**: `session.created`, `session.ended`, `session.removed`
3. **조직 이벤트**: `organization.created`, `organization.updated`, `organization.deleted`
4. **멤버십 이벤트**: `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`

### 설치 및 세팅

#### 1단계: Svix 패키지 설치

```bash
npm install svix
```

**검증된 정보**: Clerk는 Svix를 공식 Webhook 인프라로 사용합니다.

#### 2단계: 환경 변수 추가

```bash
# .env.local
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Webhook Secret은 Clerk Dashboard → Webhooks → Endpoint → Signing Secret에서 확인 가능합니다.

#### 3단계: Webhook 엔드포인트 생성

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  // Webhook Secret 확인
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set')
  }

  // 헤더 가져오기
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // 헤더 검증
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    )
  }

  // 요청 본문 가져오기
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Svix를 사용한 서명 검증
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // 이벤트 타입별 처리
  const eventType = evt.type

  switch (eventType) {
    case 'user.created':
      await handleUserCreated(evt.data)
      break
    case 'user.updated':
      await handleUserUpdated(evt.data)
      break
    case 'user.deleted':
      await handleUserDeleted(evt.data)
      break
    default:
      console.log(`Unhandled event type: ${eventType}`)
  }

  return NextResponse.json({ message: 'Webhook received' }, { status: 200 })
}

// 이벤트 핸들러 함수들
async function handleUserCreated(data: any) {
  console.log('New user created:', data.id)
  
  // 데이터베이스에 사용자 레코드 생성
  // await db.user.create({
  //   data: {
  //     clerkId: data.id,
  //     email: data.email_addresses[0]?.email_address,
  //     firstName: data.first_name,
  //     lastName: data.last_name,
  //   }
  // })
}

async function handleUserUpdated(data: any) {
  console.log('User updated:', data.id)
  
  // 데이터베이스 업데이트
  // await db.user.update({
  //   where: { clerkId: data.id },
  //   data: {
  //     email: data.email_addresses[0]?.email_address,
  //     firstName: data.first_name,
  //     lastName: data.last_name,
  //   }
  // })
}

async function handleUserDeleted(data: any) {
  console.log('User deleted:', data.id)
  
  // 데이터베이스에서 사용자 삭제
  // await db.user.delete({
  //   where: { clerkId: data.id }
  // })
}
```

#### 4단계: 미들웨어에서 Webhook 라우트 공개 설정

```typescript
// middleware.ts
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // Webhook 엔드포인트는 공개
])
```

#### 5단계: Clerk Dashboard에서 Webhook 등록

1. Clerk Dashboard → Webhooks → Add Endpoint
2. URL 입력: `https://yourdomain.com/api/webhooks/clerk`
3. 이벤트 선택: 수신할 이벤트 타입 체크
4. Save

**로컬 개발**: ngrok, localtunnel, 또는 Clerk의 Svix CLI 사용:
```bash
# Svix CLI 설치
npm install -g svix-cli

# 로컬 서버에 터널 연결
svix listen http://localhost:3000/api/webhooks/clerk
```

### 인증정보 관리 방법

Webhook Secret (`whsec_xxx`)는 서버 환경변수로 관리:

```bash
# 개발 환경
CLERK_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxx

# 프로덕션 환경 (Vercel/배포 플랫폼)
CLERK_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
```

**보안 주의사항**:
1. 항상 Svix 서명 검증 수행
2. Webhook Secret 노출 금지
3. 공개 라우트로 설정하되 서명 검증 필수
4. IP 화이트리스트 추가 고려 (Svix IP 범위)

### Webhook 호출 검증

**검증된 정보**: Clerk Webhook은 다음 3개 헤더를 사용합니다:
- `svix-id`: 고유 메시지 식별자
- `svix-timestamp`: Unix 타임스탬프 (초 단위)
- `svix-signature`: Base64 인코딩된 서명 리스트

**서명 검증 프로세스**:
1. `${svix-id}.${svix-timestamp}.${body}` 문자열 생성
2. HMAC-SHA256으로 서명 생성
3. Base64 인코딩
4. `svix-signature` 헤더의 서명들과 비교

Svix SDK가 자동으로 처리하므로 `wh.verify()` 사용 권장.

---

## 보안 고려사항

### 1. CVE-2025-29927 취약점 대응

**검증된 정보**:
- **영향 대상**: Next.js 11.1.4 ~ 15.2.2
- **패치 버전**: Next.js 15.2.3+, 14.2.25+, 13.5.9+, 12.3.5+
- **심각도**: CVSS 9.1 (Critical)
- **취약점**: `x-middleware-subrequest` 헤더 악용으로 미들웨어 우회 가능

**대응 방안**:
1. Next.js를 15.2.3 이상으로 업그레이드
2. @clerk/nextjs를 5.2 이상으로 업그레이드
3. 미들웨어 외에 Server Components에서도 `auth()` 호출
4. 데이터베이스 레벨 권한 검증 추가

```typescript
// 다층 인증 구현 예시
export default async function ProtectedPage() {
  // 1차: 미들웨어 (CVE 패치 적용 시)
  // 2차: Server Component 인증
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // 3차: 데이터베이스 레벨 검증
  const user = await db.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user || !user.isActive) {
    redirect('/unauthorized')
  }

  return <div>보호된 콘텐츠</div>
}
```

### 2. 환경 변수 보안

```bash
# ❌ 잘못된 예
CLERK_SECRET_KEY=sk_test_xxx  # 커밋하지 말 것!

# ✅ 올바른 예
# .env.local (gitignore에 추가)
CLERK_SECRET_KEY=sk_test_xxx

# .env.example (커밋 가능)
CLERK_SECRET_KEY=your_secret_key_here
```

### 3. Rate Limiting 모니터링

```typescript
// app/api/users/route.ts
export async function GET() {
  try {
    const users = await clerkClient.users.getUserList()
    return NextResponse.json(users)
  } catch (error: any) {
    // Rate Limit 에러 처리
    if (error.status === 429) {
      console.error('Rate limit exceeded')
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }
    throw error
  }
}
```

### 4. 메타데이터 크기 제한

**검증된 정보**:
- **세션 토큰 메타데이터**: 최대 1.2KB
- **전체 메타데이터 저장소**: 최대 8KB

```typescript
// ❌ 나쁜 예 - 큰 데이터를 메타데이터에 저장
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    largeObject: { /* 수백 개의 필드 */ }
  }
})

// ✅ 좋은 예 - 작은 식별자만 저장, 나머지는 DB
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'admin',
    subscriptionTier: 'pro',
  }
})

// 대용량 데이터는 자체 DB에 저장
await db.userProfile.update({
  where: { clerkId: userId },
  data: { largeData: { /* ... */ } }
})
```

---

## 프로덕션 체크리스트

### 필수 사항

- [ ] **Next.js 버전**: 15.2.3 이상 (CVE-2025-29927 패치)
- [ ] **@clerk/nextjs 버전**: 6.0.0 이상
- [ ] **환경 변수**: `.env.local`을 `.gitignore`에 추가
- [ ] **Secret Key**: 프로덕션 환경에서 `sk_live_` 키 사용
- [ ] **미들웨어**: `clerkMiddleware`와 `auth.protect()` 설정
- [ ] **Webhook**: 서명 검증 구현 (`svix` 사용)
- [ ] **Google OAuth**: 커스텀 자격증명 설정 (프로덕션)

### 성능 최적화

- [ ] `currentUser()` 호출 최소화
- [ ] 클라이언트에서는 `useUser()` 훅 사용
- [ ] Rate Limiting 모니터링 설정
- [ ] 메타데이터 크기 1.2KB 이하 유지
- [ ] Webhook 사용으로 Backend API 호출 감소

### 보안 강화

- [ ] 다층 인증 구현 (Middleware + Server Component + DB)
- [ ] Webhook IP 화이트리스트 설정
- [ ] CORS 정책 설정
- [ ] 에러 로깅 및 모니터링 (Sentry 등)
- [ ] 정기적인 API 키 로테이션

### 테스트

- [ ] 회원가입/로그인 플로우 테스트
- [ ] 보호된 라우트 접근 제어 테스트
- [ ] Webhook 이벤트 수신 테스트 (ngrok)
- [ ] Rate Limit 처리 테스트
- [ ] 다양한 브라우저/디바이스 테스트

---

## 참고 문서

- [Clerk 공식 문서](https://clerk.com/docs)
- [Next.js Quickstart (App Router)](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk SDK 레퍼런스](https://clerk.com/docs/reference/nextjs/overview)
- [Webhook 가이드](https://clerk.com/docs/webhooks/overview)
- [Svix 문서](https://docs.svix.com/)
- [CVE-2025-29927 보안 권고](https://nextjs.org/blog/cve-2025-29927)

---

**최종 검증일**: 2025년 10월 26일  
**검증 출처**: Clerk 공식 문서, npm 레지스트리, GitHub 레포지토리, NVD 데이터베이스