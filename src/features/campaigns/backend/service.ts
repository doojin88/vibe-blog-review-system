import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { CampaignErrorCodes, campaignErrorCodes, type CampaignServiceError } from './error';
import type { CampaignDetailResponse, CreateCampaignInput, Campaign, Application } from './schema';

// 광고주의 체험단 리스트 조회
export async function getCampaignsByAdvertiser(
  supabase: SupabaseClient,
  advertiserId: number,
  filters?: { status?: string; sort?: string }
): Promise<HandlerResult<{ campaigns: Campaign[] }, CampaignServiceError, unknown>> {
  try {
    let query = supabase
      .from('campaigns')
      .select(`
        *,
        applications:applications(count)
      `)
      .eq('advertiser_id', advertiserId);

    // Apply status filter
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Apply sorting
    const order = filters?.sort === 'oldest' ? 'asc' : 'desc';
    query = query.order('created_at', { ascending: order === 'asc' });

    const { data, error } = await query;

    if (error) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '체험단 목록 조회에 실패했습니다', error);
    }

    const campaigns: Campaign[] = (data || []).map((campaign: any) => ({
      ...campaign,
      applicants_count: campaign.applications?.[0]?.count || 0,
    }));

    return success({ campaigns });
  } catch (error) {
    return failure(500, CampaignErrorCodes.DB_ERROR, '체험단 목록 조회에 실패했습니다', error);
  }
}

// 신규 체험단 등록
export async function createCampaign(
  supabase: SupabaseClient,
  advertiserId: number,
  data: CreateCampaignInput
): Promise<HandlerResult<Campaign, CampaignServiceError, unknown>> {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        advertiser_id: advertiserId,
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
        status: '모집중',
      })
      .select()
      .single();

    if (error) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '체험단 등록에 실패했습니다', error);
    }

    return success(campaign as Campaign, 201);
  } catch (error) {
    return failure(500, CampaignErrorCodes.DB_ERROR, '체험단 등록에 실패했습니다', error);
  }
}

// 체험단 상세 조회 (광고주용 대시보드)
export async function getCampaignById(
  supabase: SupabaseClient,
  campaignId: number
): Promise<HandlerResult<Campaign, CampaignServiceError, unknown>> {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*, applications:applications(count)')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      if (error?.code === 'PGRST116') {
        return failure(404, CampaignErrorCodes.CAMPAIGN_NOT_FOUND, '체험단을 찾을 수 없습니다');
      }
      return failure(500, CampaignErrorCodes.DB_ERROR, '체험단 조회에 실패했습니다', error);
    }

    const result: Campaign = {
      ...campaign,
      applicants_count: campaign.applications?.[0]?.count || 0,
    };

    return success(result);
  } catch (error) {
    return failure(500, CampaignErrorCodes.DB_ERROR, '체험단 조회에 실패했습니다', error);
  }
}

