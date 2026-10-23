import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addBackup,
  listBackups as dbListBackups,
  loadAll,
  saveAll,
  type BackupSnapshot,
} from '../db'
import {
  DEFAULT_SETTINGS,
  type AppData,
  type EduProgram,
  type EduStudent,
  type Expense,
  type ExpenseCategory,
  type FeePlan,
  type Member,
  type Payment,
  type PaymentMethod,
  type Settings,
  type Tombstones,
} from '../types'
import {
  advanceDueDate,
  defaultAmount,
  makeMembershipNo,
  makeReceiptNo,
  todayISO,
  uid,
} from '../utils/format'
import {
  canPush,
  dataFingerprint,
  isCloudSyncEnabled,
  mergeAppData,
  normalizeTombstones,
  pullCloudData,
  pullCloudDataFresh,
  pushCloudData,
  restoreInto,
  sameData,
  type SyncStatus,
} from '../sync'
import { makeVoucherNo } from '../utils/accounts'
import { decryptMembersFromCloud, encryptMembersForCloud, membersHaveContacts } from '../utils/memberCrypto'
import { addBill, uploadPendingBills } from '../utils/bills'
import { getPendingBills } from '../db'

export interface ExpenseInput {
  date: string
  amountPaise: number
  category: ExpenseCategory
  categoryOther: string
  description: string
  paidTo: string
  paidBy: string
  method: PaymentMethod
  billIds: string[]
  /** New images (id → data URL) to store on this phone and upload. */
  newBills?: Record<string, string>
}

export type EduStudentInput = Omit<EduStudent, 'id' | 'createdAt' | 'updatedAt'>

interface StoreCtx {
  ready: boolean
  settings: Settings
  members: Member[]
  payments: Payment[]
  expenses: Expense[]
  pendingBillCount: number
  syncStatus: SyncStatus
  syncError: string
  lastSyncedAt: string | null
  /** Entries on this phone that are not yet in the cloud copy (null = cloud not checked yet). */
  unsyncedCount: number | null
  updateSettings: (s: Settings) => Promise<void>
  addMember: (input: {
    name: string
    phone: string
    address: string
    feePlan: FeePlan
    status: Member['status']
    nextDueDate: string
    notes: string
  }) => Promise<Member>
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  addPayment: (input: {
    memberId: string
    amount: number
    method: PaymentMethod
    periodFrom: string
    periodTo: string
    paidAt: string
    notes: string
  }) => Promise<Payment>
  deletePayment: (id: string) => Promise<void>
  addExpense: (input: ExpenseInput) => Promise<Expense>
  updateExpense: (id: string, input: ExpenseInput) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  /** Admin key for private fields (set by AuthProvider after login). */
  setPrivateKey: (k: CryptoKey | null) => void
  eduPrograms: EduProgram[]
  eduStudents: EduStudent[]
  saveEduProgram: (p: { id?: string; title: string; year: string }) => Promise<EduProgram>
  deleteEduProgram: (id: string) => Promise<void>
  /** `secret` must already be ciphertext (see utils/eduCrypto). */
  saveEduStudent: (s: EduStudentInput & { id?: string }) => Promise<EduStudent>
  deleteEduStudent: (id: string) => Promise<void>
  exportData: () => Promise<AppData>
  importData: (data: AppData) => Promise<void>
  clearData: () => Promise<void>
  refresh: () => Promise<void>
  pullCloud: () => Promise<boolean>
  pushCloud: () => Promise<boolean>
  listBackups: () => Promise<BackupSnapshot[]>
  restoreBackup: (id: string) => Promise<boolean>
  getMember: (id: string) => Member | undefined
}

const Ctx = createContext<StoreCtx | null>(null)

const DAY_MS = 24 * 60 * 60 * 1000

