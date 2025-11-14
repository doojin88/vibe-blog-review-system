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
  if (singletonApp) {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use('*', errorBoundary());
  app.use('*', withAppContext());
  app.use('*', withSupabase());

  registerExampleRoutes(app);
  app.route('/profile', profileRoute as any);
  app.route('/advertisers', advertiserRoute as any);
  app.route('/api/campaigns', campaignsRoute as any);
  registerCampaignRoutes(app);
  registerInfluencerRoutes(app);
  app.route('/applications', applicationsRoute as any);
  registerApplicationRoutes(app);
  registerCampaignDetailRoutes(app);

  singletonApp = app;

  return app;
};
