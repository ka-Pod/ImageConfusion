# 漫画画廊右键菜单、封面显示与 TS 检查增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为漫画画廊增加右键菜单、修复详情页封面显示、引入 vue-tsc 做 Vue 模板类型检查，并重构存储/阅读流程以支持 300MB–1GB 大文件漫画的按需单页解密与预渲染缓存。

**Architecture:** 保持 `storage/:id/encrypted.zip` 存储格式不变，新增 `storage/:id/cover.jpg` 作为封面缓存；新增 `tmp/previews/:id/` 作为解密页面缓存；新增 `GET /api/gallery/:id/page/:n` 按需从 ZIP 中读取并解密单页；前端阅读器移除 sessionId 依赖，直接按 comicId 翻页。

**Tech Stack:** TypeScript, Bun, Hono, Vue 3, sharp, unzipper, vue-tsc

## Global Constraints

- 使用 TypeScript strict 模式。
- 使用 `type` 而非 `interface` 定义对象类型。
- 函数参数超过 2 个时使用 options 对象。
- 文件名使用 kebab-case。
- 禁止使用 `any`，优先 `unknown`。
- 异步操作使用 `async/await`，禁止裸 `.then()`。
- 新增代码测试覆盖率 ≥ 80%。
- 禁止 mock 核心混淆逻辑进行测试。

---

## File Map

| 文件 | 责任 |
|---|---|
| `src/client/components/common/ContextMenu.vue` | 通用右键菜单组件（新增） |
| `src/client/pages/GalleryPage.vue` | 集成右键菜单，处理菜单操作 |
| `src/server/gallery-storage.ts` | 封面缓存生成、按需读取 ZIP entry、删除时清理预览缓存 |
| `src/server/gallery-routes.ts` | 新增 `GET /api/gallery/:id/page/:n`、改造 `GET /api/gallery/:id`、预取相邻页 |
| `src/client/pages/ReaderPage.vue` | 移除 sessionId，按需请求单页，预取相邻页，修复 blob URL 泄漏 |
| `src/client/pages/ComicDetailPage.vue` | 显示真实封面 |
| `src/server/gallery-storage.test.ts` | 测试封面缓存、按需读取 |
| `src/server/gallery-routes.test.ts` | 测试新 API、预取、删除清理 |
| `package.json` | lint 脚本改为 `vue-tsc --noEmit`，新增 `vue-tsc` 依赖 |
| `src/batch.ts` | 新增 `extractZipEntry` 工具函数 |

---

### Task 1: 安装 vue-tsc 并更新 lint 脚本

**Files:**
- Modify: `package.json`
- Test: `pnpm lint`

**Interfaces:**
- Consumes: 无
- Produces: `pnpm lint` 将运行 `vue-tsc --noEmit`

- [ ] **Step 1: 安装 vue-tsc**

Run:
```bash
cd c:\Users\poden\Desktop\Code\ImageConfusion
pnpm add -D vue-tsc
```

Expected: `vue-tsc` 添加到 `devDependencies`。

- [ ] **Step 2: 更新 package.json lint 脚本**

