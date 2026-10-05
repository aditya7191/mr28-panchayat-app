/**
 * Phone-native WhatsApp helpers via https://wa.me/<digits>?text=
 * True unattended sending needs WhatsApp Business API (Meta) — not configured here.
 */

export function normalizePhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  // Strip leading 0 from Indian local format
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  // 10-digit Indian mobile → prepend country code 91
  if (digits.length === 10) {
    return `91${digits}`
  }
  // Already has country code (e.g. 91XXXXXXXXXX)
  return digits
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = normalizePhoneForWhatsApp(phone)
  const q = encodeURIComponent(text)
  return digits ? `https://wa.me/${digits}?text=${q}` : `https://wa.me/?text=${q}`
}

/**
 * Open WhatsApp chat with prefilled message (works without a phone: the user
 * picks the chat). Call from a click handler. If the popup is blocked we
 * can navigate the current tab instead (opts.sameTabFallback), so it never
 * silently does nothing. Batch queue keeps the old behaviour (no fallback).
 * Returns true if WhatsApp was opened (or navigation started).
 */
export function openWhatsApp(
  phone: string,
  text: string,
  opts?: { sameTabFallback?: boolean },
): boolean {
  const url = buildWhatsAppUrl(phone, text)
  let w: Window | null = null
  try {
    // No 'noopener' feature: with it window.open() always returns null and we
    // could not detect a blocked popup.
    w = window.open(url, '_blank')
  } catch {
    w = null
  }
  if (w) {
    try {
      w.opener = null
    } catch {
      /* ignore */
    }
    return true
  }
  if (!opts?.sameTabFallback) return false
  try {
    window.location.href = url
    return true
  } catch {
    return false
  }
}

export type WhatsAppQueueItem = {
  id: string
  name: string
  phone: string
  text: string
}

/**
 * Sequential WhatsApp opener for batch reminders.
 * Opens one at a time; call next() from a user gesture or after delay+focus.
 */
export class WhatsAppSendQueue {
  private items: WhatsAppQueueItem[]
  private index = 0
  private delayMs: number
  private autoAdvance: boolean
  private focusHandler: (() => void) | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  onChange: ((state: {
    current: number
    total: number
    item: WhatsAppQueueItem | null
    done: boolean
  }) => void) | null = null

  constructor(
    items: WhatsAppQueueItem[],
    opts?: { delayMs?: number; autoAdvance?: boolean },
  ) {
    this.items = items.filter((i) => normalizePhoneForWhatsApp(i.phone))
    this.delayMs = opts?.delayMs ?? 2000
    this.autoAdvance = opts?.autoAdvance ?? true
  }

  get total() {
    return this.items.length
  }

  get current() {
    return this.index
  }

  get remaining() {
    return Math.max(0, this.items.length - this.index)
  }

  get done() {
    return this.index >= this.items.length
  }

  get currentItem(): WhatsAppQueueItem | null {
    return this.items[this.index] ?? null
  }

  private emit() {
    // current = how many already opened; item = next pending (or null if done)
    this.onChange?.({
      current: this.index,
      total: this.items.length,
      item: this.currentItem,
      done: this.done,
    })
  }

  /** Open the current item's WhatsApp, then advance the index. */
  openCurrent(): boolean {
    const item = this.currentItem
    if (!item) {
      this.emit()
      return false
    }
    openWhatsApp(item.phone, item.text)
    this.index += 1
    this.emit()
    if (!this.done && this.autoAdvance) {
      this.armAutoNext()
    } else {
      this.disarm()
    }
    return true
  }

  /** Start the queue: open first immediately. */
  start(): boolean {
    if (this.items.length === 0) {
      this.emit()
      return false
    }
    return this.openCurrent()
  }

  /** Manually open the next one (user gesture). */
  next(): boolean {
    this.disarm()
    if (this.done) return false
    return this.openCurrent()
  }

  skip(): void {
    this.disarm()
    if (!this.done) {
      this.index += 1
      this.emit()
      if (!this.done && this.autoAdvance) this.armAutoNext()
    }
  }

  stop(): void {
    this.disarm()
    this.index = this.items.length
    this.emit()
  }

  private armAutoNext() {
    this.disarm()
    this.focusHandler = () => {
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        if (!this.done) this.openCurrent()
      }, this.delayMs)
    }
    window.addEventListener('focus', this.focusHandler)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && this.focusHandler) {
      this.focusHandler()
    }
  }

  private disarm() {
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler)
      this.focusHandler = null
    }
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
