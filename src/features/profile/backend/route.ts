import { Hono } from "hono";
import type { AppEnv } from "@/backend/hono/context";
import { success, failure, respond } from "@/backend/http/response";
import { ProfileErrorCodes } from "./error";
import { getUserProfile } from "./service";

const app = new Hono<AppEnv>();

/**
 * GET /api/profile
 * 현재 사용자의 역할 및 프로필 정보를 조회합니다.
 */
app.get("/", async (c) => {
  try {
    const supabase = c.get("supabase");

    // Get current user from Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(
        c,
        failure(401, ProfileErrorCodes.UNAUTHORIZED, "로그인이 필요합니다")
      );
    }

    // Get user profile
    const profileData = await getUserProfile(supabase, user.id);

    return respond(
      c,
      success({
        user: {
          id: user.id,
          email: user.email || "",
        },
        ...profileData,
      })
    );
  } catch (error) {
    c.get("logger").error("Failed to get profile", error);
    return respond(
      c,
      failure(500, "INTERNAL_ERROR", "프로필 조회에 실패했습니다")
    );
  }
});

export default app;
