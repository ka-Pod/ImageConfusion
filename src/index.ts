import { app } from '../api/index'
import { log } from './logger'

const port = parseInt(process.env.PORT || '3000', 10)

Bun.serve({ port, fetch: app.fetch })
log('INFO', `Server starting on http://localhost:${port}`)

export { app }

export default app.fetch
