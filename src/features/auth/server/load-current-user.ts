import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getUserProfile } from "@/features/profile/backend/service";
import type { CurrentUserSnapshot } from "../types";

export const loadCurrentUser = async (): Promise<CurrentUserSnapshot> => {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.auth.getUser();
  const user = result.data.user;

  if (!user) {
    return { status: "unauthenticated", user: null };
  }

  const profileData = await getUserProfile(supabase, user.id);

  return {
    status: "authenticated",
    user: {
      id: user.id,
      email: user.email,
      appMetadata: user.app_metadata ?? {},
      userMetadata: user.user_metadata ?? {},
      role: profileData.role,
      hasProfile: profileData.hasProfile,
      profile: profileData.profile,
    },
  };
};
