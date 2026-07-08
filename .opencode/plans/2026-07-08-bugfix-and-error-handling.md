# Bug 修复与错误提示改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 4 个已确认的 Bug 并添加分类错误提示机制

**Architecture:** 
- 后端：清理 ZIP 路径、统一 API 返回格式、添加错误清理逻辑
- 前端：修复内存泄漏、实现分类错误提示系统

**Tech Stack:** TypeScript, Hono, Bun, sharp, archiver/unzipper

## Global Constraints

- TypeScript strict 模式
- 使用 `type` 而非 `interface`
- 禁止 `any`，优先 `unknown`
- 文件名 kebab-case
- 异步操作使用 `async/await`

---

## Task 1: 修复 ZIP 文件路径处理问题

**Files:**
- Modify: `src/batch.ts:89-110`

**Interfaces:**
- Consumes: `unzipper.Open.buffer()` 返回的文件对象
- Produces: 清理后的文件名（不含目录前缀）

- [ ] **Step 1: 在 batch.ts 的 extractZipBuffer 中清理文件名**

修改 `src/batch.ts:103`，将：
```typescript
result.push({ name: file.path, buffer: Buffer.concat(chunks) })
```
改为：
```typescript
const fileName = file.path.split('/').pop() || file.path
result.push({ name: fileName, buffer: Buffer.concat(chunks) })
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test src/batch.test.ts`
Expected: 所有测试通过

- [ ] **Step 3: 添加 ZIP 路径测试用例**

在 `src/batch.test.ts` 中添加测试：
```typescript
test('extractZipBuffer handles subdirectory paths', async () => {
  // 创建包含子目录的 ZIP 进行测试
  // 验证提取后的文件名不含目录前缀
})
```

- [ ] **Step 4: 运行完整测试**

Run: `bun test`
Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/batch.ts src/batch.test.ts
git commit -m "fix: clean ZIP file paths to remove directory prefixes"
```

---

## Task 2: 修复批量加密后缺少 id 字段

**Files:**
- Modify: `src/routes.ts:97-100`

**Interfaces:**
- Consumes: `processBatch()` 返回的 items
- Produces: 包含 id 字段的 JSON 响应

- [ ] **Step 1: 修改 /batch/encrypt 返回格式**

修改 `src/routes.ts:97-100`，将：
```typescript
return c.json({
  zipId: sessionId,
  items: items.map(i => ({ originalName: i.originalName, processedName: i.processedName, ...(i.error ? { error: i.error } : {}) })),
})
```
改为：
```typescript
return c.json({
  zipId: sessionId,
  items: items.map(i => ({ id: i.id, originalName: i.originalName, processedName: i.processedName, ...(i.error ? { error: i.error } : {}) })),
})
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test src/index.test.ts`
Expected: API 测试通过

- [ ] **Step 3: 添加返回格式测试**

在 `src/index.test.ts` 中添加测试，验证 `/batch/encrypt` 返回包含 id 字段

- [ ] **Step 4: 运行完整测试**

Run: `bun test`
Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/routes.ts src/index.test.ts
git commit -m "fix: add id field to batch encrypt response"
```

---

## Task 3: 修复 ZIP 上传失败时缺少清理逻辑

**Files:**
- Modify: `src/routes.ts:134-168`

**Interfaces:**
- Consumes: `sessionId`, `cleanupSession()`
- Produces: 错误时清理临时目录

- [ ] **Step 1: 在 /batch/decrypt-zip 错误处理中添加清理**

修改 `src/routes.ts:134-168`，重构为：
```typescript
api.post('/batch/decrypt-zip', async (c) => {
  let sessionId: string | null = null
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
    const result = await processBatch(files, 'decrypt')
    sessionId = result.sessionId
    await log('INFO', `batch decrypt-zip success: ${result.items.length} files from ZIP`)

    return c.json({
      sessionId: result.sessionId,
      items: result.items.map(i => ({
        id: i.id,
        originalName: i.originalName,
        processedName: i.processedName,
        ...(i.error ? { error: i.error } : {}),
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `batch decrypt-zip failed: ${msg}`)
    if (sessionId) {
      await cleanupSession(sessionId).catch(() => {})
    }
    return c.json({ error: 'ZIP 文件处理失败: ' + msg }, 400)
  }
})
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test src/index.test.ts`
Expected: API 测试通过

- [ ] **Step 3: 添加清理逻辑测试**

在 `src/index.test.ts` 中添加测试，验证失败时 session 被清理

- [ ] **Step 4: 运行完整测试**

