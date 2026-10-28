import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { regenerateOverview } from '@/lib/vault'
import { decrypt } from '@/lib/encryption'
import type { LLMConfig } from '@/types'
import { demoWriteBlocked } from '@/lib/auth/demo'
import { rateLimited } from '@/lib/rate-limit'

export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const blocked = demoWriteBlocked(user)
    if (blocked) return blocked

    const limited = await rateLimited(supabase, 'overview')
    if (limited) return limited

    const { data: settings } = await supabase
      .from('user_settings')
      .select('llm_config_encrypted')
      .eq('user_id', user.id)
      .single()
    if (!settings?.llm_config_encrypted) {
      return NextResponse.json({ error: 'No LLM configured. Please set up your AI provider in Settings.' }, { status: 400 })
    }

    const llmConfig: LLMConfig = JSON.parse(decrypt(settings.llm_config_encrypted, user.id))
    const overview_md = await regenerateOverview(user.id, llmConfig)
    return NextResponse.json({ data: { overview_md } })
  } catch (err) {
    console.error('Overview regeneration error:', err)
    return NextResponse.json({ error: 'Failed to regenerate overview' }, { status: 500 })
  }
}
