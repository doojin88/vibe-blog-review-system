import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateAdvertiserInput, Advertiser } from './schema';

export async function createAdvertiser(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAdvertiserInput
): Promise<Advertiser> {
  // 1. 중복 등록 확인
  const { data: existingAdvertiser, error: checkError } = await supabase
    .from('advertisers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (existingAdvertiser) {
    throw new Error('ADVERTISER_ALREADY_EXISTS');
  }

  // 2. 광고주 정보 삽입
  const { data, error } = await supabase
    .from('advertisers')
    .insert({
      user_id: userId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Advertiser;
}
