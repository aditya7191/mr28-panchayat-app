import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardCopy,
  Copy,
  Download,
  MessageCircle,
  Printer,
  Share2,
} from 'lucide-react'
import { Modal, ModalBody } from '../components/Modal'
import { Watermark } from '../components/Watermark'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { strings, type StringKey } from '../i18n'
import {
  buildReceiptShareCaption,
  buildReceiptShareText,
  formatDate,
} from '../utils/format'
import {
  canCopyImage,
  canShareFiles,
  copyImageToClipboard,
  downloadFile,
  isIOS,
  renderReceiptImage,
  shareReceiptFile,
  type ShareResult,
} from '../utils/receiptImage'
import {
  normalizePhoneForWhatsApp,
  openWhatsApp,
} from '../utils/whatsapp'

type ToastKind = 'success' | 'error' | 'info'
type SheetReason = 'blocked' | 'unsupported' | 'failed' | 'manual'

/** Gujarati / English together, so buttons are clear in both languages. */
function bi(key: StringKey): string {
  const s = strings[key]
  return s.gu === s.en ? s.en : `${s.gu} / ${s.en}`
}

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, lang } = useI18n()
  const { payments, members, settings } = useStore()
  const [copied, setCopied] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [imgUrl, setImgUrl] = useState('')
  const [genState, setGenState] = useState<'working' | 'ready' | 'error'>(
    'working',
  )
  const [genNonce, setGenNonce] = useState(0)
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(
    null,
  )
  const [sheet, setSheet] = useState<SheetReason | null>(null)
  // Read ?wa=1 once on first render (auto WhatsApp after payment)
  const autoPending = useRef(searchParams.get('wa') === '1')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const showToast = useCallback((msg: string, kind: ToastKind = 'info') => {
    setToast({ msg, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  // Remove ?wa=1 from the URL (don't re-trigger on reload). No timers here:
  // the old code's effect cleanup cancelled its own share timer on this change.
  useEffect(() => {
    if (searchParams.get('wa') === '1') {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Pre-render the receipt PNG so taps can call navigator.share()
  // synchronously (required by iOS Safari user-gesture rules).
  const methodText = payment
    ? payment.method === 'cash'
      ? t('cash')
      : payment.method === 'upi'
        ? t('upi')
        : t('bank')
    : ''
  const imageKey =
    payment && member
      ? JSON.stringify([
          payment,
          member.name,
          member.membershipNo,
          member.phone,
          lang,
          settings.orgNameGu,
          settings.orgNameEn,
          settings.orgSubtitleGu,
          settings.orgSubtitleEn,
          genNonce,
        ])
      : ''

  useEffect(() => {
    if (!payment || !member) return
    let cancelled = false
    let url = ''
    setGenState('working')
    const rows = [
      { label: t('receiptNo'), value: payment.receiptNo, bold: true },
      { label: t('date'), value: formatDate(payment.paidAt) },
      { label: t('receivedFrom'), value: member.name, bold: true },
      { label: t('membershipNo'), value: member.membershipNo },
      ...(member.phone ? [{ label: t('phone'), value: member.phone }] : []),
      {
        label: t('amount'),
        value: `₹${payment.amount}`,
        bold: true,
        highlight: true,
      },
      { label: t('paymentMethod'), value: methodText },
      {
        label: t('forPeriod'),
        value: `${formatDate(payment.periodFrom)} – ${formatDate(payment.periodTo)}`,
      },
      ...(payment.notes ? [{ label: t('notes'), value: payment.notes }] : []),
    ]
    renderReceiptImage(
      {
        orgName: lang === 'gu' ? settings.orgNameGu : settings.orgNameEn,
        orgSubtitle:
          lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn,
        title: t('receiptOf'),
        rows,
        thankYou: t('thankYou'),
        footer: 'MR28 · મીરા રોડ સ્થાનિક પંચાયત-૨૮',
        logoUrl: `${import.meta.env.BASE_URL}logo.png`,
      },
      `${payment.receiptNo}.png`,
    )
      .then((f) => {
        if (cancelled) return
        url = URL.createObjectURL(f)
        setFile(f)
        setImgUrl(url)
        setGenState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Receipt image failed', err)
        setFile(null)
        setGenState('error')
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
    // imageKey captures every input that changes the image
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey])

  const handleShareResult = useCallback(
    (result: ShareResult) => {
      switch (result) {
        case 'shared':
          setSheet(null)
          showToast(bi('receiptPhotoShared'), 'success')
          return
        case 'cancelled':
          return
        case 'blocked':
          setSheet('blocked')
          showToast(bi('shareBlockedTap'), 'error')
          return
        case 'unsupported':
          setSheet('unsupported')
          showToast(bi('shareUnsupported'), 'error')
          return
        default:
          setSheet('failed')
          showToast(bi('shareFailed'), 'error')
      }
    },
    [showToast],
  )

  /**
   * Main action: share receipt PNG via native share sheet (→ WhatsApp).
   * Synchronous up to navigator.share() so the tap gesture stays valid.
   */
  function shareReceiptPhoto() {
    if (!payment || !member) return
    if (!file) {
      if (genState === 'error') {
        showToast(bi('receiptImageFailed'), 'error')
        setGenNonce((n) => n + 1)
      } else {
        showToast(bi('sharingReceipt'), 'info')
      }
      return
    }
    if (canShareFiles([file])) {
      void shareReceiptFile(file, caption, payment.receiptNo).then(
        handleShareResult,
      )
      return
    }
    // No file sharing (desktop, some in-app browsers, older phones)
    if (!isIOS()) {
      // Same gesture: save photo + open WhatsApp chat with caption
      downloadFile(file)
      openWhatsApp(member.phone, caption)
      showToast(bi('photoSaved'), 'info')
    } else {
      showToast(bi('shareUnsupported'), 'error')
    }
    setSheet('unsupported')
  }

  // Auto share after payment (?wa=1) once the image is ready.
  useEffect(() => {
    if (!autoPending.current) return
    if (!payment || !member) return
    if (genState === 'error') {
      autoPending.current = false
      setSheet('failed')
      showToast(bi('receiptImageFailed'), 'error')
      return
    }
    if (genState !== 'ready' || !file) return
    autoPending.current = false
    const ua = (navigator as Navigator & {
      userActivation?: { isActive: boolean }
    }).userActivation
    if (!canShareFiles([file])) {
      setSheet('unsupported')
      showToast(bi('shareUnsupported'), 'error')
      return
    }
    if (ua && !ua.isActive) {
      // Tap gesture from "Save payment" has expired (always on iOS):
      // the browser would reject share — ask for one tap instead.
      setSheet('blocked')
      showToast(bi('shareBlockedTap'), 'info')
      return
    }
    void shareReceiptFile(file, caption, payment.receiptNo).then(
      handleShareResult,
    )
  }, [genState, file, payment, member, caption, handleShareResult, showToast])

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
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast(t('error'), 'error')
    }
  }

  function saveImageOnly() {
    if (!file) {
      showToast(
        bi(genState === 'error' ? 'receiptImageFailed' : 'sharingReceipt'),
        genState === 'error' ? 'error' : 'info',
      )
      if (genState === 'error') setGenNonce((n) => n + 1)
      return
    }
    downloadFile(file)
    showToast(bi('photoSaved'), 'success')
  }

  async function copyPhoto() {
    if (!file) return
    const ok = await copyImageToClipboard(file)
    showToast(bi(ok ? 'photoCopied' : 'copyPhotoFailed'), ok ? 'success' : 'error')
  }

  function openChat(text: string) {
    const ok = openWhatsApp(member!.phone, text, { sameTabFallback: true })
    if (!ok) showToast(bi('whatsAppOpenFailed'), 'error')
  }

  const hasPhone = !!normalizePhoneForWhatsApp(member.phone)
  const ios = isIOS()
  const fileShareOk = !!file && canShareFiles([file])
  const busy = genState === 'working'

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark hideOnPrint />

      <div className="relative z-30 flex items-center gap-2 border-b border-cream-dark bg-navy px-3 py-3 text-white no-print">
        <Link to="/payments" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="flex-1 text-sm font-bold">{t('receiptTitle')}</h1>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => setToast(null)}
          className={`fixed inset-x-3 top-16 z-[60] mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-lg no-print ${
            toast.kind === 'success'
              ? 'bg-[#25D366] text-white'
              : toast.kind === 'error'
                ? 'bg-[#b91c1c] text-white'
                : 'bg-[#1e3a5f] text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {genState === 'error' && (
        <div className="relative z-30 mx-3 mt-2 flex items-center gap-2 rounded-lg bg-[#fde8e8] px-3 py-2 text-xs font-semibold text-[#b91c1c] no-print">
          <span className="flex-1">{bi('receiptImageFailed')}</span>
          <button
            type="button"
            onClick={() => setGenNonce((n) => n + 1)}
            className="rounded-md border border-[#b91c1c] px-2 py-1"
          >
            {bi('retry')}
          </button>
        </div>
      )}

      <div className="relative z-10 flex-1 p-3">
        <article className="receipt-page relative rounded-2xl border-2 border-navy/20 bg-white p-5 shadow-md">
          {/* On-card watermark so it stays visible over the white receipt (screen + print) */}
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
              <Row label={t('paymentMethod')} value={methodText} />
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
          onClick={shareReceiptPhoto}
          disabled={busy}
          data-testid="wa-receipt-photo"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <MessageCircle size={18} />
          {busy ? bi('sharingReceipt') : bi('sendReceiptPhotoWA')}
        </button>
        {!hasPhone && (
          <p className="-mt-1 text-center text-[11px] text-navy/50">
            {bi('noPhoneChooseChat')}
          </p>
        )}
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
            onClick={() => setSheet('manual')}
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
            onClick={saveImageOnly}
            disabled={busy}
            className="flex flex-1 items-center justify-center rounded-xl border border-navy/20 py-2 text-xs font-semibold text-navy disabled:opacity-40"
          >
            {t('saveReceiptImage')}
          </button>
          <button
            type="button"
            onClick={() => openChat(shareText)}
            className="flex flex-1 items-center justify-center rounded-xl border border-navy/20 py-2 text-xs font-semibold text-navy"
          >
            {t('openWhatsAppText')}
          </button>
        </div>
      </div>

      <Modal
        open={sheet !== null}
        title={bi('sendReceiptTitle')}
        onClose={() => setSheet(null)}
      >
        <ModalBody>
          {sheet && sheet !== 'manual' && (
            <p className="rounded-lg bg-saffron/15 px-3 py-2 text-center text-xs font-semibold text-navy">
              {sheet === 'blocked'
                ? bi('shareBlockedTap')
                : sheet === 'unsupported'
                  ? bi('shareUnsupported')
                  : bi('shareFailed')}
            </p>
          )}
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={payment.receiptNo}
              className="mx-auto max-h-[42dvh] w-auto rounded-lg border border-navy/15 shadow"
              style={{ WebkitTouchCallout: 'default' }}
            />
          ) : (
            <p className="text-center text-xs text-navy/60">
              {genState === 'error'
                ? bi('receiptImageFailed')
                : bi('sharingReceipt')}
            </p>
          )}

          {fileShareOk && (
            <button
              type="button"
              onClick={shareReceiptPhoto}
              data-testid="sheet-share-photo"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
            >
              <Share2 size={18} />
              {bi('sendReceiptPhotoWA')}
            </button>
          )}
          {file && canCopyImage() && (
            <button
              type="button"
              onClick={() => void copyPhoto()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy/25 bg-white py-2.5 text-sm font-semibold text-navy"
            >
              <ClipboardCopy size={16} />
              {bi('copyPhoto')}
            </button>
          )}
          <button
            type="button"
            onClick={saveImageOnly}
            disabled={!file}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy/25 bg-white py-2.5 text-sm font-semibold text-navy disabled:opacity-40"
          >
            <Download size={16} />
            {bi('saveReceiptImage')}
          </button>
          <button
            type="button"
            onClick={() => openChat(caption)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] bg-white py-2.5 text-sm font-bold text-[#128C7E]"
          >
            <MessageCircle size={16} />
            {bi('openWhatsAppChat')}
          </button>
          <p className="text-[11px] leading-relaxed text-navy/70">
            {ios ? bi('iosShareSteps') : bi('androidShareSteps')}
          </p>
          {!hasPhone && (
            <p className="text-[11px] text-navy/50">{bi('noPhoneChooseChat')}</p>
          )}
        </ModalBody>
      </Modal>
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
