import { Hono, type Context } from 'hono'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as storage from './gallery-storage'
import { processImageBuffer, createZipFile, extractZipBuffer } from '../batch'
import { log } from '../logger'

const api = new Hono()

api.post('/create', async (c: Context) => {
  try {
    const formData = await c.req.formData()
    const fileEntries = formData.getAll('image')
    const name = formData.get('name') as string
    const author = (formData.get('author') as string) || ''
    const source = (formData.get('source') as string) || ''

    if (!name) return c.json({ error: '请输入漫画名称' }, 400)
    if (fileEntries.length === 0) return c.json({ error: '请上传图片' }, 400)

    const files: { name: string; buffer: Buffer }[] = []
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue
      const buffer = Buffer.from(await entry.arrayBuffer())

      if (entry.name.toLowerCase().endsWith('.zip')) {
        const extracted = await extractZipBuffer(buffer)
        const hasMeta = extracted.some(f => f.name === 'metadata.json')
        if (hasMeta) {
          const metaFile = extracted.find(f => f.name === 'metadata.json')
          if (metaFile) {
            const existingMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
            const id = await storage.saveComic(buffer, existingMeta)
            await log('INFO', `gallery import: ${existingMeta.name} (${id})`)
            return c.json({ id, name: existingMeta.name, totalPages: extracted.length - 1 })
          }
        }
        for (const f of extracted) {
          if (/\.(png|jpg|jpeg|webp)$/i.test(f.name)) {
            const processed = await processImageBuffer(f.buffer, 'encrypt')
            const idx = String(files.length + 1).padStart(3, '0')
            files.push({ name: `page_${idx}.jpg`, buffer: processed })
          }
        }
      } else {
        const processed = await processImageBuffer(buffer, 'encrypt')
        const idx = String(files.length + 1).padStart(3, '0')
        files.push({ name: `page_${idx}.jpg`, buffer: processed })
      }
    }

    if (files.length === 0) return c.json({ error: '没有可处理的图片' }, 400)

    const meta = { name, author, source, createdAt: new Date().toISOString(), coverIndex: 0 }
    const metaBuffer = Buffer.from(JSON.stringify(meta, null, 2))
    files.unshift({ name: 'metadata.json', buffer: metaBuffer })

    const zipBuffer = await createZipFile(files)
    const id = await storage.saveComic(zipBuffer, meta)
    await log('INFO', `gallery create: ${name} (${id})`)

    return c.json({ id, name, totalPages: files.length - 1 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `gallery create failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

api.post('/save-from-batch', async (c: Context) => {
  try {
    const body = await c.req.json()
    const { name, author, source } = body

    const formData = await c.req.formData()
    const zipFile = formData.get('zip')

    let zipBuffer: Buffer
    if (zipFile instanceof File) {
      zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    } else if (body.zipBuffer) {
      zipBuffer = Buffer.from(body.zipBuffer, 'base64')
    } else {
      return c.json({ error: '缺少 ZIP 数据' }, 400)
    }

    const extracted = await extractZipBuffer(zipBuffer)
    const images = extracted.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name))

    const meta = { name, author, source, createdAt: new Date().toISOString(), coverIndex: 0 }
    const metaBuffer = Buffer.from(JSON.stringify(meta, null, 2))
    const repackFiles = [{ name: 'metadata.json', buffer: metaBuffer }]
    images.forEach((img, i) => {
      const idx = String(i + 1).padStart(3, '0')
      repackFiles.push({ name: `page_${idx}.jpg`, buffer: Buffer.from(img.buffer) })
    })

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

api.get('/list', async (c: Context) => {
  try {
    const comics = await storage.listComics()
    return c.json(comics)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
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

api.get('/decrypt/:sessionId/page/:n', async (c: Context) => {
  const { sessionId, n } = c.req.param()
  const pagePath = storage.getDecryptedPage(sessionId, parseInt(n, 10))
  if (!existsSync(pagePath)) return c.json({ error: '页面不存在' }, 404)
  const buffer = await readFile(pagePath)
  return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'image/jpeg' })
})

api.post('/cleanup', async (c: Context) => {
  try {
    const { sessionId } = await c.req.json()
    if (sessionId) await storage.cleanupDecryptSession(sessionId)
    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false })
  }
})

export { api }
