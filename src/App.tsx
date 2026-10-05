import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Watermark } from './components/Watermark'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { I18nProvider } from './hooks/useI18n'
import { StoreProvider, useStore } from './hooks/useStore'
import { Dashboard } from './pages/Dashboard'
import { Gate } from './pages/Gate'
import { Members } from './pages/Members'
import { Payments } from './pages/Payments'
import { PublicHome } from './pages/PublicHome'
import { Reminders } from './pages/Reminders'
import { Settings } from './pages/Settings'
import { ReceiptPage } from './pages/ReceiptPage'
import type { ReactNode } from 'react'

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/gate" replace />
  return children
}

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
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/gate" element={<Gate />} />
            <Route path="/public" element={<PublicHome />} />
            <Route
              path="/receipt/:id"
              element={
                <RequireAdmin>
                  <ReceiptPage />
                </RequireAdmin>
              }
            />
            <Route
              element={
                <RequireAdmin>
                  <Layout />
                </RequireAdmin>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="payments" element={<Payments />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/gate" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
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
