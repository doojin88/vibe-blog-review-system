import { z } from 'zod';

export const CampaignStatusEnum = z.enum([
  '모집중',
  '모집종료',
  '선정완료',
]);
export const CampaignCategoryEnum = z.enum([
  '음식점',
  '카페',
  '뷰티',
  '패션',
  '생활',
  '기타',
]);
export const SortEnum = z.enum(['latest', 'deadline']);

export const GetCampaignsQuerySchema = z.object({
  category: CampaignCategoryEnum.optional(),
  status: CampaignStatusEnum.optional().default('모집중'),
  sort: SortEnum.optional().default('latest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),
});

export type GetCampaignsQuery = z.infer<typeof GetCampaignsQuerySchema>;

export const CampaignRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  recruitment_count: z.number(),
  recruitment_end_date: z.string(),
  status: CampaignStatusEnum,
  category: CampaignCategoryEnum,
  created_at: z.string(),
  business_name: z.string(),
});

export type CampaignRow = z.infer<typeof CampaignRowSchema>;

export const CampaignListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  recruitmentCount: z.number(),
  recruitmentEndDate: z.string(),
  status: CampaignStatusEnum,
  category: CampaignCategoryEnum,
  storeName: z.string(),
  createdAt: z.string(),
});

export type CampaignListItem = z.infer<typeof CampaignListItemSchema>;

export const GetCampaignsResponseSchema = z.object({
  campaigns: z.array(CampaignListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type GetCampaignsResponse = z.infer<typeof GetCampaignsResponseSchema>;
