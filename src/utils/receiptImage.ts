/**
 * Receipt PNG generation + sharing helpers.
 *
 * Why native Canvas instead of html2canvas:
 *   html2canvas 1.4.x cannot parse the modern CSS colors Tailwind v4 emits
 *   (`oklab()` / `color-mix()`), and throws
 *   "Attempting to parse an unsupported color function 'oklab'".
 *   That broke every receipt photo share. Drawing the receipt directly with
 *   the Canvas 2D API has no CSS parsing step, so it works the same on
 *   Android Chrome, iOS Safari and desktop.
 *
 * Why the PNG is generated *before* the tap:
 *   iOS Safari (and Chrome after ~5s) only allows navigator.share() inside a
 *   live user gesture. Awaiting image generation inside the click handler
 *   expires the gesture → NotAllowedError. So the page pre-renders the File,
 *   and click handlers call shareFiles() synchronously.
 */

export interface ReceiptImageRow {
  label: string
  value: string
  bold?: boolean
  highlight?: boolean
}

export interface ReceiptImageData {
  orgName: string
  orgSubtitle: string
  title: string
  rows: ReceiptImageRow[]
  thankYou: string
  footer?: string
  logoUrl?: string
}

const NAVY = '#1e3a5f'
const SAFFRON = '#e8850a'
const SAFFRON_DARK = '#c46e08'
const FONT_STACK =
  '"Noto Sans Gujarati", "Segoe UI", "Noto Sans", system-ui, -apple-system, sans-serif'

function font(weight: number, px: number) {
  return `${weight} ${px}px ${FONT_STACK}`
}

function loadImage(url: string, timeoutMs = 4000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const tmr = setTimeout(() => resolve(null), timeoutMs)
    img.onload = () => {
      clearTimeout(tmr)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(tmr)
      resolve(null)
    }
    img.src = url
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = []
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push('')
      continue
    }
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test
      } else {
        out.push(line)
        line = w
      }
    }
    if (line) out.push(line)
  }
  return out
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draw the receipt on a canvas and return it as a PNG File. */
export async function renderReceiptImage(
  data: ReceiptImageData,
  filename: string,
): Promise<File> {
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* ignore */
  }
  const logo = data.logoUrl ? await loadImage(data.logoUrl) : null

  const W = 1080
  const PAD = 72
  const inner = W - PAD * 2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // ---- Layout pass (measure) ----
  ctx.font = font(700, 40)
  const orgLines = wrapText(ctx, data.orgName, inner)
  ctx.font = font(400, 26)
  const subLines = wrapText(ctx, data.orgSubtitle, inner)

  type RowLayout = { row: ReceiptImageRow; valueLines: string[]; h: number }
  const labelW = Math.round(inner * 0.4)
  const valueW = inner - labelW - 24
  const rows: RowLayout[] = data.rows.map((row) => {
    const px = row.highlight ? 44 : 32
    ctx.font = font(row.bold ? 700 : 500, px)
    const valueLines = wrapText(ctx, row.value, valueW)
    const lineH = Math.round(px * 1.35)
    return { row, valueLines, h: Math.max(48, valueLines.length * lineH) + 28 }
  })

  let H = PAD
  H += 112 + 24 // badge
  H += orgLines.length * 54
  H += 8 + subLines.length * 36
  H += 20 + 44 // title
  H += 28 // saffron rule spacing
  H += 24
  H += rows.reduce((s, r) => s + r.h, 0)
  H += 56 + 44 // thank you
  if (data.footer) H += 44
  H += PAD

  canvas.width = W
  canvas.height = H

  // ---- Draw ----
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  // Card border
  ctx.strokeStyle = 'rgba(30,58,95,0.2)'
  ctx.lineWidth = 4
  roundRect(ctx, 14, 14, W - 28, H - 28, 36)
  ctx.stroke()

  // Watermark logo (original logo.png, unmodified, drawn at low opacity)
  if (logo && logo.naturalWidth > 0) {
    const lw = Math.min(W * 0.52, 420)
    const lh = (logo.naturalHeight / logo.naturalWidth) * lw
    ctx.save()
    ctx.globalAlpha = 0.11
    ctx.drawImage(logo, (W - lw) / 2, (H - lh) / 2 - 30, lw, lh)
    ctx.restore()
  }

  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  let y = PAD

  // "28" badge
  ctx.fillStyle = NAVY
  ctx.beginPath()
  ctx.arc(W / 2, y + 56, 56, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = SAFFRON
  ctx.font = font(700, 48)
  ctx.textBaseline = 'middle'
  ctx.fillText('28', W / 2, y + 58)
  ctx.textBaseline = 'top'
  y += 112 + 24

  ctx.fillStyle = NAVY
  ctx.font = font(700, 40)
  for (const l of orgLines) {
    ctx.fillText(l, W / 2, y)
    y += 54
  }
  y += 8
  ctx.fillStyle = 'rgba(30,58,95,0.65)'
  ctx.font = font(400, 26)
  for (const l of subLines) {
    ctx.fillText(l, W / 2, y)
    y += 36
  }
  y += 20
  ctx.fillStyle = SAFFRON_DARK
  ctx.font = font(700, 30)
  ctx.fillText(data.title.toUpperCase(), W / 2, y)
  y += 44 + 28 - 14
  ctx.fillStyle = SAFFRON
  ctx.fillRect(PAD, y, inner, 5)
  y += 14 + 24

  // Rows
  for (const r of rows) {
    const px = r.row.highlight ? 44 : 32
    const lineH = Math.round(px * 1.35)
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(30,58,95,0.55)'
    ctx.font = font(400, 26)
    ctx.fillText(r.row.label, PAD, y + 6)
    ctx.textAlign = 'right'
    ctx.fillStyle = r.row.highlight ? SAFFRON_DARK : NAVY
    ctx.font = font(r.row.bold ? 700 : 500, px)
    let vy = y
    for (const l of r.valueLines) {
      ctx.fillText(l, W - PAD, vy)
      vy += lineH
    }
    // dashed separator
    const sepY = y + r.h - 14
    ctx.save()
    ctx.strokeStyle = 'rgba(30,58,95,0.15)'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.moveTo(PAD, sepY)
    ctx.lineTo(W - PAD, sepY)
    ctx.stroke()
    ctx.restore()
    y += r.h
  }

  y += 56
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(30,58,95,0.8)'
  ctx.font = font(700, 30)
  ctx.fillText(data.thankYou, W / 2, y)
  y += 44
  if (data.footer) {
    ctx.fillStyle = 'rgba(30,58,95,0.45)'
    ctx.font = font(500, 22)
    ctx.fillText(data.footer, W / 2, y)
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create image'))),
      'image/png',
    )
  })
  return new File([blob], filename, { type: 'image/png' })
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}

