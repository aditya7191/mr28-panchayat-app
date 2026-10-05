import html2canvas from 'html2canvas'

/** Capture a receipt DOM node as a PNG File (includes on-card logo watermark). */
export async function captureReceiptImage(
  el: HTMLElement,
  filename: string,
): Promise<File> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create image'))),
      'image/png',
      0.95,
    )
  })
  return new File([blob], filename, { type: 'image/png' })
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

/** True when Web Share can send files (Android Chrome → WhatsApp often works). */
export function canShareFiles(files: File[]): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.share &&
      !!navigator.canShare &&
      navigator.canShare({ files })
    )
  } catch {
    return false
  }
}

export async function shareReceiptFile(
  file: File,
  caption: string,
  title: string,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canShareFiles([file])) return 'unsupported'
  try {
    await navigator.share({ files: [file], text: caption, title })
    return 'shared'
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'AbortError') return 'cancelled'
    return 'unsupported'
  }
}
