import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useStore } from './useStore'

const AUTH_KEY = 'mr28-admin-authed'

interface AuthCtx {
  isAdmin: boolean
  login: (password: string) => boolean
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

function readAuthed(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === '1'
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useStore()
  const [isAdmin, setIsAdmin] = useState(readAuthed)

  const login = useCallback(
    (password: string) => {
      const expected = settings.adminPassword || 'aditya@1989'
      if (password === expected) {
        try {
          sessionStorage.setItem(AUTH_KEY, '1')
        } catch {
          /* ignore */
        }
        setIsAdmin(true)
        return true
      }
      return false
    },
    [settings.adminPassword],
  )

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(AUTH_KEY)
    } catch {
      /* ignore */
    }
    setIsAdmin(false)
  }, [])

  const value = useMemo(
    () => ({ isAdmin, login, logout }),
    [isAdmin, login, logout],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
