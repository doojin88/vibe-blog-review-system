-- Migration: Create ENUM types for campaigns and applications
-- This migration creates all ENUM types used in the system

-- Campaign status ENUM
-- 모집중: 체험단이 현재 지원자를 모집 중인 상태
-- 모집종료: 모집 기간이 종료되었거나 광고주가 조기 종료한 상태
-- 선정완료: 광고주가 인플루언서 선정을 완료한 상태
CREATE TYPE IF NOT EXISTS campaign_status_enum AS ENUM ('모집중', '모집종료', '선정완료');

-- Application status ENUM
-- 신청완료: 인플루언서가 체험단에 지원한 초기 상태
-- 선정: 광고주가 해당 인플루언서를 체험단에 선정한 상태
-- 반려: 광고주가 해당 인플루언서를 선정하지 않은 상태
CREATE TYPE IF NOT EXISTS application_status_enum AS ENUM ('신청완료', '선정', '반려');

-- Campaign category ENUM
-- 음식점: 레스토랑, 한식, 중식, 일식, 양식 등
-- 카페: 카페, 디저트 전문점 등
-- 뷰티: 헤어샵, 네일샵, 피부관리실 등
-- 패션: 의류, 액세서리 등
-- 생활: 생활용품, 가전제품 등
-- 기타: 위 카테고리에 속하지 않는 체험단
CREATE TYPE IF NOT EXISTS campaign_category_enum AS ENUM ('음식점', '카페', '뷰티', '패션', '생활', '기타');

COMMENT ON TYPE campaign_status_enum IS '체험단 모집 상태 (모집중, 모집종료, 선정완료)';
COMMENT ON TYPE application_status_enum IS '지원 상태 (신청완료, 선정, 반려)';
COMMENT ON TYPE campaign_category_enum IS '체험단 카테고리 (음식점, 카페, 뷰티, 패션, 생활, 기타)';
