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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    fontSize: 14,
    fontFamily: 'var(--font-serif)',
    border: 'none',
    borderRadius: 'var(--radius-xl)',
    background: '#fff',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    boxSizing: 'border-box',
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
      background: '#e9f2ff',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
        letterSpacing: '-0.2px',
        background: 'linear-gradient(90deg, #c9fddc 0%, #95bbfe 100%)',
        boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
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
          width: 340,
          background: '#95bbfe',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
          padding: '2.25rem 2rem',
        }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '0.3rem',
          }}>
            Welcome back
          </h1>
          <p style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-ink-muted)',
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
                padding: '11px',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                background: '#004aac',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginBottom: '1rem',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-ink-muted)',
          }}>
            No Account?{' '}
            <Link href="/auth/signup" style={{ color: '#004aac', fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
