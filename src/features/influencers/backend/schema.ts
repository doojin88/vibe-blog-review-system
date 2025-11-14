import { z } from 'zod';
import { subYears } from 'date-fns';

// 만 14세 이상 검증 헬퍼
const isAtLeast14YearsOld = (birthDate: string) => {
  const date = new Date(birthDate);
  const minAge = subYears(new Date(), 14);
  return date <= minAge;
};

// 휴대폰번호 형식 검증 (01XXXXXXXXX)
const phoneRegex = /^01[0-9]{8,9}$/;

// URL 형식 검증
const urlRegex = /^https?:\/\/.+/;

export const createInfluencerSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)')
    .refine(isAtLeast14YearsOld, '만 14세 이상만 가입할 수 있습니다'),
  phone: z.string()
    .regex(phoneRegex, '올바른 휴대폰번호 형식을 입력해주세요 (예: 01012345678)'),
  channel_name: z.string().min(1, 'SNS 채널명을 입력해주세요'),
  channel_link: z.string()
    .regex(urlRegex, '올바른 URL 형식을 입력해주세요 (예: https://...)'),
  followers_count: z.number()
    .int('팔로워 수는 정수여야 합니다')
    .min(0, '팔로워 수는 0 이상이어야 합니다'),
});

export type CreateInfluencerInput = z.infer<typeof createInfluencerSchema>;

export const influencerResponseSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  name: z.string(),
  birth_date: z.string(),
  phone: z.string(),
  channel_name: z.string(),
  channel_link: z.string(),
  followers_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type InfluencerResponse = z.infer<typeof influencerResponseSchema>;
