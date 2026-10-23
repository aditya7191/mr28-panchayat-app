import { getLocalBill, getPendingBills, putLocalBill, setPendingBills } from '../db'
import { canPush, fetchBillFile, uploadBillFile } from '../sync'

const MAX_SIDE = 1280
const TARGET_BYTES = 300 * 1024

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image could not be read'))
    }
    img.src = url
  })
}

/** Resize to max 1280px and JPEG-compress until < ~300 KB. Returns a data: URL. */
export async function compressImage(file: File): Promise<string> {
  const img = await loadImage(file)
  let scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  let quality = 0.7
  let out = ''
  for (let i = 0; i < 8; i++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    out = c.toDataURL('image/jpeg', quality)
    // base64 → bytes ≈ length * 3/4
    if (out.length * 0.75 <= TARGET_BYTES) break
    if (quality > 0.45) quality -= 0.1
    else scale *= 0.8
  }
  return out
}

/** Save a new bill on this phone and queue it for upload. */
export async function addBill(id: string, dataUrl: string): Promise<void> {
  await putLocalBill(id, dataUrl)
  const pend = await getPendingBills()
  if (!pend.includes(id)) await setPendingBills([...pend, id])
}

/** Upload queued bills (admin phone with token). Returns how many are still pending. */
export async function uploadPendingBills(): Promise<number> {
  const pend = await getPendingBills()
  if (!pend.length || !canPush()) return pend.length
  const left: string[] = []
  for (const id of pend) {
    const data = await getLocalBill(id)
    if (!data) continue
    const ok = await uploadBillFile(id, data)
    if (!ok) left.push(id)
  }
  // Keep anything queued while we were uploading.
  const now = await getPendingBills()
  const next = now.filter((id) => left.includes(id) || !pend.includes(id))
  await setPendingBills(next)
  return next.length
}

const memCache = new Map<string, string>()

/** Get a bill image: memory → this phone → cloud (then cached on this phone). */
export async function getBill(id: string): Promise<string | null> {
  const m = memCache.get(id)
  if (m) return m
  const local = await getLocalBill(id).catch(() => undefined)
  if (local) {
    memCache.set(id, local)
    return local
  }
  const remote = await fetchBillFile(id)
  if (remote) {
    memCache.set(id, remote)
    await putLocalBill(id, remote).catch(() => undefined)
  }
  return remote
}
