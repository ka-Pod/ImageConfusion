# 漫画画廊删除功能 + Storage 保存修复计划

## Summary

为漫画画廊添加删除功能（后端 API + 前端 UI），并修复"服务重启后漫画画廊无漫画"的问题。

## Current State Analysis

### 已确认现状

1. **无删除功能**
   - `src/server/gallery-storage.ts` 提供 `saveComic` / `listComics` / `getComic` / `decryptComic` / `cleanupDecryptSession`，**没有 `deleteComic`**
   - `src/server/gallery-routes.ts` 未暴露任何删除端点
   - 前端 `GalleryPage.vue` 和 `ComicDetailPage.vue` 没有删除按钮

2. **Storage 保存/读取流程**
   - `saveComic(zipBuffer, _meta)` 把 ZIP 写入 `process.cwd()/storage/<id>/encrypted.zip`
   - `_meta` 参数未被使用，仅依赖 ZIP 内部的 `metadata.json`
   - `listComics()` 遍历 `storage/` 目录，解压每个 `encrypted.zip` 读取 `metadata.json`
   - 读取失败时 `catch { continue }` 静默跳过

3. **"重启后无漫画"根因**
   - 测试文件 `src/server/gallery-storage.test.ts` 和 `src/server/gallery-routes.test.ts` 的 `afterAll` 会**删除 `storage/` 下除 `.gitkeep` 外的所有目录**
   - 开发与测试共用同一个 `storage/` 目录，运行 `bun test` 会清空用户数据
   - 此外 `saveComic` 写入过程非原子：如果服务崩溃，可能留下空目录或损坏的 ZIP

## Proposed Changes

### Task 1: 修复 storage 持久化问题

**目标：** 让测试不再污染用户数据，并提升 `saveComic` 的健壮性。

**文件 1: `src/server/gallery-storage.ts`**

- 新增可配置的 `STORAGE_DIR`，默认仍为 `process.cwd()/storage`，但允许通过环境变量覆盖
- 在 `saveComic` 中：
  - 校验 `zipBuffer` 非空
  - 校验 `_meta` 必填字段（`name`、`createdAt`）
  - 先写入临时文件 `encrypted.zip.tmp`，再重命名为 `encrypted.zip`，避免写入中断导致损坏
  - 捕获并记录 `mkdir`/`writeFile` 错误

```typescript
export async function saveComic(zipBuffer: Buffer, meta: ComicMeta): Promise<string> {
  if (!zipBuffer || zipBuffer.length === 0) throw new Error('ZIP 数据为空')
  if (!meta.name) throw new Error('漫画名称不能为空')
  if (!meta.createdAt) throw new Error('创建时间不能为空')

  await ensureStorageDir()
  const id = randomUUID()
  const dir = join(STORAGE_DIR, id)
  await mkdir(dir, { recursive: true })

  const tmpPath = join(dir, 'encrypted.zip.tmp')
  const finalPath = join(dir, 'encrypted.zip')
  try {
    await writeFile(tmpPath, zipBuffer)
    await rename(tmpPath, finalPath)
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
  return id
}
```

- 新增 `deleteComic(id: string): Promise<boolean>`
  - 删除 `storage/<id>/` 整个目录
  - 如果目录不存在返回 `false`
  - 成功返回 `true`

```typescript
export async function deleteComic(id: string): Promise<boolean> {
  const dir = join(STORAGE_DIR, id)
  if (!existsSync(dir)) return false
  await rm(dir, { recursive: true, force: true })
  return true
}
```

**文件 2: `src/server/gallery-storage.test.ts`**

- 将测试存储目录改为 `process.cwd()/storage-test-<uuid>`，避免污染 `storage/`
- 通过环境变量或在 `beforeAll` 中动态设置 `STORAGE_DIR`
- 由于 `STORAGE_DIR` 是模块级常量，需要在 `beforeAll` 中使用 `jest.resetModules()` 或动态 import 重新加载模块
- 在本项目中使用 Bun，可以在测试顶部通过 `process.env.IMAGE_CONFUSION_STORAGE_DIR` 设置，然后动态 import gallery-storage

```typescript
const TEST_STORAGE = join(process.cwd(), `storage-test-${randomUUID()}`)

beforeAll(async () => {
  process.env.IMAGE_CONFUSION_STORAGE_DIR = TEST_STORAGE
  storage = await import('./gallery-storage')
})

afterAll(async () => {
  if (existsSync(TEST_STORAGE)) {
    await rm(TEST_STORAGE, { recursive: true, force: true })
  }
  delete process.env.IMAGE_CONFUSION_STORAGE_DIR
})
```

