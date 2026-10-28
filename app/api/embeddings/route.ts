import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'
import type { EmbeddingsConfig } from '@/types'
import { demoWriteBlocked } from '@/lib/auth/demo'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = demoWriteBlocked(user)
    if (blocked) return blocked

    const config: EmbeddingsConfig = await req.json()

    if (!config.provider || !config.model) {
      return NextResponse.json({ error: 'provider and model are required' }, { status: 400 })
    }

    // '__keep__' means preserve the existing API key
    if (config.apiKey === '__keep__') {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('embeddings_config_encrypted')
        .eq('user_id', user.id)
        .single()

      if (!existing?.embeddings_config_encrypted) {
        return NextResponse.json({ error: 'No existing API key found — please enter your key' }, { status: 400 })
      }

      const prev: EmbeddingsConfig = JSON.parse(decrypt(existing.embeddings_config_encrypted, user.id))
      config.apiKey = prev.apiKey
    }

    if (!config.apiKey && config.provider !== 'ollama') {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    }

    const encrypted = encrypt(JSON.stringify(config), user.id)

    await supabase.from('user_settings').upsert({
      user_id: user.id,
      embeddings_config_encrypted: encrypted,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('Embeddings settings error:', err)
    return NextResponse.json({ error: 'Failed to save embeddings settings' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
      .from('user_settings')
      .select('embeddings_config_encrypted')
      .eq('user_id', user.id)
      .single()

    if (data?.embeddings_config_encrypted) {
      const config: EmbeddingsConfig = JSON.parse(decrypt(data.embeddings_config_encrypted, user.id))
      return NextResponse.json({
        data: {
          provider: config.provider,
          model: config.model,
          baseUrl: config.baseUrl,
          hasApiKey: !!config.apiKey,
        }
      })
    }

    return NextResponse.json({ data: null })
  } catch (err) {
    console.error('Embeddings GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch embeddings settings' }, { status: 500 })
  }
}
