const TAG_COLORS = ['#ed5f5f','#f0923b','#4caf7d','#5b8af0','#9b6cf5','#e060b0','#26bfbd','#e8a838']

export function tagColor(tag: string): string {
  const hash = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return TAG_COLORS[hash % TAG_COLORS.length]
}
