# UI 布局稳定性与还原功能修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复混淆时页面跳动/图片左移问题，以及还原功能无法使用的问题

**Architecture:** 
- Spinner 改为绝对定位叠加层，不推挤文档流
- processImage 中使用 shimmer placeholder 保持容器高度
- 还原功能改用保存 File 对象，避免 blob URL 失效

**Tech Stack:** TypeScript, Hono, Bun

## Global Constraints

- TypeScript strict 模式
- 使用 `type` 而非 `interface`
- 禁止 `any`，优先 `unknown`
- 异步操作使用 `async/await`

---

## Task 1: 修复 Spinner 布局跳动

**Files:**
- Modify: `src/ui.ts` (CSS `.spinner` 样式)
- Modify: `src/ui.ts:780,800` (processImage 中 spinner 控制)

**Interfaces:**
- Consumes: 无
- Produces: Spinner 不影响文档流

- [ ] **Step 1: 修改 spinner CSS 为绝对定位**

修改 `css()` 函数中的 `.spinner` 样式：
```css
.spinner { 
  display: none; 
  width: 18px; 
  height: 18px; 
  border: 2px solid var(--muted); 
  border-top-color: var(--accent); 
  border-radius: 50%; 
  animation: spin .6s linear infinite; 
  position: absolute; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%); 
  z-index: 10; 
}
```

- [ ] **Step 2: 确保 spinner 父容器有定位上下文**

确保 `#preview-scroll` 有 `position: relative`（当前已有）

- [ ] **Step 3: 运行测试验证**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 4: Commit**

```bash
git add src/ui.ts
git commit -m "fix: make spinner absolute positioned to prevent layout shift"
```

---

## Task 2: 修复 processImage 中的 DOM 重建导致跳动

**Files:**
- Modify: `src/ui.ts:312-325` (setSrc 函数)
- Modify: `src/ui.ts:777-801` (processImage 函数)

**Interfaces:**
- Consumes: shimmer-placeholder CSS class
- Produces: processImage 期间容器高度稳定

- [ ] **Step 1: 在 processImage 中使用 shimmer 占位**

修改 `processImage` 函数，在发送请求前将图片替换为 shimmer：
```javascript
async function processImage(action) {
  var imgEl = previewScroll.querySelector('.preview-item img')
  if (!imgEl) return
  
  // 保存当前图片容器
  var previewItem = imgEl.parentElement
  var originalImgSrc = imgEl.src
  
  // 替换为 shimmer 占位（保持高度）
  var shimmer = document.createElement('div')
  shimmer.className = 'shimmer-placeholder'
  shimmer.style.minHeight = imgEl.offsetHeight + 'px'
  previewItem.replaceChild(shimmer, imgEl)
  
  spinner.style.display = 'block'
  status.textContent = action === 'encrypt' ? '混淆中...' : '解混淆中...'
  encBtn.disabled = true; decBtn.disabled = true

  try {
    var blob = await fetch(originalImgSrc).then(function (r) { return r.blob() })
    var form = new FormData()
    form.append('image', blob, 'image.jpeg')
    var res = await fetch('/api/' + action, { method: 'POST', body: form })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    var resultBlob = await res.blob()
    
    // 恢复图片但保留容器高度
    var newImg = document.createElement('img')
    newImg.src = URL.createObjectURL(resultBlob)
    previewItem.replaceChild(newImg, shimmer)
    
    currentAction = action
    showToast(action === 'encrypt' ? '混淆完成' : '解混淆完成', 'success')
    status.textContent = action === 'encrypt' ? '混淆完成' : '解混淆完成'
  } catch (e) {
    // 错误时恢复原图
    var origImg = document.createElement('img')
    origImg.src = originalImgSrc
    previewItem.replaceChild(origImg, shimmer)
    
    var classified = classifyError(e)
    showToast(classified.message, 'error')
    status.textContent = '错误: ' + classified.message
  }
  finally { 
    spinner.style.display = 'none'; 
    encBtn.disabled = false; 
    decBtn.disabled = false 
  }
}
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts
git commit -m "fix: use shimmer placeholder during processImage to prevent layout shift"
```

---

## Task 3: 修复还原功能（保存 File 对象）

**Files:**
- Modify: `src/ui.ts:143` (新增 originalFile 变量)
- Modify: `src/ui.ts:521` (ipt.onchange 中保存 File 对象)
- Modify: `src/ui.ts:709-719` (reBtn.onclick 还原逻辑)

**Interfaces:**
- Consumes: File 对象
- Produces: 还原功能正常工作

- [ ] **Step 1: 新增 originalFile 变量**

在变量声明区域添加：
```javascript
let originalFile = null
```

- [ ] **Step 2: 在 ipt.onchange 中保存 File 对象**

修改 `ipt.onchange` 中的赋值：
```javascript
// 原来：
// originalSrc = url

// 改为：
originalFile = ipt.files[0]
originalSrc = url
```

- [ ] **Step 3: 修复 reBtn.onclick 还原逻辑**

修改还原按钮的处理：
```javascript
reBtn.onclick = function () {
  if (batchMode) {
    if (batchItems.length > 0) scrollToImage(0)
  } else if (originalFile) {
    // 撤销旧的 blob URL
    if (originalSrc && originalSrc.startsWith('blob:')) {
      URL.revokeObjectURL(originalSrc)
    }
    // 从 File 对象重新创建 blob URL
    originalSrc = URL.createObjectURL(originalFile)
    var header = document.querySelector('.header')
    if (header) header.classList.add('previewing')
    setSrc(originalSrc)
    currentAction = ''
    status.textContent = '已还原原始图片'
  }
}
```

- [ ] **Step 4: 在模式切换时清理 originalFile**

在 `ipt.onchange` 和 `loadBatchFiles` 中清理：
```javascript
originalFile = null
```

- [ ] **Step 5: 运行测试验证**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 6: Commit**

```bash
git add src/ui.ts
git commit -m "fix: store File object instead of blob URL for restore functionality"
```

---

## Task 4: 运行完整测试并验证

**Files:**
- None (验证任务)

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 2: 运行完整测试套件**

Run: `bun test`
Expected: 所有 62+ 测试通过

- [ ] **Step 3: 更新 CHANGELOG**

添加 v1.4.6 记录：
```markdown
## [v1.4.6] - 2026-07-08

### Fixed

- **Layout shift during encryption/decryption**: Spinner now uses absolute positioning, processImage uses shimmer placeholder to maintain container height
- **Restore button not working**: Store original File object instead of blob URL to prevent URL revocation issues
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add v1.4.6 changelog for UI stability fixes"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Spinner 布局跳动 + 还原功能 - 全部覆盖
- [ ] **Placeholder scan:** 无 TBD/TODO
- [ ] **Type consistency:** 所有变量和函数签名一致
- [ ] **Test coverage:** 每个修复都有对应测试验证
