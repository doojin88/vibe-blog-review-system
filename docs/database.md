# 데이터베이스 설계: 블로그 체험단 리뷰 시스템

## 1. 데이터베이스 개요

### 1.1 기술 스택
- **DBMS**: PostgreSQL (via Supabase)
- **인증**: Supabase Auth (Email 기반)
- **마이그레이션**: Supabase SQL Migrations

### 1.2 설계 원칙
- **간결성 우선**: 유저플로우에 명시적으로 포함된 데이터만 저장
- **확장 가능**: 향후 기능 추가를 고려한 설계
- **RLS 비활성화**: 프로젝트 가이드라인에 따라 RLS 사용하지 않음
- **트리거 활용**: `updated_at` 자동 업데이트

---

## 2. 데이터 플로우

### 2.1 사용자 인증 및 역할 분기
```
[Supabase Auth]
    ↓
[auth.users] (Supabase 관리)
    ↓
[역할 선택]
    ↓
┌─────────────────┴─────────────────┐
│                                    │
[advertisers]               [influencers]
(광고주 정보)                (인플루언서 정보)
```

### 2.2 체험단 등록 및 지원
```
[advertisers]
    ↓
[campaigns] (체험단 등록)
    ↓
    ↓ (지원)
[applications]
    ↑
[influencers]
```

### 2.3 체험단 상태 전환
```
[campaigns] status: 모집중
    ↓
[campaigns] status: 모집종료 (광고주가 조기 종료 또는 마감일 도래)
    ↓
[applications] status 업데이트 (선정/반려)
    ↓
[campaigns] status: 선정완료
```

---

## 3. ERD (Entity Relationship Diagram)

```
┌──────────────────┐
│   auth.users     │ (Supabase Auth 관리)
│  ──────────────  │
│  id (uuid)       │
│  email           │
│  created_at      │
└────────┬─────────┘
         │
         │ 1:1
    ┌────┴────┐
    │         │
┌───▼──────────────┐         ┌─────────────────┐
│  advertisers     │         │  influencers    │
│  ──────────────  │         │  ─────────────  │
│  id              │         │  id             │
│  user_id (FK)    │         │  user_id (FK)   │
│  name            │         │  name           │
│  birth_date      │         │  birth_date     │
│  phone           │         │  phone          │
│  business_name   │         │  channel_name   │
│  address         │         │  channel_link   │
│  business_phone  │         │  followers_count│
│  business_reg_no │         │  created_at     │
│  representative  │         │  updated_at     │
│  created_at      │         └────────┬────────┘
│  updated_at      │                  │
└────────┬─────────┘                  │
         │                            │
         │ 1:N                        │ 1:N
         │                            │
    ┌────▼─────────────┐         ┌────▼───────────────┐
    │  campaigns       │         │  applications      │
    │  ──────────────  │  N:1    │  ────────────────  │
    │  id              │◄────────┤  id                │
    │  advertiser_id   │         │  campaign_id (FK)  │
    │  title           │         │  influencer_id (FK)│
    │  description     │         │  message           │
    │  recruitment_    │         │  visit_date        │
    │    start_date    │         │  status            │
    │  recruitment_    │         │  applied_at        │
    │    end_date      │         │  created_at        │
    │  recruitment_    │         │  updated_at        │
    │    count         │         └────────────────────┘
    │  benefits        │
    │  mission         │
    │  store_name      │
    │  store_address   │
    │  store_phone     │
    │  category        │
    │  status          │
    │  created_at      │
    │  updated_at      │
    └──────────────────┘
```

---

## 4. 테이블 상세 스키마

### 4.1 advertisers (광고주 정보)

광고주의 프로필 정보를 저장합니다. `auth.users`와 1:1 관계를 가집니다.

