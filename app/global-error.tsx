'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="en">
      <body style={{
        margin: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'var(--font-serif)',
        background: 'var(--color-paper)',
        color: 'var(--color-ink)',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <span style={{ fontSize: 32, color: '#a8a89e' }}>⊗</span>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Something went wrong</h2>
        <button
          onClick={unstable_retry}
          style={{
            marginTop: 8,
            padding: '8px 20px',
            fontFamily: 'monospace',
            fontSize: 12,
            border: '0.5px solid rgba(26,26,24,0.2)',
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
            color: '#6b6b63',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
