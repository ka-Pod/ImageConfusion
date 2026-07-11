# 漫画画廊右键菜单、封面显示与 TS 检查增强设计

## 背景

当前 v2.0.0 已发布漫画画廊基础功能，但存在三个待改进点：

1. **右键菜单缺失**：画廊列表页只能通过点击卡片进入详情页，操作路径较长。
2. **ComicDetailPage 封面占位符**：详情页封面区域显示"封面"文字，未展示真实封面。
3. **IDE/编辑器 TypeScript 报错**：`pnpm lint` 仅运行 `tsc --noEmit`，不检查 Vue 单文件组件模板，导致 IDE 中常见类型问题无法被命令行捕获。

此外，用户反馈漫画文件可能达到 **300MB 至 1GB**。当前实现把整个漫画打包成一个 `encrypted.zip`，并在 `listComics`、`getComic`、`decryptComic` 中全量解压到内存，内存占用与文件大小成正比，无法支撑大文件。

## 目标

- 在画廊网格的漫画卡片上增加右键菜单，提供"查看详情"、"解密阅读"、"删除漫画"三个操作。
- 在漫画详情页显示真实封面，且**不需要每次打开都解压整本漫画**。
- 引入 `vue-tsc` 对 `.vue` 文件做类型检查，修复暴露出的类型与运行时问题。
- **支持大文件漫画**：阅读器改为按需单页解密，并配合预渲染/缓存机制优化翻页体验。

## 非目标

- 不改造漫画阅读器的整体布局。
- 不新增用户系统或权限控制。
- 不改动核心混淆/解密算法。
- 不更换底层 ZIP 库。

## 方案概述

采用 **C2 + 预渲染缓存** 方案：

1. 新建通用 `ContextMenu.vue` 组件。
2. `GalleryPage.vue` 在 comic-grid 的卡片上监听 `contextmenu` 事件，弹出菜单。
3. **保存漫画时预生成 `cover.jpg`**：`saveComic` 解压 ZIP 仅读取封面页，解密后写入 `storage/:id/cover.jpg`。
4. `listComics`、`getComic`、`ComicDetailPage` 直接读取 `cover.jpg`，不再解压 ZIP。
5. **阅读器改为按需单页解密**：新增 `GET /api/gallery/:id/page/:n`，从 ZIP 中定位第 n 页并实时解密返回。
6. **预渲染缓存**：后端维护一个 `tmp/previews/:id/` 目录，首次解密某页后缓存为 JPEG；后续请求同一页直接读取缓存，并支持相邻页预取。
7. 安装 `vue-tsc`，更新 `package.json` 的 `lint` 脚本，修复暴露的类型问题。

## 详细设计

### 1. 通用右键菜单组件

**文件**：`src/client/components/common/ContextMenu.vue`

```typescript
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
```

**行为**：

- 根据 `x`、`y` 绝对定位显示。
- 点击菜单项触发 `select` 事件并自动关闭。
- 点击菜单外部或按 `Esc` 触发 `close` 事件。
- 菜单项按传入顺序渲染，`danger` 项使用红色 hover 样式。

**样式**：延续 neo-brutalist 风格：白底、2px 黑边框、阴影、hover 时背景变化。

### 2. GalleryPage 右键菜单集成

**文件**：`src/client/pages/GalleryPage.vue`

在每个漫画卡片外层监听右键事件：

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

状态管理：

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
    await startReader(comic.id, comic.totalPages)
  } else if (action === 'delete') {
    await deleteComic(comic.id)
  }
}

async function startReader(id: string, totalPages: number) {
  router.push(`/gallery/${id}/reader?total=${totalPages}`)
}

