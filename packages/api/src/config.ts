import { URL } from 'url'

function ensureEnv(name: string, allowEmpty = false) {
  const v = process.env[name]
  if (!v && !allowEmpty) {
    throw new Error(`${name} is required`)
  }
  return v
}

const NODE_ENV = process.env.NODE_ENV || 'development'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const API_URL = process.env.API_URL || 'http://localhost:3000'
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000
const ENCRYPTION_KEY_RAW = ensureEnv('ENCRYPTION_KEY')
const JWT_SECRET = ensureEnv('JWT_SECRET')
const DATABASE_URL = ensureEnv('DATABASE_URL')
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (NODE_ENV === 'production' ? 'none' : 'lax')

// Validate ENCRYPTION_KEY length when base64 or raw utf8
function parseEncryptionKey(keyEnv: string) {
  if (keyEnv.startsWith('base64:')) {
    const buf = Buffer.from(keyEnv.slice(7), 'base64')
    if (buf.length !== 32) throw new Error('ENCRYPTION_KEY when decoded from base64 must be 32 bytes')
    return keyEnv
  }
  const buf = Buffer.from(keyEnv, 'utf8')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes')
  return keyEnv
}

parseEncryptionKey(ENCRYPTION_KEY_RAW!)

export default {
  NODE_ENV,
  FRONTEND_URL,
  API_URL,
  PORT,
  ENCRYPTION_KEY: ENCRYPTION_KEY_RAW!,
  JWT_SECRET: JWT_SECRET!,
  DATABASE_URL: DATABASE_URL!,
  REDIS_URL,
  COOKIE_DOMAIN,
  COOKIE_SAMESITE,
}

