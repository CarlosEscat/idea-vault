interface StatCardProps {
  value: number
  label: string
}

export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--color-paper-warm)',
      borderRadius: 'var(--radius-md)',
      padding: '0.65rem 0.85rem',
    }}>
      <div style={{
        fontSize: 18,
        fontWeight: 500,
        lineHeight: 1,
        marginBottom: 3,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--color-ink-muted)',
      }}>
        {label}
      </div>
    </div>
  )
}
