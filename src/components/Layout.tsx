import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  Home,
  LogOut,
  Settings,
  Users,
  Wallet,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { isDueSoon, isOverdue } from '../utils/format'
import { Watermark } from './Watermark'

const nav = [
  { to: '/', icon: Home, label: 'navDashboard' as const, end: true },
  { to: '/members', icon: Users, label: 'navMembers' as const },
  { to: '/payments', icon: CreditCard, label: 'navPayments' as const },
  { to: '/expenses', icon: Wallet, label: 'navExpenses' as const },
  { to: '/education', icon: GraduationCap, label: 'navEducation' as const },
  { to: '/reminders', icon: Bell, label: 'navReminders' as const },
  { to: '/settings', icon: Settings, label: 'navSettings' as const },
]

export function Layout() {
  const { t, lang, toggle } = useI18n()
  const { members, settings, syncStatus } = useStore()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const reminderCount = members.filter(
    (m) => isOverdue(m) || isDueSoon(m),
  ).length

  function handleLogout() {
    logout()
    navigate('/gate', { replace: true })
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark />

      <header className="sticky top-0 z-30 text-white shadow-md no-print royal-pattern">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="MR28 Panchayat"
              className="h-11 w-11 shrink-0 rounded-full bg-[#fffaf0] object-contain p-0.5 ring-2 ring-saffron-light/70"
              height={44}
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold leading-tight text-saffron-light">
                {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
              </h1>
              <p className="truncate text-[11px] text-white/70">
                {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                syncStatus === 'error'
                  ? 'bg-danger/90 text-white'
                  : syncStatus === 'ok'
                    ? 'bg-success/90 text-white'
                    : syncStatus === 'readonly'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/15 text-white/80'
              }`}
              title={t('cloudSync')}
            >
              {syncStatus === 'pushing' || syncStatus === 'pulling'
                ? '…'
                : syncStatus === 'ok'
                  ? '☁'
                  : syncStatus === 'readonly'
                    ? '☁⌀'
                    : syncStatus === 'error'
                      ? '☁!'
                      : '☁'}
            </span>
            <span className="hidden rounded-full bg-saffron/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white xs:inline sm:inline">
              {t('adminMode')}
            </span>
            <button
              type="button"
              onClick={toggle}
              className="flex h-9 min-w-9 items-center justify-center rounded-full border border-saffron-light/50 bg-white/10 px-3 text-xs font-semibold"
              aria-label="Toggle language"
            >
              {lang === 'gu' ? 'EN' : 'ગુ'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-saffron-light/50 bg-white/10"
              aria-label={t('logout')}
              title={t('logout')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="gold-rule" />
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-saffron/30 bg-[#fffaf0]/95 shadow-[0_-6px_20px_rgba(74,18,32,0.10)] backdrop-blur no-print pb-safe">
        <div className="mx-auto flex max-w-lg justify-around">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold ${
                  isActive ? 'text-navy' : 'text-navy/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute top-0 h-[3px] w-8 rounded-b-full transition-all ${isActive ? 'bg-saffron' : 'bg-transparent'}`} />
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-navy text-saffron-light shadow-sm' : ''}`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <span className="max-w-full truncate px-0.5">{t(label)}</span>
              {to === '/reminders' && reminderCount > 0 && (
                <span className="absolute right-[calc(50%-18px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {reminderCount}
                </span>
              )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
