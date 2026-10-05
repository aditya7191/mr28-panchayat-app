import { NavLink, Outlet } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  Home,
  Settings,
  Users,
} from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import { isDueSoon, isOverdue } from '../utils/format'
import { Watermark } from './Watermark'

const nav = [
  { to: '/', icon: Home, label: 'navDashboard' as const, end: true },
  { to: '/members', icon: Users, label: 'navMembers' as const },
  { to: '/payments', icon: CreditCard, label: 'navPayments' as const },
  { to: '/reminders', icon: Bell, label: 'navReminders' as const },
  { to: '/settings', icon: Settings, label: 'navSettings' as const },
]

export function Layout() {
  const { t, lang, toggle } = useI18n()
  const { members, settings } = useStore()
  const reminderCount = members.filter(
    (m) => isOverdue(m) || isDueSoon(m),
  ).length

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark />

      <header className="sticky top-0 z-30 border-b border-cream-dark bg-navy text-white shadow-md no-print">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="MR28 Panchayat"
              className="h-11 w-auto shrink-0 object-contain"
              height={44}
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight">
                {lang === 'gu' ? settings.orgNameGu : settings.orgNameEn}
              </h1>
              <p className="truncate text-[11px] text-white/70">
                {lang === 'gu' ? settings.orgSubtitleGu : settings.orgSubtitleEn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold"
            aria-label="Toggle language"
          >
            {lang === 'gu' ? 'EN' : 'ગુ'}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-cream-dark bg-white/95 backdrop-blur no-print pb-safe">
        <div className="mx-auto flex max-w-lg justify-around">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? 'text-saffron' : 'text-navy/60'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              <span>{t(label)}</span>
              {to === '/reminders' && reminderCount > 0 && (
                <span className="absolute right-[calc(50%-18px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {reminderCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