Modify [package.json](file:///c:/Users/poden/Desktop/Code/ImageConfusion/package.json):

```json
"lint": "vue-tsc --noEmit"
```

- [ ] **Step 3: 运行 lint 查看当前报错**

Run:
```bash
pnpm lint
```

Expected: 输出所有 Vue/TS 类型错误，记录下来用于 Task 8 修复。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add vue-tsc and update lint script"
```

---

### Task 2: 新增 extractZipEntry 工具函数

**Files:**
- Modify: `src/batch.ts`
- Test: `src/batch.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `extractZipEntry(zipPath: string, entryName: string): Promise<Buffer | null>`

- [ ] **Step 1: 编写失败测试**

在 [src/batch.test.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/batch.test.ts) 末尾追加：

```typescript
describe('extractZipEntry', () => {
  test('reads a single entry by name', async () => {
    const { createZipFile, extractZipEntry } = await import('./batch')
    const zipBuffer = await createZipFile([
      { name: 'metadata.json', buffer: Buffer.from('{"name":"test"}') },
      { name: 'page_001.png', buffer: Buffer.from('hello-page') },
    ])
    const tmpPath = join(tmpdir(), `entry-test-${Date.now()}.zip`)
    await writeFile(tmpPath, zipBuffer)

    const meta = await extractZipEntry(tmpPath, 'metadata.json')
    expect(meta?.toString('utf-8')).toBe('{"name":"test"}')

    const page = await extractZipEntry(tmpPath, 'page_001.png')
    expect(page?.toString('utf-8')).toBe('hello-page')

    const missing = await extractZipEntry(tmpPath, 'missing.txt')
    expect(missing).toBeNull()

    await rm(tmpPath, { force: true })
  })
})
```

> 需要在测试文件顶部 import `tmpdir` 和 `writeFile`/`rm` from `node:fs/promises` 和 `node:os`。

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
bun test src/batch.test.ts -t "extractZipEntry"
```

Expected: FAIL，`extractZipEntry is not a function`。

- [ ] **Step 3: 实现 extractZipEntry**

在 [src/batch.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/batch.ts) 中，确保已 import `unzipper`：

```typescript
import unzipper from 'unzipper'
```

然后在 `extractZipAll` 下方添加：

```typescript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
bun test src/batch.test.ts -t "extractZipEntry"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/batch.ts src/batch.test.ts
git commit -m "feat(batch): add extractZipEntry for streaming single-entry reads"
```

---

### Task 3: 保存漫画时预生成封面缓存

**Files:**
- Modify: `src/server/gallery-storage.ts`
- Test: `src/server/gallery-storage.test.ts`

**Interfaces:**
- Consumes: `extractZipEntry(zipPath, entryName)` from Task 2
- Produces: `saveComic` 在保存 ZIP 后写入 `storage/:id/cover.jpg`

- [ ] **Step 1: 编写失败测试**

在 [src/server/gallery-storage.test.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.test.ts) 中新增测试：

```typescript
test('saveComic generates cover.jpg', async () => {
  const { processImageBuffer } = await import('../batch')
  const imgBuffer = await processImageBuffer(testImage, 'encrypt', 'png')
  const zip = await createZipFile([
    { name: 'metadata.json', buffer: Buffer.from(JSON.stringify({ name: 'cover-test', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 })) },
    { name: 'page_001.png', buffer: imgBuffer },
  ])
  const id = await saveComic(zip, { name: 'cover-test', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 })
  const coverPath = join(getStorageDir(), id, 'cover.jpg')
  expect(existsSync(coverPath)).toBe(true)

  const cover = await readFile(coverPath)
  expect(cover[0]).toBe(0xFF)
  expect(cover[1]).toBe(0xD8)
})
```

> 确保测试文件已 import `existsSync` 和 `readFile`。

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
bun test src/server/gallery-storage.test.ts -t "saveComic generates cover.jpg"
```

Expected: FAIL，`cover.jpg` 不存在。

- [ ] **Step 3: 修改 saveComic 生成 cover.jpg**

在 [src/server/gallery-storage.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.ts) 中：

1. import `extractZipEntry`：

```typescript
import { extractZipAll, extractZipEntry } from '../batch'
```

2. 在 `saveComic` 中写入 ZIP 后调用 `generateCover`：

```typescript
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
```

3. 添加 `generateCover` 和 `coverIndexToName`：

```typescript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
bun test src/server/gallery-storage.test.ts -t "saveComic generates cover.jpg"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/server/gallery-storage.ts src/server/gallery-storage.test.ts
git commit -m "feat(gallery): generate cover.jpg on saveComic"
```

---

### Task 4: listComics / getComic 直接读取 cover.jpg 并优化页数统计

**Files:**
- Modify: `src/server/gallery-storage.ts`
- Test: `src/server/gallery-storage.test.ts`

**Interfaces:**
- Consumes: `extractZipEntry` from Task 2, `cover.jpg` from Task 3
- Produces: `listComics` 和 `getComic` 返回 `coverBase64`，不再解压整本 ZIP

- [ ] **Step 1: 修改 listComics**

将 [src/server/gallery-storage.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.ts) 中的 `listComics` 改为：

```typescript
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
```

- [ ] **Step 2: 新增 countPages**

在 [src/server/gallery-storage.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.ts) 中添加：

```typescript
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
```

> 需要 import `unzipper`：
> ```typescript
> import unzipper from 'unzipper'
> ```

- [ ] **Step 3: 修改 getComic**

将 `getComic` 改为：

```typescript
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
```

- [ ] **Step 4: 更新测试**

在 [src/server/gallery-storage.test.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.test.ts) 中修改 `listComics` 和 `getComic` 的断言，验证 `coverBase64` 非空且 `totalPages` 正确。

示例：

```typescript
const comics = await listComics()
expect(comics).toHaveLength(1)
expect(comics[0].totalPages).toBe(1)
expect(comics[0].coverBase64).toBeTruthy()

const comic = await getComic(id)
expect(comic).not.toBeNull()
expect(comic!.totalPages).toBe(1)
expect(comic!.coverBase64).toBeTruthy()
```

- [ ] **Step 5: 运行测试确认通过**

Run:
```bash
bun test src/server/gallery-storage.test.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/server/gallery-storage.ts src/server/gallery-storage.test.ts

git commit -m "perf(gallery): listComics/getComic read cover.jpg and count pages without full extraction"
```

---

### Task 5: 新增 GET /api/gallery/:id/page/:n 按需解密 API

**Files:**
- Modify: `src/server/gallery-routes.ts`
- Modify: `src/server/gallery-storage.ts`（新增 `getOrCreatePage` 等辅助函数）
- Test: `src/server/gallery-routes.test.ts`

**Interfaces:**
- Consumes: `extractZipEntry` from Task 2, `decryptPixels`
- Produces: `GET /api/gallery/:id/page/:n` 返回 JPEG

- [ ] **Step 1: 编写失败测试**

在 [src/server/gallery-routes.test.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-routes.test.ts) 中新增：

```typescript
test('GET /api/gallery/:id/page/:n returns decrypted page', async () => {
  const zipBuffer = await createEncryptedComicZip('page-api-test')
  const id = await storage.saveComic(zipBuffer, { name: 'page-api-test', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 })

  const res = await app.request(`/api/gallery/${id}/page/0`)
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('image/jpeg')
  const buffer = Buffer.from(await res.arrayBuffer())
  expect(buffer[0]).toBe(0xFF)
  expect(buffer[1]).toBe(0xD8)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
bun test src/server/gallery-routes.test.ts -t "GET /api/gallery/:id/page/:n"
```

Expected: FAIL，404 或路由不存在。

- [ ] **Step 3: 在 gallery-storage.ts 新增 getOrCreatePage**

```typescript
export async function getOrCreatePage(id: string, page: number): Promise<Buffer | null> {
  const zipPath = join(getStorageDir(), id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null

  const previewDir = join(process.cwd(), 'tmp', 'previews', id)
  const cachedPath = join(previewDir, `page_${String(page + 1).padStart(3, '0')}.jpg`)
  if (existsSync(cachedPath)) {
    return await readFile(cachedPath)
  }

  const pageBuffer = await extractZipEntry(zipPath, `page_${String(page + 1).padStart(3, '0')}.png`)
  if (!pageBuffer) return null

  const raw = await sharp(pageBuffer).ensureAlpha().raw().toBuffer()
  const { width = 0, height = 0 } = await sharp(pageBuffer).metadata()
  const decrypted = decryptPixels({ data: new Uint8Array(raw), width, height, channels: 4 })
  const jpeg = await sharp(Buffer.from(decrypted), { raw: { width, height, channels: 4 } })
    .jpeg({ quality: 95 })
    .toBuffer()

  await mkdir(previewDir, { recursive: true })
  await writeFile(cachedPath, jpeg)
  return jpeg
}
```

- [ ] **Step 4: 在 gallery-routes.ts 新增路由**

在 [src/server/gallery-routes.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-routes.ts) 中添加：

```typescript
app.get('/api/gallery/:id/page/:n', async (c) => {
  const id = c.req.param('id')
  const page = parseInt(c.req.param('n'), 10)
  if (Number.isNaN(page) || page < 0) return c.json({ error: 'Invalid page' }, 400)

  const jpeg = await getOrCreatePage(id, page)
  if (!jpeg) return c.notFound()

  const totalPages = await getComicTotalPages(id)
  if (totalPages > 0) {
    // 异步预取相邻页
    prefetchPages(id, page, totalPages).catch(() => {})
  }

  return c.body(jpeg, 200, { 'Content-Type': 'image/jpeg' })
})
```

- [ ] **Step 5: 新增辅助函数 getComicTotalPages 和 prefetchPages**

在 [src/server/gallery-storage.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.ts) 中添加：

```typescript
export async function getComicTotalPages(id: string): Promise<number> {
  const zipPath = join(getStorageDir(), id, 'encrypted.zip')
  if (!existsSync(zipPath)) return 0
  return countPages(zipPath)
}

export async function prefetchPages(id: string, current: number, total: number): Promise<void> {
  const targets = [current - 1, current + 1].filter(i => i >= 0 && i < total)
  for (const target of targets) {
    const cachedPath = join(process.cwd(), 'tmp', 'previews', id, `page_${String(target + 1).padStart(3, '0')}.jpg`)
    if (existsSync(cachedPath)) continue
    await getOrCreatePage(id, target)
  }
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:
```bash
bun test src/server/gallery-routes.test.ts -t "GET /api/gallery/:id/page/:n"
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/server/gallery-storage.ts src/server/gallery-routes.ts src/server/gallery-routes.test.ts
git commit -m "feat(gallery): add lazy page decryption API with prefetch"
```

---

### Task 6: 删除漫画时清理预览缓存

**Files:**
- Modify: `src/server/gallery-storage.ts`
- Test: `src/server/gallery-storage.test.ts`

**Interfaces:**
- Consumes: `tmp/previews/:id/` 目录
- Produces: `deleteComic` 同步删除预览缓存

- [ ] **Step 1: 编写失败测试**

在 [src/server/gallery-storage.test.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.test.ts) 中新增：

```typescript
test('deleteComic removes preview cache', async () => {
  const zipBuffer = await createEncryptedComicZip('delete-cache-test')
  const id = await saveComic(zipBuffer, { name: 'delete-cache-test', author: '', source: '', createdAt: new Date().toISOString(), coverIndex: 0 })

  // trigger cache creation
  await getOrCreatePage(id, 0)
  const previewDir = join(process.cwd(), 'tmp', 'previews', id)
  expect(existsSync(previewDir)).toBe(true)

  await deleteComic(id)
  expect(existsSync(previewDir)).toBe(false)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
bun test src/server/gallery-storage.test.ts -t "deleteComic removes preview cache"
```

Expected: FAIL，预览目录仍存在。

- [ ] **Step 3: 修改 deleteComic**

在 [src/server/gallery-storage.ts](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/server/gallery-storage.ts) 中：

```typescript
export async function deleteComic(id: string): Promise<boolean> {
  const dir = join(getStorageDir(), id)
  if (!existsSync(dir)) return false
  await rm(dir, { recursive: true, force: true })
  const previewDir = join(process.cwd(), 'tmp', 'previews', id)
  if (existsSync(previewDir)) {
    await rm(previewDir, { recursive: true, force: true })
  }
  return true
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
bun test src/server/gallery-storage.test.ts -t "deleteComic removes preview cache"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/server/gallery-storage.ts src/server/gallery-storage.test.ts
git commit -m "feat(gallery): deleteComic cleans up preview cache"
```

---

### Task 7: 前端改造 ComicDetailPage 显示封面、ReaderPage 按需翻页

**Files:**
- Modify: `src/client/pages/ComicDetailPage.vue`
- Modify: `src/client/pages/ReaderPage.vue`
- Test: 手动验证 + lint

**Interfaces:**
- Consumes: `GET /api/gallery/:id` 返回 `coverBase64`，`GET /api/gallery/:id/page/:n`
- Produces: ReaderPage 使用 comicId + page 直接请求单页

- [ ] **Step 1: 修改 ComicDetailPage.vue**

在 [src/client/pages/ComicDetailPage.vue](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/client/pages/ComicDetailPage.vue) 中：

替换：
```vue
<div class="cover-placeholder">封面</div>
```

为：
```vue
<img
  v-if="comic.coverBase64"
  :src="`data:image/jpeg;base64,${comic.coverBase64}`"
  :alt="comic.name"
  class="cover-image"
/>
<div v-else class="cover-placeholder">暂无封面</div>
```

在 style 块中添加：
```css
.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 2: 修改 ReaderPage.vue**

在 [src/client/pages/ReaderPage.vue](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/client/pages/ReaderPage.vue) 中：

1. 移除 `sessionId` 相关代码：

```typescript
const comicId = route.params.id as string
const totalPages = ref(parseInt((route.query.total as string) || '0', 10))
const currentPage = ref(0)
const pageSrc = ref('')
const loading = ref(true)

let currentObjectUrl = ''
```

2. 重写 `loadPage`：

```typescript
async function loadPage(index: number) {
  if (index < 0 || index >= totalPages.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/gallery/${comicId}/page/${index}`)
    if (!res.ok) throw new Error('加载页面失败')
    const blob = await res.blob()
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = URL.createObjectURL(blob)
    pageSrc.value = currentObjectUrl
    currentPage.value = index
  } catch (err) {
    pageSrc.value = ''
  } finally {
    loading.value = false
  }
  preloadPage(index - 1)
  preloadPage(index + 1)
}

function preloadPage(index: number) {
  if (index < 0 || index >= totalPages.value) return
  fetch(`/api/gallery/${comicId}/page/${index}`).catch(() => {})
}
```

3. 在 `onUnmounted` 中释放 blob URL：

```typescript
onUnmounted(() => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
  cleanup()
})
```

4. 更新 `PageNav` 的 props，移除 `sessionId` 相关属性（如果存在）。

5. 更新 `ComicPage` 组件的 `loadPage` 调用（如果 PageNav 通过事件触发）。

- [ ] **Step 3: 更新 ComicDetailPage 跳转到 ReaderPage 的链接**

在 [src/client/pages/ComicDetailPage.vue](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/client/pages/ComicDetailPage.vue) 中，把"解密阅读"按钮的跳转改为：

```typescript
function startReading() {
  router.push(`/gallery/${comicId}/reader?total=${comic.value?.totalPages || 0}`)
}
```

- [ ] **Step 4: 运行 lint 和构建检查**

Run:
```bash
pnpm lint
bun test
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/ComicDetailPage.vue src/client/pages/ReaderPage.vue
git commit -m "feat(ui): show real cover and lazy-load reader pages"
```

---

### Task 8: 新增通用右键菜单组件并集成到 GalleryPage

**Files:**
- Create: `src/client/components/common/ContextMenu.vue`
- Modify: `src/client/pages/GalleryPage.vue`
- Test: 手动验证 + lint

**Interfaces:**
- Consumes: 无
- Produces: `ContextMenu` 组件，可在任意页面使用

- [ ] **Step 1: 创建 ContextMenu.vue**

创建文件 [src/client/components/common/ContextMenu.vue](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/client/components/common/ContextMenu.vue)：

```vue
<script setup lang="ts">
export type MenuItem = {
  label: string
  action: string
  danger?: boolean
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: MenuItem[]
}>()

