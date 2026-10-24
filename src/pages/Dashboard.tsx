import { BaapuPortrait } from '../components/BaapuPortrait'
import { Link, useNavigate } from 'react-router-dom'
import { IndianRupee, Plus, UserPlus, Users, AlertCircle } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { StatTiles } from '../components/StatTiles'
import { HisabSummary } from '../components/HisabSummary'
import { LocalOnlyWarning } from '../components/LocalOnlyWarning'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import {
  collectedThisMonth,
  formatDate,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-3xl px-4 py-3 text-white shadow-md royal-pattern">
        <BaapuPortrait size="sm" />
        <div className="text-left">
          <p className="font-display text-lg font-extrabold leading-tight hero-title">મીરા રોડ સ્થાનિક પંચાયત</p>
          <p className="text-xs font-semibold text-white/85">Mira Road Sthanik Panchayat-28</p>
        </div>
      </div>
      <div>
        <h2 className="border-l-4 border-saffron pl-2 font-display text-xl font-bold text-navy">{t('dashboardTitle')}</h2>
        <p className="text-xs text-navy/50">
          {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
        </p>
      </div>

      <LocalOnlyWarning />

      <StatTiles />

      <HisabSummary />

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
        <button
          type="button"
          onClick={() => navigate('/expenses?add=1')}
          className="col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-danger/40 bg-white py-3 text-sm font-semibold text-danger"
        >
          <Plus size={18} />
          {t('addExpense')}
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
