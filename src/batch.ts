import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdir, rm, writeFile, readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { ZipArchive } from 'archiver'
import unzipper from 'unzipper'
import sharp from 'sharp'
import { encryptPixels, decryptPixels } from './confuse'

export type BatchItem = {
  id: string
  originalName: string
  processedName: string
  error?: string
}

export type ManifestEntry = {
  id: string
  originalName: string
  processedName: string
  error?: string
}

export type ProcessBatchResult = {
  sessionId: string
  items: BatchItem[]
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null

export function createSession(): string {
  return randomUUID()
}

export function sessionDir(sessionId: string): string {
  return join(tmpdir(), `imageconfusion-${sessionId}`)
}

export async function ensureSessionDir(sessionId: string): Promise<string> {
  const dir = sessionDir(sessionId)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

export async function saveProcessedImage(sessionId: string, id: string, buffer: Buffer): Promise<void> {
  const dir = await ensureSessionDir(sessionId)
  await writeFile(join(dir, `${id}.jpg`), buffer)
}

export async function getProcessedImage(sessionId: string, id: string): Promise<Buffer | null> {
  const dir = sessionDir(sessionId)
  const filePath = join(dir, `${id}.jpg`)
  if (!existsSync(filePath)) return null
  return await readFile(filePath)
}

export async function saveManifest(sessionId: string, entries: ManifestEntry[]): Promise<void> {
  const dir = await ensureSessionDir(sessionId)
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(entries))
}

export async function readManifest(sessionId: string): Promise<ManifestEntry[] | null> {
  const dir = sessionDir(sessionId)
  const filePath = join(dir, 'manifest.json')
  if (!existsSync(filePath)) return null
  const text = await readFile(filePath, 'utf-8')
  return JSON.parse(text) as ManifestEntry[]
}

export async function createZipFile(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 6 } })
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)
    for (const file of files) {
      archive.append(file.buffer, { name: file.name })
    }
    archive.finalize()
  })
}

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i

async function extractZipGeneric(zipBuffer: Buffer, filter: (name: string) => boolean): Promise<{ name: string; buffer: Buffer }[]> {
  const result: { name: string; buffer: Buffer }[] = []

  try {
    const directory = await unzipper.Open.buffer(zipBuffer)

    for (const file of directory.files) {
      if (file.type === 'Directory') continue
      const fileName = file.path.split('/').pop() || file.path
      if (!filter(fileName)) continue

      const chunks: Buffer[] = []
      for await (const chunk of file.stream()) {
        chunks.push(chunk)
      }
      result.push({ name: fileName, buffer: Buffer.concat(chunks) })
    }
  } catch (err) {
    throw new Error(`ZIP 解压失败: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

export async function extractZipBuffer(zipBuffer: Buffer): Promise<{ name: string; buffer: Buffer }[]> {
  return extractZipGeneric(zipBuffer, (name) => IMAGE_EXTENSIONS.test(name))
}

export async function extractZipAll(zipBuffer: Buffer): Promise<{ name: string; buffer: Buffer }[]> {
  return extractZipGeneric(zipBuffer, () => true)
}

export async function extractZipEntry(zipPath: string, entryName: string): Promise<Buffer | null> {
  try {
    const directory = await unzipper.Open.file(zipPath)
    const file = directory.files.find(f => f.path.split('/').pop() === entryName)
    if (!file || file.type === 'Directory') return null
    const chunks: Buffer[] = []
    for await (const chunk of file.stream()) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

export async function saveZipFile(sessionId: string, buffer: Buffer): Promise<string> {
  const dir = await ensureSessionDir(sessionId)
  const zipPath = join(dir, 'results.zip')
  await writeFile(zipPath, buffer)
  return zipPath
}

export async function getZipFile(sessionId: string): Promise<Buffer | null> {
  const dir = sessionDir(sessionId)
  const zipPath = join(dir, 'results.zip')
  if (!existsSync(zipPath)) return null
  return await readFile(zipPath)
}

export async function cleanupSession(sessionId: string): Promise<void> {
  const dir = sessionDir(sessionId)
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function processImageBuffer(
  buffer: Buffer,
  action: 'encrypt' | 'decrypt',
  format: 'jpeg' | 'png' = 'jpeg',
): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  if (!metadata.width || !metadata.height) throw new Error('无法解析图片')
  const { width, height } = metadata
  const channels = 4
  const raw = await sharp(buffer).ensureAlpha().raw().toBuffer()
  const result = action === 'encrypt'
    ? encryptPixels({ data: new Uint8Array(raw), width, height, channels })
    : decryptPixels({ data: new Uint8Array(raw), width, height, channels })
  const pipeline = sharp(Buffer.from(result), { raw: { width, height, channels } })
  return format === 'png'
    ? await pipeline.png().toBuffer()
    : await pipeline.jpeg({ quality: 95 }).toBuffer()
}

export async function processBatch(files: { name: string; buffer: Buffer }[], action: 'encrypt' | 'decrypt'): Promise<ProcessBatchResult> {
  const sessionId = createSession()
  const items: BatchItem[] = []
  for (const file of files) {
    const item: BatchItem = { id: randomUUID(), originalName: file.name, processedName: `${action}_${file.name}` }
    try {
      const processed = await processImageBuffer(file.buffer, action)
      await saveProcessedImage(sessionId, item.id, processed)
    } catch (err) {
      item.error = err instanceof Error ? err.message : String(err)
    }
    items.push(item)
  }
  await saveManifest(sessionId, items)
  return { sessionId, items }
}

export async function startCleanupTimer(intervalMs: number = 5 * 60 * 1000): Promise<void> {
  if (cleanupTimer) return
  cleanupTimer = setInterval(async () => {
    try {
      const tmpBase = tmpdir()
      if (!existsSync(tmpBase)) return
      const entries = await readdir(tmpBase)
      const now = Date.now()
      const ttl = 30 * 60 * 1000
      for (const entry of entries) {
        if (!entry.startsWith('imageconfusion-')) continue
        const dirPath = join(tmpBase, entry)
        const stats = await stat(dirPath)
        if (now - stats.mtimeMs > ttl) {
          await rm(dirPath, { recursive: true, force: true })
        }
      }
    } catch { /* ignore */ }
  }, intervalMs)
}

export function stopCleanupTimer(): void {
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null }
}
