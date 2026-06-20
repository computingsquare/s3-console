function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 4000),

  s3: {
    endpoint: required('S3_ENDPOINT'),
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    accessKeyId: required('S3_ACCESS_KEY_ID'),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
  },

  auth: {
    userHeader: (process.env.AUTH_USER_HEADER ?? 'X-Forwarded-Email').toLowerCase(),
    groupsHeader: (process.env.AUTH_GROUPS_HEADER ?? 'X-Forwarded-Groups').toLowerCase(),
    adminGroup: process.env.AUTH_ADMIN_GROUP ?? 's3-admin',
    // Optional defense-in-depth: if set, requests must also carry this header/value pair.
    sharedSecretHeader: process.env.AUTH_SHARED_SECRET_HEADER?.toLowerCase(),
    sharedSecretValue: process.env.AUTH_SHARED_SECRET_VALUE,
    // Dev/e2e convenience only: fills in a default identity when the user header is
    // absent. Never set this in production — it defeats the proxy trust model.
    devBypass: process.env.DEV_AUTH_HEADER_BYPASS === 'true',
  },

  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024 * 1024),
}
