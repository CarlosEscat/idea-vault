import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * The shared demo account is flagged via app_metadata.is_demo, which only the service role can set
 * (users cannot edit app_metadata), so it cannot be spoofed from the client.
 */
export function isDemoUser(user: Pick<User, 'app_metadata'>): boolean {
  return user.app_metadata?.is_demo === true
}

/** Returns a 403 response for the demo user, or null if the user may write. */
export function demoWriteBlocked(user: Pick<User, 'app_metadata'>): NextResponse | null {
  return isDemoUser(user)
    ? NextResponse.json({ error: 'The demo vault is read-only. Sign up to create your own.' }, { status: 403 })
    : null
}
