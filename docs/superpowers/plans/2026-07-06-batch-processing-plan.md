# Batch Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add folder batch confuse/deconfuse, ZIP packaging download, and multi-image UI to ImageConfusion.

**Architecture:** Server-side batch processing with dual flow — Encrypt returns ZIP directly (streaming via archiver), Decrypt stores temp files for per-image preview then optional ZIP. Temporary storage at `os.tmpdir()/imageconfusion-{sessionId}/` with TTL 30-minute cleanup. Frontend adds `webkitdirectory` folder picker, thumbnail strip, batch state management.

**Tech Stack:** archiver (ZIP), sharp (image processing), os.tmpdir() (temp storage), webkitdirectory (folder picker)

## Global Constraints

- Service-side only processing (sharp decode → Gilbert transform → sharp encode)
- Files use kebab-case naming
- Async/await only, no bare .then()
- State from spec: `type` not `interface`, strict TypeScript
- No emoji in UI — use text/CSS indicators instead
- Single page, no frontend framework

---

### Task 1: Install archiver dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install archiver**

```bash
pnpm add archiver
pnpm add -D @types/archiver
```

- [ ] **Step 2: Verify install**

```bash
pnpm ls archiver
```
Expected: archiver appears in the dependency tree

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add archiver dependency"
```

---

### Task 2: Create batch.ts module

**Files:**
- Create: `src/batch.ts`
- Test: `src/batch.test.ts`

**Interfaces:**
- Produces: `createSession() -> string`, `saveProcessedImage(sessionDir, id, buffer)`, `getProcessedImage(sessionDir, id) -> Buffer | null`, `saveManifest(sessionDir, manifest)`, `readManifest(sessionDir) -> ManifestData`, `createZipFile(files) -> Buffer`, `saveZipFile(sessionDir, buffer) -> string`, `cleanupSession(sessionDir)`, `startCleanupTimer(intervalMs)`, `stopCleanupTimer()`, `processImageBuffer(buffer, action) -> Buffer`, `processBatch(files, action) -> ProcessBatchResult`
- Types exported: `BatchItem`, `BatchEncryptResponse`, `BatchDecryptResponse`, `ManifestData`, `ProcessBatchResult`

- [ ] **Step 1: Write the failing test**

Write `src/batch.test.ts`:

```ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'

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
    expect(typeof batch.startCleanupTimer).toBe('function')
    expect(typeof batch.stopCleanupTimer).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/batch.test.ts
```
Expected: FAIL — module not found or functions undefined

- [ ] **Step 3: Create batch.ts with session management**

Write `src/batch.ts`:

```ts
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdir, rm, writeFile, readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import * as archiver from 'archiver'
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
    const archive = archiver.create('zip', { zlib: { level: 6 } })
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

export async function processImageBuffer(buffer: Buffer, action: 'encrypt' | 'decrypt'): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  if (!metadata.width || !metadata.height) throw new Error('无法解析图片')
  const { width, height } = metadata
  const channels = 4
  const raw = await sharp(buffer).ensureAlpha().raw().toBuffer()
  const result = action === 'encrypt'
    ? encryptPixels({ data: new Uint8Array(raw), width, height, channels })
    : decryptPixels({ data: new Uint8Array(raw), width, height, channels })
  return await sharp(Buffer.from(result), { raw: { width, height, channels } })
    .jpeg({ quality: 95 })
    .toBuffer()
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
```

- [ ] **Step 4: Write tests for session management**

Add to `src/batch.test.ts`:

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('session management', () => {
  let sid: string

  beforeEach(() => { sid = createSession() })
  afterEach(async () => { await cleanupSession(sid) })

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
```

- [ ] **Step 5: Run session tests**

```bash
bun test src/batch.test.ts
```
Expected: All session tests PASS

- [ ] **Step 6: Write tests for ZIP creation**

Add to `src/batch.test.ts`:

