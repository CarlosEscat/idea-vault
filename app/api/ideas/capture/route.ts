import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { captureIdea } from '@/lib/vault'
import { CaptureValidationError } from '@/lib/vault/schema'
import { decrypt } from '@/lib/encryption'
import type { LLMConfig, EmbeddingsConfig, CaptureIdeaRequest } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CaptureIdeaRequest = await req.json()

    if (!body.rawThought?.trim()) {
      return NextResponse.json({ error: 'rawThought is required' }, { status: 400 })
    }

    // Get user's LLM + embeddings config
    const { data: settings } = await supabase
      .from('user_settings')
      .select('llm_config_encrypted, embeddings_config_encrypted')
      .eq('user_id', user.id)
      .single()

    if (!settings?.llm_config_encrypted) {
      return NextResponse.json(
        { error: 'No LLM configured. Please set up your AI provider in Settings.' },
        { status: 400 }
      )
    }

    const llmConfig: LLMConfig = JSON.parse(decrypt(settings.llm_config_encrypted, user.id))
    const embeddingsConfig: EmbeddingsConfig | undefined = settings.embeddings_config_encrypted
      ? JSON.parse(decrypt(settings.embeddings_config_encrypted, user.id))
      : undefined

    const result = await captureIdea(user.id, body.rawThought, llmConfig, embeddingsConfig)

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('Capture idea error:', err)
    if (err instanceof CaptureValidationError) {
      return NextResponse.json({ error: `The AI model returned an unusable response. Please try again. (${err.message})` }, { status: 502 })
    }
    return NextResponse.json({ error: 'Failed to capture idea' }, { status: 500 })
  }
}
