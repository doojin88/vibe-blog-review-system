import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { CreateApplicationSchema } from './schema';
import { createApplication } from './service';
import { ApplicationErrorCodes } from './error';

export const registerApplicationRoutes = (app: Hono<AppEnv>) => {
  app.post('/applications', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    // 1. 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, ApplicationErrorCodes.UNAUTHORIZED, '로그인이 필요합니다')
      );
    }

    // 2. 요청 바디 파싱 및 검증
    const body = await c.req.json();
    const parsedBody = CreateApplicationSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          ApplicationErrorCodes.INVALID_REQUEST,
          '요청 데이터가 유효하지 않습니다',
          parsedBody.error.format()
        )
      );
    }

    // 3. 서비스 레이어 호출
    const result = await createApplication(supabase, user.id, parsedBody.data);

    if (!result.ok) {
      logger.error('Failed to create application', (result as any).error);
    }

    return respond(c, result);
  });
};
