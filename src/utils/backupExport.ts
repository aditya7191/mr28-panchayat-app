import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Member, Payment, Settings } from '../types'
import { formatDate, formatINR, totalCollected } from './format'

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
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 10
  const stamp = backupDateStamp()
  const jama = totalCollected(payments)

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
  doc.text(`Total jama (collected): Rs ${formatINR(jama)}`, margin, y)
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
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 240, 230] },
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
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 240, 230] },
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
