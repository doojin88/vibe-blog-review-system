import { z } from 'zod';

export const GetApplicationsQuerySchema = z.object({
  status: z
    .enum(['all', '신청완료', '선정', '반려'])
    .optional()
    .default('all'),
  sort: z.enum(['latest', 'oldest']).optional().default('latest'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type GetApplicationsQuery = z.infer<typeof GetApplicationsQuerySchema>;

export const ApplicationItemSchema = z.object({
  id: z.number(),
  campaignId: z.number(),
  campaignTitle: z.string(),
  campaignStatus: z.enum(['모집중', '모집종료', '선정완료']),
  status: z.enum(['신청완료', '선정', '반려']),
  message: z.string(),
  visitDate: z.string(),
  appliedAt: z.string(),
});

export type ApplicationItem = z.infer<typeof ApplicationItemSchema>;

export const GetApplicationsResponseSchema = z.object({
  applications: z.array(ApplicationItemSchema),
  total: z.number(),
});

export type GetApplicationsResponse = z.infer<
  typeof GetApplicationsResponseSchema
>;
