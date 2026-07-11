# 前端文档

## 架构

前端为 **Vue 3 + Vite** 单页应用，使用 Composition API 和 Vue Router 实现页面路由。

- 开发模式：Vite Dev Server (端口 5173) + Hono API 代理
- 生产模式：Vite 构建输出到 `public/`，由 Hono 静态文件服务提供
- 全局状态由 `ref()` / `reactive()` 管理，无状态管理库

## 页面结构

### 单图模式

```
┌──────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────┐ │
│ │  │ 图片混淆                    [选择][文件夹][ZIP]  │ │ │
│ │   └── 左侧粗竖线 accent ──      │ [混淆] [解混淆]  │ │ │
│ │                               │ [还原][下载][打包] │ │ │
│ │  基于空间填充曲线的图片混淆...（副标题）              │ │
│ └──────────────────────────────────────────────────────┘ │
│                   ↕ progress-wrap                        │
│                   ↕ spinner                              │
│  ┌──────────────────────────────────────────────────┐    │
│  │                  #preview-scroll                   │    │
│  │              (flex:1, overflow-y:auto)             │    │
│  │         ┌────────────────────────┐                │    │
│  │         │    .preview-item        │                │    │
│  │         │    ┌────────────────┐  │                │    │
│  │         │    │      img       │  │                │    │
│  │         │    └────────────────┘  │                │    │
│  │         └────────────────────────┘                │    │
│  └──────────────────────────────────────────────────┘    │
│                  状态文字                                 │
│              #status-marquee (kinetic subtitle)           │
│              #toast-container (fixed bottom-right)        │
└──────────────────────────────────────────────────────────┘
```

### 批量模式（阅读布局）

```
┌──────────────────────────────────────────────────────────────┐
│  │ 图片混淆                     [选择][文件夹][ZIP] │         │
│                                  [混淆] [解混淆] │ ...       │
│  基于空间填充曲线的图片混淆...                                │
│                    progress-wrap + spinner                    │
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                     │
│ #thumb-sidebar │           #preview-scroll                     │
│  (140px)  │     (flex:1, scroll-snap-type: y mandatory)       │
│          │                                                     │
│ ┌──────┐ │  ┌───────────────────────────────────────────────┐  │
│ │1/10  │ │  │  .preview-item (flex:0 0 100%; min-h:100%)   │  │
│ │ [img]│ │  │  ┌────────────────────────────────────────┐  │  │
│ │░░░░░░│ │  │  │              img             ┌─────┐  │  │
│ ├──────┤ │  │  │                              │3/10 │  │  │
│ │2/10  │ │  │  │                              └─────┘  │  │
│ │ [img]│ │  │  └────────────────────────────────────────┘  │  │
│ │░░░░░░│ │  │  (mobile: ◀  overlay arrows on sides)        │  │
│ ├──────┤ │  └───────────────────────────────────────────────┘  │
│ │3/10  │ │  ┌───────────────────────────────────────────────┐  │
│ │░░░░░░│ │  │  .preview-item (next page, snap scroll)       │  │
│ │ ...  │ │  │  ┌────────────────────────────────────────┐  │  │
│ └──────┘ │  │  │              img                       │  │  │
│          │  │  └────────────────────────────────────────┘  │  │
│          │  └───────────────────────────────────────────────┘  │
│          │                                                     │
├──────────┴─────────────────────────────────────────────────────┤
│                         状态文字                                │
│                     #status-marquee                             │
└────────────────────────────────────────────────────────────────┘
```

## DOM 元素清单

