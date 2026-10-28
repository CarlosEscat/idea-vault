import OpenAI from 'openai'
import { safeFetch } from '@/lib/url-guard'
import type { EmbeddingsConfig, EmbeddingsProviderType } from '@/types'

/** Dimension of the `ideas.embedding` column; providers are asked for (or must return) this many. */
export const EMBEDDING_DIM = 768

export interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: 768,
    })
    return response.data[0].embedding
  }
}

// ─── Google ───────────────────────────────────────────────────────────────────
// Uses the v1 (stable) REST API directly — the JS SDK defaults to v1beta
// which doesn't support text-embedding-004.

class GoogleEmbeddingsProvider implements EmbeddingsProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
        }),
      }
    )
    const data = await response.json()
    if (!data.embedding?.values) {
      throw new Error(`Google embeddings error: ${JSON.stringify(data.error ?? data)}`)
    }
    return data.embedding.values
  }
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

class OllamaEmbeddingsProvider implements EmbeddingsProvider {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.model = model
  }

  async embed(text: string): Promise<number[]> {
    const response = await safeFetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    })
    const data = (await response.json()) as { embedding?: number[] }
    return data.embedding
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

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

export function createEmbeddingsProvider(config: EmbeddingsConfig): EmbeddingsProvider {
  switch (config.provider as EmbeddingsProviderType) {
    case 'openai':
      return new OpenAIEmbeddingsProvider(config.apiKey!, config.model)
    case 'google':
      return new GoogleEmbeddingsProvider(config.apiKey!, config.model)
    case 'ollama':
      return new OllamaEmbeddingsProvider(config.baseUrl ?? 'http://localhost:11434', config.model)
    default:
      throw new Error(`Unknown embeddings provider: ${config.provider}`)
  }
}
