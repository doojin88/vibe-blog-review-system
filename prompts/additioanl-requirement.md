# 추가 요구사항 구현 가이드

다음 작업을 순차적으로 수행하세요:

---

## 1단계: 추가 요구사항 분석

### 1.1 요구사항 파일 읽기
- `/docs/requirement2.md` 파일을 읽고 내용을 완전히 이해합니다
- 요구사항의 핵심 기능, 변경사항, 영향 범위를 명확히 파악합니다

### 1.2 기존 문서와의 충돌 검토
다음 항목을 반드시 확인하세요:

#### a) 기능 충돌 점검
- **기존 기능 대체 여부**: 추가 요구사항이 기존 기능을 완전히 대체하는가?
  - 예: 기존 비로그인 방식을 로그인 방식으로 전환하는가?
  - 대체하는 경우: 기존 기능 deprecation 전략 수립 필요
  - 공존하는 경우: 분기 로직 및 호환성 전략 수립 필요

#### b) 데이터 모델 충돌 점검
- **테이블 변경 영향도**: 기존 테이블에 새로운 컬럼이 추가되는가?
  - `NOT NULL` 컬럼 추가 시 기존 데이터 마이그레이션 전략 필요
  - 외래키(Foreign Key) 추가 시 데이터 무결성 검증 필요
- **관계 변경**: 기존 테이블 간 관계가 변경되는가?
  - 1:N 관계가 M:N 관계로 변경되는 경우 중간 테이블 추가 필요
  - CASCADE 옵션 재검토 필요

#### c) API 엔드포인트 충돌 점검
- **기존 API 변경 여부**: 추가 요구사항이 기존 API 응답 형식을 변경하는가?
  - Breaking Change인 경우: API 버저닝(v2) 전략 수립 필요
  - Non-breaking Change인 경우: 하위 호환성 유지 전략 필요
- **새 엔드포인트 추가**: 기존 라우팅과 충돌하지 않는지 확인
  - 예: `/api/auth/signup` vs `/api/user/signup` 등 중복 방지

#### d) UI/UX 충돌 점검
- **네비게이션 구조 변경**: 기존 페이지 구조가 변경되는가?
  - 예: 단일 페이지에서 탭 기반 멀티 페이지로 전환
  - URL 구조 변경 시 리디렉션 전략 필요
- **레이아웃 충돌**: 새로운 컴포넌트가 기존 레이아웃과 충돌하는가?
  - 예: 하단 탭바 추가로 기존 Footer와 충돌 가능성
- **상태 관리 충돌**: 전역 상태와 로컬 상태 간 충돌 가능성
  - 예: 로그인 상태 추가로 기존 비로그인 전제 로직과 충돌

#### e) 비즈니스 로직 충돌 점검
- **권한 체계 변경**: 비로그인에서 로그인 방식으로 전환 시
  - 기존 비로그인 리뷰는 어떻게 처리할지 결정 필요
  - 익명 사용자와 로그인 사용자의 권한 분리 전략 필요
- **데이터 소유권**: 사용자 데이터 연결 방식 변경 시
  - 기존 임시 비밀번호 기반 리뷰를 사용자 계정과 연결할지 결정 필요

### 1.3 영향 범위 분석
다음 레이어별 영향을 분석하세요:

| 레이어 | 점검 항목 | 충돌 가능성 |
|--------|----------|-----------|
| **Frontend** | 페이지 구조, 컴포넌트, 라우팅, 상태 관리 | 높음 |
| **Backend** | API 엔드포인트, 비즈니스 로직, 인증/인가 | 높음 |
| **Database** | 테이블 스키마, 관계, 마이그레이션 | 매우 높음 |
| **External API** | 네이버 API, 카카오 API 등 외부 의존성 | 중간 |
| **DevOps** | 환경 변수, 배포 설정, 도메인 설정 | 중간 |

---

## 2단계: SOT(Single Source of Truth) 문서 업데이트

다음 순서대로 문서를 검토하고 필요시 업데이트합니다. **각 문서는 이전 문서의 내용을 기반으로 작성되므로 순서를 반드시 준수하세요.**

### 2.1 PRD (Product Requirements Document) 업데이트

**파일 경로**: `/docs/prd.md`

**업데이트 전 확인사항**:
- [ ] 기존 PRD를 전체 읽고 컨텍스트 파악
- [ ] 추가 요구사항이 기존 "제품 범위"와 충돌하는지 확인
- [ ] 기존 "제외 범위"에 있던 항목이 "포함 범위"로 변경되는지 확인

**업데이트 항목**:

#### a) 제품 개요 (섹션 1)
- **1.3 핵심 가치**: 로그인 기능 추가로 "간편성" 가치 문구 조정 필요
  - 변경 전: "회원가입 없이 즉시 사용 가능"
  - 변경 후: "카카오 로그인으로 빠른 회원가입 가능" 등
- **1.4 제품 범위**:
  - "포함 범위"에 새 기능 추가 (예: 카카오 로그인, 하단 탭바, 마이페이지 등)
  - "제외 범위"에서 구현된 항목 제거 (예: 소셜 로그인 연동, 사용자 프로필 관리)
  - **주의**: 기존 비로그인 방식과 신규 로그인 방식의 공존 여부 명시

#### b) 사용자 페르소나 (섹션 4)
- 새로운 페르소나 추가 가능성 검토
  - 예: "로그인하여 리뷰 관리를 원하는 사용자" 페르소나 추가
- 기존 페르소나의 "페인 포인트" 재검토
  - "회원가입 절차가 번거로움" → 카카오 로그인으로 해결되었는지 반영

#### c) 포함 페이지 (섹션 5)
- **5.1 페이지 구조 개요**: 총 페이지 개수 업데이트
  - 변경 전: "총 3개의 주요 페이지"
  - 변경 후: 하단 탭바 추가 시 "총 5개 이상의 주요 페이지" 등
