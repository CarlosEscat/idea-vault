import { describe, expect, it } from 'vitest'
import {
  CaptureValidationError, filterConnections, parseCaptureResponse, slugify, uniqueSlug,
} from '@/lib/vault/schema'

const valid = {
  slug: 'my-idea', title: 'My Idea', category: 'technology', tags: ['a'], summary: 'One line.',
  content: '# My Idea\n\nSome real content here.', connections: ['x'], suggestedGaps: ['gap'],
}

describe('parseCaptureResponse', () => {
  it('accepts valid JSON, including inside a code fence', () => {
    expect(parseCaptureResponse(JSON.stringify(valid)).slug).toBe('my-idea')
    expect(parseCaptureResponse('```json\n' + JSON.stringify(valid) + '\n```').title).toBe('My Idea')
  })
  it('normalises category case', () => {
    expect(parseCaptureResponse(JSON.stringify({ ...valid, category: ' Technology ' })).category).toBe('technology')
  })
  it('defaults optional arrays', () => {
    const { tags, connections, suggestedGaps, ...rest } = valid
    void tags; void connections; void suggestedGaps
    expect(parseCaptureResponse(JSON.stringify(rest)).connections).toEqual([])
  })
  it.each([
    ['not json', 'nope'],
    ['bad category', JSON.stringify({ ...valid, category: 'sports' })],
    ['missing title', JSON.stringify({ ...valid, title: '' })],
    ['too many connections', JSON.stringify({ ...valid, connections: ['a', 'b', 'c', 'd', 'e', 'f'] })],
    ['summary too long', JSON.stringify({ ...valid, summary: 'x'.repeat(301) })],
    ['content too long', JSON.stringify({ ...valid, content: 'x'.repeat(8001) })],
  ])('rejects %s', (_name, text) => {
    expect(() => parseCaptureResponse(text)).toThrow(CaptureValidationError)
  })
})

describe('filterConnections', () => {
  const existing = new Set(['a', 'b', 'c'])
  it('drops unknown slugs, self links and duplicates', () => {
    expect(filterConnections(['a', 'ghost', 'self', 'a', 'b'], new Set([...existing, 'self']), 'self'))
      .toEqual({ kept: ['a', 'b'], dropped: ['ghost', 'self', 'a'] })
  })
})

describe('slugs', () => {
  it('slugifies', () => {
    expect(slugify('Café Ideas & More!')).toBe('cafe-ideas-more')
    expect(slugify('***')).toBe('idea')
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
  it('makes slugs unique', () => {
    expect(uniqueSlug('Idea', new Set())).toBe('idea')
    expect(uniqueSlug('Idea', new Set(['idea']))).toBe('idea-2')
    expect(uniqueSlug('Idea', new Set(['idea', 'idea-2']))).toBe('idea-3')
  })
  it('keeps the suffixed slug within the length limit', () => {
    const long = 'x'.repeat(80)
    const result = uniqueSlug(long, new Set([long]))
    expect(result.length).toBeLessThanOrEqual(80)
    expect(result.endsWith('-2')).toBe(true)
  })
})
