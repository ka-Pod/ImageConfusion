# Batch Processing — UX Revision Implementation Plan

> **For agentic workers:** Use subagent-driven development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign batch mode UX: encrypt uses multi-image selection (no auto-download), decrypt accepts ZIP upload, thumbnail behavior distinguishes encrypt (grayed/no preview) vs decrypt (previewable).

**Architecture:** Add `extractZipBuffer` to batch.ts for ZIP extraction. Add `POST /api/batch/decrypt-zip` endpoint. Frontend adds multi-image input + ZIP upload input, removes auto-download, updates thumbnail rendering.

**Tech Stack:** archiver (ZIP creation), Node.js built-in `child_process` + `tar` (ZIP extraction), sharp (image processing)

## Global Constraints

- Service-side only processing
- Files use kebab-case naming
- Async/await only, no bare .then()
- `type` not `interface`, strict TypeScript
- No emoji in UI — use text/CSS indicators
- Single page, no frontend framework
- POST method for /api/batch/download (not GET)
- archiver v8: `import { ZipArchive }`, `new ZipArchive()`

---

### Task 1: Add extractZipBuffer to batch.ts

**Files:**
- Modify: `src/batch.ts`
- Test: `src/batch.test.ts`

**Interfaces:**
- Produces: `extractZipBuffer(zipBuffer: Buffer): Promise<{ name: string; buffer: Buffer }[]>`

- [ ] **Step 1: Write the failing tests**

Add to `src/batch.test.ts`:

```ts
describe('extractZipBuffer', () => {
  test('extracts files from a ZIP', async () => {
    const { createZipFile, extractZipBuffer } = await import('./batch')
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
    const { createZipFile, extractZipBuffer } = await import('./batch')
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
    const { createZipFile, extractZipBuffer } = await import('./batch')
    const zipBuffer = await createZipFile([])
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted).toEqual([])
  })

  test('preserves file order', async () => {
    const { createZipFile, extractZipBuffer } = await import('./batch')
    const names = ['c.png', 'a.png', 'b.png']
    const zipBuffer = await createZipFile(names.map(n => ({ name: n, buffer: Buffer.from([1]) })))
    const extracted = await extractZipBuffer(zipBuffer)
    expect(extracted.map(f => f.name)).toEqual(names)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/batch.test.ts
```
Expected: Tests fail because `extractZipBuffer` is not exported

- [ ] **Step 3: Implement extractZipBuffer in batch.ts**

Add to `src/batch.ts`:

```ts
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i

export async function extractZipBuffer(zipBuffer: Buffer): Promise<{ name: string; buffer: Buffer }[]> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'zip-extract-'))
  const zipPath = join(tmpDir, 'input.zip')
  writeFileSync(zipPath, zipBuffer)

  try {
    execSync(`tar -xf "${zipPath}" -C "${tmpDir}"`, { stdio: 'pipe' })

    const { readdirSync } = await import('node:fs')
    const entries = readdirSync(tmpDir).filter(f => f !== 'input.zip')

    const result: { name: string; buffer: Buffer }[] = []
    for (const entry of entries) {
      if (!IMAGE_EXTENSIONS.test(entry)) continue
      result.push({ name: entry, buffer: readFileSync(join(tmpDir, entry)) })
    }

    return result
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}
```

Also need to add `rm` to the existing import from `node:fs/promises`:
```ts
import { mkdir, rm, writeFile, readFile, readdir, stat } from 'node:fs/promises'
```
This is already imported.

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/batch.test.ts
```
Expected: All tests including new extractZipBuffer tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/batch.ts src/batch.test.ts
git commit -m "feat: add extractZipBuffer for ZIP extraction with image filtering"
```

---

### Task 2: Add decrypt-zip API endpoint

**Files:**
- Modify: `src/index.ts`
- Test: `src/index.test.ts`

- [ ] **Step 1: Write the failing integration tests**

Add to `src/index.test.ts` inside a new describe or existing `describe('Batch API')`:

```ts
test('POST /api/batch/decrypt-zip returns JSON with items', async () => {
  const sharp = (await import('sharp')).default

  // Create a test encrypt ZIP
  const pixels = new Uint8Array(4 * 8 * 8)
  for (let i = 0; i < 64; i++) {
    const idx = i * 4
    pixels[idx] = (i * 37) % 256; pixels[idx + 1] = (i * 71) % 256; pixels[idx + 2] = (i * 13) % 256; pixels[idx + 3] = 255
  }
  const imgBuffer = await sharp(Buffer.from(pixels), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer()

  const { createZipFile } = await import('./batch')
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/index.test.ts
```
Expected: New tests FAIL (route not found)

