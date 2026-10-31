'use client'

import { useState, useRef, useEffect } from 'react'
import type { CaptureIdeaResponse } from '@/types'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

interface CaptureInputProps {
  providerLabel: string
  onCapture: (result: CaptureIdeaResponse) => void
}

export default function CaptureInput({ providerLabel, onCapture }: CaptureInputProps) {
  const [thought, setThought] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const interimRef = useRef('')

  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    setSpeechSupported(!!(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    ))
    return () => { recognitionRef.current?.stop() }
  }, [])

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      interimRef.current = interim
      if (final) {
        setThought(prev => (prev ? prev + ' ' : '') + final.trim())
        interimRef.current = ''
      }
    }

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') setError(`Mic error: ${e.error}`)
      setListening(false)
    }

    rec.onend = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  async function handleCapture() {
    if (!thought.trim() || loading) return
    recognitionRef.current?.stop()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ideas/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawThought: thought }),
      })
      const { data, error: apiError } = await res.json()
      if (apiError) throw new Error(apiError)
      setThought('')
      onCapture(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCapture()
    }
  }

  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>
      {/* Card */}
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 25px -5px rgba(19, 78, 74, 0.09), 0 8px 10px -6px rgba(19, 78, 74, 0.04)',
        padding: '1.5rem 1.75rem',
        background: '#fff',
        position: 'relative',
      }}>
        <textarea
          value={thought + (listening && interimRef.current ? ' ' + interimRef.current : '')}
          onChange={e => setThought(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Drop a raw thought here — a half-formed idea, a connection you noticed, a question you can't shake..."
          disabled={loading}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            color: 'var(--color-ink)',
            background: 'transparent',
            resize: 'none',
            lineHeight: 1.7,
            minHeight: 88,
          }}
        />

        {error && (
          <div style={{
            fontSize: 12,
            color: '#dc2626',
            marginTop: 6,
            marginBottom: 4,
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.875rem',
          paddingTop: '0.875rem',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{
            fontSize: 12,
            color: 'var(--color-ink-faint)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: loading ? 'var(--color-warning)' : 'var(--color-accent)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {loading ? 'Thinking...' : providerLabel}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {speechSupported && (
              <button
                onClick={toggleListening}
                disabled={loading}
                title={listening ? 'Stop recording' : 'Speak your idea'}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: listening ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                  background: listening ? 'rgba(20,184,166,0.08)' : 'transparent',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'border 0.15s, background 0.15s',
                  position: 'relative',
                }}
              >
                {listening && (
                  <span style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    border: '2px solid var(--color-accent)',
                    opacity: 0.4,
                    animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
                  }} />
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={listening ? 'var(--color-accent)' : 'var(--color-ink-faint)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="9" y1="22" x2="15" y2="22" />
                </svg>
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-ink-faint)' }}>
              ⌘↵ to capture
            </span>
            <button
              onClick={handleCapture}
              disabled={loading || !thought.trim()}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '8px 22px',
                borderRadius: 9999,
                border: 'none',
                background: thought.trim() && !loading ? 'var(--color-accent)' : 'var(--color-paper-mid)',
                color: thought.trim() && !loading ? '#ffffff' : 'var(--color-ink-faint)',
                boxShadow: thought.trim() && !loading ? '0 4px 14px 0 rgba(20, 184, 166, 0.38)' : 'none',
                cursor: thought.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {loading ? 'Capturing...' : 'Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
