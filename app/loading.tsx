export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 10,
      color: 'var(--color-ink-faint)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
    }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
      Loading…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
