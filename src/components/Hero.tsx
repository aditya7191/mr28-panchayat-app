import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'

/** Hero banner with the ORIGINAL logo (unaltered) and org name. */
export function Hero({ children }: { children?: React.ReactNode }) {
  const { lang } = useI18n()
  const { settings } = useStore()
  return (
    <section className="relative overflow-hidden rounded-3xl text-center text-white shadow-md royal-pattern">
      <div className="gold-rule" />
      <div className="px-5 pb-6 pt-5">
        <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-[#fffaf0] p-2 shadow-md ring-4 ring-saffron-light/70">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="MR28 Panchayat logo" className="h-full w-full object-contain" />
        </div>
        <h2 className="font-display text-2xl font-bold leading-tight gold-text">
          {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
        </h2>
        {lang === 'gu' && <p className="mt-0.5 text-sm font-semibold text-white/85">{settings.orgNameEn}</p>}
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-white/80">
          {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
        </p>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2 text-saffron-light">
          <span className="h-px w-10 bg-saffron-light/60" />
          <span className="text-sm font-bold">જય રોહિદાસ બાપુ</span>
          <span className="h-px w-10 bg-saffron-light/60" />
        </div>
        {children}
      </div>
      <div className="gold-rule" />
    </section>
  )
}
