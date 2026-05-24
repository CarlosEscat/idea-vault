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
      width: 300,
      minWidth: 300,
      margin: '30px',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem 0.875rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      background: 'linear-gradient(90deg, #c9fddc 0%, #95bbfe 100%)',
      flexShrink: 0,
      boxShadow: '17px 16px 16px 2px rgba(0,0,0,0.26)',
    }}>
      {/* Nav */}
      {navItems.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              color: active ? '#ffffff' : 'var(--color-ink)',
              background: active ? '#004aac' : 'transparent',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              transition: 'background 0.1s, color 0.1s',
            }}>
              <span style={{ fontSize: 13, opacity: active ? 1 : 0.45 }}>{item.icon}</span>
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
        gap: 8,
        padding: '7px 10px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        color: 'var(--color-ink-faint)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 13 }}>↓</span>
        Export vault
      </button>

      {/* Sign out */}
      <button onClick={handleSignOut} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        color: 'var(--color-ink-faint)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 13 }}>○</span>
        {userName ?? 'Sign out'}
      </button>

      {/* Idea count */}
      {ideaCount !== undefined && (
        <div style={{
          fontSize: 11,
          color: 'var(--color-ink-faint)',
          padding: '2px 10px 4px',
          letterSpacing: '0.2px',
        }}>
          {ideaCount} ideas
        </div>
      )}
    </aside>
  )
}
