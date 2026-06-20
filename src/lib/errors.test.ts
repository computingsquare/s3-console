import { describe, expect, it } from 'vitest'
import { ApiError, classifyApiError } from './errors'

describe('classifyApiError', () => {
  it('classifies access denied', () => {
    expect(classifyApiError(new ApiError(403, 'forbidden'))).toBe('accessDenied')
  })

  it('classifies not found', () => {
    expect(classifyApiError(new ApiError(404, 'not_found'))).toBe('notFound')
  })

  it('classifies unauthenticated', () => {
    expect(classifyApiError(new ApiError(401, 'unauthorized'))).toBe('unauthenticated')
  })

  it('classifies other api errors as unknown', () => {
    expect(classifyApiError(new ApiError(500, 'internal_error'))).toBe('unknown')
  })

  it('classifies non-ApiError as network error', () => {
    expect(classifyApiError(new TypeError('Failed to fetch'))).toBe('network')
    expect(classifyApiError(null)).toBe('network')
  })
})
