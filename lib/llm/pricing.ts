import type { TokenUsage } from '@/types'

/**
 * Approximate list prices in USD per 1M tokens [input, output]. These are estimates that go stale —
 * update them before quoting costs. Models not listed report tokens only (cost = null).
 */
const PRICE_PER_MTOK: Record<string, [number, number]> = {
  'claude-sonnet-4-6': [3, 15],
  'claude-haiku-4-5-20251001': [1, 5],
  'gpt-4o': [2.5, 10],
  'gpt-4o-mini': [0.15, 0.6],
  'gemini-2.0-flash': [0.1, 0.4],
  'gemini-2.5-flash': [0.3, 2.5],
  'gemini-2.5-pro': [1.25, 10],
}

export function estimateCostUsd(provider: string, model: string, usage: TokenUsage): number | null {
  if (provider === 'ollama') return 0
  const price = PRICE_PER_MTOK[model]
  if (!price) return null
  return (usage.inputTokens * price[0] + usage.outputTokens * price[1]) / 1_000_000
}
