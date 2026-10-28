import { beforeAll, describe, expect, it } from 'vitest'
import CryptoJS from 'crypto-js'

beforeAll(() => { process.env.ENCRYPTION_SECRET = 'test-secret-test-secret-test-secret' })

async function load() { return import('@/lib/encryption') }

describe('encryption', () => {
  it('round-trips unicode text and uses the v2 prefix', async () => {
    const { encrypt, decrypt } = await load()
    const text = 'Idea: café ☕ — 日本語\n## Heading'
    const ct = encrypt(text, 'user-1')
    expect(ct.startsWith('v2:')).toBe(true)
    expect(decrypt(ct, 'user-1')).toBe(text)
  })

  it('uses a fresh IV each time', async () => {
    const { encrypt } = await load()
    expect(encrypt('same', 'u')).not.toBe(encrypt('same', 'u'))
  })

  it('detects tampering with the ciphertext', async () => {
    const { encrypt, decrypt } = await load()
    const raw = Buffer.from(encrypt('secret note', 'u').slice(3), 'base64')
    raw[raw.length - 1] ^= 1
    expect(() => decrypt('v2:' + raw.toString('base64'), 'u')).toThrow()
  })

  it('detects tampering with the auth tag', async () => {
    const { encrypt, decrypt } = await load()
    const raw = Buffer.from(encrypt('secret note', 'u').slice(3), 'base64')
    raw[12] ^= 1
    expect(() => decrypt('v2:' + raw.toString('base64'), 'u')).toThrow()
  })

  it('cannot be decrypted with another user id', async () => {
    const { encrypt, decrypt } = await load()
    expect(() => decrypt(encrypt('secret', 'user-a'), 'user-b')).toThrow()
  })

  it('rejects truncated ciphertext', async () => {
    const { decrypt } = await load()
    expect(() => decrypt('v2:AAAA', 'u')).toThrow()
  })

  it('still reads legacy CryptoJS ciphertext', async () => {
    const { decrypt } = await load()
    const key = CryptoJS.PBKDF2(process.env.ENCRYPTION_SECRET!, 'u', { keySize: 8, iterations: 10000 }).toString()
    expect(decrypt(CryptoJS.AES.encrypt('old row', key).toString(), 'u')).toBe('old row')
  })

  it('handles the empty string', async () => {
    const { encrypt, decrypt } = await load()
    expect(decrypt(encrypt('', 'u'), 'u')).toBe('')
    expect(decrypt('', 'u')).toBe('')
  })
})
