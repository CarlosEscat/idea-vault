import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { getUserIdeas } from '@/lib/vault'

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ideas = await getUserIdeas(user.id)
    return NextResponse.json({ data: ideas })
  } catch (err) {
    console.error('Vault fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}
