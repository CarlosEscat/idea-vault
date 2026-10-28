import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { safeFetch } from '@/lib/url-guard'
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
      ...(opts?.jsonSchema
        ? {
            tools: [{
              name: 'respond',
              description: 'Return the structured response.',
              input_schema: opts.jsonSchema as Anthropic.Tool.InputSchema,
            }],
            tool_choice: { type: 'tool' as const, name: 'respond' },
          }
        : {}),
    })
    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (toolBlock?.type === 'tool_use') return JSON.stringify(toolBlock.input)
    const block = response.content.find(b => b.type === 'text')
    return block?.type === 'text' ? block.text : ''
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
      ...(opts?.jsonSchema ? { response_format: { type: 'json_object' as const } } : {}),
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
      ...(opts?.maxTokens || opts?.jsonSchema
        ? {
            generationConfig: {
              ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
              ...(opts.jsonSchema ? { responseMimeType: 'application/json' } : {}),
            },
          }
        : {}),
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
    const response = await safeFetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        ...(opts?.jsonSchema ? { format: 'json' } : {}),
        ...(opts?.maxTokens ? { options: { num_predict: opts.maxTokens } } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    const data = (await response.json()) as { message?: { content?: string } }
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
