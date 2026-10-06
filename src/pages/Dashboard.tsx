import { Link, useNavigate } from 'react-router-dom'
import { IndianRupee, Plus, UserPlus, Users, AlertCircle } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { LocalOnlyWarning } from '../components/LocalOnlyWarning'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import {
  collectedThisMonth,
  formatDate,
  formatINR,
  totalCollected,
  isOverdue,
} from '../utils/format'

export function Dashboard() {
  const { t, lang } = useI18n()
  const { members, payments, settings } = useStore()
  const navigate = useNavigate()

  const active = members.filter((m) => m.status === 'active')
  const pending = active.filter(isOverdue)
  const collected = collectedThisMonth(payments)
  const recent = payments.slice(0, 5)
  const totalJama = totalCollected(payments)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-navy">{t('dashboardTitle')}</h2>
        <p className="text-xs text-navy/50">
          {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
        </p>
      </div>

      <LocalOnlyWarning />

      <div className="rounded-xl border-2 border-saffron bg-gradient-to-br from-saffron/15 to-saffron/5 p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
          <IndianRupee size={16} className="text-saffron-dark" />
          કુલ જમા / Total collected
        </div>
        <div className="mt-1 text-3xl font-extrabold text-saffron-dark">
          ₹{formatINR(totalJama)}
        </div>
        <p className="mt-1 text-[11px] text-navy/60">
          પંચાયત પાસે જમા · Amount with Panchayat · {payments.length} રસીદ / receipts
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label={t('totalMembers')}
          value={members.length}
          accent="navy"
          icon={<Users size={14} />}
        />
        <StatCard
          label={t('activeMembers')}
          value={active.length}
          accent="success"
          icon={<Users size={14} />}
        />
        <StatCard
          label={t('duesPending')}
          value={pending.length}
          accent="danger"
          icon={<AlertCircle size={14} />}
        />
        <StatCard
          label={t('collectedThisMonth')}
          value={`₹${collected}`}
          accent="saffron"
          icon={<IndianRupee size={14} />}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => navigate('/members?add=1')}
          className="flex items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white"
        >
          <UserPlus size={18} />
          {t('quickAddMember')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/payments?add=1')}
          className="flex items-center justify-center gap-2 rounded-xl bg-saffron py-3 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          {t('quickRecordPayment')}
        </button>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy">{t('recentPayments')}</h3>
          <Link to="/payments" className="text-xs font-semibold text-saffron">
            {t('navPayments')} →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy/20 bg-white p-4 text-center text-sm text-navy/50">
            {t('noPaymentsYet')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((p) => {
              const m = members.find((x) => x.id === p.memberId)
              return (
                <li key={p.id}>
                  <Link
                    to={`/receipt/${p.id}`}
                    className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3 py-2.5 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">
                        {m?.name ?? '—'}
                      </p>
                      <p className="text-[11px] text-navy/50">
                        {p.receiptNo} · {formatDate(p.paidAt)}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-saffron-dark">
                      ₹{p.amount}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
