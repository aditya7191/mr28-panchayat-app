import { useState } from 'react'
import type { FeePlan, Member, MemberStatus } from '../types'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { todayISO } from '../utils/format'

export function MemberForm({
  initial,
  onDone,
}: {
  initial?: Member
  onDone: () => void
}) {
  const { t } = useI18n()
  const { addMember, updateMember, settings } = useStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [feePlan, setFeePlan] = useState<FeePlan>(initial?.feePlan ?? 'monthly')
  const [status, setStatus] = useState<MemberStatus>(initial?.status ?? 'active')
  const [nextDueDate, setNextDueDate] = useState(
    initial?.nextDueDate ?? todayISO(),
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('required'))
      return
    }
    setSaving(true)
    setError('')
    try {
      if (initial) {
        await updateMember(initial.id, {
          name,
          phone,
          address,
          feePlan,
          status,
          nextDueDate,
          notes,
        })
      } else {
        await addMember({
          name,
          phone,
          address,
          feePlan,
          status,
          nextDueDate,
          notes,
        })
      }
      onDone()
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
      {!initial && (
        <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/70">
          {t('membershipNo')}: MR28-
          {String(settings.nextMemberCounter).padStart(4, '0')} (auto)
        </p>
      )}
      {initial && (
        <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs font-semibold text-navy">
          {t('membershipNo')}: {initial.membershipNo}
        </p>
      )}

      <div>
        <label className={label}>{t('memberName')} *</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className={label}>{t('phone')}</label>
        <input className={field} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className={label}>{t('address')}</label>
        <textarea className={field} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('feePlan')}</label>
          <select className={field} value={feePlan} onChange={(e) => setFeePlan(e.target.value as FeePlan)}>
            <option value="monthly">{t('monthly')}</option>
            <option value="yearly">{t('yearly')}</option>
          </select>
        </div>
        <div>
          <label className={label}>{t('status')}</label>
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label}>{t('nextDue')}</label>
        <input className={field} type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
      </div>
      <div>
        <label className={label}>{t('notes')}</label>
        <textarea className={field} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onDone}
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
