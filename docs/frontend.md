# 前端文档

## 架构

前端为**纯静态单页应用**，由 Hono 服务端在 `GET /` 时内联返回完整 HTML。无前端框架依赖。

## 页面结构

```
┌─────────────────────────────────┐
│         图片混淆（标题）           │
│  基于空间填充曲线...（描述文字）    │
│                                 │
│ [选择图片] [混淆] [解混淆] [还原] [下载] │
│          ↕ spinner               │
│         [图片展示区]               │
│         状态文字                   │
└─────────────────────────────────┘
```

## 按钮

| 按钮 | ID | 颜色 | 默认状态 | 功能 |
|---|---|---|---|---|
| 选择图片 | `ipt` | `#180161` | 始终可用 | 打开文件选择器（`image/*`） |
| 混淆 | `enc` | `#4f1787` | disabled | 上传原图 → 服务端混淆 → 显示结果 |
| 解混淆 | `dec` | `#eb3678` | disabled | 上传混淆图 → 服务端还原 → 显示结果 |
| 还原 | `re` | `#fb773c` | disabled | 恢复为上传的原始图片 |
| 下载 | `download` | `#2ecc71` | disabled | 将当前显示图片保存到本地 |

## 交互流程

```
选择图片 → 图片展示 → 按钮可用
   │
   ├── 点击混淆 ──→ spinner → POST /api/encrypt → 显示混淆结果 → 按钮可用
   │
   ├── 点击解混淆 ─→ spinner → POST /api/decrypt → 显示还原结果 → 按钮可用
   │
   ├── 点击还原 ───→ 恢复原始图片
   │
   └── 点击下载 ───→ 触发浏览器下载
```

## 状态管理

### 全局变量

| 变量 | 类型 | 说明 |
|---|---|---|
| `originalSrc` | `string` | 原始图片的 blob URL，用于还原 |
| `currentSrc` | `string` | 当前显示图片的 blob URL |
| `originalFileName` | `string` | 上传文件的原始名称 |
| `currentAction` | `'encrypt' \| 'decrypt' \| ''` | 当前图片经过的操作 |

### 状态变迁

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

## 下载功能

纯前端实现，不依赖后端：

```js
downloadBtn.onclick = () => {
  const a = document.createElement('a')
  a.href = img.src          // 当前 blob URL
  a.download = currentAction + '_' + originalFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

- 使用 `<a download>` 触发浏览器原生下载
- 文件名根据 `currentAction` 自动加前缀
- blob URL 在图片展示期间保持有效

## 样式规范

- 无外部 CSS 依赖
- 按钮统一使用 `.btn` 基类
- 各按钮通过独立 class 控制颜色
- 禁用态统一使用 `opacity: 0.5; cursor: not-allowed`
- 图片区域最大宽度 `min(90vw, 800px)`，最大高度 `min(80vh, 600px)`
- 圆角 `6px`，按钮高度 `2.25rem`

## 浏览器兼容性

- 使用标准 DOM API + Fetch + Blob + FormData
- `<a download>` 支持 Chrome / Firefox / Edge
- Firefox 要求 `<a>` 元素在 DOM 树中才能触发下载

---

## 批量模式

### 页面结构

```
┌──────────────────────────────────────────────────────────────┐
│  [选择图片] [选多张图片] [选文件夹] [上传ZIP]                    │
├──────────────────────────────────────────────────────────────┤
│  [批量混淆] [批量解混淆] [打包下载]                              │
├──────────────────────────────────────────────────────────────┤
│  [还原] [下载]   ← 单图模式按钮                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              大图预览区域（单图/批量共用）                       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                            │
│  │1 │ │2 │ │3 │ │4 │ │5 │ │6 │  ← 横向滚动                   │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                              │
│  缩略图条（仅批量模式显示）                                     │
│  每张: 文件名 + 状态指示                                        │
└──────────────────────────────────────────────────────────────┘
```

### 按钮说明

| 按钮 | ID | 颜色 | 功能 |
|---|---|---|---|
| 选择图片 | `ipt` | `#180161` | 单图模式，`accept="image/*"` |
| 选多张图片 | `multi` | `#180161` | 批量 encrypt，`multiple accept="image/*"` |
| 选文件夹 | `dir` | `#180161` | 批量 encrypt（大量图），`webkitdirectory` |
| 上传 ZIP | `zip-upload` | `#180161` | 批量 decrypt，`accept=".zip"` |
| 批量混淆 | `batch-enc` | `#4f1787` | 混淆 batchItems 中所有图片 |
| 批量解混淆 | `batch-dec` | `#eb3678` | 解混淆 batchItems/ZIP 中所有图片 |
| 打包下载 | `batch-dl` | `#2ecc71` | 下载 encrypt_results.zip / decrypt_results.zip |
| 还原 | `re` | `#fb773c` | 单图模式：恢复原始图片；批量模式：选中第一张 |
| 下载 | `download` | `#2ecc71` | 单图模式：下载当前图片；批量模式：下载预览中的图片 |

