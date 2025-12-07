import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function ensureKey(keyEnv: string | undefined) {
  if (!keyEnv) throw new Error('ENCRYPTION_KEY is required')
  // support base64:... format
  if (keyEnv.startsWith('base64:')) return Buffer.from(keyEnv.slice(7), 'base64')
  return Buffer.from(keyEnv, 'utf8')
}

export function encryptToken(plaintext: string, keyEnv: string | undefined) {
  const key = ensureKey(keyEnv)
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64')
  return payload
}

export function decryptToken(payloadB64: string, keyEnv: string | undefined) {
  const key = ensureKey(keyEnv)
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes')
  const data = Buffer.from(payloadB64, 'base64')
  const iv = data.subarray(0, 12)
  const authTag = data.subarray(12, 28)
  const ciphertext = data.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  return decrypted
}