- **5.2 페이지 상세**: 새 페이지 섹션 추가
  - **5.2.4 탐색 페이지**: 전체 장소 목록, 정렬 기능 등
  - **5.2.5 마이페이지**: 사용자 정보, 리뷰 내역, 통계, 로그아웃 버튼
  - **5.2.6 로그인 페이지**: 카카오 로그인 버튼
  - **5.2.7 회원가입 페이지**: 닉네임 입력 (카카오 연동 후)
- **5.3 공통 레이아웃**: 하단 탭바 추가로 레이아웃 제약사항 업데이트

#### d) 사용자 여정 (섹션 6)
- 새로운 여정 추가:
  - **Journey 4**: 비로그인 상태로 접근 후 로그인 모달 경험
  - **Journey 5**: 카카오 로그인 및 회원가입 여정
  - **Journey 6**: 마이페이지에서 내 리뷰 확인 및 로그아웃

#### e) 정보 구조 (섹션 7)
- **7.1 사이트맵**: 새로운 페이지 및 네비게이션 추가
  - 하단 탭바: Home / 탐색 / 마이페이지
  - 로그인/회원가입 플로우 추가
- **7.2 네비게이션 플로우**: 비로그인 → 로그인 모달 → 로그인 페이지 플로우 추가
- **7.3 URL 구조**: 새 URL 경로 추가
  - `/explore`: 탐색 페이지
  - `/mypage`: 마이페이지
  - `/auth/login`: 로그인 페이지
  - `/auth/signup`: 회원가입 페이지

#### f) 기능 요구사항 (섹션 8)
- 새로운 기능 그룹 추가:
  - **FR-AUTH**: 인증 기능 (카카오 로그인, 회원가입, 로그아웃)
  - **FR-MYPAGE**: 마이페이지 기능 (사용자 정보, 리뷰 내역, 통계)
  - **FR-EXPLORE**: 탐색 기능 (전체 장소 목록, 정렬)
  - **FR-NAV**: 하단 탭바 네비게이션
- **충돌 주의**: 기존 FR-REVIEW-CREATE와 신규 인증 로직 통합 방식 명시

#### g) 비기능 요구사항 (섹션 9)
- **NFR-SECURITY**: 카카오 OAuth 보안 요구사항 추가
  - Access Token, Refresh Token 관리 전략
  - CSRF 방어 전략
- **NFR-PERF**: 새 페이지 로딩 목표 추가
  - 마이페이지 초기 로딩: 2초 이내 등

#### h) 사용자 스토리 (섹션 10)
- 새로운 Epic 추가:
  - **Epic 6**: 사용자 인증 (로그인, 회원가입, 로그아웃)
  - **Epic 7**: 마이페이지 (내 정보, 리뷰 관리)
  - **Epic 8**: 탐색 (전체 장소 목록, 정렬)

#### i) 우선순위 (섹션 11)
- 새 기능의 우선순위 결정
  - 카카오 로그인: P0 (Must Have)
  - 하단 탭바: P0 (Must Have)
  - 마이페이지: P0 (Must Have)
  - 탐색 페이지: P0 (Must Have)

#### j) 기술 스택 (섹션 12)
- 새로운 라이브러리 추가:
  - 카카오 SDK 또는 OAuth 라이브러리
  - JWT 토큰 관리 라이브러리
- 아키텍처 다이어그램 업데이트

**업데이트 후 검증**:
- [ ] 기존 내용과 신규 내용의 일관성 확인
- [ ] 섹션 간 참조(cross-reference) 확인
- [ ] 제품 범위 "포함/제외" 항목 재검토

---

### 2.2 Userflow 업데이트

**파일 경로**: `/docs/userflow.md`

**업데이트 전 확인사항**:
- [ ] 업데이트된 PRD를 참조하여 새로운 페이지 및 기능 파악
- [ ] 기존 사용자 플로우와 신규 플로우의 연결점 확인

**업데이트 항목**:

#### a) 비로그인 → 로그인 모달 플로우
```
비로그인 상태
  ↓ (홈/탐색 접근 시)
중앙 로그인 요구 모달 표시
  ↓ (로그인 버튼 클릭)
로그인 페이지 이동
  ↓ (카카오 로그인)
카카오 OAuth 인증
  ↓ (최초 가입자)
닉네임 입력 페이지
  ↓ (완료)
요청했던 페이지로 리디렉션
```

#### b) 하단 탭바 네비게이션 플로우
```
홈 탭 ←→ 탐색 탭 ←→ 마이페이지 탭
```

#### c) 마이페이지 플로우
```
마이페이지 진입
  ↓
사용자 정보 표시
  ↓
내 리뷰 목록 확인
  ↓ (리뷰 클릭)
장소 상세 페이지 이동
  ↓ (로그아웃 버튼)
로그아웃 처리 → 홈으로 이동
```

#### d) 탐색 페이지 플로우
```
탐색 탭 진입
  ↓
전체 장소 목록 표시
  ↓ (정렬 옵션 선택)
별점순/최근 리뷰순/리뷰많은순 정렬
  ↓ (장소 클릭)
장소 상세 페이지 이동
```

**플로우 다이어그램 형식**:
- Mermaid, PlantUML, 또는 텍스트 기반 다이어그램 사용
- 각 상태 전환에 조건 명시 (예: "로그인 상태인 경우", "비로그인 상태인 경우")

**업데이트 후 검증**:
- [ ] 모든 페이지가 플로우에 포함되었는지 확인
- [ ] Dead-end(막다른 길) 상태가 없는지 확인
- [ ] PRD의 사용자 여정과 일치하는지 확인

---

### 2.3 Database 설계 업데이트

**파일 경로**: `/docs/database.md`

**업데이트 전 확인사항**:
- [ ] 기존 ERD(Entity-Relationship Diagram) 파악
- [ ] 새 기능에 필요한 테이블 및 컬럼 식별
- [ ] 기존 테이블 수정 vs 새 테이블 추가 판단

**업데이트 항목**:

