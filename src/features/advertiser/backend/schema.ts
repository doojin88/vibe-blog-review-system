import { z } from 'zod';

// 휴대폰번호 형식: 010-XXXX-XXXX
const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

// 사업자등록번호 형식: XXX-XX-XXXXX
const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/;

export const createAdvertiserSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  birth_date: z.string().refine(
    (date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      // 정확한 만 나이 계산
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)
        ? age - 1
        : age;

      return actualAge >= 19;
    },
    { message: '광고주는 만 19세 이상만 가입할 수 있습니다' }
  ),
  phone: z.string().regex(PHONE_REGEX, '휴대폰번호는 010-XXXX-XXXX 형식으로 입력해주세요'),
  business_name: z.string().min(1, '업체명을 입력해주세요'),
  address: z.string().min(1, '주소를 입력해주세요'),
  business_phone: z.string().min(1, '업장 전화번호를 입력해주세요'),
  business_registration_number: z.string().regex(
    BUSINESS_NUMBER_REGEX,
    '사업자등록번호는 XXX-XX-XXXXX 형식으로 입력해주세요'
  ),
  representative_name: z.string().min(1, '대표자명을 입력해주세요'),
});

export type CreateAdvertiserInput = z.infer<typeof createAdvertiserSchema>;

export const advertiserSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  name: z.string(),
  birth_date: z.string(),
  phone: z.string(),
  business_name: z.string(),
  address: z.string(),
  business_phone: z.string(),
  business_registration_number: z.string(),
  representative_name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Advertiser = z.infer<typeof advertiserSchema>;
