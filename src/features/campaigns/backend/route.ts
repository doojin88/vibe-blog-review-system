import { Hono } from 'hono';
import { failure, respond, success } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import {
  CreateCampaignSchema,
  UpdateCampaignStatusSchema,
  BulkUpdateApplicationsSchema,
  CampaignQuerySchema,
  CampaignIdParamsSchema,
} from './schema';
import {
  getCampaignsByAdvertiser,
  createCampaign,
  getCampaignById,
  getApplicationsByCampaign,
  updateCampaignStatus,
  bulkUpdateApplications,
  getCampaignDetail,
} from './service';
import { CampaignErrorCodes } from './error';

const app = new Hono<AppEnv>();

/**
 * GET /api/campaigns
 * 광고주의 체험단 리스트 조회
 */
app.get('/', async (c) => {
  try {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, '광고주 정보가 없습니다'));
    }

    // Parse query params
    const query = c.req.query();
    const parsedQuery = CampaignQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      return respond(
        c,
        failure(400, 'INVALID_QUERY', '잘못된 쿼리 파라미터입니다', parsedQuery.error.format())
      );
    }

    // Get campaigns
    const result = await getCampaignsByAdvertiser(
      supabase,
      advertiser.id,
      parsedQuery.data
    );

    return respond(c, result);
  } catch (error) {
    c.get('logger').error('Failed to get campaigns', error);
    return respond(c, failure(500, 'INTERNAL_ERROR', '체험단 목록 조회에 실패했습니다'));
  }
});

/**
 * POST /api/campaigns
 * 신규 체험단 등록
 */
app.post('/', async (c) => {
  try {
    const supabase = c.get('supabase');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, '광고주 정보가 없습니다'));
    }

    // Parse request body
    const body = await c.req.json();
    const parsedBody = CreateCampaignSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(400, 'INVALID_REQUEST', '입력 데이터가 올바르지 않습니다', parsedBody.error.format())
      );
    }

    // Create campaign
    const result = await createCampaign(supabase, advertiser.id, parsedBody.data);

    if (!result.ok) {
      return respond(c, result);
    }

    return respond(c, success(result.data, 201));
  } catch (error) {
    c.get('logger').error('Failed to create campaign', error);
    return respond(c, failure(500, 'INTERNAL_ERROR', '체험단 등록에 실패했습니다'));
  }
});

/**
 * GET /api/campaigns/:id
 * 체험단 상세 조회
 */
app.get('/:id', async (c) => {
  try {
    const supabase = c.get('supabase');
    const campaignId = Number(c.req.param('id'));

    if (isNaN(campaignId)) {
      return respond(c, failure(400, 'INVALID_PARAM', '잘못된 체험단 ID입니다'));
    }

    // Try dashboard route first (for advertiser)
    const { data: { user } } = await supabase.auth.getUser();
    let currentUserRole: 'advertiser' | 'influencer' | null = null;

    if (user) {
      const { data: advertiserData } = await supabase
        .from('advertisers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (advertiserData) {
        currentUserRole = 'advertiser';
      } else {
        const { data: influencerData } = await supabase
          .from('influencers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (influencerData) {
          currentUserRole = 'influencer';
        }
      }
    }

    // Return campaign detail (supports both advertiser and influencer)
    const result = await getCampaignDetail(
      supabase,
      campaignId,
      user?.id,
      currentUserRole
    );

    return respond(c, result);
  } catch (error) {
    c.get('logger').error('Failed to get campaign', error);
    return respond(c, failure(500, 'INTERNAL_ERROR', '체험단 조회에 실패했습니다'));
  }
});

/**
 * GET /api/campaigns/:id/applications
 * 체험단 신청자 리스트 조회
 */
app.get('/:id/applications', async (c) => {
  try {
    const supabase = c.get('supabase');
    const campaignId = Number(c.req.param('id'));

    if (isNaN(campaignId)) {
      return respond(c, failure(400, 'INVALID_PARAM', '잘못된 체험단 ID입니다'));
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, '광고주 정보가 없습니다'));
    }

    // Verify ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('advertiser_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return respond(c, failure(404, CampaignErrorCodes.CAMPAIGN_NOT_FOUND, '체험단을 찾을 수 없습니다'));
    }

    if (campaign.advertiser_id !== advertiser.id) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, '접근 권한이 없습니다'));
    }

    // Get applications
    const result = await getApplicationsByCampaign(supabase, campaignId);

    return respond(c, result);
  } catch (error) {
    c.get('logger').error('Failed to get applications', error);
    return respond(c, failure(500, 'INTERNAL_ERROR', '신청자 목록 조회에 실패했습니다'));
  }
});

/**
 * PATCH /api/campaigns/:id/status
 * 모집 상태 변경 (조기 종료)
 */
app.patch('/:id/status', async (c) => {
  try {
    const supabase = c.get('supabase');
    const campaignId = Number(c.req.param('id'));

    if (isNaN(campaignId)) {
      return respond(c, failure(400, 'INVALID_PARAM', '잘못된 체험단 ID입니다'));
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, '광고주 정보가 없습니다'));
    }

    // Parse request body
    const body = await c.req.json();
    const parsedBody = UpdateCampaignStatusSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(400, 'INVALID_REQUEST', '입력 데이터가 올바르지 않습니다', parsedBody.error.format())
      );
    }

    // Update status
    const result = await updateCampaignStatus(
      supabase,
      campaignId,
      advertiser.id,
      parsedBody.data.status
    );

    return respond(c, result);
  } catch (error) {
    c.get('logger').error('Failed to update campaign status', error);
    return respond(c, failure(500, 'INTERNAL_ERROR', '상태 변경에 실패했습니다'));
  }
});

/**
 * PATCH /api/applications/bulk
 * 인플루언서 선정 (일괄 업데이트)
 */
app.patch('/applications/bulk', async (c) => {
  try {
    const supabase = c.get('supabase');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond(c, failure(401, CampaignErrorCodes.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    // Get advertiser profile
    const { data: advertiser, error: profileError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !advertiser) {
      return respond(c, failure(403, CampaignErrorCodes.FORBIDDEN, '광고주 정보가 없습니다'));
    }

    // Parse request body
    const body = await c.req.json();
    const parsedBody = BulkUpdateApplicationsSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(400, 'INVALID_REQUEST', '입력 데이터가 올바르지 않습니다', parsedBody.error.format())
      );
    }

    // Bulk update
    const result = await bulkUpdateApplications(
      supabase,
      parsedBody.data.campaign_id,
      advertiser.id,
      parsedBody.data.selected_application_ids
    );

    return respond(c, result);
  } catch (error) {
    c.get('logger').error('Failed to bulk update applications', error);
    return respond(c, failure(500, 'INTERNAL_ERROR', '선정 처리에 실패했습니다'));
  }
});

export default app;
