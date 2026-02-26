/**
 * Encrypt and decrypt task descriptions using AES-GCM via the Web Crypto API.
 * The encryption key is derived from the ENCRYPTION_KEY env variable.
 */

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256

function getEncryptionKey(): string {
  return process.env.ENCRYPTION_KEY || "default-encryption-key-change-me-32chars!"
}

async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hash = await crypto.subtle.digest("SHA-256", keyData)
  return crypto.subtle.importKey("raw", hash, { name: ALGORITHM, length: KEY_LENGTH }, false, [
    "encrypt",
    "decrypt",
  ])
}

export async function encrypt(text: string): Promise<string> {
  if (!text) return text
  const key = await deriveKey(getEncryptionKey())
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  )
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) return encryptedText
  try {
    const key = await deriveKey(getEncryptionKey())
    const combined = new Uint8Array(
      atob(encryptedText)
        .split("")
        .map((c) => c.charCodeAt(0))
    )
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    // If decryption fails, return original text (for backward compatibility)
    return encryptedText
  }
}
