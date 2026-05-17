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
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserName(user.email.split('@')[0])
      }

      // Get ideas
      const vaultRes = await fetch('/api/vault')
      const vaultData = await vaultRes.json()
      if (vaultData.data) setIdeas(vaultData.data)

      // Get LLM settings
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

  // Count unique connections
  const totalConnections = ideas.reduce((sum, idea) => sum + idea.connections.length, 0)
  const categories = new Set(ideas.map(i => i.category)).size

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar userName={userName} ideaCount={ideas.length} />

      <main style={{
        flex: 1,
        padding: '4rem 2.5rem 2rem',
        overflow: 'auto',
        maxWidth: 900,
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Date */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-ink-faint)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          {dateStr}
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 22,
          fontWeight: 500,
          marginBottom: '2rem',
          lineHeight: 1.3,
        }}>
          {greeting}{userName ? `, ${userName}` : ''}.
          <br />
          <em style={{ fontStyle: 'italic' }}>What&apos;s on your mind?</em>
        </h1>

        {/* Onboarding nudge */}
        {providerLabel === 'No LLM configured' && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '1.5rem',
            border: '0.5px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-light)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}>
            Configure your AI provider in{' '}
            <a href="/settings" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
              Settings
            </a>
            {' '}before capturing ideas →
          </div>
        )}

        {/* Capture */}
        <div style={{ marginTop: '1.5rem' }}>
          <CaptureInput providerLabel={providerLabel} onCapture={handleCapture} />
        </div>

        {/* Stats + Recent ideas — narrower column */}
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          {ideas.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: '2rem',
            }}>
              <StatCard value={ideas.length} label="ideas" />
              <StatCard value={totalConnections} label="connections" />
              <StatCard value={categories} label="categories" />
            </div>
          )}

          {ideas.length > 0 && (
            <>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-ink-faint)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
              }}>
                Recent ideas
              </div>
              <div style={{
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: '#fff',
              }}>
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
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
