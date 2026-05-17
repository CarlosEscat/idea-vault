'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/graph',     icon: '◎', label: 'Graph' },
  { href: '/vault',     icon: '≡', label: 'Vault' },
  { href: '/settings',  icon: '⚙', label: 'Settings' },
]

interface SidebarProps {
  userName?: string
  ideaCount?: number
}

export default function Sidebar({ userName, ideaCount }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleExport() {
    const res = await fetch('/api/export')
    const { data, error } = await res.json()
    if (error || !data) return alert('Export failed')

    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    for (const file of data as { filename: string; content: string }[]) {
      zip.file(file.filename, file.content)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `idea-vault-export-${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside style={{
      width: 200,
      minWidth: 200,
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      background: '#223140',
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '-0.3px',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#ffffff',
      }}>
        <span style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: 'var(--color-accent)',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        Idea Vault
      </div>

      {/* Nav */}
      {navItems.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
              background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              transition: 'background 0.1s, color 0.1s',
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </div>
          </Link>
        )
      })}

      <div style={{ flex: 1 }} />

      {/* Export */}
      <button onClick={handleExport} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        fontFamily: 'var(--font-mono)',
        color: 'rgba(255,255,255,0.4)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 14 }}>↓</span>
        Export vault
      </button>

      {/* User */}
      <button onClick={handleSignOut} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        fontFamily: 'var(--font-mono)',
        color: 'rgba(255,255,255,0.4)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 14 }}>○</span>
        {userName ?? 'Sign out'}
      </button>

      {/* Idea count */}
      {ideaCount !== undefined && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
          padding: '4px 10px',
          letterSpacing: '0.3px',
        }}>
          {ideaCount} ideas
        </div>
      )}
    </aside>
  )
}
