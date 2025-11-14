-- Migration: Create influencers table
-- This table stores influencer profile information
-- Has a 1:1 relationship with auth.users

CREATE TABLE public.influencers (
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

COMMENT ON TABLE public.influencers IS '인플루언서 프로필 정보를 저장하는 테이블. auth.users와 1:1 관계를 가지며, 체험단 지원 권한을 부여합니다.';
COMMENT ON COLUMN public.influencers.id IS '인플루언서 고유 식별자';
COMMENT ON COLUMN public.influencers.user_id IS 'Supabase Auth의 사용자 ID (외래키, 유니크)';
COMMENT ON COLUMN public.influencers.name IS '인플루언서 이름';
COMMENT ON COLUMN public.influencers.birth_date IS '인플루언서 생년월일';
COMMENT ON COLUMN public.influencers.phone IS '인플루언서 휴대폰번호';
COMMENT ON COLUMN public.influencers.channel_name IS 'SNS 채널명';
COMMENT ON COLUMN public.influencers.channel_link IS 'SNS 채널 링크 (Naver Blog, YouTube, Instagram, Threads 등)';
COMMENT ON COLUMN public.influencers.followers_count IS '팔로워 수';
COMMENT ON COLUMN public.influencers.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN public.influencers.updated_at IS '레코드 수정 시각 (트리거로 자동 업데이트)';