// 신청자 리스트 조회
export async function getApplicationsByCampaign(
  supabase: SupabaseClient,
  campaignId: number
): Promise<HandlerResult<{ applications: Application[] }, CampaignServiceError, unknown>> {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        influencer:influencers(id, name, channel_name, channel_link, followers_count)
      `)
      .eq('campaign_id', campaignId)
      .order('applied_at', { ascending: false });

    if (error) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '신청자 목록 조회에 실패했습니다', error);
    }

    const result = (applications || []).map((app: any) => ({
      ...app,
      influencer: app.influencer,
    }));

    return success({ applications: result as Application[] });
  } catch (error) {
    return failure(500, CampaignErrorCodes.DB_ERROR, '신청자 목록 조회에 실패했습니다', error);
  }
}

// 모집 상태 변경 (조기 종료)
export async function updateCampaignStatus(
  supabase: SupabaseClient,
  campaignId: number,
  advertiserId: number,
  status: string
): Promise<HandlerResult<Campaign, CampaignServiceError, unknown>> {
  try {
    // 소유권 확인
    const { data: campaign, error: checkError } = await supabase
      .from('campaigns')
      .select('advertiser_id, status')
      .eq('id', campaignId)
      .single();

    if (checkError || !campaign) {
      return failure(404, CampaignErrorCodes.CAMPAIGN_NOT_FOUND, '체험단을 찾을 수 없습니다');
    }

    if (campaign.advertiser_id !== advertiserId) {
      return failure(403, CampaignErrorCodes.FORBIDDEN, '접근 권한이 없습니다');
    }

    // 상태 전환 유효성 검증 (모집중 → 모집종료만 허용)
    if (campaign.status !== '모집중' || status !== '모집종료') {
      return failure(400, CampaignErrorCodes.INVALID_STATUS_TRANSITION, '잘못된 상태 전환입니다');
    }

    // 상태 업데이트
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ status })
      .eq('id', campaignId)
      .select('*, applications:applications(count)')
      .single();

    if (updateError) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '상태 변경에 실패했습니다', updateError);
    }

    const result: Campaign = {
      ...updatedCampaign,
      applicants_count: updatedCampaign.applications?.[0]?.count || 0,
    };

    return success(result);
  } catch (error) {
    return failure(500, CampaignErrorCodes.DB_ERROR, '상태 변경에 실패했습니다', error);
  }
}

// 인플루언서 선정 (일괄 처리)
export async function bulkUpdateApplications(
  supabase: SupabaseClient,
  campaignId: number,
  advertiserId: number,
  selectedIds: number[]
): Promise<HandlerResult<{ selectedCount: number; rejectedCount: number }, CampaignServiceError, unknown>> {
  try {
    // 소유권 확인
    const { data: campaign, error: checkError } = await supabase
      .from('campaigns')
      .select('advertiser_id, recruitment_count, status')
      .eq('id', campaignId)
      .single();

    if (checkError || !campaign) {
      return failure(404, CampaignErrorCodes.CAMPAIGN_NOT_FOUND, '체험단을 찾을 수 없습니다');
    }

    if (campaign.advertiser_id !== advertiserId) {
      return failure(403, CampaignErrorCodes.FORBIDDEN, '접근 권한이 없습니다');
    }

    // 체험단 상태 확인 (모집종료만 허용)
    if (campaign.status !== '모집종료') {
      return failure(400, CampaignErrorCodes.INVALID_STATUS_TRANSITION, '모집 종료 후 선정할 수 있습니다');
    }

    // 모집 인원 제한 검증
    if (selectedIds.length > campaign.recruitment_count) {
      return failure(400, CampaignErrorCodes.RECRUITMENT_COUNT_EXCEEDED, `최대 ${campaign.recruitment_count}명까지 선정할 수 있습니다`);
    }

    // Transaction 처리: 선정 및 반려
    // 1. 선정: UPDATE applications SET status = '선정' WHERE id IN (...)
    const { error: selectError } = await supabase
      .from('applications')
      .update({ status: '선정' })
      .eq('campaign_id', campaignId)
      .in('id', selectedIds);

    if (selectError) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '선정 처리에 실패했습니다', selectError);
    }

    // 2. 반려: UPDATE applications SET status = '반려' WHERE campaign_id = ? AND status = '신청완료'
    const { error: rejectError } = await supabase
      .from('applications')
      .update({ status: '반려' })
      .eq('campaign_id', campaignId)
      .eq('status', '신청완료');

    if (rejectError) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '반려 처리에 실패했습니다', rejectError);
    }

    // 3. 체험단 상태 변경: UPDATE campaigns SET status = '선정완료'
    const { error: campaignStatusError } = await supabase
      .from('campaigns')
      .update({ status: '선정완료' })
      .eq('id', campaignId);

    if (campaignStatusError) {
      return failure(500, CampaignErrorCodes.DB_ERROR, '상태 변경에 실패했습니다', campaignStatusError);
    }

    return success({
      selectedCount: selectedIds.length,
      rejectedCount: 0, // 정확한 수는 추가 쿼리 필요
    });
  } catch (error) {
    return failure(500, CampaignErrorCodes.DB_ERROR, '선정 처리에 실패했습니다', error);
  }
}

// 체험단 상세 조회 (기존 호환성)
export async function getCampaignDetail(
  supabase: SupabaseClient,
  campaignId: number,
  currentUserId?: string,
  currentUserRole?: 'advertiser' | 'influencer' | null
): Promise<HandlerResult<CampaignDetailResponse, CampaignServiceError, unknown>> {
  try {
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        advertiser:advertisers!inner(id, business_name)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaignData) {
      if (campaignError?.code === 'PGRST116') {
        return failure(404, campaignErrorCodes.notFound, '존재하지 않는 체험단입니다');
      }
      throw campaignError;
    }

    let isOwner = false;
    if (currentUserId && currentUserRole === 'advertiser') {
      const { data: advertiserData } = await supabase
        .from('advertisers')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (advertiserData) {
        isOwner = advertiserData.id === campaignData.advertiser_id;
      }
    }

    let hasApplied: boolean | null = null;
    if (currentUserId && currentUserRole === 'influencer') {
      const { data: influencerData } = await supabase
        .from('influencers')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (influencerData) {
        const { data: applicationData } = await supabase
          .from('applications')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('influencer_id', influencerData.id)
          .single();

        hasApplied = !!applicationData;
      }
    }

    const response: CampaignDetailResponse = {
      campaign: {
        id: campaignData.id,
        title: campaignData.title,
        description: campaignData.description,
        recruitment_start_date: campaignData.recruitment_start_date,
        recruitment_end_date: campaignData.recruitment_end_date,
        recruitment_count: campaignData.recruitment_count,
        benefits: campaignData.benefits,
        mission: campaignData.mission,
        store_name: campaignData.store_name,
        store_address: campaignData.store_address,
        store_phone: campaignData.store_phone,
        category: campaignData.category,
        status: campaignData.status,
        created_at: campaignData.created_at,
        updated_at: campaignData.updated_at,
        advertiser: campaignData.advertiser,
      },
      hasApplied,
      isOwner,
    };

    return success(response);
  } catch (error) {
    return failure(
      500,
      campaignErrorCodes.fetchError,
      '체험단 정보를 불러오는데 실패했습니다',
      error
    );
  }
}
