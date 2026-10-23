/**
 * Hisab (accounts) — all money math in integer PAISE so there are no float errors.
 * Payments store rupees (number); expenses store integer paise.
 */
import type { Expense, ExpenseCategory, Payment } from '../types'

export function rupeesToPaise(r: number | string): number {
  const n = typeof r === 'string' ? Number(r.replace(/,/g, '').trim()) : r
  if (!Number.isFinite(n)) return NaN
  return Math.round(n * 100)
}

/** Parse what the admin typed (e.g. "1250" or "1250.50") into paise; NaN if invalid. */
export function parseAmountInput(s: string): number {
  const t = s.replace(/,/g, '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN
  const [w, f = ''] = t.split('.')
  return Number(w) * 100 + Number((f + '00').slice(0, 2))
}

export function paiseToInput(p: number): string {
  const w = Math.trunc(p / 100)
  const f = p % 100
  return f ? `${w}.${String(f).padStart(2, '0')}` : String(w)
}

/** ₹ text with Indian grouping, e.g. 1,25,000 or 1,250.50 */
export function formatPaise(p: number): string {
  const neg = p < 0
  const a = Math.abs(Math.round(p))
  const w = Math.trunc(a / 100).toLocaleString('en-IN')
  const f = a % 100
  return `${neg ? '-' : ''}${w}${f ? '.' + String(f).padStart(2, '0') : ''}`
}

export function totalJamaPaise(payments: Payment[]): number {
  return payments.reduce((s, p) => s + (rupeesToPaise(Number(p.amount) || 0) || 0), 0)
}

export function totalKharchaPaise(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + (Math.round(Number(e.amountPaise)) || 0), 0)
}

export interface AccountSummary {
  jama: number
  kharcha: number
  balance: number
}

export function accountSummary(payments: Payment[], expenses: Expense[]): AccountSummary {
  const jama = totalJamaPaise(payments)
  const kharcha = totalKharchaPaise(expenses)
  return { jama, kharcha, balance: jama - kharcha }
}

export interface MonthRow extends AccountSummary {
  month: string // YYYY-MM
}

/** Month-wise Jama / Kharcha / Balance (newest month first). */
export function monthlyBreakdown(payments: Payment[], expenses: Expense[]): MonthRow[] {
  const map = new Map<string, MonthRow>()
  const row = (k: string) => {
    let r = map.get(k)
    if (!r) {
      r = { month: k, jama: 0, kharcha: 0, balance: 0 }
      map.set(k, r)
    }
    return r
  }
  for (const p of payments) row((p.paidAt || '').slice(0, 7) || '----').jama += rupeesToPaise(Number(p.amount) || 0) || 0
  for (const e of expenses) row((e.date || '').slice(0, 7) || '----').kharcha += Math.round(Number(e.amountPaise)) || 0
  const rows = [...map.values()]
  for (const r of rows) r.balance = r.jama - r.kharcha
  return rows.sort((a, b) => b.month.localeCompare(a.month))
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['program', 'help', 'material', 'rent', 'other']

export const CATEGORY_LABELS: Record<ExpenseCategory, { gu: string; en: string }> = {
  program: { gu: 'કાર્યક્રમ', en: 'Program / Karyakram' },
  help: { gu: 'સહાય', en: 'Sahay / Help' },
  material: { gu: 'સામાન', en: 'Saman / Material' },
  rent: { gu: 'ભાડું', en: 'Bhada / Rent' },
  other: { gu: 'અન્ય', en: 'Other' },
}

export function categoryText(e: Expense, lang: 'gu' | 'en'): string {
  const base = CATEGORY_LABELS[e.category]?.[lang] ?? e.category
  return e.categoryOther ? `${base} – ${e.categoryOther}` : base
}

export function makeVoucherNo(counter: number): string {
  return `MR28-E-${String(counter).padStart(4, '0')}`
}
