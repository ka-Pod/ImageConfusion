# 前端文档

## 架构

前端为**纯静态单页应用**，由 Hono 服务端在 `GET /` 时内联返回完整 HTML。无前端框架依赖，所有 JavaScript 逻辑注入于 `<script>` 中。

## 页面结构

### 单图模式

```
┌──────────────────────────────────────────────────┐
│                   图片混淆（标题）                  │
│         基于空间填充曲线的图片混淆...（描述文字）      │
│                                                   │
│  [选择图片] [选多张图片] [选文件夹] [上传ZIP]        │
│  [混淆] [解混淆] [还原] [下载] [打包下载]            │
│                   ↕ progress-wrap                  │
│                   ↕ spinner                        │
│  ┌──────────────────────────────────────────────┐  │
│  │             #preview-scroll                   │  │
│  │           (flex:1, overflow-y:auto)           │  │
│  │         ┌──────────────────┐                  │  │
│  │         │    .preview-item  │                  │  │
│  │         │    ┌──────────┐  │                  │  │
│  │         │    │   img    │  │                  │  │
│  │         │    └──────────┘  │                  │  │
│  │         └──────────────────┘                  │  │
│  └──────────────────────────────────────────────┘  │
│                  状态文字                           │
│              #toast-container (fixed top-right)     │
└──────────────────────────────────────────────────┘
```

### 批量模式（阅读布局）

```
┌──────────────────────────────────────────────────────────────┐
│                           标题 + 按钮行                        │
│                    progress-wrap + spinner                    │
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│ #thumb-sidebar │           #preview-scroll                     │
│  (140px)  │     (flex:1, scroll-snap-type: y mandatory)     │
│          │                                                   │
│ ┌──────┐ │  ┌─────────────────────────────────────────────┐  │
│ │1/10  │ │  │  .preview-item (flex:0 0 100%; min-h:100%) │  │
│ │ [img]│ │  │  ┌──────────────────────────────────────┐  │  │
│ ├──────┤ │  │  │              img                     │  │  │
│ │2/10  │ │  │  └──────────────────────────────────────┘  │  │
│ │ [img]│ │  └─────────────────────────────────────────────┘  │
│ ├──────┤ │  ┌─────────────────────────────────────────────┐  │
│ │3/10  │ │  │  .preview-item (next page, snap scroll)     │  │
│ │ [img]│ │  │  ┌──────────────────────────────────────┐  │  │
│ │ ...  │ │  │  │              img                     │  │  │
│ └──────┘ │  │  └──────────────────────────────────────┘  │  │
│          │  └─────────────────────────────────────────────┘  │
│          │                                                   │
├──────────┴───────────────────────────────────────────────────┤
│                         状态文字                              │
└──────────────────────────────────────────────────────────────┘
```

## DOM 元素清单

| 元素 | ID | 说明 |
|---|---|---|
| 文件输入（单图） | `ipt` | `accept="image/*"` |
| 文件输入（多张） | `multi` | `multiple accept="image/*"` |
| 文件输入（文件夹） | `dir` | `webkitdirectory` |
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
| Toast 容器 | `toast-container` | fixed 右上角，z-index: 9999 |

## 按钮

| 按钮 | ID | 颜色 | 默认状态 | 功能 |
|---|---|---|---|---|
| 选择图片 | `ipt` | `#180161` | 始终可用 | 打开文件选择器（`image/*`） |
| 选多张图片 | `multi` | `#180161` | 始终可用 | `multiple accept="image/*"` |
| 选文件夹 | `dir` | `#180161` | 始终可用 | `webkitdirectory` |
| 上传 ZIP | `zip-upload` | `#180161` | 始终可用 | `accept=".zip"` |
| 混淆 | `enc` | `#4f1787` | disabled | 单图/批量 encrypt |
| 解混淆 | `dec` | `#eb3678` | disabled | 单图/批量 decrypt |
| 还原 | `re` | `#fb773c` | disabled | 单图恢复原始 / 批量跳转第一张 |
| 下载 | `download` | `#2ecc71` | disabled | 下载当前显示图片 |
| 打包下载 | `batch-dl` | `#2ecc71` | disabled | 下载 encrypt/decrypt ZIP |