#### a) 새 테이블 추가
**users 테이블**:
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kakao_id VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**주의사항**:
- `kakao_id`는 카카오에서 제공하는 고유 식별자
- `UNIQUE` 제약조건으로 중복 가입 방지
- 개인정보(email) 컬럼은 선택적(NULL 허용)

#### b) 기존 테이블 수정
**reviews 테이블**:
```sql
-- 기존 컬럼
ALTER TABLE reviews
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;

-- 주의: author_name과 password는 is_anonymous=TRUE일 때만 사용
-- user_id는 is_anonymous=FALSE일 때만 NOT NULL
```

**충돌 해결 전략**:
- **기존 비로그인 리뷰 처리**:
  - `is_anonymous=TRUE`로 설정
  - `user_id=NULL` 허용
- **신규 로그인 리뷰**:
  - `is_anonymous=FALSE`
  - `user_id` 필수

#### c) 인덱스 추가
```sql
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_users_kakao_id ON users(kakao_id);
```

#### d) ERD 업데이트
```
users (1) ----< (N) reviews
  id              user_id (FK, nullable)
```

**마이그레이션 전략**:
1. 새 테이블 생성 (`users`)
2. 기존 테이블에 새 컬럼 추가 (`reviews.user_id`, `reviews.is_anonymous`)
3. 기존 데이터에 `is_anonymous=TRUE` 일괄 업데이트
4. 인덱스 생성

**업데이트 후 검증**:
- [ ] 기존 데이터가 깨지지 않는지 확인 (NULL 제약조건 주의)
- [ ] Foreign Key 관계가 올바른지 확인
- [ ] 마이그레이션 SQL이 idempotent(멱등성)한지 확인

---

### 2.4 Usecases 업데이트

**파일 경로**: `/docs/usecases/N-name/spec.md` (N은 번호, name은 기능명)

**업데이트 전 확인사항**:
- [ ] 기존 usecases 목록 확인
- [ ] 새 기능과 관련된 유스케이스 식별
- [ ] 기존 유스케이스 수정 vs 새 유스케이스 추가 판단

**새로운 Usecases 추가**:

#### a) `/docs/usecases/5-auth-login/spec.md`
```markdown
# Usecase 5: 카카오 로그인

## 목표
사용자가 카카오 계정으로 로그인하여 개인화된 서비스를 이용한다.

## 액터
- 비로그인 사용자

## 사전 조건
- 사용자가 카카오 계정을 보유함
- 앱이 카카오 OAuth 클라이언트로 등록됨

## 기본 플로우
1. 사용자가 로그인 페이지에 접근
2. '카카오로 시작하기' 버튼 클릭
3. 카카오 OAuth 페이지로 리디렉션
4. 사용자가 카카오 계정으로 로그인
5. 앱으로 리디렉션 (Authorization Code 포함)
6. 서버가 Code를 Access Token으로 교환
7. 카카오 API로 사용자 정보 조회
8. DB에 사용자 존재 여부 확인
   - 존재: 로그인 처리
   - 미존재: 회원가입 페이지로 이동

## 대체 플로우
- 3a. 카카오 로그인 취소: 로그인 페이지로 복귀
- 6a. Token 교환 실패: 에러 메시지 표시

## 사후 조건
- 사용자가 로그인 상태로 전환
- 세션 또는 JWT 토큰 발급
```

#### b) `/docs/usecases/6-auth-signup/spec.md`
```markdown
# Usecase 6: 회원가입 (닉네임 입력)

## 목표
카카오 로그인 후 최초 가입 시 닉네임을 입력하여 회원가입을 완료한다.

## 액터
- 최초 가입 사용자

## 사전 조건
- 카카오 OAuth 인증 완료
- 사용자가 DB에 미등록 상태

## 기본 플로우
1. 회원가입 페이지 표시
2. 닉네임 입력 필드 제공
3. 사용자가 닉네임 입력
4. 제출 버튼 클릭
5. 닉네임 유효성 검증 (2~20자, 중복 체크)
6. users 테이블에 사용자 정보 저장
7. 로그인 처리 (세션/JWT 발급)
8. 원래 요청했던 페이지로 리디렉션

## 대체 플로우
- 5a. 유효성 실패: 에러 메시지 표시, 재입력 요구

## 사후 조건
- 사용자 계정 생성 완료
- 로그인 상태로 전환
```

#### c) `/docs/usecases/7-mypage-reviews/spec.md`
```markdown
# Usecase 7: 마이페이지 내 리뷰 확인

## 목표
사용자가 자신이 작성한 리뷰 목록을 확인한다.

## 액터
- 로그인 사용자

## 사전 조건
- 사용자가 로그인 상태

## 기본 플로우
1. 하단 탭바에서 '마이페이지' 탭 클릭
2. 마이페이지 로딩
3. 사용자 정보 표시 (닉네임, 프로필 이미지)
4. 내 리뷰 목록 조회 (user_id 기반)
5. 리뷰 목록 표시 (최신순)
6. 각 리뷰 아이템 클릭 시 장소 상세 페이지로 이동

## 대체 플로우
- 4a. 작성한 리뷰가 없음: "아직 작성한 리뷰가 없습니다" 메시지 표시

## 사후 조건
- 사용자가 자신의 리뷰 이력을 확인
```

#### d) `/docs/usecases/8-explore-places/spec.md`
```markdown
# Usecase 8: 탐색 페이지 장소 목록 확인

## 목표
사용자가 전체 장소 목록을 정렬하여 탐색한다.

## 액터
- 로그인 사용자

## 사전 조건
- 사용자가 로그인 상태

## 기본 플로우
1. 하단 탭바에서 '탐색' 탭 클릭
2. 전체 장소 목록 조회 (평균 평점 포함)
3. 기본 정렬: 별점순 (내림차순)
4. 정렬 옵션 선택 가능:
   - 별점순
   - 최근 리뷰순
   - 리뷰 많은순
5. 장소 아이템 클릭 시 장소 상세 페이지로 이동

## 대체 플로우
- 2a. 등록된 장소가 없음: "아직 등록된 장소가 없습니다" 메시지 표시

## 사후 조건
- 사용자가 정렬된 장소 목록을 확인
```

