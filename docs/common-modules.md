# 공통 모듈 작업 계획

## 1. 개요

본 문서는 블로그 체험단 리뷰 시스템 개발에 앞서 구현해야 할 **공통 모듈**의 작업 계획을 정의합니다. 이 모듈들은 페이지 단위 개발을 시작하기 전에 먼저 구현되어야 하며, 모든 기능 개발의 기반이 됩니다.

### 1.1 목적

- 페이지 단위 개발 시 코드 충돌 방지
- 일관된 코드 스타일 및 패턴 유지
- 재사용 가능한 공통 로직 중앙화
- 병렬 개발 가능한 환경 조성

### 1.2 설계 원칙

- **간결성**: 문서에 명시된 요구사항만 구현
- **확장성**: 향후 기능 추가를 고려한 구조
- **일관성**: 프로젝트 가이드라인 준수 (CLAUDE.md)
- **오버엔지니어링 방지**: 필요한 기능만 구현

---

## 2. 백엔드 공통 모듈

### 2.1 Hono 앱 구성

#### 2.1.1 목적
- 싱글턴 Hono 앱 인스턴스 관리
- 미들웨어 및 라우터 등록 일원화
- Next.js Route Handler와의 통합

#### 2.1.2 주요 기능
- Hono 앱 생성 및 싱글턴 관리
- 전역 미들웨어 등록 (errorBoundary, withAppContext, withSupabase)
- 기능별 라우터 등록 인터페이스 제공

#### 2.1.3 파일 구조
```
src/backend/hono/
├── app.ts           # Hono 앱 생성 및 미들웨어 등록
└── context.ts       # AppEnv, AppContext 타입 정의
```

#### 2.1.4 구현 상태
✅ **완료**: 기본 구조 구현됨
- `src/backend/hono/app.ts`: 싱글턴 패턴 적용
- `src/backend/hono/context.ts`: AppVariables, AppEnv, AppContext 타입 정의
- 미들웨어 순서: errorBoundary → withAppContext → withSupabase

#### 2.1.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

### 2.2 공통 미들웨어

#### 2.2.1 목적
- 에러 핸들링 표준화
- 애플리케이션 컨텍스트 주입
- Supabase 클라이언트 주입
- 요청 로깅 및 모니터링

#### 2.2.2 주요 기능

##### A. errorBoundary (에러 핸들러)
- 모든 라우트에서 발생한 에러 캐치
- 에러 로깅 (콘솔 출력)
- 표준화된 에러 응답 반환

##### B. withAppContext (컨텍스트 미들웨어)
- 환경 변수 파싱 및 검증 (Zod)
- 로거 인스턴스 생성 (console)
- 설정 객체 주입 (c.set)

##### C. withSupabase (Supabase 미들웨어)
- service-role 키로 Supabase 서버 클라이언트 생성
- per-request 클라이언트 주입 (c.set)

#### 2.2.3 파일 구조
```
src/backend/middleware/
├── error.ts         # errorBoundary 미들웨어
├── context.ts       # withAppContext 미들웨어
└── supabase.ts      # withSupabase 미들웨어
```

#### 2.2.4 구현 상태
✅ **완료**: 모든 미들웨어 구현됨

#### 2.2.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

### 2.3 HTTP 응답 헬퍼

#### 2.3.1 목적
- 일관된 API 응답 포맷 유지
- 성공/실패 응답 표준화
- 타입 안전성 보장

#### 2.3.2 주요 기능

##### A. success
- 성공 응답 생성
- 시그니처: `success<TData>(data: TData, status?: ContentfulStatusCode): SuccessResult<TData>`
- 반환 형태: `{ ok: true, status, data }`

##### B. failure
- 실패 응답 생성
- 시그니처: `failure<TCode extends string, TDetails>(status: ContentfulStatusCode, code: TCode, message: string, details?: TDetails): ErrorResult<TCode, TDetails>`
- 반환 형태: `{ ok: false, status, error: { code, message, details? } }`

##### C. respond
- HandlerResult를 Hono Response로 변환
- 시그니처: `respond<TData, TCode extends string, TDetails>(c: AppContext, result: HandlerResult<TData, TCode, TDetails>)`
- `ok: true` → `c.json(data, status)`
- `ok: false` → `c.json({ error }, status)`