## 单图模式交互流程

```
选择图片 → #preview-scroll 显示单张 .preview-item → 按钮启用
   │
   ├── 点击混淆 ──→ spinner → POST /api/encrypt → setSrc(blob) → showToast("混淆完成")
   │
   ├── 点击解混淆 ─→ spinner → POST /api/decrypt → setSrc(blob) → showToast("解混淆完成")
   │
   ├── 点击还原 ───→ setSrc(originalSrc)
   │
   └── 点击下载 ───→ <a download> 触发浏览器下载
```

## 批量模式交互流程

### Encrypt 路径（多张 / 文件夹）

```
选择多张/文件夹 → loadBatchFiles(files)
  → batchItems = [...], batchMode = true
  → renderReaderView() → 左侧 thumb-sidebar + 右侧 scroll-snap 预览
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
  → batchItems 初始状态无 processedBlob（只显示 idx 标签）
  → 逐个 GET /api/batch/image/:id → processedBlob
    每次获取后调用 renderReaderView() 刷新缩略图+预览
  → 所有图片显示 "已还原" 缩略图（绿色边框）
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

- 图片未加载时：混淆、解混淆、还原、下载均 disabled
- 处理中（spinner）：混淆、解混淆 disabled
- 图片加载后：全部启用
- 批量模式：打包下载在完成前 disabled

## 拖拽上传（Drag & Drop）

放置区为 `#preview-scroll` 元素。

```
dragenter → dragCount++ → 添加 .drag-over 类（紫色虚线边框+背景）
dragover  → e.preventDefault()（允许放置）
dragleave → dragCount-- → dragCount === 0 时移除 .drag-over
drop →
  ├── 单个 .zip 文件 → 触发 zip-upload change 事件
  ├── 单张图片 → 触发 ipt change 事件（单图模式）
  └── 多张图片 → 触发 multiIpt change 事件（批量模式）
```

## Toast 通知

| 类型 | CSS class | 底色 |
|---|---|---|
| 成功 | `toast-success` | `#2ecc71` |
| 错误 | `toast-error` | `#e74c3c` |
| 信息 | `toast-info` | `#4f1787` |

- 3 秒后自动消失，滑出动画（`translateX(80px)` → `0` → `80px`）
- 支持连续弹出，垂直堆叠

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

## 缩略图行为

| 状态 | 缩略图 | 边框色 | overlay |
|---|---|---|---|
| `pending` | 显示原图（若有 file） | `#e0e0e0` | 无 |
| `processing` | 显示原图 | `#4f1787` | "处理中" |
| `encrypted` | 原图 + 半透明遮罩 | `#2ecc71` | "已混淆" |
| `decrypted` | 显示 processedBlob | `#2ecc71` | 无 |
| `error` | 显示原图 | `#e74c3c` | 错误信息 |

- 每个缩略图左上角有 idx 标签，格式 `"3/10"`
- ZIP 上传初始阶段无 `processedBlob` 也无 `file.size`，缩略图只显示 idx 标签
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

## 设计系统（v2 — Brutalism + Motion-Driven）

设计语言基于 **Dark Brutalism** 风格，结合 **Kinetic Motion** 动效体系。

### 设计 Dial

| Dial | 值 | 体现 |
|---|---|---|
| Variance | 9/10 — 大胆/非对称 | 锐角边框、实色色块、非 grid 对齐、offset 阴影 |
| Motion | 9/10 — 复杂动效 | 入场 stagger、图片 crossfade + scale、滚动错开动画、机械按压 |
| Density | 3/10 — 宽松间距 | 大字号、充足呼吸空间 |

### 色彩系统（CSS 变量）

| Token | Dark | Light | 用途 |
|---|---|---|---|
| `--bg` | `#09090B` | `#FAFAFA` | 页面背景 |
| `--fg` | `#FAFAFA` | `#09090B` | 前景文字 |
| `--accent` | `#EC4899` | `#EC4899` | 强调色（粉红） |
| `--accent2` | `#DFE104` | `#DFE104` | 次要强调（酸黄） |
| `--muted` | `#27272A` | `#E8ECF0` | 柔和背景 |
| `--muted-fg` | `#A1A1AA` | `#64748B` | 柔和文字 |
| `--border` | `#3F3F46` | `#D4D4D8` | 边框色 |
| `--success` | `#2ECC71` | `#2ECC71` | 成功状态 |
| `--error` | `#E74C3C` | `#E74C3C` | 错误状态 |
| `--radius` | `0px` | `0px` | 全局圆角（0 = 粗野主义锐角） |