```sql
create table public.advertisers (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  birth_date date not null,
  phone text not null,
  business_name text not null,
  address text not null,
  business_phone text not null,
  business_registration_number text not null,
  representative_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.advertisers is '광고주 프로필 정보를 저장하는 테이블. auth.users와 1:1 관계를 가지며, 체험단 등록 및 관리 권한을 부여합니다.';
comment on column public.advertisers.id is '광고주 고유 식별자';
comment on column public.advertisers.user_id is 'Supabase Auth의 사용자 ID (외래키, 유니크)';
comment on column public.advertisers.name is '광고주 담당자 이름';
comment on column public.advertisers.birth_date is '광고주 담당자 생년월일';
comment on column public.advertisers.phone is '광고주 담당자 휴대폰번호';
comment on column public.advertisers.business_name is '업체명';
comment on column public.advertisers.address is '업체 주소';
comment on column public.advertisers.business_phone is '업장 전화번호';
comment on column public.advertisers.business_registration_number is '사업자등록번호';
comment on column public.advertisers.representative_name is '사업자 대표자명';
comment on column public.advertisers.created_at is '레코드 생성 시각';
comment on column public.advertisers.updated_at is '레코드 수정 시각 (트리거로 자동 업데이트)';
```

**인덱스**:
```sql
create index idx_advertisers_user_id on public.advertisers(user_id);
```

---

### 4.2 influencers (인플루언서 정보)

인플루언서의 프로필 정보를 저장합니다. `auth.users`와 1:1 관계를 가집니다.

```sql
create table public.influencers (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  birth_date date not null,
  phone text not null,
  channel_name text not null,
  channel_link text not null,
  followers_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint influencers_followers_count_positive check (followers_count >= 0)
);

comment on table public.influencers is '인플루언서 프로필 정보를 저장하는 테이블. auth.users와 1:1 관계를 가지며, 체험단 지원 권한을 부여합니다.';
comment on column public.influencers.id is '인플루언서 고유 식별자';
comment on column public.influencers.user_id is 'Supabase Auth의 사용자 ID (외래키, 유니크)';
comment on column public.influencers.name is '인플루언서 이름';
comment on column public.influencers.birth_date is '인플루언서 생년월일';
comment on column public.influencers.phone is '인플루언서 휴대폰번호';
comment on column public.influencers.channel_name is 'SNS 채널명';
comment on column public.influencers.channel_link is 'SNS 채널 링크 (Naver Blog, YouTube, Instagram, Threads 등)';
comment on column public.influencers.followers_count is '팔로워 수';
comment on column public.influencers.created_at is '레코드 생성 시각';
comment on column public.influencers.updated_at is '레코드 수정 시각 (트리거로 자동 업데이트)';
```

**인덱스**:
```sql
create index idx_influencers_user_id on public.influencers(user_id);
create index idx_influencers_followers_count on public.influencers(followers_count desc);
```

---

### 4.3 campaigns (체험단)

광고주가 등록한 체험단 정보를 저장합니다.

```sql
create type campaign_status_enum as enum ('모집중', '모집종료', '선정완료');
create type campaign_category_enum as enum ('음식점', '카페', '뷰티', '패션', '생활', '기타');

create table public.campaigns (
  id bigint generated always as identity primary key,
  advertiser_id bigint not null references public.advertisers(id) on delete cascade,
  title text not null,
  description text not null,
  recruitment_start_date date not null,
  recruitment_end_date date not null,
  recruitment_count int not null,
  benefits text not null,
  mission text not null,
  store_name text not null,
  store_address text not null,
  store_phone text not null,
  category campaign_category_enum not null,
  status campaign_status_enum not null default '모집중',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_recruitment_count_positive check (recruitment_count >= 1),
  constraint campaigns_recruitment_date_valid check (recruitment_end_date >= recruitment_start_date)
);

comment on table public.campaigns is '광고주가 등록한 체험단 정보를 저장하는 테이블. 모집 상태를 관리하고 인플루언서의 지원을 받습니다.';
comment on column public.campaigns.id is '체험단 고유 식별자';
comment on column public.campaigns.advertiser_id is '체험단을 등록한 광고주 ID (외래키)';
comment on column public.campaigns.title is '체험단명';
comment on column public.campaigns.description is '체험단 설명';
comment on column public.campaigns.recruitment_start_date is '모집 시작일';
comment on column public.campaigns.recruitment_end_date is '모집 종료일';
comment on column public.campaigns.recruitment_count is '모집 인원';
comment on column public.campaigns.benefits is '제공 혜택';
comment on column public.campaigns.mission is '미션 및 요구사항';
comment on column public.campaigns.store_name is '매장명';
comment on column public.campaigns.store_address is '매장 주소';
comment on column public.campaigns.store_phone is '매장 전화번호';
comment on column public.campaigns.category is '체험단 카테고리';
comment on column public.campaigns.status is '모집 상태 (모집중, 모집종료, 선정완료)';
comment on column public.campaigns.created_at is '레코드 생성 시각';
comment on column public.campaigns.updated_at is '레코드 수정 시각 (트리거로 자동 업데이트)';
```

