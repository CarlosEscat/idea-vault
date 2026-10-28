import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { getUserIdeas } from '@/lib/vault'
import {
  compositeScore, directLinkScore, EDGE_THRESHOLD, pairKey, SEMANTIC_THRESHOLD,
} from '@/lib/graph/scoring'
import type { GraphData, GraphNode, GraphLink } from '@/types'

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
      p_threshold: SEMANTIC_THRESHOLD,
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
          candidatePairs.add(pairKey(idea.id, target.id))
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
          candidatePairs.add(pairKey(ideas[i].id, ideas[j].id))
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
