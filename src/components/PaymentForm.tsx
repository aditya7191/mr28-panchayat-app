import { useMemo, useState } from 'react'
import type { PaymentMethod } from '../types'
import { useI18n } from '../hooks/useI18n'
import { useStore, suggestPaymentDefaults } from '../hooks/useStore'

export function PaymentForm({
  presetMemberId,
  onDone,
}: {
  presetMemberId?: string
  onDone: (paymentId: string) => void
}) {
  const { t } = useI18n()
  const { members, settings, addPayment } = useStore()
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  )
  const [memberId, setMemberId] = useState(presetMemberId ?? '')
  const member = members.find((m) => m.id === memberId)
  const defaults = member ? suggestPaymentDefaults(member, settings) : null

  const [amount, setAmount] = useState(defaults?.amount?.toString() ?? '')
  const [method, setMethod] = useState<PaymentMethod>(defaults?.method ?? 'cash')
  const [periodFrom, setPeriodFrom] = useState(defaults?.periodFrom ?? '')
  const [periodTo, setPeriodTo] = useState(defaults?.periodTo ?? '')
  const [paidAt, setPaidAt] = useState(defaults?.paidAt ?? '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function onMemberChange(id: string) {
    setMemberId(id)
    const m = members.find((x) => x.id === id)
    if (m) {
      const d = suggestPaymentDefaults(m, settings)
      setAmount(String(d.amount))
      setMethod(d.method)
      setPeriodFrom(d.periodFrom)
      setPeriodTo(d.periodTo)
      setPaidAt(d.paidAt)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !amount || !periodFrom || !periodTo) {
      setError(t('required'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const payment = await addPayment({
        memberId,
        amount: Number(amount),
        method,
        periodFrom,
        periodTo,
        paidAt: paidAt || new Date().toISOString(),
        notes,
      })
      onDone(payment.id)
    } catch {
      setError(t('error'))
    } finally {
      setSaving(false)
    }
  }

  const field =
    'w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron focus:ring-1 focus:ring-saffron'
  const label = 'mb-1 block text-xs font-semibold text-navy/70'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/70">
        {t('receiptNo')}: MR28-R-
        {String(settings.nextReceiptCounter).padStart(4, '0')} (auto)
      </p>

      <div>
        <label className={label}>{t('selectMember')} *</label>
        <select
          className={field}
          value={memberId}
          onChange={(e) => onMemberChange(e.target.value)}
          required
          disabled={!!presetMemberId}
        >
          <option value="">—</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.membershipNo} — {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('amount')} *</label>
          <input
            className={field}
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={label}>{t('method')}</label>
          <select
            className={field}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">{t('cash')}</option>
            <option value="upi">{t('upi')}</option>
            <option value="bank">{t('bank')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('periodFrom')} *</label>
          <input
            className={field}
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={label}>{t('periodTo')} *</label>
          <input
            className={field}
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={label}>{t('paidAt')}</label>
        <input
          className={field}
          type="date"
          value={paidAt.slice(0, 10)}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </div>

      <div>
        <label className={label}>{t('notes')}</label>
        <textarea
          className={field}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onDone('')}
          className="flex-1 rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-saffron py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {t('save')}
        </button>
      </div>
    </form>
  )
}
