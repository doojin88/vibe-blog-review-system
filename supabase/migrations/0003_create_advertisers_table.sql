-- Migration: Create advertisers table
-- This table stores advertiser profile information
-- Has a 1:1 relationship with auth.users

CREATE TABLE public.advertisers (
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

COMMENT ON TABLE public.advertisers IS '광고주 프로필 정보를 저장하는 테이블. auth.users와 1:1 관계를 가지며, 체험단 등록 및 관리 권한을 부여합니다.';
COMMENT ON COLUMN public.advertisers.id IS '광고주 고유 식별자';
COMMENT ON COLUMN public.advertisers.user_id IS 'Supabase Auth의 사용자 ID (외래키, 유니크)';
COMMENT ON COLUMN public.advertisers.name IS '광고주 담당자 이름';
COMMENT ON COLUMN public.advertisers.birth_date IS '광고주 담당자 생년월일';
COMMENT ON COLUMN public.advertisers.phone IS '광고주 담당자 휴대폰번호';
COMMENT ON COLUMN public.advertisers.business_name IS '업체명';
COMMENT ON COLUMN public.advertisers.address IS '업체 주소';
COMMENT ON COLUMN public.advertisers.business_phone IS '업장 전화번호';
COMMENT ON COLUMN public.advertisers.business_registration_number IS '사업자등록번호';
COMMENT ON COLUMN public.advertisers.representative_name IS '사업자 대표자명';
COMMENT ON COLUMN public.advertisers.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN public.advertisers.updated_at IS '레코드 수정 시각 (트리거로 자동 업데이트)';
