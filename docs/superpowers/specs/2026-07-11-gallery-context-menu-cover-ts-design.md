# 漫画画廊右键菜单、封面显示与 TS 检查增强设计

## 背景

当前 v2.0.0 已发布漫画画廊基础功能，但存在三个待改进点：

1. **右键菜单缺失**：画廊列表页只能通过点击卡片进入详情页，操作路径较长。
2. **ComicDetailPage 封面占位符**：详情页封面区域显示"封面"文字，未展示真实封面。
3. **IDE/编辑器 TypeScript 报错**：`pnpm lint` 仅运行 `tsc --noEmit`，不检查 Vue 单文件组件模板，导致 IDE 中常见类型问题无法被命令行捕获。

## 目标

- 在画廊网格的漫画卡片上增加右键菜单，提供"查看详情"、"解密阅读"、"删除漫画"三个操作。
- 在漫画详情页显示真实封面（从 `encrypted.zip` 中解密封面页并生成 base64 JPEG）。
- 引入 `vue-tsc` 对 `.vue` 文件做类型检查，修复暴露出的类型与运行时问题。

## 非目标

- 不改造漫画阅读器的整体布局。
- 不新增用户系统或权限控制。
- 不改动核心混淆/解密算法。

## 方案概述

采用**组件化右键菜单**方案：

1. 新建通用 `ContextMenu.vue` 组件。
2. `GalleryPage.vue` 在 comic-grid 的卡片上监听 `contextmenu` 事件，弹出菜单。
3. `getComic` 后端函数生成 `coverBase64`，前端 `ComicDetailPage.vue` 显示封面。
4. 安装 `vue-tsc`，更新 `package.json` 的 `lint` 脚本。
5. 修复 `vue-tsc` 暴露的问题（如 `ReaderPage.vue` 的 blob URL 内存泄漏）。

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
    await decryptAndRead(comic.id)
  } else if (action === 'delete') {
    await deleteComic(comic.id)
  }
}

async function decryptAndRead(id: string) {
  try {
    const res = await fetch(`/api/gallery/${id}/decrypt`, { method: 'POST' })
    if (!res.ok) throw new Error('解密失败')
    const data = await res.json() as { sessionId: string; totalPages: number }
    router.push(`/gallery/${id}/reader?session=${data.sessionId}&total=${data.totalPages}`)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '解密失败', 'error')
  }
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

### 3. ComicDetailPage 封面显示

**后端**：`src/server/gallery-storage.ts`

修改 `getComic` 函数，在返回对象中加入 `coverBase64`：

```typescript
export async function getComic(id: string): Promise<ComicEntry | null> {
  const zipPath = join(getStorageDir(), id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null
  try {
    const files = await extractZipAll(await readFile(zipPath))
    const metaFile = files.find(f => f.name === 'metadata.json')
    if (!metaFile) return null
    const meta: ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
    const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.(jpg|png)$/i.test(f.name))

    let coverBase64 = ''
    const coverFile = imageFiles[meta.coverIndex ?? 0]
    if (coverFile) {
      const raw = await sharp(coverFile.buffer).ensureAlpha().raw().toBuffer()
      const { width = 0, height = 0 } = await sharp(coverFile.buffer).metadata()
      const decrypted = decryptPixels({ data: new Uint8Array(raw), width, height, channels: 4 })
      const jpeg = await sharp(Buffer.from(decrypted), { raw: { width, height, channels: 4 } })
        .resize(250)
        .jpeg({ quality: 70 })
        .toBuffer()
      coverBase64 = jpeg.toString('base64')
    }

    return { id, ...meta, totalPages: imageFiles.length, coverBase64 }
  } catch {
    return null
  }
}
```

**前端**：`src/client/pages/ComicDetailPage.vue`

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

增加 `.cover-image` 样式（与 ComicCard 一致：`width: 100%; height: 100%; object-fit: cover;`）。

### 4. TypeScript 检查增强

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

#### 4.1 ReaderPage.vue blob URL 内存泄漏

当前 `loadPage` 每次都会 `URL.createObjectURL(blob)` 并覆盖 `pageSrc`，旧 URL 未释放。

修复：使用局部变量 `currentObjectUrl` 跟踪当前 URL，切换页面前 `revokeObjectURL`。

```typescript
let currentObjectUrl = ''

async function loadPage(index: number) {
  loading.value = true
  try {
    const res = await fetch(`/api/gallery/decrypt/${sessionId}/page/${index}`)
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
}

onUnmounted(() => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
  cleanup()
})
```

#### 4.2 其他潜在类型问题

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
  → storage.deleteComic 删除目录
  → 成功后 showToast + loadComics() 刷新列表
```

### 封面显示流程

```
用户进入 ComicDetailPage
  → GET /api/gallery/:id
  → gallery-storage.getComic 读取 encrypted.zip
  → 解密 coverIndex 对应页面 → resize → JPEG → base64
  → 返回 coverBase64
  → 前端渲染 <img src="data:image/jpeg;base64,..." />
```

## 错误处理

| 场景 | 处理方式 |
|---|---|
| 右键菜单坐标超出视口 | 由 ContextMenu 组件内部做边界校正（可选，首屏不处理） |
| 删除确认取消 | 不调用 API |
| 删除 API 失败 | showToast 错误信息 |
| 封面解密失败 | 显示"暂无封面"占位符 |
| vue-tsc 报错 | 逐项修复，确保 lint 通过 |

## 测试计划

- 新增 `DELETE` / `decrypt` 通过右键菜单触发的集成测试（在现有 gallery-routes.test.ts 中补充）。
- 新增 `getComic` 返回 `coverBase64` 的单元测试。
- 运行 `pnpm lint`（vue-tsc）和 `bun test` 全部通过。
- 手动验证：右键菜单样式、各操作可用性、详情页封面显示。

## 风险与回退

- `vue-tsc` 可能暴露大量历史类型问题，需要较多修复工作量。如果问题过多，可以先修复与本次改动直接相关的文件，其余问题单独排期。
- 封面解密是同步 CPU 密集型操作，大图可能在详情页加载时略有延迟。当前漫画页通常为几百 KB，可接受。
