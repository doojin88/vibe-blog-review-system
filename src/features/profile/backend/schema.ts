import { z } from "zod";

// Advertiser profile schema
export const AdvertiserProfileSchema = z.object({
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

// Influencer profile schema
export const InfluencerProfileSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  name: z.string(),
  birth_date: z.string(),
  phone: z.string(),
  channel_name: z.string(),
  channel_link: z.string(),
  followers_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Response schema for GET /api/profile
export const ProfileResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
  role: z.enum(["advertiser", "influencer"]).nullable(),
  hasProfile: z.boolean(),
  profile: z.union([AdvertiserProfileSchema, InfluencerProfileSchema]).optional(),
});

export type AdvertiserProfile = z.infer<typeof AdvertiserProfileSchema>;
export type InfluencerProfile = z.infer<typeof InfluencerProfileSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
