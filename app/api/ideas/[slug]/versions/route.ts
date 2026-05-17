import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

interface VersionRow {
  id: string
  idea_id: string
  title: string
  content_encrypted: string
  summary_encrypted: string
  category: string
  tags: string[]
  connections: string[]
  created_at: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve idea ID from slug (also confirms ownership via RLS)
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .single()

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const { data: rows, error } = await supabase
      .from('idea_versions')
      .select('*')
      .eq('idea_id', idea.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const versions = (rows as VersionRow[]).map(row => ({
      id: row.id,
      idea_id: row.idea_id,
      title: row.title,
      content: decrypt(row.content_encrypted, user.id),
      summary: decrypt(row.summary_encrypted, user.id),
      category: row.category,
      tags: row.tags,
      connections: row.connections,
      created_at: row.created_at,
    }))

    return NextResponse.json({ data: versions })
  } catch (err) {
    console.error('Versions fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}