### 批量状态变量

| 变量 | 类型 | 说明 |
|---|---|---|
| `batchMode` | `boolean` | 是否处于批量模式 |
| `batchItems` | `BatchItem[]` | 批量文件列表及处理状态 |
| `selectedIndex` | `number` | 当前大图预览选中的索引 |
| `sessionId` | `string \| null` | 当前 decrypt 批次的会话 ID |
| `zipId` | `string \| null` | 当前 encrypt 批次的 ZIP ID |
| `actionType` | `'encrypt' \| 'decrypt'` | 当前批次的处理类型 |

### BatchItem 类型

```
type BatchItem = {
  file: File              // 原始文件（ZIP 模式下由解压生成）
  id?: string             // decrypt 预览 ID
  processedName: string   // 处理后的文件名
  status: 'pending' | 'processing' | 'encrypted' | 'decrypted' | 'error'
  errorMsg?: string
  processedBlob?: Blob    // decrypt 后的预览 blob（客户端缓存）
}
```

### 批量状态变迁

**Encrypt 路径（选择多张/文件夹）：**
```
选择多张/文件夹 → batchItems = [...], actionType = 'encrypt', batchMode = true
  │
  ├── 点击批量混淆 → 所有 status = 'processing'
  │   POST /api/batch/encrypt → { items, zipId }
  │   缩略图灰化 + "已混淆"，不预览
  │   打包下载按钮启用
  │
  └── 点击打包下载 → POST /api/batch/download?zipId=xxx
      下载 encrypt_results.zip
```

**Decrypt 路径（上传 ZIP）：**
```
上传 ZIP → 前端提取文件名列表显示
  │   POST /api/batch/decrypt-zip → { sessionId, items[] }
  │   逐个 GET /api/batch/image/:id → processedBlob
  │   actionType = 'decrypt', batchMode = true
  │   缩略图显示还原后图片（绿色边框，可点击大图预览）
  │
  └── 点击打包下载 → POST /api/batch/download { sessionId, ids }
      下载 decrypt_results.zip
```

**重新上传 → 清理旧批次：**
```
重新选择多张/文件夹/上传ZIP
  → POST /api/batch/cleanup (旧 sessionId)
  → 清空 batchItems, blob URLs
  → 开始新批次
```

### Encrypt 缩略图行为

| 状态 | 缩略图 | 交互 |
|---|---|---|
| pending | 原图预览 | 可点击大图 |
| processing | 原图 + 蓝色边框 + "处理中" | 不可点击 |
| encrypted | 灰色覆盖层 + "已混淆" | 不可点击大图（噪声图无意义） |
| error | 红色边框 + 错误信息 | 可查看错误 |

### Decrypt 缩略图行为

| 状态 | 缩略图 | 交互 |
|---|---|---|
| pending | 原始文件名显示 | — |
| processing | 灰色 + "处理中" | 不可点击 |
| decrypted | 还原后图片 + 绿色边框 "已还原" | 可点击大图预览验证 |
| error | 红色边框 + 错误信息 | 可查看错误 |

### 预览区交互

- decrypt 完成后点击缩略图 → 大图显示还原后图片（供肉眼验证是否正确）
- encrypt 完成后缩略图不可点击（噪声图无需预览）
- 键盘左右方向键切换（桌面端）

### 响应式布局

| 断点 | 缩略图尺寸 | 排列 | 按钮 |
|---|---|---|---|
| >=768px | 80x80 | 横向滚动 | 分两行排列 |
| <768px | 56x56 | 自动换行 4 列 | 换行 2 列 |
