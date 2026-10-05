import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { MemberForm } from '../components/MemberForm'
import { PaymentForm } from '../components/PaymentForm'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { formatDate, isOverdue } from '../utils/format'
import type { Member } from '../types'

export function Members() {
  const { t } = useI18n()
  const { members, deleteMember, settings } = useStore()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editing, setEditing] = useState<Member | null>(null)
  const [adding, setAdding] = useState(false)
  const [payFor, setPayFor] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('add') === '1') {
      setAdding(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return members
      .filter((m) => (filter === 'all' ? true : m.status === filter))
      .filter((m) => {
        if (!qq) return true
        return (
          m.name.toLowerCase().includes(qq) ||
          m.phone.includes(qq) ||
          m.membershipNo.toLowerCase().includes(qq) ||
          m.address.toLowerCase().includes(qq)
        )
      })
      .sort((a, b) => a.membershipNo.localeCompare(b.membershipNo))
  }, [members, q, filter])

  async function handleDelete(m: Member) {
    if (!confirm(t('confirmDelete'))) return
    await deleteMember(m.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">{t('membersTitle')}</h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full bg-saffron px-3 py-1.5 text-xs font-bold text-white"
        >
          <Plus size={14} />
          {t('addMember')}
        </button>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchMembers')}
          className="w-full rounded-xl border border-navy/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-saffron"
        />
      </div>

      <div className="flex gap-1.5">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === f
                ? 'bg-navy text-white'
                : 'bg-white text-navy/60 border border-navy/15'
            }`}
          >
            {t(f === 'all' ? 'all' : f)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-center text-sm text-navy/50">
          {t('noMembers')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-navy/10 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-saffron-dark">
                      {m.membershipNo}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        m.status === 'active'
                          ? 'bg-success/10 text-success'
                          : 'bg-navy/10 text-navy/50'
                      }`}
                    >
                      {t(m.status)}
                    </span>
                    {isOverdue(m) && (
                      <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        {t('overdue')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-bold text-navy">
                    {m.name}
                  </p>
                  <p className="text-[11px] text-navy/50">
                    {m.phone || '—'} · {t(m.feePlan === 'monthly' ? 'monthly' : 'yearly')}
                  </p>
                  <p className="text-[11px] text-navy/50">
                    {t('nextDue')}: {formatDate(m.nextDueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="rounded-lg p-2 text-navy/50 hover:bg-cream-dark"
                    aria-label={t('editMember')}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(m)}
                    className="rounded-lg p-2 text-danger/70 hover:bg-danger/10"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {m.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setPayFor(m.id)}
                  className="mt-2 w-full rounded-lg border border-saffron/40 bg-saffron/5 py-1.5 text-xs font-semibold text-saffron-dark"
                >
                  {t('recordPayment')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={adding} title={t('addMember')} onClose={() => setAdding(false)}>
        <MemberForm onDone={() => setAdding(false)} />
      </Modal>

      <Modal
        open={!!editing}
        title={t('editMember')}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <MemberForm initial={editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      <Modal
        open={!!payFor}
        title={t('newPayment')}
        onClose={() => setPayFor(null)}
      >
        {payFor && (
          <PaymentForm
            presetMemberId={payFor}
            onDone={(id) => {
              setPayFor(null)
              if (id) {
                const wa = settings.autoWhatsAppAfterPayment ? '?wa=1' : ''
                navigate(`/receipt/${id}${wa}`)
              }
            }}
          />
        )}
      </Modal>
    </div>
  )
}
