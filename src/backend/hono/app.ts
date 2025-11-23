import { Hono } from 'hono';
import { errorBoundary } from '@/backend/middleware/error';
import { withAppContext } from '@/backend/middleware/context';
import { withSupabase } from '@/backend/middleware/supabase';
import { registerExampleRoutes } from '@/features/example/backend/route';
import profileRoute from '@/features/profile/backend/route';
import advertiserRoute from '@/features/advertiser/backend/route';
import campaignsRoute from '@/features/campaigns/backend/route';
import { registerCampaignRoutes } from '@/features/campaign/backend/route';
import { registerInfluencerRoutes } from '@/features/influencers/backend/route';
import applicationsRoute from '@/features/applications/backend/route';
import { registerApplicationRoutes } from '@/features/application/backend/route';
import { registerCampaignDetailRoutes } from '@/features/campaign-detail/backend/route';
import type { AppEnv } from '@/backend/hono/context';

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  // 개발 모드에서는 싱글톤을 사용하지 않아 HMR이 제대로 작동하도록 함
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && singletonApp) {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use('*', errorBoundary());
  app.use('*', withAppContext());
  app.use('*', withSupabase());

  registerExampleRoutes(app);
  
  // 더 구체적인 경로를 먼저 등록
  registerCampaignDetailRoutes(app);
  registerCampaignRoutes(app);
  
  // 기본 경로 등록
  app.route('/profile', profileRoute as any);
  app.route('/advertisers', advertiserRoute as any);
  app.route('/campaigns', campaignsRoute as any);
  registerInfluencerRoutes(app);
  app.route('/applications', applicationsRoute as any);
  registerApplicationRoutes(app);

  if (!isDev) {
    singletonApp = app;
  }

  return app;
};
