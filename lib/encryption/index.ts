import CryptoJS from 'crypto-js'

// Encryption key derived from server secret + user_id
// This means each user's data is encrypted with a unique key
function deriveKey(userId: string): string {
  const serverSecret = process.env.ENCRYPTION_SECRET!
  return CryptoJS.PBKDF2(serverSecret, userId, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString()
}

export function encrypt(plaintext: string, userId: string): string {
  const key = deriveKey(userId)
  const encrypted = CryptoJS.AES.encrypt(plaintext, key)
  return encrypted.toString()
}

export function decrypt(ciphertext: string, userId: string): string {
  const key = deriveKey(userId)
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key)
  return decrypted.toString(CryptoJS.enc.Utf8)
}

export function encryptJson(obj: unknown, userId: string): string {
  return encrypt(JSON.stringify(obj), userId)
}

export function decryptJson<T>(ciphertext: string, userId: string): T {
  return JSON.parse(decrypt(ciphertext, userId)) as T
}
