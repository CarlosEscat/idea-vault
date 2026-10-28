// ─── Idea ────────────────────────────────────────────────────────────────────

export interface Idea {
  id: string
  user_id: string
  slug: string
  title: string
  content: string          // markdown text (decrypted)
  summary: string          // one-line summary for index.md
  category: string
  tags: string[]
  connections: string[]    // array of idea slugs
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface IdeaRow {
  id: string
  user_id: string
  slug: string
  title: string
  content_encrypted: string
  summary_encrypted: string
  category: string
  tags: string[]
  connections: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

// ─── Idea Version ─────────────────────────────────────────────────────────────

export interface IdeaVersion {
  id: string
  idea_id: string
  title: string
  content: string    // decrypted
  summary: string    // decrypted
  category: string
  tags: string[]
  connections: string[]
  created_at: string
}

// ─── Vault Meta ──────────────────────────────────────────────────────────────

export interface VaultMeta {
  user_id: string
  index_md: string         // master map (decrypted)
  overview_md: string      // evolving synthesis (decrypted)
  updated_at: string
}

export interface VaultMetaRow {
  user_id: string
  index_md_encrypted: string
  overview_md_encrypted: string
  updated_at: string
}

// ─── Graph ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  slug: string
  title: string
  category: string
  tags: string[]
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  strength: number  // 0–1 composite score
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

export type LLMProviderType = 'anthropic' | 'openai' | 'google' | 'ollama'

export interface LLMConfig {
  provider: LLMProviderType
  apiKey: string           // stored encrypted in DB
  model: string
  baseUrl?: string         // for Ollama
}

export interface CompleteOptions {
  maxTokens?: number
  /** JSON Schema for the response; providers use tool use / JSON mode where supported. */
  jsonSchema?: Record<string, unknown>
}

export interface LLMProvider {
  complete(userPrompt: string, systemPrompt: string, opts?: CompleteOptions): Promise<string>
}

export const LLM_MODELS: Record<LLMProviderType, string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
  google: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  ollama: ['llama3.3', 'mistral', 'qwen2.5', 'deepseek-r1'],
}

export const LLM_DEFAULT_MODELS: Record<LLMProviderType, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
  ollama: 'llama3.3',
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

export type EmbeddingsProviderType = 'openai' | 'google' | 'ollama'

export interface EmbeddingsConfig {
  provider: EmbeddingsProviderType
  apiKey?: string
  model: string
  baseUrl?: string  // for Ollama
}

// ─── User Settings ────────────────────────────────────────────────────────────

export interface UserSettings {
  user_id: string
  llm_config_encrypted: string | null
  embeddings_config_encrypted: string | null
  theme: 'dark' | 'light'
  created_at: string
  updated_at: string
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface CaptureIdeaRequest {
  rawThought: string
}

export interface CaptureIdeaResponse {
  idea: Idea
  updatedConnections: string[]
  suggestedGaps: string[]
}
