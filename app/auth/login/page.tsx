'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-paper)',
      padding: '2rem',
    }}>
      <div style={{ width: 360 }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: '2.5rem',
          justifyContent: 'center',
        }}>
          <span style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: 'var(--color-ink)',
            display: 'inline-block',
          }} />
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500 }}>
            Idea Vault
          </span>
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>
          Welcome back
        </h1>
        <p style={{
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--color-ink-muted)',
          fontStyle: 'italic',
          marginBottom: '2rem',
        }}>
          Sign in to your vault
        </p>

        <div onSubmit={handleLogin} style={{ display: 'contents' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink-faint)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  fontFamily: 'var(--font-serif)',
                  border: '0.5px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink-faint)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 6,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  fontFamily: 'var(--font-serif)',
                  border: '0.5px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#c0392b',
                marginBottom: '1rem',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                border: '0.5px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-ink)',
                color: 'var(--color-paper)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--color-ink-muted)',
          marginTop: '1.5rem',
        }}>
          No account?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
