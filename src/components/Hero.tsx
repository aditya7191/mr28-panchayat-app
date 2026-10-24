import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { BaapuPortrait } from './BaapuPortrait'

/** Hero banner with the ORIGINAL logo (unaltered) and org name. */
export function Hero({ children }: { children?: React.ReactNode }) {
  const { lang } = useI18n()
  const { settings } = useStore()
  return (
    <section className="relative overflow-hidden rounded-3xl text-center text-white shadow-md royal-pattern">
      <div className="gold-rule" />
      <div className="px-5 pb-6 pt-5">
        <div className="mb-3 flex items-end justify-center gap-5">
          <BaapuPortrait />
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#fffaf0] p-2 shadow-md ring-4 ring-[#e8b84a] gold-ring">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="MR28 Panchayat logo" className="h-full w-full object-contain" />
        </div>
        </div>
        <h2 className="font-display text-[1.7rem] font-extrabold leading-tight hero-title">
          {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
        </h2>
        {lang === 'gu' && <p className="mt-0.5 text-sm font-semibold text-white/85">{settings.orgNameEn}</p>}
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-white/80">
          {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
        </p>
        {children}
      </div>
      <div className="gold-rule" />
    </section>
  )
}
