-- Migration: Create indexes for query optimization
-- This migration creates all necessary indexes for efficient querying

-- Advertisers table indexes
CREATE INDEX IF NOT EXISTS idx_advertisers_user_id ON public.advertisers(user_id);

-- Influencers table indexes
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_influencers_followers_count ON public.influencers(followers_count DESC);

-- Campaigns table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON public.campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created_at ON public.campaigns(status, created_at DESC);

-- Applications table indexes
CREATE INDEX IF NOT EXISTS idx_applications_campaign_id ON public.applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_influencer_id ON public.applications(influencer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications(applied_at DESC);

-- Index comments
COMMENT ON INDEX idx_advertisers_user_id IS '사용자 → 광고주 조회 최적화';
COMMENT ON INDEX idx_influencers_user_id IS '사용자 → 인플루언서 조회 최적화';
COMMENT ON INDEX idx_influencers_followers_count IS '팔로워 수 기준 정렬 최적화';
COMMENT ON INDEX idx_campaigns_advertiser_id IS '광고주 → 체험단 리스트 조회 최적화';
COMMENT ON INDEX idx_campaigns_status IS '모집 상태별 필터링 최적화';
COMMENT ON INDEX idx_campaigns_category IS '카테고리별 필터링 최적화';
COMMENT ON INDEX idx_campaigns_status_created_at IS '상태별 + 최신순 조회 최적화 (복합 인덱스)';
COMMENT ON INDEX idx_applications_campaign_id IS '체험단 → 신청자 리스트 조회 최적화';
COMMENT ON INDEX idx_applications_influencer_id IS '인플루언서 → 내 지원 목록 조회 최적화';
COMMENT ON INDEX idx_applications_status IS '지원 상태별 필터링 최적화';
COMMENT ON INDEX idx_applications_applied_at IS '지원일 최신순 정렬 최적화';
