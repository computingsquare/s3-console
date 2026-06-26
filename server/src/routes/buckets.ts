import { Router } from 'express'
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  GetBucketPolicyCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { s3 } from '../s3'
import { requireAdmin } from '../auth'
import { isPublicPolicy } from '../policyUtils'

export const bucketsRouter = Router()

const BUCKET_NAME_RE = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/

bucketsRouter.get('/', async (_req, res) => {
  const { Buckets } = await s3.send(new ListBucketsCommand({}))
  const buckets = await Promise.all(
    (Buckets ?? []).map(async (bucket) => {
      const name = bucket.Name!
      const creationDate = bucket.CreationDate?.toISOString() ?? null
      const [listingResult, policyResult] = await Promise.allSettled([
        s3.send(new ListObjectsV2Command({ Bucket: name, Delimiter: '/', MaxKeys: 1000 })),
        s3.send(new GetBucketPolicyCommand({ Bucket: name })),
      ])
      const firstLevelCount =
        listingResult.status === 'fulfilled'
          ? (listingResult.value.CommonPrefixes?.length ?? 0) +
            (listingResult.value.Contents?.length ?? 0)
          : null
      const policy =
        policyResult.status === 'fulfilled' ? (policyResult.value.Policy ?? null) : null
      return { name, creationDate, firstLevelCount, isPublic: isPublicPolicy(policy) }
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
