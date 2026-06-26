import express, { Router, type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config'
import { requireAuth } from './auth'
import { authRouter } from './routes/auth'
import { bucketsRouter } from './routes/buckets'
import { objectsRouter } from './routes/objects'
import { bucketSettingsRouter } from './routes/bucketSettings'

const app = express()
app.use(helmet())
app.use(cookieParser())
app.use(express.json())
// Public: login / logout (no auth required)
app.use('/api/auth', authRouter)

// Protected: everything else under /api requires a valid session
const protectedApi = Router()
protectedApi.use(requireAuth)
protectedApi.get('/me', (req, res) => res.json({ user: req.user }))
protectedApi.use('/buckets/:name/objects', objectsRouter)
protectedApi.use('/buckets/:name/settings', bucketSettingsRouter)
protectedApi.use('/buckets', bucketsRouter)
app.use('/api', protectedApi)

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const name = err?.name ?? ''
  const status = err?.$metadata?.httpStatusCode
  if (name === 'NoSuchBucket' || name === 'NoSuchKey' || status === 404) {
    res.status(404).json({ error: 'not_found' })
  } else if (name === 'AccessDenied' || status === 403) {
    res.status(403).json({ error: 'access_denied' })
  } else if (name === 'NotImplemented' || status === 501) {
    res.status(501).json({ error: 'not_implemented' })
  } else {
    console.error(err)
    res.status(500).json({ error: 'internal_error' })
  }
}
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`s3-console backend listening on :${config.port}`)
})
