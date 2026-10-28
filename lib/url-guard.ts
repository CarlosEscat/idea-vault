const PRIVATE_HOST = /^(localhost|.*\.localhost|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?|\[?f[cd][0-9a-f]{2}:.*)$/i

/**
 * Validates a user-supplied provider base URL (e.g. Ollama). The server makes this request, so on a
 * hosted deployment private/loopback hosts are rejected (SSRF). Self-hosters can set
 * ALLOW_PRIVATE_LLM_URLS=true. Checks the literal host only — it does not defend against DNS rebinding.
 * Returns an error message, or null if acceptable.
 */
export function validateBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { return 'baseUrl is not a valid URL' }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'baseUrl must use http or https'
  if (process.env.ALLOW_PRIVATE_LLM_URLS !== 'true' && process.env.NODE_ENV === 'production' && PRIVATE_HOST.test(url.hostname)) {
    return 'baseUrl must not point to a private or loopback address on this deployment'
  }
  return null
}
