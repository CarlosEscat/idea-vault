'use client'

import type { Idea } from '@/types'
import { tagColor } from '@/lib/tagColor'

interface IdeaRowProps {
  idea: Idea
  index: number
  onClick: (idea: Idea) => void
}

export default function IdeaRow({ idea, index, onClick }: IdeaRowProps) {
  return (
    <div
      onClick={() => onClick(idea)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '0.65rem 1rem',
        borderBottom: '0.5px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-paper-warm)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Index */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--color-ink-faint)',
        minWidth: 28,
        paddingTop: 3,
        flexShrink: 0,
      }}>
        {String(index).padStart(3, '0')}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
          {idea.title}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--color-ink-muted)',
          lineHeight: 1.5,
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {idea.summary}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {idea.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 20,
              background: tagColor(tag),
              border: 'none',
              color: '#ffffff',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        paddingTop: 3,
      }}>
        {idea.is_favorite && (
          <span style={{ fontSize: 12, lineHeight: 1, color: '#f5c518' }} title="Favorite">★</span>
        )}
        {idea.connections.length > 0 && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-ink-faint)',
          }}>
            ⟷ {idea.connections.length}
          </span>
        )}
      </div>
    </div>
  )
}
