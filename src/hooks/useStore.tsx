import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import type { AppData, FeePlan, Member, Payment, PaymentMethod, Settings } from '../types'
import {
  advanceDueDate,
  defaultAmount,
  makeMembershipNo,
  makeReceiptNo,
  todayISO,
  uid,
} from '../utils/format'

interface StoreCtx {
  ready: boolean
  settings: Settings
  members: Member[]
  payments: Payment[]
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
  getMember: (id: string) => Member | undefined
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const refresh = useCallback(async () => {
    const [s, m, p] = await Promise.all([
      loadSettings(),
      loadMembers(),
      loadPayments(),
    ])
    setSettings(s)
    setMembers(m)
    setPayments(p)
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateSettings = useCallback(async (s: Settings) => {
    await saveSettings(s)
    setSettings(s)
  }, [])

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
      return member
    },
    [members, settings],
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
    },
    [members],
  )

  const deleteMember = useCallback(
    async (id: string) => {
      const next = members.filter((m) => m.id !== id)
      const nextPay = payments.filter((p) => p.memberId !== id)
      await Promise.all([saveMembers(next), savePayments(nextPay)])
      setMembers(next)
      setPayments(nextPay)
    },
    [members, payments],
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
      return payment
    },
    [members, payments, settings],
  )

  const deletePayment = useCallback(
    async (id: string) => {
      const next = payments.filter((p) => p.id !== id)
      await savePayments(next)
      setPayments(next)
    },
    [payments],
  )

  const exportData = useCallback(() => exportAllData(), [])

  const importData = useCallback(
    async (data: AppData) => {
      await importAllData(data)
      await refresh()
    },
    [refresh],
  )

  const clearData = useCallback(async () => {
    await clearAllData()
    await refresh()
  }, [refresh])

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
      getMember,
    }
  }, [
    ready,
    settings,
    members,
    payments,
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
  // periodTo is end of paid period — for monthly, pay for the month starting nextDue
  // Simpler: periodFrom = nextDue, periodTo = nextDue + plan - 1 day conceptually
  // We use advanceDueDate as the new next due (= end of paid period)
  return {
    amount: defaultAmount(member.feePlan, settings),
    periodFrom: from,
    periodTo: to,
    method: 'cash' as PaymentMethod,
    paidAt: todayISO(),
    notes: '',
  }
}
