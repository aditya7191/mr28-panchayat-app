import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Users } from 'lucide-react'
import { Watermark } from '../components/Watermark'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { formatDate } from '../utils/format'
import type { Member, Payment } from '../types'

function latestPaymentFor(
  memberId: string,
  payments: Payment[],
): Payment | undefined {
  const list = payments.filter((p) => p.memberId === memberId)
  if (list.length === 0) return undefined
  return list.reduce((best, p) => {
    const bestKey = best.periodTo || best.paidAt
    const pKey = p.periodTo || p.paidAt
    return pKey > bestKey ? p : best
  })
}

export function PublicHome() {
  const { t, lang, toggle } = useI18n()
  const { settings, members, payments } = useStore()
  const [q, setQ] = useState('')

  const publicMembers = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return members
      .slice()
      .sort((a, b) => a.membershipNo.localeCompare(b.membershipNo))
      .filter((m) => {
        if (!qq) return true
        return (
          m.name.toLowerCase().includes(qq) ||
          m.membershipNo.toLowerCase().includes(qq)
        )
      })
  }, [members, q])

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark />

      <header className="relative z-30 flex items-center gap-2 border-b border-cream-dark bg-navy px-3 py-3 text-white">
        <Link to="/gate" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">{t('publicView')}</h1>
          <p className="truncate text-[10px] text-white/60">{t('publicMode')}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold"
        >
          {lang === 'gu' ? 'EN' : 'ગુ'}
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-2xl border border-navy/10 bg-white p-4 text-center shadow-sm">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            className="mx-auto mb-3 h-20 w-auto object-contain opacity-90"
          />
          <h2 className="text-base font-bold text-navy">
            {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
          </h2>
          <p className="mt-1 text-xs leading-snug text-navy/60">
            {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
          </p>
          <p className="mt-3 text-sm font-bold text-saffron-dark">
            જય રોહિદાસ બાપુ
          </p>
          <p className="text-[11px] text-navy/45">Jay Rohidas Baapu</p>
        </div>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
              <Users size={24} />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-navy/50">
                {t('totalMembers')} / Total Members
              </p>
              <p className="text-2xl font-bold text-navy">{members.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-navy">
            {t('publicMembersList')}
          </h3>

          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('publicSearchMembers')}
              className="w-full rounded-xl border border-navy/15 bg-cream py-2.5 pl-9 pr-3 text-sm outline-none focus:border-saffron"
            />
          </div>

          {publicMembers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-navy/20 bg-cream p-4 text-center text-sm text-navy/50">
              {t('publicNoMembers')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {publicMembers.map((m) => (
                <PublicMemberCard
                  key={m.id}
                  member={m}
                  payment={latestPaymentFor(m.id, payments)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-navy">{t('publicFees')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-cream p-3 text-center">
              <p className="text-[10px] font-semibold text-navy/50">
                {t('monthly')}
              </p>
              <p className="mt-1 text-xl font-bold text-navy">
                ₹{settings.monthlyFee}
              </p>
            </div>
            <div className="rounded-xl bg-cream p-3 text-center">
              <p className="text-[10px] font-semibold text-navy/50">
                {t('yearly')}
              </p>
              <p className="mt-1 text-xl font-bold text-navy">
                ₹{settings.yearlyFee}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-navy">{t('publicContact')}</h3>
          {settings.upiId ? (
            <p className="text-sm text-navy">
              <span className="text-xs font-semibold text-navy/50">UPI: </span>
              {settings.upiId}
            </p>
          ) : (
            <p className="text-xs text-navy/50">{t('publicNoUpi')}</p>
          )}
          {settings.bankDetails && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy">
              {settings.bankDetails}
            </p>
          )}
        </section>

        <Link
          to="/gate"
          className="mt-auto rounded-xl border border-navy/20 bg-white py-3 text-center text-sm font-semibold text-navy"
        >
          {t('backToGate')}
        </Link>
        <Link
          to="/gate"
          state={{ openAdmin: true }}
          className="rounded-xl bg-saffron py-3 text-center text-sm font-bold text-white"
        >
          {t('adminLogin')}
        </Link>
      </main>
    </div>
  )
}

function PublicMemberCard({
  member,
  payment,
}: {
  member: Member
  payment: Payment | undefined
}) {
  const paidUpLabel = payment
    ? `${formatDate(payment.periodFrom)} – ${formatDate(payment.periodTo)}`
    : '—'

  return (
    <li className="rounded-xl border border-navy/10 bg-cream p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-saffron/15 px-1.5 py-0.5 text-[11px] font-bold text-saffron-dark">
          {member.membershipNo}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-bold text-navy">{member.name}</p>

      <div className="mt-2 space-y-1.5 border-t border-navy/10 pt-2">
        <div>
          <p className="text-[10px] font-semibold leading-tight text-navy/50">
            ફાળો ભરેલો સુધી / Fala paid up to (last period)
          </p>
          <p className="text-[12px] font-semibold text-navy">{paidUpLabel}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold leading-tight text-navy/50">
            આગામી ફાળો તારીખ / Next due
          </p>
          <p className="text-[12px] font-semibold text-navy">
            {formatDate(member.nextDueDate)}
          </p>
        </div>
      </div>
    </li>
  )
}
