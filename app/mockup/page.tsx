'use client'

// MOCKUP ONLY — for review before applying to dashboard

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CATEGORIES = ['Product', 'Design', 'Engineering', 'Research']

const INTENSITIES = [
  [0, 1, 3, 2, 4, 2, 1, 0, 3, 2, 1, 4],
  [2, 3, 1, 0, 2, 4, 3, 2, 1, 0, 3, 2],
  [1, 0, 2, 3, 1, 2, 0, 4, 2, 3, 1, 2],
  [3, 2, 0, 1, 3, 0, 2, 1, 4, 2, 0, 1],
]

const HEAT_COLORS = [
  '#ece9e2', // 0 — empty
  '#c8e8d4', // 1 — low
  '#1D9E75', // 2 — mid
  '#157a5a', // 3 — high
  '#0f5240', // 4 — peak
]

const TOOLTIP_TEXTS: Record<string, string> = {
  'Product-Jul': 'No ideas captured this month.',
  'Design-Aug': 'Most active design thinking period.',
  'Engineering-Oct': 'Spike in technical ideas — new feature cycle?',
}

export default function MockupPage() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-paper)',
      fontFamily: 'var(--font-serif)',
    }}>

      {/* Sidebar */}
      <aside style={{
        width: 56,
        borderRight: '0.5px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '1.25rem',
        gap: 20,
        background: 'var(--color-paper)',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--color-ink)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-paper)',
          fontSize: 14, fontWeight: 700,
        }}>
          IV
        </div>
        {['⊞', '◎', '≡', '⚙'].map((icon, i) => (
          <div key={i} style={{
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8,
            background: i === 0 ? 'var(--color-accent-light)' : 'transparent',
            color: i === 0 ? 'var(--color-accent)' : 'var(--color-ink-faint)',
            fontSize: 16,
            cursor: 'pointer',
          }}>
            {icon}
          </div>
        ))}
      </aside>

      {/* Main */}
      <main style={{
        flex: 1,
        padding: '2rem 2.5rem',
        overflow: 'auto',
      }}>

        {/* Header */}
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: '1.5rem' }}>
          Idea Vault
        </h1>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 24,
          borderBottom: '0.5px solid var(--color-border)',
          marginBottom: '2rem',
        }}>
          {['Dashboard', 'Graph', 'Vault', 'Settings'].map((tab, i) => (
            <div key={tab} style={{
              paddingBottom: '0.6rem',
              fontSize: 14,
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              borderBottom: i === 0 ? '2px solid var(--color-ink)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}>
              {tab}
            </div>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: '2rem',
        }}>
          {[
            { value: '42', label: 'Total Ideas', sub: 'across all categories', badge: '+3 this week' },
            { value: '118', label: 'Connections', sub: 'between ideas', badge: undefined },
            { value: '4', label: 'Categories', sub: 'active clusters', badge: undefined },
          ].map(({ value, label, sub, badge }) => (
            <div key={label} style={{
              background: '#fff',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              position: 'relative',
            }}>
              {badge && (
                <span style={{
                  position: 'absolute',
                  top: 12, right: 12,
                  background: 'var(--color-accent-light)',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}>
                  {badge}
                </span>
              )}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}>
                {label}
              </div>
              <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1 }}>
                {value}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink-muted)',
                marginTop: 6,
              }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Activity Heatmap */}
        <div style={{
          background: '#fff',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-ink-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '1.25rem',
          }}>
            Idea Activity by Category
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ width: 90 }} />
                  {MONTHS.map(m => (
                    <th key={m} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--color-ink-muted)',
                      fontWeight: 400,
                      textAlign: 'center',
                      paddingBottom: 6,
                    }}>
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat, ci) => (
                  <tr key={cat}>
                    <td style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--color-ink-muted)',
                      paddingRight: 8,
                      whiteSpace: 'nowrap',
                    }}>
                      {cat}
                    </td>
                    {MONTHS.map((month, mi) => {
                      const intensity = INTENSITIES[ci][mi]
                      const tipKey = `${cat}-${month}`
                      const tip = TOOLTIP_TEXTS[tipKey]
                      return (
                        <td key={month} title={tip} style={{
                          width: 36, height: 32,
                          background: HEAT_COLORS[intensity],
                          borderRadius: 6,
                          cursor: tip ? 'pointer' : 'default',
                          transition: 'opacity 0.15s',
                          border: tip ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
                        }} />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-ink-faint)',
          }}>
            <span>Less</span>
            {HEAT_COLORS.map((c, i) => (
              <div key={i} style={{
                width: 16, height: 16,
                background: c,
                borderRadius: 4,
                border: '0.5px solid var(--color-border)',
              }} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Recent ideas list */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-ink-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '0.75rem',
          }}>
            Recent Ideas
          </div>
          <div style={{
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: '#fff',
          }}>
            {[
              { n: 1, title: 'AI-powered connection suggestions', cat: 'Product', date: 'Today' },
              { n: 2, title: 'Keyboard-first capture flow', cat: 'Design', date: 'Yesterday' },
              { n: 3, title: 'Graph clustering algorithm', cat: 'Engineering', date: 'May 14' },
              { n: 4, title: 'User interview synthesis patterns', cat: 'Research', date: 'May 12' },
            ].map(({ n, title, cat, date }) => (
              <div key={n} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: n < 4 ? '0.5px solid var(--color-border)' : 'none',
                gap: 12,
                cursor: 'pointer',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-ink-faint)',
                  width: 20,
                  textAlign: 'right',
                }}>
                  {n}
                </span>
                <span style={{ flex: 1, fontSize: 14 }}>{title}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-accent)',
                  background: 'var(--color-accent-light)',
                  padding: '2px 8px',
                  borderRadius: 99,
                }}>
                  {cat}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-ink-faint)',
                }}>
                  {date}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
