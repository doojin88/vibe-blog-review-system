import { Hono } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { success, failure, respond } from '@/backend/http/response';
import { createInfluencerSchema } from './schema';
import { createInfluencerProfile } from './service';
import { InfluencerErrorCodes } from './error';

const app = new Hono<AppEnv>();

/**
 * POST /api/influencers
 * 인플루언서 프로필 생성
 */
app.post('/', async (c) => {
  try {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, InfluencerErrorCodes.UNAUTHORIZED, '로그인이 필요합니다')
      );
    }

    // 2. 요청 데이터 파싱 및 검증
    const body = await c.req.json();
    const parseResult = createInfluencerSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return respond(
        c,
        failure(
          400,
          InfluencerErrorCodes.VALIDATION_ERROR,
          '입력 데이터가 유효하지 않습니다',
          errors
        )
      );
    }

    // 3. 프로필 생성
    const profile = await createInfluencerProfile(
      supabase,
      user.id,
      parseResult.data
    );

    logger.info('Influencer profile created', { userId: user.id, profileId: profile.id });

    return respond(
      c,
      success(profile, 200)
    );
  } catch (error) {
    const logger = c.get('logger');
    logger.error('Failed to create influencer profile', error);

    // 중복 등록 에러
    if (error instanceof Error && error.message === 'DUPLICATE_PROFILE') {
      return respond(
        c,
        failure(409, InfluencerErrorCodes.DUPLICATE_PROFILE, '이미 등록된 정보가 있습니다')
      );
    }

    return respond(
      c,
      failure(500, InfluencerErrorCodes.INTERNAL_ERROR, '프로필 등록에 실패했습니다')
    );
  }
});

export const registerInfluencerRoutes = (mainApp: any) => {
  mainApp.route('/influencers', app);
};

export default app;
