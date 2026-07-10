import { expect, test, describe, beforeAll, afterAll } from 'bun:test'
import { existsSync } from 'node:fs'
import { rm, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import type { ComicMeta } from './gallery-storage'

const TEST_STORAGE = join(process.cwd(), 'storage')

async function createEncryptedTestZip(pages: number): Promise<Buffer> {
  const { createZipFile, processImageBuffer } = await import('../batch')
  const files: { name: string; buffer: Buffer }[] = []

  const meta: ComicMeta = {
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
    const encrypted = await processImageBuffer(raw, 'encrypt')
    const idx = String(i + 1).padStart(3, '0')
    files.push({ name: `page_${idx}.jpg`, buffer: encrypted })
  }

  return await createZipFile(files)
}

let storage: typeof import('./gallery-storage')

beforeAll(async () => {
  storage = await import('./gallery-storage')
})

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

describe('gallery storage', () => {
  const testIds: string[] = []

  test('saveComic creates a zip file in storage', async () => {
    const zipBuffer = await createEncryptedTestZip(3)
    const meta: ComicMeta = { name: '测试漫画', author: '作者', source: '来源', createdAt: new Date().toISOString(), coverIndex: 0 }
    const id = await storage.saveComic(zipBuffer, meta)
    testIds.push(id)

    expect(id.length).toBeGreaterThan(0)
    expect(id).toContain('-')
    const zipPath = join(TEST_STORAGE, id, 'encrypted.zip')
    expect(existsSync(zipPath)).toBe(true)
    const saved = await readFile(zipPath)
    expect(saved.length).toBeGreaterThan(0)
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
})
