export type Lang = 'gu' | 'en'
export type FeePlan = 'monthly' | 'yearly'
export type MemberStatus = 'active' | 'inactive'
export type PaymentMethod = 'cash' | 'upi' | 'bank'

export interface Member {
  id: string
  membershipNo: string
  name: string
  phone: string
  address: string
  feePlan: FeePlan
  status: MemberStatus
  nextDueDate: string // YYYY-MM-DD
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  receiptNo: string
  memberId: string
  amount: number
  method: PaymentMethod
  periodFrom: string // YYYY-MM-DD
  periodTo: string // YYYY-MM-DD
  paidAt: string // ISO datetime
  notes: string
  /** Last edit time (ISO). Optional for older records; falls back to paidAt. */
  updatedAt?: string
}

export interface Settings {
  orgNameGu: string
  orgNameEn: string
  orgSubtitleGu: string
  orgSubtitleEn: string
  areaCode: string
  monthlyFee: number
  yearlyFee: number
  nextMemberCounter: number
  nextReceiptCounter: number
  defaultLang: Lang
  upiId: string
  bankDetails: string
  /** After saving a payment, auto-open wa.me with digital receipt. Default ON. */
  autoWhatsAppAfterPayment: boolean
  /** Delay (ms) between sequential reminder WhatsApp opens. Default 2000. */
  whatsAppBatchDelayMs: number
  /** Admin gate password (default aditya@1989). Stored in settings. */
  adminPassword: string
  /** Name shown as “Received by” on receipts (officer who collected fala). */
  receivedBy: string
  /** When settings were last edited by an admin (ISO). Used to merge settings across devices. */
  settingsUpdatedAt?: string
}

/** Deletion markers: record id → ISO time it was deleted. Lets deletes sync without ever
 *  treating "missing in cloud" as "deleted". */
export interface Tombstones {
  members: Record<string, string>
  payments: Record<string, string>
}

export const EMPTY_TOMBSTONES: Tombstones = { members: {}, payments: {} }

export interface AppData {
  version: number
  settings: Settings
  members: Member[]
  payments: Payment[]
  exportedAt?: string
  /** Explicit deletions (optional; older files don't have it). */
  deleted?: Tombstones
}

export const DEFAULT_SETTINGS: Settings = {
  orgNameGu: 'મીરા રોડ સ્થાનિક પંચાયત-૨૮',
  orgNameEn: 'Mira Road Sthanik Panchayat-28',
  orgSubtitleGu: 'શ્રી સંત શિરોમણિ રોહિદાસ વંશી વઢિયારા સમાજ',
  orgSubtitleEn: 'Shree Sant Shiromani Rohidas Vanshi Vadhiyara Samaj',
  areaCode: '28',
  monthlyFee: 50,
  yearlyFee: 600,
  nextMemberCounter: 1,
  nextReceiptCounter: 1,
  defaultLang: 'gu',
  upiId: '',
  bankDetails: '',
  autoWhatsAppAfterPayment: true,
  whatsAppBatchDelayMs: 2000,
  adminPassword: 'aditya@1989',
  receivedBy: 'Aditya Solanki (Vice Secretary)',
}
