/**
 * Member contact fields (phone, address) are PRIVATE. In the public gist they are
 * stored only as AES-GCM ciphertext in `member.secret` (same key as education data).
 * Locally (admin's own device) they stay plaintext so WhatsApp receipts/reminders work.
 */
import type { Member } from '../types'
import { decryptPrivate, encryptPrivate } from './eduCrypto'

/** Ciphertext slot reuses the edu format: { mobile: phone, marksheet: '', parents: '' } + address. */
async function encContact(key: CryptoKey, phone: string, address: string): Promise<string> {
  if (!phone.trim() && !address.trim()) return ''
  return encryptPrivate(key, { mobile: phone.trim(), marksheet: '', parents: address.trim() })
}

async function decContact(key: CryptoKey, secret: string): Promise<{ phone: string; address: string } | null> {
  const p = await decryptPrivate(key, secret)
  return p ? { phone: p.mobile, address: p.parents || '' } : null
}

/** For upload: move phone/address into `secret` (reusing unchanged ciphertext), blank plaintext. */
export async function encryptMembersForCloud(members: Member[], key: CryptoKey): Promise<Member[]> {
  const out: Member[] = []
  for (const m of members) {
    const phone = (m.phone || '').trim()
    const address = (m.address || '').trim()
    let secret = ''
    if (phone || address) {
      const old = m.secret ? await decContact(key, m.secret) : null
      secret = old && old.phone === phone && old.address === address ? m.secret! : await encContact(key, phone, address)
    } else if (m.secret && !(await decContact(key, m.secret))) {
      secret = m.secret // encrypted with another password: keep, don't lose it
    }
    out.push({ ...m, phone: '', address: '', secret })
  }
  return out
}

/** After download: fill phone/address from `secret` when the admin key is available. */
export async function decryptMembersFromCloud(members: Member[], key: CryptoKey | null): Promise<Member[]> {
  if (!key) return members
  const out: Member[] = []
  for (const m of members) {
    if (m.secret && !m.phone && !m.address) {
      const c = await decContact(key, m.secret)
      out.push(c ? { ...m, ...c } : m)
    } else out.push(m)
  }
  return out
}

export function membersHaveContacts(members: Member[]): boolean {
  return members.some((m) => (m.phone || '').trim() || (m.address || '').trim())
}
