'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 16,
      fontFamily: 'var(--font-serif)',
      color: 'var(--color-ink)',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <span style={{ fontSize: 32, color: 'var(--color-ink-faint)' }}>⊗</span>
      <h2 style={{ fontSize: 18, fontWeight: 500 }}>Something went wrong</h2>
      {error.digest && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-ink-faint)',
        }}>
          ref: {error.digest}
        </p>
      )}
      <button
        onClick={unstable_retry}
        style={{
          marginTop: 8,
          padding: '8px 20px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          border: '0.5px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-sm)',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--color-ink-muted)',
        }}
      >
        Try again
      </button>
    </div>
  )
}