**인덱스**:
```sql
create index idx_campaigns_advertiser_id on public.campaigns(advertiser_id);
create index idx_campaigns_status on public.campaigns(status);
create index idx_campaigns_category on public.campaigns(category);
create index idx_campaigns_status_created_at on public.campaigns(status, created_at desc);
```

---

### 4.4 applications (지원서)

인플루언서가 체험단에 지원한 내역을 저장합니다.

```sql
create type application_status_enum as enum ('신청완료', '선정', '반려');

create table public.applications (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  influencer_id bigint not null references public.influencers(id) on delete cascade,
  message text not null,
  visit_date date not null,
  status application_status_enum not null default '신청완료',
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint applications_unique_application unique (campaign_id, influencer_id)
);

comment on table public.applications is '인플루언서가 체험단에 지원한 내역을 저장하는 테이블. 중복 지원을 방지하고 선정 상태를 관리합니다.';
comment on column public.applications.id is '지원서 고유 식별자';
comment on column public.applications.campaign_id is '지원한 체험단 ID (외래키)';
comment on column public.applications.influencer_id is '지원한 인플루언서 ID (외래키)';
comment on column public.applications.message is '각오 한마디';
comment on column public.applications.visit_date is '방문 예정일';
comment on column public.applications.status is '지원 상태 (신청완료, 선정, 반려)';
comment on column public.applications.applied_at is '지원 시각';
comment on column public.applications.created_at is '레코드 생성 시각';
comment on column public.applications.updated_at is '레코드 수정 시각 (트리거로 자동 업데이트)';
```

**인덱스**:
```sql
create index idx_applications_campaign_id on public.applications(campaign_id);
create index idx_applications_influencer_id on public.applications(influencer_id);
create index idx_applications_status on public.applications(status);
create index idx_applications_applied_at on public.applications(applied_at desc);
```

---

## 5. 트리거 및 함수

### 5.1 updated_at 자동 업데이트 트리거

모든 테이블의 `updated_at` 컬럼을 자동으로 업데이트합니다.

```sql
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function public.update_updated_at_column() is '테이블의 updated_at 컬럼을 현재 시각으로 자동 업데이트하는 트리거 함수';

create trigger set_updated_at
before update on public.advertisers
for each row
execute function public.update_updated_at_column();

create trigger set_updated_at
before update on public.influencers
for each row
execute function public.update_updated_at_column();

create trigger set_updated_at
before update on public.campaigns
for each row
execute function public.update_updated_at_column();

create trigger set_updated_at
before update on public.applications
for each row
execute function public.update_updated_at_column();
```

---

## 6. 외래키 관계 및 삭제 전파

```sql
-- advertisers → auth.users (1:1)
advertisers.user_id → auth.users.id (on delete cascade)

-- influencers → auth.users (1:1)
influencers.user_id → auth.users.id (on delete cascade)

-- campaigns → advertisers (N:1)
campaigns.advertiser_id → advertisers.id (on delete cascade)

-- applications → campaigns (N:1)
applications.campaign_id → campaigns.id (on delete cascade)

-- applications → influencers (N:1)
applications.influencer_id → influencers.id (on delete cascade)
```

