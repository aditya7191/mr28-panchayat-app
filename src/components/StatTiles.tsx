import { useMemo } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Landmark, Users } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { accountSummary, formatPaise } from '../utils/accounts'

/** Four premium stat tiles: Members, Total Jama, Total Kharcha, Balance (read-only view). */
export function StatTiles() {
  const { t } = useI18n()
  const { members, payments, expenses } = useStore()
  const sum = useMemo(() => accountSummary(payments, expenses), [payments, expenses])
  const tiles = [
    { label: `${t('totalMembers')}`, sub: 'Members', value: String(members.length), Icon: Users, tone: 'text-navy', chip: 'bg-navy text-saffron-light' },
    { label: t('totalJama'), sub: 'Total Jama', value: `₹${formatPaise(sum.jama)}`, Icon: ArrowDownCircle, tone: 'text-success', chip: 'bg-success text-white' },
    { label: t('totalKharcha'), sub: 'Total Kharcha', value: `₹${formatPaise(sum.kharcha)}`, Icon: ArrowUpCircle, tone: 'text-danger', chip: 'bg-danger text-white' },
    { label: t('balanceBachat'), sub: 'Balance', value: `₹${formatPaise(sum.balance)}`, Icon: Landmark, tone: sum.balance < 0 ? 'text-danger' : 'text-saffron-dark', chip: 'bg-saffron text-white' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ label, sub, value, Icon, tone, chip }) => (
        <div key={sub} className="relative overflow-hidden rounded-2xl border border-saffron/25 bg-white p-3.5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saffron-light via-saffron to-navy" />
          <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${chip}`}>
            <Icon size={20} />
          </span>
          <p className="text-[13px] font-semibold leading-tight text-navy/75">{label}</p>
          <p className="text-[11px] text-navy/45">{sub}</p>
          <p className={`mt-1 truncate text-xl font-extrabold tracking-tight ${tone}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}
