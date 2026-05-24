'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import CaptureInput from '@/components/vault/CaptureInput'
import IdeaRow from '@/components/vault/IdeaRow'
import IdeaDetail from '@/components/vault/IdeaDetail'
import StatCard from '@/components/vault/StatCard'
import SuggestedGaps from '@/components/vault/SuggestedGaps'
import { createClient } from '@/lib/supabase/client'
import type { Idea, CaptureIdeaResponse } from '@/types'

export default function DashboardPage() {
  const supabase = createClient()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [gaps, setGaps] = useState<string[]>([])
  const [providerLabel, setProviderLabel] = useState('No LLM configured')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserName(user.email.split('@')[0])
      }

      const vaultRes = await fetch('/api/vault')
      const vaultData = await vaultRes.json()
      if (vaultData.data) setIdeas(vaultData.data)

      const settingsRes = await fetch('/api/llm')
      const settingsData = await settingsRes.json()
      if (settingsData.data?.model) {
        setProviderLabel(settingsData.data.model)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleCapture(result: CaptureIdeaResponse) {
    setIdeas(prev => [result.idea, ...prev])
    if (result.suggestedGaps?.length) {
      setGaps(result.suggestedGaps)
    }
  }

  const totalConnections = ideas.reduce((sum, idea) => sum + idea.connections.length, 0)
  const categories = new Set(ideas.map(i => i.category)).size

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#e9f2ff',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
        letterSpacing: '-0.2px',
        background: 'linear-gradient(90deg, #c9fddc 0%, #95bbfe 100%)',
        boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
      }}>
        Idea Vault
      </header>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 12,
        padding: 12,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <Sidebar userName={userName} ideaCount={ideas.length} />

        <main style={{
          flex: 1,
          margin: '30px 70px 30px 10px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'auto',
          padding: '2rem 2.5rem',
          minWidth: 0,
          boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
          background: '#95bbfe',
        }}>
          {/* All content centered */}
          <div style={{ maxWidth: 580, margin: '0 auto' }}>

          {/* Date */}
          <div style={{
            fontSize: 11,
            color: '#ffffff',
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>
            {dateStr}
          </div>

          {/* Greeting */}
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: '2rem',
            lineHeight: 1.3,
          }}>
            {greeting}{userName ? `, ${userName}` : ''}.
            <br />
            <em style={{ fontStyle: 'italic', fontWeight: 600 }}>What&apos;s on your mind?</em>
          </h1>

          {/* Onboarding nudge */}
          {providerLabel === 'No LLM configured' && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '1.5rem',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-light)',
              fontSize: 12,
            }}>
              Configure your AI provider in{' '}
              <a href="/settings" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                Settings
              </a>
              {' '}before capturing ideas →
            </div>
          )}

          <CaptureInput providerLabel={providerLabel} onCapture={handleCapture} />
            {ideas.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: '2rem',
              }}>
                <StatCard value={ideas.length} label="Ideas" />
                <StatCard value={totalConnections} label="Connections" />
                <StatCard value={categories} label="Categories" />
              </div>
            )}

            {ideas.length > 0 && (
              <>
                <div style={{
                  fontSize: 11,
                  color: '#ffffff',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}>
                  Latest Ideas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ideas.slice(0, 10).map((idea, i) => (
                    <IdeaRow
                      key={idea.id}
                      idea={idea}
                      index={i + 1}
                      onClick={setSelectedIdea}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Empty state */}
          {!loading && ideas.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--color-ink-faint)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>○</div>
              <div style={{ fontSize: 13 }}>
                Your vault is empty
              </div>
              <div style={{ fontSize: 14, fontStyle: 'italic', marginTop: 6 }}>
                Capture your first thought above
              </div>
            </div>
          )}

          {/* Gaps */}
          <SuggestedGaps gaps={gaps} />
        </main>
      </div>

      {/* Detail panel */}
      {selectedIdea && (
        <>
          <div
            onClick={() => setSelectedIdea(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.08)',
              zIndex: 99,
            }}
          />
          <IdeaDetail
            floating
            idea={selectedIdea}
            onClose={() => setSelectedIdea(null)}
            onDelete={(id) => setIdeas(prev => prev.filter(i => i.id !== id))}
            onUpdate={(updated) => {
              setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i))
              setSelectedIdea(updated)
            }}
          />
        </>
      )}
    </div>
  )
}
