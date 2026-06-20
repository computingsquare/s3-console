import { S3Client } from '@aws-sdk/client-s3'
import { config } from './config'

export const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
  // AWS SDK v3 opportunistically sends a checksum header on every supported
  // request by default. Some S3-compatible backends don't handle it well —
  // only send it when the API actually requires it (recommended default for
  // non-AWS endpoints).
  requestChecksumCalculation: 'WHEN_REQUIRED',
})