**기존 Usecases 수정**:
- **Usecase 3: 리뷰 작성**:
  - 로그인 사용자의 경우 `user_id` 자동 입력
  - `author_name`, `password` 필드는 비로그인 사용자만 입력
  - **충돌 주의**: 기존 비로그인 방식과 신규 로그인 방식 분기 로직 명시

**업데이트 후 검증**:
- [ ] 모든 신규 기능에 대한 유스케이스 작성 완료
- [ ] 기존 유스케이스와의 충돌 해결 방안 명시
- [ ] 각 유스케이스가 독립적이고 명확한지 확인

---

### 2.5 Common Modules 업데이트

**파일 경로**: `/docs/common-modules.md`

**업데이트 전 확인사항**:
- [ ] 새 기능에서 재사용 가능한 모듈 식별
- [ ] 기존 공통 모듈과의 중복 여부 확인

**새로운 공통 모듈 추가**:

#### a) 인증 관련 모듈
```markdown
## Auth 모듈

### 위치
`src/features/auth/`

### 포함 컴포넌트
- `LoginButton.tsx`: 카카오 로그인 버튼
- `LoginRequiredModal.tsx`: 비로그인 시 표시되는 중앙 모달
- `AuthGuard.tsx`: 인증 필요 페이지 보호 HOC

### 포함 훅
- `useAuth.ts`: 로그인 상태, 사용자 정보, 로그아웃 함수 제공
- `useKakaoLogin.ts`: 카카오 OAuth 플로우 처리

### 포함 서비스
- `auth/backend/service.ts`: 카카오 토큰 검증, 사용자 조회/생성
- `auth/backend/route.ts`: `/api/auth/kakao/callback`, `/api/auth/logout`
```

#### b) 하단 탭바 모듈
```markdown
## BottomTabBar 모듈

### 위치
`src/components/layout/BottomTabBar.tsx`

### 기능
- 홈, 탐색, 마이페이지 탭 표시
- 현재 활성 탭 하이라이트
- 로그인 필요 탭 접근 시 LoginRequiredModal 트리거

### 의존성
- `useAuth` 훅 (로그인 상태 확인)
- `useRouter` (페이지 이동)
```

#### c) 사용자 정보 카드 모듈
```markdown
## UserInfoCard 모듈

### 위치
`src/components/user/UserInfoCard.tsx`

### 기능
- 사용자 닉네임, 프로필 이미지 표시
- 통계 정보 표시 (작성한 리뷰 수 등)

### 재사용 위치
- 마이페이지
- (향후) 리뷰 상세 페이지의 작성자 정보
```

**기존 공통 모듈 수정**:
- **MainLayout**: 하단 탭바 추가로 높이 조정 필요
  - 기존: 최대 높이 720px
  - 변경 후: 콘텐츠 영역 높이 = 720px - 탭바 높이(예: 60px)

**업데이트 후 검증**:
- [ ] 모든 신규 공통 모듈이 최소 2곳 이상에서 재사용되는지 확인
- [ ] 기존 공통 모듈과의 의존성 충돌 확인
- [ ] 컴포넌트 Props 인터페이스가 명확히 정의되었는지 확인

---

### 2.6 기타 SOT 문서 업데이트

#### a) `/docs/pages/N-name/plan.md` (페이지별 구현 계획)
- 새 페이지 추가 시 해당 디렉토리 생성 및 `plan.md` 작성
  - 예: `/docs/pages/5-explore/plan.md`
  - 예: `/docs/pages/6-mypage/plan.md`
  - 예: `/docs/pages/7-auth-login/plan.md`

#### b) `/docs/pages/N-name/state.md` (페이지별 상태 관리 설계)
- 전역 상태 추가 시 명시
  - 예: `authStore` (Zustand): `user`, `isLoggedIn`, `login`, `logout`

#### c) `/docs/external/kakao-oauth.md` (외부 API 문서)
- 카카오 OAuth API 문서 작성
  - 엔드포인트, 요청/응답 형식, 에러 코드 등

---

## 2.7 SOT 업데이트 시 공통 주의사항

### 일관성 유지
- **용어 통일**: 같은 개념을 다른 용어로 표현하지 않기
  - 예: "사용자" vs "회원" → "사용자"로 통일
- **데이터 타입 일관성**: DB 스키마, API 응답, TypeScript 인터페이스 간 타입 일치
  - 예: `user_id`는 모든 레이어에서 `UUID` 타입 사용

### 기존 스타일 준수
- 마크다운 헤딩 레벨 일관성 유지
- 코드 블록 언어 태그 명시 (```typescript, ```sql 등)
- 테이블 형식 일관성 유지

### 참조 업데이트
- 한 문서에서 다른 문서를 참조하는 경우 링크 업데이트
  - 예: `[사용자 여정 참조](/docs/userflow.md)`
- 섹션 번호 변경 시 모든 참조 업데이트

### 버전 관리
- 각 문서 상단에 "최종 수정일" 업데이트
- 변경 이력(Change Log) 섹션에 변경 내용 기록

---

## 3단계: 구현 계획 작성

**파일 경로**: `/docs/plans/additional-requirement.md`

**작성 전 확인사항**:
- [ ] 모든 SOT 문서 업데이트 완료
- [ ] 업데이트된 문서를 기반으로 구현 범위 명확히 파악

**구현 계획 구조**:

### 3.1 요약
```markdown
## 요약

### 추가 요구사항 개요
- 하단 탭바 추가 (홈 / 탐색 / 마이페이지)
- 카카오 연동 로그인/회원가입
- 비로그인 접근 시 로그인 모달 표시
- 탐색 페이지: 전체 장소 목록 및 정렬 기능
- 마이페이지: 사용자 정보, 리뷰 내역, 통계, 로그아웃

### 핵심 변경사항
- **인증 체계 도입**: 기존 비로그인 방식과 신규 로그인 방식 공존
- **네비게이션 구조 변경**: 단일 페이지에서 탭 기반 멀티 페이지로 전환
- **데이터 모델 확장**: `users` 테이블 추가, `reviews` 테이블 확장
```

