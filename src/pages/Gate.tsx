import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Eye } from 'lucide-react'
import { DeveloperCredit } from '../components/DeveloperCredit'
import { Watermark } from '../components/Watermark'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'

export function Gate() {
  const { t, lang, toggle } = useI18n()
  const { settings } = useStore()
  const { isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const openAdmin = Boolean(
    (location.state as { openAdmin?: boolean } | null)?.openAdmin,
  )
  const [showLogin, setShowLogin] = useState(openAdmin)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (login(password)) {
      setError('')
      setPassword('')
      navigate('/', { replace: true })
    } else {
      setError(t('wrongPassword'))
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark />

      <header className="relative z-30 border-b border-cream-dark bg-navy px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="MR28"
              className="h-14 w-auto shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight">
                {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
              </h1>
              <p className="mt-0.5 text-[11px] leading-snug text-white/70">
                {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold"
          >
            {lang === 'gu' ? 'EN' : 'ગુ'}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4">
        <p className="text-center text-sm font-semibold text-navy/70">
          {t('gateWelcome')}
        </p>
        <p className="text-center text-lg font-bold text-saffron-dark">
          જય રોહિદાસ બાપુ
        </p>
        <p className="text-center text-xs text-navy/50">Jay Rohidas Baapu</p>

        {!showLogin ? (
          <div className="mt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/public')}
              className="flex items-start gap-3 rounded-2xl border-2 border-navy/15 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
                <Eye size={22} />
              </span>
              <span>
                <span className="block text-sm font-bold text-navy">
                  {t('publicView')}
                </span>
                <span className="mt-0.5 block text-[11px] text-navy/55">
                  {t('publicViewHint')}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowLogin(true)
                setError('')
              }}
              className="flex items-start gap-3 rounded-2xl border-2 border-saffron/40 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron/15 text-saffron-dark">
                <Lock size={22} />
              </span>
              <span>
                <span className="block text-sm font-bold text-navy">
                  {t('adminLogin')}
                </span>
                <span className="mt-0.5 block text-[11px] text-navy/55">
                  {t('adminLoginHint')}
                </span>
              </span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="mt-2 rounded-2xl border border-navy/10 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-3 text-sm font-bold text-navy">{t('adminLogin')}</h2>
            <label className="mb-1 block text-xs font-semibold text-navy/70">
              {t('adminPassword')}
            </label>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-navy/20 bg-cream px-3 py-2.5 text-sm outline-none focus:border-saffron"
              placeholder="••••••••"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-danger">{error}</p>
            )}
            <p className="mt-2 text-[10px] text-navy/40">{t('adminPasswordHint')}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLogin(false)
                  setPassword('')
                  setError('')
                }}
                className="flex-1 rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-saffron py-2.5 text-sm font-bold text-white"
              >
                {t('login')}
              </button>
            </div>
          </form>
        )}

        <DeveloperCredit className="mt-auto pt-4 pb-2" />
      </main>
    </div>
  )
}