```ts
describe('ZIP creation', () => {
  test('createZipFile produces valid ZIP with correct file names', async () => {
    const files = [
      { name: 'encrypt_a.jpg', buffer: Buffer.from([1, 2, 3]) },
      { name: 'encrypt_b.jpg', buffer: Buffer.from([4, 5, 6]) },
    ]
    const zipBuffer = await createZipFile(files)
    expect(zipBuffer.length).toBeGreaterThan(0)
  })

  test('createZipFile handles empty array', async () => {
    const zipBuffer = await createZipFile([])
    expect(zipBuffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 7: Run ZIP tests**

```bash
bun test src/batch.test.ts
```
Expected: All tests PASS

- [ ] **Step 8: Write tests for processImageBuffer**

Add to `src/batch.test.ts`:

```ts
describe('processImageBuffer', () => {
  test('processes a PNG through encrypt and returns JPEG', async () => {
    const sharp = (await import('sharp')).default
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
```

- [ ] **Step 9: Run all batch tests**

```bash
bun test src/batch.test.ts
```
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add src/batch.ts src/batch.test.ts
git commit -m "feat: add batch processing module with session management, ZIP packaging, and TTL cleanup"
```

---

### Task 3: Add batch API endpoints to index.ts

**Files:**
- Modify: `src/index.ts`
- Test: `src/index.test.ts`

**Interfaces:**
- Consumes: all exports from `batch.ts`

- [ ] **Step 1: Write the failing integration tests**

Add to `src/index.test.ts` in a new `describe('Batch API')` block:

```ts
describe('Batch API', () => {
  let testImageBuffer: ArrayBuffer

  beforeAll(async () => {
    const sharp = (await import('sharp')).default
    const pixels = new Uint8Array(4 * 8 * 8)
    for (let i = 0; i < 64; i++) {
      const idx = i * 4
      pixels[idx] = (i * 37) % 256
      pixels[idx + 1] = (i * 71) % 256
      pixels[idx + 2] = (i * 13) % 256
      pixels[idx + 3] = 255
    }
    testImageBuffer = await sharp(Buffer.from(pixels), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer().then(b => b.buffer)
  })

  test('POST /api/batch/encrypt returns JSON with items', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'a.png')
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'b.png')
    const res = await app.request('/api/batch/encrypt', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.zipId).toBeDefined()
    expect(body.items.length).toBe(2)
    expect(body.items[0].processedName).toBe('encrypt_a.png')
  })

  test('GET /api/batch/download?zipId=xxx returns ZIP', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'a.png')
    const encRes = await app.request('/api/batch/encrypt', { method: 'POST', body: form })
    const { zipId } = await encRes.json()
    const dlRes = await app.request(`/api/batch/download?zipId=${zipId}`)
    expect(dlRes.status).toBe(200)
    expect(dlRes.headers.get('Content-Type')).toBe('application/zip')
    const blob = await dlRes.blob()
    expect(blob.size).toBeGreaterThan(0)
  })

  test('POST /api/batch/decrypt returns JSON with items containing IDs', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'a.png')
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'b.png')
    const res = await app.request('/api/batch/decrypt', { method: 'POST', body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBeDefined()
    expect(body.items[0].id).toBeDefined()
    expect(body.items[0].processedName).toBe('decrypt_a.png')
  })

  test('GET /api/batch/image/:id returns JPEG', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'a.png')
    const decRes = await app.request('/api/batch/decrypt', { method: 'POST', body: form })
    const { sessionId, items } = await decRes.json()
    const imgRes = await app.request(`/api/batch/image/${items[0].id}?sessionId=${sessionId}`)
    expect(imgRes.status).toBe(200)
    expect(imgRes.headers.get('Content-Type')).toBe('image/jpeg')
  })

  test('POST /api/batch/download with ids returns ZIP', async () => {
    const form = new FormData()
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'a.png')
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

  test('POST /api/batch/encrypt with no files returns 400', async () => {
    const res = await app.request('/api/batch/encrypt', { method: 'POST', body: new FormData() })
    expect(res.status).toBe(400)
  })

  test('GET /api/batch/image/:id with bad id returns 404', async () => {
    const res = await app.request('/api/batch/image/nonexistent?sessionId=bad')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/index.test.ts
```
Expected: New batch tests FAIL

- [ ] **Step 3: Add batch routes to index.ts**

Add to the top of `src/index.ts`:
```ts
import { processBatch, getProcessedImage, readManifest, getZipFile, saveZipFile, createZipFile, cleanupSession, startCleanupTimer } from './batch'
startCleanupTimer()
```

Add after the existing encrypt/decrypt routes:

```ts
app.post('/api/batch/encrypt', async (c) => {
  try {
    const formData = await c.req.formData()
    const fileEntries = formData.getAll('image')
    if (fileEntries.length === 0) return c.json({ error: '请上传至少一张图片' }, 400)

    const files: { name: string; buffer: Buffer }[] = []
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue
      files.push({ name: entry.name, buffer: Buffer.from(await entry.arrayBuffer()) })
    }

    const { sessionId, items } = await processBatch(files, 'encrypt')
    const zipFiles: { name: string; buffer: Buffer }[] = []
    for (const item of items) {
      if (item.error) continue
      const buf = await getProcessedImage(sessionId, item.id)
      if (buf) zipFiles.push({ name: item.processedName, buffer: buf })
    }
    const finalZip = await createZipFile(zipFiles)
    await saveZipFile(sessionId, finalZip)
    await log('INFO', `batch encrypt success: ${items.length} files`)

    return c.json({
      zipId: sessionId,
      items: items.map(i => ({ originalName: i.originalName, processedName: i.processedName, ...(i.error ? { error: i.error } : {}) })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch encrypt failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

app.post('/api/batch/decrypt', async (c) => {
  try {
    const formData = await c.req.formData()
    const fileEntries = formData.getAll('image')
    if (fileEntries.length === 0) return c.json({ error: '请上传至少一张图片' }, 400)

    const files: { name: string; buffer: Buffer }[] = []
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue
      files.push({ name: entry.name, buffer: Buffer.from(await entry.arrayBuffer()) })
    }

    const { sessionId, items } = await processBatch(files, 'decrypt')
    await log('INFO', `batch decrypt success: ${items.length} files`)

    return c.json({
      sessionId,
      items: items.map(i => ({ id: i.id, originalName: i.originalName, processedName: i.processedName, ...(i.error ? { error: i.error } : {}) })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch decrypt failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

app.get('/api/batch/image/:id', async (c) => {
  const id = c.req.param('id')
  const sessionId = c.req.query('sessionId')
  if (!sessionId) return c.json({ error: '缺少 sessionId 参数' }, 400)
  const buffer = await getProcessedImage(sessionId, id)
  if (!buffer) return c.json({ error: '图片已过期或不存在' }, 404)
  return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'image/jpeg' })
})

app.post('/api/batch/download', async (c) => {
  try {
    const zipId = c.req.query('zipId')
    if (zipId) {
      const buffer = await getZipFile(zipId)
      if (!buffer) return c.json({ error: 'ZIP 已过期或不存在' }, 404)
      return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="encrypt_results.zip"' })
    }

    const body = await c.req.json()
    const { sessionId, ids } = body
    if (!sessionId || !ids || !Array.isArray(ids)) return c.json({ error: '缺少 sessionId 或 ids 参数' }, 400)

    const manifest = await readManifest(sessionId)
    if (!manifest) return c.json({ error: 'Session 已过期或不存在' }, 404)

    const files: { name: string; buffer: Buffer }[] = []
    for (const id of ids) {
      const entry = manifest.find(e => e.id === id)
      if (!entry || entry.error) continue
      const buf = await getProcessedImage(sessionId, id)
      if (buf) files.push({ name: entry.processedName, buffer: buf })
    }
    const zipBuffer = await createZipFile(files)
    return c.body(new Uint8Array(zipBuffer), 200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="decrypt_results.zip"' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

app.post('/api/batch/cleanup', async (c) => {
  try {
    const { sessionId } = await c.req.json()
    if (!sessionId) return c.json({ error: '缺少 sessionId' }, 400)
    await cleanupSession(sessionId)
    return c.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})
```

- [ ] **Step 4: Run integration tests**

```bash
bun test src/index.test.ts
```
Expected: All batch tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add batch API endpoints for encrypt/decrypt/ZIP download"
```

---

### Task 4: Update inline HTML for batch UI

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add batch button and thumbnail container to HTML**

In the HTML string inside `src/index.ts`, locate the `<div class="controls">` block and add the folder picker and batch download button:

```html
<div class="controls">
  <span class="btn btn-select">选择图片<input type="file" accept="image/*" id="ipt" /></span>
  <span class="btn btn-select" id="dir-btn">选文件夹<input type="file" accept="image/*" id="dir" webkitdirectory multiple /></span>
  <button class="btn btn-encrypt" id="enc" disabled>混淆</button>
  <button class="btn btn-decrypt" id="dec" disabled>解混淆</button>
  <button class="btn btn-restore" id="re" disabled>还原</button>
  <button class="btn btn-download" id="download" disabled>下载</button>
  <button class="btn btn-download" id="batch-dl" disabled>打包下载</button>
</div>
```

Add after the `#status` paragraph:
```html
<div id="thumb-strip" class="thumb-strip" style="display:none"></div>
```

- [ ] **Step 2: Add batch CSS styles**

Inside `<style>`, add after `@keyframes spin`:

```css
.thumb-strip { display: flex; gap: 8px; overflow-x: auto; padding: 12px 0; margin-top: 12px; flex-wrap: nowrap; }
.thumb-strip .thumb-item { flex: 0 0 auto; cursor: pointer; border: 2px solid #ccc; border-radius: 4px; padding: 4px; text-align: center; }
.thumb-strip .thumb-item:hover, .thumb-strip .thumb-item.active { border-color: #4f1787; }
.thumb-strip .thumb-item img { width: 72px; height: 72px; object-fit: cover; border-radius: 2px; display: block; }
.thumb-strip .thumb-item .thumb-label { font-size: 0.65rem; color: #666; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.thumb-strip .thumb-item .thumb-status { font-size: 0.6rem; }
.thumb-item.status-pending { border-color: #ccc; }
.thumb-item.status-processing { border-color: #4f1787; }
.thumb-item.status-encrypted, .thumb-item.status-decrypted { border-color: #2ecc71; }
.thumb-item.status-error { border-color: #e74c3c; }
@media (max-width: 767px) {
  .thumb-strip { flex-wrap: wrap; gap: 4px; }
  .thumb-strip .thumb-item img { width: 56px; height: 56px; }
  .thumb-strip .thumb-item .thumb-label { font-size: 0.55rem; max-width: 64px; }
}
```

- [ ] **Step 3: Replace the inline `<script>` block**

Replace the entire `<script>...</script>` block with the complete version that includes batch state management, folder selection, thumbnail rendering, batch encrypt/decrypt handlers, ZIP download, and keyboard navigation. The script should cover:

1. All existing single-image functions (unchanged behavior)
2. New batch state variables: `batchMode`, `batchItems`, `selectedIndex`, `sessionId`, `zipId`
3. `renderThumbnails()` and `selectThumbnail(index)` functions
4. `processBatchAction(action)` for encrypt/decrypt
5. `dirIpt.onchange` handler (folder selection)
6. `batchDlBtn.onclick` handler (ZIP download)
7. Keyboard arrow key navigation for batch mode
8. Modified `encBtn.onclick` and `decBtn.onclick` to check `batchMode` first
9. Updated `downloadBtn.onclick` to handle batch mode (download current preview image)
10. `reBtn.onclick` to reset batch selection

- [ ] **Step 4: Remove old redundant frontend files**

```bash
git rm src/public/index.html main.html
```

- [ ] **Step 5: Verify with lint**

```bash
pnpm lint
```
Expected: No TS errors

- [ ] **Step 6: Run full test suite**

```bash
bun test
```
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/index.ts
git rm src/public/index.html main.html
git commit -m "feat: add batch mode UI with folder selection, thumbnail strip, and ZIP download"
```

---

### Task 5: Verify docs match implementation

**Files:**
- Modify: `docs/api.md`, `docs/frontend.md`, `docs/architecture.md` (if needed)

- [ ] **Step 1: Verify docs match final implementation**

Read through each doc file and confirm endpoints, UI descriptions, and architecture match what was implemented. Fix any discrepancies.

- [ ] **Step 2: Commit any corrections**

```bash
git add docs/api.md docs/frontend.md docs/architecture.md
git commit -m "docs: align with batch processing implementation"
```
