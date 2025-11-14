import { z } from 'zod';

// Common enums
const CampaignCategorySchema = z.enum(['음식점', '카페', '뷰티', '패션', '생활', '기타']);
const CampaignStatusSchema = z.enum(['모집중', '모집종료', '선정완료']);
const ApplicationStatusSchema = z.enum(['신청완료', '선정', '반려']);

// Request schemas
export const CreateCampaignSchema = z.object({
  title: z.string().min(5, '체험단명은 5자 이상이어야 합니다').max(100),
  description: z.string().min(20, '설명은 20자 이상이어야 합니다').max(2000),
  recruitment_start_date: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, '모집 시작일은 오늘 이상이어야 합니다'),
  recruitment_end_date: z.string(),
  recruitment_count: z.number().min(1, '모집 인원은 1명 이상이어야 합니다'),
  benefits: z.string().min(1, '제공 혜택을 입력해주세요'),
  mission: z.string().min(1, '미션을 입력해주세요'),
  store_name: z.string().min(1, '업체명을 입력해주세요'),
  store_address: z.string().min(1, '주소를 입력해주세요'),
  store_phone: z.string().min(1, '연락처를 입력해주세요'),
  category: CampaignCategorySchema,
}).refine((data) => {
  const startDate = new Date(data.recruitment_start_date);
  const endDate = new Date(data.recruitment_end_date);
  return endDate >= startDate;
}, {
  message: '모집 종료일은 시작일 이후여야 합니다',
  path: ['recruitment_end_date'],
});

export const UpdateCampaignStatusSchema = z.object({
  status: CampaignStatusSchema,
});

export const BulkUpdateApplicationsSchema = z.object({
  campaign_id: z.number(),
  selected_application_ids: z.array(z.number()).min(1, '최소 1명 이상 선정해주세요'),
});

export const CampaignQuerySchema = z.object({
  advertiser_id: z.string().optional(),
  status: CampaignStatusSchema.optional(),
  sort: z.enum(['latest', 'oldest']).optional().default('latest'),
});

// Response schemas
export const CampaignResponseSchema = z.object({
  id: z.number(),
  advertiser_id: z.number(),
  title: z.string(),
  description: z.string(),
  recruitment_start_date: z.string(),
  recruitment_end_date: z.string(),
  recruitment_count: z.number(),
  benefits: z.string(),
  mission: z.string(),
  store_name: z.string(),
  store_address: z.string(),
  store_phone: z.string(),
  category: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  applicants_count: z.number().optional(),
});

export const ApplicationResponseSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  influencer_id: z.number(),
  message: z.string(),
  visit_date: z.string(),
  status: z.string(),
  applied_at: z.string(),
  influencer: z.object({
    id: z.number(),
    name: z.string(),
    channel_name: z.string(),
    channel_link: z.string(),
    followers_count: z.number(),
  }),
});

// Legacy schemas (for campaign detail page)
export const CampaignIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Campaign ID must be a numeric string'),
});

export const AdvertiserBasicSchema = z.object({
  id: z.number(),
  business_name: z.string(),
});

export const CampaignDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  recruitment_start_date: z.string(),
  recruitment_end_date: z.string(),
  recruitment_count: z.number(),
  benefits: z.string(),
  mission: z.string(),
  store_name: z.string(),
  store_address: z.string(),
  store_phone: z.string(),
  category: CampaignCategorySchema,
  status: CampaignStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  advertiser: AdvertiserBasicSchema,
});

export const CampaignDetailResponseSchema = z.object({
  campaign: CampaignDetailSchema,
  hasApplied: z.boolean().nullable(),
  isOwner: z.boolean(),
});

// Types
export type CampaignIdParams = z.infer<typeof CampaignIdParamsSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type Campaign = z.infer<typeof CampaignResponseSchema>;
export type Application = z.infer<typeof ApplicationResponseSchema>;
export type CampaignDetail = z.infer<typeof CampaignDetailSchema>;
export type CampaignDetailResponse = z.infer<typeof CampaignDetailResponseSchema>;