**文件 3: `src/server/gallery-routes.test.ts`**

- 同样使用独立测试目录，避免污染 `storage/`

### Task 2: 添加后端删除 API

**文件: `src/server/gallery-routes.ts`**

新增端点：

```typescript
api.delete('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id') || ''
    const success = await storage.deleteComic(id)
    if (!success) return c.json({ error: '漫画不存在' }, 404)
    await log('INFO', `gallery delete: ${id}`)
    return c.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `gallery delete failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})
```

### Task 3: 添加前端删除功能

**文件 1: `src/client/pages/GalleryPage.vue`**

- 在 `ComicCard` 上添加删除按钮（或右键菜单，简化方案为按钮）
- 为了避免每个卡片都有删除按钮导致误触，采用"二次确认"方式：
  - 点击卡片进入详情页，删除按钮放在详情页
  - 或在卡片上显示"删除"按钮，点击后弹窗确认

**推荐方案：删除按钮放在 ComicDetailPage**，因为：
- 用户进入详情页后才能看到完整信息，减少误删
- 实现简单

**文件 2: `src/client/pages/ComicDetailPage.vue`**

- 在"开始解密并阅读"按钮旁边或下方添加"删除漫画"按钮
- 点击后弹出确认对话框："确定要删除《xxx》吗？此操作不可恢复。"
- 确认后调用 `DELETE /api/gallery/:id`
- 成功后 `showToast('删除成功')` 并返回 `/gallery`

```typescript
async function handleDelete() {
  if (!comic.value) return
  if (!confirm(`确定要删除《${comic.value.name}》吗？此操作不可恢复。`)) return
  deleting.value = true
  try {
    const res = await fetch(`/api/gallery/${comicId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    showToast('漫画已删除', 'success')
    router.push('/gallery')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
```

- 添加 `deleting` ref 和按钮样式

### Task 4: 更新 API 文档

**文件: `docs/api.md`**

在画廊 API 部分新增：

```markdown
## DELETE /api/gallery/:id

删除指定漫画及其 storage 目录。

**响应：** `200 application/json`
```json
{ "ok": true }
```

**错误：** `404 { "error": "漫画不存在" }`
```

### Task 5: 更新前端文档

**文件: `docs/frontend.md`**

在"画廊页面"章节补充：
- ComicDetailPage 提供"删除漫画"按钮
- 删除前需要用户确认
- 删除后返回画廊列表

### Task 6: 更新测试

**文件 1: `src/server/gallery-storage.test.ts`**

- 新增 `deleteComic` 测试：
  - 保存漫画 → 删除 → 目录不存在
  - 删除不存在的 id → 返回 `false`

**文件 2: `src/server/gallery-routes.test.ts`**

- 新增 `DELETE /api/gallery/:id` 测试：
  - 删除已存在的漫画 → 200
  - 删除不存在的漫画 → 404

## Assumptions & Decisions

1. **删除是物理删除**：直接删除 `storage/<id>/` 目录，不进入回收站。
2. **删除权限**：当前无用户系统，任何人都能删除任何漫画。这是已知限制。
3. **存储目录可配置**：通过环境变量 `IMAGE_CONFUSION_STORAGE_DIR` 覆盖，便于测试隔离。
4. **原子写入**：使用 `.tmp` + `rename` 避免写入中断导致损坏。
5. **删除入口位置**：放在 ComicDetailPage，减少 GalleryPage 卡片上的误触。
6. **不修改批量处理逻辑**：`save-from-batch` 继续调用 `saveComic`，行为不变。

## Verification Steps

1. **单元测试**
   - `bun test src/server/gallery-storage.test.ts` 通过
   - `bun test src/server/gallery-routes.test.ts` 通过
   - 新增 `deleteComic` 和 `DELETE /api/gallery/:id` 测试通过

2. **集成测试**
   - `bun test` 全部通过

3. **lint**
   - `pnpm lint` 通过

4. **端到端验证**
   - 启动服务：`bun run src/index.ts`
   - 在漫画画廊新建一个漫画
   - 进入详情页，点击"删除漫画"，确认
   - 返回画廊列表，该漫画消失
   - 重启服务，确认漫画画廊仍有该漫画（不会被测试清理）
   - 运行 `bun test`，确认测试不会删除 `storage/` 中的用户漫画
