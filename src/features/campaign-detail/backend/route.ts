import type { Hono } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { respond, failure } from '@/backend/http/response';
import { EarlyCloseSchema, SelectionSchema } from './schema';
import { getCampaignDetail, getApplicants, earlyClosure, selectInfluencers } from './service';
import { CAMPAIGN_DETAIL_ERROR } from './error';

export const registerCampaignDetailRoutes = (app: Hono<AppEnv>) => {
  app.get('/api/campaigns/:id', async (c) => {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(c, failure(401, CAMPAIGN_DETAIL_ERROR.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) {
      return respond(c, failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '광고주 권한이 필요합니다'));
    }

    const campaignId = Number(c.req.param('id'));

    if (isNaN(campaignId) || campaignId <= 0) {
      return respond(c, failure(400, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '유효하지 않은 체험단 ID입니다'));
    }

    const result = await getCampaignDetail(supabase, campaignId, advertiser.id);

    if (!result.ok) {
      logger.error('Failed to get campaign detail', (result as any).error);
    }

    return respond(c, result);
  });

  app.get('/api/campaigns/:id/applications', async (c) => {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(c, failure(401, CAMPAIGN_DETAIL_ERROR.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) {
      return respond(c, failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '광고주 권한이 필요합니다'));
    }

    const campaignId = Number(c.req.param('id'));

    if (isNaN(campaignId) || campaignId <= 0) {
      return respond(c, failure(400, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '유효하지 않은 체험단 ID입니다'));
    }

    const sort = c.req.query('sort') as 'latest' | 'oldest' | undefined;
    const status = c.req.query('status');

    const result = await getApplicants(supabase, campaignId, advertiser.id, sort, status);

    if (!result.ok) {
      logger.error('Failed to get applicants', (result as any).error);
    }

    return respond(c, result);
  });

  app.patch('/api/campaigns/:id/status', async (c) => {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(c, failure(401, CAMPAIGN_DETAIL_ERROR.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) {
      return respond(c, failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '광고주 권한이 필요합니다'));
    }

    const campaignId = Number(c.req.param('id'));

    if (isNaN(campaignId) || campaignId <= 0) {
      return respond(c, failure(400, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '유효하지 않은 체험단 ID입니다'));
    }

    const body = await c.req.json();
    const parsedBody = EarlyCloseSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(c, failure(400, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '유효하지 않은 요청입니다', parsedBody.error.format()));
    }

    const result = await earlyClosure(supabase, campaignId, advertiser.id);

    if (!result.ok) {
      logger.error('Failed to close campaign', (result as any).error);
    }

    return respond(c, result);
  });

  app.patch('/api/applications/bulk', async (c) => {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(c, failure(401, CAMPAIGN_DETAIL_ERROR.UNAUTHORIZED, '로그인이 필요합니다'));
    }

    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) {
      return respond(c, failure(403, CAMPAIGN_DETAIL_ERROR.FORBIDDEN, '광고주 권한이 필요합니다'));
    }

    const body = await c.req.json();
    const parsedBody = SelectionSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(c, failure(400, CAMPAIGN_DETAIL_ERROR.INVALID_STATUS, '유효하지 않은 요청입니다', parsedBody.error.format()));
    }

    const result = await selectInfluencers(
      supabase,
      parsedBody.data.campaign_id,
      advertiser.id,
      parsedBody.data.selected_application_ids
    );

    if (!result.ok) {
      logger.error('Failed to select influencers', (result as any).error);
    }

    return respond(c, result);
  });
};
