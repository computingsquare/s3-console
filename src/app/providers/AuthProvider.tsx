import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, type AuthUser } from '../../lib/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthenticated, setUnauthenticated] = useState(false)

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUser(res.user)
        setUnauthenticated(false)
      })
      .catch(() => setUnauthenticated(true))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    setUser(res.user)
    setUnauthenticated(false)
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
    setUnauthenticated(true)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', loading, unauthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
