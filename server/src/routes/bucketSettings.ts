import { Router } from 'express'
import {
  DeleteBucketCorsCommand,
  DeleteBucketLifecycleCommand,
  DeleteBucketPolicyCommand,
  GetBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketPolicyCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { s3 } from '../s3'
import { requireAdmin } from '../auth'

export const bucketSettingsRouter = Router({ mergeParams: true })

function isPublicPolicy(policy: string | null): boolean {
  if (!policy) return false
  try {
    const parsed = JSON.parse(policy)
    const statements = Array.isArray(parsed.Statement) ? parsed.Statement : [parsed.Statement]
    return statements.some((s: { Effect?: string; Principal?: unknown }) => {
      if (s?.Effect !== 'Allow') return false
      const principal = s.Principal
      if (principal === '*') return true
      if (typeof principal !== 'object' || principal === null) return false
      const aws = (principal as Record<string, unknown>).AWS
      return aws === '*' || (Array.isArray(aws) && aws.includes('*'))
    })
  } catch {
    return false
  }
}

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
  try {
    JSON.parse(policy)
  } catch {
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