### 3.2 변경 영향 분석

#### 3.2.1 영향받는 파일 및 모듈

**Frontend**:
```markdown
### 신규 파일
- `src/app/explore/page.tsx`: 탐색 페이지
- `src/app/mypage/page.tsx`: 마이페이지
- `src/app/auth/login/page.tsx`: 로그인 페이지
- `src/app/auth/signup/page.tsx`: 회원가입 페이지 (닉네임 입력)
- `src/components/layout/BottomTabBar.tsx`: 하단 탭바
- `src/features/auth/components/LoginRequiredModal.tsx`: 로그인 요구 모달
- `src/features/auth/hooks/useAuth.ts`: 인증 상태 관리 훅
- `src/features/auth/hooks/useKakaoLogin.ts`: 카카오 로그인 훅

### 수정 파일
- `src/app/layout.tsx`: 하단 탭바 추가, 전역 인증 상태 Provider 추가
- `src/app/page.tsx`: 비로그인 접근 시 모달 표시 로직 추가
- `src/app/review/create/page.tsx`: 로그인 사용자의 경우 author_name 자동 입력
- `src/components/layout/MainLayout.tsx`: 높이 조정 (탭바 공간 확보)
```

**Backend**:
```markdown
### 신규 파일
- `src/features/auth/backend/route.ts`: 인증 API 라우터
  - `POST /api/auth/kakao/callback`: 카카오 OAuth 콜백 처리
  - `POST /api/auth/logout`: 로그아웃
- `src/features/auth/backend/service.ts`: 인증 비즈니스 로직
  - 카카오 토큰 검증
  - 사용자 조회/생성
- `src/features/auth/backend/schema.ts`: 인증 요청/응답 스키마
- `src/features/mypage/backend/route.ts`: 마이페이지 API 라우터
  - `GET /api/mypage/reviews`: 내 리뷰 목록 조회
- `src/features/explore/backend/route.ts`: 탐색 API 라우터
  - `GET /api/explore/places`: 전체 장소 목록 조회 (정렬 옵션)

### 수정 파일
- `src/backend/hono/app.ts`: 신규 라우터 등록
- `src/features/review/backend/route.ts`: 로그인 사용자 리뷰 작성 로직 추가
```

**Database**:
```markdown
### 신규 마이그레이션
- `supabase/migrations/XXXX_create_users_table.sql`: users 테이블 생성
- `supabase/migrations/YYYY_alter_reviews_add_user_id.sql`: reviews 테이블에 user_id 컬럼 추가
```

#### 3.2.2 충돌 및 호환성 이슈

**Issue 1: 기존 비로그인 리뷰 데이터 호환성**
- **문제**: 기존 리뷰는 `user_id`가 없음
- **해결 방안**:
  - `reviews.is_anonymous` 컬럼 추가
  - 기존 데이터는 `is_anonymous=TRUE`로 설정
  - 로그인 사용자 리뷰는 `is_anonymous=FALSE`, `user_id` 필수

**Issue 2: URL 구조 변경으로 인한 기존 북마크 깨짐**
- **문제**: 기존 `/` 페이지가 "홈" 탭으로 유지되지만, 하단 탭바 추가로 레이아웃 변경
- **해결 방안**:
  - URL 구조는 유지 (`/`는 여전히 홈 페이지)
  - 기존 사용자 경험 최대한 유지

**Issue 3: MainLayout 높이 조정으로 기존 컴포넌트 레이아웃 깨짐**
- **문제**: 기존 컴포넌트들이 720px 전체 높이를 가정
- **해결 방안**:
  - MainLayout 내부 콘텐츠 영역을 `calc(720px - 60px)` (탭바 높이)로 제한
  - 기존 컴포넌트들은 부모 높이에 맞춰 조정 (flex, height: 100% 활용)

**Issue 4: 비로그인 상태에서 탐색/마이페이지 접근 차단**
- **문제**: 비로그인 사용자가 탭을 클릭하면 어떻게 할 것인가?
- **해결 방안**:
  - 탭 클릭 시 `LoginRequiredModal` 표시
  - 모달에서 "로그인하러 가기" 버튼 → `/auth/login`으로 이동

---

### 3.3 구현 순서

**우선순위 원칙**:
1. **의존성 순서**: 하위 모듈 먼저, 상위 모듈 나중에
2. **리스크 순서**: 충돌 가능성 높은 작업 먼저 처리
3. **사용자 가치 순서**: 핵심 기능 먼저, 부가 기능 나중에

#### Phase 1: 인프라 및 인증 기반 구축 (P0)
```markdown
**1.1 데이터베이스 마이그레이션**
- [ ] `users` 테이블 생성
- [ ] `reviews` 테이블에 `user_id`, `is_anonymous` 컬럼 추가
- [ ] 기존 리뷰 데이터 `is_anonymous=TRUE`로 업데이트
- [ ] 인덱스 생성

**1.2 환경 변수 설정**
- [ ] 카카오 REST API 키 발급
- [ ] `.env.local`에 `NEXT_PUBLIC_KAKAO_CLIENT_ID` 추가
- [ ] `.env.local`에 `KAKAO_CLIENT_SECRET` 추가 (서버 전용)
- [ ] Redirect URI 설정 (`https://yourdomain.com/auth/kakao/callback`)

**1.3 카카오 OAuth 백엔드 로직 구현**
- [ ] `src/features/auth/backend/service.ts`:
  - `exchangeCodeForToken`: Authorization Code → Access Token 교환
  - `fetchKakaoUserInfo`: 카카오 API로 사용자 정보 조회
  - `findOrCreateUser`: DB에서 사용자 조회 또는 생성
- [ ] `src/features/auth/backend/route.ts`:
  - `POST /api/auth/kakao/callback`: 카카오 콜백 처리
  - `POST /api/auth/logout`: 세션/JWT 무효화
