import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'
import type { IdeaRow } from '@/types'
import { demoWriteBlocked } from '@/lib/auth/demo'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = demoWriteBlocked(user)
    if (blocked) return blocked

    const body = await req.json() as {
      title?: string
      content?: string
      summary?: string
      category?: string
      tags?: string[]
      connections?: string[]
      is_favorite?: boolean
    }

    const contentFieldsChanging = [body.title, body.content, body.summary, body.category, body.tags, body.connections]
      .some(v => v !== undefined)

    // Snapshot the current state before any content change
    if (contentFieldsChanging) {
      const { data: current } = await supabase
        .from('ideas')
        .select('id, title, content_encrypted, summary_encrypted, category, tags, connections')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .single()

      if (current) {
        await supabase.from('idea_versions').insert({
          idea_id: current.id,
          user_id: user.id,
          title: current.title,
          content_encrypted: current.content_encrypted,
          summary_encrypted: current.summary_encrypted,
          category: current.category,
          tags: current.tags,
          connections: current.connections,
        })
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content_encrypted = encrypt(body.content, user.id)
    if (body.summary !== undefined) updates.summary_encrypted = encrypt(body.summary, user.id)
    if (body.category !== undefined) updates.category = body.category
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.connections !== undefined) updates.connections = body.connections
    if (body.is_favorite !== undefined) updates.is_favorite = body.is_favorite

    const { data, error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('user_id', user.id)
      .eq('slug', slug)
      .select()
      .single()

    if (error) throw error

    const row = data as IdeaRow
    const idea = {
      id: row.id,
      user_id: row.user_id,
      slug: row.slug,
      title: row.title,
      content: decrypt(row.content_encrypted, user.id),
      summary: decrypt(row.summary_encrypted, user.id),
      category: row.category,
      tags: row.tags,
      connections: row.connections,
      is_favorite: row.is_favorite,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }

    return NextResponse.json({ data: { idea } })
  } catch (err) {
    console.error('Update idea error:', err)
    return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 })
  }
}

export async function DELETE(
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

    const blocked = demoWriteBlocked(user)
    if (blocked) return blocked

    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('user_id', user.id)
      .eq('slug', slug)

    if (error) throw error

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('Delete idea error:', err)
    return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 })
  }
}
