import { createContext } from 'react'
import type { AuthUser } from '../../lib/api'

export interface AuthContextValue {
  user: AuthUser | null
  isAdmin: boolean
  loading: boolean
  unauthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
