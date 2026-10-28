'use client'

import { useEffect, useState } from 'react'

interface UsageRow {
  kind: string; provider: string; model: string; calls: number; failures: number
  avgLatencyMs: number; inputTokens: number; outputTokens: number; estCostUsd: number | null
}

const th: React.CSSProperties = { textAlign: 'left', fontWeight: 600, padding: '4px 8px 4px 0', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '4px 8px 4px 0', whiteSpace: 'nowrap' }

export default function UsageSummary() {
  const [state, setState] = useState<{ days: number; rows: UsageRow[] } | 'error' | null>(null)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.json())
      .then(json => setState(json.data ?? 'error'))
      .catch(() => setState('error'))
  }, [])

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: '0.4rem' }}>Usage</div>
      {state === null && <p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Loading…</p>}
      {state === 'error' && <p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Usage is unavailable.</p>}
      {state && state !== 'error' && (state.rows.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>No model calls in the last {state.days} days.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                <th style={th}>Call</th><th style={th}>Model</th><th style={th}>Calls</th><th style={th}>Failed</th>
                <th style={th}>Avg latency</th><th style={th}>Tokens in/out</th><th style={th}>Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map(r => (
                <tr key={`${r.kind}-${r.provider}-${r.model}`}>
                  <td style={td}>{r.kind}</td>
                  <td style={td}>{r.provider}/{r.model}</td>
                  <td style={td}>{r.calls}</td>
                  <td style={td}>{r.failures}</td>
                  <td style={td}>{(r.avgLatencyMs / 1000).toFixed(1)}s</td>
                  <td style={td}>{r.inputTokens ? `${r.inputTokens} / ${r.outputTokens}` : '—'}</td>
                  <td style={td}>{r.estCostUsd === null || !r.inputTokens ? '—' : `$${r.estCostUsd.toFixed(4)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 6 }}>
            Last {state.days} days. Costs are estimates from list prices; embedding calls report no token counts.
          </p>
        </div>
      ))}
    </div>
  )
}
