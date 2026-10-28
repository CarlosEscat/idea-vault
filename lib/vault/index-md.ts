export interface IndexEntry {
  slug: string
  category: string
  summary: string
}

/** Pure builder for index.md: one section per category, entries sorted by slug. */
export function buildIndexMd(entries: IndexEntry[]): string {
  if (entries.length === 0) return '# Idea Vault Index\n\n*No ideas yet. Add your first thought!*'
  const byCategory = new Map<string, string[]>()
  for (const e of [...entries].sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))) {
    byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), `- [[${e.slug}]]: ${e.summary}`])
  }
  const sections = [...byCategory.entries()].map(
    ([category, lines]) => `## ${category[0].toUpperCase()}${category.slice(1)}\n${lines.join('\n')}`
  )
  return `# Idea Vault Index\n\n${sections.join('\n\n')}`
}
