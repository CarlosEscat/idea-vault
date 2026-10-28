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
    <div style={{ position: 'relative', marginBottom: '2rem' }}>
      {/* Card */}
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 25px -5px rgba(19, 78, 74, 0.09), 0 8px 10px -6px rgba(19, 78, 74, 0.04)',
        padding: '1.5rem 1.75rem',
        background: '#fff',
        position: 'relative',
      }}>
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
            minHeight: 88,
          }}
        />

        {error && (
          <div style={{
            fontSize: 12,
            color: '#dc2626',
            marginTop: 6,
            marginBottom: 4,
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.875rem',
          paddingTop: '0.875rem',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{
            fontSize: 12,
            color: 'var(--color-ink-faint)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: loading ? 'var(--color-warning)' : 'var(--color-accent)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {loading ? 'Thinking...' : providerLabel}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--color-ink-faint)' }}>
              ⌘↵ to capture
            </span>
            <button
              onClick={handleCapture}
              disabled={loading || !thought.trim()}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '8px 22px',
                borderRadius: 9999,
                border: 'none',
                background: thought.trim() && !loading ? 'var(--color-accent)' : 'var(--color-paper-mid)',
                color: thought.trim() && !loading ? '#ffffff' : 'var(--color-ink-faint)',
                boxShadow: thought.trim() && !loading ? '0 4px 14px 0 rgba(20, 184, 166, 0.38)' : 'none',
                cursor: thought.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {loading ? 'Capturing...' : 'Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
