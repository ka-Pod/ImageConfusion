# Batch Processing Design

Date: 2026-07-06

基于 Gilbert 空间填充曲线的图片混淆工具 — 批量混淆/解混淆、ZIP 传输、多图 UI。

---

## 1. 核心决策

- **所有图像处理在服务端完成**（sharp 解码 → Gilbert 变换 → sharp 编码）
- **Encrypt 输入**：`<input type="file" multiple accept="image/*">`（多图）+ `<input webkitdirectory>`（文件夹），两者并存
- **Decrypt 输入**：`<input type="file" accept=".zip">`（ZIP 是唯一的传输加密包）
- **ZIP 打包**：`archiver` v8（`import { ZipArchive }`, `new ZipArchive()`）
- **ZIP 解压**：Node.js 内置 `child_process` + `tar` 或 `unzipper`（见实现决定）
- **临时存储**：`os.tmpdir()/imageconfusion-{sessionId}/`，TTL 30 分钟
- **前端模式**：单图与批量集成在同一页面

## 2. 双流程设计

### 2.1 Encrypt 流程

```
选择多张图片/文件夹 → 缩略图展示（原图预览）
  → 点击批量混淆 → POST /api/batch/encrypt (image[] 多文件)
  → 服务端逐张: sharp 解码 → Gilbert 混淆 → sharp 编码 JPEG(q95)
  → 存入 temp 目录 → archiver 打包 ZIP → 保存 ZIP 到 temp
  → 返回 JSON { items, zipId }
  → 缩略图灰化 + 标记"已混淆"（噪声图不可预览）
  → 用户手动点击"打包下载" → GET /api/batch/download?zipId=xxx (POST method)
  → 下载 encrypt_results.zip
```

| 场景 | 行为 |
|---|---|
| 处理完成 | 缩略图灰化，显示"已混淆"，打包下载按钮启用 |
| 下载 ZIP | 预存 ZIP 可重复下载（TTL 内） |
| 重新选图 | 清理上一批 temp |
| 用户不下载就离开 | TTL 30 分钟自动清理 |

**关键原则：encrypt 后不自动下载，不提供噪声图预览。**

### 2.2 Decrypt 流程

```
上传 ZIP → 前端发送 POST /api/batch/decrypt-zip (zip file)
  → 服务端解压 → 过滤图片文件 → 逐张 sharp 解码 → Gilbert 解混淆
  → sharp 编码 JPEG(q95) → 存入 temp 目录
  → 返回 JSON { sessionId, items: [{ id, originalName, processedName }] }

前端通过 GET /api/batch/image/:id 逐个获取已解混淆的图片 blob
  → 缩略图刷新为还原后版本（绿色边框）
  → 点击缩略图 → 大图预览（用户肉眼验证还原是否正确）

用户手动点击"打包下载" → POST /api/batch/download { ids }
  → 返回 decrypt_results.zip → 删除对应 temp 文件
```

**关键原则：decrypt 提供逐图预览，用户验证后再打包。**

## 3. API 端点

### 3.1 POST /api/batch/encrypt

上传多个图片，混淆后预存 ZIP，返回 ZIP 下载标识。

**请求：** `multipart/form-data`，`image[]` 多个文件，保持表单顺序

**响应：** `200 application/json`
```json
{
  "zipId": "uuid-string",
  "items": [
    { "originalName": "photo1.jpg", "processedName": "encrypt_photo1.jpg" },
    { "originalName": "photo2.jpg", "processedName": "encrypt_photo2.jpg", "error": "无法解析图片" }
  ]
}
```

### 3.2 POST /api/batch/decrypt

上传多个图片，解混淆后存入 temp，返回可预览的 ID 列表。
（保留用于兼容，但 decrypt 主要入口是 ZIP 上传）

**请求：** `multipart/form-data`，`image[]` 多个文件

**响应：** `200 application/json`
```json
{
  "sessionId": "session-uuid",
  "items": [
    { "id": "img-uuid-1", "originalName": "photo1.jpg", "processedName": "decrypt_photo1.jpg" },
    { "id": "img-uuid-2", "originalName": "photo2.jpg", "processedName": "decrypt_photo2.jpg", "error": "无法解析图片" }
  ]
}
```

### 3.3 POST /api/batch/decrypt-zip

**新增。** 上传 ZIP 文件，服务端解压后逐张解密。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `zip` | file | encrypt_results.zip 文件，单次 ≤ 200MB |

