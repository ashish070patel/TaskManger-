/**
 * Encrypt and decrypt task descriptions using AES-GCM via the Web Crypto API.
 * The encryption key is derived from the ENCRYPTION_KEY environment variable.
 *
 * ENCRYPTION_KEY must be set — the app will throw at startup if missing.
 */

// Fail fast if ENCRYPTION_KEY is not configured
if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    "Missing environment variable: ENCRYPTION_KEY. " +
    "Set it in .env.local (development) or your hosting provider's environment config (production). " +
    "This key is used to encrypt task descriptions at rest and must never be changed " +
    "once data has been stored, or existing descriptions will become unreadable."
  )
}

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256

async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hash = await crypto.subtle.digest("SHA-256", keyData)
  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encrypt(text: string): Promise<string> {
  if (!text) return text
  const key = await deriveKey(process.env.ENCRYPTION_KEY!)
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
    const key = await deriveKey(process.env.ENCRYPTION_KEY!)
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
    // Fallback: return original text for backward compatibility with unencrypted data
    return encryptedText
  }
}