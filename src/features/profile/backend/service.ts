import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileResponse, AdvertiserProfile, InfluencerProfile } from "./schema";

/**
 * 사용자의 역할 및 프로필 정보를 조회합니다.
 * @param supabase - Supabase 서버 클라이언트
 * @param userId - 사용자 ID
 * @param userMetadata - 사용자 메타데이터 (선택적, 역할 정보 확인용)
 * @returns 역할, 프로필 등록 여부, 프로필 정보
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
  userMetadata?: Record<string, unknown>
): Promise<Omit<ProfileResponse, "user">> {
  // 1. Check if user has an advertiser profile
  const { data: advertiserData, error: advertiserError } = await supabase
    .from("advertisers")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (advertiserError && advertiserError.code !== "PGRST116") {
    throw advertiserError;
  }

  if (advertiserData) {
    return {
      role: "advertiser",
      hasProfile: true,
      profile: advertiserData as AdvertiserProfile,
    };
  }

  // 2. Check if user has an influencer profile
  const { data: influencerData, error: influencerError } = await supabase
    .from("influencers")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (influencerError && influencerError.code !== "PGRST116") {
    throw influencerError;
  }

  if (influencerData) {
    return {
      role: "influencer",
      hasProfile: true,
      profile: influencerData as InfluencerProfile,
    };
  }

  // 3. No profile found - check user_metadata for selected role
  const selectedRole = userMetadata?.role as "advertiser" | "influencer" | undefined;
  
  if (selectedRole === "advertiser" || selectedRole === "influencer") {
    return {
      role: selectedRole,
      hasProfile: false,
    };
  }

  // 4. No role information found
  return {
    role: null,
    hasProfile: false,
  };
}