**响应：** `200 application/json`
```json
{
  "sessionId": "session-uuid",
  "items": [
    { "id": "img-uuid-1", "originalName": "photo1.jpg", "processedName": "decrypt_photo1.jpg" },
    { "id": "img-uuid-2", "originalName": "photo2.jpg", "processedName": "decrypt_photo2.jpg", "error": "无法解析图片" }
  ]
}
```

**内部流程：**
1. 接收 ZIP 文件 → 解压到 temp 临时目录
2. 读取文件列表，过滤非图片（jpg/png/webp）
3. 保持 ZIP 内文件顺序
4. 逐张调用 `processImageBuffer(buffer, 'decrypt')`
5. 存入 session temp 目录
6. 清理解压临时目录
7. 返回与 `/api/batch/decrypt` 相同的 JSON 格式

### 3.4 GET /api/batch/image/:id

获取单张处理后的图片（用于前端预览）。

**请求参数：** `?sessionId=xxx`

**响应：** `200 image/jpeg`
**错误：** `404 { "error": "图片已过期或不存在" }`

### 3.5 POST /api/batch/download

打包指定处理后的图片为 ZIP。

**请求（decrypt 模式）：** `application/json`
```json
{ "sessionId": "session-uuid", "ids": ["img-uuid-1", "img-uuid-2"] }
```

**请求（encrypt 模式）：** `POST /api/batch/download?zipId=uuid-string`

> **重要：** 无论哪种模式，HTTP 方法必须为 POST。前端 fetch 默认 GET 会导致 404。

**响应：** `200 application/zip`
- 文件名：`encrypt_results.zip` 或 `decrypt_results.zip`
- ZIP 内文件按原始上传顺序排列，文件名带 `encrypt_` / `decrypt_` 前缀
- ZIP 下载完成后不删除 temp 文件（可重复下载，TTL 到期清理）

### 3.6 POST /api/batch/cleanup

通知服务端清理当前 session 的临时文件。

**请求：** `{ "sessionId": "session-uuid" }`
**响应：** `200 { "ok": true }`

## 4. 临时存储策略

| 项目 | 详情 |
|---|---|
| 根目录 | `os.tmpdir()/imageconfusion-{sessionId}/` |
| 文件命名 | `{uuid}.jpg` |
| 元数据 | `manifest.json` 记录 id ↔ 原始文件名映射 |
| 清理时机 | ① 新批次上传时清理旧 session ② TTL 30 分钟 ③ 服务启动清场 |
| 清理实现 | 定时器每 5 分钟扫描，删除过期文件 |
| 大小限制 | 单张 ≤ 50MB，单批 ≤ 100 张，ZIP ≤ 200MB |

## 5. 前端状态管理

### 5.1 全局变量

```js
let batchMode = false           // true 当批量处理激活
let batchItems = []             // BatchItem[]
let selectedIndex = -1          // 当前大图预览索引
let sessionId = null            // decrypt session
let zipId = null                // encrypt zipId
let actionType = ''             // 'encrypt' | 'decrypt'

// BatchItem { file, id?, processedName, status, errorMsg?, processedBlob? }
```

### 5.2 状态变迁

```
选择多张图片/文件夹 → batchItems = [...], actionType = 'encrypt', batchMode = true
  │
  ├── 点击批量混淆 → processing
  │   POST /api/batch/encrypt → { items, zipId }
  │   缩略图灰化 + "已混淆" → 打包下载按钮启用
  │   不自动下载
  │
  └── 点击打包下载 → POST /api/batch/download?zipId=xxx
      下载 encrypt_results.zip

上传 ZIP → 前端解析 ZIP 文件名列表（预览原始文件名）
  │   POST /api/batch/decrypt-zip → { sessionId, items[] }
  │   逐个 GET /api/batch/image/:id → processedBlob
  │   actionType = 'decrypt', batchMode = true
  │   缩略图显示还原后图片（可点击大图预览）
  │
  └── 点击打包下载 → POST /api/batch/download { sessionId, ids }
      下载 decrypt_results.zip

重新选择 → POST /api/batch/cleanup + 清空状态
```

### 5.3 缩略图行为

