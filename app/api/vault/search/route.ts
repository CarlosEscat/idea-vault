import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { createEmbeddingsProvider } from '@/lib/embeddings/providers'
import type { EmbeddingsConfig, IdeaRow } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query } = await req.json() as { query: string }
    if (!query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    // Load embeddings config
    const { data: settings } = await supabase
      .from('user_settings')
      .select('embeddings_config_encrypted')
      .eq('user_id', user.id)
      .single()

    if (!settings?.embeddings_config_encrypted) {
      return NextResponse.json(
        { error: 'No embeddings provider configured' },
        { status: 400 }
      )
    }

    const config: EmbeddingsConfig = JSON.parse(decrypt(settings.embeddings_config_encrypted, user.id))
    const provider = createEmbeddingsProvider(config)
    const queryEmbedding = await provider.embed(query.trim())

    // Vector search via RPC
    const { data: matches, error: rpcError } = await supabase.rpc('search_ideas', {
      p_user_id: user.id,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_limit: 12,
      p_threshold: 0.3,
    }) as { data: { id: string; similarity: number }[] | null; error: unknown }

    if (rpcError) throw rpcError
    if (!matches || matches.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const similarityById = new Map(matches.map(m => [m.id, m.similarity]))

    // Fetch and decrypt matching ideas
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
      similarity: similarityById.get(row.id) ?? 0,
    }))

    // Sort by similarity descending
    ideas.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({ data: ideas })
  } catch (err) {
    console.error('Vault search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