const emit = defineEmits<{
  (e: 'select', action: string): void
  (e: 'close'): void
}>()

function onItemClick(action: string) {
  emit('select', action)
}

function onBackdropClick() {
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="visible" class="context-menu-backdrop" @click="onBackdropClick">
    <div
      class="context-menu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      @click.stop
    >
      <div
        v-for="item in items"
        :key="item.action"
        class="context-menu-item"
        :class="{ danger: item.danger }"
        @click="onItemClick(item.action)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.context-menu {
  position: absolute;
  min-width: 140px;
  background: #fff;
  border: 2px solid #000;
  box-shadow: 4px 4px 0 #000;
  padding: 4px 0;
}
.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
}
.context-menu-item:hover {
  background: #f0f0f0;
}
.context-menu-item.danger:hover {
  background: #ff4444;
  color: #fff;
}
</style>
```

- [ ] **Step 2: 在 GalleryPage.vue 集成右键菜单**

在 [src/client/pages/GalleryPage.vue](file:///c:/Users/poden/Desktop/Code/ImageConfusion/src/client/pages/GalleryPage.vue) 中：

1. import ContextMenu：

```typescript
import ContextMenu, { type MenuItem } from '../components/common/ContextMenu.vue'
```

2. 给漫画卡片添加右键监听：

```vue
<div
  v-for="comic in comics"
  :key="comic.id"
  class="comic-card-wrapper"
  @click="openComic(comic.id)"
  @contextmenu.prevent="openContextMenu($event, comic)"
