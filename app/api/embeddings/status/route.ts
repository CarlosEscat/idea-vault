import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { getEmbeddingsConfig, getEmbeddingStatus } from '@/lib/embeddings/config'

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await getEmbeddingsConfig(supabase, user.id)
    if (!config) return NextResponse.json({ data: null })

    const status = await getEmbeddingStatus(supabase, config.model)
    return NextResponse.json({ data: status ? { ...status, model: config.model } : null })
  } catch (err) {
    console.error('Embedding status error:', err)
    return NextResponse.json({ error: 'Failed to load embedding status' }, { status: 500 })
  }
}
