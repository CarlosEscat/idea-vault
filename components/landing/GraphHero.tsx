'use client'

import { useEffect, useRef, useState } from 'react'

interface Node {
  id: number
  x: number
  y: number
  label: string
  radius: number
  depth: number
}

interface Edge {
  from: number
  to: number
}

const NODES: Node[] = [
  { id: 0, x: 50, y: 50, label: 'Idea Vault', radius: 18, depth: 0.8 },
  { id: 1, x: 22, y: 28, label: 'Machine Learning', radius: 11, depth: 1.2 },
  { id: 2, x: 74, y: 24, label: 'Philosophy', radius: 10, depth: 1.5 },
  { id: 3, x: 78, y: 62, label: 'Creativity', radius: 12, depth: 1.1 },
  { id: 4, x: 28, y: 72, label: 'Physics', radius: 10, depth: 1.4 },
  { id: 5, x: 50, y: 22, label: 'Cognition', radius: 9, depth: 1.6 },
  { id: 6, x: 14, y: 52, label: 'Writing', radius: 9, depth: 1.3 },
  { id: 7, x: 62, y: 80, label: 'Systems', radius: 10, depth: 1.2 },
  { id: 8, x: 88, y: 42, label: 'Biology', radius: 8, depth: 1.7 },
  { id: 9, x: 38, y: 88, label: 'Mathematics', radius: 9, depth: 1.5 },
]

const EDGES: Edge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 0, to: 3 },
  { from: 0, to: 4 },
  { from: 0, to: 5 },
  { from: 0, to: 6 },
  { from: 0, to: 7 },
  { from: 1, to: 5 },
  { from: 1, to: 9 },
  { from: 2, to: 5 },
  { from: 2, to: 8 },
  { from: 3, to: 7 },
  { from: 3, to: 8 },
  { from: 4, to: 9 },
  { from: 5, to: 6 },
]

export default function GraphHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      setMouse({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      })
    }

    el.addEventListener('mousemove', handleMove)
    return () => el.removeEventListener('mousemove', handleMove)
  }, [])

  const getDisplacedPos = (node: Node) => {
    const dx = (mouse.x - 50) * 0.015 * node.depth
    const dy = (mouse.y - 50) * 0.015 * node.depth
    return { x: node.x + dx, y: node.y + dy }
  }

  const positions = NODES.map(n => ({ id: n.id, ...getDisplacedPos(n) }))

  const getPos = (id: number) => positions.find(p => p.id === id) ?? { x: 0, y: 0 }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
      style={{ cursor: 'default' }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <filter id="blur-glow">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {EDGES.map((edge, i) => {
          const from = getPos(edge.from)
          const to = getPos(edge.to)
          const isActive = hoveredNode === edge.from || hoveredNode === edge.to
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isActive ? '#38bdf8' : '#bae6fd'}
              strokeWidth={isActive ? '0.35' : '0.2'}
              strokeOpacity={isActive ? 0.9 : 0.6}
              style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
            />
          )
        })}

        {/* Nodes */}
        {NODES.map(node => {
          const pos = getPos(node.id)
          const isHovered = hoveredNode === node.id
          const isCentral = node.id === 0
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', transition: 'transform 0.08s ease-out' }}
            >
              {/* Glow ring */}
              {(isHovered || isCentral) && (
                <circle
                  r={node.radius * 1.8}
                  fill="url(#nodeGlow)"
                  style={{ transition: 'r 0.2s' }}
                />
              )}
              {/* Node circle */}
              <circle
                r={node.radius * (isHovered ? 1.15 : 1)}
                fill={isCentral ? '#0ea5e9' : isHovered ? '#e0f2fe' : '#f0f9ff'}
                stroke={isCentral ? '#0284c7' : isHovered ? '#38bdf8' : '#bae6fd'}
                strokeWidth={isCentral ? '0.5' : '0.3'}
                filter={isCentral ? 'url(#blur-glow)' : undefined}
                style={{ transition: 'r 0.15s, fill 0.15s, stroke 0.15s' }}
              />
              {/* Center dot */}
              {!isCentral && (
                <circle
                  r={1.2}
                  fill={isHovered ? '#0ea5e9' : '#7dd3fc'}
                  style={{ transition: 'fill 0.15s' }}
                />
              )}
              {/* Label */}
              <text
                y={node.radius + 3.5}
                textAnchor="middle"
                fontSize={isCentral ? '3.2' : '2.4'}
                fontWeight={isCentral ? '700' : '400'}
                fill={isCentral ? '#0c4a6e' : isHovered ? '#0369a1' : '#64748b'}
                style={{ transition: 'fill 0.15s', pointerEvents: 'none' }}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
