'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Idea, IdeaVersion } from '@/types'
import { tagColor } from '@/lib/tagColor'

const CATEGORIES = ['business', 'technology', 'investing', 'creativity', 'productivity', 'personal', 'research', 'other']

interface IdeaDetailProps {
  idea: Idea
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (idea: Idea) => void
  floating?: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontFamily: 'var(--font-serif)',
  fontSize: 14,
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  background: '#fff',
  color: 'var(--color-ink)',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function IdeaDetail({ idea, onClose, onDelete, onUpdate, floating = false }: IdeaDetailProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [favoriting, setFavoriting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<IdeaVersion[] | null>(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Edit draft state
  const [draftTitle, setDraftTitle] = useState(idea.title)
  const [draftContent, setDraftContent] = useState(idea.content)
  const [draftCategory, setDraftCategory] = useState(idea.category)
  const [draftTags, setDraftTags] = useState(idea.tags.join(', '))
  const [draftConnections, setDraftConnections] = useState(idea.connections.join(', '))

  async function toggleFavorite() {
    setFavoriting(true)
    try {
      const res = await fetch(`/api/ideas/${idea.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !idea.is_favorite }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onUpdate(json.data.idea)
    } catch {
      // silently ignore — star will revert since idea prop didn't change
    } finally {
      setFavoriting(false)
    }
  }

  async function openHistory() {
    setShowHistory(true)
    if (versions !== null) return
    setVersionsLoading(true)
    try {
      const res = await fetch(`/api/ideas/${idea.slug}/versions`)
      const json = await res.json()
      setVersions(json.data ?? [])
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  async function restoreVersion(version: IdeaVersion) {
    setRestoring(true)
    try {
      const res = await fetch(`/api/ideas/${idea.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: version.title,
          content: version.content,
          summary: version.summary,
          category: version.category,
          tags: version.tags,
          connections: version.connections,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onUpdate(json.data.idea)
      setVersions(null)  // invalidate cache — restore created a new snapshot
      setShowHistory(false)
      setExpandedVersionId(null)
    } catch {
      // leave history open so user can try again
    } finally {
      setRestoring(false)
    }
  }

  function startEdit() {
    setDraftTitle(idea.title)
    setDraftContent(idea.content)
    setDraftCategory(idea.category)
    setDraftTags(idea.tags.join(', '))
    setDraftConnections(idea.connections.join(', '))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/ideas/${idea.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle.trim(),
          content: draftContent,
          category: draftCategory,
          tags: draftTags.split(',').map(t => t.trim()).filter(Boolean),
          connections: draftConnections.split(',').map(c => c.trim()).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      onUpdate(json.data.idea)
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/ideas/${idea.slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      onDelete(idea.id)
      onClose()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div style={floating ? {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 580,
      maxHeight: '85vh',
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      overflow: 'hidden',
    } : {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 480,
      background: '#fff',
      borderLeft: '0.5px solid var(--color-border)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '0.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-ink-faint)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {editing ? (
              <select
                value={draftCategory}
                onChange={e => setDraftCategory(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  border: '0.5px solid var(--color-border-strong)',
                  borderRadius: 4,
                  background: '#fff',
                  color: 'var(--color-ink-faint)',
                  cursor: 'pointer',
                  padding: '1px 4px',
                }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : idea.category}
          </div>
          {editing ? (
            <input
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              style={{ ...inputStyle, fontSize: 16, fontWeight: 500 }}
            />
          ) : (
            <h2 style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.3 }}>{idea.title}</h2>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={toggleFavorite}
            disabled={favoriting}
            title={idea.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 16,
              color: idea.is_favorite ? '#e8a020' : 'var(--color-ink-faint)',
              cursor: favoriting ? 'not-allowed' : 'pointer',
              padding: '4px',
              lineHeight: 1,
              opacity: favoriting ? 0.5 : 1,
            }}
            aria-label={idea.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {idea.is_favorite ? '★' : '☆'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: 'var(--color-ink-faint)',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Meta */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderBottom: '0.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        {editing ? (
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-ink-faint)',
              marginBottom: 4,
            }}>
              Tags (comma-separated)
            </div>
            <input
              value={draftTags}
              onChange={e => setDraftTags(e.target.value)}
              placeholder="e.g. ai, productivity, tools"
              style={{ ...inputStyle, fontSize: 12, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        ) : (
          <>
            {idea.tags.map(tag => (
              <span key={tag} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 20,
                background: tagColor(tag),
                color: '#ffffff',
                border: 'none',
              }}>
                {tag}
              </span>
            ))}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-ink-faint)',
              marginLeft: 'auto',
            }}>
              {new Date(idea.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </>
        )}
      </div>

      {/* Content / History */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {showHistory ? (
          <>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-ink-faint)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}>
              Edit history
            </div>
            {versionsLoading ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-faint)' }}>
                Loading…
              </span>
            ) : !versions?.length ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-faint)', fontStyle: 'italic' }}>
                No previous versions — history is saved each time you edit.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {versions.map(v => (
                  <div key={v.id} style={{
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setExpandedVersionId(id => id === v.id ? null : v.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: expandedVersionId === v.id ? 'var(--color-paper-warm)' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v.title}</div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--color-ink-faint)',
                          marginTop: 2,
                        }}>
                          {new Date(v.created_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <span style={{ color: 'var(--color-ink-faint)', fontSize: 11 }}>
                        {expandedVersionId === v.id ? '▲' : '▼'}
                      </span>
                    </button>
                    {expandedVersionId === v.id && (
                      <div style={{ borderTop: '0.5px solid var(--color-border)', padding: '12px 14px' }}>
                        <div style={{
                          fontSize: 12,
                          lineHeight: 1.7,
                          color: 'var(--color-ink-muted)',
                          maxHeight: 180,
                          overflow: 'auto',
                          marginBottom: 12,
                        }}>
                          <ReactMarkdown>{v.content}</ReactMarkdown>
                        </div>
                        <button
                          onClick={() => restoreVersion(v)}
                          disabled={restoring}
                          style={{
                            padding: '5px 14px',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            border: '0.5px solid var(--color-accent)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-accent)',
                            color: '#fff',
                            cursor: restoring ? 'not-allowed' : 'pointer',
                            opacity: restoring ? 0.6 : 1,
                          }}
                        >
                          {restoring ? 'Restoring…' : 'Restore this version'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : editing ? (
          <textarea
            value={draftContent}
            onChange={e => setDraftContent(e.target.value)}
            style={{
              ...inputStyle,
              height: '100%',
              resize: 'none',
              lineHeight: 1.7,
              fontSize: 13,
            }}
          />
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-ink)' }}>
            <ReactMarkdown>{idea.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Connections */}
      {(editing || idea.connections.length > 0) && (
        <div style={{
          borderTop: '0.5px solid var(--color-border)',
          padding: '1rem 1.5rem',
        }}>
          {editing ? (
            <>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-ink-faint)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Connections (comma-separated slugs)
              </div>
              <input
                value={draftConnections}
                onChange={e => setDraftConnections(e.target.value)}
                placeholder="e.g. the-idea-slug, another-idea"
                style={{ ...inputStyle, fontSize: 12, fontFamily: 'var(--font-mono)' }}
              />
            </>
          ) : (
            <>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-ink-faint)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Connections
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {idea.connections.map(slug => (
                  <span key={slug} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-accent-light)',
                    color: 'var(--color-accent)',
                  }}>
                    {slug}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid var(--color-border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {editing ? (
          <>
            {saveError && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: '#c0392b',
                flex: 1,
              }}>
                {saveError}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{
                  padding: '5px 14px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  border: '0.5px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  background: '#fff',
                  cursor: 'pointer',
                  color: 'var(--color-ink-muted)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '5px 14px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  border: '0.5px solid var(--color-accent)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            {confirmDelete ? (
              <>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-ink-muted)',
                }}>
                  Delete this idea?
                </span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{
                    padding: '5px 12px',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    border: '0.5px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '5px 12px',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    border: '0.5px solid #c0392b',
                    borderRadius: 'var(--radius-sm)',
                    background: '#c0392b',
                    color: '#fff',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </>
            ) : (
              <>
                {!showHistory && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: '5px 12px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      border: '0.5px solid var(--color-border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'none',
                      color: 'var(--color-ink-faint)',
                      cursor: 'pointer',
                    }}
                  >
                    Delete idea
                  </button>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {showHistory ? (
                    <button
                      onClick={() => { setShowHistory(false); setExpandedVersionId(null) }}
                      style={{
                        padding: '5px 14px',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        border: '0.5px solid var(--color-border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'none',
                        color: 'var(--color-ink-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      ← Back
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={openHistory}
                        style={{
                          padding: '5px 14px',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          border: '0.5px solid var(--color-border-strong)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'none',
                          color: 'var(--color-ink-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        History
                      </button>
                      <button
                        onClick={startEdit}
                        style={{
                          padding: '5px 14px',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          border: '0.5px solid var(--color-border-strong)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'none',
                          color: 'var(--color-ink-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
