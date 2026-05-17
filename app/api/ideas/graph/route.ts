import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { getUserIdeas } from '@/lib/vault'
import type { GraphData, GraphNode, GraphLink, Idea } from '@/types'

const EDGE_THRESHOLD = 0.25

// ─── Scoring signals ──────────────────────────────────────────────────────────

function directLinkScore(a: Idea, b: Idea): number {
  const aLinksB = a.connections.includes(b.slug)
  const bLinksA = b.connections.includes(a.slug)
  return aLinksB && bLinksA ? 1.0 : (aLinksB || bLinksA ? 0.6 : 0)
}

function sourceOverlapScore(a: Idea, b: Idea): number {
  const sharedTags = a.tags.filter(t => b.tags.includes(t)).length
  const maxTags = Math.max(a.tags.length, b.tags.length, 1)
  const tagScore = sharedTags / maxTags
  const categoryBonus = a.category === b.category ? 0.2 : 0
  return Math.min(tagScore + categoryBonus, 1.0)
}

function typeAffinityScore(a: Idea, b: Idea): number {
  return a.category === b.category ? 0.3 : 0
}

function compositeScore(a: Idea, b: Idea, semanticSimilarity: number): number {
  return (
    directLinkScore(a, b) * 0.35 +
    semanticSimilarity * 0.40 +
    sourceOverlapScore(a, b) * 0.15 +
    typeAffinityScore(a, b) * 0.10
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ideas = await getUserIdeas(user.id)

    if (ideas.length === 0) {
      return NextResponse.json({ data: { nodes: [], links: [] } })
    }

    // Build ID → Idea map for fast lookups
    const ideaById = new Map(ideas.map(i => [i.id, i]))

    // Fetch pairwise semantic similarities from pgvector
    const semanticMap = new Map<string, number>()
    const { data: pairs } = await supabase.rpc('get_pairwise_similarities', {
      p_user_id: user.id,
      p_threshold: 0.3,
    }) as { data: { id_a: string; id_b: string; similarity: number }[] | null }

    if (pairs) {
      for (const pair of pairs) {
        semanticMap.set(`${pair.id_a}:${pair.id_b}`, pair.similarity)
      }
    }

    // Compute composite score for all candidate pairs
    const links: GraphLink[] = []

    // Candidate pairs: direct links + semantic hits + all pairs for overlap check
    const candidatePairs = new Set<string>()

    // Add pairs with direct links
    for (const idea of ideas) {
      for (const connSlug of idea.connections) {
        const target = ideas.find(i => i.slug === connSlug)
        if (target) {
          const key = idea.id < target.id
            ? `${idea.id}:${target.id}`
            : `${target.id}:${idea.id}`
          candidatePairs.add(key)
        }
      }
    }

    // Add pairs with semantic similarity
    for (const key of semanticMap.keys()) {
      candidatePairs.add(key)
    }

    // For small vaults (<= 100 ideas), check all pairs for source overlap
    if (ideas.length <= 100) {
      for (let i = 0; i < ideas.length; i++) {
        for (let j = i + 1; j < ideas.length; j++) {
          const key = `${ideas[i].id}:${ideas[j].id}`
          candidatePairs.add(key)
        }
      }
    }

    for (const key of candidatePairs) {
      const [idA, idB] = key.split(':')
      const a = ideaById.get(idA)
      const b = ideaById.get(idB)
      if (!a || !b) continue

      const semantic = semanticMap.get(key) ?? 0
      const score = compositeScore(a, b, semantic)
      const hasDirectLink = directLinkScore(a, b) > 0

      if (hasDirectLink || score >= EDGE_THRESHOLD) {
        links.push({ source: a.id, target: b.id, strength: Math.max(score, hasDirectLink ? 0.25 : 0) })
      }
    }

    const nodes: GraphNode[] = ideas.map(idea => ({
      id: idea.id,
      slug: idea.slug,
      title: idea.title,
      category: idea.category,
      tags: idea.tags,
    }))

    const graphData: GraphData = { nodes, links }

    return NextResponse.json({ data: graphData })
  } catch (err) {
    console.error('Graph data error:', err)
    return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 })
  }
}
