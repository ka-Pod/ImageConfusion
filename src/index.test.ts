import { expect, test, describe, beforeAll } from 'bun:test'
import sharp from 'sharp'
import { app } from './app'

let testImageBuffer: ArrayBuffer

let smallTestBuffer: ArrayBuffer

beforeAll(async () => {
  const pixels = new Uint8Array(4 * 32 * 32)
  for (let i = 0; i < 32 * 32; i++) {
    const idx = i * 4
    pixels[idx] = (i * 37) % 256
    pixels[idx + 1] = (i * 71) % 256
    pixels[idx + 2] = (i * 13) % 256
    pixels[idx + 3] = 255
  }
  testImageBuffer = await sharp(Buffer.from(pixels), {
    raw: { width: 32, height: 32, channels: 4 },
  })
    .png()
    .toBuffer()
    .then((b) => b.buffer as ArrayBuffer)

  const smallPixels = new Uint8Array(4 * 8 * 8)
  for (let i = 0; i < 64; i++) {
    const idx = i * 4
    smallPixels[idx] = (i * 37) % 256
    smallPixels[idx + 1] = (i * 71) % 256
    smallPixels[idx + 2] = (i * 13) % 256
    smallPixels[idx + 3] = 255
  }
  smallTestBuffer = await sharp(Buffer.from(smallPixels), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer().then(b => b.buffer as ArrayBuffer)
})

describe('API E2E', () => {
  test('GET / returns HTML page', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('图片混淆')
    expect(res.headers.get('Content-Type')).toContain('text/html')
  })

  test('POST /api/encrypt returns JPEG', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'test.png')
    const res = await app.request('/api/encrypt', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('image/jpeg')
  })

  test('POST /api/decrypt returns JPEG', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'test.png')

    const encRes = await app.request('/api/encrypt', { method: 'POST', body: form })
    expect(encRes.status).toBe(200)
    const encBuffer = await encRes.arrayBuffer()

    const decForm = new FormData()
    decForm.append('image', new Blob([encBuffer], { type: 'image/jpeg' }), 'encrypted.jpg')
    const decRes = await app.request('/api/decrypt', { method: 'POST', body: decForm })
    expect(decRes.status).toBe(200)
    expect(decRes.headers.get('Content-Type')).toContain('image/jpeg')
  })

  test('POST /api/encrypt with no file returns 400', async () => {
    const form = new FormData()
    const res = await app.request('/api/encrypt', { method: 'POST', body: form })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  test('POST /api/encrypt with invalid image returns 400', async () => {
    const form = new FormData()
    form.append('image', new Blob([Buffer.from('not-an-image')], { type: 'text/plain' }), 'bad.txt')
    const res = await app.request('/api/encrypt', { method: 'POST', body: form })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  test('GET /unknown returns 404', async () => {
    const res = await app.request('/api/unknown')
    expect(res.status).toBe(404)
  })
})

describe('Batch API', () => {
  test('POST /api/batch/encrypt returns JSON with items', async () => {
    const form = new FormData()
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'a.png')
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'b.png')
    const res = await app.request('/api/batch/encrypt', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.zipId).toBeDefined()
    expect(body.items.length).toBe(2)
    expect(body.items[0].id).toBeDefined()
    expect(body.items[0].processedName).toBe('encrypt_a.png')
  })

  test('GET /api/batch/download?zipId=xxx returns ZIP', async () => {
    const form = new FormData()
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'a.png')
    const encRes = await app.request('/api/batch/encrypt', { method: 'POST', body: form })
    const { zipId } = await encRes.json()
    const dlRes = await app.request(`/api/batch/download?zipId=${zipId}`, { method: 'POST' })
    expect(dlRes.status).toBe(200)
    expect(dlRes.headers.get('Content-Type')).toBe('application/zip')
    const blob = await dlRes.blob()
    expect(blob.size).toBeGreaterThan(0)
  })

  test('POST /api/batch/decrypt returns JSON with items containing IDs', async () => {
    const form = new FormData()
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'a.png')
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'b.png')
    const res = await app.request('/api/batch/decrypt', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBeDefined()
    expect(body.items[0].id).toBeDefined()
    expect(body.items[0].processedName).toBe('decrypt_a.png')
  })

  test('GET /api/batch/image/:id returns JPEG', async () => {
    const form = new FormData()
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'a.png')
    const decRes = await app.request('/api/batch/decrypt', { method: 'POST', body: form })
    const { sessionId, items } = await decRes.json()
    const imgRes = await app.request(`/api/batch/image/${items[0].id}?sessionId=${sessionId}`)
    expect(imgRes.status).toBe(200)
    expect(imgRes.headers.get('Content-Type')).toBe('image/jpeg')
  })

  test('POST /api/batch/download with ids returns ZIP', async () => {
    const form = new FormData()
    form.append('image', new Blob([smallTestBuffer], { type: 'image/png' }), 'a.png')
    const decRes = await app.request('/api/batch/decrypt', { method: 'POST', body: form })
    const { sessionId, items } = await decRes.json()
    const dlRes = await app.request('/api/batch/download', {
      method: 'POST',
      body: JSON.stringify({ sessionId, ids: [items[0].id] }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(dlRes.status).toBe(200)
    expect(dlRes.headers.get('Content-Type')).toBe('application/zip')
  })

  test('POST /api/batch/decrypt-zip returns JSON with items', async () => {
    const { createZipFile } = await import('./batch')
    const imgBuffer = await sharp(Buffer.from(smallTestBuffer), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer()
    const zipBuffer = await createZipFile([{ name: 'test.png', buffer: imgBuffer }])

    const form = new FormData()
    form.append('zip', new Blob([zipBuffer], { type: 'application/zip' }), 'encrypt_results.zip')

    const res = await app.request('/api/batch/decrypt-zip', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBeDefined()
    expect(body.items.length).toBe(1)
    expect(body.items[0].originalName).toBe('test.png')
    expect(body.items[0].processedName).toBe('decrypt_test.png')
  })

  test('POST /api/batch/decrypt-zip with invalid ZIP returns 400', async () => {
    const form = new FormData()
    form.append('zip', new Blob([Buffer.from([1, 2, 3])], { type: 'application/zip' }), 'bad.zip')
    const res = await app.request('/api/batch/decrypt-zip', { method: 'POST', body: form })
    expect(res.status).toBe(400)
  })

  test('POST /api/batch/decrypt-zip with no file returns 400', async () => {
    const res = await app.request('/api/batch/decrypt-zip', { method: 'POST', body: new FormData() })
    expect(res.status).toBe(400)
  })

  test('POST /api/batch/encrypt with no files returns 400', async () => {
    const res = await app.request('/api/batch/encrypt', { method: 'POST', body: new FormData() })
    expect(res.status).toBe(400)
  })

  test('GET /api/batch/image/:id with bad id returns 404', async () => {
    const res = await app.request('/api/batch/image/nonexistent?sessionId=bad')
    expect(res.status).toBe(404)
  })
})
