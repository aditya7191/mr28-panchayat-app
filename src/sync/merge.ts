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
  type EduProgram,
  type EduStudent,
  type Expense,
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

export function expenseTime(e: Expense): string {
  return e.updatedAt || e.createdAt || ''
}

export function eduTime(r: EduProgram | EduStudent): string {
  return r.updatedAt || r.createdAt || ''
}

export function normalizeTombstones(t?: Partial<Tombstones> | null): Tombstones {
  return {
    members: { ...(t?.members || {}) },
    payments: { ...(t?.payments || {}) },
    expenses: { ...(t?.expenses || {}) },
    eduPrograms: { ...(t?.eduPrograms || {}) },
    eduStudents: { ...(t?.eduStudents || {}) },
  }
}

/** Newest-first by date, then creation time. */
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || ''),
  )
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

  // Admin reset epoch: anything from before the newest reset is dropped on every device.
  const lReset = ls.resetAt || ''
  const rReset = rs.resetAt || ''
  const resetAt = lReset > rReset ? lReset : rReset
  const localCurrent = lReset === resetAt
  const remoteCurrent = rReset === resetAt
  if (resetAt && !localCurrent) Object.assign(base, rs)
  const afterReset = <T,>(arr: T[], time: (r: T) => string): T[] =>
    resetAt ? arr.filter((r) => time(r) > resetAt) : arr
  const lMembers = afterReset(Array.isArray(local.members) ? local.members : [], memberTime)
  const rMembers = afterReset(Array.isArray(remote.members) ? remote.members : [], memberTime)
  const lPayments = afterReset(Array.isArray(local.payments) ? local.payments : [], paymentTime)
  const rPayments = afterReset(Array.isArray(remote.payments) ? remote.payments : [], paymentTime)
  const lExpenses = afterReset(Array.isArray(local.expenses) ? local.expenses : [], expenseTime)
  const rExpenses = afterReset(Array.isArray(remote.expenses) ? remote.expenses : [], expenseTime)
  const lEduP = afterReset(Array.isArray(local.eduPrograms) ? local.eduPrograms : [], eduTime)
  const rEduP = afterReset(Array.isArray(remote.eduPrograms) ? remote.eduPrograms : [], eduTime)
  const lEduS = afterReset(Array.isArray(local.eduStudents) ? local.eduStudents : [], eduTime)
  const rEduS = afterReset(Array.isArray(remote.eduStudents) ? remote.eduStudents : [], eduTime)

  const deleted: Tombstones = {
    members: mergeTombMap(
      normalizeTombstones(local.deleted).members,
      normalizeTombstones(remote.deleted).members,
    ),
    payments: mergeTombMap(
      normalizeTombstones(local.deleted).payments,
      normalizeTombstones(remote.deleted).payments,
    ),
    expenses: mergeTombMap(
      normalizeTombstones(local.deleted).expenses,
      normalizeTombstones(remote.deleted).expenses,
    ),
    eduPrograms: mergeTombMap(
      normalizeTombstones(local.deleted).eduPrograms,
      normalizeTombstones(remote.deleted).eduPrograms,
    ),
    eduStudents: mergeTombMap(
      normalizeTombstones(local.deleted).eduStudents,
      normalizeTombstones(remote.deleted).eduStudents,
    ),
  }

  const members = mergeRecords(
    lMembers,
    rMembers,
    memberTime,
    deleted.members,
  )
  const payments = sortPayments(
    mergeRecords(
      lPayments,
      rPayments,
      paymentTime,
      deleted.payments,
    ),
  )

  const expenses = sortExpenses(
    mergeRecords(lExpenses, rExpenses, expenseTime, deleted.expenses),
  )

  const eduPrograms = mergeRecords(lEduP, rEduP, eduTime, deleted.eduPrograms)
  const eduStudents = mergeRecords(lEduS, rEduS, eduTime, deleted.eduStudents)

  // Counters never go backwards and never reuse a number already issued.
  const usedMember = maxUsedCounter([
    ...lMembers.map((m) => m.membershipNo),
    ...rMembers.map((m) => m.membershipNo),
  ])
  const usedReceipt = maxUsedCounter([
    ...lPayments.map((p) => p.receiptNo),
    ...rPayments.map((p) => p.receiptNo),
  ])
  const usedExpense = maxUsedCounter([
    ...lExpenses.map((e) => e.voucherNo),
    ...rExpenses.map((e) => e.voucherNo),
  ])
  const settings: Settings = {
    ...base,
    nextExpenseCounter: Math.max(
      localCurrent ? ls.nextExpenseCounter || 1 : 1,
      remoteCurrent ? rs.nextExpenseCounter || 1 : 1,
      usedExpense + 1,
    ),
    nextMemberCounter: Math.max(
      localCurrent ? ls.nextMemberCounter || 1 : 1,
      remoteCurrent ? rs.nextMemberCounter || 1 : 1,
      usedMember + 1,
    ),
    nextReceiptCounter: Math.max(
      localCurrent ? ls.nextReceiptCounter || 1 : 1,
      remoteCurrent ? rs.nextReceiptCounter || 1 : 1,
      usedReceipt + 1,
    ),
    ...(resetAt ? { resetAt } : {}),
    // Admin password stays on this phone only.
    adminPassword: ls.adminPassword || DEFAULT_SETTINGS.adminPassword,
  }

  return {
    version: 1,
    settings,
    members,
    payments,
    expenses,
    eduPrograms,
    eduStudents,
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
  const bExpenses = (Array.isArray(backup.expenses) ? backup.expenses : []).map(
    (e) => {
      delete deleted.expenses[e.id]
      return { ...e, updatedAt: now }
    },
  )
  const bEduP = (Array.isArray(backup.eduPrograms) ? backup.eduPrograms : []).map((r) => {
    delete deleted.eduPrograms[r.id]
    return { ...r, updatedAt: now }
  })
  const bEduS = (Array.isArray(backup.eduStudents) ? backup.eduStudents : []).map((r) => {
    delete deleted.eduStudents[r.id]
    return { ...r, updatedAt: now }
  })
  const merged = mergeAppData(
    { ...current, deleted },
    {
      ...current,
      members: bMembers,
      payments: bPayments,
      expenses: bExpenses,
      eduPrograms: bEduP,
      eduStudents: bEduS,
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
        nextExpenseCounter: Math.max(
          current.settings.nextExpenseCounter || 1,
          backup.settings?.nextExpenseCounter || 1,
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
    (d.expenses || []).map((e) => [e.id, expenseTime(e), e.amountPaise]).sort(),
    Object.keys(d.deleted?.expenses || {}).sort(),
    (d.eduPrograms || []).map((r) => [r.id, eduTime(r)]).sort(),
    (d.eduStudents || []).map((r) => [r.id, eduTime(r)]).sort(),
    Object.keys(d.deleted?.eduPrograms || {}).sort(),
    Object.keys(d.deleted?.eduStudents || {}).sort(),
    s.nextMemberCounter,
    s.nextReceiptCounter,
    s.nextExpenseCounter || 1,
    s.settingsUpdatedAt || '',
    s.resetAt || '',
  ])
}

/** Full equality of the parts that are stored locally. */
export function sameData(a: AppData, b: AppData): boolean {
  return (
    JSON.stringify([a.settings, a.members, a.payments, a.expenses || [], a.eduPrograms || [], a.eduStudents || [], normalizeTombstones(a.deleted)]) ===
    JSON.stringify([b.settings, b.members, b.payments, b.expenses || [], b.eduPrograms || [], b.eduStudents || [], normalizeTombstones(b.deleted)])
  )
}

export function totalAmount(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
}
