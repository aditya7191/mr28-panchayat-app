import { openDB, type IDBPDatabase } from 'idb'
import type { AppData, EduProgram, EduStudent, Expense, Member, Payment, Settings, Tombstones } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const DB_NAME = 'mr28-panchayat'
const DB_VERSION = 1
const STORE = 'kv'

type KvValue =
  | Settings
  | Member[]
  | Payment[]
  | Expense[]
  | EduProgram[]
  | EduStudent[]
  | number
  | string
  | string[]
  | Tombstones
  | BackupSnapshot[]

export interface BackupSnapshot {
  id: string
  at: string // ISO time the snapshot was taken
  reason: string
  data: AppData
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

async function get<T extends KvValue>(key: string): Promise<T | undefined> {
  const db = await getDb()
  return db.get(STORE, key) as Promise<T | undefined>
}

async function set(key: string, value: KvValue): Promise<void> {
  const db = await getDb()
  await db.put(STORE, value, key)
}

export async function loadSettings(): Promise<Settings> {
  const s = await get<Settings>('settings')
  return s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await set('settings', settings)
}

export async function loadMembers(): Promise<Member[]> {
  return (await get<Member[]>('members')) ?? []
}

export async function saveMembers(members: Member[]): Promise<void> {
  await set('members', members)
}

export async function loadPayments(): Promise<Payment[]> {
  return (await get<Payment[]>('payments')) ?? []
}

export async function savePayments(payments: Payment[]): Promise<void> {
  await set('payments', payments)
}

export async function loadDeleted(): Promise<Tombstones> {
  const t = await get<Tombstones>('deleted')
  return {
    members: { ...(t?.members || {}) },
    payments: { ...(t?.payments || {}) },
    expenses: { ...(t?.expenses || {}) },
    eduPrograms: { ...(t?.eduPrograms || {}) },
    eduStudents: { ...(t?.eduStudents || {}) },
  }
}

export async function loadEduPrograms(): Promise<EduProgram[]> {
  return (await get<EduProgram[]>('eduPrograms')) ?? []
}

export async function loadEduStudents(): Promise<EduStudent[]> {
  return (await get<EduStudent[]>('eduStudents')) ?? []
}

export async function loadExpenses(): Promise<Expense[]> {
  return (await get<Expense[]>('expenses')) ?? []
}

// ---------- Bill images (kept on this phone; uploaded to the bills gist) ----------

export async function getLocalBill(id: string): Promise<string | undefined> {
  return get<string>(`bill:${id}`)
}

export async function putLocalBill(id: string, dataUrl: string): Promise<void> {
  await set(`bill:${id}`, dataUrl)
}

export async function getPendingBills(): Promise<string[]> {
  return (await get<string[]>('pendingBills')) ?? []
}

export async function setPendingBills(ids: string[]): Promise<void> {
  await set('pendingBills', ids)
}

/** Read everything stored on this phone. */
export async function loadAll(): Promise<AppData> {
  const [settings, members, payments, expenses, deleted, eduPrograms, eduStudents] = await Promise.all([
    loadSettings(),
    loadMembers(),
    loadPayments(),
    loadExpenses(),
    loadDeleted(),
    loadEduPrograms(),
    loadEduStudents(),
  ])
  return { version: 1, settings, members, payments, expenses, eduPrograms, eduStudents, deleted }
}

/** Write settings + members + payments + deletion markers in ONE transaction (all or nothing). */
export async function saveAll(data: AppData): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  const st = tx.objectStore(STORE)
  await Promise.all([
    st.put({ ...DEFAULT_SETTINGS, ...(data.settings || {}) }, 'settings'),
    st.put(Array.isArray(data.members) ? data.members : [], 'members'),
    st.put(Array.isArray(data.payments) ? data.payments : [], 'payments'),
    st.put(Array.isArray(data.expenses) ? data.expenses : [], 'expenses'),
    st.put(Array.isArray(data.eduPrograms) ? data.eduPrograms : [], 'eduPrograms'),
    st.put(Array.isArray(data.eduStudents) ? data.eduStudents : [], 'eduStudents'),
    st.put(
      {
        members: { ...(data.deleted?.members || {}) },
        payments: { ...(data.deleted?.payments || {}) },
        expenses: { ...(data.deleted?.expenses || {}) },
        eduPrograms: { ...(data.deleted?.eduPrograms || {}) },
        eduStudents: { ...(data.deleted?.eduStudents || {}) },
      },
      'deleted',
    ),
    tx.done,
  ])
}

// ---------- Automatic backup snapshots (kept on this phone) ----------

export const MAX_BACKUPS = 10
const LS_BACKUP_KEY = 'mr28-backups-v1'

function readLsBackups(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY)
    const arr = raw ? (JSON.parse(raw) as BackupSnapshot[]) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeLsBackups(list: BackupSnapshot[]): void {
  // Mirror in localStorage as a second copy; trim if the browser quota is small.
  for (let n = list.length; n > 0; n--) {
    try {
      localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(list.slice(0, n)))
      return
    } catch {
      /* quota — try fewer */
    }
  }
}

/** Newest first. Merges IndexedDB + localStorage copies. */
export async function listBackups(): Promise<BackupSnapshot[]> {
  let idbList: BackupSnapshot[] = []
  try {
    idbList = (await get<BackupSnapshot[]>('backups')) ?? []
  } catch {
    idbList = []
  }
  const byId = new Map<string, BackupSnapshot>()
  for (const b of [...idbList, ...readLsBackups()]) {
    if (b && b.id && b.data && !byId.has(b.id)) byId.set(b.id, b)
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at))
}

/**
 * Save a snapshot of `data` before it is changed. Skips if identical to the newest snapshot.
 * Keeps the newest MAX_BACKUPS snapshots in IndexedDB and mirrors them to localStorage.
 */
export async function addBackup(
  data: AppData,
  reason: string,
  fingerprint: (d: AppData) => string,
): Promise<void> {
  const members = Array.isArray(data.members) ? data.members : []
  const payments = Array.isArray(data.payments) ? data.payments : []
  const expenses = Array.isArray(data.expenses) ? data.expenses : []
  const eduStudents = Array.isArray(data.eduStudents) ? data.eduStudents : []
  if (members.length === 0 && payments.length === 0 && expenses.length === 0 && eduStudents.length === 0) return
  const list = await listBackups()
  const snap: AppData = {
    version: 1,
    settings: { ...data.settings, adminPassword: '' },
    members,
    payments,
    expenses,
    eduPrograms: Array.isArray(data.eduPrograms) ? data.eduPrograms : [],
    eduStudents,
    deleted: data.deleted,
    exportedAt: new Date().toISOString(),
  }
  if (list[0] && fingerprint(list[0].data) === fingerprint(snap)) return
  const entry: BackupSnapshot = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    reason,
    data: snap,
  }
  const next = [entry, ...list].slice(0, MAX_BACKUPS)
  try {
    await set('backups', next)
  } catch (e) {
    console.error('Backup to IndexedDB failed', e)
  }
  writeLsBackups(next)
}

export async function exportAllData(): Promise<AppData> {
  const all = await loadAll()
  return { ...all, exportedAt: new Date().toISOString() }
}
