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
  const [demoLoading, setDemoLoading] = useState(false)

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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'var(--font-serif)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)',
    background: '#fff',
    outline: 'none',
    color: 'var(--color-ink)',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-ink)',
    display: 'block',
    marginBottom: '0.4rem',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--color-paper)',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
        letterSpacing: '-0.2px',
        background: 'linear-gradient(160deg, #134E4A 0%, #0D9488 100%)',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px 0 rgba(20, 184, 166, 0.22)',
      }}>
        Idea Vault
      </header>

      {/* Centered card */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          width: 360,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(19, 78, 74, 0.18)',
          padding: '2.25rem 2rem',
        }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '0.3rem',
            color: 'var(--color-ink)',
          }}>
            Welcome back
          </h1>
          <p style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-ink-faint)',
            marginBottom: '1.75rem',
          }}>
            sign in to your Vault
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                fontSize: 12,
                color: 'var(--color-error)',
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
                padding: '11px',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent)',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginBottom: '1rem',
                transition: 'background 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 14px 0 rgba(20, 184, 166, 0.38)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <form method="post" action="/api/demo" onSubmit={() => setDemoLoading(true)} style={{ marginBottom: '1rem' }}>
            <button
              type="submit"
              disabled={demoLoading}
              style={{
                width: '100%',
                padding: '11px',
                fontSize: 14,
                fontWeight: 600,
                opacity: demoLoading ? 0.6 : 1,
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-ink)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {demoLoading ? 'Opening the demo…' : 'Try the demo (no signup)'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-ink-faint)',
          }}>
            No Account?{' '}
            <Link href="/auth/signup" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