Run: `bun test`
Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/routes.ts src/index.test.ts
git commit -m "fix: cleanup session on ZIP upload failure"
```

---

## Task 4: 修复前端内存泄漏

**Files:**
- Modify: `src/ui.ts:695-721`

**Interfaces:**
- Consumes: 批量下载 blob
- Produces: 正确释放 blob URL

- [ ] **Step 1: 修改 batchDlBtn.onclick 释放 blob URL**

修改 `src/ui.ts:695-721`，在两个分支中添加 `URL.revokeObjectURL`：

```javascript
batchDlBtn.onclick = async function () {
  try {
    if (zipId) {
      var res = await fetch('/api/batch/download?zipId=' + zipId, { method: 'POST' })
      if (!res.ok) throw new Error('ZIP 下载失败')
      var blob = await res.blob()
      var a = document.createElement('a')
      var blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.download = 'encrypt_results.zip'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      showToast('打包下载完成', 'success')
      status.textContent = '打包下载完成'
    } else if (sessionId) {
      var ids = batchItems.filter(function (i) { return i.id && i.status === 'decrypted' }).map(function (i) { return i.id })
      if (ids.length === 0) { showToast('没有可打包的图片', 'error'); return }
      var res = await fetch('/api/batch/download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId, ids: ids })
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      var blob = await res.blob()
      var a = document.createElement('a')
      var blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.download = 'decrypt_results.zip'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      showToast('打包下载完成', 'success')
      status.textContent = '打包下载完成'
    }
  } catch (e) { showToast(e.message, 'error'); status.textContent = '错误: ' + e.message }
}
```

- [ ] **Step 2: 运行 UI 测试**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 3: 运行完整测试**

Run: `bun test`
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add src/ui.ts
git commit -m "fix: revoke blob URLs after batch download to prevent memory leak"
```

---

## Task 5: 实现分类错误提示系统

**Files:**
- Modify: `src/ui.ts:217-228` (showToast)
- Modify: `src/ui.ts:523-581` (zipIpt.onchange)
- Modify: `src/ui.ts:585-653` (processBatchAction)
- Modify: `src/ui.ts:724-744` (processImage)

**Interfaces:**
- Consumes: 错误对象、HTTP 状态码
- Produces: 分类的错误提示

- [ ] **Step 1: 创建错误分类工具函数**

在 `src/ui.ts` 的 `clientJS()` 函数中添加：
```javascript
function classifyError(error) {
  if (!error) return { type: 'unknown', message: '未知错误' }
  
  var msg = error.message || String(error)
  
  // 网络错误
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
    return { type: 'network', message: '网络连接失败，请检查网络后重试' }
  }
  
  // HTTP 状态码错误
  if (msg.includes('HTTP 413')) {
    return { type: 'size', message: '文件过大，请压缩后重试' }
  }
  if (msg.includes('HTTP 415') || msg.includes('HTTP 400')) {
    return { type: 'format', message: '文件格式不支持，请上传图片文件' }
  }
  if (msg.includes('HTTP 404')) {
    return { type: 'expired', message: '文件已过期，请重新上传' }
  }
  if (msg.includes('HTTP 5')) {
    return { type: 'server', message: '服务器错误，请稍后重试' }
  }
  
  // 业务逻辑错误
  if (msg.includes('ZIP') || msg.includes('zip')) {
    return { type: 'format', message: 'ZIP 文件处理失败: ' + msg }
  }
  if (msg.includes('图片') || msg.includes('image')) {
    return { type: 'format', message: msg }
  }
  
  return { type: 'unknown', message: msg }
}
```

- [ ] **Step 2: 修改 showToast 支持错误类型样式**

修改 `src/ui.ts:217-228` 的 showToast 函数：
```javascript
function showToast(msg, type) {
  type = type || 'info'
  const container = document.getElementById('toast-container')
  const el = document.createElement('div')
  el.className = 'toast toast-' + type
  el.textContent = msg
  container.appendChild(el)
  setTimeout(function () {
    el.classList.add('toast-out')
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 260)
  }, type === 'error' ? 5000 : 3000)  // 错误提示显示更久
}
```

- [ ] **Step 3: 添加错误类型 CSS 样式**

在 `css()` 函数中添加：
```css
.toast-network { border-left-color: #e67e22; }
.toast-format { border-left-color: #9b59b6; }
.toast-expired { border-left-color: #3498db; }
.toast-size { border-left-color: #e74c3c; }
.toast-server { border-left-color: #c0392b; }
```

- [ ] **Step 4: 修改错误处理使用分类提示**

修改 `zipIpt.onchange`、`processBatchAction`、`processImage` 中的错误处理：
```javascript
// 替换原来的:
// showToast(e.message, 'error')

// 改为:
var classified = classifyError(e)
showToast(classified.message, 'error')
```

- [ ] **Step 5: 运行测试**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 6: 运行完整测试**

Run: `bun test`
Expected: 所有测试通过

- [ ] **Step 7: Commit**

```bash
git add src/ui.ts
git commit -m "feat: add classified error messages for network, format, server errors"
```

---

## Task 6: 运行 lint 检查并最终验证

**Files:**
- None (验证任务)

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 2: 运行完整测试套件**

Run: `bun test`
Expected: 所有 57+ 测试通过

- [ ] **Step 3: 验证所有修复**

检查清单：
- [ ] ZIP 子目录路径已清理
- [ ] /batch/encrypt 返回包含 id
- [ ] ZIP 上传失败时 session 被清理
- [ ] 批量下载 blob URL 被释放
- [ ] 错误提示按类型分类显示

- [ ] **Step 4: 最终 Commit（如有 lint 修复）**

```bash
git add -A
git commit -m "chore: lint fixes and final validation"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** 4 个 Bug 修复 + 分类错误提示 - 全部覆盖
- [ ] **Placeholder scan:** 无 TBD/TODO
- [ ] **Type consistency:** 所有函数签名和返回类型一致
- [ ] **Test coverage:** 每个修复都有对应测试