>
  <ComicCard :comic="comic" />
</div>
```

3. 添加 ContextMenu 组件实例：

```vue
<ContextMenu
  :visible="contextMenu.visible"
  :x="contextMenu.x"
  :y="contextMenu.y"
  :items="menuItems"
  @select="onMenuSelect"
  @close="contextMenu.visible = false"
/>
```

4. 添加状态和方法：

```typescript
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  comic: null as ComicMeta | null,
})

const menuItems: MenuItem[] = [
  { label: '查看详情', action: 'detail' },
  { label: '解密阅读', action: 'read' },
  { label: '删除漫画', action: 'delete', danger: true },
]

function openContextMenu(e: MouseEvent, comic: ComicMeta) {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    comic,
  }
}

async function onMenuSelect(action: string) {
  const comic = contextMenu.value.comic
  contextMenu.value.visible = false
  if (!comic) return

  if (action === 'detail') {
    router.push(`/gallery/${comic.id}/detail`)
  } else if (action === 'read') {
    router.push(`/gallery/${comic.id}/reader?total=${comic.totalPages}`)
  } else if (action === 'delete') {
    if (!confirm(`确定要删除《${comic.name}》吗？此操作不可恢复。`)) return
    try {
      const res = await fetch(`/api/gallery/${comic.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      showToast('漫画已删除', 'success')
      await loadComics()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }
}
```

5. 添加 `.comic-card-wrapper` 样式：

```css
.comic-card-wrapper {
  cursor: pointer;
}
```

- [ ] **Step 3: 运行 lint 和测试**

Run:
```bash
pnpm lint
bun test
```

Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add src/client/components/common/ContextMenu.vue src/client/pages/GalleryPage.vue
git commit -m "feat(ui): add context menu to gallery comic cards"
```

---

### Task 9: 修复 vue-tsc 暴露的类型问题

**Files:**
- 视报错情况而定，可能包括：
  - `src/client/pages/ReaderPage.vue`
  - `src/client/pages/ConfusePage.vue`
  - `src/client/composables/useConfuse.ts`
  - `src/client/types/index.ts`
  - `src/client/components/confuse/ThumbnailSidebar.vue`
- Test: `pnpm lint`

**Interfaces:**
- Consumes: `pnpm lint` 报错
- Produces: `pnpm lint` 通过

- [ ] **Step 1: 运行 lint 收集所有错误**

Run:
```bash
pnpm lint
```

- [ ] **Step 2: 逐个修复错误**

常见修复：
- 在 `src/client/types/index.ts` 中明确 `BatchItem` 的 `fileUrl` / `processedUrl` 类型为 `string | undefined`。
- 在 Vue 模板中避免直接调用 `URL.createObjectURL`，改为在 script 中生成后绑定到 ref。
- 确保事件处理器类型正确（如 `@contextmenu.prevent` 的 handler 签名）。
- 确保 `route.query.total` 等可能为数组的类型做断言。

每修复一个文件运行一次：
```bash
pnpm lint
```

直到无错误。

- [ ] **Step 3: 运行完整测试**

Run:
```bash
bun test
```

Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(types): resolve vue-tsc errors across Vue and TS files"
```

---

### Task 10: 回归验证与文档更新

**Files:**
- Modify: `CHANGELOG.md`, `docs/api.md`, `docs/frontend.md`
- Test: `pnpm lint`, `bun test`, 手动验证

- [ ] **Step 1: 运行完整测试和 lint**

Run:
```bash
pnpm lint
bun test
```

Expected: 全部通过。

- [ ] **Step 2: 更新 CHANGELOG.md**

在 [CHANGELOG.md](file:///c:/Users/poden/Desktop/Code/ImageConfusion/CHANGELOG.md) 顶部添加 v2.1.0（或下一个版本）条目，总结：
- 画廊右键菜单
- 详情页真实封面
- vue-tsc 类型检查
- 大文件按需单页解密与预渲染缓存

- [ ] **Step 3: 更新 API 文档**

在 [docs/api.md](file:///c:/Users/poden/Desktop/Code/ImageConfusion/docs/api.md) 中：
- 更新 `GET /api/gallery/:id` 响应，加入 `coverBase64`
- 新增 `GET /api/gallery/:id/page/:n`
- 废弃 `POST /api/gallery/:id/decrypt`（如果 ReaderPage 不再使用）

- [ ] **Step 4: 更新前端文档**

在 [docs/frontend.md](file:///c:/Users/poden/Desktop/Code/ImageConfusion/docs/frontend.md) 中：
- 新增 `ContextMenu` 组件说明
- 更新 `GalleryPage` 的右键菜单交互
- 更新 `ReaderPage` 的按需加载逻辑

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md docs/api.md docs/frontend.md
git commit -m "docs: update changelog, api, and frontend docs for v2.1.0"
```

---

## Spec Coverage Check

| Spec 需求 | 对应 Task |
|---|---|
| 通用右键菜单组件 | Task 8 |
| GalleryPage 集成右键菜单 | Task 8 |
| 保存漫画时预生成 cover.jpg | Task 3 |
| listComics/getComic 读 cover.jpg | Task 4 |
| 按需单页解密 API | Task 5 |
| 预渲染缓存 + 相邻页预取 | Task 5, Task 6 |
| ReaderPage 改造 | Task 7 |
| ComicDetailPage 封面显示 | Task 7 |
| vue-tsc 引入与类型修复 | Task 1, Task 9 |
| 大文件解压优化（extractZipEntry） | Task 2 |

## Placeholder Scan

- 无 TBD/TODO。
- 所有步骤包含具体代码或命令。
- 文件路径使用绝对路径。

## Type Consistency Check

- `extractZipEntry(zipPath: string, entryName: string): Promise<Buffer | null>` 在 Task 2、3、4、5 中一致使用。
- `coverBase64` 字段在 `ComicEntry` 中已存在，Task 4 中填充。
- `GET /api/gallery/:id/page/:n` 路径和参数在 Task 5、7 中一致。
