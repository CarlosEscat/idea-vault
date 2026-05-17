export default function PageSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar placeholder */}
      <div style={{
        width: 220,
        minWidth: 220,
        borderRight: '0.5px solid var(--color-border)',
        background: 'var(--color-paper-warm)',
      }} />

      {/* Content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: 'var(--color-ink-faint)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}>
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
        {label}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
