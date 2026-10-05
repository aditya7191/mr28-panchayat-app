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
  clearAllData,
  exportAllData,
  importAllData,
  loadMembers,
  loadPayments,
  loadSettings,
  saveMembers,
  savePayments,
  saveSettings,
} from '../db'
import { DEFAULT_SETTINGS, type AppData, type FeePlan, type Member, type Payment, type PaymentMethod, type Settings } from '../types'
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
  isCloudSyncEnabled,
  mergeRemoteWithLocalPassword,
  pullCloudData,
  pushCloudData,
  shouldPreferRemote,
  type SyncStatus,
} from '../sync'

interface StoreCtx {
  ready: boolean
  settings: Settings
  members: Member[]
  payments: Payment[]
  syncStatus: SyncStatus
  syncError: string
  lastSyncedAt: string | null
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
  exportData: () => Promise<AppData>
  importData: (data: AppData) => Promise<void>
  clearData: () => Promise<void>
  refresh: () => Promise<void>
  pullCloud: () => Promise<boolean>
  pushCloud: () => Promise<boolean>
  getMember: (id: string) => Member | undefined
}

const Ctx = createContext<StoreCtx | null>(null)

function snapshot(
  settings: Settings,
  members: Member[],
  payments: Payment[],
): AppData {
  return {
    version: 1,
    settings,
    members,
    payments,
    exportedAt: new Date().toISOString(),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef({ settings: null as Settings | null, members, payments })
  stateRef.current = { settings, members, payments }

  const persistAll = useCallback(async (data: AppData) => {
    await Promise.all([
      saveSettings(data.settings),
      saveMembers(data.members),
      savePayments(data.payments),
    ])
  }, [])

  const schedulePush = useCallback(() => {
    if (!canPush()) {
      setSyncStatus((s) => (s === 'error' ? s : 'readonly'))
      return
    }
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      void (async () => {
        const { settings: s, members: m, payments: p } = stateRef.current
        if (!s) return
        setSyncStatus('pushing')
        setSyncError('')
        const result = await pushCloudData(snapshot(s, m, p))
        if (result.ok) {
          setSyncStatus('ok')
          setLastSyncedAt(new Date().toISOString())
        } else {
          setSyncStatus('error')
          setSyncError(result.error || 'Push failed')
        }
      })()
    }, 900)
  }, [])

  const pullCloud = useCallback(async () => {
    if (!isCloudSyncEnabled()) return false
    setSyncStatus('pulling')
    setSyncError('')
    const localPwd =
      stateRef.current.settings?.adminPassword ||
      (await loadSettings()).adminPassword
    const result = await pullCloudData()
    if (!result.ok || !result.data) {
      setSyncStatus(canPush() ? 'ok' : 'readonly')
      if (result.error && result.error !== 'Cloud sync disabled') {
        setSyncError(result.error)
      }
      return false
    }
    const merged = mergeRemoteWithLocalPassword(result.data, localPwd)
    const local: AppData = {
      version: 1,
      settings: stateRef.current.settings || (await loadSettings()),
      members: stateRef.current.members,
      payments: stateRef.current.payments,
      exportedAt: lastSyncedAt || undefined,
    }
    // Always take remote for first load / when remote is newer or has data we lack
    const localEmpty =
      local.members.length === 0 && local.payments.length === 0
    if (localEmpty || shouldPreferRemote(local, merged) || !ready) {
      await persistAll(merged)
      setSettings(merged.settings)
      setMembers(merged.members)
      setPayments(merged.payments)
    }
    setSyncStatus(canPush() ? 'ok' : 'readonly')
    setLastSyncedAt(new Date().toISOString())
    return true
  }, [lastSyncedAt, persistAll, ready])

  const pushCloud = useCallback(async () => {
    const { settings: s, members: m, payments: p } = stateRef.current
    if (!s) return false
    if (!canPush()) {
      setSyncStatus('readonly')
      setSyncError('No GitHub token — add one in Settings → Cloud Sync')
      return false
    }
    setSyncStatus('pushing')
    setSyncError('')
    const result = await pushCloudData(snapshot(s, m, p))
    if (result.ok) {
      setSyncStatus('ok')
      setLastSyncedAt(new Date().toISOString())
      return true
    }
    setSyncStatus('error')
    setSyncError(result.error || 'Push failed')
    return false
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [s, m, p] = await Promise.all([
        loadSettings(),
        loadMembers(),
        loadPayments(),
      ])
      setSettings(s)
      setMembers(m)
      setPayments(p)
      // Always open the UI with local/IndexedDB data first — never block on network.
      setReady(true)

      // Pull shared cloud data in the background so iPhone/Android see the same roster
      if (isCloudSyncEnabled()) {
        setSyncStatus('pulling')
        try {
          const result = await pullCloudData()
          if (result.ok && result.data) {
            const merged = mergeRemoteWithLocalPassword(
              result.data,
              s.adminPassword,
            )
            const local: AppData = {
              version: 1,
              settings: s,
              members: m,
              payments: p,
              exportedAt: undefined,
            }
            const localEmpty = m.length === 0 && p.length === 0
            if (localEmpty || shouldPreferRemote(local, merged)) {
              await persistAll(merged)
              setSettings(merged.settings)
              setMembers(merged.members)
              setPayments(merged.payments)
            } else if (canPush() && (m.length > 0 || p.length > 0)) {
              // Local has data cloud lacks — push so other devices catch up
              void pushCloudData(snapshot(s, m, p)).then((r) => {
                if (r.ok) setLastSyncedAt(new Date().toISOString())
              })
            }
            setSyncStatus(canPush() ? 'ok' : 'readonly')
            setLastSyncedAt(new Date().toISOString())
          } else {
            setSyncStatus(canPush() ? 'ok' : 'readonly')
            if (result.error) setSyncError(result.error)
          }
        } catch (e) {
          setSyncStatus(canPush() ? 'ok' : 'readonly')
          setSyncError(e instanceof Error ? e.message : 'Cloud pull failed')
        }
      }
    } catch (e) {
      console.error('Store boot failed', e)
      setSettings((prev) => prev ?? { ...DEFAULT_SETTINGS })
      setReady(true)
    }
  }, [persistAll])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Re-pull when app becomes visible (iOS Safari / Android Chrome tab switch)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && ready) {
        void pullCloud()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [pullCloud, ready])

  useEffect(() => {
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [])

  const updateSettings = useCallback(
    async (s: Settings) => {
      await saveSettings(s)
      setSettings(s)
      schedulePush()
    },
    [schedulePush],
  )

  const addMember = useCallback(
    async (input: {
      name: string
      phone: string
      address: string
      feePlan: FeePlan
      status: Member['status']
      nextDueDate: string
      notes: string
    }) => {
      const s = settings!
      const membershipNo = makeMembershipNo(s.nextMemberCounter)
      const now = new Date().toISOString()
      const member: Member = {
        id: uid(),
        membershipNo,
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
      const nextMembers = [...members, member]
      const nextSettings = {
        ...s,
        nextMemberCounter: s.nextMemberCounter + 1,
      }
      await Promise.all([saveMembers(nextMembers), saveSettings(nextSettings)])
      setMembers(nextMembers)
      setSettings(nextSettings)
      schedulePush()
      return member
    },
    [members, settings, schedulePush],
  )

  const updateMember = useCallback(
    async (id: string, patch: Partial<Member>) => {
      const next = members.map((m) =>
        m.id === id
          ? { ...m, ...patch, updatedAt: new Date().toISOString() }
          : m,
      )
      await saveMembers(next)
      setMembers(next)
      schedulePush()
    },
    [members, schedulePush],
  )

  const deleteMember = useCallback(
    async (id: string) => {
      const next = members.filter((m) => m.id !== id)
      const nextPay = payments.filter((p) => p.memberId !== id)
      await Promise.all([saveMembers(next), savePayments(nextPay)])
      setMembers(next)
      setPayments(nextPay)
      schedulePush()
    },
    [members, payments, schedulePush],
  )

  const addPayment = useCallback(
    async (input: {
      memberId: string
      amount: number
      method: PaymentMethod
      periodFrom: string
      periodTo: string
      paidAt: string
      notes: string
    }) => {
      const s = settings!
      const receiptNo = makeReceiptNo(s.nextReceiptCounter)
      const payment: Payment = {
        id: uid(),
        receiptNo,
        memberId: input.memberId,
        amount: input.amount,
        method: input.method,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        paidAt: input.paidAt || new Date().toISOString(),
        notes: input.notes.trim(),
      }
      const member = members.find((m) => m.id === input.memberId)
      let nextMembers = members
      if (member) {
        const nextDue = advanceDueDate(input.periodTo, member.feePlan)
        nextMembers = members.map((m) =>
          m.id === input.memberId
            ? {
                ...m,
                nextDueDate: nextDue,
                updatedAt: new Date().toISOString(),
              }
            : m,
        )
      }
      const nextPayments = [payment, ...payments]
      const nextSettings = {
        ...s,
        nextReceiptCounter: s.nextReceiptCounter + 1,
      }
      await Promise.all([
        savePayments(nextPayments),
        saveMembers(nextMembers),
        saveSettings(nextSettings),
      ])
      setPayments(nextPayments)
      setMembers(nextMembers)
      setSettings(nextSettings)
      schedulePush()
      return payment
    },
    [members, payments, settings, schedulePush],
  )

  const deletePayment = useCallback(
    async (id: string) => {
      const next = payments.filter((p) => p.id !== id)
      await savePayments(next)
      setPayments(next)
      schedulePush()
    },
    [payments, schedulePush],
  )

  const exportData = useCallback(() => exportAllData(), [])

  const importData = useCallback(
    async (data: AppData) => {
      await importAllData(data)
      await refresh()
      schedulePush()
    },
    [refresh, schedulePush],
  )

  const clearData = useCallback(async () => {
    await clearAllData()
    await refresh()
    schedulePush()
  }, [refresh, schedulePush])

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
      syncStatus,
      syncError,
      lastSyncedAt,
      updateSettings,
      addMember,
      updateMember,
      deleteMember,
      addPayment,
      deletePayment,
      exportData,
      importData,
      clearData,
      refresh,
      pullCloud,
      pushCloud,
      getMember,
    }
  }, [
    ready,
    settings,
    members,
    payments,
    syncStatus,
    syncError,
    lastSyncedAt,
    updateSettings,
    addMember,
    updateMember,
    deleteMember,
    addPayment,
    deletePayment,
    exportData,
    importData,
    clearData,
    refresh,
    pullCloud,
    pushCloud,
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
