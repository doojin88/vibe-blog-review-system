import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { CAMPAIGN_DETAIL_ERROR, type CampaignDetailErrorCode } from './error';
import type { CampaignDetail, Application } from './schema';

export const getCampaignDetail = async (
  supabase: SupabaseClient,
  campaignId: number,
  advertiserId: number
): Promise<HandlerResult<{ campaign: CampaignDetail }, CampaignDetailErrorCode>> => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      title,
      description,
      recruitment_start_date,
      recruitment_end_date,
      recruitment_count,
      benefits,
      mission,
      store_name,
      store_address,
      store_phone,
      category,
      status,
      created_at,
      updated_at,
      advertiser_id,
      advertisers!inner (
        id,
        business_name
      )
    `)
    .eq('id', campaignId)
    .single();

  if (error || !data) {
    return failure(404, CAMPAIGN_DETAIL_ERROR.CAMPAIGN_NOT_FOUND, '존재하지 않는 체험단입니다');
  }

  if (data.advertiser_id !== advertiserId) {
    return failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '이 체험단에 접근할 권한이 없습니다');
  }

  const campaign: CampaignDetail = {
    id: data.id,
    title: data.title,
    description: data.description,
    recruitment_start_date: data.recruitment_start_date,
    recruitment_end_date: data.recruitment_end_date,
    recruitment_count: data.recruitment_count,
    benefits: data.benefits,
    mission: data.mission,
    store_name: data.store_name,
    store_address: data.store_address,
    store_phone: data.store_phone,
    category: data.category,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
    advertiser: {
      id: (data.advertisers as any).id,
      business_name: (data.advertisers as any).business_name,
    },
  };

  return success({ campaign });
};

export const getApplicants = async (
  supabase: SupabaseClient,
  campaignId: number,
  advertiserId: number,
  sort: 'latest' | 'oldest' = 'latest',
  status?: string
): Promise<HandlerResult<{ applications: Application[] }, CampaignDetailErrorCode>> => {
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('advertiser_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return failure(404, CAMPAIGN_DETAIL_ERROR.CAMPAIGN_NOT_FOUND, '존재하지 않는 체험단입니다');
  }

  if (campaign.advertiser_id !== advertiserId) {
    return failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '이 체험단에 접근할 권한이 없습니다');
  }

  let query = supabase
    .from('applications')
    .select(`
      id,
      message,
      visit_date,
      status,
      applied_at,
      influencers!inner (
        id,
        name,
        channel_name,
        channel_link,
        followers_count
      )
    `)
    .eq('campaign_id', campaignId);

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('applied_at', { ascending: sort === 'oldest' });

  const { data, error } = await query;

  if (error) {
    return failure(500, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '신청자 조회에 실패했습니다');
  }

  const applications: Application[] = (data || []).map((app: any) => ({
    id: app.id,
    message: app.message,
    visit_date: app.visit_date,
    status: app.status,
    applied_at: app.applied_at,
    influencer: {
      id: app.influencers.id,
      name: app.influencers.name,
      channel_name: app.influencers.channel_name,
      channel_link: app.influencers.channel_link,
      followers_count: app.influencers.followers_count,
    },
  }));

  return success({ applications });
};

export const earlyClosure = async (
  supabase: SupabaseClient,
  campaignId: number,
  advertiserId: number
): Promise<HandlerResult<{ campaign: { id: number; status: string; updated_at: string } }, CampaignDetailErrorCode>> => {
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('advertiser_id, status')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return failure(404, CAMPAIGN_DETAIL_ERROR.CAMPAIGN_NOT_FOUND, '존재하지 않는 체험단입니다');
  }

  if (campaign.advertiser_id !== advertiserId) {
    return failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '이 체험단에 접근할 권한이 없습니다');
  }

  if (campaign.status !== '모집중') {
    return failure(400, CAMPAIGN_DETAIL_ERROR.ALREADY_CLOSED, '이미 종료된 체험단입니다');
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: '모집종료' })
    .eq('id', campaignId)
    .select('id, status, updated_at')
    .single();

  if (error || !data) {
    return failure(500, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '모집 종료에 실패했습니다');
  }

  return success({ campaign: data });
};

export const selectInfluencers = async (
  supabase: SupabaseClient,
  campaignId: number,
  advertiserId: number,
  selectedIds: number[]
): Promise<HandlerResult<{ selected_count: number; rejected_count: number; campaign: { id: number; status: string } }, CampaignDetailErrorCode>> => {
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('advertiser_id, status, recruitment_count')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return failure(404, CAMPAIGN_DETAIL_ERROR.CAMPAIGN_NOT_FOUND, '존재하지 않는 체험단입니다');
  }

  if (campaign.advertiser_id !== advertiserId) {
    return failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '이 체험단에 접근할 권한이 없습니다');
  }

  if (campaign.status === '선정완료') {
    return failure(400, CAMPAIGN_DETAIL_ERROR.ALREADY_COMPLETED, '이미 선정이 완료된 체험단입니다');
  }

  if (campaign.status !== '모집종료') {
    return failure(400, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '모집이 종료된 체험단만 선정할 수 있습니다');
  }

  if (selectedIds.length === 0) {
    return failure(400, CAMPAIGN_DETAIL_ERROR.NO_SELECTION, '최소 1명의 인플루언서를 선정해야 합니다');
  }

  if (selectedIds.length > campaign.recruitment_count) {
    return failure(400, CAMPAIGN_DETAIL_ERROR.SELECTION_COUNT_EXCEEDED, `모집 인원(${campaign.recruitment_count}명)을 초과할 수 없습니다`);
  }

  const { data: applications, error: applicationsError } = await supabase
    .from('applications')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('status', '신청완료');

  if (applicationsError || !applications || applications.length === 0) {
    return failure(400, CAMPAIGN_DETAIL_ERROR.NO_APPLICANTS, '신청자가 없습니다');
  }

  const { error: selectedError } = await supabase
    .from('applications')
    .update({ status: '선정' })
    .in('id', selectedIds)
    .eq('campaign_id', campaignId);

  if (selectedError) {
    return failure(500, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '선정 처리에 실패했습니다');
  }

  const allApplicationIds = applications.map(app => app.id);
  const rejectedIds = allApplicationIds.filter(id => !selectedIds.includes(id));

  let rejected_count = 0;
  if (rejectedIds.length > 0) {
    const { error: rejectedError } = await supabase
      .from('applications')
      .update({ status: '반려' })
      .in('id', rejectedIds)
      .eq('campaign_id', campaignId);

    if (rejectedError) {
      return failure(500, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '반려 처리에 실패했습니다');
    }
    rejected_count = rejectedIds.length;
  }

  const { error: statusError } = await supabase
    .from('campaigns')
    .update({ status: '선정완료' })
    .eq('id', campaignId);

  if (statusError) {
    return failure(500, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '체험단 상태 업데이트에 실패했습니다');
  }

  return success({
    selected_count: selectedIds.length,
    rejected_count,
    campaign: {
      id: campaignId,
      status: '선정완료',
    },
  });
};