#### 2.3.3 파일 구조
```
src/backend/http/
└── response.ts      # success, failure, respond 함수
```

#### 2.3.4 구현 상태
✅ **완료**: 모든 헬퍼 함수 구현됨

#### 2.3.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

### 2.4 Supabase 클라이언트 설정

#### 2.4.1 목적
- Supabase 서버 클라이언트 생성
- service-role 키를 사용한 관리자 권한 접근
- RLS 우회 (프로젝트 가이드라인에 따름)

#### 2.4.2 주요 기능
- `createSupabaseServerClient` 함수 제공
- 환경 변수 검증 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Supabase 클라이언트 인스턴스 반환

#### 2.4.3 파일 구조
```
src/backend/supabase/
└── client.ts        # createSupabaseServerClient 함수
```

#### 2.4.4 구현 상태
✅ **완료**: Supabase 서버 클라이언트 구현됨

#### 2.4.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

### 2.5 환경 변수 설정 및 검증

#### 2.5.1 목적
- 환경 변수 타입 안전성 보장
- 런타임 검증 자동화
- 설정 중앙화

#### 2.5.2 주요 기능
- Zod 스키마로 환경 변수 검증
- 파싱된 설정 객체 캐싱
- 타입 안전한 설정 접근

#### 2.5.3 파일 구조
```
src/backend/config/
└── index.ts         # 환경 변수 파싱 및 캐싱
```

#### 2.5.4 구현 상태
✅ **완료**: 환경 변수 설정 구현됨

#### 2.5.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

## 3. 프론트엔드 공통 모듈

### 3.1 API 클라이언트

#### 3.1.1 목적
- HTTP 요청 중앙화
- 일관된 에러 처리
- 타입 안전한 API 호출

#### 3.1.2 주요 기능
- axios 인스턴스 생성 및 설정
- baseURL 설정 (NEXT_PUBLIC_API_BASE_URL)
- `extractApiErrorMessage` 헬퍼 함수 제공

#### 3.1.3 파일 구조
```
src/lib/remote/
└── api-client.ts    # axios 인스턴스 및 에러 추출 함수
```

#### 3.1.4 구현 상태
✅ **완료**: API 클라이언트 구현됨

#### 3.1.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

### 3.2 인증 관련 컴포넌트 및 훅

#### 3.2.1 목적
- 사용자 인증 상태 관리
- 역할 기반 접근 제어
- 세션 자동 갱신

#### 3.2.2 주요 기능

##### A. CurrentUserContext
- 현재 사용자 정보 관리
- 인증 상태 추적 (loading, authenticated, unauthenticated)
- 사용자 정보 새로고침 기능

##### B. useCurrentUser
- CurrentUserContext 접근 훅
- 타입 안전한 사용자 정보 반환
- `{ user, status, isAuthenticated, isLoading, refresh }`

##### C. loadCurrentUser (서버 컴포넌트)
- 서버 사이드에서 현재 사용자 로드
- Supabase SSR을 통한 세션 검증
- 초기 상태 생성 (CurrentUserSnapshot)

#### 3.2.3 파일 구조
```
src/features/auth/
├── context/
│   └── current-user-context.tsx    # CurrentUserProvider, useCurrentUserContext
├── hooks/
│   └── useCurrentUser.ts           # useCurrentUser 훅
├── server/
│   └── load-current-user.ts        # loadCurrentUser 함수
└── types.ts                        # CurrentUser, CurrentUserSnapshot 타입
```

#### 3.2.4 구현 상태
✅ **완료**: 인증 컨텍스트 및 훅 구현됨

#### 3.2.5 추가 작업 필요 사항
**🔄 추가 구현 필요**:
1. **역할 정보 확장**: `CurrentUser` 타입에 역할 정보 추가
   - `role: 'advertiser' | 'influencer' | null`
   - `hasProfile: boolean`
2. **프로필 조회 API 통합**: `/api/profile` 엔드포인트 생성
   - 사용자 역할 및 프로필 등록 여부 반환
3. **loadCurrentUser 개선**: 역할 정보까지 서버 사이드에서 로드

---

### 3.3 공통 레이아웃

#### 3.3.1 목적
- 일관된 UI 구조 제공
- 헤더, 푸터, 네비게이션 재사용
- 반응형 레이아웃 지원

#### 3.3.2 주요 기능

