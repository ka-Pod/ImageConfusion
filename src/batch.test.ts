import { expect, test, describe, beforeAll, beforeEach, afterEach } from 'bun:test'
import { existsSync } from 'node:fs'

describe('batch module exports', () => {
  test('module exports expected functions', async () => {
    const batch = await import('./batch')
    expect(typeof batch.createSession).toBe('function')
    expect(typeof batch.saveProcessedImage).toBe('function')
    expect(typeof batch.getProcessedImage).toBe('function')
    expect(typeof batch.saveManifest).toBe('function')
    expect(typeof batch.readManifest).toBe('function')
    expect(typeof batch.createZipFile).toBe('function')
    expect(typeof batch.saveZipFile).toBe('function')
    expect(typeof batch.cleanupSession).toBe('function')
    expect(typeof batch.processImageBuffer).toBe('function')
    expect(typeof batch.processBatch).toBe('function')
    expect(typeof batch.extractZipBuffer).toBe('function')
    expect(typeof batch.startCleanupTimer).toBe('function')
    expect(typeof batch.stopCleanupTimer).toBe('function')
  })
})

describe('session management', () => {
  let sid: string
  let createSession: any, sessionDir: any, ensureSessionDir: any
  let saveProcessedImage: any, getProcessedImage: any
  let saveManifest: any, readManifest: any, cleanupSession: any

  beforeEach(async () => {
    const batch = await import('./batch')
    createSession = batch.createSession
    sessionDir = batch.sessionDir
    ensureSessionDir = batch.ensureSessionDir
    saveProcessedImage = batch.saveProcessedImage
    getProcessedImage = batch.getProcessedImage
    saveManifest = batch.saveManifest
    readManifest = batch.readManifest
    cleanupSession = batch.cleanupSession
    sid = createSession()
  })

  afterEach(async () => {
    if (sid) await cleanupSession(sid)
  })

  test('createSession returns a UUID', () => {
    expect(sid.length).toBeGreaterThan(0)
    expect(sid).toContain('-')
  })

  test('sessionDir returns correct path', () => {
    const dir = sessionDir(sid)
    expect(dir).toContain('imageconfusion-')
    expect(dir).toContain(sid)
  })

  test('ensureSessionDir creates directory', async () => {
    const dir = await ensureSessionDir(sid)
    expect(existsSync(dir)).toBe(true)
  })

  test('save and get processed image', async () => {
    const buffer = Buffer.from([1, 2, 3, 4])
    await saveProcessedImage(sid, 'test-id', buffer)
    const retrieved = await getProcessedImage(sid, 'test-id')
    expect(retrieved).toEqual(buffer)
  })

  test('getProcessedImage returns null for missing id', async () => {
    const result = await getProcessedImage(sid, 'nonexistent')
    expect(result).toBeNull()
  })

  test('save and read manifest', async () => {
    const entries = [
      { id: '1', originalName: 'a.jpg', processedName: 'encrypt_a.jpg' },
      { id: '2', originalName: 'b.jpg', processedName: 'encrypt_b.jpg', error: 'fail' },
    ]
    await saveManifest(sid, entries)
    const read = await readManifest(sid)
    expect(read).toEqual(entries)
  })

  test('cleanupSession removes directory', async () => {
    await ensureSessionDir(sid)
    await cleanupSession(sid)
    expect(existsSync(sessionDir(sid))).toBe(false)
  })
})

describe('ZIP creation', () => {
  test('createZipFile produces valid ZIP', async () => {
    const { createZipFile } = await import('./batch')
    const files = [
      { name: 'encrypt_a.jpg', buffer: Buffer.from([1, 2, 3]) },
      { name: 'encrypt_b.jpg', buffer: Buffer.from([4, 5, 6]) },
    ]
    const zipBuffer = await createZipFile(files)
    expect(zipBuffer.length).toBeGreaterThan(0)
  })

  test('createZipFile handles empty array', async () => {
    const { createZipFile } = await import('./batch')
    const zipBuffer = await createZipFile([])
    expect(zipBuffer.length).toBeGreaterThan(0)
  })
})