- [ ] `src/features/auth/backend/schema.ts`: 요청/응답 스키마 정의

**1.4 JWT 또는 Session 기반 인증 구현**
- [ ] JWT 발급 및 검증 로직 구현
- [ ] 미들웨어: `withAuth` (인증 필요 API 보호)
- [ ] 클라이언트: `useAuth` 훅 구현 (로그인 상태 관리)
```

#### Phase 2: 로그인 UI 및 모달 구현 (P0)
```markdown
**2.1 로그인 페이지**
- [ ] `src/app/auth/login/page.tsx`:
  - "카카오로 시작하기" 버튼
  - 버튼 클릭 → 카카오 OAuth URL로 리디렉션

**2.2 회원가입 페이지 (닉네임 입력)**
- [ ] `src/app/auth/signup/page.tsx`:
  - 닉네임 입력 폼
  - 유효성 검증 (2~20자, 중복 체크)
  - 제출 → 사용자 생성 API 호출 → 로그인 처리

**2.3 LoginRequiredModal 컴포넌트**
- [ ] `src/features/auth/components/LoginRequiredModal.tsx`:
  - 중앙 모달 UI (shadcn-ui Dialog)
  - "로그인이 필요합니다" 메시지
  - "로그인하러 가기" 버튼 → `/auth/login` 이동
  - "닫기" 버튼 또는 외부 클릭으로 닫기
```

#### Phase 3: 하단 탭바 및 네비게이션 구현 (P0)
```markdown
**3.1 BottomTabBar 컴포넌트**
- [ ] `src/components/layout/BottomTabBar.tsx`:
  - 3개 탭: 홈, 탐색, 마이페이지
  - 현재 활성 탭 하이라이트 (usePathname 활용)
  - 로그인 필요 탭 클릭 시 모달 트리거

**3.2 MainLayout 수정**
- [ ] `src/components/layout/MainLayout.tsx`:
  - 하단 탭바 추가
  - 콘텐츠 영역 높이 조정 (`calc(100% - 60px)`)
  - 모바일 환경에서 탭바가 하단 고정되도록 스타일링

**3.3 홈 페이지 수정**
- [ ] `src/app/page.tsx`:
  - 비로그인 상태 체크 (useAuth)
  - 비로그인 시 LoginRequiredModal 표시 (선택적, requirement2.md 확인 필요)
```

#### Phase 4: 탐색 페이지 구현 (P0)
```markdown
**4.1 탐색 API 구현**
- [ ] `src/features/explore/backend/route.ts`:
  - `GET /api/explore/places`:
    - Query params: `sortBy` (rating | recent | reviewCount)
    - 응답: 장소 목록 (id, name, address, avgRating, reviewCount)

**4.2 탐색 페이지 UI**
- [ ] `src/app/explore/page.tsx`:
  - 전체 장소 목록 표시
  - 정렬 옵션 선택 UI (Dropdown 또는 Tabs)
  - 장소 카드 클릭 → `/place/detail?placeId={id}` 이동
  - 무한 스크롤 또는 페이지네이션 (선택적)
```

#### Phase 5: 마이페이지 구현 (P0)
```markdown
**5.1 마이페이지 API 구현**
- [ ] `src/features/mypage/backend/route.ts`:
  - `GET /api/mypage/reviews`:
    - 인증 필요 (withAuth 미들웨어)
    - 응답: 내 리뷰 목록 (최신순)

**5.2 마이페이지 UI**
- [ ] `src/app/mypage/page.tsx`:
  - 사용자 정보 카드 (닉네임, 프로필 이미지)
  - 통계 표시 (작성한 리뷰 수)
  - 내 리뷰 목록
  - 로그아웃 버튼

**5.3 로그아웃 기능**
- [ ] 로그아웃 버튼 클릭 → `POST /api/auth/logout` 호출
- [ ] 세션/JWT 무효화
- [ ] 홈 페이지로 리디렉션
```

#### Phase 6: 기존 리뷰 작성 로직 수정 (P1)
```markdown
**6.1 리뷰 작성 API 수정**
- [ ] `src/features/review/backend/route.ts`:
  - 로그인 사용자인 경우:
    - `user_id` 자동 설정
    - `is_anonymous=FALSE`
    - `author_name`, `password` 무시
  - 비로그인 사용자인 경우:
    - 기존 로직 유지 (`is_anonymous=TRUE`)

**6.2 리뷰 작성 폼 UI 수정**
- [ ] `src/app/review/create/page.tsx`:
  - 로그인 상태 확인
  - 로그인 사용자: `author_name`, `password` 필드 숨김
  - 비로그인 사용자: 기존 UI 유지
```

---

### 3.4 기술 스택

```markdown
## 신규 라이브러리

| 라이브러리 | 버전 | 용도 | 설치 명령 |
|----------|------|------|----------|
| **jose** | ^5.x | JWT 토큰 생성 및 검증 | `npm install jose` |
| **ky** (optional) | ^1.x | HTTP 클라이언트 (카카오 API 호출) | `npm install ky` |

## 기존 라이브러리 활용
- **Zustand**: 전역 인증 상태 관리 (`authStore`)
- **Zod**: 카카오 API 응답 스키마 검증
- **React Hook Form**: 닉네임 입력 폼 관리
- **shadcn-ui**: Dialog (로그인 모달), Tabs (정렬 옵션), Card (장소 카드)
```

---

### 3.5 데이터베이스 변경

```markdown
## 마이그레이션 파일 목록

### 1. `supabase/migrations/0005_create_users_table.sql`
```sql
-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kakao_id VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_kakao_id ON users(kakao_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. `supabase/migrations/0006_alter_reviews_add_user_id.sql`
```sql
-- reviews 테이블에 user_id 및 is_anonymous 컬럼 추가
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

-- 기존 데이터는 익명 리뷰로 처리
UPDATE reviews
SET is_anonymous = TRUE
WHERE user_id IS NULL;

-- 인덱스 생성
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
```

## ERD 변경 사항
```
[users] 1 ----< N [reviews]
  id              user_id (FK, nullable)
  kakao_id        is_anonymous
  nickname
