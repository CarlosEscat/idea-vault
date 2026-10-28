import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('vault_meta')
      .select('overview_md_encrypted')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    const { count } = await supabase
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const overview_md = data?.overview_md_encrypted ? decrypt(data.overview_md_encrypted, user.id) : null
    return NextResponse.json({ data: { overview_md: overview_md || null, idea_count: count ?? 0 } })
  } catch (err) {
    console.error('Vault meta fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch vault meta' }, { status: 500 })
  }
}