/** Trigger a browser download of the file. Works on Android, desktop, iOS 13+. */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Revoking immediately breaks downloads on iOS Safari / Firefox
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 60_000)
}

/** True when Web Share Level 2 can send these files. */
export function canShareFiles(files: File[]): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files })
    )
  } catch {
    return false
  }
}

export type ShareResult =
  | 'shared'
  | 'cancelled'
  | 'unsupported'
  | 'blocked'
  | 'error'

/**
 * Share the receipt PNG via the native share sheet.
 * MUST be called synchronously from a click handler (no await before it),
 * otherwise iOS Safari rejects with NotAllowedError.
 *
 * On iOS we send the image alone: WhatsApp on iOS tends to drop the photo
 * when text is attached too, and the image already contains every detail.
 */
export function shareReceiptFile(
  file: File,
  caption: string,
  title: string,
): Promise<ShareResult> {
  if (!canShareFiles([file])) return Promise.resolve('unsupported')
  let data: ShareData = { files: [file] }
  if (!isIOS()) {
    const withText: ShareData = { files: [file], text: caption, title }
    try {
      if (navigator.canShare(withText)) data = withText
    } catch {
      /* keep files-only */
    }
  }
  let p: Promise<void>
  try {
    p = navigator.share(data)
  } catch (err) {
    return Promise.resolve(classifyShareError(err))
  }
  return p.then(
    () => 'shared' as const,
    (err) => classifyShareError(err),
  )
}

function classifyShareError(err: unknown): ShareResult {
  const name =
    err && typeof err === 'object' && 'name' in err
      ? String((err as { name: unknown }).name)
      : ''
  if (name === 'AbortError') return 'cancelled'
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked'
  if (name === 'TypeError' || name === 'DataError') return 'unsupported'
  return 'error'
}

export function canCopyImage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.ClipboardItem !== 'undefined' &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.write === 'function'
  )
}

/** Copy the PNG to the clipboard so it can be pasted into a WhatsApp chat. */
export async function copyImageToClipboard(file: Blob): Promise<boolean> {
  if (!canCopyImage()) return false
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': file }),
    ])
    return true
  } catch {
    return false
  }
}
