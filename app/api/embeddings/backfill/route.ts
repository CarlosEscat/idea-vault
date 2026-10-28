import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { createEmbeddingsProvider } from '@/lib/embeddings/providers'
import type { EmbeddingsConfig, IdeaRow } from '@/types'
import { demoWriteBlocked } from '@/lib/auth/demo'
import { rateLimited } from '@/lib/rate-limit'

export const maxDuration = 300

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

    // Load embeddings config
    const { data: settings } = await supabase
      .from('user_settings')
      .select('embeddings_config_encrypted')
      .eq('user_id', user.id)
      .single()

    if (!settings?.embeddings_config_encrypted) {
      return NextResponse.json(
        { error: 'No embeddings provider configured — set one up in Settings first' },
        { status: 400 }
      )
    }

    const config: EmbeddingsConfig = JSON.parse(decrypt(settings.embeddings_config_encrypted, user.id))
    const provider = createEmbeddingsProvider(config)

    // Fetch all ideas without embeddings
    const { data: rows, error: fetchError } = await supabase
      .from('ideas')
      .select('id, title, summary_encrypted, content_encrypted')
      .eq('user_id', user.id)
      .is('embedding', null)

    if (fetchError) throw fetchError

    const ideas = (rows ?? []) as Pick<IdeaRow, 'id' | 'title' | 'summary_encrypted' | 'content_encrypted'>[]
    const total = ideas.length
    let done = 0
    let failed = 0

    for (const idea of ideas) {
      try {
        const summary = decrypt(idea.summary_encrypted, user.id)
        const content = decrypt(idea.content_encrypted, user.id)
        const text = `${idea.title}\n\n${summary}\n\n${content}`

        const embedding = await provider.embed(text)

        await supabase
          .from('ideas')
          .update({
            embedding: `[${embedding.join(',')}]`,
            embedding_model: config.model,
            embedding_dim: embedding.length,
          })
          .eq('id', idea.id)

        done++
      } catch (err) {
        console.error(`Backfill failed for idea ${idea.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({ data: { total, done, failed } })
  } catch (err) {
    console.error('Backfill error:', err)
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 })
  }
}
