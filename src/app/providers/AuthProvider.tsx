import { useEffect, useState, type ReactNode } from 'react'
import { api, type AuthUser } from '../../lib/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthenticated, setUnauthenticated] = useState(false)

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUnauthenticated(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', loading, unauthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}
