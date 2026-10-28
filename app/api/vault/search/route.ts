import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { createEmbeddingsProvider } from '@/lib/embeddings/providers'
import { getEmbeddingsConfig, getEmbeddingStatus } from '@/lib/embeddings/config'
import { isDemoUser } from '@/lib/auth/demo'
import { recordUsage } from '@/lib/observability'
import { rateLimited } from '@/lib/rate-limit'
import { getUserIdeas } from '@/lib/vault'
import { keywordSearch } from '@/lib/vault/retrieval'
import type { IdeaRow } from '@/types'

export const maxDuration = 30

const SEARCH_LIMIT = 12
const SEARCH_THRESHOLD = 0.3

interface Match {
  id: string
  similarity: number
  text_match?: boolean
  score?: number
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await rateLimited(supabase, 'search')
    if (limited) return limited

    const { query, mode = 'semantic' } = await req.json() as { query: string; mode?: 'semantic' | 'hybrid' }
    if (!query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const config = await getEmbeddingsConfig(supabase, user.id)

    // The shared demo account has no API key: fall back to keyword search over the seeded ideas.
    if (!config && isDemoUser(user)) {
      const ideas = await getUserIdeas(user.id)
      return NextResponse.json({ data: keywordSearch(query, ideas), meta: { mode: 'keyword' } })
    }
    if (!config) {
      return NextResponse.json({ error: 'No embeddings provider configured' }, { status: 400 })
    }

    const embedStarted = performance.now()
    let queryEmbedding: number[]
    try {
      queryEmbedding = await createEmbeddingsProvider(config).embed(query.trim())
    } catch (err) {
      await recordUsage(user.id, { kind: 'search', provider: config.provider, model: config.model, latencyMs: performance.now() - embedStarted, success: false, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
    await recordUsage(user.id, { kind: 'search', provider: config.provider, model: config.model, latencyMs: performance.now() - embedStarted, success: true })
    const vector = `[${queryEmbedding.join(',')}]`

    // Only vectors produced by the CURRENT embeddings model are compared (p_model).
    const { data: matches, error: rpcError } = (mode === 'hybrid'
      ? await supabase.rpc('search_ideas_hybrid', {
          p_user_id: user.id, p_query_embedding: vector, p_query_text: query.trim(),
          p_limit: SEARCH_LIMIT, p_threshold: SEARCH_THRESHOLD, p_model: config.model,
        })
      : await supabase.rpc('search_ideas', {
          p_user_id: user.id, p_query_embedding: vector,
          p_limit: SEARCH_LIMIT, p_threshold: SEARCH_THRESHOLD, p_model: config.model,
        })) as { data: Match[] | null; error: unknown }
    if (rpcError) throw rpcError

    const status = await getEmbeddingStatus(supabase, config.model)
    const meta = { mode, stale: status?.stale ?? 0, missing: status?.missing ?? 0, model: config.model }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ data: [], meta })
    }

    const matchById = new Map(matches.map(m => [m.id, m]))

    const { data: rows, error: fetchError } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .in('id', matches.map(m => m.id))
    if (fetchError) throw fetchError

    const ideas = (rows as IdeaRow[]).map(row => ({
      id: row.id,
      user_id: row.user_id,
      slug: row.slug,
      title: row.title,
      content: decrypt(row.content_encrypted, user.id),
      summary: decrypt(row.summary_encrypted, user.id),
      category: row.category,
      tags: row.tags,
      connections: row.connections,
      is_favorite: row.is_favorite,
      created_at: row.created_at,
      updated_at: row.updated_at,
      similarity: matchById.get(row.id)?.similarity ?? 0,
      text_match: matchById.get(row.id)?.text_match ?? false,
      score: matchById.get(row.id)?.score ?? matchById.get(row.id)?.similarity ?? 0,
    }))
    ideas.sort((a, b) => b.score - a.score)

    return NextResponse.json({ data: ideas, meta })
  } catch (err) {
    console.error('Vault search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
