import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateInfluencerInput, InfluencerResponse } from './schema';

/**
 * 인플루언서 프로필 생성
 */
export async function createInfluencerProfile(
  supabase: SupabaseClient,
  userId: string,
  input: CreateInfluencerInput
): Promise<InfluencerResponse> {
  // 중복 확인
  const { data: existing, error: checkError } = await supabase
    .from('influencers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    throw new Error('DUPLICATE_PROFILE');
  }

  // 삽입
  const { data, error } = await supabase
    .from('influencers')
    .insert({
      user_id: userId,
      name: input.name,
      birth_date: input.birth_date,
      phone: input.phone,
      channel_name: input.channel_name,
      channel_link: input.channel_link,
      followers_count: input.followers_count,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as InfluencerResponse;
}

/**
 * 인플루언서 프로필 조회 (user_id 기준)
 */
export async function getInfluencerByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<InfluencerResponse | null> {
  const { data, error } = await supabase
    .from('influencers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116: 결과 없음 (정상)
    throw error;
  }

  return data as InfluencerResponse | null;
}
