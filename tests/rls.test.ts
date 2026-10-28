/**
 * Cross-user isolation against a REAL Supabase project (schema + migrations applied).
 * Opt-in because it creates and deletes two throwaway auth users:
 *
 *   RLS_TEST=1 npm run test:rls     (needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
 *
 * Use a development project, never production.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const enabled = process.env.RLS_TEST === '1'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe.skipIf(!enabled)('RLS: user A cannot touch user B data', () => {
  let admin: SupabaseClient
  const password = `pw-${crypto.randomUUID()}`
  const stamp = Date.now()
  let a: { id: string; client: SupabaseClient }
  let b: { id: string; client: SupabaseClient }
  let aIdeaId: string

  async function makeUser(label: string) {
    const email = `rls-${label}-${stamp}@example.test`
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    const client = createClient(url, anon, { auth: { persistSession: false } })
    const { error: signInError } = await client.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
    return { id: data.user.id, client }
  }

  beforeAll(async () => {
    admin = createClient(url, service, { auth: { persistSession: false } })
    a = await makeUser('a')
    b = await makeUser('b')
    const vec = `[${Array.from({ length: 768 }, () => 0.01).join(',')}]`
    const { data, error } = await a.client.from('ideas').insert({
      user_id: a.id, slug: 'secret', title: 'A secret', content_encrypted: 'x', summary_encrypted: 'x', embedding: vec,
    }).select('id').single()
    if (error) throw error
    aIdeaId = data.id
    await a.client.from('idea_versions').insert({
      idea_id: aIdeaId, user_id: a.id, title: 'v1', content_encrypted: 'x', summary_encrypted: 'x',
    })
    await a.client.from('vault_meta').upsert({ user_id: a.id, index_md_encrypted: 'x', overview_md_encrypted: 'x' })
    await a.client.from('user_settings').upsert({ user_id: a.id, llm_config_encrypted: 'x' })
  })

  afterAll(async () => {
    if (a) await admin.auth.admin.deleteUser(a.id) // cascades to all rows
    if (b) await admin.auth.admin.deleteUser(b.id)
  })

  it('A can read their own idea (sanity)', async () => {
    const { data } = await a.client.from('ideas').select('id').eq('id', aIdeaId)
    expect(data).toHaveLength(1)
  })

  it.each(['ideas', 'idea_versions', 'vault_meta', 'user_settings'])('B cannot read A\'s rows in %s', async table => {
    const { data } = await b.client.from(table).select('*').eq('user_id', a.id)
    expect(data ?? []).toHaveLength(0)
  })

  it('B cannot update or delete A\'s idea', async () => {
    await b.client.from('ideas').update({ title: 'hacked' }).eq('id', aIdeaId)
    await b.client.from('ideas').delete().eq('id', aIdeaId)
    const { data } = await admin.from('ideas').select('title').eq('id', aIdeaId).single()
    expect(data?.title).toBe('A secret')
  })

  it('B cannot insert rows as A', async () => {
    const { error } = await b.client.from('ideas').insert({
      user_id: a.id, slug: 'planted', title: 'x', content_encrypted: 'x', summary_encrypted: 'x',
    })
    expect(error).not.toBeNull()
  })

  it('search_ideas and get_pairwise_similarities return nothing for B asking about A', async () => {
    const vec = `[${Array.from({ length: 768 }, () => 0.01).join(',')}]`
    const search = await b.client.rpc('search_ideas', { p_user_id: a.id, p_query_embedding: vec, p_limit: 10, p_threshold: 0 })
    expect(search.data ?? []).toHaveLength(0)
    const pairs = await b.client.rpc('get_pairwise_similarities', { p_user_id: a.id, p_threshold: 0 })
    expect(pairs.data ?? []).toHaveLength(0)
  })

  it('B cannot read the rate limit table', async () => {
    const { data } = await b.client.from('rate_limits').select('*')
    expect(data ?? []).toHaveLength(0)
  })
})
