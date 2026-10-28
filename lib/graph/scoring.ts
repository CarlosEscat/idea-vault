import type { Idea } from '@/types'

// Weights of the four signals in the composite edge score (sum to 1).
export const WEIGHT_DIRECT_LINK = 0.35
export const WEIGHT_SEMANTIC = 0.40
export const WEIGHT_TAG_OVERLAP = 0.15
export const WEIGHT_CATEGORY_AFFINITY = 0.10

/** Minimum composite score for an edge to be drawn (explicit links are always drawn). */
export const EDGE_THRESHOLD = 0.25
/** Minimum pgvector cosine similarity for a pair to be fetched at all. */
export const SEMANTIC_THRESHOLD = 0.3

const MUTUAL_LINK_SCORE = 1.0
const ONE_WAY_LINK_SCORE = 0.6
const SAME_CATEGORY_OVERLAP_BONUS = 0.2
const SAME_CATEGORY_AFFINITY = 0.3

type Scorable = Pick<Idea, 'slug' | 'connections' | 'tags' | 'category'>

export function directLinkScore(a: Scorable, b: Scorable): number {
  const aLinksB = a.connections.includes(b.slug)
  const bLinksA = b.connections.includes(a.slug)
  return aLinksB && bLinksA ? MUTUAL_LINK_SCORE : (aLinksB || bLinksA ? ONE_WAY_LINK_SCORE : 0)
}

export function sourceOverlapScore(a: Scorable, b: Scorable): number {
  const sharedTags = a.tags.filter(t => b.tags.includes(t)).length
  const maxTags = Math.max(a.tags.length, b.tags.length, 1)
  const categoryBonus = a.category === b.category ? SAME_CATEGORY_OVERLAP_BONUS : 0
  return Math.min(sharedTags / maxTags + categoryBonus, 1.0)
}

export function typeAffinityScore(a: Scorable, b: Scorable): number {
  return a.category === b.category ? SAME_CATEGORY_AFFINITY : 0
}

export function compositeScore(a: Scorable, b: Scorable, semanticSimilarity: number): number {
  return (
    directLinkScore(a, b) * WEIGHT_DIRECT_LINK +
    semanticSimilarity * WEIGHT_SEMANTIC +
    sourceOverlapScore(a, b) * WEIGHT_TAG_OVERLAP +
    typeAffinityScore(a, b) * WEIGHT_CATEGORY_AFFINITY
  )
}

/** Order-independent key for an unordered pair of idea ids. */
export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`
}
