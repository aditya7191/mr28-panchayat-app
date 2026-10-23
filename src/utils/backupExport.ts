import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Expense, Member, Payment, Settings } from '../types'
import { formatDate } from './format'
import { accountSummary, categoryText, formatPaise, monthlyBreakdown } from './accounts'

function backupDateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function downloadArrayBuffer(filename: string, data: ArrayBuffer, mime: string) {
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function memberNameMap(members: Member[]): Map<string, Member> {
  return new Map(members.map((m) => [m.id, m]))
}

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }

/** Build and download MR28-backup-YYYY-MM-DD.xlsx (Members + Payments sheets). */
export function downloadExcelBackup(
  members: Member[],
  payments: Payment[],
  expenses: Expense[] = [],
): void {
  const wb = XLSX.utils.book_new()

  const memberRows = members.map((m) => ({
    'Membership No': m.membershipNo,
    Name: m.name,
    Phone: m.phone,
    Address: m.address,
    'Fee Plan': m.feePlan,
    Status: m.status,
    'Next Due': m.nextDueDate,
    Notes: m.notes,
  }))
  const membersSheet = XLSX.utils.json_to_sheet(
    memberRows.length
      ? memberRows
      : [
          {
            'Membership No': '',
            Name: '',
            Phone: '',
            Address: '',
            'Fee Plan': '',
            Status: '',
            'Next Due': '',
            Notes: '',
          },
        ],
  )
  XLSX.utils.book_append_sheet(wb, membersSheet, 'Members')

  const map = memberNameMap(members)
  const paymentRows = payments.map((p) => {
    const m = map.get(p.memberId)
    return {
      'Receipt No': p.receiptNo,
      Member: m ? `${m.membershipNo} — ${m.name}` : p.memberId,
      Amount: p.amount,
      Method: p.method,
      Period: `${p.periodFrom} – ${p.periodTo}`,
      PaidAt: p.paidAt,
      Notes: p.notes,
    }
  })
  const paymentsSheet = XLSX.utils.json_to_sheet(
    paymentRows.length
      ? paymentRows
      : [
          {
            'Receipt No': '',
            Member: '',
            Amount: '',
            Method: '',
            Period: '',
            PaidAt: '',
            Notes: '',
          },
        ],
  )
  XLSX.utils.book_append_sheet(wb, paymentsSheet, 'Payments')

  const expenseRows = expenses.map((e) => ({
    'Voucher No': e.voucherNo,
    Date: e.date,
    Amount: e.amountPaise / 100,
    Category: categoryText(e, 'en'),
    'Where / What': e.description,
    'Paid To': e.paidTo,
    'Paid By': e.paidBy,
    Method: e.method,
    Bills: e.billIds.length,
  }))
  const expensesSheet = XLSX.utils.json_to_sheet(
    expenseRows.length
      ? expenseRows
      : [{ 'Voucher No': '', Date: '', Amount: '', Category: '', 'Where / What': '', 'Paid To': '', 'Paid By': '', Method: '', Bills: '' }],
  )
  XLSX.utils.book_append_sheet(wb, expensesSheet, 'Expenses')

  const sum = accountSummary(payments, expenses)
  const summaryAoa: (string | number)[][] = [
    ['MR28 Panchayat - Hisab Summary', ''],
    ['Date', backupDateStamp()],
    [],
    ['Total Jama (collected)', sum.jama / 100],
    ['Total Kharcha (expenses)', sum.kharcha / 100],
    ['Balance / Bachat (Jama - Kharcha)', sum.balance / 100],
    [],
    ['Month', 'Jama', 'Kharcha', 'Balance'],
    ...monthlyBreakdown(payments, expenses).map((r) => [r.month, r.jama / 100, r.kharcha / 100, r.balance / 100]),
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa)
  summarySheet['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  downloadArrayBuffer(
    `MR28-backup-${backupDateStamp()}.xlsx`,
    out,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}

/**
 * Build and download MR28-backup-YYYY-MM-DD.pdf summary.
 * Uses Latin/English labels so default Helvetica stays readable on phone
 * (Gujarati needs a custom font; UI buttons remain bilingual).
 */
export function downloadPdfBackup(
  settings: Settings,
  members: Member[],
  payments: Payment[],
  expenses: Expense[] = [],
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 10
  const stamp = backupDateStamp()
  const sum = accountSummary(payments, expenses)

  let y = 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(settings.orgNameEn || 'Mira Road Sthanik Panchayat-28', margin, y, {
    maxWidth: pageW - margin * 2,
  })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const sub = settings.orgSubtitleEn || ''
  if (sub) {
    doc.text(sub, margin, y, { maxWidth: pageW - margin * 2 })
    y += 5
  }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Offline backup (Excel/PDF also in Settings)', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Date: ${stamp}`, margin, y)
  y += 5
  doc.text(`Total members: ${members.length}`, margin, y)
  y += 5
  doc.text(`Total jama (collected): Rs ${formatPaise(sum.jama)}`, margin, y)
  y += 5
  doc.text(`Total kharcha (expenses): Rs ${formatPaise(sum.kharcha)}`, margin, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text(`Balance / Bachat (Jama - Kharcha): Rs ${formatPaise(sum.balance)}`, margin, y)
  doc.setFont('helvetica', 'normal')
  y += 8

  const map = memberNameMap(members)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Members', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [107, 29, 46], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 246, 236] },
    head: [['No.', 'Name', 'Phone', 'Address', 'Plan', 'Status', 'Next due']],
    body: members.map((m) => [
      m.membershipNo,
      m.name,
      m.phone,
      m.address,
      m.feePlan,
      m.status,
      m.nextDueDate,
    ]),
  })

  const afterMembers = (doc as DocWithTable).lastAutoTable?.finalY ?? y + 10
  let y2 = afterMembers + 8
  if (y2 > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    y2 = 14
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Payments', margin, y2)
  y2 += 2

  autoTable(doc, {
    startY: y2,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [107, 29, 46], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 246, 236] },
    head: [
      ['Receipt', 'Member', 'Amount', 'Method', 'Period', 'Paid at', 'Notes'],
    ],
    body: payments.map((p) => {
      const m = map.get(p.memberId)
      return [
        p.receiptNo,
        m ? `${m.membershipNo} ${m.name}` : p.memberId,
        String(p.amount),
        p.method,
        `${p.periodFrom} - ${p.periodTo}`,
        formatDate(p.paidAt),
        p.notes || '',
      ]
    }),
  })

  const newSection = (title: string): number => {
    let yy = ((doc as DocWithTable).lastAutoTable?.finalY ?? 14) + 8
    if (yy > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      yy = 14
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(title, margin, yy)
    return yy + 2
  }
  const tableStyle = {
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' as const },
    headStyles: { fillColor: [107, 29, 46] as [number, number, number], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 246, 236] as [number, number, number] },
  }

  autoTable(doc, {
    ...tableStyle,
    startY: newSection('Expenses (Kharcha)'),
    head: [['Voucher', 'Date', 'Amount', 'Category', 'Where / What', 'Paid to', 'Paid by', 'Bills']],
    body: expenses.map((e) => [
      e.voucherNo,
      formatDate(e.date),
      formatPaise(e.amountPaise),
      categoryText(e, 'en'),
      e.description,
      e.paidTo,
      e.paidBy,
      String(e.billIds.length),
    ]),
  })

  autoTable(doc, {
    ...tableStyle,
    startY: newSection('Hisab summary (automatic)'),
    head: [['Month', 'Jama (+)', 'Kharcha (-)', 'Balance (=)']],
    body: [
      ...monthlyBreakdown(payments, expenses).map((r) => [
        r.month,
        formatPaise(r.jama),
        formatPaise(r.kharcha),
        formatPaise(r.balance),
      ]),
      ['TOTAL', formatPaise(sum.jama), formatPaise(sum.kharcha), formatPaise(sum.balance)],
    ],
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(
      `Jay Rohidas Baapu · MR28 backup · page ${i}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    )
    doc.setTextColor(0)
  }

  doc.save(`MR28-backup-${stamp}.pdf`)
}
