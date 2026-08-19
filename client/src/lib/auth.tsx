import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, getTokens, setTokens } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  role: string
}

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      if (!getTokens()) {
        setLoading(false)
        return
      }
      try {
        const me = await apiFetch<AuthUser>('/api/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      login: async (email, password) => {
        const result = await apiFetch<LoginResult>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
          auth: false,
        })
        setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
        setUser(result.user)
      },
      logout: async () => {
        const tokens = getTokens()
        try {
          if (tokens) {
            await apiFetch<void>('/api/auth/logout', {
              method: 'POST',
              body: { refreshToken: tokens.refreshToken },
            })
          }
        } finally {
          setTokens(null)
          setUser(null)
        }
      },
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}