import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'
import type { LLMConfig } from '@/types'
import { demoWriteBlocked } from '@/lib/auth/demo'
import { validateBaseUrl } from '@/lib/url-guard'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = demoWriteBlocked(user)
    if (blocked) return blocked

    const llmConfig: LLMConfig = await req.json()

    if (!llmConfig.provider || !llmConfig.model) {
      return NextResponse.json({ error: 'provider and model are required' }, { status: 400 })
    }

    const urlError = validateBaseUrl(llmConfig.baseUrl)
    if (urlError) return NextResponse.json({ error: urlError }, { status: 400 })

    // '__keep__' means the client doesn't have a new key — preserve the existing one
    if (llmConfig.apiKey === '__keep__') {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('llm_config_encrypted')
        .eq('user_id', user.id)
        .single()

      if (!existing?.llm_config_encrypted) {
        return NextResponse.json({ error: 'No existing API key found — please enter your key' }, { status: 400 })
      }

      const { decrypt } = await import('@/lib/encryption')
      const prev: LLMConfig = JSON.parse(decrypt(existing.llm_config_encrypted, user.id))
      llmConfig.apiKey = prev.apiKey
    }

    if (!llmConfig.apiKey && llmConfig.provider !== 'ollama') {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    }

    const encrypted = encrypt(JSON.stringify(llmConfig), user.id)

    await supabase.from('user_settings').upsert({
      user_id: user.id,
      llm_config_encrypted: encrypted,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('Settings error:', err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
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
      .select('llm_config_encrypted')
      .eq('user_id', user.id)
      .single()

    // Return only non-sensitive config (no API key)
    if (data?.llm_config_encrypted) {
      const { decrypt } = await import('@/lib/encryption')
      const config: LLMConfig = JSON.parse(decrypt(data.llm_config_encrypted, user.id))
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
    console.error('Settings GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