| 元素 | ID / 类 | 说明 |
|---|---|---|
| Header 容器 | `.header` | 包裹标题 + 按钮行 + 副标题 |
| 标题行 | `.header-row` | flex `space-between`，标题与按钮同排 |
| 标题区 | `.header-title` | 左侧 4px accent 竖线 |
| 标题文字 | `h1` | 图片混淆，Kinetic Scramble |
| 副标题 | `.desc` | 功能描述 |
| 文件输入（单/多图） | `ipt` | `accept="image/*" multiple`，支持单选和多选 |
| 文件输入（文件夹） | `dir` | `webkitdirectory multiple` |
| 文件输入（ZIP） | `zip-upload` | `accept=".zip"` |
| 混淆按钮 | `enc` | 单图 / 批量共用 |
| 解混淆按钮 | `dec` | 单图 / 批量共用 |
| 还原按钮 | `re` | 单图还原 / 批量跳转首页 |
| 下载按钮 | `download` | 下载当前预览图片 |
| 打包下载按钮 | `batch-dl` | 下载 `encrypt_results.zip` / `decrypt_results.zip` |
| 预览滚动区 | `preview-scroll` | 核心容器，也是拖拽放置区 |
| 缩略图侧栏 | `thumb-sidebar` | 批量模式左侧 140px |
| 进度条容器 | `progress-wrap` | 含 `#progress-bar .bar-fill` + `#progress-label` |
| Spinner | `spinner` | CSS 旋转动画 |
| 状态文字 | `status` | 底部状态显示 |
| 状态字幕 | `status-marquee` | 底部 Kinetic Typography 字幕行 |
| Toast 容器 | `toast-container` | fixed 右下角，z-index: 9999 |
| 预览计数器（批量） | `preview-counter` | 右下角叠加 `3 / 10`，仅批量模式 |
| 导航箭头容器（批量） | `preview-nav` | 手机端左右叠加 ◀ ▶，仅批量模式 |

## 按钮布局

三组视觉分隔：

```
[选择图片] [选择文件夹] [上传ZIP]  │  [混淆] [解混淆]  │  [还原] [下载] [打包下载]
   ├── 输入组 ──┤     │   ├── 核心操作 ─┤     │   ├── 输出/管理 ──────┤
```

| 按钮 | ID | 样式类 | 默认状态 | 功能 |
|---|---|---|---|---|
| 选择图片 | `ipt` | `btn btn-file` | 始终可用 | 打开文件选择器（单张或批量） |
| 选择文件夹 | `dir` | `btn btn-file` | 始终可用 | `webkitdirectory` 批量选择 |
| 上传 ZIP | `zip-upload` | `btn btn-file` | 始终可用 | 上传加密 ZIP 批量解密 |
| 混淆 | `enc` | `btn btn-primary` | disabled | 单图/批量 encrypt |
| 解混淆 | `dec` | `btn btn-primary` | disabled | 单图/批量 decrypt |
| 还原 | `re` | `btn btn-secondary` | disabled | 单图恢复原始 / 批量跳转首页 |
| 下载 | `download` | `btn btn-secondary` | disabled | 下载当前显示图片 |
| 打包下载 | `batch-dl` | `btn btn-secondary` | disabled | 下载 encrypt/decrypt ZIP |

## 单图模式交互流程

```
选择单张图片 → #preview-scroll 显示 .preview-item → 按钮启用 → header 添加 .previewing（标题淡出）
   │
   ├── 点击混淆 ──→ spinner → POST /api/encrypt → setSrc(blob) → showToast("混淆完成")
   │
   ├── 点击解混淆 ─→ spinner → POST /api/decrypt → setSrc(blob) → showToast("解混淆完成")
   │
   ├── 点击还原 ───→ setSrc(originalSrc) → header 添加 .previewing
   │
   └── 点击下载 ───→ <a download> 触发浏览器下载
```

## 批量模式交互流程

### Encrypt 路径（多张 / 文件夹）

```
选择多张/文件夹 → loadBatchFiles(files)
  → batchItems = [...], batchMode = true
  → renderReaderView() → 左侧 thumb-sidebar + 右侧 scroll-snap 预览 → header 添加 .previewing
  →
  ├── 点击混淆 → processBatchAction('encrypt')
  │     POST /api/batch/encrypt → { zipId, items[] }
  │     所有 status = 'encrypted' (processBatchAction encrypt 分支)
  │     缩略图灰色 overlay "已混淆" → 打包下载启用
  │     showToast("混淆完成，点击'打包下载'获取ZIP")
  │
  └── 点击打包下载 → POST /api/batch/download?zipId=xxx
       下载 encrypt_results.zip
```

