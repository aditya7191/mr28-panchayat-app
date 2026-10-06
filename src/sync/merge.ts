/**
 * Record-level merge of two copies of the database (e.g. this phone + cloud gist).
 *
 * Safety rules (data must never be silently lost):
 *  - Members and payments are merged by `id` (union). A record that exists on only one side is KEPT.
 *  - If both sides have the same id, the newer edit wins (updatedAt → createdAt/paidAt).
 *    On a tie the local copy wins.
 *  - A record is removed ONLY when an explicit deletion marker (tombstone) exists that is
 *    at least as new as the record. "Missing from the cloud" never deletes anything.
 *  - Counters (next member / receipt number) = max of both sides and of numbers already used.
 *  - The admin password always stays local (it is never published to the cloud).
 */
import {
  DEFAULT_SETTINGS,
  type AppData,
  type Member,
  type Payment,
  type Settings,
  type Tombstones,
} from '../types'

export function memberTime(m: Member): string {
  return m.updatedAt || m.createdAt || ''
}

export function paymentTime(p: Payment): string {
  return p.updatedAt || p.paidAt || ''
}

export function normalizeTombstones(t?: Partial<Tombstones> | null): Tombstones {
  return {
    members: { ...(t?.members || {}) },
    payments: { ...(t?.payments || {}) },
  }
}

function mergeTombMap(
  a: Record<string, string>,
  b: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...a }
  for (const [id, at] of Object.entries(b)) {
    if (!out[id] || at > out[id]) out[id] = at
  }
  return out
}

function mergeRecords<T extends { id: string }>(
  local: T[],
  remote: T[],
  time: (r: T) => string,
  tombs: Record<string, string>,
): T[] {
  const byId = new Map<string, T>()
  const order: string[] = []
  for (const r of local) {
    if (!r || !r.id) continue
    if (!byId.has(r.id)) order.push(r.id)
    byId.set(r.id, r)
  }
  for (const r of remote) {
    if (!r || !r.id) continue
    const cur = byId.get(r.id)
    if (!cur) {
      byId.set(r.id, r)
      order.push(r.id)
    } else if (time(r) > time(cur)) {
      byId.set(r.id, r)
    }
  }
  const out: T[] = []
  for (const id of order) {
    const r = byId.get(id)!
    const deletedAt = tombs[id]
    if (deletedAt && deletedAt >= time(r)) continue
    out.push(r)
  }
  return out
}

function maxUsedCounter(nos: string[]): number {
  let max = 0
  for (const no of nos) {
    const m = /(\d+)\s*$/.exec(no || '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max
}

/** Newest-first by paidAt (same order the app uses for display). */
export function sortPayments(payments: Payment[]): Payment[] {
  return [...payments].sort((a, b) =>
    (b.paidAt || '').localeCompare(a.paidAt || ''),
  )
}

export function mergeAppData(local: AppData, remote: AppData): AppData {
  const ls: Settings = { ...DEFAULT_SETTINGS, ...(local.settings || {}) }
  const rs: Settings = { ...DEFAULT_SETTINGS, ...(remote.settings || {}) }

  // Settings: newer explicit admin edit wins; if unknown, keep this phone's settings.
  const lAt = ls.settingsUpdatedAt || ''
  const rAt = rs.settingsUpdatedAt || ''
  const base: Settings = rAt > lAt ? { ...rs } : { ...ls }

  const deleted: Tombstones = {
    members: mergeTombMap(
      normalizeTombstones(local.deleted).members,
      normalizeTombstones(remote.deleted).members,
    ),
    payments: mergeTombMap(
      normalizeTombstones(local.deleted).payments,
      normalizeTombstones(remote.deleted).payments,
    ),
  }

  const members = mergeRecords(
    Array.isArray(local.members) ? local.members : [],
    Array.isArray(remote.members) ? remote.members : [],
    memberTime,
    deleted.members,
  )
  const payments = sortPayments(
    mergeRecords(
      Array.isArray(local.payments) ? local.payments : [],
      Array.isArray(remote.payments) ? remote.payments : [],
      paymentTime,
      deleted.payments,
    ),
  )

  // Counters never go backwards and never reuse a number already issued.
  const usedMember = maxUsedCounter([
    ...(local.members || []).map((m) => m.membershipNo),
    ...(remote.members || []).map((m) => m.membershipNo),
  ])
  const usedReceipt = maxUsedCounter([
    ...(local.payments || []).map((p) => p.receiptNo),
    ...(remote.payments || []).map((p) => p.receiptNo),
  ])
  const settings: Settings = {
    ...base,
    nextMemberCounter: Math.max(
      ls.nextMemberCounter || 1,
      rs.nextMemberCounter || 1,
      usedMember + 1,
    ),
    nextReceiptCounter: Math.max(
      ls.nextReceiptCounter || 1,
      rs.nextReceiptCounter || 1,
      usedReceipt + 1,
    ),
    // Admin password stays on this phone only.
    adminPassword: ls.adminPassword || DEFAULT_SETTINGS.adminPassword,
  }

  return {
    version: 1,
    settings,
    members,
    payments,
    deleted,
    exportedAt: remote.exportedAt || local.exportedAt,
  }
}

/**
 * Bring records from a backup/imported file back into the current data.
 * Nothing currently present is removed. Records in the backup win and are stamped
 * as edited "now" so they also beat older deletion markers on other devices.
 */
export function restoreInto(current: AppData, backup: AppData): AppData {
  const now = new Date().toISOString()
  const deleted = normalizeTombstones(current.deleted)
  const bMembers = (Array.isArray(backup.members) ? backup.members : []).map(
    (m) => {
      delete deleted.members[m.id]
      return { ...m, updatedAt: now }
    },
  )
  const bPayments = (Array.isArray(backup.payments) ? backup.payments : []).map(
    (p) => {
      delete deleted.payments[p.id]
      return { ...p, updatedAt: now }
    },
  )
  const merged = mergeAppData(
    { ...current, deleted },
    {
      ...current,
      members: bMembers,
      payments: bPayments,
      deleted,
      settings: {
        ...current.settings,
        nextMemberCounter: Math.max(
          current.settings.nextMemberCounter || 1,
          backup.settings?.nextMemberCounter || 1,
        ),
        nextReceiptCounter: Math.max(
          current.settings.nextReceiptCounter || 1,
          backup.settings?.nextReceiptCounter || 1,
        ),
      },
    },
  )
  return merged
}

/** Short fingerprint of the records (used to skip duplicate backups / no-op writes). */
export function dataFingerprint(d: AppData): string {
  const s = d.settings || DEFAULT_SETTINGS
  return JSON.stringify([
    (d.members || []).map((m) => [m.id, memberTime(m)]).sort(),
    (d.payments || []).map((p) => [p.id, paymentTime(p), p.amount]).sort(),
    Object.keys(d.deleted?.members || {}).sort(),
    Object.keys(d.deleted?.payments || {}).sort(),
    s.nextMemberCounter,
    s.nextReceiptCounter,
    s.settingsUpdatedAt || '',
  ])
}

/** Full equality of the parts that are stored locally. */
export function sameData(a: AppData, b: AppData): boolean {
  return (
    JSON.stringify([a.settings, a.members, a.payments, normalizeTombstones(a.deleted)]) ===
    JSON.stringify([b.settings, b.members, b.payments, normalizeTombstones(b.deleted)])
  )
}

export function totalAmount(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
}
