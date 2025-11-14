-- Migration: Create updated_at trigger function and triggers
-- This migration creates a trigger function to automatically update the updated_at column
-- and applies it to all tables

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS '테이블의 updated_at 컬럼을 현재 시각으로 자동 업데이트하는 트리거 함수';

-- Apply trigger to advertisers table
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.advertisers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to influencers table
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.influencers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to campaigns table
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to applications table
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
