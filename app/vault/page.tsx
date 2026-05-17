'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import IdeaRow from '@/components/vault/IdeaRow'
import IdeaDetail from '@/components/vault/IdeaDetail'
import type { Idea } from '@/types'

export default function VaultPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [semanticResults, setSemanticResults] = useState<(Idea & { similarity: number })[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/vault')
      const { data } = await res.json()
      if (data) setIdeas(data)
      setLoading(false)
    }
    load()
  }, [])

  async function runSemanticSearch() {
    if (!filter.trim()) return
    setSearching(true)
    setSearchError(null)
    setSemanticResults(null)
    try {
      const res = await fetch('/api/vault/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: filter.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Search failed')
      setSemanticResults(json.data)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setSemanticResults(null)
    setSearchError(null)
    setFilter('')
  }

  const categories = [...new Set(ideas.map(i => i.category))].sort()

  const filtered = ideas.filter(idea => {
    const matchesText = !filter ||
      idea.title.toLowerCase().includes(filter.toLowerCase()) ||
      idea.summary.toLowerCase().includes(filter.toLowerCase()) ||
      idea.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    const matchesCat = !categoryFilter || idea.category === categoryFilter
    const matchesFav = !favoritesOnly || idea.is_favorite
    return matchesText && matchesCat && matchesFav
  })

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar ideaCount={ideas.length} />

      <main style={{ flex: 1, padding: '4rem 2.5rem 2rem', overflow: 'auto', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: '0.5rem' }}>
          Vault
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--color-ink-muted)',
          fontStyle: 'italic',
          marginBottom: '1.5rem',
        }}>
          All your ideas, searchable
        </p>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
          <input
            type="text"
            value={filter}
            onChange={e => {
              setFilter(e.target.value)
              if (semanticResults) setSemanticResults(null)
            }}
            onKeyDown={e => { if (e.key === 'Enter') runSemanticSearch() }}
            placeholder="Search ideas… (Enter for semantic search)"
            style={{
              flex: 1,
              padding: '8px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-serif)',
              border: '0.5px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              background: '#fff',
              outline: 'none',
            }}
          />
          {semanticResults !== null ? (
            <button
              onClick={clearSearch}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                border: '0.5px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                background: '#fff',
                color: 'var(--color-ink-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Clear
            </button>
          ) : (
            <button
              onClick={runSemanticSearch}
              disabled={searching || !filter.trim()}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                border: '0.5px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                background: '#fff',
                color: 'var(--color-ink-muted)',
                cursor: (searching || !filter.trim()) ? 'not-allowed' : 'pointer',
                opacity: !filter.trim() ? 0.4 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {searching ? 'Searching…' : '⟡ Semantic'}
            </button>
          )}
          {semanticResults === null && (
            <>
              <button
                onClick={() => setFavoritesOnly(f => !f)}
                title={favoritesOnly ? 'Show all ideas' : 'Show favorites only'}
                style={{
                  padding: '8px 12px',
                  fontSize: 14,
                  border: favoritesOnly
                    ? '1.5px solid #e8a020'
                    : '0.5px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-md)',
                  background: favoritesOnly ? '#fef9ec' : '#fff',
                  color: favoritesOnly ? '#e8a020' : 'var(--color-ink-faint)',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Toggle favorites filter"
              >
                {favoritesOnly ? '★' : '☆'}
              </button>
              <select
                value={categoryFilter ?? ''}
                onChange={e => setCategoryFilter(e.target.value || null)}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  border: '0.5px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  minWidth: 140,
                }}
              >
                <option value="">All categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {searchError && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: '#c0392b',
            marginBottom: '0.75rem',
          }}>
            {searchError}
          </div>
        )}

        {/* Semantic results */}
        {semanticResults !== null ? (
          <>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-ink-faint)',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem',
            }}>
              {semanticResults.length} SEMANTIC MATCH{semanticResults.length !== 1 ? 'ES' : ''} · "{filter}"
            </div>
            {semanticResults.length > 0 ? (
              <div style={{
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: '#fff',
              }}>
                {semanticResults.map((idea, i) => (
                  <div key={idea.id} style={{ position: 'relative' }}>
                    <IdeaRow idea={idea} index={i + 1} onClick={setSelectedIdea} />
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      right: '1rem',
                      transform: 'translateY(-50%)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--color-accent)',
                      background: 'var(--color-accent-light)',
                      padding: '2px 7px',
                      borderRadius: 20,
                      pointerEvents: 'none',
                    }}>
                      {Math.round(idea.similarity * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'var(--color-ink-faint)',
                fontStyle: 'italic',
                fontSize: 14,
              }}>
                No semantic matches found — try different wording
              </div>
            )}
          </>
        ) : (
          <>
            {/* Count */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-ink-faint)',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem',
            }}>
              {filtered.length} IDEA{filtered.length !== 1 ? 'S' : ''}
            </div>

            {/* Ideas list */}
            {filtered.length > 0 ? (
              <div style={{
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: '#fff',
              }}>
                {filtered.map((idea, i) => (
                  <IdeaRow
                    key={idea.id}
                    idea={idea}
                    index={i + 1}
                    onClick={setSelectedIdea}
                  />
                ))}
              </div>
            ) : !loading ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'var(--color-ink-faint)',
                fontStyle: 'italic',
                fontSize: 14,
              }}>
                {ideas.length === 0 ? 'No ideas yet' : 'No ideas match your search'}
              </div>
            ) : null}
          </>
        )}
      </main>

      {/* Detail panel */}
      {selectedIdea && (
        <>
          <div
            onClick={() => setSelectedIdea(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', zIndex: 99 }}
          />
          <IdeaDetail
            idea={selectedIdea}
            onClose={() => setSelectedIdea(null)}
            onDelete={(id) => setIdeas(prev => prev.filter(i => i.id !== id))}
            onUpdate={(updated) => {
              setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i))
              setSelectedIdea(updated)
            }}
          />
        </>
      )}
    </div>
  )
}
