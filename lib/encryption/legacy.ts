import CryptoJS from 'crypto-js'

/**
 * Legacy CryptoJS passphrase-AES (unauthenticated). Kept only so rows written before the
 * AES-256-GCM migration stay readable; scripts/migrate-encryption.ts rewrites them.
 */
export function decryptLegacy(ciphertext: string, userId: string): string {
  const key = CryptoJS.PBKDF2(process.env.ENCRYPTION_SECRET!, userId, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString()
  return CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8)
}
