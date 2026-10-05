import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Receipt } from 'lucide-react'
import { Modal } from '../components/Modal'
import { PaymentForm } from '../components/PaymentForm'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { formatDate } from '../utils/format'

export function Payments() {
  const { t } = useI18n()
  const { payments, members, settings } = useStore()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (params.get('add') === '1') {
      setAdding(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  )

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return payments.filter((p) => {
      if (!qq) return true
      const m = memberMap.get(p.memberId)
      return (
        p.receiptNo.toLowerCase().includes(qq) ||
        (m?.name.toLowerCase().includes(qq) ?? false) ||
        (m?.membershipNo.toLowerCase().includes(qq) ?? false)
      )
    })
  }, [payments, q, memberMap])

  const methodLabel = (m: string) => {
    if (m === 'cash') return t('cash')
    if (m === 'upi') return t('upi')
    return t('bank')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">{t('paymentsTitle')}</h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full bg-saffron px-3 py-1.5 text-xs font-bold text-white"
        >
          <Plus size={14} />
          {t('newPayment')}
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('searchMembers')}
        className="w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron"
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-center text-sm text-navy/50">
          {t('noPayments')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((p) => {
            const m = memberMap.get(p.memberId)
            return (
              <li key={p.id}>
                <Link
                  to={`/receipt/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border border-navy/10 bg-white p-3 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/5 text-navy">
                    <Receipt size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy">
                      {m?.name ?? '—'}
                    </p>
                    <p className="text-[11px] text-navy/50">
                      {p.receiptNo} · {formatDate(p.paidAt)} · {methodLabel(p.method)}
                    </p>
                    <p className="text-[11px] text-navy/40">
                      {formatDate(p.periodFrom)} – {formatDate(p.periodTo)}
                    </p>
                  </div>
                  <span className="shrink-0 text-base font-bold text-saffron-dark">
                    ₹{p.amount}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={adding} title={t('newPayment')} onClose={() => setAdding(false)}>
        <PaymentForm
          onDone={(id) => {
            setAdding(false)
            if (id) {
              const wa = settings.autoWhatsAppAfterPayment ? '?wa=1' : ''
              navigate(`/receipt/${id}${wa}`)
            }
          }}
        />
      </Modal>
    </div>
  )
}
