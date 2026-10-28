import { lookup as dnsLookup } from 'node:dns'
import { isIP } from 'node:net'
import { Agent, fetch as undiciFetch } from 'undici'

/**
 * SSRF protection for user-supplied provider base URLs (e.g. Ollama): the server makes these requests.
 * Private/loopback/link-local targets are refused unless ALLOW_PRIVATE_LLM_URLS=true (self-hosting) or
 * the app runs under `next dev`. The check runs at save time (validateBaseUrl) AND at connection time
 * (safeFetch pins the connection to the address it validated, so DNS rebinding cannot swap it).
 */

function allowPrivate(): boolean {
  return process.env.ALLOW_PRIVATE_LLM_URLS === 'true' || process.env.NODE_ENV === 'development'
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
}

function isPrivateV4(octets: number[]): boolean {
  const [a, b, c] = octets
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

/** True for loopback, private, link-local, CGNAT, unspecified, multicast/reserved and NAT64 / IPv4-mapped equivalents. */
export function isPrivateAddress(address: string): boolean {
  const addr = normalizeHost(address)
  const family = isIP(addr)
  if (family === 4) return isPrivateV4(addr.split('.').map(Number))
  if (family !== 6) return false

  const dotted = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) return isPrivateV4(dotted[1].split('.').map(Number))
  const hex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16)
    return isPrivateV4([hi >> 8, hi & 255, lo >> 8, lo & 255])
  }
  return (
    addr === '::' || addr === '::1' ||
    /^f[cd]/.test(addr) ||           // fc00::/7 unique local
    /^fe[89ab]/.test(addr) ||        // fe80::/10 link-local
    addr.startsWith('ff') ||         // multicast
    addr.startsWith('64:ff9b:')      // NAT64
  )
}

function isPrivateName(host: string): boolean {
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')
}

/** Save-time check. Returns an error message, or null if acceptable. */
export function validateBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { return 'baseUrl is not a valid URL' }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'baseUrl must use http or https'
  const host = normalizeHost(url.hostname)
  if (!allowPrivate() && (isPrivateName(host) || isPrivateAddress(host))) {
    return 'baseUrl must not point to a private or loopback address on this deployment'
  }
  return null
}

// Runs for every hostname (non-literal) the connection resolves; rejects before connecting.
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, options, (err, address, family) => {
        if (err) return callback(err, address, family)
        const addresses = Array.isArray(address) ? address.map(a => a.address) : [address]
        if (!allowPrivate() && addresses.some(isPrivateAddress)) {
          return callback(new Error('Blocked: host resolves to a private address'), address, family)
        }
        callback(null, address, family)
      })
    },
  },
})

/** fetch() for user-supplied URLs: re-validates at connect time, never follows redirects. */
export async function safeFetch(input: string, init: Parameters<typeof undiciFetch>[1] = {}) {
  const error = validateBaseUrl(input)
  if (error) throw new Error(error)
  const res = await undiciFetch(input, { ...init, dispatcher: guardedAgent, redirect: 'manual' })
  if (res.status >= 300 && res.status < 400) throw new Error('Redirects are not followed for provider URLs')
  return res
}
