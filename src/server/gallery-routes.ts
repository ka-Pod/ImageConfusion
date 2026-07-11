import { Hono, type Context } from 'hono'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import sharp from 'sharp'
import * as storage from './gallery-storage'
import { createZipFile, extractZipAll, extractZipBuffer } from '../batch'
import { encryptPixels, decryptPixels } from '../confuse'
import { log } from '../logger'

const api = new Hono()

api.post('/create', async (c: Context) => {
  try {
    const formData = await c.req.formData()
    const zipFile = formData.get('zip')
    const name = (formData.get('name') as string) || ''
    const author = (formData.get('author') as string) || ''
    const source = (formData.get('source') as string) || ''

    if (!(zipFile instanceof File)) {
      return c.json({ error: '请上传 ZIP 文件' }, 400)
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    const extracted = await extractZipAll(zipBuffer)

    const metaFile = extracted.find(f => f.name === 'metadata.json')
    if (metaFile) {
      const existingMeta: storage.ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
      const imageFiles = extracted.filter(f => f.name.startsWith('page_') && /\.(jpg|png)$/i.test(f.name))
      const id = await storage.saveComic(zipBuffer, existingMeta)
      await log('INFO', `gallery import: ${existingMeta.name} (${id})`)
      return c.json({ id, name: existingMeta.name, totalPages: imageFiles.length })
    }

    if (!name.trim()) {
      return c.json({ error: '请输入漫画名称' }, 400)
    }

    const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i
    const imageFiles = extracted
      .filter(f => IMAGE_EXTENSIONS.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (imageFiles.length === 0) {
      return c.json({ error: 'ZIP 内未找到图片' }, 400)
    }

    const pageFiles = imageFiles.map((f, i) => ({
      name: `page_${String(i + 1).padStart(3, '0')}.png`,
      buffer: f.buffer,
    }))

    const meta: storage.ComicMeta = {
      name,
      author,
      source,
      createdAt: new Date().toISOString(),
      coverIndex: 0,
    }

    const newZipBuffer = await createZipFile([
      { name: 'metadata.json', buffer: Buffer.from(JSON.stringify(meta, null, 2)) },
      ...pageFiles,
    ])

    const id = await storage.saveComic(newZipBuffer, meta)
    await log('INFO', `gallery create: ${name} (${id})`)
    return c.json({ id, name, totalPages: pageFiles.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `gallery create failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

api.post('/save-from-batch', async (c: Context) => {
  try {
    const contentType = c.req.header('content-type') || ''
    let name = ''
    let author = ''
    let source = ''
    let zipBuffer: Buffer | null = null

    if (contentType.includes('json')) {
      const body = await c.req.json() as Record<string, unknown>
      name = (body.name as string) || ''
      author = (body.author as string) || ''
      source = (body.source as string) || ''
      if (body.zipBuffer) {
        zipBuffer = Buffer.from(body.zipBuffer as string, 'base64')
      }
    } else {
      const formData = await c.req.formData()
      name = (formData.get('name') as string) || ''
      author = (formData.get('author') as string) || ''
      source = (formData.get('source') as string) || ''
      const zipFile = formData.get('zip')
      if (zipFile instanceof File) {
        zipBuffer = Buffer.from(await zipFile.arrayBuffer())
      }
    }

    if (!name) return c.json({ error: '请输入漫画名称' }, 400)
    if (!zipBuffer) return c.json({ error: '缺少 ZIP 数据' }, 400)

    const extracted = await extractZipBuffer(zipBuffer)
    const images = extracted.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name))

    const meta = { name, author, source, createdAt: new Date().toISOString(), coverIndex: 0 }
    const metaBuffer = Buffer.from(JSON.stringify(meta, null, 2))
    const repackFiles: { name: string; buffer: Buffer }[] = [{ name: 'metadata.json', buffer: metaBuffer }]
    for (let i = 0; i < images.length; i++) {
      const idx = String(i + 1).padStart(3, '0')
      const raw = await sharp(images[i].buffer).ensureAlpha().raw().toBuffer()
      const imgMeta = await sharp(images[i].buffer).metadata()
      const w = imgMeta.width || 0
      const h = imgMeta.height || 0
      const decrypted = decryptPixels({ data: new Uint8Array(raw), width: w, height: h, channels: 4 })
      const reEncrypted = encryptPixels({ data: decrypted, width: w, height: h, channels: 4 })
      const png = await sharp(Buffer.from(reEncrypted), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
      repackFiles.push({ name: `page_${idx}.png`, buffer: png })
    }

    const zipBuf = await createZipFile(repackFiles)
    const id = await storage.saveComic(zipBuf, meta)
    await log('INFO', `gallery save-from-batch: ${name} (${id})`)

    return c.json({ id, name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `gallery save-from-batch failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

api.post('/cleanup', async (c: Context) => {
  try {
    const { sessionId } = await c.req.json() as { sessionId: string }
    if (sessionId) await storage.cleanupDecryptSession(sessionId)
    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false })
  }
})

api.get('/list', async (c: Context) => {
  try {
    const comics = await storage.listComics()
    return c.json(comics)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

api.get('/decrypt/:sessionId/page/:n', async (c: Context) => {
  const { sessionId, n } = c.req.param()
  const pagePath = storage.getDecryptedPage(sessionId, parseInt(n, 10))
  if (!existsSync(pagePath)) return c.json({ error: '页面不存在' }, 404)
  const buffer = await readFile(pagePath)
  return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'image/jpeg' })
})

api.get('/:id', async (c: Context) => {
  const id = c.req.param('id') || ''
  const comic = await storage.getComic(id)
  if (!comic) return c.json({ error: '漫画不存在' }, 404)
  return c.json(comic)
})

api.post('/:id/decrypt', async (c: Context) => {
  const id = c.req.param('id') || ''
  const result = await storage.decryptComic(id)
  if (!result) return c.json({ error: '漫画不存在或解密失败' }, 404)
  return c.json(result)
})

export { api }