**삭제 전파 정책**:
- `auth.users` 삭제 시 → 연결된 `advertisers` 또는 `influencers` 삭제
- `advertisers` 삭제 시 → 연결된 `campaigns` 삭제
- `campaigns` 삭제 시 → 연결된 `applications` 삭제
- `influencers` 삭제 시 → 연결된 `applications` 삭제

---

## 7. 인덱스 전략

### 7.1 조회 최적화 인덱스
- `campaigns.status`: 모집 상태별 필터링
- `campaigns.category`: 카테고리별 필터링
- `campaigns(status, created_at desc)`: 상태별 + 최신순 조회 최적화 (복합 인덱스)

### 7.2 조인 최적화 인덱스
- `advertisers.user_id`: 사용자 → 광고주 조회
- `influencers.user_id`: 사용자 → 인플루언서 조회
- `campaigns.advertiser_id`: 광고주 → 체험단 리스트 조회
- `applications.campaign_id`: 체험단 → 신청자 리스트 조회
- `applications.influencer_id`: 인플루언서 → 내 지원 목록 조회

### 7.3 정렬 최적화 인덱스
- `influencers.followers_count (desc)`: 팔로워 수 기준 정렬
- `applications.applied_at (desc)`: 지원일 최신순 정렬

### 7.4 유니크 제약 인덱스
- `advertisers.user_id`: 사용자당 1개의 광고주 프로필
- `influencers.user_id`: 사용자당 1개의 인플루언서 프로필
- `applications(campaign_id, influencer_id)`: 중복 지원 방지

---

## 8. RLS (Row Level Security)

프로젝트 가이드라인에 따라 RLS는 비활성화합니다. 백엔드 API에서 권한 검증을 수행합니다.

```sql
alter table public.advertisers disable row level security;
alter table public.influencers disable row level security;
alter table public.campaigns disable row level security;
alter table public.applications disable row level security;
```

---

## 9. 마이그레이션 순서

데이터베이스 스키마를 생성하는 마이그레이션 파일은 다음 순서로 작성해야 합니다:

1. **0001_create_enums.sql**: ENUM 타입 생성
2. **0002_create_advertisers_table.sql**: advertisers 테이블 생성
3. **0003_create_influencers_table.sql**: influencers 테이블 생성
4. **0004_create_campaigns_table.sql**: campaigns 테이블 생성
5. **0005_create_applications_table.sql**: applications 테이블 생성
6. **0006_create_updated_at_trigger.sql**: updated_at 트리거 생성
7. **0007_create_indexes.sql**: 추가 인덱스 생성
8. **0008_disable_rls.sql**: RLS 비활성화 확인

---

## 10. 샘플 쿼리

### 10.1 홈 페이지 체험단 리스트 조회
```sql
select
  campaigns.id,
  campaigns.title,
  campaigns.recruitment_count,
  campaigns.recruitment_end_date,
  campaigns.status,
  campaigns.category,
  campaigns.created_at,
  advertisers.business_name as store_name
from
  public.campaigns
join
  public.advertisers on campaigns.advertiser_id = advertisers.id
where
  campaigns.status = '모집중'
order by
  campaigns.created_at desc
limit 20
offset 0;
```

### 10.2 광고주의 체험단 신청자 리스트 조회
```sql
select
  applications.id,
  applications.message,
  applications.visit_date,
  applications.status,
  applications.applied_at,
  influencers.name,
  influencers.channel_name,
  influencers.channel_link,
  influencers.followers_count
from
  public.applications
join
  public.influencers on applications.influencer_id = influencers.id
where
  applications.campaign_id = :campaign_id
order by
  applications.applied_at desc;
```

