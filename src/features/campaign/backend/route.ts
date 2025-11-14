import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { GetCampaignsQuerySchema } from './schema';
import { getCampaigns } from './service';
import { campaignErrorCodes } from './error';

export const registerCampaignRoutes = (app: Hono<AppEnv>) => {
  app.get('/campaigns', async (c) => {
    const queryParams = c.req.query();
    const parsedQuery = GetCampaignsQuerySchema.safeParse(queryParams);

    if (!parsedQuery.success) {
      return respond(
        c,
        failure(
          400,
          campaignErrorCodes.invalidQuery,
          '잘못된 쿼리 파라미터입니다',
          parsedQuery.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await getCampaigns(supabase, parsedQuery.data);

    if (!result.ok) {
      logger.error('Failed to fetch campaigns', {
        code: (result as any).error?.code,
        message: (result as any).error?.message,
      });
    }

    return respond(c, result);
  });
};