```
```

---

### 3.6 API 변경

```markdown
## 신규 API 엔드포인트

### 인증 API

#### POST `/api/auth/kakao/callback`
**요청**:
```json
{
  "code": "카카오_authorization_code"
}
```

**응답** (성공):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nickname": "홍길동",
      "profileImageUrl": "https://..."
    },
    "isNewUser": false
  }
}
```

**응답** (신규 가입자):
```json
{
  "success": true,
  "data": {
    "isNewUser": true,
    "kakaoId": "123456789",
    "redirectTo": "/auth/signup"
  }
}
```

#### POST `/api/auth/signup`
**요청**:
```json
{
  "nickname": "홍길동",
  "kakaoId": "123456789"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nickname": "홍길동"
    }
  }
}
```

#### POST `/api/auth/logout`
**요청**: 없음 (JWT는 헤더에서 자동 추출)

**응답**:
```json
{
  "success": true
}
```

### 마이페이지 API

#### GET `/api/mypage/reviews`
**인증**: 필수 (JWT)

**응답**:
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "placeId": "place_123",
        "placeName": "OO식당",
        "rating": 5,
        "content": "정말 맛있어요!",
        "createdAt": "2025-10-21T12:00:00Z"
      }
    ],
    "totalCount": 23
  }
}
```

### 탐색 API

#### GET `/api/explore/places`
**Query Params**:
- `sortBy`: `rating` | `recent` | `reviewCount` (기본값: `rating`)
- `limit`: 페이지당 개수 (기본값: 20)
- `offset`: 오프셋 (기본값: 0)

**응답**:
```json
{
  "success": true,
  "data": {
    "places": [
      {
        "id": "place_123",
        "name": "OO식당",
        "address": "서울시 강남구...",
        "avgRating": 4.5,
        "reviewCount": 23,
        "lastReviewDate": "2025-10-20T12:00:00Z"
      }
    ],
    "totalCount": 150
  }
}
```

## 기존 API 수정

### POST `/api/reviews` (리뷰 작성)
**변경사항**:
- 로그인 사용자: `user_id` 자동 설정, `author_name`/`password` 무시
- 비로그인 사용자: 기존 로직 유지

**요청** (로그인 사용자):
```json
{
  "placeId": "place_123",
  "rating": 5,
  "content": "정말 맛있어요!"
}
```

**요청** (비로그인 사용자):
```json
{
  "placeId": "place_123",
  "authorName": "김민지",
  "rating": 5,
  "content": "정말 맛있어요!",
  "password": "1234"
}
```
```

---

### 3.7 프론트엔드 변경

```markdown
## 신규 페이지

### `/app/auth/login/page.tsx`
- 카카오 로그인 버튼
- 버튼 클릭 → `https://kauth.kakao.com/oauth/authorize?...`로 리디렉션

### `/app/auth/signup/page.tsx`
- 닉네임 입력 폼 (React Hook Form + Zod)
- 제출 → `POST /api/auth/signup` → 로그인 처리

### `/app/explore/page.tsx`
- 전체 장소 목록
- 정렬 옵션 (Tabs 또는 Select)
- 장소 카드 컴포넌트 재사용 (PlaceCard)

### `/app/mypage/page.tsx`
- UserInfoCard 컴포넌트
- 내 리뷰 목록 (ReviewList 컴포넌트 재사용)
- 로그아웃 버튼

## 신규 컴포넌트

### `src/components/layout/BottomTabBar.tsx`
- 3개 탭: 홈, 탐색, 마이페이지
- 활성 탭 하이라이트
- 로그인 필요 탭 클릭 시 모달 트리거

### `src/features/auth/components/LoginRequiredModal.tsx`
- shadcn-ui Dialog
- "로그인이 필요합니다" 메시지
- "로그인하러 가기" 버튼

### `src/components/user/UserInfoCard.tsx`
- 사용자 닉네임, 프로필 이미지
- 통계 정보 (리뷰 수)

## 신규 훅

### `src/features/auth/hooks/useAuth.ts`
- Zustand store 기반
- `user`, `isLoggedIn`, `login`, `logout` 제공

### `src/features/auth/hooks/useKakaoLogin.ts`
- 카카오 OAuth 플로우 처리
- `loginWithKakao()` 함수 제공

## 수정 파일

### `src/app/layout.tsx`
- AuthProvider 추가 (전역 인증 상태)
- BottomTabBar 추가

### `src/components/layout/MainLayout.tsx`
- 콘텐츠 영역 높이 조정 (`calc(100% - 60px)`)

### `src/app/review/create/page.tsx`
- 로그인 상태 확인
- 로그인 사용자: `author_name`, `password` 필드 숨김
```

---

### 3.8 테스트 계획

```markdown
## 단위 테스트

### 인증 서비스
- [ ] `exchangeCodeForToken`: 유효한 코드 → 토큰 반환
- [ ] `fetchKakaoUserInfo`: 유효한 토큰 → 사용자 정보 반환
- [ ] `findOrCreateUser`: 신규 사용자 → 생성, 기존 사용자 → 조회

### 인증 훅
- [ ] `useAuth`: 로그인 상태 변경 시 컴포넌트 리렌더링
- [ ] `useKakaoLogin`: 로그인 플로우 정상 동작

## 통합 테스트

### API 테스트
- [ ] `POST /api/auth/kakao/callback`: 유효한 코드 → 200 응답
- [ ] `POST /api/auth/signup`: 유효한 닉네임 → 201 응답
- [ ] `GET /api/mypage/reviews`: 인증된 사용자 → 내 리뷰 목록 반환
- [ ] `GET /api/explore/places`: 정렬 옵션별 정상 작동

### E2E 테스트 (Playwright 또는 Cypress)
- [ ] 비로그인 상태로 홈 접근 → 모달 표시 (requirement2.md 확인 필요)
- [ ] 카카오 로그인 → 회원가입 → 홈으로 리디렉션
- [ ] 로그인 후 탐색 탭 → 장소 목록 표시
- [ ] 로그인 후 마이페이지 → 내 리뷰 확인
- [ ] 로그아웃 → 비로그인 상태로 전환
```

---

### 3.9 예상 이슈 및 리스크

```markdown
## 기술 리스크

