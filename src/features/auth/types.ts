import type { AdvertiserProfile, InfluencerProfile } from "@/features/profile/lib/dto";

export type CurrentUser = {
  id: string;
  email: string | null;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
  role: "advertiser" | "influencer" | null;
  hasProfile: boolean;
  profile?: AdvertiserProfile | InfluencerProfile;
};

export type CurrentUserSnapshot =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unauthenticated"; user: null }
  | { status: "loading"; user: CurrentUser | null };

export type CurrentUserContextValue = CurrentUserSnapshot & {
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
};
