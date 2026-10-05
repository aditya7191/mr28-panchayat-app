import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Watermark } from './components/Watermark'
import { I18nProvider } from './hooks/useI18n'
import { StoreProvider, useStore } from './hooks/useStore'
import { Dashboard } from './pages/Dashboard'
import { Members } from './pages/Members'
import { Payments } from './pages/Payments'
import { Reminders } from './pages/Reminders'
import { Settings } from './pages/Settings'
import { ReceiptPage } from './pages/ReceiptPage'

function AppRoutes() {
  const { settings, ready } = useStore()
  if (!ready) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-cream text-navy">
        <Watermark />
        <span className="relative z-10">Loading…</span>
      </div>
    )
  }

  return (
    <I18nProvider initial={settings.defaultLang}>
      <HashRouter>
        <Routes>
          <Route path="/receipt/:id" element={<ReceiptPage />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  )
}
