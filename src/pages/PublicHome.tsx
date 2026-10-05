import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Watermark } from '../components/Watermark'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'

export function PublicHome() {
  const { t, lang, toggle } = useI18n()
  const { settings } = useStore()

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark />

      <header className="relative z-30 flex items-center gap-2 border-b border-cream-dark bg-navy px-3 py-3 text-white">
        <Link to="/gate" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">{t('publicView')}</h1>
          <p className="truncate text-[10px] text-white/60">{t('publicMode')}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold"
        >
          {lang === 'gu' ? 'EN' : 'ગુ'}
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-2xl border border-navy/10 bg-white p-4 text-center shadow-sm">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            className="mx-auto mb-3 h-20 w-auto object-contain opacity-90"
          />
          <h2 className="text-base font-bold text-navy">
            {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
          </h2>
          <p className="mt-1 text-xs leading-snug text-navy/60">
            {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
          </p>
          <p className="mt-3 text-sm font-bold text-saffron-dark">
            જય રોહિદાસ બાપુ
          </p>
          <p className="text-[11px] text-navy/45">Jay Rohidas Baapu</p>
        </div>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-navy">{t('publicFees')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-cream p-3 text-center">
              <p className="text-[10px] font-semibold text-navy/50">
                {t('monthly')}
              </p>
              <p className="mt-1 text-xl font-bold text-navy">
                ₹{settings.monthlyFee}
              </p>
            </div>
            <div className="rounded-xl bg-cream p-3 text-center">
              <p className="text-[10px] font-semibold text-navy/50">
                {t('yearly')}
              </p>
              <p className="mt-1 text-xl font-bold text-navy">
                ₹{settings.yearlyFee}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-navy">{t('publicContact')}</h3>
          {settings.upiId ? (
            <p className="text-sm text-navy">
              <span className="text-xs font-semibold text-navy/50">UPI: </span>
              {settings.upiId}
            </p>
          ) : (
            <p className="text-xs text-navy/50">{t('publicNoUpi')}</p>
          )}
          {settings.bankDetails && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy">
              {settings.bankDetails}
            </p>
          )}
        </section>

        <Link
          to="/gate"
          className="mt-auto rounded-xl border border-navy/20 bg-white py-3 text-center text-sm font-semibold text-navy"
        >
          {t('backToGate')}
        </Link>
        <Link
          to="/gate"
          state={{ openAdmin: true }}
          className="rounded-xl bg-saffron py-3 text-center text-sm font-bold text-white"
        >
          {t('adminLogin')}
        </Link>
      </main>
    </div>
  )
}