##### A. Header
- 로고 및 서비스명 표시
- 로그인/로그아웃 버튼
- 역할별 메뉴 (광고주: 대시보드, 인플루언서: 내 지원 목록)
- 모바일 햄버거 메뉴

##### B. Footer
- 저작권 정보
- 간단한 링크 (예: 개인정보처리방침, 이용약관)

##### C. Navigation
- 역할별 네비게이션 메뉴
- 현재 페이지 하이라이트

#### 3.3.3 파일 구조
```
src/components/layout/
├── header.tsx       # 헤더 컴포넌트
├── footer.tsx       # 푸터 컴포넌트
└── navigation.tsx   # 네비게이션 컴포넌트 (역할별)
```

#### 3.3.4 구현 상태
❌ **미구현**: 레이아웃 컴포넌트 없음

#### 3.3.5 추가 작업 필요 사항
**🔄 추가 구현 필요**:
1. **Header 컴포넌트**:
   - 로고 및 서비스명
   - 로그인 상태에 따른 버튼 표시 (로그인/로그아웃)
   - 역할별 메뉴 (useCurrentUser 훅 활용)
   - 모바일 반응형 (Sheet 컴포넌트 활용)
2. **Footer 컴포넌트**:
   - 저작권 정보
   - 간단한 링크
3. **Navigation 컴포넌트**:
   - 역할별 메뉴 항목 표시
   - 현재 페이지 활성화 표시

---

### 3.4 공통 UI 컴포넌트

#### 3.4.1 목적
- shadcn-ui 기반 재사용 가능한 컴포넌트 제공
- 일관된 디자인 시스템 유지
- 접근성 보장

#### 3.4.2 주요 기능
- shadcn-ui 컴포넌트 활용
- 프로젝트 요구사항에 맞는 커스터마이징

#### 3.4.3 파일 구조
```
src/components/ui/
├── button.tsx       # 버튼
├── input.tsx        # 텍스트 입력
├── textarea.tsx     # 텍스트 영역
├── select.tsx       # 셀렉트 박스
├── checkbox.tsx     # 체크박스
├── card.tsx         # 카드
├── badge.tsx        # 뱃지
├── toast.tsx        # 토스트 메시지
├── dialog.tsx       # 다이얼로그 (모달)
├── sheet.tsx        # 시트 (사이드 패널)
├── form.tsx         # 폼 (react-hook-form 통합)
├── label.tsx        # 레이블
└── ...              # 기타 shadcn-ui 컴포넌트
```

#### 3.4.4 구현 상태
✅ **완료**: 주요 shadcn-ui 컴포넌트 설치됨
- button, input, textarea, select, checkbox
- card, badge, toast, toaster
- dialog (추가 필요), sheet
- form, label
- accordion, avatar, dropdown-menu, separator

#### 3.4.5 추가 작업 필요 사항
**🔄 추가 컴포넌트 필요**:
1. **Dialog**: 모달 컴포넌트 (체험단 등록, 인플루언서 선정)
2. **DatePicker**: 날짜 선택 컴포넌트 (생년월일, 모집 기간, 방문 예정일)
3. **Table**: 테이블 컴포넌트 (신청자 리스트, 내 지원 목록)

