import { timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from './config'

export type Role = 'admin' | 'viewer'

export interface AuthUser {
  email: string
  role: Role
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function jwtUser(req: Request): AuthUser | null {
  const token = (req.cookies as Record<string, string> | undefined)?.session
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as { email: string; role: Role }
    if (!payload.email || !payload.role) return null
    return { email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

type Headers = Record<string, string | string[] | undefined>

function headerValue(headers: Headers, name: string): string | undefined {
  const value = headers[name]
  return Array.isArray(value) ? value[0] : value
}

export function deriveUser(headers: Headers): AuthUser | null {
  const email = headerValue(headers, config.auth.userHeader)
  if (!email) {
    if (config.auth.devBypass) {
      return { email: 'dev@local', role: 'admin' }
    }
    return null
  }

  const groups = (headerValue(headers, config.auth.groupsHeader) ?? '')
    .split(',')
    .map((g) => g.trim())

  return { email, role: groups.includes(config.auth.adminGroup) ? 'admin' : 'viewer' }
}

function sharedSecretOk(headers: Headers): boolean {
  const { sharedSecretHeader, sharedSecretValue } = config.auth
  if (!sharedSecretHeader || !sharedSecretValue) return true
  return headerValue(headers, sharedSecretHeader) === sharedSecretValue
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!sharedSecretOk(req.headers)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const user = deriveUser(req.headers) ?? jwtUser(req)
  if (!user) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  req.user = user
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  next()
}