### Decrypt 路径（上传 ZIP）

```
上传ZIP → 前端 POST /api/batch/decrypt-zip → { sessionId, items[] }
  → batchItems 初始状态 status = 'processing'
  → renderReaderView() → 缩略图显示 shimmer 占位动画 + 预览区 shimmer
  → 逐个 GET /api/batch/image/:id → processedBlob
    每次加载完成后 → 替换为真实图片，shimmer 消失
    更新 status = 'decrypted'，调用 renderReaderView()
  → 所有图片显示真实缩略图
  → 打包下载启用
  →
  └── 点击打包下载 → POST /api/batch/download { sessionId, ids }
       下载 decrypt_results.zip
```

### 重新上传 → 清理旧批次

```
选择新文件/上传新ZIP → POST /api/batch/cleanup (旧 sessionId)
  → 清空 batchItems, revoke blob URLs
  → 开始新批次
```

## 状态管理

### 全局变量

| 变量 | 类型 | 说明 |
|---|---|---|
| `originalSrc` | `string` | 单图模式原始图片 blob URL |
| `originalFileName` | `string` | 上传文件的原始名称 |
| `currentAction` | `'encrypt' \| 'decrypt' \| ''` | 当前图片经过的操作 |
| `batchMode` | `boolean` | 是否处于批量模式 |
| `batchItems` | `BatchItem[]` | 批量文件列表及处理状态 |
| `selectedIndex` | `number` | 当前预览选中的索引 |
| `sessionId` | `string \| null` | 当前 decrypt 批次的会话 ID |
| `zipId` | `string \| null` | 当前 encrypt 批次的 ZIP ID |
| `observer` | `IntersectionObserver \| null` | 用于跟踪可见 preview-item |

### BatchItem 类型

```
type BatchItem = {
  file: File              // 原始文件（ZIP 模式下由解压信息构造的 File）
  id?: string             // decrypt 预览 ID
  processedName: string   // 处理后的文件名
  status: 'pending' | 'processing' | 'encrypted' | 'decrypted' | 'error'
  errorMsg?: string
  processedBlob?: Blob    // decrypt 后的预览 blob（客户端缓存）
}
```

### 单图状态变迁

| 事件 | `originalFileName` | `currentAction` | 下载文件名 |
|---|---|---|---|
| 选择图片 | 设为 `file.name` | `''` | `原始文件名` |
| 混淆完成 | 保持不变 | `'encrypt'` | `encrypt_原始文件名` |
| 解混淆完成 | 保持不变 | `'decrypt'` | `decrypt_原始文件名` |
| 还原 | 保持不变 | `''` | `原始文件名` |
| 重新选择图片 | 更新 | `''` | `原始文件名` |

### 按钮禁用状态

| 状态 | enc | dec | re | download | batch-dl |
|------|-----|-----|----|----|------|
| 初始（无图片） | ✅ disabled | ✅ disabled | ✅ disabled | ✅ disabled | ✅ disabled |
| 单图已加载 | ❌ enabled | ❌ enabled | ❌ enabled | ❌ enabled | ✅ disabled |
| 单图处理中 | ✅ disabled | ✅ disabled | - | - | ✅ disabled |
| 批量已加载 | ❌ enabled | ❌ enabled | - | - | ✅ disabled |
| 批量处理中 | ✅ disabled | ✅ disabled | - | - | ✅ disabled |
| 批量混淆完成 | - | - | - | - | ❌ enabled |
| 批量解密完成 | - | - | - | - | ❌ enabled |
| 批量→单图切换 | ❌ enabled | ❌ enabled | ❌ enabled | ❌ enabled | ✅ disabled |

### 模式切换状态清理

**批量→单图**（选择单张图片）：
1. 调用 cleanup API（清理旧 sessionId）
2. 释放 batchItems 中的 processedBlob
3. 重置：batchMode=false, batchItems=[], sessionId=null, zipId=null
4. 启用：encBtn, decBtn, reBtn, downloadBtn
5. 禁用：batchDlBtn