describe('extractZipBuffer', () => {
  let createZipFile: any

  beforeAll(async () => {
    const batch = await import('./batch')
    createZipFile = batch.createZipFile
  })

  test('extracts files from a ZIP', async () => {
    const { extractZipBuffer } = await import('./batch')
    const files = [
      { name: 'a.png', buffer: Buffer.from([1, 2, 3]) },
      { name: 'b.png', buffer: Buffer.from([4, 5, 6]) },
    ]
    const zipBuffer = await createZipFile(files)
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted.length).toBe(2)
    expect(extracted[0].name).toBe('a.png')
    expect(extracted[1].name).toBe('b.png')
    expect(extracted[0].buffer).toEqual(Buffer.from([1, 2, 3]))
  })

  test('filters non-image files', async () => {
    const { extractZipBuffer } = await import('./batch')
    const zipBuffer = await createZipFile([
      { name: 'a.png', buffer: Buffer.from([1]) },
      { name: 'readme.txt', buffer: Buffer.from([2]) },
      { name: 'b.jpg', buffer: Buffer.from([3]) },
    ])
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted.length).toBe(2)
    expect(extracted.every(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name))).toBe(true)
  })

  test('handles empty ZIP', async () => {
    const { extractZipBuffer } = await import('./batch')
    const zipBuffer = await createZipFile([])
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted).toEqual([])
  })

  test('extracts files regardless of order', async () => {
    const { extractZipBuffer } = await import('./batch')
    const names = ['c.png', 'a.png', 'b.png']
    const zipBuffer = await createZipFile(names.map(n => ({ name: n, buffer: Buffer.from([1]) })))
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted.length).toBe(3)
    expect(extracted.map(f => f.name).sort()).toEqual(names.sort())
  })

  test('handles Chinese filenames without encoding errors', async () => {
    const { extractZipBuffer } = await import('./batch')
    const names = ['屏幕截图 2026-06-25.png', '测试图片.jpg']
    const files = names.map(n => ({ name: n, buffer: Buffer.from([1, 2, 3]) }))
    const zipBuffer = await createZipFile(files)
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted.length).toBe(2)
    expect(extracted[0].name).toBe(names[0])
    expect(extracted[1].name).toBe(names[1])
  })

  test('extractZipBuffer handles subdirectory paths', async () => {
    const { extractZipBuffer } = await import('./batch')
    const files = [
      { name: 'subfolder/image1.png', buffer: Buffer.from([1, 2, 3]) },
      { name: 'deep/nested/path/image2.jpg', buffer: Buffer.from([4, 5, 6]) },
      { name: 'image3.png', buffer: Buffer.from([7, 8, 9]) },
    ]
    const zipBuffer = await createZipFile(files)
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted.length).toBe(3)
    const names = extracted.map(f => f.name).sort()
    expect(names).toEqual(['image1.png', 'image2.jpg', 'image3.png'])
  })
})

describe('processImageBuffer', () => {
  test('processes a PNG through encrypt and returns JPEG', async () => {
    const sharp = (await import('sharp')).default
    const { processImageBuffer } = await import('./batch')
    const pixels = new Uint8Array(4 * 4 * 4)
    for (let i = 0; i < 16; i++) {
      pixels[i * 4] = (i * 37) % 256
      pixels[i * 4 + 1] = (i * 71) % 256
      pixels[i * 4 + 2] = (i * 13) % 256
      pixels[i * 4 + 3] = 255
    }
    const input = await sharp(Buffer.from(pixels), { raw: { width: 4, height: 4, channels: 4 } }).png().toBuffer()
    const result = await processImageBuffer(input, 'encrypt')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toBe(0xFF)
    expect(result[1]).toBe(0xD8)
  })
})
