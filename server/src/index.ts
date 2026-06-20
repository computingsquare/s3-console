import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import { config } from './config'
import { requireAuth } from './auth'
import { bucketsRouter } from './routes/buckets'
import { objectsRouter } from './routes/objects'
import { bucketSettingsRouter } from './routes/bucketSettings'

const app = express()
app.use(helmet())
app.use(express.json())
app.use('/api', requireAuth)

app.get('/api/me', (req, res) => res.json({ user: req.user }))
app.use('/api/buckets/:name/objects', objectsRouter)
app.use('/api/buckets/:name/settings', bucketSettingsRouter)
app.use('/api/buckets', bucketsRouter)

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
