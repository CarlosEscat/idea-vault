import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export const CANDIDATE_K = 8
const VECTOR_THRESHOLD = 0.2
const MIN_WORD_LENGTH = 4

export interface Candidate {
  slug: string
  title: string
  category: string
  tags: string[]
  summary: string
}

export type CandidateMethod = 'vector' | 'keyword'

interface CandidateMeta extends Omit<Candidate, 'summary'> {
  summary_encrypted: string
  created_at: string
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= MIN_WORD_LENGTH))
}

/** Tag/title/category overlap with the raw note; ties (and zero scores) fall back to recency. */
export function rankByKeywords<T extends { title: string; category: string; tags: string[]; created_at: string }>(
  rawThought: string,
  ideas: T[],
  k: number
): T[] {
  const noteWords = words(rawThought)
  const scored = ideas.map(idea => {
    let score = 0
    for (const tag of idea.tags) if (noteWords.has(tag.toLowerCase())) score += 2
    for (const w of words(idea.title)) if (noteWords.has(w)) score += 1
    if (noteWords.has(idea.category.toLowerCase())) score += 1
    return { idea, score }
  })
  scored.sort((a, b) => b.score - a.score || b.idea.created_at.localeCompare(a.idea.created_at))
  return scored.slice(0, k).map(s => s.idea)
}

/**
 * Retrieval step for capture: finds the ideas most related to the raw note so only
 * those (not the whole vault) are shown to the model as candidate connections.
 */
export async function findCandidates(
  userId: string,
  rawThought: string,
  queryVector: number[] | null,
  k = CANDIDATE_K
): Promise<{ candidates: Candidate[]; method: CandidateMethod }> {
  const supabase = await createServerClientInstance()

  if (queryVector) {
    const { data: matches, error } = await supabase.rpc('search_ideas', {
      p_user_id: userId,
      p_query_embedding: `[${queryVector.join(',')}]`,
      p_limit: k,
      p_threshold: VECTOR_THRESHOLD,
    })
    if (error) {
      console.error('Candidate vector search failed, falling back to keywords:', error)
    } else if (matches && matches.length > 0) {
      const order = new Map((matches as { id: string }[]).map((m, i) => [m.id, i]))
      const { data: rows } = await supabase
        .from('ideas')
        .select('id, slug, title, category, tags, summary_encrypted')
        .eq('user_id', userId)
        .in('id', [...order.keys()])
      const candidates = (rows ?? [])
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
        .map(r => ({
          slug: r.slug, title: r.title, category: r.category, tags: r.tags,
          summary: decrypt(r.summary_encrypted, userId),
        }))
      return { candidates, method: 'vector' }
    }
  }

  const { data, error } = await supabase
    .from('ideas')
    .select('slug, title, category, tags, summary_encrypted, created_at')
    .eq('user_id', userId)
  if (error) throw new Error(`Failed to load ideas for retrieval: ${error.message}`)
  const top = rankByKeywords(rawThought, (data ?? []) as CandidateMeta[], k)
  return {
    candidates: top.map(r => ({
      slug: r.slug, title: r.title, category: r.category, tags: r.tags,
      summary: decrypt(r.summary_encrypted, userId),
    })),
    method: 'keyword',
  }
}

export function formatCandidates(candidates: Candidate[]): string {
  if (candidates.length === 0) return '(none — the vault has no related ideas yet)'
  return candidates
    .map(c => `- ${c.slug} | ${c.title} | ${c.category} | ${c.tags.join(', ')}\n  ${c.summary}`)
    .join('\n')
}
