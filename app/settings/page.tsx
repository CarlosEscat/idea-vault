'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import type { LLMProviderType, EmbeddingsProviderType } from '@/types'
import { LLM_MODELS, LLM_DEFAULT_MODELS } from '@/types'
import { EMBEDDINGS_MODELS, EMBEDDINGS_DEFAULT_MODELS } from '@/lib/embeddings/models'
import UsageSummary from '@/components/settings/UsageSummary'

const LLM_PROVIDERS: { id: LLMProviderType; name: string }[] = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai',    name: 'OpenAI' },
  { id: 'google',    name: 'Google' },
  { id: 'ollama',    name: 'Ollama' },
]

const EMBEDDINGS_PROVIDERS: { id: EmbeddingsProviderType; name: string }[] = [
  { id: 'ollama',  name: 'Ollama' },
  { id: 'openai',  name: 'OpenAI' },
  { id: 'google',  name: 'Google' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  fontSize: 14,
  fontFamily: 'var(--font-serif)',
  border: 'none',
  borderRadius: 'var(--radius-xl)',
  background: '#fff',
  outline: 'none',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--color-ink)',
  display: 'block',
  marginBottom: '0.6rem',
}

export default function SettingsPage() {
  const [provider, setProvider] = useState<LLMProviderType>('anthropic')
  const [model, setModel] = useState(LLM_DEFAULT_MODELS.anthropic)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434')
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [embProvider, setEmbProvider] = useState<EmbeddingsProviderType>('openai')
  const [embModel, setEmbModel] = useState(EMBEDDINGS_DEFAULT_MODELS.openai)
  const [embApiKey, setEmbApiKey] = useState('')
  const [embBaseUrl, setEmbBaseUrl] = useState('http://localhost:11434')
  const [embHasExistingKey, setEmbHasExistingKey] = useState(false)
  const [embSaving, setEmbSaving] = useState(false)
  const [embSaved, setEmbSaved] = useState(false)
  const [embError, setEmbError] = useState<string | null>(null)

  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{ total: number; done: number; failed: number; remaining: number } | null>(null)
  const [embStatus, setEmbStatus] = useState<{ total: number; current: number; stale: number; missing: number; model: string } | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [llmRes, embRes] = await Promise.all([
        fetch('/api/llm'),
        fetch('/api/embeddings'),
      ])
      refreshEmbStatus()
      const { data: llmData } = await llmRes.json()
      if (llmData) {
        setProvider(llmData.provider)
        setModel(llmData.model)
        setHasExistingKey(llmData.hasApiKey)
        if (llmData.baseUrl) setBaseUrl(llmData.baseUrl)
      }
      const { data: embData } = await embRes.json()
      if (embData) {
        setEmbProvider(embData.provider)
        setEmbModel(embData.model)
        setEmbHasExistingKey(embData.hasApiKey)
        if (embData.baseUrl) setEmbBaseUrl(embData.baseUrl)
      }
    }
    load()
  }, [])

  function handleProviderChange(p: LLMProviderType) {
    setProvider(p)
    setModel(LLM_DEFAULT_MODELS[p])
    setApiKey('')
    setHasExistingKey(false)
    setSaved(false)
  }

  function handleEmbProviderChange(p: EmbeddingsProviderType) {
    setEmbProvider(p)
    setEmbModel(EMBEDDINGS_DEFAULT_MODELS[p])
    setEmbApiKey('')
    setEmbHasExistingKey(false)
    setEmbSaved(false)
  }

  async function handleSave() {
    if (!apiKey && !hasExistingKey && provider !== 'ollama') {
      setError('Please enter your API key')
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    const body: Record<string, string> = { provider, model }
    if (apiKey) body.apiKey = apiKey
    if (provider === 'ollama') { body.baseUrl = baseUrl; body.apiKey = 'ollama' }
    if (!apiKey && hasExistingKey) body.apiKey = '__keep__'
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      setHasExistingKey(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleEmbSave() {
    if (!embApiKey && !embHasExistingKey && embProvider !== 'ollama') {
      setEmbError('Please enter your API key')
      return
    }
    setEmbSaving(true)
    setEmbError(null)
    setEmbSaved(false)
    const body: Record<string, string> = { provider: embProvider, model: embModel }
    if (embProvider === 'ollama') { body.baseUrl = embBaseUrl; body.apiKey = 'ollama' }
    else if (embApiKey) body.apiKey = embApiKey
    else if (embHasExistingKey) body.apiKey = '__keep__'
    try {
      const res = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEmbSaved(true)
      setEmbHasExistingKey(true)
      refreshEmbStatus()
    } catch (err) {
      setEmbError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setEmbSaving(false)
    }
  }

  async function refreshEmbStatus() {
    try {
      const res = await fetch('/api/embeddings/status')
      const json = await res.json()
      setEmbStatus(json.data ?? null)
    } catch { /* status is informational */ }
  }

  async function handleBackfill() {
    setBackfilling(true)
    setBackfillResult(null)
    setBackfillError(null)
    try {
      // Each request embeds one batch; keep going until nothing is left or a batch makes no progress.
      let totals = { total: 0, done: 0, failed: 0, remaining: 0 }
      for (;;) {
        const res = await fetch('/api/embeddings/backfill', { method: 'POST' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Backfill failed')
        const r = json.data as typeof totals
        totals = { total: totals.total + r.total, done: totals.done + r.done, failed: totals.failed + r.failed, remaining: r.remaining }
        setBackfillResult(totals)
        if (r.remaining === 0 || r.done === 0) break
      }
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
      refreshEmbStatus()
    }
  }

  function providerButton(name: string, active: boolean, onClick: () => void) {
    return (
      <button
        key={name}
        onClick={onClick}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 16px',
          fontSize: 14,
          fontWeight: active ? 600 : 400,
          border: active ? '2px solid #004aac' : 'none',
          borderRadius: 'var(--radius-xl)',
          background: active ? '#c9fddc' : '#fff',
          color: active ? '#004aac' : 'var(--color-ink)',
          cursor: 'pointer',
          textAlign: 'left',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'all 0.1s',
        }}
      >
        {name}
      </button>
    )
  }

  function saveButton(label: string, onClick: () => void, disabled: boolean) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
        <button
          onClick={onClick}
          disabled={disabled}
          style={{
            padding: '10px 22px',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--radius-xl)',
            background: '#004aac',
            color: '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {label}
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#e9f2ff',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
        letterSpacing: '-0.2px',
        background: 'linear-gradient(90deg, #c9fddc 0%, #95bbfe 100%)',
        boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
      }}>
        Idea Vault
      </header>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 12,
        padding: 12,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <Sidebar />

        {/* Single card with two columns */}
        <div style={{
          flex: 1,
          margin: '30px 70px 30px 10px',
          borderRadius: 'var(--radius-xl)',
          background: '#95bbfe',
          boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
          overflow: 'hidden',
          display: 'flex',
          minWidth: 0,
        }}>

          {/* Settings column */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.75rem',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '0.3rem' }}>Settings</h2>
            <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              The AI model used to generate responses, extract insights, and chat with your ideas.
            </p>

            {/* Provider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={sectionLabel}>Provider</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {LLM_PROVIDERS.map(p => providerButton(p.name, provider === p.id, () => handleProviderChange(p.id)))}
              </div>
            </div>

            {/* Model */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={sectionLabel}>Model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
              >
                {LLM_MODELS[provider].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* API key / base URL */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={sectionLabel}>
                {provider === 'ollama' ? 'Server URL' : 'API KEY'}
                {hasExistingKey && provider !== 'ollama' && (
                  <span style={{ color: '#004aac', marginLeft: 8, fontWeight: 400, fontSize: 12 }}>✓ saved</span>
                )}
              </label>
              {provider === 'ollama' ? (
                <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} style={inputStyle} />
              ) : (
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? '••••••••••••' : 'sk-...'}
                  style={inputStyle}
                />
              )}
            </div>

            {error && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{error}</p>}

            {saveButton(
              saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Settings',
              handleSave,
              saving,
            )}
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, background: 'rgba(0,0,0,0.12)', flexShrink: 0 }} />

          {/* Embeddings column */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.75rem',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '0.3rem' }}>Embeddings</h2>
            <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Embeddings convert your ideas into numbers that capture meaning — this powers &ldquo;find similar ideas&rdquo; and semantic search.
            </p>

            {/* Provider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={sectionLabel}>Provider</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EMBEDDINGS_PROVIDERS.map(p => providerButton(p.name, embProvider === p.id, () => handleEmbProviderChange(p.id)))}
              </div>
            </div>

            {/* Model */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={sectionLabel}>Model</label>
              <select
                value={embModel}
                onChange={e => setEmbModel(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
              >
                {EMBEDDINGS_MODELS[embProvider].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* API key / base URL */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={sectionLabel}>
                {embProvider === 'ollama' ? 'Server URL' : 'API KEY'}
                {embHasExistingKey && embProvider !== 'ollama' && (
                  <span style={{ color: '#004aac', marginLeft: 8, fontWeight: 400, fontSize: 12 }}>✓ saved</span>
                )}
              </label>
              {embProvider === 'ollama' ? (
                <input type="text" value={embBaseUrl} onChange={e => setEmbBaseUrl(e.target.value)} style={inputStyle} />
              ) : (
                <input
                  type="password"
                  value={embApiKey}
                  onChange={e => setEmbApiKey(e.target.value)}
                  placeholder={embHasExistingKey ? '••••••••••••' : 'sk-...'}
                  style={inputStyle}
                />
              )}
            </div>

            {embError && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{embError}</p>}

            {saveButton(
              embSaving ? 'Saving...' : embSaved ? 'Saved ✓' : 'Save embeddings',
              handleEmbSave,
              embSaving,
            )}

            {/* Backfill section */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(0,0,0,0.12)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: '0.4rem' }}>
                Embeddings Index
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                Ideas captured before you configured embeddings have no vector, and vectors from a different embeddings model cannot be compared with the current one. Run this to (re-)embed them — required for semantic search and connections in the knowledge graph.
              </p>

              {saveButton(
                backfilling ? 'Embedding…' : 'Embed missing & stale ideas',
                handleBackfill,
                backfilling || !embHasExistingKey,
              )}

              {embStatus && (
                <p style={{ marginTop: 8, fontSize: 12, color: embStatus.stale + embStatus.missing > 0 ? '#c0392b' : 'var(--color-ink-muted)' }}>
                  {embStatus.current}/{embStatus.total} ideas indexed with {embStatus.model}
                  {embStatus.stale > 0 && ` — ${embStatus.stale} indexed with a different or unknown model (excluded from search until re-embedded)`}
                  {embStatus.missing > 0 && ` — ${embStatus.missing} have no embedding yet`}
                  .
                </p>
              )}
              {backfillError && (
                <p style={{ marginTop: 8, fontSize: 12, color: '#c0392b' }}>{backfillError}</p>
              )}
              {backfillResult && (
                <p style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: backfillResult.failed > 0 ? 'var(--color-ink-muted)' : '#004aac',
                }}>
                  {backfillResult.total === 0
                    ? 'All ideas are indexed with the current model.'
                    : `${backfilling ? 'Working' : 'Done'} — ${backfillResult.done}/${backfillResult.total} embedded${backfillResult.failed > 0 ? `, ${backfillResult.failed} failed` : ''}${backfillResult.remaining > 0 ? `, ${backfillResult.remaining} remaining` : ''}.`}
                </p>
              )}
            </div>

            <UsageSummary />
          </div>

        </div>
      </div>
    </div>
  )
}
