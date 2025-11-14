import type { SupabaseClient } from '@supabase/supabase-js';
import type { GetApplicationsQuery, ApplicationItem } from './schema';

export async function getApplications(
  supabase: SupabaseClient,
  influencerId: number,
  query: GetApplicationsQuery
): Promise<{ applications: ApplicationItem[]; total: number }> {
  const { status, sort, limit, offset } = query;

  let queryBuilder = supabase
    .from('applications')
    .select(
      `
      id,
      campaign_id,
      message,
      visit_date,
      status,
      applied_at,
      campaigns:campaign_id (
        title,
        status
      )
    `,
      { count: 'exact' }
    )
    .eq('influencer_id', influencerId);

  if (status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  if (sort === 'latest') {
    queryBuilder = queryBuilder.order('applied_at', { ascending: false });
  } else {
    queryBuilder = queryBuilder.order('applied_at', { ascending: true });
  }

  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw error;
  }

  const applications: ApplicationItem[] = (data || []).map((item) => ({
    id: item.id,
    campaignId: item.campaign_id,
    campaignTitle: (item.campaigns as any)?.title || '',
    campaignStatus: (item.campaigns as any)?.status || '모집중',
    status: item.status,
    message: item.message,
    visitDate: item.visit_date,
    appliedAt: item.applied_at,
  }));

  return {
    applications,
    total: count || 0,
  };
}

export async function getInfluencerId(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('influencers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data?.id || null;
}
