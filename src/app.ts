import { Hono, type Context } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { api } from './routes'
import { api as galleryApi } from './server/gallery-routes'
import { renderPage } from './ui'
import { log } from './logger'
import { startCleanupTimer } from './batch'

startCleanupTimer()

const app = new Hono()

app.use(logger())
app.use('/api/*', cors())

app.route('/api', api)
app.route('/api/gallery', galleryApi)

app.get('/', (c: Context) => c.html(renderPage()))

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

app.onError((err, c) => {
  log('ERROR', `Unhandled: ${err.message}`)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export { app }

export default app
