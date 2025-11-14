import { z } from 'zod';

export const CampaignDetailSchema = z.object({
  campaign: z.object({
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
    category: z.enum(['음식점', '카페', '뷰티', '패션', '생활', '기타']),
    status: z.enum(['모집중', '모집종료', '선정완료']),
    created_at: z.string(),
    updated_at: z.string(),
    advertiser: z.object({
      id: z.number(),
      business_name: z.string(),
    }),
  }),
});

export const ApplicantsSchema = z.object({
  applications: z.array(
    z.object({
      id: z.number(),
      message: z.string(),
      visit_date: z.string(),
      status: z.enum(['신청완료', '선정', '반려']),
      applied_at: z.string(),
      influencer: z.object({
        id: z.number(),
        name: z.string(),
        channel_name: z.string(),
        channel_link: z.string(),
        followers_count: z.number(),
      }),
    })
  ),
});

export const EarlyCloseSchema = z.object({
  status: z.literal('모집종료'),
});

export const SelectionSchema = z.object({
  campaign_id: z.number().int().positive(),
  selected_application_ids: z.array(z.number().int().positive()).min(1),
});

export const ApplicantsSortSchema = z.enum(['latest', 'oldest']).optional();
export const ApplicationsStatusSchema = z.enum(['신청완료', '선정', '반려']).optional();

export type CampaignDetail = z.infer<typeof CampaignDetailSchema>['campaign'];
export type Application = z.infer<typeof ApplicantsSchema>['applications'][number];
export type EarlyCloseRequest = z.infer<typeof EarlyCloseSchema>;
export type SelectionRequest = z.infer<typeof SelectionSchema>;
