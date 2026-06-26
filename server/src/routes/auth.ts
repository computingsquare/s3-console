import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { safeCompare } from '../auth'
import { config } from '../config'

export const authRouter = Router()

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: 8 * 60 * 60 * 1000, // 8h
}

authRouter.post('/login', (req, res) => {
  if (!config.auth.localUsername || !config.auth.localPassword) {
    res.status(501).json({ error: 'local_auth_disabled' })
    return
  }
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string }
  if (
    !username ||
    !password ||
    !safeCompare(username, config.auth.localUsername) ||
    !safeCompare(password, config.auth.localPassword)
  ) {
    res.status(401).json({ error: 'invalid_credentials' })
    return
  }
  const token = jwt.sign(
    { email: username, role: 'admin' },
    config.auth.jwtSecret,
    { expiresIn: '8h' },
  )
  res.cookie('session', token, COOKIE_OPTIONS)
  res.json({ user: { email: username, role: 'admin' as const } })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('session', { httpOnly: true, sameSite: 'strict' })
  res.status(204).end()
})
