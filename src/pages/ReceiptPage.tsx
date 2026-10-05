import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy, MessageCircle, Printer, Share2 } from 'lucide-react'
import { Watermark } from '../components/Watermark'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import {
  buildReceiptShareCaption,
  buildReceiptShareText,
  formatDate,
} from '../utils/format'
import {
  captureReceiptImage,
  downloadFile,
  shareReceiptFile,
} from '../utils/receiptImage'
import {
  normalizePhoneForWhatsApp,
  openWhatsApp,
} from '../utils/whatsapp'

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, lang } = useI18n()
  const { payments, members, settings } = useStore()
  const [copied, setCopied] = useState(false)
  const [waOpened, setWaOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')
  const autoOpened = useRef(false)
  const receiptRef = useRef<HTMLElement>(null)

  const payment = payments.find((p) => p.id === id)
  const member = payment
    ? members.find((m) => m.id === payment.memberId)
    : undefined

  const shareText =
    payment && member
      ? buildReceiptShareText(payment, member, settings)
      : ''
  const caption =
    payment && member ? buildReceiptShareCaption(payment, member) : ''

  async function makeReceiptFile(): Promise<File | null> {
    if (!receiptRef.current || !payment) return null
    return captureReceiptImage(
      receiptRef.current,
      `${payment.receiptNo}.png`,
    )
  }

  /**
   * Prefer Web Share with receipt PNG (WhatsApp on Android Chrome).
   * Fallback: download image + open wa.me with short caption + instruct.
   */
  async function shareReceiptPhoto(opts?: {
    preferWhatsAppPhone?: boolean
  }): Promise<void> {
    if (!payment || !member) return
    setBusy(true)
    setHint(t('sharingReceipt'))
    try {
      const file = await makeReceiptFile()
      if (!file) {
        setHint('')
        return
      }

      const result = await shareReceiptFile(
        file,
        caption,
        payment.receiptNo,
      )

      if (result === 'shared') {
        setWaOpened(true)
        setHint('')
        setTimeout(() => setWaOpened(false), 2500)
        return
      }
      if (result === 'cancelled') {
        setHint('')
        return
      }

      // Fallback: save image + open WhatsApp text (secondary)
      downloadFile(file)
      setHint(t('attachImageInstruct'))
      if (opts?.preferWhatsAppPhone !== false && member.phone) {
        openWhatsApp(
          member.phone,
          `${caption}\n\n(${t('attachImageInstruct')})`,
        )
        setWaOpened(true)
        setTimeout(() => setWaOpened(false), 2500)
      }
    } catch {
      // Last resort: text-only WhatsApp
      if (member.phone) {
        openWhatsApp(member.phone, shareText)
        setWaOpened(true)
        setTimeout(() => setWaOpened(false), 2500)
      }
      setHint('')
    } finally {
      setBusy(false)
    }
  }

  // Auto-trigger image share after payment when ?wa=1
  useEffect(() => {
    if (autoOpened.current) return
    if (!payment || !member) return
    if (searchParams.get('wa') !== '1') return
    autoOpened.current = true
    setSearchParams({}, { replace: true })
    if (!normalizePhoneForWhatsApp(member.phone)) return
    const tmr = setTimeout(() => {
      void shareReceiptPhoto({ preferWhatsAppPhone: true })
    }, 450)
    return () => clearTimeout(tmr)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on wa=1
  }, [payment, member, searchParams, setSearchParams])

  if (!payment || !member) {
    return (
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
        <Watermark hideOnPrint />
        <div className="relative z-10 p-4 text-center">
          <p className="text-navy/60">{t('error')}</p>
          <Link to="/payments" className="mt-2 inline-block text-saffron">
            {t('back')}
          </Link>
        </div>
      </div>
    )
  }

  async function copyText() {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    await shareReceiptPhoto({ preferWhatsAppPhone: false })
  }

  function sendWhatsAppReceipt() {
    void shareReceiptPhoto({ preferWhatsAppPhone: true })
  }

  async function saveImageOnly() {
    setBusy(true)
    setHint(t('sharingReceipt'))
    try {
      const file = await makeReceiptFile()
      if (file) {
        downloadFile(file)
        setHint(t('attachImageInstruct'))
      }
    } finally {
      setBusy(false)
    }
  }

  function sendTextOnly() {
    openWhatsApp(member!.phone, shareText)
    setWaOpened(true)
    setTimeout(() => setWaOpened(false), 2500)
  }

  const hasPhone = !!normalizePhoneForWhatsApp(member.phone)

  const methodLabel =
    payment.method === 'cash'
      ? t('cash')
      : payment.method === 'upi'
        ? t('upi')
        : t('bank')

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark hideOnPrint />

      <div className="relative z-30 flex items-center gap-2 border-b border-cream-dark bg-navy px-3 py-3 text-white no-print">
        <Link to="/payments" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="flex-1 text-sm font-bold">{t('receiptTitle')}</h1>
      </div>

      {waOpened && (
        <p className="relative z-30 mx-3 mt-2 rounded-lg bg-[#25D366]/15 px-3 py-2 text-center text-xs font-semibold text-navy no-print">
          {t('whatsAppOpened')}
        </p>
      )}
      {hint && (
        <p className="relative z-30 mx-3 mt-2 rounded-lg bg-saffron/15 px-3 py-2 text-center text-xs font-semibold text-navy no-print">
          {hint}
        </p>
      )}

      <div className="relative z-10 flex-1 p-3">
        <article
          ref={receiptRef}
          className="receipt-page relative rounded-2xl border-2 border-navy/20 bg-white p-5 shadow-md"
        >
          {/* On-card watermark so it stays visible over the white receipt (screen + print + image) */}
          <Watermark contained />

          <div className="relative z-10">
            <div className="border-b-2 border-saffron pb-3 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-navy text-lg font-bold text-saffron">
                28
              </div>
              <h2 className="text-base font-bold leading-snug text-navy">
                {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-navy/60">
                {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-saffron-dark">
                {t('receiptOf')}
              </p>
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              <Row label={t('receiptNo')} value={payment.receiptNo} bold />
              <Row label={t('date')} value={formatDate(payment.paidAt)} />
              <Row label={t('receivedFrom')} value={member.name} bold />
              <Row label={t('membershipNo')} value={member.membershipNo} />
              {member.phone && <Row label={t('phone')} value={member.phone} />}
              <Row
                label={t('amount')}
                value={`₹${payment.amount}`}
                bold
                highlight
              />
              <Row label={t('paymentMethod')} value={methodLabel} />
              <Row
                label={t('forPeriod')}
                value={`${formatDate(payment.periodFrom)} – ${formatDate(payment.periodTo)}`}
              />
              {payment.notes && <Row label={t('notes')} value={payment.notes} />}
            </div>

            <p className="mt-6 text-center text-xs font-semibold text-navy/70">
              {t('thankYou')}
            </p>
          </div>
        </article>
      </div>

      <div className="relative z-30 flex flex-col gap-2 border-t border-cream-dark bg-white p-3 no-print pb-safe">
        <button
          type="button"
          onClick={sendWhatsAppReceipt}
          disabled={!hasPhone || busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          <MessageCircle size={16} />
          {busy ? t('sharingReceipt') : t('openWhatsAppReceipt')}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white"
          >
            <Printer size={16} />
            {t('print')}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-saffron py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Share2 size={16} />
            {t('share')}
          </button>
          <button
            type="button"
            onClick={() => void copyText()}
            className="flex items-center justify-center gap-1 rounded-xl border border-navy/20 px-3 py-2.5 text-sm font-semibold text-navy"
          >
            <Copy size={16} />
            {copied ? t('copied') : t('copyText')}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void saveImageOnly()}
            disabled={busy}
            className="flex flex-1 items-center justify-center rounded-xl border border-navy/20 py-2 text-xs font-semibold text-navy disabled:opacity-40"
          >
            {t('saveReceiptImage')}
          </button>
          <button
            type="button"
            onClick={sendTextOnly}
            disabled={!hasPhone}
            className="flex flex-1 items-center justify-center rounded-xl border border-navy/20 py-2 text-xs font-semibold text-navy disabled:opacity-40"
          >
            {t('openWhatsAppText')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string
  value: string
  bold?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-navy/10 pb-2">
      <span className="shrink-0 text-xs text-navy/50">{label}</span>
      <span
        className={`text-right ${bold ? 'font-bold' : 'font-medium'} ${
          highlight ? 'text-lg text-saffron-dark' : 'text-navy'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
