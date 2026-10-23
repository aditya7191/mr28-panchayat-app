import { Pencil, Trash2 } from 'lucide-react'
import type { Expense } from '../types'
import { BillThumb } from './BillImage'
import { useI18n } from '../hooks/useI18n'
import { categoryText, formatPaise } from '../utils/accounts'
import { formatDate } from '../utils/format'

export function ExpenseList({
  expenses,
  onEdit,
  onDelete,
}: {
  expenses: Expense[]
  onEdit?: (e: Expense) => void
  onDelete?: (e: Expense) => void
}) {
  const { t, lang } = useI18n()
  if (expenses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-center text-sm text-navy/50">
        {t('noExpenses')}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {expenses.map((e) => (
        <li key={e.id} className="rounded-xl border border-navy/10 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">{e.voucherNo}</span>
                <span className="text-[11px] text-navy/50">{formatDate(e.date)}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-navy">{e.description}</p>
              <p className="text-[11px] text-navy/60">{categoryText(e, lang)}</p>
              {(e.paidTo || e.paidBy) && (
                <p className="text-[11px] text-navy/60">
                  {e.paidTo && <>{t('expensePaidTo')}: {e.paidTo} </>}
                  {e.paidBy && <>· {t('expensePaidBy')}: {e.paidBy}</>}
                </p>
              )}
            </div>
            <span className="shrink-0 text-base font-bold text-danger">−₹{formatPaise(e.amountPaise)}</span>
          </div>
          {e.billIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {e.billIds.map((id) => (
                <BillThumb key={id} id={id} />
              ))}
            </div>
          )}
          {(onEdit || onDelete) && (
            <div className="mt-2 flex justify-end gap-2">
              {onEdit && (
                <button type="button" onClick={() => onEdit(e)} className="flex items-center gap-1 rounded-lg border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy">
                  <Pencil size={12} /> {t('editExpense')}
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={() => onDelete(e)} className="flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-semibold text-danger">
                  <Trash2 size={12} /> {t('delete')}
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