### 10.3 인플루언서의 내 지원 목록 조회
```sql
select
  applications.id,
  applications.message,
  applications.visit_date,
  applications.status,
  applications.applied_at,
  campaigns.title as campaign_title,
  campaigns.status as campaign_status,
  campaigns.recruitment_end_date
from
  public.applications
join
  public.campaigns on applications.campaign_id = campaigns.id
where
  applications.influencer_id = :influencer_id
order by
  applications.applied_at desc
limit 20
offset 0;
```

### 10.4 중복 지원 확인
```sql
select exists(
  select 1
  from public.applications
  where campaign_id = :campaign_id
    and influencer_id = :influencer_id
) as already_applied;
```

### 10.5 체험단 선정 (일괄 업데이트)
```sql
-- 선정된 인플루언서
update public.applications
set status = '선정'
where id = any(:selected_application_ids);

-- 미선정 인플루언서
update public.applications
set status = '반려'
where campaign_id = :campaign_id
  and status = '신청완료'
  and id <> all(:selected_application_ids);

-- 체험단 상태 업데이트
update public.campaigns
set status = '선정완료'
where id = :campaign_id;
```

---

## 11. 데이터 딕셔너리

### 11.1 ENUM 타입

#### campaign_status_enum
- `모집중`: 체험단이 현재 지원자를 모집 중인 상태
- `모집종료`: 모집 기간이 종료되었거나 광고주가 조기 종료한 상태
- `선정완료`: 광고주가 인플루언서 선정을 완료한 상태

#### application_status_enum
- `신청완료`: 인플루언서가 체험단에 지원한 초기 상태
- `선정`: 광고주가 해당 인플루언서를 체험단에 선정한 상태
- `반려`: 광고주가 해당 인플루언서를 선정하지 않은 상태

#### campaign_category_enum
- `음식점`: 레스토랑, 한식, 중식, 일식, 양식 등
- `카페`: 카페, 디저트 전문점 등
- `뷰티`: 헤어샵, 네일샵, 피부관리실 등
- `패션`: 의류, 액세서리 등
- `생활`: 생활용품, 가전제품 등
- `기타`: 위 카테고리에 속하지 않는 체험단

---

## 12. 설계 개선 사항

### 12.1 이전 설계 대비 변경점

1. **CHECK 제약조건 간소화**:
   - 휴대폰번호, 사업자등록번호 등의 형식 검증을 제거하여 애플리케이션 레벨에서 처리
   - 유연성 확보 및 유지보수 용이성 증대

2. **인덱스 최적화**:
   - 불필요한 단일 인덱스 제거 (예: `recruitment_end_date`)
   - 복합 인덱스 활용 (예: `status + created_at`)

3. **컬럼 길이 제약 제거**:
   - `title`, `description`, `message` 등의 길이 제약을 제거하여 애플리케이션 레벨에서 처리
   - 데이터베이스 마이그레이션 없이 요구사항 변경 대응 가능

4. **URL 형식 검증 제거**:
   - `channel_link`의 URL 형식 검증을 제거하여 다양한 플랫폼 링크 허용

5. **날짜 검증 간소화**:
   - `birth_date`, `visit_date` 등의 복잡한 검증을 제거하여 애플리케이션 레벨에서 처리

### 12.2 설계 철학

- **간결성**: 필수 제약조건만 데이터베이스에 정의
- **유연성**: 비즈니스 로직 변경 시 마이그레이션 최소화
- **성능**: 실제 쿼리 패턴에 맞춘 인덱스 전략
- **확장성**: 향후 기능 추가를 고려한 구조

---

## 13. 참고 문서

- [Supabase SQL Editor](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- `/docs/external/postgresql.md` - PostgreSQL 스타일 가이드
- `/docs/external/supabase-auth.md` - Supabase Auth 가이드

---

## 14. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|--------|
| 2025-11-14 | 1.0 | 초안 작성 | Claude |
| 2025-11-14 | 2.0 | 간결성 및 확장성 중심으로 재설계 | Claude |
