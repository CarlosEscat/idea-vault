/**
 * Seeds the shared read-only demo vault (25 ideas, embeddings pre-computed).
 *
 *   npm run seed:demo
 *
 * Needs (e.g. in .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_SECRET,
 * DEMO_USER_EMAIL, DEMO_USER_PASSWORD, SEED_EMBEDDINGS_PROVIDER, SEED_EMBEDDINGS_MODEL, SEED_EMBEDDINGS_API_KEY.
 * Re-running replaces the demo user's ideas. Run it with the embeddings model you want the demo to use.
 */
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/encryption'
import { createEmbeddingsProvider, EMBEDDING_DIM } from '@/lib/embeddings/providers'
import { buildIndexMd } from '@/lib/vault/index-md'
import type { EmbeddingsProviderType } from '@/types'
import { DEMO_IDEAS } from './demo-data'

function need(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

const OVERVIEW_MD = `# Overview

This demo vault is a small knowledge base about building trustworthy AI products. Three themes recur:

- **Grounding and reliability** — retrieval before generation, schema-validated output, evals on a fixed set, and treating model output as untrusted.
- **Shipping honestly** — demo-first onboarding, candid security claims, and portfolio work that can be reviewed in minutes.
- **Sustainable habits** — deep-work blocks, weekly reviews, sleep and compounding, which make the technical work possible.

Open the graph to see how these clusters connect, and try a search such as "how do I keep model output safe".`

async function main() {
  const supabase = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = need('DEMO_USER_EMAIL')
  const password = need('DEMO_USER_PASSWORD')
  need('ENCRYPTION_SECRET')

  // Find or create the demo user; app_metadata.is_demo can only be set with the service role.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  let user = list.users.find(u => u.email === email)
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, { password, app_metadata: { is_demo: true } })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, app_metadata: { is_demo: true },
    })
    if (error) throw error
    user = data.user
  }
  const userId = user.id

  const provider = createEmbeddingsProvider({
    provider: need('SEED_EMBEDDINGS_PROVIDER') as EmbeddingsProviderType,
    model: need('SEED_EMBEDDINGS_MODEL'),
    apiKey: process.env.SEED_EMBEDDINGS_API_KEY,
  })
  const model = need('SEED_EMBEDDINGS_MODEL')

  const rows = []
  for (const idea of DEMO_IDEAS) {
    const vector = await provider.embed(`${idea.title}\n\n${idea.summary}\n\n${idea.content}`)
    if (vector.length !== EMBEDDING_DIM) throw new Error(`${model} returned ${vector.length} dims, expected ${EMBEDDING_DIM}`)
    rows.push({
      user_id: userId,
      slug: idea.slug,
      title: idea.title,
      content_encrypted: encrypt(idea.content, userId),
      summary_encrypted: encrypt(idea.summary, userId),
      category: idea.category,
      tags: idea.tags,
      connections: idea.connections,
      embedding: `[${vector.join(',')}]`,
      embedding_model: model,
      embedding_dim: vector.length,
    })
    console.log(`embedded ${idea.slug}`)
  }

  await supabase.from('ideas').delete().eq('user_id', userId)
  const { error: insertError } = await supabase.from('ideas').insert(rows)
  if (insertError) throw insertError

  const { error: metaError } = await supabase.from('vault_meta').upsert({
    user_id: userId,
    index_md_encrypted: encrypt(buildIndexMd(DEMO_IDEAS.map(i => ({ slug: i.slug, category: i.category, summary: i.summary }))), userId),
    overview_md_encrypted: encrypt(OVERVIEW_MD, userId),
    updated_at: new Date().toISOString(),
  })
  if (metaError) throw metaError

  console.log(`Seeded ${rows.length} ideas for demo user ${userId}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