| 状态 | Encrypt | Decrypt |
|---|---|---|
| pending | 原图缩略图，灰色边框 | 原图缩略图（ZIP 内文件名），灰色边框 |
| processing | 蓝色旋转边框 "处理中" | 蓝色旋转边框 "处理中" |
| completed | 灰色覆盖层 + "已混淆"，不可点击预览 | 绿色边框，显示还原图，可点击大图 |
| error | 红色边框，显示错误信息 | 红色边框，显示错误信息 |

## 6. UI 改造

### 6.1 页面结构

```
┌──────────────────────────────────────────────────────────────┐
│  [选择图片] [选多张图片] [选文件夹] [上传ZIP]                    │
│  ────────────────────────────────────────────────────         │
│  [批量混淆] [批量解混淆] [打包下载]                              │
│  ────────────────────────────────────────────────────         │
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

### 6.2 按钮说明

| 按钮 | 输入类型 | 说明 |
|---|---|---|
| 选择图片 | `<input accept="image/*">` | 单图模式 |
| 选多张图片 | `<input multiple accept="image/*">` | 批量 encrypt |
| 选文件夹 | `<input webkitdirectory accept="image/*">` | 批量 encrypt（大量图） |
| 上传 ZIP | `<input accept=".zip">` | 批量 decrypt |
| 批量混淆 | — | 混淆 batchItems 中的图片 |
| 批量解混淆 | — | 解混淆 batchItems（或 ZIP）中的图片 |
| 打包下载 | — | 下载 encrypt_results.zip / decrypt_results.zip |

### 6.3 响应式

| 断点 | 缩略图 | 排列 | 按钮 |
|---|---|---|---|
| >=768px | 80x80 | 横向滚动 | 水平分两行 |
| <768px | 56x56 | 4 列网格 | 换行 2 列 |

## 7. 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/index.ts` | 修改 | 新增 decrypt-zip 端点；更新前端 UI（多图输入、ZIP 上传、去掉自动下载） |
| `src/batch.ts` | 修改 | 新增 ZIP 解压函数 `extractZipBuffer(buffer): {name, buffer}[]` |
| `src/index.test.ts` | 修改 | 新增 decrypt-zip 集成测试；更新旧测试 |
| `src/batch.test.ts` | 修改 | 新增 ZIP 解压单元测试 |
| `docs/api.md` | 修改 | 新增 decrypt-zip 端点 |
| `docs/frontend.md` | 修改 | 更新 UI 结构和缩略图行为 |
| `docs/architecture.md` | 修改 | 更新双流程描述 |
| `AGENTS.md` | 修改 | 新增批量处理设计规范 |

## 8. 错误处理

| 场景 | 前端 | 后端 |
|---|---|---|
| ZIP 内无图片 | 提示"ZIP 内未找到图片文件" | 返回 400 |
| ZIP 解压失败 | 提示"ZIP 文件损坏" | 返回 400 |
| 单张解密失败 | 红色边框 + 错误信息 | error 字段不影响其他 |
| 全部失败 | 提示全部失败 | 返回 400 |
| 预览过期 | 提示重新上传 | 返回 404 |

## 9. 测试计划

### 单元测试

| 测试 | 文件 | 内容 |
|---|---|---|
| `extractZipBuffer` 解压 ZIP | `batch.test.ts` | 解压含 3 个文件的 ZIP，验证文件名和内容 |
| `extractZipBuffer` 过滤非图片 | `batch.test.ts` | ZIP 内含 txt 文件，验证被过滤 |
| `extractZipBuffer` 空 ZIP | `batch.test.ts` | 返回空数组 |
| `extractZipBuffer` 保持顺序 | `batch.test.ts` | 验证文件顺序与原 ZIP 一致 |

### 集成测试

| 测试 | 文件 | 内容 |
|---|---|---|
| encrypt 多图 → zipId | `index.test.ts` | 上传 3 张 → 收到 zipId |
| encrypt 手动下载 ZIP | `index.test.ts` | POST download?zipId=xxx → ZIP |
| decrypt-zip 上传 ZIP | `index.test.ts` | 上传 ZIP → 收到 items |
| decrypt-zip 逐图预览 | `index.test.ts` | GET /image/:id → JPEG |
| decrypt-zip 打包下载 | `index.test.ts` | POST download → ZIP |
| 错误：ZIP 无图片 | `index.test.ts` | 上传不含图片的 ZIP → 400 |
| 单图 + 批量共存 | `index.test.ts` | 单图 encrypt 和批量 encrypt 互不影响 |
