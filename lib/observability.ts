import { createServerClientInstance } from '@/lib/supabase/server'

export type UsageKind = 'capture' | 'embedding' | 'search' | 'overview'

export interface UsageRecord {
  kind: UsageKind
  provider: string
  model: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  success: boolean
  error?: string
}

/**
 * Logs one model call: a structured JSON line (shows up in Vercel logs) and a row in llm_usage for the
 * Settings summary. Never throws, and never stores prompts or note content.
 */
export async function recordUsage(userId: string, rec: UsageRecord): Promise<void> {
  const error = rec.error?.slice(0, 200)
  console.info(JSON.stringify({ event: 'llm_call', ...rec, error }))
  try {
    const supabase = await createServerClientInstance()
    const { error: insertError } = await supabase.from('llm_usage').insert({
      user_id: userId,
      kind: rec.kind,
      provider: rec.provider,
      model: rec.model,
      latency_ms: Math.round(rec.latencyMs),
      input_tokens: rec.inputTokens ?? null,
      output_tokens: rec.outputTokens ?? null,
      success: rec.success,
      error: error ?? null,
    })
    if (insertError) console.error('Usage logging failed:', insertError.message)
  } catch (err) {
    console.error('Usage logging failed:', err)
  }
}
