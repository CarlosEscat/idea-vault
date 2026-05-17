'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import type { LLMProviderType, EmbeddingsProviderType } from '@/types'
import { LLM_MODELS, LLM_DEFAULT_MODELS } from '@/types'
import { EMBEDDINGS_MODELS, EMBEDDINGS_DEFAULT_MODELS } from '@/lib/embeddings/providers'

const LLM_PROVIDERS: { id: LLMProviderType; name: string; desc: string }[] = [
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude models' },
  { id: 'openai',    name: 'OpenAI',    desc: 'GPT and o-series models' },
  { id: 'google',    name: 'Google',    desc: 'Gemini models' },
  { id: 'ollama',    name: 'Ollama',    desc: 'Local models — requires a running Ollama server' },
]

const EMBEDDINGS_PROVIDERS: { id: EmbeddingsProviderType; name: string; desc: string }[] = [
  { id: 'openai',  name: 'OpenAI',  desc: 'text-embedding-3-small — recommended' },
  { id: 'google',  name: 'Google',  desc: 'text-embedding-004 — use your Gemini API key' },
  { id: 'ollama',  name: 'Ollama',  desc: 'Local embeddings — requires a running Ollama server' },
]

export default function SettingsPage() {
  // LLM state
  const [provider, setProvider] = useState<LLMProviderType>('anthropic')
  const [model, setModel] = useState(LLM_DEFAULT_MODELS.anthropic)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434')
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Embeddings state
  const [embProvider, setEmbProvider] = useState<EmbeddingsProviderType>('openai')
  const [embModel, setEmbModel] = useState(EMBEDDINGS_DEFAULT_MODELS.openai)
  const [embApiKey, setEmbApiKey] = useState('')
  const [embBaseUrl, setEmbBaseUrl] = useState('http://localhost:11434')
  const [embHasExistingKey, setEmbHasExistingKey] = useState(false)
  const [embSaving, setEmbSaving] = useState(false)
  const [embSaved, setEmbSaved] = useState(false)
  const [embError, setEmbError] = useState<string | null>(null)

  // Backfill state
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{ total: number; done: number; failed: number } | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [llmRes, embRes] = await Promise.all([
        fetch('/api/llm'),
        fetch('/api/embeddings'),
      ])
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

  async function handleBackfill() {
    setBackfilling(true)
    setBackfillResult(null)
    setBackfillError(null)
    try {
      const res = await fetch('/api/embeddings/backfill', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Backfill failed')
      setBackfillResult(json.data)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
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
    if (embProvider === 'ollama') {
      body.baseUrl = embBaseUrl
      body.apiKey = 'ollama'
    } else if (embApiKey) {
      body.apiKey = embApiKey
    } else if (embHasExistingKey) {
      body.apiKey = '__keep__'
    }

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
    } catch (err) {
      setEmbError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setEmbSaving(false)
    }
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
    if (provider === 'ollama') {
      body.baseUrl = baseUrl
      body.apiKey = 'ollama'
    }

    // Only send apiKey if user typed a new one
    if (!apiKey && hasExistingKey) {
      // Don't overwrite existing key — skip save or handle differently
      // For simplicity, require re-entry when switching providers
      body.apiKey = '__keep__'
    }

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

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: 'var(--font-serif)',
    border: '0.5px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)',
    background: '#fff',
    outline: 'none',
  }

  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--color-ink-faint)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '2rem 2.5rem', overflow: 'auto', maxWidth: 600 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: '0.5rem' }}>
          Settings
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--color-ink-muted)',
          marginBottom: '0.5rem',
        }}>
          The AI model used to generate responses, extract insights, and chat with your ideas.
        </p>
        <p style={{
          fontSize: 13,
          color: 'var(--color-ink-faint)',
          fontStyle: 'italic',
          marginBottom: '2rem',
        }}>
          Bring your own API key — your key is stored locally and never shared.
        </p>

        {/* Provider selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Provider</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {LLM_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: provider === p.id
                    ? '1.5px solid var(--color-accent)'
                    : '0.5px solid var(--color-border-strong)',
                  background: provider === p.id ? 'var(--color-accent-light)' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                <span style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: provider === p.id ? 'var(--color-accent)' : 'var(--color-border-strong)',
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--color-ink-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {p.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Model</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            {LLM_MODELS[provider].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        {provider !== 'ollama' ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              API key
              {hasExistingKey && (
                <span style={{ color: 'var(--color-accent)', marginLeft: 8, textTransform: 'none' }}>
                  ✓ saved
                </span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={hasExistingKey ? '••••••••••••' : 'sk-...'}
              style={inputStyle}
            />
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-ink-faint)',
              marginTop: 6,
            }}>
              Your key is encrypted at rest — stored with AES-256 encryption
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Ollama server URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {error && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: '#c0392b',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            border: '0.5px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save settings →'}
        </button>

        {/* ── Embeddings ────────────────────────────────────────────── */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '0.5px solid var(--color-border)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: '0.5rem' }}>
            Embeddings
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--color-ink-muted)',
            marginBottom: '0.5rem',
          }}>
            Embeddings convert your ideas into numbers that capture meaning — this powers "find similar ideas" and semantic search.
          </p>
          <p style={{
            fontSize: 13,
            color: 'var(--color-ink-faint)',
            fontStyle: 'italic',
            marginBottom: '2rem',
          }}>
            Separate from your AI provider — you can mix and match (e.g. Anthropic for chat, OpenAI for embeddings).
          </p>

          {/* Embeddings provider selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Provider</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EMBEDDINGS_PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleEmbProviderChange(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: embProvider === p.id
                      ? '1.5px solid var(--color-accent)'
                      : '0.5px solid var(--color-border-strong)',
                    background: embProvider === p.id ? 'var(--color-accent-light)' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  <span style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: embProvider === p.id ? 'var(--color-accent)' : 'var(--color-border-strong)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                      {p.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Embeddings model */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Model</label>
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

          {/* Embeddings API key / base URL */}
          {embProvider !== 'ollama' ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>
                API key
                {embHasExistingKey && (
                  <span style={{ color: 'var(--color-accent)', marginLeft: 8, textTransform: 'none' }}>
                    ✓ saved
                  </span>
                )}
              </label>
              <input
                type="password"
                value={embApiKey}
                onChange={e => setEmbApiKey(e.target.value)}
                placeholder={embHasExistingKey ? '••••••••••••' : 'sk-...'}
                style={inputStyle}
              />
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-ink-faint)',
                marginTop: 6,
              }}>
                Your key is encrypted at rest — stored with AES-256 encryption
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Ollama server URL</label>
              <input
                type="text"
                value={embBaseUrl}
                onChange={e => setEmbBaseUrl(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {embError && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#c0392b',
              marginBottom: '1rem',
            }}>
              {embError}
            </div>
          )}

          <button
            onClick={handleEmbSave}
            disabled={embSaving}
            style={{
              padding: '10px 24px',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              border: '0.5px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-ink)',
              color: 'var(--color-paper)',
              cursor: embSaving ? 'not-allowed' : 'pointer',
              opacity: embSaving ? 0.6 : 1,
            }}
          >
            {embSaving ? 'Saving...' : embSaved ? 'Saved ✓' : 'Save embeddings →'}
          </button>

          {/* Backfill */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '0.5px solid var(--color-border)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '0.4rem' }}>
              Backfill missing embeddings
            </div>
            <p style={{
              fontSize: 13,
              color: 'var(--color-ink-muted)',
              marginBottom: '1rem',
              lineHeight: 1.6,
            }}>
              Ideas captured before you configured embeddings have no vector. Run this to generate embeddings for all of them — required for semantic connections in the knowledge graph.
            </p>

            <button
              onClick={handleBackfill}
              disabled={backfilling || !embHasExistingKey}
              title={!embHasExistingKey ? 'Save your embeddings provider first' : undefined}
              style={{
                padding: '8px 20px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                border: '0.5px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                background: '#fff',
                color: 'var(--color-ink-muted)',
                cursor: (backfilling || !embHasExistingKey) ? 'not-allowed' : 'pointer',
                opacity: (backfilling || !embHasExistingKey) ? 0.5 : 1,
              }}
            >
              {backfilling ? 'Backfilling…' : 'Backfill now'}
            </button>

            {backfillError && (
              <p style={{
                marginTop: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#c0392b',
              }}>
                {backfillError}
              </p>
            )}

            {backfillResult && (
              <p style={{
                marginTop: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: backfillResult.failed > 0 ? 'var(--color-ink-muted)' : 'var(--color-accent)',
              }}>
                {backfillResult.total === 0
                  ? 'All ideas already have embeddings.'
                  : `Done — ${backfillResult.done}/${backfillResult.total} embedded${backfillResult.failed > 0 ? `, ${backfillResult.failed} failed` : ''}.`}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