**설치 명령어**:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add date-picker
npx shadcn@latest add table
```

---

### 3.5 React Query 설정

#### 3.5.1 목적
- 서버 상태 관리 중앙화
- 캐싱 및 자동 갱신
- 일관된 로딩/에러 처리

#### 3.5.2 주요 기능
- QueryClient 설정 및 제공
- staleTime 설정 (60초)
- 서버/클라이언트 QueryClient 분리

#### 3.5.3 파일 구조
```
src/app/
└── providers.tsx    # QueryClientProvider 설정
```

#### 3.5.4 구현 상태
✅ **완료**: React Query 설정 완료
- staleTime: 60초
- 서버/클라이언트 분리

#### 3.5.5 추가 작업 필요 사항
- 없음 (현재 구조로 충분)

---

### 3.6 Zustand 스토어 (전역 상태)

#### 3.6.1 목적
- 클라이언트 전역 상태 관리
- 간단한 상태 로직 중앙화
- 역할 선택 임시 저장 등

#### 3.6.2 주요 기능
- 역할 선택 임시 저장 (회원가입 플로우)
- UI 상태 관리 (모달 열림/닫힘 등)

#### 3.6.3 파일 구조
```
src/store/
├── auth-store.ts    # 인증 관련 상태 (역할 선택)
└── ui-store.ts      # UI 상태 (선택사항)
```

#### 3.6.4 구현 상태
❌ **미구현**: Zustand 스토어 없음

#### 3.6.5 추가 작업 필요 사항
**🔄 추가 구현 필요**:
1. **auth-store**: 역할 선택 임시 저장
   - `selectedRole: 'advertiser' | 'influencer' | null`
   - `setSelectedRole(role)`
   - `clearSelectedRole()`

---

### 3.7 공통 유틸리티 함수

#### 3.7.1 목적
- 자주 사용되는 로직 재사용
- 일관된 포맷팅 및 검증
- 타입 안전성 보장

#### 3.7.2 주요 기능

##### A. 날짜 포맷팅 (date-fns)
- `formatDate(date: Date | string, format: string): string`
- `formatRelative(date: Date | string): string` (예: "D-7")
- `isPast(date: Date | string): boolean`
- `isFuture(date: Date | string): boolean`

##### B. 전화번호 포맷팅
- `formatPhoneNumber(phone: string): string` (010-XXXX-XXXX)
- `validatePhoneNumber(phone: string): boolean`

##### C. 사업자등록번호 포맷팅
- `formatBusinessNumber(bizNo: string): string` (XXX-XX-XXXXX)
- `validateBusinessNumber(bizNo: string): boolean`

##### D. 문자열 유틸리티
- `truncate(text: string, maxLength: number): string`
- `nl2br(text: string): string` (개행 문자를 <br> 태그로 변환)

#### 3.7.3 파일 구조
```
src/lib/utils/
├── date.ts          # 날짜 관련 유틸리티
├── format.ts        # 포맷팅 유틸리티
└── string.ts        # 문자열 유틸리티
```

#### 3.7.4 구현 상태
❌ **미구현**: 유틸리티 함수 없음

#### 3.7.5 추가 작업 필요 사항
**🔄 추가 구현 필요**:
1. **date.ts**: date-fns 기반 날짜 유틸리티
2. **format.ts**: 전화번호, 사업자등록번호 포맷팅
3. **string.ts**: 문자열 조작 유틸리티

---

## 4. 데이터베이스 마이그레이션

### 4.1 목적
- 데이터베이스 스키마 버전 관리
- 일관된 테이블 구조 유지
- 팀 간 스키마 동기화

### 4.2 마이그레이션 파일 목록

#### 4.2.1 ENUM 타입
```sql
-- 0002_create_enums.sql
CREATE TYPE campaign_status_enum AS ENUM ('모집중', '모집종료', '선정완료');
CREATE TYPE application_status_enum AS ENUM ('신청완료', '선정', '반려');
CREATE TYPE campaign_category_enum AS ENUM ('음식점', '카페', '뷰티', '패션', '생활', '기타');
```

#### 4.2.2 advertisers 테이블
```sql
-- 0003_create_advertisers_table.sql
CREATE TABLE IF NOT EXISTS public.advertisers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_date date NOT NULL,
  phone text NOT NULL,
  business_name text NOT NULL,
  address text NOT NULL,
  business_phone text NOT NULL,
  business_registration_number text NOT NULL,
  representative_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 4.2.3 influencers 테이블
```sql
-- 0004_create_influencers_table.sql
CREATE TABLE IF NOT EXISTS public.influencers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_date date NOT NULL,
  phone text NOT NULL,
  channel_name text NOT NULL,
  channel_link text NOT NULL,
  followers_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencers_followers_count_positive CHECK (followers_count >= 0)
);
```

#### 4.2.4 campaigns 테이블
```sql
-- 0005_create_campaigns_table.sql
CREATE TABLE IF NOT EXISTS public.campaigns (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  advertiser_id bigint NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
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
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_recruitment_count_positive CHECK (recruitment_count >= 1),
  CONSTRAINT campaigns_recruitment_date_valid CHECK (recruitment_end_date >= recruitment_start_date)
);
```

#### 4.2.5 applications 테이블
```sql
-- 0006_create_applications_table.sql
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
```

