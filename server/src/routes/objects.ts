import { Router } from 'express'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  GetObjectLegalHoldCommand,
  GetObjectRetentionCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  PutObjectTaggingCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { Readable } from 'node:stream'
import { TarArchive } from 'archiver'
import { s3 } from '../s3'
import { requireAdmin } from '../auth'
import { config } from '../config'

export const objectsRouter = Router({ mergeParams: true })

objectsRouter.get('/', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const prefix = String(req.query.prefix ?? '')
  const continuationToken = req.query.continuationToken
    ? String(req.query.continuationToken)
    : undefined
  const delimiter = req.query.delimiter === undefined ? '/' : String(req.query.delimiter) || undefined
  const maxKeys = req.query.maxKeys ? Number(req.query.maxKeys) : undefined

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: delimiter,
      ContinuationToken: continuationToken,
      MaxKeys: maxKeys,
    }),
  )

  res.json({
    folders: (result.CommonPrefixes ?? []).map((p) => p.Prefix!).filter(Boolean),
    files: (result.Contents ?? [])
      .filter((o) => o.Key !== prefix)
      .map((o) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified, storageClass: o.StorageClass })),
    nextContinuationToken: result.NextContinuationToken,
  })
})

objectsRouter.get('/head', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const key = String(req.query.key ?? '')
  const [headResult, legalHoldResult, retentionResult] = await Promise.allSettled([
    s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
    s3.send(new GetObjectLegalHoldCommand({ Bucket: bucket, Key: key })),
    s3.send(new GetObjectRetentionCommand({ Bucket: bucket, Key: key })),
  ])
  if (headResult.status === 'rejected') throw headResult.reason
  const h = headResult.value
  res.json({
    size: h.ContentLength,
    contentType: h.ContentType,
    lastModified: h.LastModified,
    etag: h.ETag,
    metadata: h.Metadata,
    storageClass: h.StorageClass ?? 'STANDARD',
    versionId: h.VersionId ?? null,
    legalHold: legalHoldResult.status === 'fulfilled'
      ? (legalHoldResult.value.LegalHold?.Status ?? null)
      : null,
    retentionMode: retentionResult.status === 'fulfilled'
      ? (retentionResult.value.Retention?.Mode ?? null)
      : null,
    retainUntilDate: retentionResult.status === 'fulfilled'
      ? (retentionResult.value.Retention?.RetainUntilDate?.toISOString() ?? null)
      : null,
  })
})

objectsRouter.get('/tags', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const key = String(req.query.key ?? '')
  const result = await s3.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }))
  res.json({ tags: result.TagSet ?? [] })
})

objectsRouter.put('/tags', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const key = String(req.query.key ?? '')
  const tags: Array<{ Key: string; Value: string }> = Array.isArray(req.body?.tags) ? req.body.tags : []
  await s3.send(new PutObjectTaggingCommand({ Bucket: bucket, Key: key, Tagging: { TagSet: tags } }))
  res.status(204).end()
})

objectsRouter.get('/content', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const key = String(req.query.key ?? '')
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  res.setHeader('Content-Type', result.ContentType ?? 'application/octet-stream')
  if (result.ContentLength) res.setHeader('Content-Length', String(result.ContentLength))
  const disposition = req.query.download === 'true' ? 'attachment' : 'inline'
  const filename = key.split('/').pop() ?? 'download'
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`)
  ;(result.Body as Readable).pipe(res)
})

objectsRouter.put('/', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const key = String(req.query.key ?? '')
  const contentLength = Number(req.headers['content-length'] ?? 0)
  if (contentLength > config.maxUploadBytes) {
    res.status(413).json({ error: 'payload_too_large' })
    return
  }

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: req,
      ContentType: String(req.headers['content-type'] || 'application/octet-stream'),
    },
  })
  await upload.done()
  res.status(201).json({ key })
})

// Create a virtual folder by uploading a zero-byte object (folder marker)
objectsRouter.post('/mkdir', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const prefix = String(req.body?.prefix ?? '')
  if (!prefix || !prefix.endsWith('/')) {
    res.status(400).json({ error: 'prefix must end with /' })
    return
  }
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: prefix, Body: '' }))
  res.status(201).json({ key: prefix })
})

objectsRouter.post('/download', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const keys: string[] = Array.isArray(req.body?.keys) ? req.body.keys : []
  if (keys.length === 0) {
    res.status(400).json({ error: 'no_keys' })
    return
  }
  const filename = `${bucket}-selection.tar.gz`
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  const archive = new TarArchive({ gzip: true })
  archive.on('error', (err: unknown) => { console.error('archive error', err); res.destroy() })
  archive.pipe(res)
  for (const key of keys) {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    archive.append(result.Body as Readable, { name: key })
  }
  await archive.finalize()
})

objectsRouter.post('/copy', requireAdmin, async (req, res) => {
  const sourceBucket = String((req.params as Record<string, string>).name)
  const keys: string[] = Array.isArray(req.body?.keys) ? req.body.keys : []
  const destinationBucket = String(req.body?.destinationBucket ?? '')
  if (keys.length === 0 || !destinationBucket) {
    res.status(400).json({ error: 'invalid_request' })
    return
  }
  // ponytail: sequential copy, fine for the small selections this UI allows
  for (const key of keys) {
    const copySource = `${sourceBucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`
    await s3.send(new CopyObjectCommand({ Bucket: destinationBucket, CopySource: copySource, Key: key }))
  }
  res.status(204).end()
})

objectsRouter.delete('/', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const keys: string[] = Array.isArray(req.body?.keys) ? req.body.keys : []
  if (keys.length === 0) {
    res.status(400).json({ error: 'no_keys' })
    return
  }
  if (keys.length === 1) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: keys[0] }))
  } else {
    await s3.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }),
    )
  }
  res.status(204).end()
})
