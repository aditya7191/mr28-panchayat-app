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
  /** Cloud copy of phone/address as AES-GCM ciphertext ('v1.…'); plaintext never leaves the device. */
  secret?: string
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

export type ExpenseCategory = 'program' | 'help' | 'material' | 'rent' | 'other'

/** Kharcha (expense) entry. Amount is stored in integer PAISE to avoid float errors. */
export interface Expense {
  id: string
  voucherNo: string // MR28-E-0001
  date: string // YYYY-MM-DD
  amountPaise: number // integer paise (₹1 = 100)
  category: ExpenseCategory
  categoryOther: string // free text (used for 'other' or extra detail)
  description: string // where / what it was spent on
  paidTo: string
  paidBy: string
  method: PaymentMethod
  billIds: string[] // images stored in the bills gist as bill-<id>.txt
  createdAt: string
  updatedAt: string
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
  /** Next expense voucher number (MR28-E-####). Optional for older data. */
  nextExpenseCounter?: number
  defaultLang: Lang
  upiId: string
  bankDetails: string
  /** After saving a payment, auto-open wa.me with digital receipt. Default ON. */
  autoWhatsAppAfterPayment: boolean
  /** Delay (ms) between sequential reminder WhatsApp opens. Default 2000. */
  whatsAppBatchDelayMs: number
  /** Admin gate password; blank = built-in default (hash-checked). Local only. */
  adminPassword: string
  /** Name shown as “Received by” on receipts (officer who collected fala). */
  receivedBy: string
  /** When settings were last edited by an admin (ISO). Used to merge settings across devices. */
  settingsUpdatedAt?: string
  /** Time of the last admin "Reset all data" (ISO). Devices with data/counters from before
   *  this time drop them when they sync, so a reset reaches every phone. */
  resetAt?: string
}

/** Deletion markers: record id → ISO time it was deleted. Lets deletes sync without ever
 *  treating "missing in cloud" as "deleted". */
export interface Tombstones {
  members: Record<string, string>
  payments: Record<string, string>
  expenses: Record<string, string>
  eduPrograms: Record<string, string>
  eduStudents: Record<string, string>
}

export const EMPTY_TOMBSTONES: Tombstones = { members: {}, payments: {}, expenses: {}, eduPrograms: {}, eduStudents: {} }

/** Education programme (e.g. "Mira Road Education Support & Book Distribution Program 2026"). */
export interface EduProgram {
  id: string
  title: string
  year: string
  createdAt: string
  updatedAt: string
}

/** Student in a programme. Public fields only — mobile + marksheet live ONLY inside `secret`
 *  (AES-GCM ciphertext, key derived from the admin password). Never add plaintext private keys here. */
export interface EduStudent {
  id: string
  programId: string
  name: string
  school: string
  standard: string
  stream: string
  goal: string
  /** Mother & father name — PUBLIC (shown on the public page). */
  parents?: string
  /** Result percentage 0–100, or null when not entered yet. */
  resultPct: number | null
  status: string
  /** "v1.<iv>.<ciphertext>" of {mobile, marksheet}; '' when both empty. */
  secret: string
  createdAt: string
  updatedAt: string
}

/** Decrypted private fields (memory only, admin only). */
export interface EduPrivate {
  mobile: string
  marksheet: string
  /** Legacy: parent names were briefly stored here; now public on EduStudent. */
  parents?: string
}

export interface AppData {
  version: number
  settings: Settings
  members: Member[]
  payments: Payment[]
  /** Kharcha entries (optional: older files don't have it). */
  expenses?: Expense[]
  /** Education (optional: older files don't have it). */
  eduPrograms?: EduProgram[]
  eduStudents?: EduStudent[]
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
  nextExpenseCounter: 1,
  defaultLang: 'gu',
  upiId: '',
  bankDetails: '',
  autoWhatsAppAfterPayment: true,
  whatsAppBatchDelayMs: 2000,
  adminPassword: '', // '' = default password (checked by hash, see utils/password)
  receivedBy: 'Aditya Solanki (Vice Secretary)',
}
