-- Migration: Create campaigns table
-- This table stores campaign information registered by advertisers

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

COMMENT ON TABLE public.campaigns IS '광고주가 등록한 체험단 정보를 저장하는 테이블. 모집 상태를 관리하고 인플루언서의 지원을 받습니다.';
COMMENT ON COLUMN public.campaigns.id IS '체험단 고유 식별자';
COMMENT ON COLUMN public.campaigns.advertiser_id IS '체험단을 등록한 광고주 ID (외래키)';
COMMENT ON COLUMN public.campaigns.title IS '체험단명';
COMMENT ON COLUMN public.campaigns.description IS '체험단 설명';
COMMENT ON COLUMN public.campaigns.recruitment_start_date IS '모집 시작일';
COMMENT ON COLUMN public.campaigns.recruitment_end_date IS '모집 종료일';
COMMENT ON COLUMN public.campaigns.recruitment_count IS '모집 인원';
COMMENT ON COLUMN public.campaigns.benefits IS '제공 혜택';
COMMENT ON COLUMN public.campaigns.mission IS '미션 및 요구사항';
COMMENT ON COLUMN public.campaigns.store_name IS '매장명';
COMMENT ON COLUMN public.campaigns.store_address IS '매장 주소';
COMMENT ON COLUMN public.campaigns.store_phone IS '매장 전화번호';
COMMENT ON COLUMN public.campaigns.category IS '체험단 카테고리';
COMMENT ON COLUMN public.campaigns.status IS '모집 상태 (모집중, 모집종료, 선정완료)';
COMMENT ON COLUMN public.campaigns.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN public.campaigns.updated_at IS '레코드 수정 시각 (트리거로 자동 업데이트)';
