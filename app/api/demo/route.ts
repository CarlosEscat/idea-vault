import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'

// "Try the demo": signs the visitor in to the shared, read-only demo account.
// The credentials live in server env vars only and are never sent to the client.
export async function POST(req: NextRequest) {
  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD
  if (!email || !password) {
    return NextResponse.json({ error: 'Demo is not configured' }, { status: 404 })
  }

  const supabase = await createServerClientInstance()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('Demo sign-in failed:', error.message)
    return NextResponse.json({ error: 'Demo is unavailable right now' }, { status: 503 })
  }
  return NextResponse.redirect(new URL('/graph', req.url), 303)
}