### 1. 카카오 OAuth 콜백 URL 설정 실수
**리스크**:
- Redirect URI 불일치로 OAuth 실패

**대응 방안**:
- 카카오 개발자 콘솔에서 정확한 Redirect URI 등록
- 로컬 개발: `http://localhost:3000/auth/kakao/callback`
- 프로덕션: `https://yourdomain.com/auth/kakao/callback`

### 2. 기존 비로그인 리뷰와 신규 로그인 리뷰 혼재
**리스크**:
- 리뷰 목록에서 작성자 표시 로직 복잡도 증가

**대응 방안**:
- `is_anonymous` 필드로 분기 처리
- 익명 리뷰: `author_name` 표시
- 로그인 리뷰: `users.nickname` 표시 (JOIN 필요)

### 3. JWT 토큰 저장 위치 선택
**리스크**:
- localStorage: XSS 취약
- Cookie (httpOnly): CSRF 취약

**대응 방안**:
- **권장**: httpOnly Cookie + SameSite=Strict + CSRF 토큰
- 또는 Next.js Server Actions 활용 (서버에서 세션 관리)

### 4. 하단 탭바 높이로 인한 레이아웃 깨짐
**리스크**:
- 기존 컴포넌트들이 전체 높이(720px)를 가정

**대응 방안**:
- MainLayout에서 콘텐츠 영역을 `flex: 1` 또는 `calc(100% - 60px)`로 제한
- 모든 페이지에서 높이를 부모 기준으로 조정 (`height: 100%`)

## 비즈니스 리스크

### 1. 사용자 진입 장벽 증가
**리스크**:
- 기존 비로그인 방식의 간편함 상실

**대응 방안**:
- 비로그인 방식도 계속 지원 (공존 전략)
- 로그인 모달에 "건너뛰기" 옵션 제공 (requirement2.md 확인 필요)

### 2. 카카오 API 의존성 증가
**리스크**:
- 카카오 API 장애 시 로그인 불가

**대응 방안**:
- 에러 핸들링 강화 (재시도 로직, 사용자 친화적 에러 메시지)
- 향후 다른 OAuth 제공자 추가 (구글, 네이버 등)
```

---

### 3.10 완료 조건

```markdown
## 기능 완료 조건

- [ ] 카카오 로그인 플로우 정상 작동
- [ ] 회원가입 (닉네임 입력) 정상 작동
- [ ] 하단 탭바 표시 및 네비게이션 정상 작동
- [ ] 비로그인 상태로 탐색/마이페이지 접근 시 로그인 모달 표시
- [ ] 탐색 페이지: 전체 장소 목록 및 정렬 기능 작동
- [ ] 마이페이지: 내 리뷰 목록 표시, 로그아웃 기능 작동
- [ ] 기존 비로그인 리뷰 작성 기능 유지
- [ ] 로그인 사용자의 리뷰 작성 시 자동으로 `user_id` 연결

## 품질 완료 조건

- [ ] 모든 단위 테스트 통과
- [ ] 모든 통합 테스트 통과
- [ ] 주요 E2E 시나리오 테스트 통과
- [ ] Lighthouse 성능 점수: 80점 이상
- [ ] 모바일 환경에서 UI 깨짐 없음
- [ ] 한글 인코딩 깨짐 없음 (UTF-8 검증)

## 문서 완료 조건

- [ ] 모든 SOT 문서 업데이트 완료
- [ ] API 문서 업데이트 (Swagger 또는 별도 문서)
- [ ] README.md에 새 기능 추가 설명
- [ ] 마이그레이션 가이드 작성 (기존 데이터 처리 방법)
```

---

## 부록: 충돌 점검 체크리스트

구현 시작 전, 다음 체크리스트를 통해 충돌 여부를 최종 확인하세요.

### Frontend 충돌 점검
- [ ] 기존 페이지 URL 구조 변경 없음
- [ ] 기존 컴포넌트 Props 변경 시 하위 호환성 유지
- [ ] 전역 상태(Zustand) 변경 시 기존 상태와 충돌 없음
- [ ] 새 레이아웃(하단 탭바)으로 인한 기존 컴포넌트 높이 문제 없음

### Backend 충돌 점검
- [ ] 기존 API 엔드포인트 응답 형식 변경 없음 (Breaking Change 없음)
- [ ] 새 API 엔드포인트가 기존 라우팅과 중복되지 않음
- [ ] 기존 비즈니스 로직 변경 시 하위 호환성 유지

### Database 충돌 점검
- [ ] 새 컬럼 추가 시 `DEFAULT` 값 또는 `NULL` 허용
- [ ] 외래키 추가 시 기존 데이터 무결성 확인
- [ ] 마이그레이션 SQL이 idempotent(멱등성)함
- [ ] 인덱스 추가로 인한 성능 저하 없음

### External API 충돌 점검
- [ ] 카카오 OAuth Redirect URI 정확히 등록
- [ ] 환경 변수 이름 충돌 없음
- [ ] 기존 네이버 API와의 API 키 혼용 없음

---

## 마무리

위 가이드를 따라 작업하면서 다음 원칙을 항상 기억하세요:

1. **SOT 우선**: 코드를 작성하기 전에 문서부터 업데이트하세요.
2. **충돌 점검**: 매 단계마다 기존 기능과의 충돌 여부를 확인하세요.
3. **하위 호환성**: 기존 사용자 경험을 최대한 유지하세요.
4. **테스트 필수**: 구현 후 반드시 테스트를 작성하고 실행하세요.
5. **문서화**: 변경사항은 즉시 문서에 반영하세요.

불명확한 사항이 있으면 진행 전에 질문하세요. 작업 완료 후 변경사항을 명확한 커밋 메시지와 함께 커밋하세요.
