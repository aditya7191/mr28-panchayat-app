import { openDB, type IDBPDatabase } from 'idb'
import type { AppData, Member, Payment, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const DB_NAME = 'mr28-panchayat'
const DB_VERSION = 1
const STORE = 'kv'

type KvValue = Settings | Member[] | Payment[] | number

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

export async function exportAllData(): Promise<AppData> {
  const [settings, members, payments] = await Promise.all([
    loadSettings(),
    loadMembers(),
    loadPayments(),
  ])
  return {
    version: 1,
    settings,
    members,
    payments,
    exportedAt: new Date().toISOString(),
  }
}

export async function importAllData(data: AppData): Promise<void> {
  if (!data || typeof data !== 'object') throw new Error('Invalid data')
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }
  const members = Array.isArray(data.members) ? data.members : []
  const payments = Array.isArray(data.payments) ? data.payments : []
  await Promise.all([
    saveSettings(settings),
    saveMembers(members),
    savePayments(payments),
  ])
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    saveSettings({ ...DEFAULT_SETTINGS }),
    saveMembers([]),
    savePayments([]),
  ])
}
