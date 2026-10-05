import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, MessageCircle, Send } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import {
  buildWhatsAppReminder,
  daysUntil,
  formatDate,
  isDueSoon,
  isOverdue,
} from '../utils/format'
import {
  normalizePhoneForWhatsApp,
  openWhatsApp,
  WhatsAppSendQueue,
  type WhatsAppQueueItem,
} from '../utils/whatsapp'

export function Reminders() {
  const { t } = useI18n()
  const { members, settings } = useStore()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [queueState, setQueueState] = useState<{
    current: number
    total: number
    item: WhatsAppQueueItem | null
    done: boolean
  } | null>(null)
  const queueRef = useRef<WhatsAppSendQueue | null>(null)

  const { overdue, dueSoon, pending } = useMemo(() => {
    const active = members.filter((m) => m.status === 'active')
    const od = active
      .filter(isOverdue)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    const ds = active
      .filter(isDueSoon)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    return { overdue: od, dueSoon: ds, pending: [...od, ...ds] }
  }, [members])

  useEffect(() => {
    return () => {
      queueRef.current?.stop()
    }
  }, [])

  async function copyReminder(memberId: string, overdueFlag: boolean) {
    const m = members.find((x) => x.id === memberId)
    if (!m) return
    const text = buildWhatsAppReminder(m, settings, overdueFlag)
    await navigator.clipboard.writeText(text)
    setCopiedId(memberId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openWhatsAppFor(memberId: string, overdueFlag: boolean) {
    const m = members.find((x) => x.id === memberId)
    if (!m) return
    const text = buildWhatsAppReminder(m, settings, overdueFlag)
    openWhatsApp(m.phone, text)
  }

  function startSendAll() {
    queueRef.current?.stop()
    const items: WhatsAppQueueItem[] = pending
      .filter((m) => normalizePhoneForWhatsApp(m.phone))
      .map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        text: buildWhatsAppReminder(m, settings, isOverdue(m)),
      }))
    if (items.length === 0) return
    const q = new WhatsAppSendQueue(items, {
      delayMs: settings.whatsAppBatchDelayMs || 2000,
      autoAdvance: true,
    })
    q.onChange = (s) => {
      setQueueState(s.done && s.total > 0 ? { ...s, item: null } : s)
      if (s.done) {
        // keep banner briefly then clear
        setTimeout(() => setQueueState(null), 2500)
        queueRef.current = null
      }
    }
    queueRef.current = q
    q.start()
  }

  function Section({
    title,
    items,
    overdueFlag,
  }: {
    title: string
    items: typeof overdue
    overdueFlag: boolean
  }) {
    if (items.length === 0) return null
    return (
      <section>
        <h3
          className={`mb-2 text-sm font-bold ${
            overdueFlag ? 'text-danger' : 'text-warning'
          }`}
        >
          {title} ({items.length})
        </h3>
        <ul className="flex flex-col gap-2">
          {items.map((m) => {
            const d = daysUntil(m.nextDueDate)
            const hasPhone = !!normalizePhoneForWhatsApp(m.phone)
            return (
              <li
                key={m.id}
                className="rounded-xl border border-navy/10 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-saffron-dark">
                      {m.membershipNo}
                    </p>
                    <p className="truncate text-sm font-bold text-navy">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-navy/50">
                      {t('nextDue')}: {formatDate(m.nextDueDate)} ·{' '}
                      {overdueFlag
                        ? `${Math.abs(d)} ${t('daysOverdue')}`
                        : `${d} ${t('daysLeft')}`}
                    </p>
                    {m.phone ? (
                      <p className="text-[11px] text-navy/40">{m.phone}</p>
                    ) : (
                      <p className="text-[11px] text-danger/70">
                        {t('whatsAppNoPhone')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openWhatsAppFor(m.id, overdueFlag)}
                    disabled={!hasPhone}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#25D366] py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    <MessageCircle size={14} />
                    {t('sendWhatsApp')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyReminder(m.id, overdueFlag)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-navy/15 px-3 py-2 text-xs font-semibold text-navy"
                  >
                    <Copy size={14} />
                    {copiedId === m.id ? t('copied') : t('copyText')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const sendableCount = pending.filter((m) =>
    normalizePhoneForWhatsApp(m.phone),
  ).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy">{t('remindersTitle')}</h2>
        {sendableCount > 0 && (
          <button
            type="button"
            onClick={startSendAll}
            className="flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
          >
            <Send size={14} />
            {t('sendAllWhatsApp')} ({sendableCount})
          </button>
        )}
      </div>

      {queueState && !queueState.done && (
        <div className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 p-3">
          <p className="text-xs font-bold text-navy">
            {t('whatsAppQueueProgress')}: {queueState.current}/{queueState.total}
            {queueState.item
              ? ` · ${t('sendNextWhatsApp')}: ${queueState.item.name}`
              : ''}
          </p>
          <p className="mt-1 text-[11px] text-navy/60">{t('whatsAppBatchHint')}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => queueRef.current?.next()}
              className="flex-1 rounded-lg bg-[#25D366] py-2 text-xs font-bold text-white"
            >
              {t('sendNextWhatsApp')}
            </button>
            <button
              type="button"
              onClick={() => queueRef.current?.skip()}
              className="rounded-lg border border-navy/20 px-3 py-2 text-xs font-semibold text-navy"
            >
              {t('skipWhatsApp')}
            </button>
            <button
              type="button"
              onClick={() => {
                queueRef.current?.stop()
                setQueueState(null)
              }}
              className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-semibold text-danger"
            >
              {t('stopWhatsAppQueue')}
            </button>
          </div>
        </div>
      )}

      {queueState?.done && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          {t('whatsAppBatchDone')}
        </p>
      )}

      {overdue.length === 0 && dueSoon.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-center text-sm text-navy/50">
          {t('noReminders')}
        </p>
      ) : (
        <>
          <Section title={t('overdue')} items={overdue} overdueFlag />
          <Section title={t('dueSoon')} items={dueSoon} overdueFlag={false} />
        </>
      )}
    </div>
  )
}
