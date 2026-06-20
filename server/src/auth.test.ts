import { describe, expect, it, vi } from 'vitest'
import { deriveUser, requireAdmin, requireAuth } from './auth'

vi.mock('./config', () => ({
  config: {
    auth: {
      userHeader: 'x-forwarded-email',
      groupsHeader: 'x-forwarded-groups',
      adminGroup: 's3-admin',
      sharedSecretHeader: undefined,
      sharedSecretValue: undefined,
      devBypass: false,
    },
  },
}))

describe('deriveUser', () => {
  it('returns null when no identity header', () => {
    expect(deriveUser({})).toBeNull()
  })

  it('derives viewer role when no admin group present', () => {
    expect(
      deriveUser({ 'x-forwarded-email': 'a@b.com', 'x-forwarded-groups': 'users' }),
    ).toEqual({ email: 'a@b.com', role: 'viewer' })
  })

  it('derives admin role when admin group present', () => {
    expect(
      deriveUser({ 'x-forwarded-email': 'a@b.com', 'x-forwarded-groups': 'users,s3-admin' }),
    ).toEqual({ email: 'a@b.com', role: 'admin' })
  })

  it('handles array-valued headers (takes first value)', () => {
    expect(deriveUser({ 'x-forwarded-email': ['a@b.com', 'c@d.com'] })).toEqual({
      email: 'a@b.com',
      role: 'viewer',
    })
  })

  it('treats missing groups header as viewer', () => {
    expect(deriveUser({ 'x-forwarded-email': 'a@b.com' })).toEqual({
      email: 'a@b.com',
      role: 'viewer',
    })
  })
})

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any
}

describe('requireAuth', () => {
  it('401s when no identity header', () => {
    const req = { headers: {} } as any
    const res = mockRes()
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('sets req.user and calls next when header present', () => {
    const req = { headers: { 'x-forwarded-email': 'a@b.com' } } as any
    const res = mockRes()
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(req.user).toEqual({ email: 'a@b.com', role: 'viewer' })
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('requireAdmin', () => {
  it('403s for viewer', () => {
    const req = { user: { email: 'a@b.com', role: 'viewer' } } as any
    const res = mockRes()
    const next = vi.fn()
    requireAdmin(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next for admin', () => {
    const req = { user: { email: 'a@b.com', role: 'admin' } } as any
    const res = mockRes()
    const next = vi.fn()
    requireAdmin(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})
