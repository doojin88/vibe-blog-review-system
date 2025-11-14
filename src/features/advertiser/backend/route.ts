import { Hono } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { success, failure, respond } from '@/backend/http/response';
import { createAdvertiserSchema } from './schema';
import { createAdvertiser } from './service';
import { AdvertiserErrorCodes } from './error';

const app = new Hono<AppEnv>();

app.post('/', async (c) => {
  try {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, AdvertiserErrorCodes.UNAUTHORIZED, '로그인이 필요합니다')
      );
    }

    // 2. 요청 데이터 검증
    const body = await c.req.json();
    const parseResult = createAdvertiserSchema.safeParse(body);

    if (!parseResult.success) {
      return respond(
        c,
        failure(
          400,
          AdvertiserErrorCodes.VALIDATION_ERROR,
          '입력 데이터가 올바르지 않습니다',
          parseResult.error.flatten().fieldErrors
        )
      );
    }

    // 3. 광고주 정보 생성
    const advertiser = await createAdvertiser(supabase, user.id, parseResult.data);

    return respond(c, success(advertiser, 201));
  } catch (error) {
    const logger = c.get('logger');
    logger.error('Failed to create advertiser', error);

    if (error instanceof Error && error.message === 'ADVERTISER_ALREADY_EXISTS') {
      return respond(
        c,
        failure(409, AdvertiserErrorCodes.ALREADY_EXISTS, '이미 등록된 정보가 있습니다')
      );
    }

    return respond(
      c,
      failure(500, AdvertiserErrorCodes.INTERNAL_ERROR, '일시적인 오류가 발생했습니다')
    );
  }
});

export default app;
