import { Router } from 'express'
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { s3 } from '../s3'
import { requireAdmin } from '../auth'

export const bucketsRouter = Router()

const BUCKET_NAME_RE = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/

bucketsRouter.get('/', async (_req, res) => {
  const { Buckets } = await s3.send(new ListBucketsCommand({}))
  const buckets = await Promise.all(
    (Buckets ?? []).map(async (bucket) => {
      const name = bucket.Name!
      try {
        const listing = await s3.send(
          new ListObjectsV2Command({ Bucket: name, Delimiter: '/', MaxKeys: 1000 }),
        )
        const firstLevelCount = (listing.CommonPrefixes?.length ?? 0) + (listing.Contents?.length ?? 0)
        return { name, firstLevelCount }
      } catch {
        return { name, firstLevelCount: null }
      }
    }),
  )
  res.json({ buckets })
})

bucketsRouter.post('/', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '')
  if (!BUCKET_NAME_RE.test(name)) {
    res.status(400).json({ error: 'invalid_bucket_name' })
    return
  }
  await s3.send(new CreateBucketCommand({ Bucket: name }))
  res.status(201).json({ name })
})

bucketsRouter.delete('/:name', requireAdmin, async (req, res) => {
  await s3.send(new DeleteBucketCommand({ Bucket: String(req.params.name) }))
  res.status(204).end()
})
