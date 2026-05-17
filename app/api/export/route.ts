import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { exportVault } from '@/lib/vault'

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const files = await exportVault(user.id)

    // Return as JSON — client will create a zip using JSZip
    return NextResponse.json({ data: files })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Failed to export vault' }, { status: 500 })
  }
}
