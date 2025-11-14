import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import type { CreateApplicationRequest, ApplicationResponse } from './schema';
import { ApplicationErrorCodes, type ApplicationServiceError } from './error';

export const createApplication = async (
  client: SupabaseClient,
  userId: string,
  data: CreateApplicationRequest
): Promise<HandlerResult<ApplicationResponse, ApplicationServiceError, unknown>> => {
  // 1. 인플루언서 ID 조회
  const { data: influencer, error: influencerError } = await client
    .from('influencers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (influencerError) {
    return failure(
      500,
      ApplicationErrorCodes.DATABASE_ERROR,
      '인플루언서 정보 조회 실패'
    );
  }

  if (!influencer) {
    return failure(
      403,
      ApplicationErrorCodes.PROFILE_NOT_FOUND,
      '인플루언서 프로필을 먼저 등록해주세요'
    );
  }

  // 2. 체험단 조회 및 모집 상태 확인
  const { data: campaign, error: campaignError } = await client
    .from('campaigns')
    .select('id, status, recruitment_end_date')
    .eq('id', data.campaign_id)
    .maybeSingle();

  if (campaignError) {
    return failure(
      500,
      ApplicationErrorCodes.DATABASE_ERROR,
      '체험단 정보 조회 실패'
    );
  }

  if (!campaign) {
    return failure(
      404,
      ApplicationErrorCodes.CAMPAIGN_NOT_FOUND,
      '존재하지 않는 체험단입니다'
    );
  }

  if (campaign.status !== '모집중') {
    return failure(
      403,
      ApplicationErrorCodes.CAMPAIGN_CLOSED,
      '모집이 종료된 체험단입니다'
    );
  }

  // 3. 중복 지원 확인
  const { data: existingApplication, error: checkError } = await client
    .from('applications')
    .select('id')
    .eq('campaign_id', data.campaign_id)
    .eq('influencer_id', influencer.id)
    .maybeSingle();

  if (checkError) {
    return failure(
      500,
      ApplicationErrorCodes.DATABASE_ERROR,
      '지원 내역 조회 실패'
    );
  }

  if (existingApplication) {
    return failure(
      409,
      ApplicationErrorCodes.ALREADY_APPLIED,
      '이미 지원한 체험단입니다'
    );
  }

  // 4. 지원서 생성
  const { data: application, error: insertError } = await client
    .from('applications')
    .insert({
      campaign_id: data.campaign_id,
      influencer_id: influencer.id,
      message: data.message,
      visit_date: data.visit_date,
      status: '신청완료',
      applied_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError) {
    return failure(
      500,
      ApplicationErrorCodes.CREATE_FAILED,
      '지원서 제출에 실패했습니다'
    );
  }

  return success({
    id: application.id,
    campaign_id: application.campaign_id,
    influencer_id: application.influencer_id,
    message: application.message,
    visit_date: application.visit_date,
    status: application.status,
    applied_at: application.applied_at,
    created_at: application.created_at,
    updated_at: application.updated_at,
  });
};
