import { describe, expect, it } from 'vitest'
import { keywordSearch, rankByKeywords } from '@/lib/vault/retrieval'

const base = { category: 'other', tags: [] as string[], created_at: '2026-01-01' }

describe('rankByKeywords', () => {
  const ideas = [
    { ...base, title: 'Gardening notes', tags: ['plants'], created_at: '2026-01-03' },
    { ...base, title: 'Embedding drift', tags: ['embeddings'], created_at: '2026-01-01' },
    { ...base, title: 'Index funds', category: 'investing', created_at: '2026-01-02' },
  ]
  it('ranks tag and title matches first', () => {
    expect(rankByKeywords('worried about embedding drift', ideas, 1)[0].title).toBe('Embedding drift')
  })
  it('falls back to recency with no matches', () => {
    expect(rankByKeywords('zzzz', ideas, 2).map(i => i.title)).toEqual(['Gardening notes', 'Index funds'])
  })
})

describe('keywordSearch', () => {
  const ideas = [
    { title: 'A', summary: 'safe model output', content: '', tags: [] },
    { title: 'B', summary: 'cooking', content: '', tags: [] },
  ]
  it('returns only matches with a score', () => {
    const r = keywordSearch('model output safety', ideas)
    expect(r.map(i => i.title)).toEqual(['A'])
    expect(r[0].similarity).toBeGreaterThan(0)
  })
})
