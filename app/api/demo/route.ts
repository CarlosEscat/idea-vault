import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// "Try the demo": signs the visitor in to the shared, read-only demo account.
// There is no demo password: the server mints a one-time magic-link token for the demo user id, so
// nothing a visitor does to the shared account (password/email change) can break future demo sign-ins.
export async function POST(req: NextRequest) {
  const demoUserId = process.env.DEMO_USER_ID
  if (!demoUserId || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Demo is not configured' }, { status: 404 })
  }

  try {
    const admin = createAdminClient()
    const { data: found, error: userError } = await admin.auth.admin.getUserById(demoUserId)
    if (userError || !found.user?.email || found.user.app_metadata?.is_demo !== true) {
      throw new Error(userError?.message ?? 'DEMO_USER_ID does not point to a demo user')
    }
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink', email: found.user.email,
    })
    if (linkError || !link.properties?.hashed_token) throw new Error(linkError?.message ?? 'No token generated')

    const supabase = await createServerClientInstance()
    const { error } = await supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
    if (error) throw error
    return NextResponse.redirect(new URL('/graph', req.url), 303)
  } catch (err) {
    console.error('Demo sign-in failed:', err)
    return NextResponse.json({ error: 'Demo is unavailable right now' }, { status: 503 })
  }
}
