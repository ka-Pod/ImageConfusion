import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { decryptPixels } from '../confuse'
import { extractZipAll } from '../batch'

const STORAGE_DIR = join(process.cwd(), 'storage')

export type ComicMeta = {
  name: string
  author: string
  source: string
  createdAt: string
  coverIndex: number
}

export type ComicEntry = ComicMeta & {
  id: string
  totalPages: number
  coverBase64?: string
}

async function ensureStorageDir(): Promise<void> {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
}

export async function saveComic(zipBuffer: Buffer, _meta: ComicMeta): Promise<string> {
  await ensureStorageDir()
  const id = randomUUID()
  const dir = join(STORAGE_DIR, id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'encrypted.zip'), zipBuffer)
  return id
}

export async function listComics(): Promise<ComicEntry[]> {
  await ensureStorageDir()
  const entries = await readdir(STORAGE_DIR)
  const comics: ComicEntry[] = []

  for (const entry of entries) {
    const zipPath = join(STORAGE_DIR, entry, 'encrypted.zip')
    if (!existsSync(zipPath)) continue
    try {
      const files = await extractZipAll(await readFile(zipPath))
      const metaFile = files.find(f => f.name === 'metadata.json')
      if (!metaFile) continue
      const meta: ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
      const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.jpg$/i.test(f.name))

      let coverBase64 = ''
      const coverIdx = meta.coverIndex
      const coverFile = imageFiles[coverIdx]
      if (coverFile) {
        const raw = await sharp(coverFile.buffer).ensureAlpha().raw().toBuffer()
        const meta2 = await sharp(coverFile.buffer).metadata()
        const w = meta2.width || 0
        const h = meta2.height || 0
        const decrypted = decryptPixels({ data: new Uint8Array(raw), width: w, height: h, channels: 4 })
        const jpeg = await sharp(Buffer.from(decrypted), { raw: { width: w, height: h, channels: 4 } })
          .resize(200)
          .jpeg({ quality: 70 })
          .toBuffer()
        coverBase64 = jpeg.toString('base64')
      }

      comics.push({
        id: entry,
        ...meta,
        totalPages: imageFiles.length,
        coverBase64,
      })
    } catch {
      continue
    }
  }

  comics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return comics
}

export async function getComic(id: string): Promise<ComicEntry | null> {
  const zipPath = join(STORAGE_DIR, id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null
  try {
    const files = await extractZipAll(await readFile(zipPath))
    const metaFile = files.find(f => f.name === 'metadata.json')
    if (!metaFile) return null
    const meta: ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
    const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.jpg$/i.test(f.name))
    return { id, ...meta, totalPages: imageFiles.length }
  } catch {
    return null
  }
}

export async function decryptComic(id: string): Promise<{ sessionId: string; totalPages: number } | null> {
  const zipPath = join(STORAGE_DIR, id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null

  const files = await extractZipAll(await readFile(zipPath))
  const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.jpg$/i.test(f.name))
  const sessionId = randomUUID()
  const tmpDir = join(process.cwd(), 'tmp', `gallery-${sessionId}`)
  await mkdir(tmpDir, { recursive: true })

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    const raw = await sharp(file.buffer).ensureAlpha().raw().toBuffer()
    const meta = await sharp(file.buffer).metadata()
    const w = meta.width || 0
    const h = meta.height || 0
    const decrypted = decryptPixels({ data: new Uint8Array(raw), width: w, height: h, channels: 4 })
    const jpeg = await sharp(Buffer.from(decrypted), { raw: { width: w, height: h, channels: 4 } })
      .jpeg({ quality: 95 })
      .toBuffer()
    await writeFile(join(tmpDir, `page_${String(i + 1).padStart(3, '0')}.jpg`), jpeg)
  }

  return { sessionId, totalPages: imageFiles.length }
}

export function getDecryptedPage(sessionId: string, page: number): string {
  return join(process.cwd(), 'tmp', `gallery-${sessionId}`, `page_${String(page + 1).padStart(3, '0')}.jpg`)
}

export async function cleanupDecryptSession(sessionId: string): Promise<void> {
  const dir = join(process.cwd(), 'tmp', `gallery-${sessionId}`)
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true })
  }
}