function maxUsed(nos: string[]): number {
  let max = 0
  for (const no of nos) {
    const m = /(\d+)\s*$/.exec(no || '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max
}

/** True if merging would drop or change something that is currently on this phone. */
function mergeLosesLocal(local: AppData, merged: AppData): boolean {
  const mm = new Map(merged.members.map((m) => [m.id, JSON.stringify(m)]))
  for (const m of local.members) {
    if (mm.get(m.id) !== JSON.stringify(m)) return true
  }
  const pm = new Map(merged.payments.map((p) => [p.id, JSON.stringify(p)]))
  for (const p of local.payments) {
    if (pm.get(p.id) !== JSON.stringify(p)) return true
  }
  const em = new Map((merged.expenses || []).map((e) => [e.id, JSON.stringify(e)]))
  for (const e of local.expenses || []) {
    if (em.get(e.id) !== JSON.stringify(e)) return true
  }
  const sm = new Map((merged.eduStudents || []).map((e) => [e.id, JSON.stringify(e)]))
  for (const e of local.eduStudents || []) {
    if (sm.get(e.id) !== JSON.stringify(e)) return true
  }
  const strip = (s: Settings) => ({
    ...s,
    nextMemberCounter: 0,
    nextReceiptCounter: 0,
    nextExpenseCounter: 0,
  })
  return JSON.stringify(strip(local.settings)) !== JSON.stringify(strip(merged.settings))
}

/** How many local entries (or deletions) the cloud copy does not have yet. */
function countUnsynced(local: AppData, cloud: AppData): number {
  const cm = new Map(cloud.members.map((m) => [m.id, m.updatedAt || m.createdAt || '']))
  const cp = new Map(cloud.payments.map((p) => [p.id, p.updatedAt || p.paidAt || '']))
  let n = 0
  for (const m of local.members) {
    const t = cm.get(m.id)
    if (t === undefined || (m.updatedAt || m.createdAt || '') > t) n++
  }
  for (const p of local.payments) {
    const t = cp.get(p.id)
    if (t === undefined || (p.updatedAt || p.paidAt || '') > t) n++
  }
  const ce = new Map((cloud.expenses || []).map((e) => [e.id, e.updatedAt || e.createdAt || '']))
  for (const e of local.expenses || []) {
    const t = ce.get(e.id)
    if (t === undefined || (e.updatedAt || e.createdAt || '') > t) n++
  }
  const cd = normalizeTombstones(cloud.deleted)
  const ld = normalizeTombstones(local.deleted)
  for (const id of Object.keys(ld.members)) if (!cd.members[id]) n++
  for (const id of Object.keys(ld.payments)) if (!cd.payments[id]) n++
  for (const id of Object.keys(ld.expenses)) if (!cd.expenses[id]) n++
  const cs = new Map((cloud.eduStudents || []).map((e) => [e.id, e.updatedAt || e.createdAt || '']))
  for (const e of local.eduStudents || []) {
    const t = cs.get(e.id)
    if (t === undefined || (e.updatedAt || e.createdAt || '') > t) n++
  }
  for (const id of Object.keys(ld.eduStudents)) if (!cd.eduStudents[id]) n++
  return n
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pendingBillCount, setPendingBillCount] = useState(0)
  const [eduPrograms, setEduPrograms] = useState<EduProgram[]>([])
  const [eduStudents, setEduStudents] = useState<EduStudent[]>([])
  const [, setDeleted] = useState<Tombstones>({ members: {}, payments: {}, expenses: {}, eduPrograms: {}, eduStudents: {} })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [unsyncedCount, setUnsyncedCount] = useState<number | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockRef = useRef<Promise<unknown>>(Promise.resolve())
  const lastCloudRef = useRef<AppData | null>(null)
  const syncingRef = useRef<Promise<boolean> | null>(null)
  const syncAgainRef = useRef(false)

  /** Serialize every read-modify-write of local data so nothing overwrites a newer write. */
  const withLock = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = lockRef.current.then(fn, fn)
    lockRef.current = run.catch(() => undefined)
    return run
  }, [])

  const applyState = useCallback((d: AppData) => {
    setSettings(d.settings)
    setMembers(d.members)
    setPayments(d.payments)
    setExpenses(d.expenses || [])
    setEduPrograms(d.eduPrograms || [])
    setEduStudents(d.eduStudents || [])
    setDeleted(normalizeTombstones(d.deleted))
    if (lastCloudRef.current) {
      setUnsyncedCount(countUnsynced(d, lastCloudRef.current))
    }
  }, [])

  /**
   * Core sync: read cloud → merge record-by-record into this phone (never deleting local
   * entries the cloud lacks) → if this phone has a token, upload the merged result.
   */
  const privateKeyRef = useRef<CryptoKey | null>(null)
  const syncWithCloud = useCallback(async (): Promise<boolean> => {
    if (!isCloudSyncEnabled()) return false
    if (syncingRef.current) {
      syncAgainRef.current = true
      return syncingRef.current
    }
    const run = (async (): Promise<boolean> => {
      const writable = canPush()
      setSyncStatus('pulling')
      setSyncError('')
      try {
        const result = writable ? await pullCloudDataFresh() : await pullCloudData()
        if (!result.ok || !result.data) {
          setSyncStatus(writable ? 'error' : 'readonly')
          if (result.error && result.error !== 'Cloud sync disabled') {
            setSyncError(result.error)
          }
          return false
        }
        const remote = { ...result.data, members: await decryptMembersFromCloud(result.data.members || [], privateKeyRef.current) }
        const merged = await withLock(async () => {
          const local = await loadAll()
          const next = mergeAppData(local, remote)
          if (!sameData(local, next)) {
            if (mergeLosesLocal(local, next)) {
              await addBackup(local, 'before-cloud-merge', dataFingerprint)
            }
            await saveAll(next)
          }
          return next
        })
        lastCloudRef.current = remote
        applyState(merged)

        // Upload bill images first so db.json never points to a missing image.
        if (writable) {
          const left = await uploadPendingBills()
          setPendingBillCount(left)
        } else {
          setPendingBillCount((await getPendingBills()).length)
        }

        const needKey = !privateKeyRef.current && membersHaveContacts(merged.members || [])
        if (writable && needKey && countUnsynced(merged, remote) > 0) {
          // Never upload member phones without encryption: wait for admin login (key).
          setSyncStatus('readonly')
          setUnsyncedCount(countUnsynced(merged, remote))
          return false
        }
        if (writable && countUnsynced(merged, remote) > 0) {
          setSyncStatus('pushing')
          const outgoing = privateKeyRef.current
            ? { ...merged, members: await encryptMembersForCloud(merged.members || [], privateKeyRef.current) }
            : merged
          const pushed = await pushCloudData(outgoing)
          if (!pushed.ok) {
            setSyncStatus('error')
            setSyncError(pushed.error || 'Push failed')
            setUnsyncedCount(countUnsynced(merged, remote))
            return false
          }
          lastCloudRef.current = merged
          // Re-read local in case an entry was added while uploading.
          const latest = await loadAll()
          setUnsyncedCount(countUnsynced(latest, merged))
          if (countUnsynced(latest, merged) > 0) syncAgainRef.current = true
        } else {
          setUnsyncedCount(countUnsynced(merged, remote))
        }
        setSyncStatus(writable ? 'ok' : 'readonly')
        setLastSyncedAt(new Date().toISOString())
        return true
      } catch (e) {
        setSyncStatus(writable ? 'error' : 'readonly')
        setSyncError(e instanceof Error ? e.message : 'Cloud sync failed')
        return false
      }
    })()
    syncingRef.current = run
    try {
      return await run
    } finally {
      syncingRef.current = null
      if (syncAgainRef.current) {
        syncAgainRef.current = false
        setTimeout(() => void syncWithCloudRef.current?.(), 300)
      }
    }
  }, [applyState, withLock])
  const syncWithCloudRef = useRef<(() => Promise<boolean>) | null>(null)
  const setPrivateKey = useCallback((k: CryptoKey | null) => {
    const changed = privateKeyRef.current !== k
    privateKeyRef.current = k
    if (changed && k) setTimeout(() => void syncWithCloudRef.current?.(), 50)
  }, [])
  syncWithCloudRef.current = syncWithCloud

  const schedulePush = useCallback(() => {
    if (lastCloudRef.current) {
      void loadAll().then((d) => {
        if (lastCloudRef.current) setUnsyncedCount(countUnsynced(d, lastCloudRef.current))
      })
    }
    if (!canPush()) {
      setSyncStatus((s) => (s === 'error' ? s : 'readonly'))
      return
    }
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null
      void syncWithCloud()
    }, 900)
  }, [syncWithCloud])

  /** Locked read-modify-write of local data. Optionally snapshots the old data first. */
  const mutate = useCallback(
    async <R,>(
      backupReason: string | null,
      fn: (cur: AppData) => [AppData, R],
    ): Promise<R> => {
      const result = await withLock(async () => {
        const cur = await loadAll()
        if (backupReason) await addBackup(cur, backupReason, dataFingerprint)
        const [next, r] = fn(cur)
        await saveAll(next)
        applyState(next)
        return r
      })
      schedulePush()
      return result
    },
    [applyState, schedulePush, withLock],
  )

  const pullCloud = useCallback(() => syncWithCloud(), [syncWithCloud])

  const pushCloud = useCallback(async () => {
    if (!canPush()) {
      setSyncStatus('readonly')
      setSyncError('No GitHub token — add one in Settings → Cloud Sync')
      return false
    }
    return syncWithCloud()
  }, [syncWithCloud])

  const refresh = useCallback(async () => {
    try {
      const local = await withLock(() => loadAll())
      applyState(local)
      // Always open the UI with local/IndexedDB data first — never block on network.
      setReady(true)

      // Daily safety snapshot of this phone's data.
      try {
        const list = await dbListBackups()
        const newest = list[0] ? Date.parse(list[0].at) : 0
        if (!newest || Date.now() - newest > DAY_MS) {
          await addBackup(local, 'daily', dataFingerprint)
        }
      } catch (e) {
        console.error('Daily backup failed', e)
      }

      // Merge shared cloud data in the background (record-by-record, never replacing).
      void syncWithCloud()
    } catch (e) {
      console.error('Store boot failed', e)
      setSettings((prev) => prev ?? { ...DEFAULT_SETTINGS })
      setReady(true)
    }
  }, [applyState, syncWithCloud, withLock])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Re-sync when app becomes visible; flush pending upload when it is hidden.
  useEffect(() => {
    const onVis = () => {
      if (!ready) return
      if (document.visibilityState === 'visible') {
        void syncWithCloud()
      } else if (pushTimer.current) {
        clearTimeout(pushTimer.current)
        pushTimer.current = null
        void syncWithCloud()
      }
    }
    const onOnline = () => {
      if (ready) void syncWithCloud()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
    }
  }, [syncWithCloud, ready])

  useEffect(() => {
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [])

  const updateSettings = useCallback(
    async (s: Settings) => {
      await mutate(null, (cur) => {
        const next: Settings = {
          ...s,
          settingsUpdatedAt: new Date().toISOString(),
          // Never let a counter fall back onto a number that was already issued.
          nextMemberCounter: Math.max(
            Number(s.nextMemberCounter) || 1,
            maxUsed(cur.members.map((m) => m.membershipNo)) + 1,
          ),
          nextReceiptCounter: Math.max(
            Number(s.nextReceiptCounter) || 1,
            maxUsed(cur.payments.map((p) => p.receiptNo)) + 1,
          ),
          nextExpenseCounter: Math.max(
            Number(s.nextExpenseCounter) || 1,
            cur.settings.nextExpenseCounter || 1,
            maxUsed((cur.expenses || []).map((e) => e.voucherNo)) + 1,
          ),
        }
        return [{ ...cur, settings: next }, undefined]
      })
    },
    [mutate],
  )

  const addMember = useCallback(
    (input: {
      name: string
      phone: string
      address: string
      feePlan: FeePlan
      status: Member['status']
      nextDueDate: string
      notes: string
    }) =>
      mutate(null, (cur) => {
        const s = cur.settings
        const counter = Math.max(
          s.nextMemberCounter || 1,
          maxUsed(cur.members.map((m) => m.membershipNo)) + 1,
        )
        const now = new Date().toISOString()
        const member: Member = {
          id: uid(),
          membershipNo: makeMembershipNo(counter),
          name: input.name.trim(),
          phone: input.phone.trim(),
          address: input.address.trim(),
          feePlan: input.feePlan,
          status: input.status,
          nextDueDate: input.nextDueDate || todayISO(),
          notes: input.notes.trim(),
          createdAt: now,
          updatedAt: now,
        }
        return [
          {
            ...cur,
            members: [...cur.members, member],
            settings: { ...s, nextMemberCounter: counter + 1 },
          },
          member,
        ]
      }),
    [mutate],
  )

  const updateMember = useCallback(
    async (id: string, patch: Partial<Member>) => {
      await mutate(null, (cur) => [
        {
          ...cur,
          members: cur.members.map((m) =>
            m.id === id
              ? { ...m, ...patch, id: m.id, updatedAt: new Date().toISOString() }
              : m,
          ),
        },
        undefined,
      ])
    },
    [mutate],
  )

  const deleteMember = useCallback(
    async (id: string) => {
      await mutate('before-delete-member', (cur) => {
        const now = new Date().toISOString()
        const deleted = normalizeTombstones(cur.deleted)
        deleted.members[id] = now
        for (const p of cur.payments) {
          if (p.memberId === id) deleted.payments[p.id] = now
        }
        return [
          {
            ...cur,
            deleted,
            members: cur.members.filter((m) => m.id !== id),
            payments: cur.payments.filter((p) => p.memberId !== id),
          },
          undefined,
        ]
      })
    },
    [mutate],
  )

  const addPayment = useCallback(
    (input: {
      memberId: string
      amount: number
      method: PaymentMethod
      periodFrom: string
      periodTo: string
      paidAt: string
      notes: string
    }) =>
      mutate(null, (cur) => {
        const s = cur.settings
        const counter = Math.max(
          s.nextReceiptCounter || 1,
          maxUsed(cur.payments.map((p) => p.receiptNo)) + 1,
        )
        const now = new Date().toISOString()
        const payment: Payment = {
          id: uid(),
          receiptNo: makeReceiptNo(counter),
          memberId: input.memberId,
          amount: input.amount,
          method: input.method,
          periodFrom: input.periodFrom,
          periodTo: input.periodTo,
          paidAt: input.paidAt || now,
          notes: input.notes.trim(),
          updatedAt: now,
        }
        const member = cur.members.find((m) => m.id === input.memberId)
        let nextMembers = cur.members
        if (member) {
          const nextDue = advanceDueDate(input.periodTo, member.feePlan)
          nextMembers = cur.members.map((m) =>
            m.id === input.memberId
              ? { ...m, nextDueDate: nextDue, updatedAt: now }
              : m,
          )
        }
        return [
          {
            ...cur,
            payments: [payment, ...cur.payments],
            members: nextMembers,
            settings: { ...s, nextReceiptCounter: counter + 1 },
          },
          payment,
        ]
      }),
    [mutate],
  )

  const deletePayment = useCallback(
    async (id: string) => {
      await mutate('before-delete-payment', (cur) => {
        const deleted = normalizeTombstones(cur.deleted)
        deleted.payments[id] = new Date().toISOString()
        return [
          { ...cur, deleted, payments: cur.payments.filter((p) => p.id !== id) },
          undefined,
        ]
      })
    },
    [mutate],
  )

  const storeBills = useCallback(async (bills?: Record<string, string>) => {
    if (!bills) return
    for (const [id, data] of Object.entries(bills)) await addBill(id, data)
    setPendingBillCount((await getPendingBills()).length)
  }, [])

  const cleanExpense = (input: ExpenseInput) => {
    const amt = Math.round(Number(input.amountPaise))
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid amount')
    return {
      date: input.date,
      amountPaise: amt,
      category: input.category,
      categoryOther: input.categoryOther.trim(),
      description: input.description.trim(),
      paidTo: input.paidTo.trim(),
      paidBy: input.paidBy.trim(),
      method: input.method,
      billIds: [...input.billIds],
    }
  }

  const addExpense = useCallback(
    async (input: ExpenseInput) => {
      const clean = cleanExpense(input)
      await storeBills(input.newBills)
      return mutate(null, (cur) => {
        const s = cur.settings
        const list = cur.expenses || []
        const counter = Math.max(
          s.nextExpenseCounter || 1,
          maxUsed(list.map((e) => e.voucherNo)) + 1,
        )
        const now = new Date().toISOString()
        const exp: Expense = {
          id: uid(),
          voucherNo: makeVoucherNo(counter),
          ...clean,
          createdAt: now,
          updatedAt: now,
        }
        return [
          {
            ...cur,
            expenses: [exp, ...list],
            settings: { ...s, nextExpenseCounter: counter + 1 },
          },
          exp,
        ]
      })
    },
    [mutate, storeBills],
  )

  const updateExpense = useCallback(
    async (id: string, input: ExpenseInput) => {
      const clean = cleanExpense(input)
      await storeBills(input.newBills)
      await mutate('before-edit-expense', (cur) => [
        {
          ...cur,
          expenses: (cur.expenses || []).map((e) =>
            e.id === id
              ? { ...e, ...clean, id: e.id, voucherNo: e.voucherNo, updatedAt: new Date().toISOString() }
              : e,
          ),
        },
        undefined,
      ])
    },
    [mutate, storeBills],
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      await mutate('before-delete-expense', (cur) => {
        const deleted = normalizeTombstones(cur.deleted)
        deleted.expenses[id] = new Date().toISOString()
        return [
          { ...cur, deleted, expenses: (cur.expenses || []).filter((e) => e.id !== id) },
          undefined,
        ]
      })
    },
    [mutate],
  )

  const saveEduProgram = useCallback(
    async (p: { id?: string; title: string; year: string }) =>
      mutate(p.id ? 'before-edit-edu-program' : null, (cur) => {
        const now = new Date().toISOString()
        const list = cur.eduPrograms || []
        const old = p.id ? list.find((x) => x.id === p.id) : undefined
        const rec: EduProgram = old
          ? { ...old, title: p.title.trim(), year: p.year.trim(), updatedAt: now }
          : { id: uid(), title: p.title.trim(), year: p.year.trim(), createdAt: now, updatedAt: now }
        return [
          { ...cur, eduPrograms: old ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec] },
          rec,
        ]
      }),
    [mutate],
  )

  const deleteEduProgram = useCallback(
    async (id: string) => {
      await mutate('before-delete-edu-program', (cur) => {
        const now = new Date().toISOString()
        const deleted = normalizeTombstones(cur.deleted)
        deleted.eduPrograms[id] = now
        const studs = cur.eduStudents || []
        for (const st of studs) if (st.programId === id) deleted.eduStudents[st.id] = now
        return [
          {
            ...cur,
            deleted,
            eduPrograms: (cur.eduPrograms || []).filter((x) => x.id !== id),
            eduStudents: studs.filter((x) => x.programId !== id),
          },
          undefined,
        ]
      })
    },
    [mutate],
  )

  const saveEduStudent = useCallback(
    async (input: EduStudentInput & { id?: string }) =>
      mutate(input.id ? 'before-edit-edu-student' : null, (cur) => {
        const now = new Date().toISOString()
        const list = cur.eduStudents || []
        const old = input.id ? list.find((x) => x.id === input.id) : undefined
        const pct = input.resultPct === null || input.resultPct === undefined || (input.resultPct as unknown) === '' ? null : Number(input.resultPct)
        const clean = {
          programId: input.programId,
          name: input.name.trim(),
          school: input.school.trim(),
          standard: input.standard.trim(),
          stream: input.stream.trim(),
          goal: input.goal.trim(),
          parents: (input.parents || '').trim(),
          resultPct: pct !== null && Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : null,
          status: input.status.trim(),
          secret: input.secret.startsWith('v1.') ? input.secret : '',
        }
        const rec: EduStudent = old
          ? { ...old, ...clean, updatedAt: now }
          : { id: uid(), ...clean, createdAt: now, updatedAt: now }
        return [
          { ...cur, eduStudents: old ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec] },
          rec,
        ]
      }),
    [mutate],
  )

  const deleteEduStudent = useCallback(
    async (id: string) => {
      await mutate('before-delete-edu-student', (cur) => {
        const deleted = normalizeTombstones(cur.deleted)
        deleted.eduStudents[id] = new Date().toISOString()
        return [
          { ...cur, deleted, eduStudents: (cur.eduStudents || []).filter((x) => x.id !== id) },
          undefined,
        ]
      })
    },
    [mutate],
  )

  const exportData = useCallback(async () => {
    const d = await withLock(() => loadAll())
    return { ...d, exportedAt: new Date().toISOString() }
  }, [withLock])

  /** Import a JSON backup: adds its entries back; never removes what is already here. */
  const importData = useCallback(
    async (data: AppData) => {
      if (!data || typeof data !== 'object') throw new Error('Invalid data')
      await mutate('before-import', (cur) => [restoreInto(cur, data), undefined])
    },
    [mutate],
  )

  const listBackups = useCallback(() => dbListBackups(), [])

  const restoreBackup = useCallback(
    async (id: string) => {
      const list = await dbListBackups()
      const b = list.find((x) => x.id === id)
      if (!b) return false
      await mutate('before-restore', (cur) => [restoreInto(cur, b.data), undefined])
      return true
    },
    [mutate],
  )

  /** Reset all data (admin): snapshot first, tombstone everything, counters back to 1,
   *  and stamp resetAt so every other phone also drops its old entries/counters on sync. */
  const clearData = useCallback(async () => {
    await mutate('before-reset', (cur) => {
      const now = new Date().toISOString()
      const deleted = normalizeTombstones(cur.deleted)
      for (const m of cur.members) deleted.members[m.id] = now
      for (const p of cur.payments) deleted.payments[p.id] = now
      for (const e of cur.expenses || []) deleted.expenses[e.id] = now
      for (const e of cur.eduPrograms || []) deleted.eduPrograms[e.id] = now
      for (const e of cur.eduStudents || []) deleted.eduStudents[e.id] = now
      return [
        {
          ...cur,
          deleted,
          members: [],
          payments: [],
          expenses: [],
          eduPrograms: [],
          eduStudents: [],
          settings: {
            ...cur.settings,
            nextMemberCounter: 1,
            nextReceiptCounter: 1,
            nextExpenseCounter: 1,
            settingsUpdatedAt: now,
            resetAt: now,
          },
        },
        undefined,
      ]
    })
  }, [mutate])

  const getMember = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members],
  )

  const value = useMemo(() => {
    if (!settings) return null
    return {
      ready,
      settings,
      members,
      payments,
      expenses,
      setPrivateKey,
      eduPrograms,
      eduStudents,
      saveEduProgram,
      deleteEduProgram,
      saveEduStudent,
      deleteEduStudent,
      pendingBillCount,
      syncStatus,
      syncError,
      lastSyncedAt,
      unsyncedCount,
      updateSettings,
      addMember,
      updateMember,
      deleteMember,
      addPayment,
      deletePayment,
      addExpense,
      updateExpense,
      deleteExpense,
      exportData,
      importData,
      clearData,
      refresh,
      pullCloud,
      pushCloud,
      listBackups,
      restoreBackup,
      getMember,
    }
  }, [
    ready,
    settings,
    members,
    payments,
    expenses,
    setPrivateKey,
    eduPrograms,
    eduStudents,
    saveEduProgram,
    deleteEduProgram,
    saveEduStudent,
    deleteEduStudent,
    pendingBillCount,
    syncStatus,
    syncError,
    lastSyncedAt,
    unsyncedCount,
    updateSettings,
    addMember,
    updateMember,
    deleteMember,
    addPayment,
    deletePayment,
    addExpense,
    updateExpense,
    deleteExpense,
    exportData,
    importData,
    clearData,
    refresh,
    pullCloud,
    pushCloud,
    listBackups,
    restoreBackup,
    getMember,
  ])

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream text-navy">
        Loading…
      </div>
    )
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}

export function suggestPaymentDefaults(member: Member, settings: Settings) {
  const from = member.nextDueDate
  const to =
    member.feePlan === 'yearly'
      ? advanceDueDate(from, 'yearly')
      : advanceDueDate(from, 'monthly')
  return {
    amount: defaultAmount(member.feePlan, settings),
    periodFrom: from,
    periodTo: to,
    method: 'cash' as PaymentMethod,
    paidAt: todayISO(),
    notes: '',
  }
}