async function deleteComic(id: string) {
  const comic = contextMenu.value.comic
  if (!comic) return
  if (!confirm(`确定要删除《${comic.name}》吗？此操作不可恢复。`)) return
  try {
    const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    showToast('漫画已删除', 'success')
    await loadComics()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '删除失败', 'error')
  }
}
```

> 注意：解密阅读不再依赖 `/api/gallery/:id/decrypt` 预解密整本，而是直接跳转到 ReaderPage，由阅读器按需加载页面。

### 3. 保存漫画时预生成封面

**文件**：`src/server/gallery-storage.ts`

`saveComic` 在写入 `encrypted.zip` 后，仅读取封面页并生成 `cover.jpg`：

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

新增 `extractZipEntry` 工具函数，只读取 ZIP 中指定文件：

```typescript
async function extractZipEntry(zipPath: string, entryName: string): Promise<Buffer | null> {
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

> 使用 `unzipper.Open.file(zipPath)` 而不是 `Open.buffer(zipBuffer)`，**避免把整个 ZIP 读入内存**。

### 4. listComics / getComic 直接读取 cover.jpg

**修改 `listComics`**：

```typescript
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
```

新增 `countPages`：只读取 ZIP 目录结构，不解压内容：

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

**修改 `getComic`**：

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

### 5. 阅读器按需单页解密

#### 新增 API：`GET /api/gallery/:id/page/:n`

**文件**：`src/server/gallery-routes.ts`

```typescript
app.get('/api/gallery/:id/page/:n', async (c) => {
  const id = c.req.param('id')
  const page = parseInt(c.req.param('n'), 10)
  const zipPath = join(getStorageDir(), id, 'encrypted.zip')
  if (!existsSync(zipPath)) return c.notFound()

  const cachedPath = join(process.cwd(), 'tmp', 'previews', id, `page_${String(page + 1).padStart(3, '0')}.jpg`)
  if (existsSync(cachedPath)) {
    return c.body(await readFile(cachedPath), 200, { 'Content-Type': 'image/jpeg' })
  }

  const pageBuffer = await extractZipEntry(zipPath, `page_${String(page + 1).padStart(3, '0')}.png`)
  if (!pageBuffer) return c.notFound()

  const raw = await sharp(pageBuffer).ensureAlpha().raw().toBuffer()
  const { width = 0, height = 0 } = await sharp(pageBuffer).metadata()
  const decrypted = decryptPixels({ data: new Uint8Array(raw), width, height, channels: 4 })
  const jpeg = await sharp(Buffer.from(decrypted), { raw: { width, height, channels: 4 } })
    .jpeg({ quality: 95 })
    .toBuffer()

  await mkdir(join(process.cwd(), 'tmp', 'previews', id), { recursive: true })
  await writeFile(cachedPath, jpeg)

  return c.body(jpeg, 200, { 'Content-Type': 'image/jpeg' })
})
```

#### 预渲染/预取机制

当阅读器请求第 `n` 页时，后端可以**同步**解密并返回当前页，然后**异步**预解密相邻页（如 `n-1`、`n+1`）到 `tmp/previews/:id/`：

```typescript
// 在返回当前页后，不 await，让相邻页预取在后台进行
prefetchPages(zipPath, id, page, totalPages).catch(() => {})
```

预取函数：

```typescript
async function prefetchPages(zipPath: string, id: string, current: number, total: number): Promise<void> {
  const targets = [current - 1, current + 1].filter(i => i >= 0 && i < total)
  for (const target of targets) {
    const cachedPath = join(process.cwd(), 'tmp', 'previews', id, `page_${String(target + 1).padStart(3, '0')}.jpg`)
    if (existsSync(cachedPath)) continue
    await getOrCreatePage(zipPath, id, target)
  }
}
```

#### 清理机制

- 删除漫画时，同步删除 `tmp/previews/:id/` 目录。
- 启动时清理过期的 `tmp/previews/` 目录（可选，可复用现有的清理定时器逻辑）。

### 6. ReaderPage.vue 改造

**文件**：`src/client/pages/ReaderPage.vue`

- 移除 `sessionId` 依赖
- 使用 `comicId` 和 `currentPage` 直接请求 `/api/gallery/:id/page/:n`
- 预取相邻页：前端同时请求 `currentPage-1`、`currentPage`、`currentPage+1`
- 修复 blob URL 内存泄漏

```vue
<script setup lang="ts">
const route = useRoute()
const comicId = route.params.id as string
const totalPages = ref(parseInt((route.query.total as string) || '0', 10))
const currentPage = ref(0)
const pageSrc = ref('')
const loading = ref(true)

let currentObjectUrl = ''

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
  // 前端预取相邻页
  preloadPage(index - 1)
  preloadPage(index + 1)
}

function preloadPage(index: number) {
  if (index < 0 || index >= totalPages.value) return
  fetch(`/api/gallery/${comicId}/page/${index}`).catch(() => {})
}

onUnmounted(() => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
})

onMounted(() => loadPage(0))
</script>
```

### 7. ComicDetailPage 封面显示

**文件**：`src/client/pages/ComicDetailPage.vue`

替换占位符：

```vue
<div class="cover-frame">
  <img
    v-if="comic.coverBase64"
    :src="`data:image/jpeg;base64,${comic.coverBase64}`"
    :alt="comic.name"
    class="cover-image"
  />
  <div v-else class="cover-placeholder">暂无封面</div>
</div>
```

增加 `.cover-image` 样式：`width: 100%; height: 100%; object-fit: cover;`。

### 8. TypeScript 检查增强

**安装依赖**：

```bash
pnpm add -D vue-tsc
```

**更新 `package.json`**：

```json
"lint": "vue-tsc --noEmit"
```

> `vue-tsc` 会同时检查 `.ts` 和 `.vue` 文件，原 `tsc --noEmit` 可以移除。

**预期暴露的问题与修复**：

#### 8.1 ReaderPage.vue blob URL 内存泄漏

已在第 6 节修复。

#### 8.2 其他潜在类型问题

- `src/client/types/index.ts` 中 `BatchItem` 的 `fileUrl` / `processedUrl` 类型。
- Vue 模板中 `URL.createObjectURL` 等全局 API 的使用。
- 事件处理器类型（如 `@contextmenu.prevent` 的 handler）。

这些问题将在实施阶段根据 `vue-tsc` 的具体报错逐项修复。

## 数据流

### 右键菜单删除流程

```
用户右键漫画卡片
  → GalleryPage.openContextMenu 记录 comic 和坐标
  → ContextMenu 渲染
  → 用户点击"删除漫画"
  → GalleryPage.onMenuSelect('delete')
  → confirm 确认
  → DELETE /api/gallery/:id
  → storage.deleteComic 删除 storage/:id/ 目录
  → 同步删除 tmp/previews/:id/
  → 成功后 showToast + loadComics() 刷新列表
```

### 封面显示流程

```
用户进入 ComicDetailPage
  → GET /api/gallery/:id
  → gallery-storage.getComic 读取 storage/:id/cover.jpg
  → 返回 coverBase64
  → 前端渲染 <img src="data:image/jpeg;base64,..." />
```

### 按需阅读流程

```
用户进入 ReaderPage
  → loadPage(0)
  → GET /api/gallery/:id/page/0
  → 后端从 encrypted.zip 读取 page_001.png
  → 解密 → JPEG → 写入 tmp/previews/:id/page_001.jpg
  → 返回 JPEG
  → 前端显示
  → 异步预取 page_002

用户翻到第 n 页
  → 若 tmp/previews/:id/page_nnn.jpg 已存在，直接返回
  → 否则实时解密并缓存
```

## 错误处理

| 场景 | 处理方式 |
|---|---|
| 右键菜单坐标超出视口 | 由 ContextMenu 组件内部做边界校正（可选，首屏不处理） |
| 删除确认取消 | 不调用 API |
| 删除 API 失败 | showToast 错误信息 |
| 封面生成失败 | 显示"暂无封面"占位符，不影响漫画保存 |
| 某页解密失败 | 显示占位图或错误提示，不影响其他页 |
| vue-tsc 报错 | 逐项修复，确保 lint 通过 |

## 测试计划

- 新增 `ContextMenu.vue` 渲染测试（可选）。
- 新增 `saveComic` 生成 `cover.jpg` 的单元测试。
- 新增 `GET /api/gallery/:id/page/:n` 按需解密测试。
- 新增相邻页预取测试（验证缓存文件生成）。
- 新增 `deleteComic` 同时删除 `tmp/previews/:id/` 的测试。
- 运行 `pnpm lint`（vue-tsc）和 `bun test` 全部通过。
- 手动验证：右键菜单样式与功能、详情页封面、阅读器翻页。

## 风险与回退

- `vue-tsc` 可能暴露大量历史类型问题，需要较多修复工作量。如果问题过多，可以先修复与本次改动直接相关的文件，其余问题单独排期。
- 大文件漫画首次打开某页时仍有解密耗时，但仅与单页大小相关，不再与整本大小相关。
- `tmp/previews/` 可能占用额外磁盘空间，删除漫画和定期清理机制可以缓解。
