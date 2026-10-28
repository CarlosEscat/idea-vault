import { describe, expect, it } from 'vitest'
import {
  compositeScore, directLinkScore, pairKey, sourceOverlapScore, typeAffinityScore,
  WEIGHT_CATEGORY_AFFINITY, WEIGHT_DIRECT_LINK, WEIGHT_SEMANTIC, WEIGHT_TAG_OVERLAP,
} from '@/lib/graph/scoring'

const idea = (slug: string, o: Partial<{ connections: string[]; tags: string[]; category: string }> = {}) =>
  ({ slug, connections: [], tags: [], category: 'other', ...o })

describe('graph scoring', () => {
  it('weights sum to 1', () => {
    expect(WEIGHT_DIRECT_LINK + WEIGHT_SEMANTIC + WEIGHT_TAG_OVERLAP + WEIGHT_CATEGORY_AFFINITY).toBeCloseTo(1)
  })
  it('scores direct links: mutual > one-way > none', () => {
    expect(directLinkScore(idea('a', { connections: ['b'] }), idea('b', { connections: ['a'] }))).toBe(1)
    expect(directLinkScore(idea('a', { connections: ['b'] }), idea('b'))).toBe(0.6)
    expect(directLinkScore(idea('a'), idea('b'))).toBe(0)
  })
  it('scores tag overlap with a same-category bonus, capped at 1', () => {
    expect(sourceOverlapScore(idea('a', { tags: ['x', 'y'], category: 'c' }), idea('b', { tags: ['x'], category: 'd' }))).toBeCloseTo(0.5)
    expect(sourceOverlapScore(idea('a', { tags: ['x'], category: 'c' }), idea('b', { tags: ['x'], category: 'c' }))).toBe(1)
  })
  it('gives category affinity only for the same category', () => {
    expect(typeAffinityScore(idea('a', { category: 'c' }), idea('b', { category: 'c' }))).toBe(0.3)
    expect(typeAffinityScore(idea('a', { category: 'c' }), idea('b', { category: 'd' }))).toBe(0)
  })
  it('combines the four signals', () => {
    const a = idea('a', { connections: ['b'], tags: ['x'], category: 'c' })
    const b = idea('b', { connections: ['a'], tags: ['x'], category: 'c' })
    expect(compositeScore(a, b, 0.5)).toBeCloseTo(1 * 0.35 + 0.5 * 0.4 + 1 * 0.15 + 0.3 * 0.1)
  })
  it('pairKey is order independent', () => {
    expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'))
  })
})
