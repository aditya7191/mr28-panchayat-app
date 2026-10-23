import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../hooks/useI18n'
import { getBill } from '../utils/bills'

export function BillThumb({ id, preview }: { id: string; preview?: string }) {
  const { t } = useI18n()
  const [src, setSrc] = useState<string | null>(preview ?? null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>(preview ? 'ok' : 'loading')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (preview) return
    let alive = true
    void getBill(id).then((d) => {
      if (!alive) return
      setSrc(d)
      setState(d ? 'ok' : 'missing')
    })
    return () => {
      alive = false
    }
  }, [id, preview])

  return (
    <>
      <button
        type="button"
        onClick={() => src && setOpen(true)}
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-navy/15 bg-cream text-center text-[9px] text-navy/50"
      >
        {src ? (
          <img src={src} alt="bill" className="h-full w-full object-cover" />
        ) : state === 'loading' ? (
          t('billLoading')
        ) : (
          t('billMissing')
        )}
      </button>
      <Modal open={open} title={t('expenseBills')} onClose={() => setOpen(false)}>
        <div className="overflow-auto p-2">
          {src && <img src={src} alt="bill" className="mx-auto max-h-[75dvh] w-auto" />}
        </div>
      </Modal>
    </>
  )
}
