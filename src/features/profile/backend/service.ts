import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileResponse, AdvertiserProfile, InfluencerProfile } from "./schema";

/**
 * 사용자의 역할 및 프로필 정보를 조회합니다.
 * @param supabase - Supabase 서버 클라이언트
 * @param userId - 사용자 ID
 * @returns 역할, 프로필 등록 여부, 프로필 정보
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
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

  // 3. No profile found
  return {
    role: null,
    hasProfile: false,
  };
}