### 字体

- 全局：**Space Mono**（Google Fonts）
- 风格：monospace / brutalist / 技术感
- CSS Import: `@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap')`

### 暗色/亮色模式

- 默认暗色，保存偏好至 `localStorage`
- 点击右上角 `✦` / `☀` 按钮切换
- `<html data-theme="dark|light">` 控制全局变量
- 支持 `prefers-reduced-motion` 禁用动画

### 按钮

- 无圆角（`border-radius: 0`），2px `border`
- `:active` 时 `translateY(3px)` 机械按压效果（无 transition，instant response）
- 标签使用大写字、`letter-spacing: 1px`
- `btn-pulse` class 用于完成动画脉冲提示

### 预览滚动区

- 3px dashed 边框，drag-over 时变为 solid accent 色
- `scroll-snap-type: y mandatory` 保持分页式浏览
- 图片切换使用 CSS transition：`opacity 0.25s + scale(0.97→1)`

### 缩略图侧栏

- `IntersectionObserver` 驱动滚入动画（`opacity + translateX` 错开 40ms/item）
- 状态边框色：pending `--border` / processing `--accent` / done `--success` / error `--error`
- 索引标签使用 accent 色背景

### Toast

- 无圆角，`border-left` 4px 彩色线条标示类型
- `box-shadow: 6px 6px 0` offset 投影（brutalist 风格）
- 2 种主题独立配色

### 入场动画

| 元素 | 延迟 | 动画 |
|---|---|---|
| h1 | 0.1s | fadeUp (translateY 16px) |
| .subtitle | 0.2s | fadeUp |
| .desc | 0.3s | fadeUp |
| .controls | 0.4s | fadeUp |
| #main-area | 0.5s | fadeUp |
| #status | 0.6s | fadeUp |

## 动画系统

| 触发时机 | 动画 | 实现 |
|---|---|---|
| 页面加载 | 元素逐个 fadeIn | CSS `@keyframes fadeUp` + `animation-delay` |
| 按钮按下 | 机械按压 | `:active { transform: translateY(3px) }` 无 transition |
| 图片切换 | crossfade + 微缩放 | `img-entering` class → `opacity 0` → RAF 移除 → transition 恢复 |
| 缩略图滚入 | slide-in + opacity | `IntersectionObserver` 添加 `thumb-visible`，每项 40ms 错开 |
| 操作完成 | 按钮脉冲 | `btn-pulse` class：`border-color` 在 success/accent 间循环 1.2s |
| 拖拽进入 | 边框切换 | `border-style` 从 dashed → solid，颜色变 accent（无 transition） |

## 响应式布局

| 断点 | #main-area | #thumb-sidebar | .thumb-item | .preview-item img |
|---|---|---|---|---|
| >=768px | `flex-direction: row` | `width: 140px` 纵向排列 | `flex: 0 0 auto` | `max-h: min(60vh, 500px)` |
| <768px | `flex-direction: column` | `width: 100%` 横向滚动，max-h: 80px | `flex: 0 0 64px` | `max-height: 40vh` |

- `<768px` 时按钮缩小至 `height: 1.9rem; font-size: 0.6rem`
- 预览区 `min-height: 40vh; max-height: 55vh`
- 主题切换按钮在移动端缩小至 36px

## 浏览器兼容性

- 标准 DOM API + Fetch + Blob + FormData
- `IntersectionObserver` (Chrome 51+, Firefox 55+, Edge 15+)
- `scroll-snap` (Chrome 69+, Firefox 68+, Edge 79+)
- `<a download>` 要求 `<a>` 在 DOM 树中（Firefox 限制）
- `webkitdirectory` 仅 Chrome / Edge 支持
- `@import url(...)` 加载 Google Fonts（Space Mono）
