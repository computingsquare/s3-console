export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type ApiErrorCode = 'accessDenied' | 'notFound' | 'unauthenticated' | 'notImplemented' | 'network' | 'unknown'

export function classifyApiError(error: unknown): ApiErrorCode {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'accessDenied'
    if (error.status === 404) return 'notFound'
    if (error.status === 401) return 'unauthenticated'
    if (error.status === 501) return 'notImplemented'
    return 'unknown'
  }
  return 'network'
}
