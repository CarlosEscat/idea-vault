import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'
import { decryptLegacy } from './legacy'

// Format: "v2:" + base64(iv[12] | authTag[16] | ciphertext). AES-256-GCM, so tampering is detected.
// Each user gets their own key: HKDF-SHA256(ENCRYPTION_SECRET, salt = user id).
const VERSION_PREFIX = 'v2:'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const HKDF_INFO = 'idea-vault/aes-256-gcm/v2'

const keyCache = new Map<string, Buffer>()

function deriveKey(userId: string): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) throw new Error('ENCRYPTION_SECRET is not set')
  const cacheKey = `${secret}\u0000${userId}`
  let key = keyCache.get(cacheKey)
  if (!key) {
    key = Buffer.from(hkdfSync('sha256', secret, userId, HKDF_INFO, 32))
    keyCache.set(cacheKey, key)
  }
  return key
}

export function isCurrentFormat(ciphertext: string): boolean {
  return ciphertext.startsWith(VERSION_PREFIX)
}

export function encrypt(plaintext: string, userId: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(userId), iv)
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return VERSION_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
}

/** Decrypts v2 ciphertext (throws if tampered or the key is wrong); falls back to the legacy format. */
export function decrypt(ciphertext: string, userId: string): string {
  if (!ciphertext) return ''
  if (!isCurrentFormat(ciphertext)) return decryptLegacy(ciphertext, userId)

  const raw = Buffer.from(ciphertext.slice(VERSION_PREFIX.length), 'base64')
  if (raw.length < IV_LENGTH + TAG_LENGTH) throw new Error('Ciphertext is truncated')
  const iv = raw.subarray(0, IV_LENGTH)
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const body = raw.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(userId), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

export function encryptJson(obj: unknown, userId: string): string {
  return encrypt(JSON.stringify(obj), userId)
}

export function decryptJson<T>(ciphertext: string, userId: string): T {
  return JSON.parse(decrypt(ciphertext, userId)) as T
}
