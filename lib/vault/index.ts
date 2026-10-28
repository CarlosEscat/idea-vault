import { createServerClientInstance } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'
import { createLLMProvider } from '@/lib/llm/providers'
import { createEmbeddingsProvider } from '@/lib/embeddings/providers'
import {
  CAPTURE_IDEA_SYSTEM_PROMPT,
  UPDATE_INDEX_SYSTEM_PROMPT,
  UPDATE_OVERVIEW_SYSTEM_PROMPT,
} from './prompts'
import type { Idea, IdeaRow, VaultMeta, VaultMetaRow, LLMConfig, EmbeddingsConfig, CaptureIdeaResponse } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decryptIdeaRow(row: IdeaRow, userId: string): Idea {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    title: row.title,
    content: decrypt(row.content_encrypted, userId),
    summary: decrypt(row.summary_encrypted, userId),
    category: row.category,
    tags: row.tags,
    connections: row.connections,
    is_favorite: row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ─── Vault Meta ───────────────────────────────────────────────────────────────

export async function getVaultMeta(userId: string): Promise<VaultMeta> {
  const supabase = await createServerClientInstance()
  const { data, error } = await supabase
    .from('vault_meta')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // First time — return empty vault
    return {
      user_id: userId,
      index_md: '# Idea Vault Index\n\n*No ideas yet. Add your first thought!*',
      overview_md: '# Overview\n\n*Your vault is empty. Start capturing ideas!*',
      updated_at: new Date().toISOString(),
    }
  }

  const row = data as VaultMetaRow
  return {
    user_id: userId,
    index_md: decrypt(row.index_md_encrypted, userId),
    overview_md: decrypt(row.overview_md_encrypted, userId),
    updated_at: row.updated_at,
  }
}

async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  const supabase = await createServerClientInstance()
  await supabase.from('vault_meta').upsert({
    user_id: meta.user_id,
    index_md_encrypted: encrypt(meta.index_md, meta.user_id),
    overview_md_encrypted: encrypt(meta.overview_md, meta.user_id),
    updated_at: new Date().toISOString(),
  })
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function getUserIdeas(userId: string): Promise<Idea[]> {
  const supabase = await createServerClientInstance()
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as IdeaRow[]).map(row => decryptIdeaRow(row, userId))
}

export async function getIdeaBySlug(userId: string, slug: string): Promise<Idea | null> {
  const supabase = await createServerClientInstance()
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return decryptIdeaRow(data as IdeaRow, userId)
}

export const EMBEDDING_DIM = 768

export interface StoredEmbedding {
  vector: number[]
  model: string
}

/** Embeds text; returns null (and logs) on failure so capture never fails because of embeddings. */
export async function tryEmbed(
  config: EmbeddingsConfig | undefined,
  text: string
): Promise<StoredEmbedding | null> {
  if (!config) return null
  try {
    const vector = await createEmbeddingsProvider(config).embed(text)
    if (vector.length !== EMBEDDING_DIM) {
      console.error(`Embedding skipped: ${config.model} returned ${vector.length} dims, expected ${EMBEDDING_DIM}`)
      return null
    }
    return { vector, model: config.model }
  } catch (err) {
    console.error('Embedding generation failed:', err)
    return null
  }
}

export function embeddingColumns(e: StoredEmbedding) {
  return {
    embedding: `[${e.vector.join(',')}]`,
    embedding_model: e.model,
    embedding_dim: e.vector.length,
  }
}

async function saveIdea(idea: Idea, embedding: StoredEmbedding | null): Promise<void> {
  const supabase = await createServerClientInstance()
  const { error } = await supabase.from('ideas').upsert({
    id: idea.id,
    user_id: idea.user_id,
    slug: idea.slug,
    title: idea.title,
    content_encrypted: encrypt(idea.content, idea.user_id),
    summary_encrypted: encrypt(idea.summary, idea.user_id),
    category: idea.category,
    tags: idea.tags,
    connections: idea.connections,
    is_favorite: idea.is_favorite,
    updated_at: new Date().toISOString(),
    ...(embedding ? embeddingColumns(embedding) : {}),
  })
  if (error) throw new Error(`Failed to save idea: ${error.message}`)
}

// ─── Capture Flow ─────────────────────────────────────────────────────────────

export async function captureIdea(
  userId: string,
  rawThought: string,
  llmConfig: LLMConfig,
  embeddingsConfig?: EmbeddingsConfig
): Promise<CaptureIdeaResponse> {
  const provider = createLLMProvider(llmConfig)

  // 0. Embed the raw note BEFORE saving: work after the response is not guaranteed to run on serverless.
  const embedding = await tryEmbed(embeddingsConfig, rawThought)

  // 1. Get current vault state
  const vaultMeta = await getVaultMeta(userId)

  // 2. Ask LLM to structure the idea
  const userPrompt = `Here is the current vault index:\n\n${vaultMeta.index_md}\n\n---\n\nHere is the raw thought to process:\n\n"${rawThought}"`

  const responseText = await provider.complete(userPrompt, CAPTURE_IDEA_SYSTEM_PROMPT)

  // 3. Parse LLM response
  const clean = responseText.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  // 4. Build idea object
  const idea: Idea = {
    id: crypto.randomUUID(),
    user_id: userId,
    slug: parsed.slug,
    title: parsed.title,
    content: parsed.content,
    summary: parsed.summary,
    category: parsed.category,
    tags: parsed.tags ?? [],
    connections: parsed.connections ?? [],
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 5. Save the idea together with its embedding
  await saveIdea(idea, embedding)

  // 6. Update index.md
  const updatedIndex = await provider.complete(
    `Current index:\n\n${vaultMeta.index_md}\n\n---\n\nNew idea to add:\nSlug: ${idea.slug}\nCategory: ${idea.category}\nSummary: ${idea.summary}`,
    UPDATE_INDEX_SYSTEM_PROMPT
  )

  // 7. Update overview.md
  const updatedOverview = await provider.complete(
    `Current overview:\n\n${vaultMeta.overview_md}\n\n---\n\nNew idea just added:\n\n${idea.content}`,
    UPDATE_OVERVIEW_SYSTEM_PROMPT
  )

  // 8. Save vault meta
  await saveVaultMeta({
    user_id: userId,
    index_md: updatedIndex,
    overview_md: updatedOverview,
    updated_at: new Date().toISOString(),
  })

  return {
    idea,
    updatedConnections: parsed.connections ?? [],
    suggestedGaps: parsed.suggestedGaps ?? [],
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportVault(userId: string): Promise<{ filename: string; content: string }[]> {
  const [ideas, meta] = await Promise.all([
    getUserIdeas(userId),
    getVaultMeta(userId),
  ])

  const files: { filename: string; content: string }[] = [
    { filename: 'index.md', content: meta.index_md },
    { filename: 'overview.md', content: meta.overview_md },
    ...ideas.map(idea => ({
      filename: `ideas/${idea.slug}.md`,
      content: `---\ntitle: ${idea.title}\ncategory: ${idea.category}\ntags: [${idea.tags.join(', ')}]\nconnections: [${idea.connections.join(', ')}]\ncreated: ${idea.created_at}\n---\n\n${idea.content}`,
    })),
  ]

  return files
}
