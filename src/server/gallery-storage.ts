import { mkdir, readdir, readFile, writeFile, rm, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import unzipper from 'unzipper'
import { decryptPixels } from '../confuse'
import { extractZipAll, extractZipEntry } from '../batch'

function getStorageDir(): string {
  return process.env.IMAGE_CONFUSION_STORAGE_DIR || join(process.cwd(), 'storage')
}

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
  const dir = getStorageDir()
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

export async function saveComic(zipBuffer: Buffer, meta: ComicMeta): Promise<string> {
  if (!zipBuffer || zipBuffer.length === 0) throw new Error('ZIP 数据为空')
  if (!meta.name.trim()) throw new Error('漫画名称不能为空')
  if (!meta.createdAt) throw new Error('创建时间不能为空')

  await ensureStorageDir()
  const id = randomUUID()
  const dir = join(getStorageDir(), id)
  await mkdir(dir, { recursive: true })

  const tmpPath = join(dir, 'encrypted.zip.tmp')
  const finalPath = join(dir, 'encrypted.zip')
  try {
    await writeFile(tmpPath, zipBuffer)
    await rename(tmpPath, finalPath)
    await generateCover(finalPath, meta.coverIndex, dir)
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
  return id
}

async function generateCover(zipPath: string, coverIndex: number, dir: string): Promise<void> {
  const coverBuffer = await extractZipEntry(zipPath, coverIndexToName(coverIndex))
  if (!coverBuffer) return
  const raw = await sharp(coverBuffer).ensureAlpha().raw().toBuffer()
  const { width = 0, height = 0 } = await sharp(coverBuffer).metadata()
  const decrypted = decryptPixels({ data: new Uint8Array(raw), width, height, channels: 4 })
  const jpeg = await sharp(Buffer.from(decrypted), { raw: { width, height, channels: 4 } })
    .resize(250)
    .jpeg({ quality: 70 })
    .toBuffer()
  await writeFile(join(dir, 'cover.jpg'), jpeg)
}

function coverIndexToName(index: number): string {
  return `page_${String(index + 1).padStart(3, '0')}.png`
}

export async function deleteComic(id: string): Promise<boolean> {
  const dir = join(getStorageDir(), id)
  if (!existsSync(dir)) return false
  await rm(dir, { recursive: true, force: true })
  return true
}

async function countPages(zipPath: string): Promise<number> {
  try {
    const directory = await unzipper.Open.file(zipPath)
    return directory.files.filter(f =>
      f.type !== 'Directory' && /^page_\d+\.(png|jpg)$/i.test(f.path.split('/').pop() || '')
    ).length
  } catch {
    return 0
  }
}

export async function listComics(): Promise<ComicEntry[]> {
  await ensureStorageDir()
  const storageDir = getStorageDir()
  const entries = await readdir(storageDir)
  const comics: ComicEntry[] = []

  for (const entry of entries) {
    const dir = join(storageDir, entry)
    const zipPath = join(dir, 'encrypted.zip')
    const coverPath = join(dir, 'cover.jpg')
    if (!existsSync(zipPath)) continue
    try {
      const metaBuffer = await extractZipEntry(zipPath, 'metadata.json')
      if (!metaBuffer) continue
      const meta: ComicMeta = JSON.parse(metaBuffer.toString('utf-8'))

      let coverBase64 = ''
      if (existsSync(coverPath)) {
        coverBase64 = (await readFile(coverPath)).toString('base64')
      }

      const totalPages = await countPages(zipPath)
      comics.push({ id: entry, ...meta, totalPages, coverBase64 })
    } catch {
      continue
    }
  }

  comics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return comics
}

export async function getComic(id: string): Promise<ComicEntry | null> {
  const dir = join(getStorageDir(), id)
  const zipPath = join(dir, 'encrypted.zip')
  const coverPath = join(dir, 'cover.jpg')
  if (!existsSync(zipPath)) return null
  try {
    const metaBuffer = await extractZipEntry(zipPath, 'metadata.json')
    if (!metaBuffer) return null
    const meta: ComicMeta = JSON.parse(metaBuffer.toString('utf-8'))

    let coverBase64 = ''
    if (existsSync(coverPath)) {
      coverBase64 = (await readFile(coverPath)).toString('base64')
    }

    const totalPages = await countPages(zipPath)
    return { id, ...meta, totalPages, coverBase64 }
  } catch {
    return null
  }
}

export async function decryptComic(id: string): Promise<{ sessionId: string; totalPages: number } | null> {
  const zipPath = join(getStorageDir(), id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null

  const files = await extractZipAll(await readFile(zipPath))
  const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.(jpg|png)$/i.test(f.name))
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
