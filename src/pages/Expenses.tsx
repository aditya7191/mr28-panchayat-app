import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ExpenseForm } from '../components/ExpenseForm'
import { ExpenseList } from '../components/ExpenseList'
import { HisabSummary } from '../components/HisabSummary'
import { Modal } from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import type { Expense } from '../types'
import { categoryText } from '../utils/accounts'

export function Expenses() {
  const { t, lang } = useI18n()
  const { expenses, deleteExpense, pendingBillCount } = useStore()
  const { isAdmin } = useAuth()
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (params.get('add') === '1') {
      setAdding(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return expenses
    return expenses.filter((e) =>
      [e.voucherNo, e.description, e.paidTo, e.paidBy, categoryText(e, lang)]
        .join(' ')
        .toLowerCase()
        .includes(qq),
    )
  }, [expenses, q, lang])

  async function onDelete(e: Expense) {
    if (!isAdmin) return
    if (!confirm(`${t('confirmDeleteExpense')}\n\n${e.voucherNo} · ₹${e.amountPaise / 100}\n${e.description}`)) return
    await deleteExpense(e.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">{t('expensesTitle')}</h2>
        {isAdmin && (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full bg-saffron px-3 py-1.5 text-xs font-bold text-white">
            <Plus size={14} /> {t('addExpense')}
          </button>
        )}
      </div>

      <HisabSummary />

      {pendingBillCount > 0 && (
        <p className="rounded-lg bg-saffron/10 px-3 py-2 text-[11px] text-navy/70">
          ⏳ {pendingBillCount} {t('billsPending')}
        </p>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍"
        className="w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron"
      />

      <ExpenseList
        expenses={filtered}
        onEdit={isAdmin ? (e) => setEditing(e) : undefined}
        onDelete={isAdmin ? onDelete : undefined}
      />

      <Modal open={adding} title={t('addExpense')} onClose={() => setAdding(false)}>
        <ExpenseForm onDone={() => setAdding(false)} />
      </Modal>
      <Modal open={!!editing} title={t('editExpense')} onClose={() => setEditing(null)}>
        {editing && <ExpenseForm key={editing.id} expense={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
