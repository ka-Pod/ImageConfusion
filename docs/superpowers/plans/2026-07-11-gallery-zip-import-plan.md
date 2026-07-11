# Gallery ZIP 导入修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复漫画画廊上传 batch 加密 ZIP 时被二次加密的问题，使 Gallery 仅接收加密 ZIP 并直接导入。

**Architecture:** 后端 `/api/gallery/create` 改为只接收单个 `zip` 字段；若 ZIP 含 `metadata.json` 直接导入，否则补写 `metadata.json` 并重新打包。前端 `NewComicModal.vue` 限制只选 `.zip`，本地检测 metadata.json 后动态控制 `name` 必填状态。

**Tech Stack:** TypeScript, Hono, Vue 3, sharp, unzipper, archiver, bun:test

## Global Constraints

- 所有图像处理在服务端完成
- 使用 TypeScript strict 模式
- 使用 `type` 而非 `interface` 定义对象类型
- 文件名使用 kebab-case
- 禁止使用 `any`，优先 `unknown`
- 异步操作使用 `async/await`，禁止裸 `.then()`
- 新增代码测试覆盖率 ≥ 80%
- 核心算法禁止 mock，需测试真实像素排列结果
- 运行 `pnpm lint` 和 `bun test` 通过后方可提交

---

## File Structure

| 文件 | 变更 | 职责 |
|---|---|---|
| `src/server/gallery-routes.ts` | 修改 | `/api/gallery/create` 改为仅接收 ZIP，不再二次加密 |
| `src/client/components/gallery/NewComicModal.vue` | 修改 | 限制文件输入为 `.zip`，检测 metadata.json，条件必填 name |
| `src/server/gallery-routes.test.ts` | 修改 | 新增 ZIP 导入测试，调整旧测试 |

---

## Task 1: 重构后端 `/api/gallery/create`

**Files:**
- Modify: `src/server/gallery-routes.ts:12-70`
- Test: `src/server/gallery-routes.test.ts`

**Interfaces:**
- Consumes: `extractZipAll(zipBuffer: Buffer): Promise<{name: string; buffer: Buffer}[]>` from `../batch`
- Consumes: `createZipFile(files: {name: string; buffer: Buffer}[]): Promise<Buffer>` from `../batch`
- Consumes: `storage.saveComic(zipBuffer: Buffer, meta: ComicMeta): Promise<string>` from `./gallery-storage`
- Produces: `/api/gallery/create` 接收字段从 `image[]` 变为单个 `zip`
- Produces: 响应 `{ id: string; name: string; totalPages: number }`

- [ ] **Step 1: 修改 `/api/gallery/create` 只接收 `zip` 字段**

```typescript
api.post('/create', async (c: Context) => {
  try {
    const formData = await c.req.formData()
    const zipFile = formData.get('zip')
    const name = (formData.get('name') as string) || ''
    const author = (formData.get('author') as string) || ''
    const source = (formData.get('source') as string) || ''

    if (!(zipFile instanceof File)) {
      return c.json({ error: '请上传 ZIP 文件' }, 400)
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    const extracted = await extractZipAll(zipBuffer)

    const metaFile = extracted.find(f => f.name === 'metadata.json')
    if (metaFile) {
      const existingMeta: storage.ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
      const imageFiles = extracted.filter(f => f.name.startsWith('page_') && /\.(jpg|png)$/i.test(f.name))
      const id = await storage.saveComic(zipBuffer, existingMeta)
      await log('INFO', `gallery import: ${existingMeta.name} (${id})`)
      return c.json({ id, name: existingMeta.name, totalPages: imageFiles.length })
    }

    if (!name.trim()) {
      return c.json({ error: '请输入漫画名称' }, 400)
    }

    const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i
    const imageFiles = extracted
      .filter(f => IMAGE_EXTENSIONS.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (imageFiles.length === 0) {
      return c.json({ error: 'ZIP 内未找到图片' }, 400)
    }

    const pageFiles = imageFiles.map((f, i) => ({
      name: `page_${String(i + 1).padStart(3, '0')}.png`,
      buffer: f.buffer,
    }))

    const meta: storage.ComicMeta = {
      name,
      author,
      source,
      createdAt: new Date().toISOString(),
      coverIndex: 0,
    }

    const newZipBuffer = await createZipFile([
      { name: 'metadata.json', buffer: Buffer.from(JSON.stringify(meta, null, 2)) },
      ...pageFiles,
    ])

    const id = await storage.saveComic(newZipBuffer, meta)
    await log('INFO', `gallery create: ${name} (${id})`)
    return c.json({ id, name, totalPages: pageFiles.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `gallery create failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})
