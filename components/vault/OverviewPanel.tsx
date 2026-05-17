'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function OverviewPanel() {
  const [overviewMd, setOverviewMd] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/vault/meta')
      .then(r => r.json())
      .then(json => {
        if (json.data?.overview_md) setOverviewMd(json.data.overview_md)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Nothing to show — don't render the panel at all
  if (!loading && !overviewMd) return null

  return (
    <div style={{
      width: collapsed ? 36 : '40vw',
      minWidth: collapsed ? 36 : '40vw',
      borderRight: '0.5px solid var(--color-border)',
      background: 'var(--color-paper)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand overview' : 'Collapse overview'}
        style={{
          position: 'absolute',
          top: 12,
          right: 8,
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-ink-faint)',
          fontSize: 12,
          zIndex: 1,
          flexShrink: 0,
        }}
        aria-label={collapsed ? 'Expand overview' : 'Collapse overview'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <>
          {/* Header */}
          <div style={{
            padding: '0.875rem 1rem 0.5rem',
            borderBottom: '0.5px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-ink-faint)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>
              Vault overview
            </span>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
          }}>
            {loading ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink-faint)',
              }}>
                Loading…
              </span>
            ) : (
              <div style={{
                fontSize: 12,
                lineHeight: 1.75,
                color: 'var(--color-ink)',
              }}>
                <ReactMarkdown>{overviewMd!}</ReactMarkdown>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
