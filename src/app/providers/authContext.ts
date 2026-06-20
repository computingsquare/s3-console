import { createContext } from 'react'
import type { AuthUser } from '../../lib/api'

export interface AuthContextValue {
  user: AuthUser | null
  isAdmin: boolean
  loading: boolean
  unauthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