```

- [ ] **Step 2: 移除不再使用的导入**

`src/server/gallery-routes.ts` 顶部导入中移除 `processImageBuffer` 和 `extractZipBuffer`（保留 `extractZipAll` 和 `createZipFile`）。

```typescript
import { createZipFile, extractZipAll } from '../batch'
```

- [ ] **Step 3: 运行 lint 检查**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/server/gallery-routes.ts
git commit -m "fix(gallery): /api/gallery/create only imports encrypted ZIP without re-encrypting"
```

---

## Task 2: 改造前端 `NewComicModal.vue`

**Files:**
- Modify: `src/client/components/gallery/NewComicModal.vue`
- Test: `src/server/gallery-routes.test.ts`（集成测试覆盖新接口字段）

**Interfaces:**
- Consumes: 浏览器原生 `FileReader` + `Array.prototype.reduce` 读取 ZIP 内文件列表
- Produces: `FormData` 字段从 `image[]` 变为单个 `zip`
- Produces: 事件 `created` 和 `close` 保持不变

- [ ] **Step 1: 添加本地 ZIP 读取辅助函数**

在 `<script setup>` 内新增：

```typescript
const zipHasMetadata = ref(false)

async function checkZipHasMetadata(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        // 简化的 ZIP 文件名检测：查找 metadata.json 的 central directory 文件名
        const text = new TextDecoder('utf-8').decode(data)
        resolve(text.includes('metadata.json'))
      } catch {
        reject(new Error('无法读取 ZIP'))
      }
    }
    reader.onerror = () => reject(new Error('读取 ZIP 失败'))
    reader.readAsArrayBuffer(file)
  })
}
```

> 说明：使用字符串扫描是因为 ZIP 文件名在 central directory 中以明文存储，`metadata.json` 作为一个完整文件名出现。避免引入额外依赖。

- [ ] **Step 2: 修改 `handleFileSelect` 逻辑**

```typescript
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    files.value = []
    zipHasMetadata.value = false
    return
  }
  const file = input.files[0]
  files.value = [file]
  try {
    zipHasMetadata.value = await checkZipHasMetadata(file)
    if (zipHasMetadata.value) {
      name.value = ''
    }
  } catch {
    zipHasMetadata.value = false
  }
}
```

- [ ] **Step 3: 修改 `handleCreate` 提交字段**

```typescript
async function handleCreate() {
  if (files.value.length === 0) {
    showToast('请上传 ZIP 文件', 'error')
    return
  }
  if (!zipHasMetadata.value && !name.value.trim()) {
    showToast('请输入漫画名称', 'error')
    return
  }
  uploading.value = true
  try {
    const form = new FormData()
    if (name.value.trim()) {
      form.append('name', name.value.trim())
    }
    form.append('author', author.value)
    form.append('source', source.value)
    form.append('zip', files.value[0])
    const res = await fetch('/api/gallery/create', { method: 'POST', body: form })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: '请求失败' }))
      throw new Error(errData.error || '创建失败')
    }
    showToast('漫画创建成功', 'success')
    emit('created')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '创建失败', 'error')
  } finally {
    uploading.value = false
  }
}
```

- [ ] **Step 4: 修改模板**

```vue
<div class="form-group">
  <label>漫画名称 {{ zipHasMetadata ? '' : '*' }}</label>
  <input
    v-model="name"
    type="text"
    placeholder="输入漫画名称"
    class="input"
    :disabled="zipHasMetadata"
  />
  <p v-if="zipHasMetadata" class="hint">已检测到漫画元数据，将直接导入</p>
</div>

<div class="form-group">
  <label>上传加密 ZIP *</label>
  <input type="file" accept=".zip" class="input" @change="handleFileSelect" />
</div>

<div v-if="files.length > 0" class="file-count">
  已选择 {{ files[0].name }}
</div>
```

- [ ] **Step 5: 添加提示样式**

```css
.hint {
  font-size: 0.75rem;
  color: var(--muted-fg);
  margin-top: 0.25rem;
}
```