#### 4.2.6 updated_at 트리거
```sql
-- 0007_create_updated_at_trigger.sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.advertisers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.influencers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

#### 4.2.7 인덱스
```sql
-- 0008_create_indexes.sql
-- advertisers 인덱스
CREATE INDEX IF NOT EXISTS idx_advertisers_user_id ON public.advertisers(user_id);

-- influencers 인덱스
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_influencers_followers_count ON public.influencers(followers_count DESC);

-- campaigns 인덱스
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON public.campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created_at ON public.campaigns(status, created_at DESC);

-- applications 인덱스
CREATE INDEX IF NOT EXISTS idx_applications_campaign_id ON public.applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_influencer_id ON public.applications(influencer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications(applied_at DESC);
```

#### 4.2.8 RLS 비활성화
```sql
-- 0009_disable_rls.sql
ALTER TABLE public.advertisers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
```

### 4.3 구현 상태
❌ **미구현**: 마이그레이션 파일 없음 (example 테이블만 존재)

### 4.4 추가 작업 필요 사항
**🔄 마이그레이션 파일 작성 필요**:
1. `0002_create_enums.sql`
2. `0003_create_advertisers_table.sql`
3. `0004_create_influencers_table.sql`
4. `0005_create_campaigns_table.sql`
5. `0006_create_applications_table.sql`
6. `0007_create_updated_at_trigger.sql`
7. `0008_create_indexes.sql`
8. `0009_disable_rls.sql`

**주의**: 사용자가 직접 Supabase에 마이그레이션 적용

---

## 5. 공통 Backend API 엔드포인트

### 5.1 /api/profile

#### 5.1.1 목적
- 현재 사용자의 역할 및 프로필 정보 조회
- 인증 상태 확인
- 접근 제어 판단 근거 제공

#### 5.1.2 엔드포인트
- **GET /api/profile**

#### 5.1.3 요청
- **인증**: 필수 (세션 쿠키)
- **쿼리 파라미터**: 없음

#### 5.1.4 응답
```typescript
// 성공 (200 OK)
{
  user: {
    id: string;
    email: string;
  };
  role: 'advertiser' | 'influencer' | null;
  hasProfile: boolean;
  profile?: {
    // advertisers 또는 influencers 테이블 데이터
  };
}

// 실패 (401 Unauthorized)
{
  error: {
    code: 'UNAUTHORIZED';
    message: '로그인이 필요합니다';
  }
}
```

#### 5.1.5 파일 구조
```
src/features/profile/
├── backend/
│   ├── route.ts        # Hono 라우터
│   ├── service.ts      # Supabase 조회 로직
│   ├── schema.ts       # Zod 스키마
│   └── error.ts        # 에러 코드 정의
└── lib/
    └── dto.ts          # 프론트엔드 DTO 재노출
```

#### 5.1.6 구현 상태
❌ **미구현**: /api/profile 엔드포인트 없음

#### 5.1.7 추가 작업 필요 사항
**🔄 추가 구현 필요**:
1. `src/features/profile/backend/route.ts`: GET /api/profile 라우터
2. `src/features/profile/backend/service.ts`: 역할 및 프로필 조회 로직
3. `src/features/profile/backend/schema.ts`: 응답 스키마
4. `src/features/profile/lib/dto.ts`: 프론트엔드 DTO

---

## 6. 구현 순서

### Phase 1: 데이터베이스 마이그레이션 (최우선)
1. ✅ example 테이블 삭제 또는 무시
2. 🔄 ENUM 타입 생성 (0002_create_enums.sql)
3. 🔄 advertisers 테이블 생성 (0003_create_advertisers_table.sql)
4. 🔄 influencers 테이블 생성 (0004_create_influencers_table.sql)
5. 🔄 campaigns 테이블 생성 (0005_create_campaigns_table.sql)
6. 🔄 applications 테이블 생성 (0006_create_applications_table.sql)
7. 🔄 updated_at 트리거 생성 (0007_create_updated_at_trigger.sql)
8. 🔄 인덱스 생성 (0008_create_indexes.sql)
9. 🔄 RLS 비활성화 (0009_disable_rls.sql)

### Phase 2: 백엔드 공통 모듈 (완료)
1. ✅ Hono 앱 구성 (app.ts, context.ts)
2. ✅ 미들웨어 (error.ts, context.ts, supabase.ts)
3. ✅ HTTP 응답 헬퍼 (response.ts)
4. ✅ Supabase 클라이언트 (client.ts)
5. ✅ 환경 변수 설정 (config/index.ts)

### Phase 3: 프론트엔드 공통 모듈 (일부 완료)
1. ✅ API 클라이언트 (api-client.ts)
2. ✅ React Query 설정 (providers.tsx)
3. ✅ CurrentUserContext (current-user-context.tsx)
4. 🔄 CurrentUser 타입 확장 (role, hasProfile 추가)
5. 🔄 공통 레이아웃 (header.tsx, footer.tsx, navigation.tsx)
6. 🔄 Zustand 스토어 (auth-store.ts)
7. 🔄 공통 유틸리티 함수 (date.ts, format.ts, string.ts)

### Phase 4: 추가 UI 컴포넌트
1. 🔄 Dialog 컴포넌트 설치
2. 🔄 DatePicker 컴포넌트 설치
3. 🔄 Table 컴포넌트 설치

### Phase 5: 공통 API 엔드포인트
1. 🔄 /api/profile 구현 (route.ts, service.ts, schema.ts)
2. 🔄 CurrentUserContext와 /api/profile 통합

---

## 7. 검증 체크리스트

### 7.1 백엔드 공통 모듈 검증
- [x] Hono 앱이 싱글턴으로 관리되는가?
- [x] 모든 미들웨어가 올바른 순서로 등록되었는가?
- [x] success/failure/respond 헬퍼가 일관된 응답을 반환하는가?
- [x] Supabase 서버 클라이언트가 service-role 키를 사용하는가?
- [x] 환경 변수가 Zod로 검증되는가?

### 7.2 프론트엔드 공통 모듈 검증
- [x] API 클라이언트가 모든 요청에서 사용되는가?
- [x] React Query가 올바르게 설정되었는가?
- [ ] CurrentUserContext가 역할 및 프로필 정보를 포함하는가?
- [ ] 공통 레이아웃이 모든 페이지에서 재사용되는가?
- [ ] Zustand 스토어가 역할 선택을 저장하는가?
- [ ] 유틸리티 함수가 일관된 포맷을 유지하는가?

### 7.3 데이터베이스 검증
- [ ] 모든 테이블이 생성되었는가?
- [ ] ENUM 타입이 올바르게 정의되었는가?
- [ ] 외래키 제약조건이 설정되었는가?
- [ ] 인덱스가 쿼리 최적화에 도움이 되는가?
- [ ] RLS가 비활성화되었는가?
- [ ] updated_at 트리거가 모든 테이블에 적용되었는가?

### 7.4 API 엔드포인트 검증
- [ ] /api/profile이 역할 정보를 반환하는가?
- [ ] 인증되지 않은 사용자에게 401을 반환하는가?
- [ ] 응답 스키마가 타입 안전한가?

---

## 8. 코드 충돌 방지 전략

### 8.1 명명 규칙
- 기능별 라우터: `registerXxxRoutes(app)` 형태
- 서비스 함수: `src/features/[feature]/backend/service.ts`
- 스키마: `src/features/[feature]/backend/schema.ts`
- 에러 코드: `src/features/[feature]/backend/error.ts`

### 8.2 파일 분리
- 각 페이지별 기능은 독립적인 폴더에 격리
- 공통 모듈은 `src/backend/`, `src/lib/`, `src/components/` 에 중앙화

### 8.3 병렬 개발 가능 여부
**✅ 병렬 개발 가능**:
- 공통 모듈 구현 완료 후 각 페이지는 독립적으로 개발 가능
- 각 페이지는 `src/features/[feature]/` 폴더에서 독립적으로 작업
- 공통 모듈에 의존하지만 서로 충돌하지 않음

**⚠️ 순차 개발 필요**:
- 데이터베이스 마이그레이션 (Phase 1)
- /api/profile 엔드포인트 (Phase 5)
- CurrentUser 타입 확장 (Phase 3-4)

---

## 9. 참고 문서

- `/docs/prd.md`: 제품 요구사항 문서
- `/docs/userflow.md`: 사용자 플로우
- `/docs/database.md`: 데이터베이스 설계
- `/docs/usecases/*/spec.md`: 유스케이스 명세서
- `CLAUDE.md`: 프로젝트 개발 가이드라인

---

## 10. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
