/**
 * Prints the pairwise-similarity distribution of the demo vault so the graph/search thresholds
 * (SEMANTIC_THRESHOLD in lib/graph/scoring.ts, SEARCH_THRESHOLD in the search route) can be sanity-checked.
 *
 *   npm run check:similarity
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_USER_ID, with the demo already seeded.
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const { data, error } = await supabase.rpc('get_pairwise_similarities', {
    p_user_id: process.env.DEMO_USER_ID, p_threshold: -1, p_per_node: 24, p_max_pairs: 10000,
  })
  if (error) throw error
  const sims = (data as { similarity: number }[]).map(r => r.similarity).sort((a, b) => a - b)
  const q = (p: number) => sims[Math.min(sims.length - 1, Math.floor(p * sims.length))]?.toFixed(3)
  console.log(`pairs: ${sims.length}  min ${q(0)}  p25 ${q(0.25)}  median ${q(0.5)}  p75 ${q(0.75)}  p90 ${q(0.9)}  max ${q(1)}`)
  for (const t of [0.2, 0.3, 0.4, 0.5, 0.6]) {
    console.log(`  similarity > ${t}: ${sims.filter(s => s > t).length} pairs`)
  }
  console.log('A usable threshold keeps each idea linked to a handful of neighbours rather than all (too low) or none (too high).')
}

main().catch(err => { console.error(err); process.exit(1) })
