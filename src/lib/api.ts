import { ApiError } from './errors'

export interface AuthUser {
  email: string
  role: 'admin' | 'viewer'
}

export interface BucketSummary {
  name: string
  creationDate: string | null
  firstLevelCount: number | null
}

export interface ObjectEntry {
  key: string
  size?: number
  lastModified?: string
}

export interface ObjectListing {
  folders: string[]
  files: ObjectEntry[]
  nextContinuationToken?: string
}

export interface ObjectHead {
  size?: number
  contentType?: string
  lastModified?: string
  etag?: string
  metadata?: Record<string, string>
}

export interface Tag {
  Key: string
  Value: string
}

export interface CorsRule {
  AllowedMethods: string[]
  AllowedOrigins: string[]
  AllowedHeaders?: string[]
  ExposeHeaders?: string[]
  MaxAgeSeconds?: number
}

export interface LifecycleRule {
  ID?: string
  Status: 'Enabled' | 'Disabled'
  Prefix?: string
  Expiration?: { Days?: number }
}

export interface BucketSettings {
  policy: string | null
  isPublic: boolean
  cors: CorsRule[]
  lifecycle: LifecycleRule[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function contentUrl(bucket: string, key: string, download = false): string {
  const qs = new URLSearchParams({ key })
  if (download) qs.set('download', 'true')
  return `/api/buckets/${encodeURIComponent(bucket)}/objects/content?${qs}`
}

export function uploadObject(
  bucket: string,
  key: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `/api/buckets/${encodeURIComponent(bucket)}/objects?key=${encodeURIComponent(key)}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new ApiError(xhr.status, xhr.responseText || xhr.statusText))
    }
    xhr.onerror = () => reject(new ApiError(0, 'network error'))
    xhr.send(file)
  })
}

export const api = {
  me: () => request<{ user: AuthUser }>('/me'),

  login: (username: string, password: string) =>
    request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  listBuckets: () => request<{ buckets: BucketSummary[] }>('/buckets'),
  createBucket: (name: string) =>
    request<{ name: string }>('/buckets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  deleteBucket: (name: string) =>
    request<void>(`/buckets/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  listObjects: (
    bucket: string,
    prefix: string,
    options?: { continuationToken?: string; flat?: boolean; maxKeys?: number },
  ) => {
    const qs = new URLSearchParams({ prefix })
    if (options?.continuationToken) qs.set('continuationToken', options.continuationToken)
    if (options?.flat) qs.set('delimiter', '')
    if (options?.maxKeys) qs.set('maxKeys', String(options.maxKeys))
    return request<ObjectListing>(`/buckets/${encodeURIComponent(bucket)}/objects?${qs}`)
  },
  headObject: (bucket: string, key: string) =>
    request<ObjectHead>(
      `/buckets/${encodeURIComponent(bucket)}/objects/head?key=${encodeURIComponent(key)}`,
    ),
  tagsObject: (bucket: string, key: string) =>
    request<{ tags: Tag[] }>(
      `/buckets/${encodeURIComponent(bucket)}/objects/tags?key=${encodeURIComponent(key)}`,
    ),
  deleteObjects: (bucket: string, keys: string[]) =>
    request<void>(`/buckets/${encodeURIComponent(bucket)}/objects`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    }),
  copyObjects: (bucket: string, keys: string[], destinationBucket: string) =>
    request<void>(`/buckets/${encodeURIComponent(bucket)}/objects/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys, destinationBucket }),
    }),

  downloadObjects: async (bucket: string, keys: string[]) => {
    const res = await fetch(`/api/buckets/${encodeURIComponent(bucket)}/objects/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (!res.ok) throw new ApiError(res.status, res.statusText)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bucket}-selection.tar.gz`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  getBucketSettings: (bucket: string) =>
    request<BucketSettings>(`/buckets/${encodeURIComponent(bucket)}/settings`),
  setBucketPublic: (bucket: string, isPublic: boolean) =>
    request<void>(`/buckets/${encodeURIComponent(bucket)}/settings/public`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public: isPublic }),
    }),
  setBucketPolicy: (bucket: string, policy: string) =>
    request<void>(`/buckets/${encodeURIComponent(bucket)}/settings/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy }),
    }),
  setBucketCors: (bucket: string, rules: CorsRule[]) =>
    request<void>(`/buckets/${encodeURIComponent(bucket)}/settings/cors`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    }),
  setBucketLifecycle: (bucket: string, rules: LifecycleRule[]) =>
    request<void>(`/buckets/${encodeURIComponent(bucket)}/settings/lifecycle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    }),
}