- [ ] **Step 3: Add decrypt-zip route to index.ts**

Add `extractZipBuffer` to the import from batch:
```ts
import { processBatch, getProcessedImage, readManifest, getZipFile, saveZipFile, createZipFile, cleanupSession, startCleanupTimer, extractZipBuffer } from './batch'
```

Add route after the existing `/api/batch/decrypt` route:

```ts
app.post('/api/batch/decrypt-zip', async (c) => {
  try {
    const formData = await c.req.formData()
    const zipFile = formData.get('zip')

    if (!zipFile || !(zipFile instanceof File)) {
      return c.json({ error: '请上传 ZIP 文件' }, 400)
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    const extracted = await extractZipBuffer(zipBuffer)

    if (extracted.length === 0) {
      return c.json({ error: 'ZIP 中未找到图片文件' }, 400)
    }

    const files = extracted.map(f => ({ name: f.name, buffer: f.buffer }))
    const { sessionId, items } = await processBatch(files, 'decrypt')
    await log('INFO', `batch decrypt-zip success: ${items.length} files from ZIP`)

    return c.json({
      sessionId,
      items: items.map(i => ({
        id: i.id,
        originalName: i.originalName,
        processedName: i.processedName,
        ...(i.error ? { error: i.error } : {}),
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch decrypt-zip failed: ${msg}`)
    return c.json({ error: 'ZIP 文件处理失败: ' + msg }, 400)
  }
})
```

- [ ] **Step 4: Run integration tests**

```bash
bun test src/index.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add POST /api/batch/decrypt-zip endpoint for ZIP upload decrypt"
```

---

### Task 3: Update frontend — multi-image select, ZIP upload, remove auto-download

**Files:**
- Modify: `src/index.ts`

**Changes needed:**
1. Add `id="multi"` input with `multiple accept="image/*"` for multi-image encrypt
2. Add `id="zip-upload"` input with `accept=".zip"` for decrypt ZIP
3. Remove auto-download code from `processBatchAction('encrypt')`
4. Update `processBatchAction('encrypt')` to gray out thumbnails (no processedBlob fetch)
5. Add ZIP upload handler that calls `/api/batch/decrypt-zip`
6. Update thumbnail rendering: encrypt = grayed, decrypt = previewable
7. Remove `webkitdirectory` folder picker (or keep as option)
8. Update button layout in controls

- [ ] **Step 1: Read current `src/index.ts` to understand the full HTML**

Read the file to understand the current HTML structure and script.

- [ ] **Step 2: Update the controls HTML section**

Replace the controls div with the new layout:
- Keep "选择图片" (single, `ipt`)
- Add "选多张图片" (multiple, `multi`)
- Keep "选文件夹" (webkitdirectory, `dir`)
- Add "上传ZIP" (zip, `zip-upload`)
- Keep "混淆" / "解混淆" buttons — they double as batch buttons
- Keep "打包下载" (`batch-dl`)
- Keep "还原" / "下载"

- [ ] **Step 3: Update the JavaScript section**

Changes to the `<script>` block:

**a) Remove auto-download code in `processBatchAction('encrypt')`**
Find and remove the block:
```js
// Auto-download ZIP
const dlRes = await fetch('/api/batch/download?zipId=' + zipId)
if (!dlRes.ok) throw new Error('ZIP 下载失败')
const blob = await dlRes.blob()
...
```
After removal, the encrypt handler should just mark items as 'encrypted' and enable batch-dl button.

**b) Fix thumbnail rendering — encrypt vs decrypt**
In `renderThumbnails()`:
- For encrypted items: show gray overlay, no img click
- For decrypted items: show processedBlob, clickable

**c) Add ZIP upload handler**
```js
zipUpload.onchange = async () => {
  if (zipUpload.files.length > 0) {
    const file = zipUpload.files[0]
    status.textContent = '上传 ZIP 中...'
    // ... upload to /api/batch/decrypt-zip
    // ... fetch each /api/batch/image/:id
    // ... render thumbnails
  }
}
```

**d) Ensure "打包下载" button works correctly**
- encrypt mode: `POST /api/batch/download?zipId=${zipId}`
- decrypt mode: `POST /api/batch/download { sessionId, ids }`

- [ ] **Step 4: Verify**

```bash
bun test
bunx tsc --noEmit
```
Expected: All tests PASS, no type errors

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: update frontend — multi-image select, ZIP upload, no auto-download"
```