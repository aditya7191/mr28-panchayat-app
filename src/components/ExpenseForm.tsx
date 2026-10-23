import { useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import type { Expense, ExpenseCategory, PaymentMethod } from '../types'
import { ModalBody, ModalFooter } from './Modal'
import { BillThumb } from './BillImage'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  makeVoucherNo,
  paiseToInput,
  parseAmountInput,
} from '../utils/accounts'
import { compressImage } from '../utils/bills'
import { todayISO, uid } from '../utils/format'

export function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const { t, lang } = useI18n()
  const { settings, addExpense, updateExpense } = useStore()
  const [date, setDate] = useState(expense?.date ?? todayISO())
  const [amount, setAmount] = useState(expense ? paiseToInput(expense.amountPaise) : '')
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'program')
  const [categoryOther, setCategoryOther] = useState(expense?.categoryOther ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [paidTo, setPaidTo] = useState(expense?.paidTo ?? '')
  const [paidBy, setPaidBy] = useState(
    expense?.paidBy ?? (settings.receivedBy || '').replace(/\s*\(.*\)\s*$/, ''),
  )
  const [method, setMethod] = useState<PaymentMethod>(expense?.method ?? 'cash')
  const [billIds, setBillIds] = useState<string[]>(expense?.billIds ?? [])
  const [newBills, setNewBills] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return
    setBusy(true)
    setError('')
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue
        const data = await compressImage(f)
        const id = uid()
        setNewBills((m) => ({ ...m, [id]: data }))
        setBillIds((l) => [...l, id])
      }
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
      if (camRef.current) camRef.current.value = ''
      if (galRef.current) galRef.current.value = ''
    }
  }

  function removeBill(id: string) {
    setBillIds((l) => l.filter((x) => x !== id))
    setNewBills((m) => {
      const n = { ...m }
      delete n[id]
      return n
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const paise = parseAmountInput(amount)
    if (!Number.isFinite(paise) || paise <= 0) {
      setError(t('invalidAmount'))
      return
    }
    if (!date || !description.trim()) {
      setError(t('required'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const input = {
        date,
        amountPaise: paise,
        category,
        categoryOther,
        description,
        paidTo,
        paidBy,
        method,
        billIds,
        newBills,
      }
      if (expense) await updateExpense(expense.id, input)
      else await addExpense(input)
      onDone()
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron focus:ring-1 focus:ring-saffron'
  const label = 'mb-1 block text-xs font-semibold text-navy/70'

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/70">
          Voucher: {expense ? expense.voucherNo : `${makeVoucherNo(settings.nextExpenseCounter || 1)} (auto)`}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('expenseDate')} *</label>
            <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className={label}>{t('expenseAmount')} *</label>
            <input
              className={field}
              inputMode="decimal"
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('expenseCategory')}</label>
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c][lang]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{t('expenseMethod')}</label>
            <select className={field} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="cash">{t('cash')}</option>
              <option value="upi">{t('upi')}</option>
              <option value="bank">{t('bank')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className={label}>{t('expenseCategoryOther')}</label>
          <input className={field} value={categoryOther} onChange={(e) => setCategoryOther(e.target.value)} />
        </div>
        <div>
          <label className={label}>{t('expenseDescription')} *</label>
          <textarea className={field} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('expensePaidTo')}</label>
            <input className={field} value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('expensePaidBy')}</label>
            <input className={field} value={paidBy} onChange={(e) => setPaidBy(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={label}>{t('expenseBills')}</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => camRef.current?.click()} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-navy/20 bg-white py-2 text-xs font-semibold text-navy">
              <Camera size={16} /> {t('billCamera')}
            </button>
            <button type="button" onClick={() => galRef.current?.click()} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-navy/20 bg-white py-2 text-xs font-semibold text-navy">
              <ImagePlus size={16} /> {t('billGallery')}
            </button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
          <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
          {billIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {billIds.map((id) => (
                <div key={id} className="relative">
                  <BillThumb id={id} preview={newBills[id]} />
                  <button type="button" onClick={() => removeBill(id)} className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-0.5 text-white" aria-label="remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onDone} className="flex-1 rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy">
            {t('cancel')}
          </button>
          <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-saffron py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? '…' : t('save')}
          </button>
        </div>
      </ModalFooter>
    </form>
  )
}
