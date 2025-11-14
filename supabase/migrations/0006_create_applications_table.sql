-- Migration: Create applications table
-- This table stores application information from influencers to campaigns

CREATE TABLE public.applications (
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

-- Disable RLS
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE public.applications IS '인플루언서가 체험단에 지원한 내역을 저장하는 테이블. 중복 지원을 방지하고 선정 상태를 관리합니다.';
COMMENT ON COLUMN public.applications.id IS '지원서 고유 식별자';
COMMENT ON COLUMN public.applications.campaign_id IS '지원한 체험단 ID (외래키)';
COMMENT ON COLUMN public.applications.influencer_id IS '지원한 인플루언서 ID (외래키)';
COMMENT ON COLUMN public.applications.message IS '각오 한마디';
COMMENT ON COLUMN public.applications.visit_date IS '방문 예정일';
COMMENT ON COLUMN public.applications.status IS '지원 상태 (신청완료, 선정, 반려)';
COMMENT ON COLUMN public.applications.applied_at IS '지원 시각';
COMMENT ON COLUMN public.applications.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN public.applications.updated_at IS '레코드 수정 시각 (트리거로 자동 업데이트)';
