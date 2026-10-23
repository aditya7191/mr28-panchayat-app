import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useStore } from './useStore'
import { checkAdminPassword } from '../utils/password'
import { clearSessionKey, deriveEduKey, loadSessionKey, saveSessionKey } from '../utils/eduCrypto'

const AUTH_KEY = 'mr28-admin-authed'

interface AuthCtx {
  isAdmin: boolean
  login: (password: string) => boolean
  logout: () => void
  /** AES key for private education fields (derived from the password typed at login). */
  eduKey: CryptoKey | null
  /** Re-derive the education key from another password (e.g. data encrypted before a password change). */
  unlockEdu: (password: string) => Promise<CryptoKey>
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
  const { settings, setPrivateKey } = useStore()
  const [isAdmin, setIsAdmin] = useState(readAuthed)
  const [eduKey, setEduKey] = useState<CryptoKey | null>(null)

  useEffect(() => {
    if (isAdmin && !eduKey) void loadSessionKey().then((k) => k && setEduKey(k))
  }, [isAdmin, eduKey])

  useEffect(() => {
    setPrivateKey(isAdmin ? eduKey : null)
  }, [isAdmin, eduKey, setPrivateKey])

  const unlockEdu = useCallback(async (password: string) => {
    const k = await deriveEduKey(password)
    await saveSessionKey(k)
    setEduKey(k)
    return k
  }, [])

  const login = useCallback(
    (password: string) => {
      if (checkAdminPassword(password, settings.adminPassword)) {
        try {
          sessionStorage.setItem(AUTH_KEY, '1')
        } catch {
          /* ignore */
        }
        setIsAdmin(true)
        void unlockEdu(password)
        return true
      }
      return false
    },
    [settings.adminPassword, unlockEdu],
  )

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(AUTH_KEY)
    } catch {
      /* ignore */
    }
    clearSessionKey()
    setEduKey(null)
    setIsAdmin(false)
  }, [])

  const value = useMemo(
    () => ({ isAdmin, login, logout, eduKey, unlockEdu }),
    [isAdmin, login, logout, eduKey, unlockEdu],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
