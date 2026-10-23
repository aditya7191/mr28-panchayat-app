/**
 * Encryption for PRIVATE education fields (mobile number, marksheet link).
 * The data gist is public, so these fields are stored there only as AES-GCM ciphertext.
 * Key = PBKDF2-SHA256(admin password, app salt, 150k iterations) → AES-256-GCM.
 * The key exists only in memory / this tab's sessionStorage after admin login.
 */
import type { EduPrivate } from '../types'

const SALT = 'mr28-panchayat-edu-private-v1'
const ITER = 150_000
const SESSION_KEY = 'mr28-edu-key'

const subtle = () => globalThis.crypto.subtle

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function deriveEduKey(password: string): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SALT), iterations: ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

/** Returns "v1.<iv>.<ct>", or '' when there is nothing private to store. */
export async function encryptPrivate(key: CryptoKey, p: EduPrivate): Promise<string> {
  const mobile = (p.mobile || '').trim()
  const marksheet = (p.marksheet || '').trim()
  const parents = (p.parents || '').trim()
  if (!mobile && !marksheet && !parents) return ''
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ mobile, marksheet, parents })))
  return `v1.${b64(iv)}.${b64(ct)}`
}

/** null = wrong key / corrupt. Empty secret → empty fields. */
export async function decryptPrivate(key: CryptoKey, secret: string): Promise<EduPrivate | null> {
  if (!secret) return { mobile: '', marksheet: '', parents: '' }
  const [v, iv, ct] = secret.split('.')
  if (v !== 'v1' || !iv || !ct) return null
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct))
    const o = JSON.parse(new TextDecoder().decode(pt))
    return { mobile: String(o.mobile || ''), marksheet: String(o.marksheet || ''), parents: String(o.parents || '') }
  } catch {
    return null
  }
}

export async function saveSessionKey(key: CryptoKey): Promise<void> {
  try {
    const raw = await subtle().exportKey('raw', key)
    sessionStorage.setItem(SESSION_KEY, b64(raw))
  } catch {
    /* ignore */
  }
}

export async function loadSessionKey(): Promise<CryptoKey | null> {
  try {
    const s = sessionStorage.getItem(SESSION_KEY)
    if (!s) return null
    return await subtle().importKey('raw', unb64(s), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
}

export function clearSessionKey(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
