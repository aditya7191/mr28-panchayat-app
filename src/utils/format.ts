import { format, parseISO, differenceInCalendarDays, addMonths, addYears } from 'date-fns'
import type { FeePlan, Member, Payment, Settings } from '../types'

export function formatDate(iso: string, pattern = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(iso.length === 10 ? iso + 'T00:00:00' : iso), pattern)
  } catch {
    return iso
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function padCounter(n: number, width = 4): string {
  return String(n).padStart(width, '0')
}

export function makeMembershipNo(counter: number): string {
  return `MR28-${padCounter(counter)}`
}

export function makeReceiptNo(counter: number): string {
  return `MR28-R-${padCounter(counter)}`
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function advanceDueDate(from: string, plan: FeePlan): string {
  const d = parseISO(from.length === 10 ? from + 'T00:00:00' : from)
  const next = plan === 'yearly' ? addYears(d, 1) : addMonths(d, 1)
  return format(next, 'yyyy-MM-dd')
}

export function daysUntil(dateStr: string): number {
  const d = parseISO(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr)
  return differenceInCalendarDays(d, new Date())
}

export function isOverdue(member: Member): boolean {
  return member.status === 'active' && daysUntil(member.nextDueDate) < 0
}

export function isDueSoon(member: Member, withinDays = 7): boolean {
  if (member.status !== 'active') return false
  const d = daysUntil(member.nextDueDate)
  return d >= 0 && d <= withinDays
}

export function monthKey(date = new Date()): string {
  return format(date, 'yyyy-MM')
}

export function paymentsThisMonth(payments: Payment[]): Payment[] {
  const key = monthKey()
  return payments.filter((p) => p.paidAt.startsWith(key) || (p.paidAt.length === 10 && p.paidAt.startsWith(key)))
}

export function collectedThisMonth(payments: Payment[]): number {
  return paymentsThisMonth(payments).reduce((s, p) => s + p.amount, 0)
}

/** Transparency: sum of ALL recorded payments = total amount with Panchayat (કુલ જમા). */
export function totalCollected(payments: Payment[]): number {
  return payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
}

/** Indian-grouped rupee amount, e.g. 1,25,000 */
export function formatINR(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function defaultAmount(plan: FeePlan, settings: Settings): number {
  return plan === 'yearly' ? settings.yearlyFee : settings.monthlyFee
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function membersToCsv(members: Member[]): string {
  const headers = [
    'membershipNo',
    'name',
    'phone',
    'address',
    'feePlan',
    'status',
    'nextDueDate',
    'notes',
    'createdAt',
  ]
  const rows = members.map((m) =>
    headers
      .map((h) => {
        const v = String((m as unknown as Record<string, string>)[h] ?? '')
        return `"${v.replace(/"/g, '""')}"`
      })
      .join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

export function paymentsToCsv(
  payments: Payment[],
  members: Member[],
): string {
  const map = new Map(members.map((m) => [m.id, m]))
  const headers = [
    'receiptNo',
    'membershipNo',
    'memberName',
    'amount',
    'method',
    'periodFrom',
    'periodTo',
    'paidAt',
    'notes',
  ]
  const rows = payments.map((p) => {
    const m = map.get(p.memberId)
    const vals = [
      p.receiptNo,
      m?.membershipNo ?? '',
      m?.name ?? '',
      String(p.amount),
      p.method,
      p.periodFrom,
      p.periodTo,
      p.paidAt,
      p.notes,
    ]
    return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

export function buildWhatsAppReminder(
  member: Member,
  settings: Settings,
  overdue: boolean,
): string {
  const fee =
    member.feePlan === 'yearly'
      ? `₹${settings.yearlyFee}/વર્ષ (year)`
      : `₹${settings.monthlyFee}/મહિનો (month)`
  const due = formatDate(member.nextDueDate)
  const statusLine = overdue
    ? `તમારો ફાળો મુદત વીતી ગયો છે / Your fee is overdue (due: ${due}).`
    : `તમારો ફાળો નજીક છે / Your fee is due soon (due: ${due}).`

  const lines = [
    `નમસ્તે ${member.name} જી,`,
    ``,
    `${settings.orgNameGu}`,
    `(${settings.orgNameEn})`,
    ``,
    statusLine,
    `સભ્ય નં. / Membership: ${member.membershipNo}`,
    `ફાળો / Fee: ${fee}`,
    settings.upiId ? `UPI: ${settings.upiId}` : '',
    ``,
    `કૃપા કરીને ફાળો ભરી આપો. / Please pay at your earliest.`,
    `જય રોહિદાસ બાપુ.`,
  ]
  return lines.filter((l) => l !== undefined).join('\n')
}

export function receiptReceiverName(settings: Settings): string {
  const name = (settings.receivedBy || '').trim()
  return name || 'Aditya Solanki (Vice Secretary)'
}

export function buildReceiptShareText(
  payment: Payment,
  member: Member,
  settings: Settings,
): string {
  return [
    settings.orgNameGu,
    settings.orgNameEn,
    `--- ${settings.orgSubtitleGu} ---`,
    ``,
    `રસીદ / Receipt: ${payment.receiptNo}`,
    `તારીખ / Date: ${formatDate(payment.paidAt)}`,
    `ફાળો આપનાર / Paid by: ${member.name}`,
    `સભ્ય નં. / Membership No.: ${member.membershipNo}`,
    `રકમ / Amount: ₹${payment.amount}`,
    `પદ્ધતિ / Method: ${payment.method}`,
    `સમયગાળો / Period: ${formatDate(payment.periodFrom)} – ${formatDate(payment.periodTo)}`,
    `પ્રાપ્ત કરનાર / Received by: ${receiptReceiverName(settings)}`,
    ``,
    `આભાર! જય રોહિદાસ બાપુ.`,
  ].join('\n')
}

/** Short caption for image share / WhatsApp fallback. */
export function buildReceiptShareCaption(
  payment: Payment,
  member: Member,
  settings?: Settings,
): string {
  const receiver = settings ? receiptReceiverName(settings) : ''
  return [
    `રસીદ / Receipt: ${payment.receiptNo}`,
    `ફાળો આપનાર / Paid by: ${member.name}`,
    `સભ્ય નં. / No.: ${member.membershipNo}`,
    `રકમ / Amount: ₹${payment.amount}`,
    ...(receiver
      ? [`પ્રાપ્ત કરનાર / Received by: ${receiver}`]
      : []),
    ``,
    `જય રોહિદાસ બાપુ / Jay Rohidas Baapu`,
  ].join('\n')
}
