// Client-safe (no server-only imports): used by the Settings page.
import type { EmbeddingsProviderType } from '@/types'

export const EMBEDDINGS_MODELS: Record<EmbeddingsProviderType, string[]> = {
  openai: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
  google: ['text-embedding-004', 'embedding-001'],
  ollama: ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'],
}

export const EMBEDDINGS_DEFAULT_MODELS: Record<EmbeddingsProviderType, string> = {
  openai: 'text-embedding-3-small',
  google: 'text-embedding-004',
  ollama: 'nomic-embed-text',
}
