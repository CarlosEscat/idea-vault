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
  const [semanticMode, setSemanticMode] = useState(false)
  const [semanticResults, setSemanticResults] = useState<(Idea & { similarity: number })[] | null>(null)
  const [hybrid, setHybrid] = useState(false)
  const [searchMeta, setSearchMeta] = useState<{ mode: string; stale?: number; missing?: number } | null>(null)
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
        body: JSON.stringify({ query: filter.trim(), mode: hybrid ? 'hybrid' : 'semantic' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Search failed')
      setSemanticResults(json.data)
      setSearchMeta(json.meta ?? null)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function handleSearch() {
    if (semanticMode) {
      runSemanticSearch()
    }
  }

  function toggleSemanticMode() {
    setSemanticMode(m => !m)
    setSemanticResults(null)
    setSearchError(null)
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

  const displayedIdeas = semanticResults ?? filtered

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
        <Sidebar ideaCount={ideas.length} />

        <main style={{
          flex: 1,
          margin: '30px 70px 30px 10px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'auto',
          padding: '2rem 2.5rem',
          minWidth: 0,
          boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
          background: '#95bbfe',
        }}>
          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: '0.25rem' }}>Vault</h1>
          <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginBottom: '1.75rem' }}>
            All your ideas, searchable
          </p>

          {/* Search row */}
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: '1.5rem',
            maxWidth: 620,
            margin: '0 auto 1.5rem',
          }}>
            <input
              type="text"
              value={filter}
              onChange={e => {
                setFilter(e.target.value)
                if (semanticResults) setSemanticResults(null)
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="Search ideas..."
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: 14,
                fontFamily: 'var(--font-serif)',
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                background: '#fff',
                outline: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            />
            <button
              onClick={toggleSemanticMode}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                border: semanticMode ? '1.5px solid #004aac' : '1px solid rgba(0,0,0,0.15)',
                borderRadius: 'var(--radius-xl)',
                background: semanticMode ? 'rgba(0,74,172,0.08)' : '#fff',
                color: semanticMode ? '#004aac' : 'var(--color-ink-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: semanticMode ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              Semantics
            </button>
            {semanticMode && (
              <button
                onClick={() => { setHybrid(h => !h); setSemanticResults(null) }}
                title="Combine meaning-based search with keyword matching on titles and tags"
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  border: hybrid ? '1.5px solid #004aac' : '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-xl)',
                  background: hybrid ? 'rgba(0,74,172,0.08)' : '#fff',
                  color: hybrid ? '#004aac' : 'var(--color-ink-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontWeight: hybrid ? 600 : 400,
                }}
              >
                Hybrid
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={semanticMode && (!filter.trim() || searching)}
              style={{
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                background: '#004aac',
                color: '#fff',
                cursor: (semanticMode && (!filter.trim() || searching)) ? 'not-allowed' : 'pointer',
                opacity: (semanticMode && !filter.trim()) ? 0.5 : 1,
                whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Secondary filters */}
          {semanticResults === null && (
            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}>
              <button
                onClick={() => setFavoritesOnly(f => !f)}
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  border: favoritesOnly ? '1.5px solid #e8a020' : '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-xl)',
                  background: favoritesOnly ? '#fef9ec' : 'rgba(255,255,255,0.6)',
                  color: favoritesOnly ? '#e8a020' : 'var(--color-ink-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {favoritesOnly ? '★ Favorites' : '☆ Favorites'}
              </button>
              <select
                value={categoryFilter ?? ''}
                onChange={e => setCategoryFilter(e.target.value || null)}
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  border: categoryFilter ? '1.5px solid #004aac' : '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-xl)',
                  background: categoryFilter ? 'rgba(0,74,172,0.08)' : 'rgba(255,255,255,0.6)',
                  color: categoryFilter ? '#004aac' : 'var(--color-ink-muted)',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="">All categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {searchError && (
            <div style={{
              fontSize: 12,
              color: '#c0392b',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              {searchError}
            </div>
          )}

          {semanticResults !== null && searchMeta && ((searchMeta.stale ?? 0) > 0 || (searchMeta.missing ?? 0) > 0) && (
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', textAlign: 'center', marginBottom: '1rem' }}>
              {(searchMeta.stale ?? 0) + (searchMeta.missing ?? 0)} idea(s) are not indexed with your current embeddings model and are
              excluded from search. Re-embed them in Settings.
            </div>
          )}

          {/* Results label */}
          <div style={{
            fontSize: 10,
            color: 'rgba(0,0,0,0.4)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            maxWidth: 620,
            margin: '0 auto 0.75rem',
          }}>
            {semanticResults !== null
              ? `${semanticResults.length} ${searchMeta?.mode === 'hybrid' ? 'hybrid' : searchMeta?.mode === 'keyword' ? 'keyword' : 'semantic'} match${semanticResults.length !== 1 ? 'es' : ''} · "${filter}"`
              : `${filtered.length} idea${filtered.length !== 1 ? 's' : ''}`}
          </div>

          {/* Ideas list */}
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            {displayedIdeas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayedIdeas.map((idea, i) => (
                  <div key={idea.id} style={{ position: 'relative' }}>
                    <IdeaRow idea={idea} index={i + 1} onClick={setSelectedIdea} />
                    {semanticResults !== null && 'similarity' in idea && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        right: '1rem',
                        transform: 'translateY(-50%)',
                        fontSize: 10,
                        color: 'var(--color-accent)',
                        background: 'var(--color-accent-light)',
                        padding: '2px 7px',
                        borderRadius: 20,
                        pointerEvents: 'none',
                      }}>
                        {Math.round((idea as Idea & { similarity: number }).similarity * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'rgba(0,0,0,0.35)',
                fontStyle: 'italic',
                fontSize: 14,
              }}>
                {ideas.length === 0 ? 'Your vault is empty — capture your first idea on the Dashboard' : 'No ideas match your search'}
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {selectedIdea && (
        <>
          <div
            onClick={() => setSelectedIdea(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', zIndex: 99 }}
          />
          <IdeaDetail
            floating
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
