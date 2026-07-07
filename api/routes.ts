import { Hono, type Context } from 'hono'
import sharp from 'sharp'
import { encryptPixels, decryptPixels } from '../src/confuse'
import { log } from '../src/logger'
import {
  processBatch,
  getProcessedImage,
  readManifest,
  getZipFile,
  saveZipFile,
  createZipFile,
  cleanupSession,
  extractZipBuffer,
} from '../src/batch'

async function processImageAction(
  c: Context,
  action: 'encrypt' | 'decrypt',
) {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image')

    if (!file || !(file instanceof File)) {
      return c.json({ error: '请上传图片文件' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(buffer).metadata()

    if (!metadata.width || !metadata.height) {
      return c.json({ error: '无法解析图片' }, 400)
    }

    const { width, height } = metadata
    const channels = 4

    const raw = await sharp(buffer).ensureAlpha().raw().toBuffer()

    const result =
      action === 'encrypt'
        ? encryptPixels({ data: new Uint8Array(raw), width, height, channels })
        : decryptPixels({ data: new Uint8Array(raw), width, height, channels })

    const output = await sharp(Buffer.from(result), {
      raw: { width, height, channels },
    })
      .jpeg({ quality: 95 })
      .toBuffer()

    await log('INFO', `${action} success: ${width}x${height} ${file.name}`)

    return c.body(new Uint8Array(output), 200, {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="${action}_${file.name}"`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `${action} failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
}

const api = new Hono()

api.post('/encrypt', (c) => processImageAction(c, 'encrypt'))
api.post('/decrypt', (c) => processImageAction(c, 'decrypt'))

api.post('/batch/encrypt', async (c) => {
  try {
    const formData = await c.req.formData()
    const fileEntries = formData.getAll('image')
    if (fileEntries.length === 0) return c.json({ error: '请上传至少一张图片' }, 400)

    const files: { name: string; buffer: Buffer }[] = []
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue
      files.push({ name: entry.name, buffer: Buffer.from(await entry.arrayBuffer()) })
    }

    const { sessionId, items } = await processBatch(files, 'encrypt')
    const zipFiles: { name: string; buffer: Buffer }[] = []
    for (const item of items) {
      if (item.error) continue
      const buf = await getProcessedImage(sessionId, item.id)
      if (buf) zipFiles.push({ name: item.processedName, buffer: buf })
    }
    const finalZip = await createZipFile(zipFiles)
    await saveZipFile(sessionId, finalZip)
    await log('INFO', `batch encrypt success: ${items.length} files`)

    return c.json({
      zipId: sessionId,
      items: items.map(i => ({ originalName: i.originalName, processedName: i.processedName, ...(i.error ? { error: i.error } : {}) })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch encrypt failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

api.post('/batch/decrypt', async (c) => {
  try {
    const formData = await c.req.formData()
    const fileEntries = formData.getAll('image')
    if (fileEntries.length === 0) return c.json({ error: '请上传至少一张图片' }, 400)

    const files: { name: string; buffer: Buffer }[] = []
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue
      files.push({ name: entry.name, buffer: Buffer.from(await entry.arrayBuffer()) })
    }

    const { sessionId, items } = await processBatch(files, 'decrypt')
    await log('INFO', `batch decrypt success: ${items.length} files`)

    return c.json({
      sessionId,
      items: items.map(i => ({ id: i.id, originalName: i.originalName, processedName: i.processedName, ...(i.error ? { error: i.error } : {}) })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch decrypt failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

api.post('/batch/decrypt-zip', async (c) => {
  try {
    const formData = await c.req.formData()
    const zipFile = formData.get('zip')

    if (!zipFile || !(zipFile instanceof File)) {
      return c.json({ error: '请上传 ZIP 文件' }, 400)
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    const extracted = await extractZipBuffer(zipBuffer)

    if (extracted.length === 0) {
      return c.json({ error: 'ZIP 中未找到图片文件' }, 400)
    }

    const files = extracted.map(f => ({ name: f.name, buffer: f.buffer }))
    const { sessionId, items } = await processBatch(files, 'decrypt')
    await log('INFO', `batch decrypt-zip success: ${items.length} files from ZIP`)

    return c.json({
      sessionId,
      items: items.map(i => ({
        id: i.id,
        originalName: i.originalName,
        processedName: i.processedName,
        ...(i.error ? { error: i.error } : {}),
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch decrypt-zip failed: ${msg}`)
    return c.json({ error: 'ZIP 文件处理失败: ' + msg }, 400)
  }
})

api.get('/batch/image/:id', async (c) => {
  const id = c.req.param('id')
  const sessionId = c.req.query('sessionId')
  if (!sessionId) return c.json({ error: '缺少 sessionId 参数' }, 400)
  const buffer = await getProcessedImage(sessionId, id)
  if (!buffer) return c.json({ error: '图片已过期或不存在' }, 404)
  return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'image/jpeg' })
})

api.post('/batch/download', async (c) => {
  try {
    const zipId = c.req.query('zipId')
    if (zipId) {
      const buffer = await getZipFile(zipId)
      if (!buffer) return c.json({ error: 'ZIP 已过期或不存在' }, 404)
      return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="encrypt_results.zip"' })
    }

    const body = await c.req.json()
    const { sessionId, ids } = body
    if (!sessionId || !ids || !Array.isArray(ids)) return c.json({ error: '缺少 sessionId 或 ids 参数' }, 400)

    const manifest = await readManifest(sessionId)
    if (!manifest) return c.json({ error: 'Session 已过期或不存在' }, 404)

    const files: { name: string; buffer: Buffer }[] = []
    for (const id of ids) {
      const entry = manifest.find(e => e.id === id)
      if (!entry || entry.error) continue
      const buf = await getProcessedImage(sessionId, id)
      if (buf) files.push({ name: entry.processedName, buffer: buf })
    }
    const zipBuffer = await createZipFile(files)
    return c.body(new Uint8Array(zipBuffer), 200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="decrypt_results.zip"' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

api.post('/batch/cleanup', async (c) => {
  try {
    const { sessionId } = await c.req.json()
    if (!sessionId) return c.json({ error: '缺少 sessionId' }, 400)
    await cleanupSession(sessionId)
    return c.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

export { api }
