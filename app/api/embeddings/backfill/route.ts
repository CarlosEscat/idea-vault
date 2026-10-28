import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { createEmbeddingsProvider, EMBEDDING_DIM } from '@/lib/embeddings/providers'
import { getEmbeddingsConfig, getEmbeddingStatus } from '@/lib/embeddings/config'
import type { IdeaRow } from '@/types'
import { demoWriteBlocked } from '@/lib/auth/demo'
import { rateLimited } from '@/lib/rate-limit'

export const maxDuration = 300

/** Ideas embedded per request; the client calls again while `remaining` > 0. */
const BATCH_SIZE = 50

/**
 * Embeds ideas that have no vector OR whose vector came from a different embeddings model than the
 * one currently configured (so a model switch re-embeds everything, and search never mixes models).
 */
export async function POST() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = demoWriteBlocked(user)
    if (blocked) return blocked

    const limited = await rateLimited(supabase, 'embeddings')
    if (limited) return limited

    const config = await getEmbeddingsConfig(supabase, user.id)
    if (!config) {
      return NextResponse.json(
        { error: 'No embeddings provider configured — set one up in Settings first' },
        { status: 400 }
      )
    }
    const provider = createEmbeddingsProvider(config)

    const { data: pending, error: pendingError } = await supabase
      .rpc('ideas_needing_embedding', { p_model: config.model, p_limit: BATCH_SIZE })
    if (pendingError) throw pendingError
    const ids = ((pending ?? []) as { id: string }[]).map(r => r.id)

    const { data: rows, error: fetchError } = await supabase
      .from('ideas')
      .select('id, title, summary_encrypted, content_encrypted')
      .eq('user_id', user.id)
      .in('id', ids)
    if (fetchError) throw fetchError

    const ideas = (rows ?? []) as Pick<IdeaRow, 'id' | 'title' | 'summary_encrypted' | 'content_encrypted'>[]
    let done = 0
    let failed = 0

    for (const idea of ideas) {
      try {
        const summary = decrypt(idea.summary_encrypted, user.id)
        const content = decrypt(idea.content_encrypted, user.id)
        const embedding = await provider.embed(`${idea.title}\n\n${summary}\n\n${content}`)
        if (embedding.length !== EMBEDDING_DIM) {
          throw new Error(`${config.model} returned ${embedding.length} dims, expected ${EMBEDDING_DIM}`)
        }

        const { error } = await supabase
          .from('ideas')
          .update({
            embedding: `[${embedding.join(',')}]`,
            embedding_model: config.model,
            embedding_dim: embedding.length,
          })
          .eq('id', idea.id)
        if (error) throw error
        done++
      } catch (err) {
        console.error(`Backfill failed for idea ${idea.id}:`, err)
        failed++
      }
    }

    const status = await getEmbeddingStatus(supabase, config.model)
    const remaining = status ? status.stale + status.missing : 0
    return NextResponse.json({ data: { total: ideas.length, done, failed, remaining } })
  } catch (err) {
    console.error('Backfill error:', err)
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 })
  }
}
