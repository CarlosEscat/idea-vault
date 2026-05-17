'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphLink } from '@/types'

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

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(d => 200 - (d as GraphLink).strength * 120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    // Links — visual weight reflects composite strength
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', 'rgba(26,26,24,0.5)')
      .attr('stroke-width', d => 0.5 + (d as GraphLink).strength * 2.5)
      .attr('stroke-opacity', d => 0.1 + (d as GraphLink).strength * 0.7)

    // Nodes group
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(data.nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onNodeClick(d))

    // Node circle
    node.append('circle')
      .attr('r', d => 6 + (d.tags?.length ?? 0) * 1.5)
      .attr('fill', d => CATEGORY_COLORS[d.category] ?? CATEGORY_COLORS.other)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9)

    // Node label
    node.append('text')
      .text(d => d.title.length > 28 ? d.title.slice(0, 26) + '…' : d.title)
      .attr('dy', d => -(10 + (d.tags?.length ?? 0) * 1.5))
      .attr('text-anchor', 'middle')
      .style('font-family', "var(--font-serif, system-ui, sans-serif)")
      .style('font-size', '11px')
      .style('fill', '#6b6b63')
      .style('pointer-events', 'none')

    // Hover effect
    node.on('mouseenter', function (_, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('r', 8 + (d.tags?.length ?? 0) * 1.5)
        .attr('opacity', 1)

      d3.select(this).select('text')
        .transition()
        .duration(150)
        .style('fill', '#1a1a18')
        .style('font-weight', '500')
    })
    node.on('mouseleave', function (_, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('r', 6 + (d.tags?.length ?? 0) * 1.5)
        .attr('opacity', 0.9)

      d3.select(this).select('text')
        .transition()
        .duration(150)
        .style('fill', '#6b6b63')
        .style('font-weight', '400')
    })

    // Drag
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)

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
        background: 'var(--color-paper)',
      }}
    />
  )
}
