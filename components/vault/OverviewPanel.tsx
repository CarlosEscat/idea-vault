'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function OverviewPanel() {
  const [overviewMd, setOverviewMd] = useState<string | null>(null)
  const [ideaCount, setIdeaCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/vault/meta')
      .then(r => r.json())
      .then(json => {
        if (json.data?.overview_md) setOverviewMd(json.data.overview_md)
        setIdeaCount(json.data?.idea_count ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function regenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/vault/overview', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate overview')
      setOverviewMd(json.data.overview_md)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate overview')
    } finally {
      setGenerating(false)
    }
  }

  // Nothing to show — don't render the panel at all
  if (!loading && !overviewMd && ideaCount === 0) return null

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
            {!loading && (
              <button
                onClick={regenerate}
                disabled={generating}
                style={{
                  marginLeft: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-ink-faint)',
                  background: 'none',
                  border: 'none',
                  cursor: generating ? 'default' : 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {generating ? 'Generating…' : overviewMd ? 'Refresh' : 'Generate'}
              </button>
            )}
            {error && (
              <div style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 4 }}>{error}</div>
            )}
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
                {overviewMd ? <ReactMarkdown>{overviewMd}</ReactMarkdown> : 'No overview yet — generate one from your ideas.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