- [ ] **Step 6: 运行 lint 检查**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add src/client/components/gallery/NewComicModal.vue
git commit -m "feat(gallery): NewComicModal only accepts encrypted ZIP and detects metadata"
```

---

## Task 3: 更新测试

**Files:**
- Modify: `src/server/gallery-routes.test.ts`

**Interfaces:**
- Consumes: `/api/gallery/create` 新接口（`zip` 字段）
- Consumes: `createZipFile`, `processImageBuffer` from `../batch`
- Produces: 新增测试用例覆盖 ZIP 导入两种分支

- [ ] **Step 1: 重构原有 `/api/gallery/create` 测试**

原有"上传图片创建漫画"的测试需要改为"上传原始图片 ZIP 创建漫画"或删除（因为 Gallery 不再接收图片）。由于新的 `/api/gallery/create` 只接收加密 ZIP，原有图片上传测试应改为：

1. 构建一个不含 `metadata.json` 的加密图片 ZIP
2. 上传后验证创建成功
3. 解密验证图片正确

- [ ] **Step 2: 新增不含 metadata 的 ZIP 导入测试**

```typescript
test('POST /api/gallery/create imports encrypted ZIP without metadata', async () => {
  const pixels = new Uint8Array(4 * 8 * 8)
  for (let i = 0; i < 64; i++) {
    const idx = i * 4
    pixels[idx] = (i * 37) % 256
    pixels[idx + 1] = (i * 71) % 256
    pixels[idx + 2] = (i * 13) % 256
    pixels[idx + 3] = 255
  }
  const imgBuffer = await sharp(Buffer.from(pixels), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer()
  const encrypted = await processImageBuffer(imgBuffer, 'encrypt', 'png')

  const zipBuffer = await createZipFile([
    { name: 'encrypt_page1.png', buffer: encrypted },
    { name: 'encrypt_page2.png', buffer: encrypted },
  ])

  const form = new FormData()
  form.append('zip', new Blob([zipBuffer], { type: 'application/zip' }), 'encrypt_results.zip')
  form.append('name', '导入加密漫画')

  const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.id).toBeDefined()
  expect(body.name).toBe('导入加密漫画')
  expect(body.totalPages).toBe(2)

  const decRes = await app.request(`/api/gallery/${body.id}/decrypt`, { method: 'POST' })
  expect(decRes.status).toBe(200)
})
```

- [ ] **Step 3: 新增含 metadata 的 ZIP 导入测试**

```typescript
test('POST /api/gallery/create imports ZIP with metadata directly', async () => {
  const zipBuffer = await createTestZipBuffer()

  const form = new FormData()
  form.append('zip', new Blob([zipBuffer], { type: 'application/zip' }), 'existing_comic.zip')

  const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.id).toBeDefined()
  expect(body.name).toBe('API测试漫画')
  expect(body.totalPages).toBe(2)
})
```

- [ ] **Step 4: 更新错误测试**

原有"without images returns 400"改为"without zip returns 400"：

```typescript
test('POST /api/gallery/create without zip returns 400', async () => {
  const form = new FormData()
  form.append('name', '测试')
  const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
  expect(res.status).toBe(400)
})
```

原有"without name returns 400"需要限定为 ZIP 不含 metadata 的情况：

```typescript
test('POST /api/gallery/create without name and no metadata returns 400', async () => {
  const { createZipFile } = await import('../batch')
  const zipBuffer = await createZipFile([{ name: 'page.png', buffer: Buffer.from([1, 2, 3]) }])
  const form = new FormData()
  form.append('zip', new Blob([zipBuffer], { type: 'application/zip' }), 'no_meta.zip')
  const res = await app.request('/api/gallery/create', { method: 'POST', body: form })
  expect(res.status).toBe(400)
})
```

- [ ] **Step 5: 运行测试**

Run: `bun test src/server/gallery-routes.test.ts`
Expected: 全部通过

- [ ] **Step 6: 运行完整测试套件**

Run: `bun test`
Expected: 全部通过

- [ ] **Step 7: Commit**

```bash
git add src/server/gallery-routes.test.ts
git commit -m "test(gallery): update create endpoint tests for ZIP-only import"
```

---

## Task 4: 回归验证与清理

- [ ] **Step 1: 运行 lint**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 2: 运行完整测试**

Run: `bun test`
Expected: 全部通过

- [ ] **Step 3: 验证端到端流程**

1. 启动服务：`bun run --hot src/index.ts`
2. 在 ConfusePage 批量混淆图片，下载 `encrypt_results.zip`
3. 在 GalleryPage 点击"新建漫画"，上传该 ZIP
4. 进入漫画详情，点击"解密阅读"
5. 期望：页面显示原始清晰图片，而非混淆图

- [ ] **Step 4: 最终 Commit（如只做验证无变更则跳过）**

---

## Self-Review

### Spec Coverage Check

| Spec Section | Implementing Task |
|---|---|
| Gallery 只接收 ZIP | Task 1 + Task 2 |
| ZIP 含 metadata 直接导入 | Task 1 Step 1 |
| ZIP 不含 metadata 补写并保存 | Task 1 Step 1 |
| 不再二次加密 | Task 1 Step 1 |
| NewComicModal 限制 `.zip` | Task 2 Step 4 |
| 本地检测 metadata.json | Task 2 Step 1-2 |
| name 条件必填 | Task 2 Step 3 |
| 错误处理 | Task 1 Step 1 + Task 3 Step 4 |
| 测试覆盖 | Task 3 |

### Placeholder Scan

- 无 TBD/TODO
- 无 "add appropriate error handling" 等模糊描述
- 每个代码步骤都包含完整代码
- 每个命令都有预期输出

### Type Consistency

- `/api/gallery/create` 始终返回 `{ id, name, totalPages }`
- `ComicMeta` 类型沿用 `src/server/gallery-storage.ts` 的导出定义
- 前端 `FormData` 字段统一为 `zip`（后端对应读取）
