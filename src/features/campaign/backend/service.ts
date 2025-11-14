import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import {
  CampaignRowSchema,
  CampaignListItemSchema,
  GetCampaignsResponseSchema,
  type GetCampaignsQuery,
  type GetCampaignsResponse,
  type CampaignRow,
} from './schema';
import { campaignErrorCodes, type CampaignServiceError } from './error';

const CAMPAIGNS_TABLE = 'campaigns';
const ADVERTISERS_TABLE = 'advertisers';

export const getCampaigns = async (
  client: SupabaseClient,
  query: GetCampaignsQuery,
): Promise<
  HandlerResult<GetCampaignsResponse, CampaignServiceError, unknown>
> => {
  const { category, status, sort, page, limit } = query;
  const offset = (page - 1) * limit;

  let queryBuilder = client
    .from(CAMPAIGNS_TABLE)
    .select(
      `
      id,
      title,
      recruitment_count,
      recruitment_end_date,
      status,
      category,
      created_at,
      ${ADVERTISERS_TABLE}!inner(business_name)
    `,
      { count: 'exact' },
    );

  if (status) {
    queryBuilder = queryBuilder.eq('status', status);
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  if (sort === 'latest') {
    queryBuilder = queryBuilder.order('created_at', { ascending: false });
  } else if (sort === 'deadline') {
    queryBuilder = queryBuilder.order('recruitment_end_date', {
      ascending: true,
    });
  }

  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    return failure(500, campaignErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return success({
      campaigns: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    });
  }

  const campaigns = data.map((row: any) => {
    const flatRow: CampaignRow = {
      id: row.id,
      title: row.title,
      recruitment_count: row.recruitment_count,
      recruitment_end_date: row.recruitment_end_date,
      status: row.status,
      category: row.category,
      created_at: row.created_at,
      business_name: row.advertisers.business_name,
    };

    const rowParse = CampaignRowSchema.safeParse(flatRow);

    if (!rowParse.success) {
      throw new Error('Campaign row failed validation');
    }

    const mapped = {
      id: rowParse.data.id,
      title: rowParse.data.title,
      recruitmentCount: rowParse.data.recruitment_count,
      recruitmentEndDate: rowParse.data.recruitment_end_date,
      status: rowParse.data.status,
      category: rowParse.data.category,
      storeName: rowParse.data.business_name,
      createdAt: rowParse.data.created_at,
    };

    const parsed = CampaignListItemSchema.safeParse(mapped);

    if (!parsed.success) {
      throw new Error('Campaign payload failed validation');
    }

    return parsed.data;
  });

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const response: GetCampaignsResponse = {
    campaigns,
    total,
    page,
    limit,
    totalPages,
  };

  const responseParse = GetCampaignsResponseSchema.safeParse(response);

  if (!responseParse.success) {
    return failure(
      500,
      campaignErrorCodes.validationError,
      'Campaign response failed validation',
      responseParse.error.format(),
    );
  }

  return success(responseParse.data);
};
