/**
 * Small eval harness: runs the 20 fixed notes in evals/notes.ts through the capture pipeline
 * (candidate retrieval -> structured generation -> validation + one retry -> connection filtering)
 * for each configured provider, and writes a markdown table.
 *
 *   npm run eval
 *
 * Providers are picked up from env: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, OLLAMA_BASE_URL.
 * Override the model with EVAL_MODEL_<PROVIDER> (e.g. EVAL_MODEL_OPENAI=gpt-4o-mini). The vault the
 * notes are filed against is the demo vault (scripts/demo-data.ts); no database or embeddings are used,
 * so candidates come from the keyword fallback.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createLLMProvider } from '@/lib/llm/providers'
import { estimateCostUsd } from '@/lib/llm/pricing'
import { LLM_DEFAULT_MODELS, type LLMConfig, type LLMProviderType, type TokenUsage } from '@/types'
import { buildCapturePrompt, structureIdea } from '@/lib/vault/structure'
import { rankByKeywords, CANDIDATE_K, type Candidate } from '@/lib/vault/retrieval'
import { CaptureLLMOutputSchema, IDEA_CATEGORIES, filterConnections } from '@/lib/vault/schema'
import { DEMO_IDEAS } from '../scripts/demo-data'
import { EVAL_NOTES } from './notes'

// Local CLI: allow a localhost Ollama (the SSRF guard is for the hosted app).
process.env.ALLOW_PRIVATE_LLM_URLS ??= 'true'

const vaultSlugs = new Set(DEMO_IDEAS.map(i => i.slug))
const vault = DEMO_IDEAS.map((i, n) => ({ ...i, created_at: `2026-01-${String(n + 1).padStart(2, '0')}` }))

function configuredProviders(): LLMConfig[] {
  const out: LLMConfig[] = []
  const add = (provider: LLMProviderType, apiKey: string | undefined, extra: Partial<LLMConfig> = {}) => {
    if (!apiKey && provider !== 'ollama') return
    const model = process.env[`EVAL_MODEL_${provider.toUpperCase()}`] ?? LLM_DEFAULT_MODELS[provider]
    out.push({ provider, apiKey: apiKey ?? '', model, ...extra })
  }
  add('anthropic', process.env.ANTHROPIC_API_KEY)
  add('openai', process.env.OPENAI_API_KEY)
  add('google', process.env.GEMINI_API_KEY)
  if (process.env.OLLAMA_BASE_URL) add('ollama', '', { baseUrl: process.env.OLLAMA_BASE_URL })
  return out
}

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}%`)
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0
}

interface Row {
  provider: string; model: string; n: number
  jsonOk: number; schemaOk: number; recovered: number; failed: number
  connTotal: number; connInvalid: number
  categoryOk: number; lengthOk: number
  latencies: number[]; usage: TokenUsage; cost: number | null
}

async function evalProvider(config: LLMConfig): Promise<Row> {
  const provider = createLLMProvider(config)
  const row: Row = {
    provider: config.provider, model: config.model, n: EVAL_NOTES.length,
    jsonOk: 0, schemaOk: 0, recovered: 0, failed: 0, connTotal: 0, connInvalid: 0, categoryOk: 0, lengthOk: 0,
    latencies: [], usage: { inputTokens: 0, outputTokens: 0 }, cost: 0,
  }

  for (const note of EVAL_NOTES) {
    const candidates: Candidate[] = rankByKeywords(note, vault, CANDIDATE_K).map(i => ({
      slug: i.slug, title: i.title, category: i.category, tags: i.tags, summary: i.summary,
    }))
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
    const started = performance.now()
    let attempts: { raw: string; error: string | null }[]
    try {
      ;({ attempts } = await structureIdea(provider, buildCapturePrompt(candidates, note), {
        onUsage: u => { usage.inputTokens += u.inputTokens; usage.outputTokens += u.outputTokens },
      }))
    } catch (err) {
      attempts = (err as { attempts?: { raw: string; error: string | null }[] }).attempts ?? []
      if (attempts.length === 0) { console.error(`  request failed: ${(err as Error).message}`) }
      row.failed++
    }
    row.latencies.push(performance.now() - started)
    row.usage.inputTokens += usage.inputTokens
    row.usage.outputTokens += usage.outputTokens
    const cost = estimateCostUsd(config.provider, config.model, usage)
    row.cost = row.cost === null || cost === null ? null : row.cost + cost

    // First-attempt metrics are judged on the raw reply, before any retry.
    const first = attempts[0]
    let parsedJson: Record<string, unknown> | null = null
    if (first) {
      try { parsedJson = JSON.parse(first.raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) } catch { /* not JSON */ }
    }
    if (parsedJson && typeof parsedJson === 'object') {
      row.jsonOk++
      if (CaptureLLMOutputSchema.safeParse(parsedJson).success) row.schemaOk++
      const cat = String(parsedJson.category ?? '').trim().toLowerCase()
      if ((IDEA_CATEGORIES as readonly string[]).includes(cat)) row.categoryOk++
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      const arr = (v: unknown) => (Array.isArray(v) ? v : [])
      const withinLimits =
        str(parsedJson.title).length >= 1 && str(parsedJson.title).length <= 120 &&
        str(parsedJson.summary).length >= 1 && str(parsedJson.summary).length <= 300 &&
        str(parsedJson.content).length >= 20 && str(parsedJson.content).length <= 8000 &&
        arr(parsedJson.tags).length <= 8 && arr(parsedJson.connections).length <= 5
      if (withinLimits) row.lengthOk++
      const conns = arr(parsedJson.connections).filter((c): c is string => typeof c === 'string')
      row.connTotal += conns.length
      row.connInvalid += filterConnections(conns, vaultSlugs, str(parsedJson.slug)).dropped.length
    }
    const ok = attempts.some(a => a.error === null)
    if (ok && attempts[0]?.error !== null) row.recovered++
  }
  return row
}

