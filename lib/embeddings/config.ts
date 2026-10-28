import type { SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/encryption'
import type { EmbeddingsConfig } from '@/types'

export async function getEmbeddingsConfig(supabase: SupabaseClient, userId: string): Promise<EmbeddingsConfig | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('embeddings_config_encrypted')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.embeddings_config_encrypted ? JSON.parse(decrypt(data.embeddings_config_encrypted, userId)) : null
}

export interface EmbeddingStatus {
  total: number
  current: number
  stale: number
  missing: number
}

/** Counts ideas whose vector is current, from a different (or unknown) model, or absent. */
export async function getEmbeddingStatus(supabase: SupabaseClient, model: string): Promise<EmbeddingStatus | null> {
  const { data, error } = await supabase.rpc('embedding_status', { p_model: model })
  if (error || !data?.[0]) return null
  const r = data[0] as Record<keyof EmbeddingStatus, number | string>
  return { total: Number(r.total), current: Number(r.current), stale: Number(r.stale), missing: Number(r.missing) }
}
