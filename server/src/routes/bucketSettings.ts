import { Router } from 'express'
import {
  DeleteBucketCorsCommand,
  DeleteBucketLifecycleCommand,
  DeleteBucketPolicyCommand,
  DeleteBucketTaggingCommand,
  GetBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketNotificationConfigurationCommand,
  GetBucketPolicyCommand,
  GetBucketTaggingCommand,
  GetBucketVersioningCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketNotificationConfigurationCommand,
  PutBucketPolicyCommand,
  PutBucketTaggingCommand,
  PutBucketVersioningCommand,
} from '@aws-sdk/client-s3'
import { s3 } from '../s3'
import { requireAdmin } from '../auth'
import { isPublicPolicy } from '../policyUtils'

export const bucketSettingsRouter = Router({ mergeParams: true })

function publicReadPolicy(bucket: string) {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  })
}

bucketSettingsRouter.get('/', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)

  const policy = await s3
    .send(new GetBucketPolicyCommand({ Bucket: bucket }))
    .then((r) => r.Policy ?? null)
    .catch(() => null)

  const cors = await s3
    .send(new GetBucketCorsCommand({ Bucket: bucket }))
    .then((r) => r.CORSRules ?? [])
    .catch(() => [])

  const lifecycle = await s3
    .send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }))
    .then((r) => r.Rules ?? [])
    .catch(() => [])

  res.json({ policy, isPublic: isPublicPolicy(policy), cors, lifecycle })
})

bucketSettingsRouter.put('/public', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const makePublic = req.body?.public === true
  if (makePublic) {
    await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: publicReadPolicy(bucket) }))
  } else {
    await s3.send(new DeleteBucketPolicyCommand({ Bucket: bucket })).catch(() => {})
  }
  res.status(204).end()
})

bucketSettingsRouter.put('/policy', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const policy = typeof req.body?.policy === 'string' ? req.body.policy.trim() : ''
  if (!policy) {
    await s3.send(new DeleteBucketPolicyCommand({ Bucket: bucket })).catch(() => {})
    res.status(204).end()
    return
  }
  try { JSON.parse(policy) } catch {
    res.status(400).json({ error: 'invalid_json' })
    return
  }
  await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }))
  res.status(204).end()
})

bucketSettingsRouter.put('/cors', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const rules = Array.isArray(req.body?.rules) ? req.body.rules : []
  if (rules.length === 0) {
    await s3.send(new DeleteBucketCorsCommand({ Bucket: bucket })).catch(() => {})
    res.status(204).end()
    return
  }
  await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }))
  res.status(204).end()
})

bucketSettingsRouter.put('/lifecycle', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const rules = Array.isArray(req.body?.rules) ? req.body.rules : []
  if (rules.length === 0) {
    await s3.send(new DeleteBucketLifecycleCommand({ Bucket: bucket })).catch(() => {})
    res.status(204).end()
    return
  }
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: { Rules: rules },
    }),
  )
  res.status(204).end()
})

// Versioning
bucketSettingsRouter.get('/versioning', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const result = await s3.send(new GetBucketVersioningCommand({ Bucket: bucket })).catch(() => null)
  const status = result?.Status ?? 'Off'
  res.json({ status })
})

bucketSettingsRouter.put('/versioning', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const enabled = req.body?.enabled === true
  await s3.send(
    new PutBucketVersioningCommand({
      Bucket: bucket,
      VersioningConfiguration: { Status: enabled ? 'Enabled' : 'Suspended' },
    }),
  )
  res.status(204).end()
})

// Bucket tags
bucketSettingsRouter.get('/tagging', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const tags = await s3
    .send(new GetBucketTaggingCommand({ Bucket: bucket }))
    .then((r) => r.TagSet ?? [])
    .catch(() => [])
  res.json({ tags })
})

bucketSettingsRouter.put('/tagging', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const tags: Array<{ Key: string; Value: string }> = Array.isArray(req.body?.tags) ? req.body.tags : []
  if (tags.length === 0) {
    await s3.send(new DeleteBucketTaggingCommand({ Bucket: bucket })).catch(() => {})
    res.status(204).end()
    return
  }
  await s3.send(new PutBucketTaggingCommand({ Bucket: bucket, Tagging: { TagSet: tags } }))
  res.status(204).end()
})

// Notifications (S3-compatible: SNS/SQS/Lambda)
bucketSettingsRouter.get('/notifications', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const result = await s3
    .send(new GetBucketNotificationConfigurationCommand({ Bucket: bucket }))
    .catch(() => null)
  if (!result) { res.json({ config: null }); return }
  res.json({
    config: {
      TopicConfigurations: result.TopicConfigurations ?? [],
      QueueConfigurations: result.QueueConfigurations ?? [],
      LambdaFunctionConfigurations: result.LambdaFunctionConfigurations ?? [],
    },
  })
})

bucketSettingsRouter.put('/notifications', requireAdmin, async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  const cfg = req.body?.config ?? {}
  await s3.send(
    new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: {
        TopicConfigurations: cfg.TopicConfigurations ?? [],
        QueueConfigurations: cfg.QueueConfigurations ?? [],
        LambdaFunctionConfigurations: cfg.LambdaFunctionConfigurations ?? [],
      },
    }),
  )
  res.status(204).end()
})

// Monitoring stats: object count + total size (capped at 50k objects for performance)
const STATS_MAX_KEYS = 50000
bucketSettingsRouter.get('/stats', async (req, res) => {
  const bucket = String((req.params as Record<string, string>).name)
  let objectCount = 0
  let totalSize = 0
  let continuationToken: string | undefined
  let truncated = false

  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    )
    for (const obj of result.Contents ?? []) {
      objectCount++
      totalSize += obj.Size ?? 0
    }
    continuationToken = result.NextContinuationToken
    if (objectCount >= STATS_MAX_KEYS && continuationToken) {
      truncated = true
      break
    }
  } while (continuationToken)

  res.json({ objectCount, totalSize, truncated })
})
