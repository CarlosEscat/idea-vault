'use client'

import { useState, useEffect } from 'react'
import Markdown from '@/components/Markdown'
import Sidebar from '@/components/layout/Sidebar'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import IdeaDetail from '@/components/vault/IdeaDetail'
import type { GraphData, GraphNode, Idea } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  business: '#534AB7',
  technology: '#185FA5',
  investing: '#1D9E75',
  creativity: '#D85A30',
  productivity: '#BA7517',
  personal: '#D4537E',
  research: '#639922',
  other: '#888780',
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [overviewMd, setOverviewMd] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [overviewOpen, setOverviewOpen] = useState(true)

  useEffect(() => {
    async function load() {
      const [graphRes, vaultRes, metaRes] = await Promise.all([
        fetch('/api/ideas/graph'),
        fetch('/api/vault'),
        fetch('/api/vault/meta'),
      ])
      const graphJson = await graphRes.json()
      const vaultJson = await vaultRes.json()
      const metaJson = await metaRes.json()

      if (graphJson.data) setGraphData(graphJson.data)
      if (vaultJson.data) setIdeas(vaultJson.data)
      if (metaJson.data?.overview_md) setOverviewMd(metaJson.data.overview_md)
      setLoading(false)
    }
    load()
  }, [])

  function handleNodeClick(node: GraphNode) {
    const idea = ideas.find(i => i.id === node.id)
    if (idea) setSelectedIdea(idea)
  }

  const categories = [...new Set(graphData.nodes.map(n => n.category))].sort()

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
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          margin: '30px 70px 30px 10px',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Knowledge Graph card */}
          <div style={{
            flexGrow: overviewOpen ? 3 : 1,
            flexShrink: 1,
            flexBasis: 0,
            transition: 'flex-grow 0.3s ease',
            borderRadius: 'var(--radius-xl)',
            background: '#c9fddc',
            border: '1.5px solid #b4cbff',
            boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem 0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Knowledge Graph</h2>
                {!loading && (
                  <p style={{ fontSize: 11, color: 'var(--color-ink-faint)', letterSpacing: '0.4px' }}>
                    {graphData.nodes.length} nodes · {graphData.links.length} connections
                  </p>
                )}
              </div>

              {categories.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {categories.map(cat => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other,
                        display: 'inline-block',
                      }} />
                      <span style={{ fontSize: 10, color: 'var(--color-ink-muted)' }}>{cat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--color-ink-faint)',
                  fontSize: 13,
                }}>
                  Loading graph...
                </div>
              ) : graphData.nodes.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  flexDirection: 'column',
                  gap: 8,
                  color: 'var(--color-ink-faint)',
                }}>
                  <span style={{ fontSize: 32 }}>◎</span>
                  <span style={{ fontSize: 13 }}>No ideas yet — capture your first thought to see the graph</span>
                </div>
              ) : (
                <KnowledgeGraph data={graphData} onNodeClick={handleNodeClick} />
              )}
            </div>
          </div>

          {/* Overview card */}
          <div style={{
            flexGrow: overviewOpen ? 2 : 0,
            flexShrink: overviewOpen ? 1 : 0,
            flexBasis: overviewOpen ? 0 : 48,
            minHeight: overviewOpen ? 0 : 48,
            maxHeight: overviewOpen ? undefined : 48,
            borderRadius: 'var(--radius-xl)',
            background: '#95bbfe',
            boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'flex-grow 0.3s ease, flex-basis 0.3s ease, max-height 0.3s ease',
          }}>
            <div style={{
              padding: '0 1.5rem',
              height: 48,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Overview</h2>
              <button
                onClick={() => setOverviewOpen(o => !o)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 6,
                  color: 'var(--color-ink-muted)',
                  fontSize: 14,
                  lineHeight: 1,
                  transform: overviewOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.3s ease',
                }}
                aria-label={overviewOpen ? 'Collapse overview' : 'Expand overview'}
              >
                ▾
              </button>
            </div>
            {overviewOpen && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
                {loading ? (
                  <span style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>Loading…</span>
                ) : overviewMd ? (
                  <div style={{ fontSize: 12, lineHeight: 1.75, color: 'var(--color-ink)' }}>
                    <Markdown>{overviewMd}</Markdown>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                    No overview available yet. Add more ideas to generate insights.
                  </div>
                )}
              </div>
            )}
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