**单图→批量**（选择多张图片）：
1. 调用 cleanup API（清理旧 sessionId）
2. 释放 batchItems 中的 processedBlob
3. 释放 originalSrc
4. 重置：batchMode=true, batchItems=[], sessionId=null, zipId=null
5. 启用：encBtn, decBtn
6. 禁用：batchDlBtn

### 批量模式增强交互

- **图片计数器**：右下角 `3/10` badge，始终显示
- **触摸滑动**：水平滑动切换图片（移动端，threshold 50px）
- **导航箭头**：手机端左右 ◀ ▶（仅在 `<768px` 显示）
- **桌面导航**：缩略图点击 + 键盘 `↑↓←→ Home End`
- **加载占位**：解密流程中未加载图片显示 shimmer 骨架屏

## 拖拽上传（Drag & Drop）

放置区为 `#preview-scroll` 元素。

```
dragenter → dragCount++ → 添加 .drag-over 类
dragover  → e.preventDefault()（允许放置）
dragleave → dragCount-- → dragCount === 0 时移除 .drag-over
drop →
  ├── 单个 .zip 文件 → 触发 zip-upload change 事件
  ├── 单张图片 → 触发 ipt change 事件（单图模式）
  └── 多张图片 → 触发 ipt change 事件（批量模式，ipt 支持 multiple）
```

## Toast 通知

| 类型 | CSS class | 边框标记 |
|---|---|---|
| 成功 | `toast-success` | 左侧 `border-color: var(--success)` |
| 错误 | `toast-error` | 左侧 `border-color: var(--error)` |
| 信息 | `toast-info` | 左侧 `border-color: var(--border)` |

- 3 秒后自动消失，`translateX` 滑入/滑出
- 支持连续弹出，垂直堆叠
- 位于右下角（`bottom: 12px`），避免遮挡顶部按钮

## 进度条

用于批量操作期间：

```
<div id="progress-wrap" class="show">
  <div id="progress-bar"><div class="bar-fill" style="width: 60%"></div></div>
  <span id="progress-label">3 / 5</span>
</div>
```

- `showProgress(current, total)` → 显示进度条，更新百分比和标签
- `hideProgress()` → 隐藏进度条
- 仅在 `processBatchAction` 调用期间激活

## 键盘导航

| 按键 | 行为 |
|---|---|
| `↑` / `←` | `scrollToImage(selectedIndex - 1)` |
| `↓` / `→` | `scrollToImage(selectedIndex + 1)` |
| `Home` | `scrollToImage(0)` |
| `End` | `scrollToImage(batchItems.length - 1)` |

仅在 `batchMode === true && batchItems.length > 0` 时生效，`scrollToImage` 调用 `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`。

## IntersectionObserver

监听 `#preview-scroll` 内的 `.preview-item`：

```
new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      selectedIndex = entry.target.dataset.index
      updateSidebarHighlight()
    }
  })
}, { root: previewScroll, threshold: 0.5 })
```

- `threshold: 0.5` → 元素过半可见时触发
- 同步更新 `#thumb-sidebar` 中对应 `.thumb-item.active`

## 图片加载优化 — Shimmer 骨架屏

