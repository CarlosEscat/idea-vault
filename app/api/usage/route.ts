import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { estimateCostUsd } from '@/lib/llm/pricing'

const DAYS = 30

interface UsageRow {
  kind: string; provider: string; model: string; calls: number; failures: number
  avg_latency_ms: number; input_tokens: number; output_tokens: number
}

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.rpc('usage_summary', { p_days: DAYS })
    if (error) throw error

    const rows = ((data ?? []) as UsageRow[]).map(r => ({
      kind: r.kind,
      provider: r.provider,
      model: r.model,
      calls: Number(r.calls),
      failures: Number(r.failures),
      avgLatencyMs: Math.round(r.avg_latency_ms),
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      estCostUsd: estimateCostUsd(r.provider, r.model, {
        inputTokens: Number(r.input_tokens), outputTokens: Number(r.output_tokens),
      }),
    }))
    return NextResponse.json({ data: { days: DAYS, rows } })
  } catch (err) {
    console.error('Usage summary error:', err)
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
  }
}
