'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphLink } from '@/types'

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount))
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount))
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

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

interface KnowledgeGraphProps {
  data: GraphData
  onNodeClick: (node: GraphNode) => void
}

export default function KnowledgeGraph({ data, onNodeClick }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const renderGraph = useCallback(() => {
    if (!svgRef.current || data.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Defs for filters and gradients
    const defs = svg.append('defs')

    // Drop shadow filter
    const shadow = defs.append('filter').attr('id', 'node-shadow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    shadow.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 4).attr('flood-color', 'rgba(0,0,0,0.18)')

    // Glow filter for hover
    const glow = defs.append('filter').attr('id', 'node-glow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
    glow.append('feGaussianBlur').attr('stdDeviation', 6).attr('result', 'blur')
    const glowMerge = glow.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'blur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Per-category radial gradients
    Object.entries(CATEGORY_COLORS).forEach(([cat, color]) => {
      const grad = defs.append('radialGradient')
        .attr('id', `grad-${cat}`)
        .attr('cx', '35%').attr('cy', '35%').attr('r', '65%')
      grad.append('stop').attr('offset', '0%').attr('stop-color', lighten(color, 0.45))
      grad.append('stop').attr('offset', '100%').attr('stop-color', color)
    })

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Degree map for node sizing
    const degree: Record<string, number> = {}
    data.nodes.forEach(n => { degree[n.id] = 0 })
    data.links.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source as string
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target as string
      degree[s] = (degree[s] ?? 0) + 1
      degree[t] = (degree[t] ?? 0) + 1
    })
    const nodeRadius = (d: GraphNode) => 10 + (degree[d.id] ?? 0) * 3.5

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(d => 160 - (d as GraphLink).strength * 80))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => nodeRadius(d as GraphNode) + 18))

    // Curved links
    const link = g.append('g')
      .selectAll('path')
      .data(data.links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(204,251,241,0.6)')
      .attr('stroke-width', d => 1.5 + (d as GraphLink).strength * 2.5)
      .attr('stroke-opacity', d => 0.5 + (d as GraphLink).strength * 0.45)

    // Nodes group
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(data.nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onNodeClick(d))

    // Node circle with gradient fill
    node.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => `url(#grad-${d.category ?? 'other'})`)
      .attr('stroke', 'rgba(255,255,255,0.25)')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#node-shadow)')

    // Node label (rendered first so we can measure)
    const labelText = node.append('text')
      .text(d => d.title.length > 22 ? d.title.slice(0, 20) + '…' : d.title)
      .attr('y', d => nodeRadius(d) + 16)
      .attr('text-anchor', 'middle')
      .style('font-family', "var(--font-sans, system-ui, sans-serif)")
      .style('font-size', '10.5px')
      .style('font-weight', '500')
      .style('fill', '#CCFBF1')
      .style('pointer-events', 'none')

    // Label background pill — inserted before text so it renders behind
    node.insert('rect', 'text')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(19,78,74,0.7)')
      .each(function (d) {
        const textEl = d3.select(this.parentNode as Element).select<SVGTextElement>('text').node()
        const w = textEl ? textEl.getBBox().width + 10 : 80
        d3.select(this)
          .attr('x', -w / 2)
          .attr('width', w)
          .attr('height', 16)
          .attr('y', nodeRadius(d) + 4)
      })
      .style('pointer-events', 'none')

    void labelText // referenced above

    // Hover effect
    node.on('mouseenter', function (_, d) {
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('r', nodeRadius(d) + 3)
        .attr('filter', 'url(#node-glow)')
        .attr('stroke-width', 3)
    })
    node.on('mouseleave', function (_, d) {
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('r', nodeRadius(d))
        .attr('filter', 'url(#node-shadow)')
        .attr('stroke-width', 2.5)
    })

    // Drag
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null
      })

    node.call(drag)

    // Curved path helper
    const linkPath = (d: GraphLink) => {
      const s = d.source as GraphNode
      const t = d.target as GraphNode
      const dx = (t.x ?? 0) - (s.x ?? 0)
      const dy = (t.y ?? 0) - (s.y ?? 0)
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.4
      return `M${s.x ?? 0},${s.y ?? 0}A${dr},${dr} 0 0,1 ${t.x ?? 0},${t.y ?? 0}`
    }

    simulation.on('tick', () => {
      link.attr('d', d => linkPath(d as GraphLink))
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => { simulation.stop() }
  }, [data, onNodeClick])

  useEffect(() => {
    const cleanup = renderGraph()
    return () => { if (cleanup) cleanup() }
  }, [renderGraph])

  // Resize handling
  useEffect(() => {
    const handleResize = () => renderGraph()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderGraph])

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #134E4A 0%, #0D9488 100%)',
      }}
    />
  )
}
