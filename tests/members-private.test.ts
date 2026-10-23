import { webcrypto } from 'node:crypto'
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto
import { deriveEduKey } from '../src/utils/eduCrypto'
import { encryptMembersForCloud, decryptMembersFromCloud } from '../src/utils/memberCrypto'
import { sanitizeForCloud } from '../src/sync/githubSync'
import { mergeAppData } from '../src/sync/merge'
import type { Member } from '../src/types'
let pass = 0
const ok = (c: unknown, n: string) => { if (!c) { console.error('FAIL', n); process.exit(1) } pass++; console.log('PASS', n) }
const now = new Date().toISOString()
const m: Member = { id: 'm1', membershipNo: '1', name: 'Test', phone: '98765 43210', address: 'Flat 1, Mira Road', feePlan: 'monthly', status: 'active', nextDueDate: '2026-11-01', notes: '', createdAt: now, updatedAt: now } as Member
const key = await deriveEduKey('aditya@1989')
const wrong = await deriveEduKey('nope')
const enc = await encryptMembersForCloud([m], key)
ok(enc[0].phone === '' && enc[0].address === '' && enc[0].secret!.startsWith('v1.'), 'encrypt blanks plaintext')
const s = JSON.stringify(sanitizeForCloud({ version: 1, settings: {} as any, members: [m], payments: [], expenses: [] } as any))
ok(!s.includes('98765') && !s.includes('Mira Road'), 'sanitize strips plaintext even if not encrypted')
const s2 = JSON.stringify(sanitizeForCloud({ version: 1, settings: {} as any, members: enc, payments: [], expenses: [] } as any))
ok(s2.includes('v1.') && !/\d{5}\s?\d{5}/.test(s2), 'sanitize keeps ciphertext, no phone')
const dec = await decryptMembersFromCloud(enc, key)
ok(dec[0].phone === m.phone && dec[0].address === m.address, 'admin decrypts phone+address')
const bad = await decryptMembersFromCloud(enc, wrong)
ok(bad[0].phone === '', 'wrong key reveals nothing')
const pub = await decryptMembersFromCloud(enc, null)
ok(pub[0].phone === '', 'public (no key) sees no phone')
const again = await encryptMembersForCloud([{ ...m, secret: enc[0].secret }], key)
ok(again[0].secret === enc[0].secret, 'unchanged contact reuses ciphertext')
const merged = mergeAppData({ version: 1, settings: {} as any, members: [m], payments: [], expenses: [] } as any,
  { version: 1, settings: {} as any, members: enc, payments: [], expenses: [] } as any)
ok(merged.members[0].phone === m.phone, 'undecrypted cloud copy does not wipe local phone')
console.log(`${pass} passed`)
