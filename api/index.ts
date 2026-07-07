import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { api } from './routes'
import { renderPage } from '../src/ui'
import { log } from '../src/logger'
import { startCleanupTimer } from '../src/batch'

startCleanupTimer()

const app = new Hono()

app.use(logger())

app.route('/api', api)

app.get('/', (c) => {
  return c.html(renderPage())
})

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

app.onError((err, c) => {
  log('ERROR', `Unhandled: ${err.message}`)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export { app }

export default app.fetch