function table(rows: Row[]): string {
  const head = '| Provider | Model | Valid JSON | Schema-valid (1st try) | Recovered by retry | Failed | Invalid connections | Category in enum | Within length limits | p50 latency | p95 latency | Tokens in/out per capture | Est. cost per capture |'
  const sep = '|' + ' --- |'.repeat(13)
  const lines = rows.map(r => {
    const perIn = Math.round(r.usage.inputTokens / r.n), perOut = Math.round(r.usage.outputTokens / r.n)
    const cost = r.cost === null ? 'n/a (no price listed)' : `$${(r.cost / r.n).toFixed(4)}`
    return `| ${r.provider} | ${r.model} | ${pct(r.jsonOk, r.n)} | ${pct(r.schemaOk, r.n)} | ${r.recovered} | ${r.failed} | ${pct(r.connInvalid, r.connTotal)} (${r.connInvalid}/${r.connTotal}) | ${pct(r.categoryOk, r.n)} | ${pct(r.lengthOk, r.n)} | ${(quantile(r.latencies, 0.5) / 1000).toFixed(1)}s | ${(quantile(r.latencies, 0.95) / 1000).toFixed(1)}s | ${perIn} / ${perOut} | ${cost} |`
  })
  return [head, sep, ...lines].join('\n')
}

async function main() {
  const providers = configuredProviders()
  if (providers.length === 0) {
    console.error('No provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY or OLLAMA_BASE_URL.')
    process.exit(1)
  }
  const rows: Row[] = []
  for (const config of providers) {
    console.log(`Evaluating ${config.provider} / ${config.model} on ${EVAL_NOTES.length} notes…`)
    rows.push(await evalProvider(config))
  }
  const md = `${table(rows)}\n\n_${EVAL_NOTES.length} fixed notes, run ${new Date().toISOString().slice(0, 10)}. Cost uses approximate list prices (lib/llm/pricing.ts)._\n`
  mkdirSync('evals/results', { recursive: true })
  writeFileSync('evals/results/latest.md', md)
  writeFileSync('evals/results/latest.json', JSON.stringify(rows, null, 2))
  console.log(`\n${md}\nWritten to evals/results/latest.md`)
}

main().catch(err => { console.error(err); process.exit(1) })
