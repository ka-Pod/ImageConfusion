import { expect, test, describe, beforeAll, afterAll } from 'bun:test'
import { existsSync } from 'node:fs'
import { rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const TEST_STORAGE = join(process.cwd(), `storage-test-${randomUUID()}`)

async function createEncryptedTestZip(pages: number): Promise<Buffer> {
  const { createZipFile, processImageBuffer } = await import('../batch')
  const files: { name: string; buffer: Buffer }[] = []

  const meta = {
    name: '测试漫画',
    author: '测试作者',
    source: '测试来源',
    createdAt: new Date().toISOString(),
    coverIndex: 0,
  }
  files.push({ name: 'metadata.json', buffer: Buffer.from(JSON.stringify(meta)) })

  for (let i = 0; i < pages; i++) {
    const pixels = new Uint8Array(4 * 16 * 16)
    for (let j = 0; j < 16 * 16; j++) {
      const idx = j * 4
      pixels[idx] = (j * 37 + i * 50) % 256
      pixels[idx + 1] = (j * 71 + i * 30) % 256
      pixels[idx + 2] = (j * 13 + i * 80) % 256
      pixels[idx + 3] = 255
    }
    const raw = await sharp(Buffer.from(pixels), { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer()
    const encrypted = await processImageBuffer(raw, 'encrypt', 'png')
    const idx = String(i + 1).padStart(3, '0')
    files.push({ name: `page_${idx}.png`, buffer: encrypted })
  }

  return await createZipFile(files)
}

let storage: typeof import('./gallery-storage')

beforeAll(async () => {
  process.env.IMAGE_CONFUSION_STORAGE_DIR = TEST_STORAGE
  storage = await import('./gallery-storage')
})

afterAll(async () => {
  delete process.env.IMAGE_CONFUSION_STORAGE_DIR
  if (existsSync(TEST_STORAGE)) {
    await rm(TEST_STORAGE, { recursive: true, force: true })
  }
})

describe('gallery storage', () => {
  const testIds: string[] = []

  test('saveComic creates a zip file in storage', async () => {
    const zipBuffer = await createEncryptedTestZip(3)
    const meta = { name: '测试漫画', author: '作者', source: '来源', createdAt: new Date().toISOString(), coverIndex: 0 }
    const id = await storage.saveComic(zipBuffer, meta)
    testIds.push(id)

    expect(id.length).toBeGreaterThan(0)
    expect(id).toContain('-')
    const zipPath = join(TEST_STORAGE, id, 'encrypted.zip')
    expect(existsSync(zipPath)).toBe(true)
    const saved = await readFile(zipPath)
    expect(saved.length).toBeGreaterThan(0)
  })

  test('deleteComic removes comic directory', async () => {
    const zipBuffer = await createEncryptedTestZip(1)
    const meta = { name: '待删除', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 }
    const id = await storage.saveComic(zipBuffer, meta)

    expect(existsSync(join(TEST_STORAGE, id))).toBe(true)
    const deleted = await storage.deleteComic(id)
    expect(deleted).toBe(true)
    expect(existsSync(join(TEST_STORAGE, id))).toBe(false)
  })

  test('deleteComic returns false for nonexistent id', async () => {
    const deleted = await storage.deleteComic('nonexistent-id')
    expect(deleted).toBe(false)
  })

  test('listComics returns saved comic', async () => {
    const comics = await storage.listComics()
    const found = comics.find(c => testIds.includes(c.id))
    expect(found).toBeDefined()
    expect(found!.name).toBe('测试漫画')
    expect(found!.author).toBe('测试作者')
    expect(found!.source).toBe('测试来源')
    expect(found!.totalPages).toBe(3)
  })

  test('listComics includes coverBase64 for cover page', async () => {
    const comics = await storage.listComics()
    const found = comics.find(c => testIds.includes(c.id))
    expect(found).toBeDefined()
    expect(found!.coverBase64).toBeDefined()
    expect(found!.coverBase64!.length).toBeGreaterThan(0)
  })

  test('getComic returns comic detail', async () => {
    const comic = await storage.getComic(testIds[0])
    expect(comic).not.toBeNull()
    expect(comic!.id).toBe(testIds[0])
    expect(comic!.name).toBe('测试漫画')
    expect(comic!.totalPages).toBe(3)
  })

  test('getComic returns null for nonexistent id', async () => {
    const result = await storage.getComic('nonexistent-id')
    expect(result).toBeNull()
  })

  test('decryptComic decrypts all pages', async () => {
    const result = await storage.decryptComic(testIds[0])
    expect(result).not.toBeNull()
    expect(result!.sessionId).toBeDefined()
    expect(result!.sessionId).toContain('-')
    expect(result!.totalPages).toBe(3)
  })

  test('decryptComic writes decrypted files to tmp', async () => {
    const result = await storage.decryptComic(testIds[0])
    const tmpDir = join(process.cwd(), 'tmp', `gallery-${result!.sessionId}`)
    expect(existsSync(tmpDir)).toBe(true)

    for (let i = 0; i < 3; i++) {
      const pagePath = join(tmpDir, `page_${String(i + 1).padStart(3, '0')}.jpg`)
      expect(existsSync(pagePath)).toBe(true)
      const buf = await readFile(pagePath)
      expect(buf.length).toBeGreaterThan(0)
      expect(buf[0]).toBe(0xFF)
      expect(buf[1]).toBe(0xD8)
    }
  })

  test('getDecryptedPage returns correct path', () => {
    const path = storage.getDecryptedPage('test-session', 0)
    expect(path).toContain('gallery-test-session')
    expect(path).toContain('page_001.jpg')
  })

  test('getDecryptedPage returns correct path for page 12', () => {
    const path = storage.getDecryptedPage('test-session', 12)
    expect(path).toContain('page_013.jpg')
  })

  test('cleanupDecryptSession removes tmp directory', async () => {
    const result = await storage.decryptComic(testIds[0])
    const tmpDir = join(process.cwd(), 'tmp', `gallery-${result!.sessionId}`)
    expect(existsSync(tmpDir)).toBe(true)

    await storage.cleanupDecryptSession(result!.sessionId)
    expect(existsSync(tmpDir)).toBe(false)
  })

  test('decryptComic returns null for nonexistent comic', async () => {
    const result = await storage.decryptComic('nonexistent-id')
    expect(result).toBeNull()
  })

  test('decryptComic produces visually correct output (not still encrypted)', async () => {
    const { createZipFile, processImageBuffer } = await import('../batch')

    const w = 8
    const h = 8
    const origPixels = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        origPixels[idx] = Math.round((x / (w - 1)) * 255)
        origPixels[idx + 1] = Math.round((y / (h - 1)) * 255)
        origPixels[idx + 2] = 128
        origPixels[idx + 3] = 255
      }
    }
    const origPng = await sharp(Buffer.from(origPixels), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()

    const encrypted = await processImageBuffer(origPng, 'encrypt', 'png')
    const meta = { name: '内容验证', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 }
    const zip = await createZipFile([
      { name: 'metadata.json', buffer: Buffer.from(JSON.stringify(meta)) },
      { name: 'page_001.png', buffer: encrypted },
    ])
    const id = await storage.saveComic(zip, meta)
    testIds.push(id)

    const result = await storage.decryptComic(id)
    expect(result).not.toBeNull()

    const decPagePath = storage.getDecryptedPage(result!.sessionId, 0)
    const decBuf = await readFile(decPagePath)
    expect(decBuf[0]).toBe(0xFF)
    expect(decBuf[1]).toBe(0xD8)

    const decRaw = await sharp(decBuf).ensureAlpha().raw().toBuffer()
    const decData = new Uint8Array(decRaw)

    let mse = 0
    for (let i = 0; i < decData.length; i++) {
      const d = decData[i] - origPixels[i]
      mse += d * d
    }
    mse = mse / decData.length

    expect(mse).toBeLessThan(100)
  })

  test('decryptComic handles JPG-batch-to-PNG repack workflow (save-from-batch path)', async () => {
    const { createZipFile, processImageBuffer } = await import('../batch')
    const { encryptPixels, decryptPixels } = await import('../confuse')

    const w = 8
    const h = 8
    const origPixels = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        origPixels[idx] = Math.round((x / (w - 1)) * 255)
        origPixels[idx + 1] = Math.round((y / (h - 1)) * 255)
        origPixels[idx + 2] = 128
        origPixels[idx + 3] = 255
      }
    }
    const origPng = await sharp(Buffer.from(origPixels), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()

    const encryptedJpg = await processImageBuffer(origPng, 'encrypt', 'jpeg')

    const raw = await sharp(encryptedJpg).ensureAlpha().raw().toBuffer()
    const imgMeta = await sharp(encryptedJpg).metadata()
    const iw = imgMeta.width || 0
    const ih = imgMeta.height || 0
    const decrypted = decryptPixels({ data: new Uint8Array(raw), width: iw, height: ih, channels: 4 })
    const reEncrypted = encryptPixels({ data: decrypted, width: iw, height: ih, channels: 4 })
    const png = await sharp(Buffer.from(reEncrypted), { raw: { width: iw, height: ih, channels: 4 } }).png().toBuffer()

    const meta = { name: 'JPG工作流', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 }
    const zip = await createZipFile([
      { name: 'metadata.json', buffer: Buffer.from(JSON.stringify(meta)) },
      { name: 'page_001.png', buffer: png },
    ])
    const id = await storage.saveComic(zip, meta)
    testIds.push(id)

    const result = await storage.decryptComic(id)
    expect(result).not.toBeNull()

    const decPagePath = storage.getDecryptedPage(result!.sessionId, 0)
    const decBuf = await readFile(decPagePath)
    expect(decBuf[0]).toBe(0xFF)
    expect(decBuf[1]).toBe(0xD8)

    const decRaw = await sharp(decBuf).ensureAlpha().raw().toBuffer()
    const decData = new Uint8Array(decRaw)

    let mse = 0
    for (let i = 0; i < decData.length; i++) {
      const d = decData[i] - origPixels[i]
      mse += d * d
    }
    mse = mse / decData.length

    expect(mse).toBeLessThan(250)
  })
})
