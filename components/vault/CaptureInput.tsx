'use client'

import { useState } from 'react'
import type { CaptureIdeaResponse } from '@/types'

interface CaptureInputProps {
  providerLabel: string
  onCapture: (result: CaptureIdeaResponse) => void
}

export default function CaptureInput({ providerLabel, onCapture }: CaptureInputProps) {
  const [thought, setThought] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCapture() {
    if (!thought.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ideas/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawThought: thought }),
      })
      const { data, error: apiError } = await res.json()
      if (apiError) throw new Error(apiError)
      setThought('')
      onCapture(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCapture()
    }
  }

  return (
    <div style={{
      border: '0.5px solid var(--color-border-strong)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.75rem 2rem',
      marginBottom: '2rem',
      background: '#fff',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--color-ink-faint)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        New thought
      </div>

      <textarea
        value={thought}
        onChange={e => setThought(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Drop a raw thought here — a half-formed idea, a connection you noticed, a question you can't shake..."
        disabled={loading}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          color: 'var(--color-ink)',
          background: 'transparent',
          resize: 'none',
          lineHeight: 1.7,
          minHeight: 80,
        }}
      />

      {error && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: '#c0392b',
          marginTop: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '0.5px solid var(--color-border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-ink-faint)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: loading ? '#f0ad4e' : 'var(--color-accent)',
            display: 'inline-block',
            flexShrink: 0,
          }} />
          {loading ? 'Thinking...' : providerLabel}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-ink-faint)',
          }}>
            ⌘↵ to capture
          </span>
          <button
            onClick={handleCapture}
            disabled={loading || !thought.trim()}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: '7px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: thought.trim() && !loading ? '#097bed' : 'var(--color-paper-mid)',
              color: thought.trim() && !loading ? '#ffffff' : 'var(--color-ink-faint)',
              cursor: thought.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {loading ? 'Capturing...' : 'Capture →'}
          </button>
        </div>
      </div>
    </div>
  )
}
