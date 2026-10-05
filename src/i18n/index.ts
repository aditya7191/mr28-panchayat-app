import type { Lang } from '../types'

const strings = {
  // App / Nav
  appShort: { gu: 'MR28 પંચાયત', en: 'MR28 Panchayat' },
  navDashboard: { gu: 'ડેશબોર્ડ', en: 'Dashboard' },
  navMembers: { gu: 'સભ્યો', en: 'Members' },
  navPayments: { gu: 'ચુકવણી', en: 'Payments' },
  navReminders: { gu: 'રિમાઇન્ડર', en: 'Reminders' },
  navSettings: { gu: 'સેટિંગ્સ', en: 'Settings' },

  // Dashboard
  dashboardTitle: { gu: 'ડેશબોર્ડ', en: 'Dashboard' },
  totalMembers: { gu: 'કુલ સભ્યો', en: 'Total Members' },
  activeMembers: { gu: 'સક્રિય', en: 'Active' },
  duesPending: { gu: 'બાકી ફાળો', en: 'Dues Pending' },
  collectedThisMonth: { gu: 'આ મહિને વસૂલ', en: 'Collected This Month' },
  recentPayments: { gu: 'તાજેતરની ચુકવણી', en: 'Recent Payments' },
  quickAddMember: { gu: 'નવો સભ્ય', en: 'Add Member' },
  quickRecordPayment: { gu: 'ચુકવણી નોંધો', en: 'Record Payment' },
  noPaymentsYet: { gu: 'હજુ કોઈ ચુકવણી નથી', en: 'No payments yet' },

  // Members
  membersTitle: { gu: 'સભ્યો', en: 'Members' },
  searchMembers: { gu: 'નામ / ફોન / નંબર શોધો…', en: 'Search name / phone / no…' },
  addMember: { gu: 'સભ્ય ઉમેરો', en: 'Add Member' },
  editMember: { gu: 'સભ્ય સંપાદિત કરો', en: 'Edit Member' },
  memberName: { gu: 'નામ', en: 'Name' },
  membershipNo: { gu: 'સભ્ય નંબર', en: 'Membership No.' },
  phone: { gu: 'ફોન', en: 'Phone' },
  address: { gu: 'સરનામું', en: 'Address' },
  feePlan: { gu: 'ફાળો યોજના', en: 'Fee Plan' },
  monthly: { gu: 'માસિક (₹50)', en: 'Monthly (₹50)' },
  yearly: { gu: 'વાર્ષિક (₹600)', en: 'Yearly (₹600)' },
  status: { gu: 'સ્થિતિ', en: 'Status' },
  active: { gu: 'સક્રિય', en: 'Active' },
  inactive: { gu: 'નિષ્ક્રિય', en: 'Inactive' },
  nextDue: { gu: 'આગામી ફાળો તારીખ', en: 'Next Due Date' },
  notes: { gu: 'નોંધ', en: 'Notes' },
  save: { gu: 'સાચવો', en: 'Save' },
  cancel: { gu: 'રદ કરો', en: 'Cancel' },
  delete: { gu: 'કાઢી નાખો', en: 'Delete' },
  confirmDelete: { gu: 'આ સભ્ય કાઢી નાખવો છે?', en: 'Delete this member?' },
  noMembers: { gu: 'કોઈ સભ્ય નથી. નવો ઉમેરો.', en: 'No members yet. Add one.' },
  all: { gu: 'બધા', en: 'All' },
  filterStatus: { gu: 'સ્થિતિ', en: 'Status' },
  viewPayments: { gu: 'ચુકવણી જુઓ', en: 'View Payments' },
  recordPayment: { gu: 'ચુકવણી નોંધો', en: 'Record Payment' },

  // Payments
  paymentsTitle: { gu: 'ચુકવણી', en: 'Payments' },
  newPayment: { gu: 'નવી ચુકવણી', en: 'New Payment' },
  selectMember: { gu: 'સભ્ય પસંદ કરો', en: 'Select Member' },
  amount: { gu: 'રકમ (₹)', en: 'Amount (₹)' },
  method: { gu: 'પદ્ધતિ', en: 'Method' },
  cash: { gu: 'રોકડ', en: 'Cash' },
  upi: { gu: 'UPI', en: 'UPI' },
  bank: { gu: 'બેંક', en: 'Bank' },
  periodFrom: { gu: 'સમયગાળો થી', en: 'Period From' },
  periodTo: { gu: 'સમયગાળો સુધી', en: 'Period To' },
  paidAt: { gu: 'ચુકવણી તારીખ', en: 'Payment Date' },
  receiptNo: { gu: 'રસીદ નંબર', en: 'Receipt No.' },
  viewReceipt: { gu: 'રસીદ જુઓ', en: 'View Receipt' },
  noPayments: { gu: 'કોઈ ચુકવણી નથી', en: 'No payments yet' },
  paymentSaved: { gu: 'ચુકવણી સાચવી', en: 'Payment saved' },

  // Receipt
  receiptTitle: { gu: 'રસીદ / Receipt', en: 'Receipt' },
  receiptOf: { gu: 'પ્રાપ્તિ રસીદ', en: 'Payment Receipt' },
  receivedFrom: { gu: 'પ્રાપ્ત કર્યું', en: 'Received from' },
  forPeriod: { gu: 'સમયગાળા માટે', en: 'For period' },
  paymentMethod: { gu: 'ચુકવણી પદ્ધતિ', en: 'Payment method' },
  date: { gu: 'તારીખ', en: 'Date' },
  print: { gu: 'પ્રિન્ટ', en: 'Print' },
  share: { gu: 'શેર', en: 'Share' },
  copyText: { gu: 'ટેક્સ્ટ કૉપી', en: 'Copy Text' },
  thankYou: { gu: 'આભાર! જય રોહિદાસ બાપુ.', en: 'Thank you! Jay Rohidas Baapu.' },
  back: { gu: 'પાછા', en: 'Back' },

  // Reminders
  remindersTitle: { gu: 'રિમાઇન્ડર', en: 'Reminders' },
  overdue: { gu: 'મુદત વીતી', en: 'Overdue' },
  dueSoon: { gu: '૭ દિવસમાં બાકી', en: 'Due in 7 days' },
  noReminders: { gu: 'કોઈ બાકી રિમાઇન્ડર નથી', en: 'No pending reminders' },
  copyWhatsApp: { gu: 'WhatsApp મેસેજ કૉપી', en: 'Copy WhatsApp message' },
  copied: { gu: 'કૉપી થયું!', en: 'Copied!' },
  daysOverdue: { gu: 'દિવસ વીત્યા', en: 'days overdue' },
  daysLeft: { gu: 'દિવસ બાકી', en: 'days left' },
  sendWhatsApp: { gu: 'WhatsApp મોકલો', en: 'Send WhatsApp' },
  sendAllWhatsApp: { gu: 'બધાને મોકલો', en: 'Send all' },
  sendNextWhatsApp: { gu: 'આગળનું મોકલો', en: 'Send next' },
  skipWhatsApp: { gu: 'છોડો', en: 'Skip' },
  stopWhatsAppQueue: { gu: 'રોકો', en: 'Stop' },
  whatsAppQueueProgress: { gu: 'WhatsApp કતાર', en: 'WhatsApp queue' },
  whatsAppNoPhone: { gu: 'ફોન નથી', en: 'No phone' },
  whatsAppOpened: { gu: 'WhatsApp ખોલ્યું', en: 'WhatsApp opened' },
  whatsAppBatchDone: { gu: 'બધા મેસેજ ખોલ્યા', en: 'All messages opened' },
  whatsAppBatchHint: {
    gu: 'પ્રત્યેક સભ્ય માટે WhatsApp ખુલશે. પાછા આવો → આગળ આપમેળે/બટનથી.',
    en: 'WhatsApp opens per member. Return here → next auto/button.',
  },

  // Settings
  settingsTitle: { gu: 'સેટિંગ્સ', en: 'Settings' },
  orgInfo: { gu: 'સંસ્થા માહિતી', en: 'Organisation Info' },
  orgNameGu: { gu: 'નામ (ગુજરાતી)', en: 'Name (Gujarati)' },
  orgNameEn: { gu: 'નામ (અંગ્રેજી)', en: 'Name (English)' },
  orgSubtitleGu: { gu: 'પેટા-શીર્ષક (ગુજ.)', en: 'Subtitle (Gu.)' },
  orgSubtitleEn: { gu: 'પેટા-શીર્ષક (Eng.)', en: 'Subtitle (En.)' },
  feeRates: { gu: 'ફાળો દર', en: 'Fee Rates' },
  monthlyFee: { gu: 'માસિક ફાળો (₹)', en: 'Monthly Fee (₹)' },
  yearlyFee: { gu: 'વાર્ષિક ફાળો (₹)', en: 'Yearly Fee (₹)' },
  counters: { gu: 'કાઉન્ટર', en: 'Counters' },
  nextMemberNo: { gu: 'આગામી સભ્ય નં.', en: 'Next Member No.' },
  nextReceiptNo: { gu: 'આગામી રસીદ નં.', en: 'Next Receipt No.' },
  languageDefault: { gu: 'ડિફૉલ્ટ ભાષા', en: 'Default Language' },
  gujarati: { gu: 'ગુજરાતી', en: 'Gujarati' },
  english: { gu: 'English', en: 'English' },
  paymentInfo: { gu: 'ચુકવણી માહિતી', en: 'Payment Info' },
  upiId: { gu: 'UPI ID', en: 'UPI ID' },
  bankDetails: { gu: 'બેંક વિગતો', en: 'Bank Details' },
  dataBackup: { gu: 'ડેટા / બેકઅપ', en: 'Data / Backup' },
  exportJson: { gu: 'JSON એક્સપોર્ટ', en: 'Export JSON' },
  importJson: { gu: 'JSON ઇમ્પોર્ટ', en: 'Import JSON' },
  exportCsv: { gu: 'CSV એક્સપોર્ટ', en: 'Export CSV' },
  importSuccess: { gu: 'ઇમ્પોર્ટ સફળ', en: 'Import successful' },
  importFail: { gu: 'ઇમ્પોર્ટ નિષ્ફળ — ફાઇલ તપાસો', en: 'Import failed — check file' },
  clearData: { gu: 'બધો ડેટા સાફ કરો', en: 'Clear All Data' },
  confirmClear: { gu: 'બધો ડેટા કાયમી રીતે કાઢી નાખશે. ચાલુ રાખો?', en: 'This permanently deletes all data. Continue?' },
  settingsSaved: { gu: 'સેટિંગ્સ સાચવી', en: 'Settings saved' },
  saveSettings: { gu: 'સેટિંગ્સ સાચવો', en: 'Save Settings' },
  whatsAppSection: { gu: 'WhatsApp ઓટોમેશન', en: 'WhatsApp Automation' },
  autoWhatsAppAfterPayment: {
    gu: 'ચુકવણી પછી WhatsApp આપમેળે ખોલો',
    en: 'Auto-open WhatsApp after payment',
  },
  autoWhatsAppAfterPaymentHint: {
    gu: 'રસીદ સાચવ્યા પછી રસીદનો ફોટો WhatsApp પર મોકલવા શેર ખોલે. ફોન રોકે તો મોટું બટન બતાવે.',
    en: 'After saving a payment, opens share to send the receipt photo to WhatsApp. If the phone blocks it, a big button is shown.',
  },
  whatsAppBatchDelay: {
    gu: 'બેચ મોકલવામાં વિલંબ (સેકન્ડ)',
    en: 'Batch send delay (seconds)',
  },
  whatsAppBatchDelayHint: {
    gu: 'રિમાઇન્ડર “બધાને મોકલો” માં એક પછી એક વચ્ચે વિલંબ.',
    en: 'Delay between each open when using Reminders “Send all”.',
  },
  openWhatsAppReceipt: { gu: 'WhatsApp રસીદ', en: 'WhatsApp receipt' },

  // Cloud sync
  cloudSync: { gu: 'ક્લાઉડ સિંક', en: 'Cloud Sync' },
  cloudSyncHint: {
    gu: 'iPhone અને Android પર એક જ સભ્ય યાદી. વાંચવા માટે ટોકન જરૂર નથી; લખવા માટે GitHub gist PAT.',
    en: 'Same member list on iPhone and Android. Read needs no token; write needs a GitHub gist PAT.',
  },
  cloudSyncEnable: { gu: 'ક્લાઉડ સિંક ચાલુ', en: 'Enable cloud sync' },
  cloudSyncToken: { gu: 'GitHub PAT (gist scope)', en: 'GitHub PAT (gist scope)' },
  cloudSyncTokenHint: {
    gu: 'ફક્ત આ ડિવાઇસ પર સાચવાય (localStorage). ક્યારેય gitમાં ન મૂકો. Classic token → gist scope.',
    en: 'Stored only on this device (localStorage). Never commit to git. Classic token → gist scope.',
  },
  cloudSyncCreateToken: { gu: 'ટોકન બનાવો', en: 'Create token' },
  cloudSyncPull: { gu: 'ક્લાઉડથી ખેંચો', en: 'Pull from cloud' },
  cloudSyncPush: { gu: 'ક્લાઉડ પર મોકલો', en: 'Push to cloud' },
  cloudSyncStatus: { gu: 'સ્થિતિ', en: 'Status' },
  cloudSyncReadonly: {
    gu: 'ફક્ત વાંચી શકાય — લખવા માટે PAT મૂકો',
    en: 'Read-only — paste a PAT to enable writes',
  },
  cloudSyncOk: { gu: 'સિંક થયું', en: 'Synced' },
  cloudSyncPushing: { gu: 'મોકલી રહ્યા છીએ…', en: 'Pushing…' },
  cloudSyncPulling: { gu: 'ખેંચી રહ્યા છીએ…', en: 'Pulling…' },
  cloudSyncError: { gu: 'સિંક ભૂલ', en: 'Sync error' },
  cloudSyncSavedToken: { gu: 'ટોકન સાચવ્યો', en: 'Token saved' },
  cloudSyncClearedToken: { gu: 'ટોકન કાઢ્યો', en: 'Token cleared' },
  cloudSyncPrivacy: {
    gu: 'નોંધ: ક્લાઉડ ડેટા public gist પર છે (સભ્ય નામ/ફોન સહિત). એડમિન પાસવર્ડ ક્લાઉડમાં નથી.',
    en: 'Note: cloud data lives in a public gist (includes member names/phones). Admin password is never uploaded.',
  },


  // Auth / Gate
  gateTitle: { gu: 'MR28 પંચાયત', en: 'MR28 Panchayat' },
  gateWelcome: {
    gu: 'સ્વાગત છે',
    en: 'Welcome',
  },
  publicView: { gu: 'સાર્વજનિક જોવા', en: 'Public view' },
  publicViewHint: {
    gu: 'કુલ સભ્યો, નામ, સભ્ય નં. અને ફાળો સ્થિતિ જુઓ (ફોન/સરનામું વગર).',
    en: 'See member count, names, membership nos and fala status (no phone/address).',
  },
  adminLogin: { gu: 'એડમિન લૉગિન', en: 'Admin login' },
  adminLoginHint: {
    gu: 'સભ્યો, ચુકવણી, રસીદ અને સેટિંગ્સ મેનેજ કરો.',
    en: 'Manage members, payments, receipts and settings.',
  },
  adminPassword: { gu: 'પાસવર્ડ', en: 'Password' },
  login: { gu: 'લૉગિન', en: 'Login' },
  logout: { gu: 'લૉગઆઉટ', en: 'Logout' },
  wrongPassword: { gu: 'ખોટો પાસવર્ડ', en: 'Wrong password' },
  changeAdminPassword: { gu: 'એડમિન પાસવર્ડ બદલો', en: 'Change admin password' },
  adminPasswordHint: {
    gu: 'ડિફૉલ્ટ: aditya@1989 — સેટિંગ્સમાં બદલી શકાય.',
    en: 'Default: aditya@1989 — changeable in Settings.',
  },
  backToGate: { gu: 'મુખ્ય પૃષ્ઠ', en: 'Home' },
  publicFees: { gu: 'ફાળો દર', en: 'Fee rates' },
  publicContact: { gu: 'સંપર્ક / ચુકવણી', en: 'Contact / Payment' },
  publicNoUpi: {
    gu: 'UPI હજુ સેટ નથી — કોષાધિકારીને સંપર્ક કરો.',
    en: 'UPI not set yet — contact the treasurer.',
  },
  adminMode: { gu: 'એડમિન', en: 'Admin' },
  publicMode: { gu: 'સાર્વજનિક', en: 'Public' },
  publicMembersList: { gu: 'સભ્ય યાદી', en: 'Member list' },
  publicSearchMembers: {
    gu: 'નામ / સભ્ય નં. શોધો…',
    en: 'Search name / membership no…',
  },
  publicNoMembers: {
    gu: 'હજુ કોઈ સભ્ય નથી — એડમિન ઉમેરે ત્યારે અહીં દેખાશે.',
    en: 'No members yet — they appear here when admin adds them (cloud sync).',
  },

  // Receipt image share
  shareReceiptImage: { gu: 'રસીદ ફોટો શેર', en: 'Share receipt photo' },
  saveReceiptImage: { gu: 'રસીદ ફોટો સાચવો', en: 'Save receipt photo' },
  sharingReceipt: { gu: 'રસીદ તૈયાર થઈ રહી છે…', en: 'Preparing receipt…' },
  attachImageInstruct: {
    gu: 'રસીદ ફોટો સાચવ્યો. WhatsAppમાં ફોટો જોડીને મોકલો.',
    en: 'Receipt photo saved. Attach the photo in WhatsApp and send.',
  },
  openWhatsAppText: { gu: 'WhatsApp ટેક્સ્ટ', en: 'WhatsApp text' },
  sendReceiptPhotoWA: {
    gu: 'WhatsApp પર રસીદ ફોટો મોકલો',
    en: 'Send receipt photo on WhatsApp',
  },
  receiptPhotoShared: { gu: 'રસીદ ફોટો શેર થયો ✓', en: 'Receipt photo shared ✓' },
  receiptImageFailed: {
    gu: 'રસીદ ફોટો બનાવી શકાયો નહીં. ફરી પ્રયાસ કરો અથવા ટેક્સ્ટ મોકલો.',
    en: 'Could not create receipt photo. Retry or send as text.',
  },
  retry: { gu: 'ફરી પ્રયાસ', en: 'Retry' },
  shareBlockedTap: {
    gu: 'ફોને આપમેળે શેર રોક્યું. નીચેનું લીલું બટન દબાવો.',
    en: 'Phone blocked auto-share. Tap the green button below.',
  },
  shareUnsupported: {
    gu: 'આ બ્રાઉઝર ફોટો સીધો શેર કરી શકતું નથી. નીચેના વિકલ્પો વાપરો.',
    en: 'This browser cannot share the photo directly. Use the options below.',
  },
  shareFailed: {
    gu: 'શેર નિષ્ફળ. નીચેના વિકલ્પો વાપરો.',
    en: 'Share failed. Use the options below.',
  },
  sendReceiptTitle: { gu: 'રસીદ ફોટો મોકલો', en: 'Send receipt photo' },
  copyPhoto: { gu: 'ફોટો કૉપી કરો', en: 'Copy photo' },
  photoCopied: {
    gu: 'ફોટો કૉપી થયો. હવે WhatsApp ચેટમાં Paste કરો.',
    en: 'Photo copied. Now paste it in the WhatsApp chat.',
  },
  copyPhotoFailed: { gu: 'ફોટો કૉપી ન થયો', en: 'Could not copy photo' },
  photoSaved: {
    gu: 'ફોટો સાચવ્યો. WhatsAppમાં 📎/+ થી જોડો.',
    en: 'Photo saved. Attach it in WhatsApp with 📎/+.',
  },
  openWhatsAppChat: { gu: 'WhatsApp ચેટ ખોલો', en: 'Open WhatsApp chat' },
  whatsAppOpenFailed: {
    gu: 'WhatsApp ખૂલ્યું નહીં (popup અવરોધિત?)',
    en: 'WhatsApp did not open (popup blocked?)',
  },
  iosShareSteps: {
    gu: 'iPhone: ફોટા પર લાંબું દબાવો → “Save to Photos” અથવા “Copy”. પછી “WhatsApp ચેટ ખોલો” → 📎/+ થી ફોટો જોડો અથવા Paste કરો.',
    en: 'iPhone: long-press the photo → “Save to Photos” or “Copy”. Then “Open WhatsApp chat” → attach with + or paste.',
  },
  androidShareSteps: {
    gu: 'ફોટો સાચવો/કૉપી કરો, પછી “WhatsApp ચેટ ખોલો” → 📎 થી ફોટો જોડો અથવા Paste કરો.',
    en: 'Save or copy the photo, then “Open WhatsApp chat” → attach with 📎 or paste.',
  },
  noPhoneChooseChat: {
    gu: 'સભ્યનો ફોન નથી — WhatsAppમાં ચેટ પસંદ કરો.',
    en: 'No member phone — pick the chat in WhatsApp.',
  },

  // Common
  required: { gu: 'જરૂરી', en: 'Required' },
  loading: { gu: 'લોડ થઈ રહ્યું છે…', en: 'Loading…' },
  error: { gu: 'ભૂલ', en: 'Error' },
  close: { gu: 'બંધ', en: 'Close' },
  yes: { gu: 'હા', en: 'Yes' },
  no: { gu: 'ના', en: 'No' },
  rupees: { gu: '₹', en: '₹' },
} as const

export type StringKey = keyof typeof strings

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang]
}

export { strings }
