'use client'

interface SuggestedGapsProps {
  gaps: string[]
}

export default function SuggestedGaps({ gaps }: SuggestedGapsProps) {
  if (gaps.length === 0) return null

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.25rem 1.5rem',
      border: '0.5px dashed var(--color-border-strong)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--color-ink-faint)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        Suggested gaps
      </div>
      {gaps.map((gap, i) => (
        <div key={i} style={{
          fontSize: 13,
          color: 'var(--color-ink-muted)',
          padding: '6px 0',
          borderBottom: i < gaps.length - 1 ? '0.5px solid var(--color-border)' : 'none',
          fontStyle: 'italic',
          display: 'flex',
          gap: 10,
          lineHeight: 1.5,
        }}>
          <span style={{ color: 'var(--color-ink-faint)', flexShrink: 0 }}>→</span>
          {gap}
        </div>
      ))}
    </div>
  )
}
