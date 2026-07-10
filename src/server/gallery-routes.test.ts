import { expect, test, describe, afterAll } from 'bun:test'
import { existsSync } from 'node:fs'
import { rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { app } from '../app'

const TEST_STORAGE = join(process.cwd(), 'storage')

async function createTestZipBuffer(): Promise<Buffer> {
  const { createZipFile, processImageBuffer } = await import('../batch')

  const pixels = new Uint8Array(4 * 16 * 16)
  for (let j = 0; j < 16 * 16; j++) {
    const idx = j * 4
    pixels[idx] = (j * 37) % 256
    pixels[idx + 1] = (j * 71) % 256
    pixels[idx + 2] = (j * 13) % 256
    pixels[idx + 3] = 255
  }
  const raw = await sharp(Buffer.from(pixels), { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer()
  const encrypted = await processImageBuffer(raw, 'encrypt')

  const meta = { name: 'API测试漫画', author: '测试', source: '单元测试', createdAt: new Date().toISOString(), coverIndex: 0 }
  return await createZipFile([
    { name: 'metadata.json', buffer: Buffer.from(JSON.stringify(meta)) },
    { name: 'page_001.jpg', buffer: encrypted },
    { name: 'page_002.jpg', buffer: encrypted },
  ])
}

afterAll(async () => {
  if (existsSync(TEST_STORAGE)) {
    const entries = await readdir(TEST_STORAGE)
    for (const entry of entries) {
      if (entry !== '.gitkeep') {
        const zipPath = join(TEST_STORAGE, entry, 'encrypted.zip')
        if (existsSync(zipPath)) {
          await rm(join(TEST_STORAGE, entry), { recursive: true, force: true })
        }
      }
    }
  }
})

describe('gallery API', () => {
  let comicId: string

  test('POST /api/gallery/create creates a comic from uploaded images', async () => {
    const pixels = new Uint8Array(4 * 8 * 8)
    for (let i = 0; i < 64; i++) {
      const idx = i * 4
      pixels[idx] = (i * 37) % 256
      pixels[idx + 1] = (i * 71) % 256
      pixels[idx + 2] = (i * 13) % 256
      pixels[idx + 3] = 255
    }
    const imgBuffer = await sharp(Buffer.from(pixels), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer()

    const form = new FormData()
    form.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'page1.png')
    form.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'page2.png')
    form.append('name', 'API测试漫画')
    form.append('author', '测试作者')

    const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('API测试漫画')
    expect(body.totalPages).toBe(2)
    comicId = body.id
  })

  test('POST /api/gallery/create without name returns 400', async () => {
    const form = new FormData()
    form.append('image', new Blob([Buffer.from([1])], { type: 'image/png' }), 'test.png')
    const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('POST /api/gallery/create without images returns 400', async () => {
    const form = new FormData()
    form.append('name', '测试')
    const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
    expect(res.status).toBe(400)
  })

  test('GET /api/gallery/list returns comic list', async () => {
    const res = await app.request('/api/gallery/list')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    const found = body.find((c: any) => c.id === comicId)
    expect(found).toBeDefined()
    expect(found.name).toBe('API测试漫画')
    expect(found.totalPages).toBe(2)
  })

  test('GET /api/gallery/:id returns comic detail', async () => {
    const res = await app.request(`/api/gallery/${comicId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(comicId)
    expect(body.name).toBe('API测试漫画')
    expect(body.totalPages).toBe(2)
  })

  test('GET /api/gallery/:id for nonexistent returns 404', async () => {
    const res = await app.request('/api/gallery/nonexistent-id')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('POST /api/gallery/:id/decrypt decrypts comic', async () => {
    const res = await app.request(`/api/gallery/${comicId}/decrypt`, { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBeDefined()
    expect(body.totalPages).toBe(2)
  })

  test('GET /api/gallery/decrypt/:sessionId/page/:n returns JPEG', async () => {
    const decRes = await app.request(`/api/gallery/${comicId}/decrypt`, { method: 'POST' })
    const { sessionId } = await decRes.json()

    for (let n = 0; n < 2; n++) {
      const res = await app.request(`/api/gallery/decrypt/${sessionId}/page/${n}`)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('image/jpeg')
    }
  })

  test('GET /api/gallery/decrypt/:sessionId/page/:n for bad page returns 404', async () => {
    const decRes = await app.request(`/api/gallery/${comicId}/decrypt`, { method: 'POST' })
    const { sessionId } = await decRes.json()
    const res = await app.request(`/api/gallery/decrypt/${sessionId}/page/999`)
    expect(res.status).toBe(404)
  })

  test('POST /api/gallery/save-from-batch with JSON body saves comic', async () => {
    const zipBuffer = await createTestZipBuffer()
    const body = JSON.stringify({
      zipBuffer: zipBuffer.toString('base64'),
      name: '批量保存漫画',
      author: '测试',
      source: '批量',
    })
    const res = await app.request('/api/gallery/save-from-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe('批量保存漫画')
  })

  test('POST /api/gallery/save-from-batch without name returns 400', async () => {
    const res = await app.request('/api/gallery/save-from-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipBuffer: 'AAAA' }),
    })
    expect(res.status).toBe(400)
  })

  test('POST /api/gallery/cleanup session', async () => {
    const decRes = await app.request(`/api/gallery/${comicId}/decrypt`, { method: 'POST' })
    const { sessionId } = await decRes.json()

    const res = await app.request('/api/gallery/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
