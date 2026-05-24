interface StatCardProps {
  value: number
  label: string
}

export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      background: '#fff',
    }}>
      <div style={{
        fontSize: 34,
        fontWeight: 600,
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--color-ink-muted)',
        textTransform: 'capitalize',
      }}>
        {label}
      </div>
    </div>
  )
}
