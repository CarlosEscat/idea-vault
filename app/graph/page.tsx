'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import IdeaDetail from '@/components/vault/IdeaDetail'
import OverviewPanel from '@/components/vault/OverviewPanel'
import type { GraphData, GraphNode, Idea } from '@/types'

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [graphRes, vaultRes] = await Promise.all([
        fetch('/api/ideas/graph'),
        fetch('/api/vault'),
      ])
      const graphJson = await graphRes.json()
      const vaultJson = await vaultRes.json()

      if (graphJson.data) setGraphData(graphJson.data)
      if (vaultJson.data) setIdeas(vaultJson.data)
      setLoading(false)
    }
    load()
  }, [])

  function handleNodeClick(node: GraphNode) {
    const idea = ideas.find(i => i.id === node.id)
    if (idea) setSelectedIdea(idea)
  }

  // Unique categories for legend
  const categories = [...new Set(graphData.nodes.map(n => n.category))].sort()

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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar ideaCount={ideas.length} />

      <OverviewPanel />

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Header overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '1.5rem 2rem',
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
              Knowledge graph
            </h1>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-ink-faint)',
            }}>
              {graphData.nodes.length} nodes · {graphData.links.length} connections
            </p>
          </div>

          {/* Legend */}
          {categories.length > 0 && (
            <div style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}>
              {categories.map(cat => (
                <div key={cat} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other,
                    display: 'inline-block',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--color-ink-muted)',
                  }}>
                    {cat}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graph */}
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-ink-faint)',
            fontFamily: 'var(--font-mono)',
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              No ideas yet — capture your first thought to see the graph
            </span>
          </div>
        ) : (
          <KnowledgeGraph data={graphData} onNodeClick={handleNodeClick} />
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
