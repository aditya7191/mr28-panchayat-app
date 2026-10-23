import { useMemo, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { accountSummary, formatPaise, monthlyBreakdown } from '../utils/accounts'
import { formatDate } from '../utils/format'

/** Auto Jama / Kharcha / Balance + month-wise table. Nothing here is typed by hand. */
export function HisabSummary({ showMonthly = true }: { showMonthly?: boolean }) {
  const { t } = useI18n()
  const { payments, expenses } = useStore()
  const sum = useMemo(() => accountSummary(payments, expenses), [payments, expenses])
  const months = useMemo(() => monthlyBreakdown(payments, expenses), [payments, expenses])
  const [all, setAll] = useState(false)
  const shown = all ? months : months.slice(0, 6)

  return (
    <section className="rounded-2xl border-2 border-saffron bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-bold text-navy">{t('hisabTitle')}</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-success/10 p-2">
          <p className="text-[10px] font-semibold text-navy/60">{t('totalJama')} (+)</p>
          <p className="text-base font-extrabold text-success">₹{formatPaise(sum.jama)}</p>
        </div>
        <div className="rounded-xl bg-danger/10 p-2">
          <p className="text-[10px] font-semibold text-navy/60">{t('totalKharcha')} (−)</p>
          <p className="text-base font-extrabold text-danger">₹{formatPaise(sum.kharcha)}</p>
        </div>
        <div className="rounded-xl bg-saffron/15 p-2">
          <p className="text-[10px] font-semibold text-navy/60">{t('balanceBachat')} (=)</p>
          <p className={`text-base font-extrabold ${sum.balance < 0 ? 'text-danger' : 'text-saffron-dark'}`}>
            ₹{formatPaise(sum.balance)}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-navy/50">
        {t('balanceBachat')} = {t('totalJama')} − {t('totalKharcha')}
      </p>

      {showMonthly && months.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold text-navy">{t('monthlyHisab')}</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-navy/50">
                <th className="py-1 text-left">{t('month')}</th>
                <th className="py-1 text-right">+ {t('totalJama')}</th>
                <th className="py-1 text-right">− {t('totalKharcha')}</th>
                <th className="py-1 text-right">=</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.month} className="border-t border-navy/10">
                  <td className="py-1 font-semibold text-navy">
                    {r.month.length === 7 ? formatDate(r.month + '-01', 'MMM yyyy') : r.month}
                  </td>
                  <td className="py-1 text-right text-success">₹{formatPaise(r.jama)}</td>
                  <td className="py-1 text-right text-danger">₹{formatPaise(r.kharcha)}</td>
                  <td className={`py-1 text-right font-bold ${r.balance < 0 ? 'text-danger' : 'text-navy'}`}>
                    ₹{formatPaise(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {months.length > 6 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-[11px] font-semibold text-saffron">
              {all ? '▲' : `▼ +${months.length - 6}`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
