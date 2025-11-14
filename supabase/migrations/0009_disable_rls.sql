-- Migration: Disable Row Level Security (RLS)
-- This migration disables RLS for all tables as per project guidelines
-- Authorization will be handled at the application level

ALTER TABLE public.advertisers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.advertisers IS '광고주 프로필 정보를 저장하는 테이블. auth.users와 1:1 관계를 가지며, 체험단 등록 및 관리 권한을 부여합니다. RLS 비활성화.';
COMMENT ON TABLE public.influencers IS '인플루언서 프로필 정보를 저장하는 테이블. auth.users와 1:1 관계를 가지며, 체험단 지원 권한을 부여합니다. RLS 비활성화.';
COMMENT ON TABLE public.campaigns IS '광고주가 등록한 체험단 정보를 저장하는 테이블. 모집 상태를 관리하고 인플루언서의 지원을 받습니다. RLS 비활성화.';
COMMENT ON TABLE public.applications IS '인플루언서가 체험단에 지원한 내역을 저장하는 테이블. 중복 지원을 방지하고 선정 상태를 관리합니다. RLS 비활성화.';
