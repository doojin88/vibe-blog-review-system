import { Hono } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { success, failure, respond } from '@/backend/http/response';
import { ApplicationErrorCodes } from './error';
import { GetApplicationsQuerySchema } from './schema';
import { getApplications, getInfluencerId } from './service';

const app = new Hono<AppEnv>();

app.get('/', async (c) => {
  try {
    const supabase = c.get('supabase');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(
          401,
          ApplicationErrorCodes.UNAUTHORIZED,
          '로그인이 필요합니다'
        )
      );
    }

    const influencerId = await getInfluencerId(supabase, user.id);

    if (!influencerId) {
      return respond(
        c,
        failure(
          403,
          ApplicationErrorCodes.PROFILE_NOT_FOUND,
          '인플루언서 정보를 먼저 등록해주세요'
        )
      );
    }

    const rawQuery = c.req.query();
    const parseResult = GetApplicationsQuerySchema.safeParse(rawQuery);

    if (!parseResult.success) {
      return respond(
        c,
        failure(400, 'INVALID_REQUEST', '잘못된 요청입니다', {
          errors: parseResult.error.errors,
        })
      );
    }

    const query = parseResult.data;

    const result = await getApplications(supabase, influencerId, query);

    return respond(c, success(result));
  } catch (error) {
    c.get('logger').error('Failed to get applications', error);
    return respond(
      c,
      failure(
        500,
        ApplicationErrorCodes.INTERNAL_ERROR,
        '지원 목록 조회에 실패했습니다'
      )
    );
  }
});

export default app;
