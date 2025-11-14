import { z } from 'zod';

/**
 * 지원서 생성 요청 스키마
 */
export const CreateApplicationSchema = z.object({
  campaign_id: z.number().int().positive(),
  message: z
    .string()
    .min(10, '각오 한마디는 10자 이상이어야 합니다')
    .max(500, '각오 한마디는 500자 이하여야 합니다'),
  visit_date: z.string().refine(
    (date) => {
      const visitDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return visitDate >= today;
    },
    { message: '방문 예정일은 오늘 이후 날짜를 선택해주세요' }
  ),
});

export type CreateApplicationRequest = z.infer<typeof CreateApplicationSchema>;

/**
 * 지원서 응답 스키마
 */
export const ApplicationResponseSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  influencer_id: z.number(),
  message: z.string(),
  visit_date: z.string(),
  status: z.enum(['신청완료', '선정', '반려']),
  applied_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ApplicationResponse = z.infer<typeof ApplicationResponseSchema>;