ZIP 解密流程中，图片逐个从服务端加载。未完成时显示 CSS shimmer 占位：

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer-placeholder {
  background: linear-gradient(90deg, var(--muted) 25%, #f0f0f0 50%, var(--muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

触发时机：`status === 'processing'` 且无 `processedBlob`。
替换时机：图片加载完成后，真实 img 替换 shimmer 占位。

## 图片计数器

批量模式下，预览区右下角叠加 `3 / 10` badge：

```
┌──────────────────────────────────┐
│                                  │
│              图片内容             │
│                          ┌─────┐ │
│                          │3/10 │ │
│                          └─────┘ │
└──────────────────────────────────┘
```

- 背景 `var(--accent)`, 白色文字, `font-size: 0.75rem`, `font-weight: 700`
- 同步 `selectedIndex`，图片切换时自动更新
- 所有设备始终显示

## 触摸滑动手势

批量模式下监听 `.preview-item` 区域的触摸事件：

```
touchstart → 记录 startX
touchmove  → 计算 deltaX
touchend   → deltaX > 50px → scrollToImage(selectedIndex - 1)
             deltaX < -50px → scrollToImage(selectedIndex + 1)
```

- 阈值 50px 避免误触
- 不影响垂直 scroll-snap 的正常滑动
- 不影响桌面端

## 手机端导航箭头

仅在 `<768px` 显示，左右两侧叠加半透明 `◀` `▶` 按钮：

```
@media (max-width: 767px) {
  .preview-nav { display: flex; }
}
@media (min-width: 768px) {
  .preview-nav { display: none; }
}
```

- 点击触发 `scrollToImage(selectedIndex ± 1)`
- 半透明背景，`z-index` 高于图片
- 桌面端依赖缩略图侧栏 + 键盘快捷键

## 缩略图行为

| 状态 | 缩略图 | 边框色 | overlay |
|---|---|---|---|
| `pending` | 显示原图（若有 file） | `var(--border)` | 无 |
| `processing` | shimmer 占位（无图时） | `var(--border)` | — |
| `encrypted` | 原图 + 半透明遮罩 | `#2ecc71` | "已混淆" |
| `decrypted` | 显示 processedBlob | `#2ecc71` | 无 |
| `error` | 显示原图 | `#e74c3c` | 错误信息 |

- 每个缩略图左上角有 idx 标签，格式 `"3/10"`，背景 `var(--accent)`
- ZIP 上传初始阶段无 `processedBlob` → 缩略图显示 shimmer 占位动画
- 点击缩略图调用 `scrollToImage(index)` 跳转到对应预览页

## 下载功能

### 单图模式（纯前端）

```js
<a href="blob_url" download="encrypt_image.jpg"> → 触发浏览器下载
```

- 文件名根据 `currentAction` 加前缀：`encrypt_原始文件名` / `decrypt_原始文件名`

### 批量模式（服务端打包）

- Encrypt: `POST /api/batch/download?zipId=xxx` → 返回 `encrypt_results.zip`
- Decrypt: `POST /api/batch/download { sessionId, ids[] }` → 返回 `decrypt_results.zip`

## 设计系统

### 色彩系统（低饱和雾霾蓝）

| Token | Value | 用途 |
|---|---|---|
| `--bg` | `#FAFAFA` | 页面背景（暖白） |
| `--fg` | `#1B1B2F` | 主要文字（深蓝黑） |
| `--muted` | `#E8EDF2` | 柔和背景 / 分割线 |
| `--muted-fg` | `#7B8BA0` | 辅助文字（灰蓝） |
| `--border` | `#1B1B2F` | 边框色（硬黑，neo-brutalist） |
| `--accent` | `#4A6FA5` | 强调色（雾霾蓝） |
| `--accent-hover` | `#3D5E8C` | 强调色悬停 |
| `--accent-muted` | `#E4EAF2` | 按钮浅蓝背景 |
| `--success` | `#2E8B57` | 成功绿 |
| `--error` | `#C1292E` | 错误红 |
| `--radius` | `0` | 零圆角（neo-brutalist） |
| `--shadow` | `4px 4px 0 0 var(--border)` | 硬阴影（neo-brutalist 标志） |
| `--shadow-sm` | `2px 2px 0 0 var(--border)` | 小阴影 |

无外部 CSS 依赖，全站 neo-brutalist 硬边框 + 硬阴影风格。

### 按钮样式

三级样式系统：

| 层级 | 类 | 背景 | 用途 |
|---|---|---|---|
| 文件选择 | `btn-file` | `var(--accent-muted)` 浅蓝底 | 选择图片/文件夹/ZIP |
| 核心操作 | `btn-primary` | `var(--accent)` 雾霾蓝底 + 白色字 | 混淆/解混淆 |
| 输出管理 | `btn-secondary` | `var(--bg)` 透明底 | 还原/下载/打包下载 |

共享特征：
- `text-transform: uppercase`，`font-weight: 700`，`letter-spacing: 0.05em`
- `border: 2px solid var(--border)`，`border-radius: 0`
- `box-shadow: var(--shadow)`（`4px 4px 0 0`）
- Hover 时 shadow 收回（`box-shadow: none`），背景变 accent 色
- Active 时 shadow 收回 + 位移 `translate(4px, 4px)`
- Disabled 时 `opacity: 0.3`，`box-shadow: none`

### Kinetic Typography

#### 标题 Scramble

`h1` 每 8 秒自动执行一次字母乱序动画：

```js
function scrambleText(el, target, duration) {
  // 每 50ms 随机替换一个字符，持续 duration ms
  // 使用 SCRAMBLE_CHARS: A-Z a-z 0-9
}
```

- 鼠标悬停标题时暂停 scramble，离开后恢复
- 使用 `setInterval` 实现，50ms 帧率

#### 状态文字 Scramble

`#status` 文字变化时自动触发 scramble 动画（通过 MutationObserver 监听）：

```js
var statusObserver = new MutationObserver(function () {
  if (statusEl.textContent !== _origStatusText) {
    scrambleText(statusEl, newText, 400)
    _origStatusText = newText
  }
})
statusObserver.observe(statusEl, { childList: true, characterData: true, subtree: true })
```

#### 背景色漂移

`body` 背景在 `#FAFAFA` 和 `#F0F4FA` 间 30 秒循环：

```css
@keyframes hueDrift {
  0%, 100% { background-color: #FAFAFA; }
  50% { background-color: #F0F4FA; }
}
body { animation: hueDrift 30s ease-in-out infinite; }
```

#### 状态字幕（Marquee）

`#status-marquee` 位于状态文字下方，循环显示技术参数，每 5 秒切换一条，带 `slideUp` 过渡：

```
GILBERT 2D CURVE · SPACE-FILLING · OFFSET 0.618
↓ slideUp (transform translateY + opacity)
PIXEL REARRANGEMENT · LOSSLESS CORE · JPEG Q95
↓
IMAGE CONFUSION · ENCRYPT / DECRYPT · SERVER SIDE
```

- JS 控制：`setInterval` 5s + `transform` slide 过渡
- 字体：`0.6rem`, `color: var(--muted-fg)`, `letter-spacing: 0.08em`, `uppercase`

#### 加载点动画

处理中状态文字的 `...` 通过 CSS `@keyframes` 实现逐帧动画：

```css
.status-dots::after { animation: dots 1.5s steps(3) infinite; }
@keyframes dots { 0% { content: ''; } 33% { content: '.'; } 66% { content: '..'; } to { content: '...'; } }
```

### 预览隐藏

图片预览时 header 标题区域淡出以避免视觉干扰：

```css
.previewing h1, .previewing .desc { opacity: 0; pointer-events: none; }
```

- `setSrc()` 和 `renderReaderView()` 在显示图片时自动为 `.header` 添加 `.previewing` 类
- 清空图片（batch 空、恢复原始）时移除 `.previewing`

### 预览滚动区

```css
#preview-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 50vh;
  max-height: 70vh;
  border: 2px solid var(--border);
  transition: border-color 0.2s;
  scroll-snap-type: y mandatory;
}
#preview-scroll.drag-over { border-color: var(--accent); }
.preview-item {
  position: relative;
  flex: 0 0 100%;
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}
.preview-item img {
  max-width: min(92vw, 800px);
  max-height: min(60vh, 500px);
  display: block;
  transition: opacity 0.2s ease;
}
```

### 缩略图侧栏

```css
#thumb-sidebar {
  width: 140px;
  overflow-y: auto;
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background: #fff;
  max-height: 70vh;
}
.thumb-item {
  position: relative;
  cursor: pointer;
  border: 2px solid var(--border);
  padding: 2px;
  text-align: center;
  flex: 0 0 auto;
  transition: border-color 0.15s;
}
.thumb-item:hover { border-color: var(--muted-fg); }
.thumb-item.active { border-color: var(--accent); background: rgba(0,0,0,0.03); }
.thumb-idx {
  position: absolute;
  top: 1px; left: 1px;
  background: var(--accent);
  color: #fff;
  font-size: 0.5rem;
  padding: 1px 4px;
  line-height: 1.3;
}
```

### Toast

```css
#toast-container {
  position: fixed;
  bottom: 12px; right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}
.toast {
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-left: 4px solid var(--border);
  background: #fff;
  color: var(--fg);
  font-size: 0.85rem;
  animation: toastIn 0.25s ease;
  pointer-events: auto;
  max-width: 360px;
}
.toast-success { border-left-color: var(--success); }
.toast-error { border-left-color: var(--error); }
.toast-out { animation: toastOut 0.2s ease-in forwards; }
@keyframes toastIn { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(60px); } }
```

### Spinner

```css
.spinner {
  display: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--muted);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0.4rem auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

### 进度条

```css
#progress-wrap.show { display: flex; }
#progress-bar { width: 200px; height: 6px; background: var(--muted); }
#progress-bar .bar-fill { height: 100%; background: var(--accent); transition: width 0.2s; width: 0%; }
#progress-label { font-size: 0.75rem; color: var(--muted-fg); }
```

## 响应式布局

| 断点 | #main-area | #thumb-sidebar | .thumb-item | .preview-item img |
|---|---|---|---|---|
| >=768px | `flex-direction: row` | `width: 140px` 纵向排列 | `flex: 0 0 auto` | `max-h: min(60vh, 500px)` |
| <768px | `flex-direction: column` | `width: 100%` 横向滚动，max-h: 80px | `flex: 0 0 64px` | `max-height: 40vh` |

- `<768px` 时按钮缩小至 `padding: 0.5rem 0.8rem; font-size: 0.7rem`
- 预览区 `min-height: 40vh; max-height: 55vh`
- `<768px` 时 body padding 从 `1.5rem 2rem` 缩小为 `1rem`

## 关于 `prefers-reduced-motion`

所有动画在用户启用系统减少动效时自动降级：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 画廊页面

### NewComicModal

新建漫画弹窗，**只接收加密 ZIP**。

```
┌─────────────────────────────┐
│ 新建漫画                     │
│ 漫画名称 [         ]         │
│ 作者 [           ]           │
│ 图源 [           ]           │
│ 上传加密 ZIP [选择文件]      │
│ 已选择 encrypt_results.zip   │
│                    [取消][创建]
└─────────────────────────────┘
```

**交互逻辑：**

1. 用户选择 ZIP 后，前端使用 `FileReader` 读取 buffer，通过字符串扫描检测是否包含 `metadata.json`
2. 若含 `metadata.json`：
   - `name` 输入框禁用
   - 显示提示"已检测到漫画元数据，将直接导入"
3. 若不含 `metadata.json`：
   - `name` 输入框必填
4. 提交字段：`zip`（单个文件）+ `name`（条件必填）+ `author` + `source`

### GalleryPage

漫画网格列表，展示每部漫画的封面、名称、作者、总页数。

- 封面由服务端解密第一页并生成 base64 JPEG
- 点击进入 `ComicDetailPage`

### ComicDetailPage

漫画详情页，显示元信息和"解密阅读"按钮。

- 点击"解密阅读"调用 `POST /api/gallery/:id/decrypt`
- 获取 `sessionId` 后跳转到 `ReaderPage`

### ReaderPage

翻页阅读器，逐页从 `GET /api/gallery/decrypt/:sessionId/page/:n` 加载解密后的 JPEG。

- 支持键盘左右翻页
- 支持触摸滑动
- 离开页面时调用 `POST /api/gallery/cleanup` 释放临时文件

## 浏览器兼容性

- 标准 DOM API + Fetch + Blob + FormData
- `IntersectionObserver` (Chrome 51+, Firefox 55+, Edge 15+)
- `scroll-snap` (Chrome 69+, Firefox 68+, Edge 79+)
- `<a download>` 要求 `<a>` 在 DOM 树中（Firefox 限制）
- `webkitdirectory` 仅 Chrome / Edge 支持
