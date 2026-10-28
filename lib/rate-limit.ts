import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const RATE_LIMITS = {
  capture: { limit: 20, windowSeconds: 3600 },
  search: { limit: 60, windowSeconds: 3600 },
  embeddings: { limit: 10, windowSeconds: 3600 },
  overview: { limit: 10, windowSeconds: 3600 },
} as const

/**
 * Per-user fixed-window limit backed by Postgres (check_rate_limit RPC, keyed on auth.uid()).
 * Returns a 429 response when exceeded, else null. Fails open (with a log) if the RPC is unavailable.
 */
export async function rateLimited(
  supabase: SupabaseClient,
  bucket: keyof typeof RATE_LIMITS
): Promise<NextResponse | null> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket]
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error(`Rate limit check failed for "${bucket}" (allowing request):`, error.message)
    return null
  }
  if (data === false) {
    return NextResponse.json(
      { error: `Rate limit reached (${limit} per ${windowSeconds / 3600}h). Please try again later.` },
      { status: 429, headers: { 'Retry-After': String(windowSeconds) } }
    )
  }
  return null
}
