import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CompleteOptions, LLMConfig, LLMProvider, LLMProviderType } from '@/types'

// ─── Anthropic ────────────────────────────────────────────────────────────────

class AnthropicProvider implements LLMProvider {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async complete(userPrompt: string, systemPrompt: string, opts?: CompleteOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: opts?.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const block = response.content[0]
    return block.type === 'text' ? block.text : ''
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async complete(userPrompt: string, systemPrompt: string, opts?: CompleteOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      ...(opts?.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    return response.choices[0]?.message?.content ?? ''
  }
}

// ─── Google ───────────────────────────────────────────────────────────────────

class GoogleProvider implements LLMProvider {
  private client: GoogleGenerativeAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey)
    this.model = model
  }

  async complete(userPrompt: string, systemPrompt: string, opts?: CompleteOptions): Promise<string> {
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
      ...(opts?.maxTokens ? { generationConfig: { maxOutputTokens: opts.maxTokens } } : {}),
    })
    const result = await genModel.generateContent(userPrompt)
    return result.response.text()
  }
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

class OllamaProvider implements LLMProvider {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.model = model
  }

  async complete(userPrompt: string, systemPrompt: string, opts?: CompleteOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        ...(opts?.maxTokens ? { options: { num_predict: opts.maxTokens } } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    const data = await response.json()
    return data.message?.content ?? ''
  }
}

// ─── Model migration ──────────────────────────────────────────────────────────

const DEPRECATED_MODELS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'claude-sonnet-4-6',
  'claude-opus-4-20250514': 'claude-opus-4-8',
}

function migrateModel(model: string): string {
  return DEPRECATED_MODELS[model] ?? model
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider as LLMProviderType) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, migrateModel(config.model))
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model)
    case 'google':
      return new GoogleProvider(config.apiKey, config.model)
    case 'ollama':
      return new OllamaProvider(config.baseUrl ?? 'http://localhost:11434', config.model)
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}
