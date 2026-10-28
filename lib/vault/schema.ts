import { z } from 'zod'

export const IDEA_CATEGORIES = [
  'business', 'technology', 'investing', 'creativity', 'productivity', 'personal', 'research', 'other',
] as const

export const MAX_CONNECTIONS = 5

export const CaptureLLMOutputSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().toLowerCase().pipe(z.enum(IDEA_CATEGORIES)),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  summary: z.string().trim().min(1).max(300),
  content: z.string().trim().min(20).max(8000),
  connections: z.array(z.string().trim().min(1).max(80)).max(MAX_CONNECTIONS).default([]),
  suggestedGaps: z.array(z.string().trim().min(1).max(200)).max(5).default([]),
})

export type CaptureLLMOutput = z.infer<typeof CaptureLLMOutputSchema>

export const CAPTURE_JSON_SCHEMA = z.toJSONSchema(CaptureLLMOutputSchema, { io: 'input' }) as Record<string, unknown>

export class CaptureValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaptureValidationError'
  }
}

/** Parses and validates the model's reply. Tolerates a markdown code fence around the JSON. */
export function parseCaptureResponse(text: string): CaptureLLMOutput {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  let raw: unknown
  try {
    raw = JSON.parse(fenced ? fenced[1] : trimmed)
  } catch {
    throw new CaptureValidationError('Response was not valid JSON')
  }
  const result = CaptureLLMOutputSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    throw new CaptureValidationError(`Response failed schema validation: ${issues}`)
  }
  return result.data
}

/** Keeps only connections that exist in the vault (and are not the idea itself), de-duplicated. */
export function filterConnections(
  connections: string[],
  existingSlugs: ReadonlySet<string>,
  selfSlug: string
): { kept: string[]; dropped: string[] } {
  const kept: string[] = []
  const dropped: string[] = []
  for (const slug of connections) {
    if (existingSlugs.has(slug) && slug !== selfSlug && !kept.includes(slug)) kept.push(slug)
    else dropped.push(slug)
  }
  return { kept, dropped }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '') || 'idea'
}

/** Returns `base`, or `base-2`, `base-3`, ... — the first not in `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const slug = slugify(base)
  if (!taken.has(slug)) return slug
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const candidate = `${slug.slice(0, 80 - suffix.length)}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}
