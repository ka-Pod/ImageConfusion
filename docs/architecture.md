# 架构说明

## 系统架构

```
用户浏览器                   Bun/Hono 服务端
    │                            │
    │── Vite Dev Server ────────→│  /api/* 代理到 Hono
    │   (开发模式 / 端口 5173)    │
    │                            │
    │── GET /confuse ───────────→│  Vue Router → ConfusePage
    │── GET /gallery ───────────→│  Vue Router → GalleryPage
    │                            │
    │── POST /api/encrypt ──────→│  sharp 解码 → Gilbert 混淆 → sharp 编码 JPEG
    │←───── 混淆后图片 ──────────│
    │                            │
    │── POST /api/decrypt ──────→│  sharp 解码 → Gilbert 解混淆 → sharp 编码 JPEG
    │←──── 还原后图片 ───────────│
    │                            │
    │── POST /api/gallery/create ─→│  接收加密 ZIP → 含 metadata 直接导入，否则补写 metadata
    │── GET /api/gallery/list ──→│  扫描 storage/ → 读取 metadata → 返回漫画列表
    │── DELETE /api/gallery/:id ─→│  删除 storage/<id>/ 目录
    │── POST /api/gallery/:id/decrypt → 读取 storage/ → 解密全部页 → 存入 tmp/
```

## 核心模块

### 后端模块

| 模块 | 路径 | 职责 |
|------|------|------|
| 服务入口 | `src/index.ts` | Bun 服务启动，导出 app.fetch |
| 应用根 | `src/app.ts` | Hono 应用配置，路由挂载 |
| 混淆 API | `src/routes.ts` | /api/encrypt, /api/decrypt, /api/batch/* |
| 画廊 API | `src/server/gallery-routes.ts` | /api/gallery/* (create/list/decrypt/cleanup) |
| Gilbert 曲线 | `src/gilbert.ts` | 任意尺寸矩形空间填充曲线生成 |
| 混淆引擎 | `src/confuse.ts` | 像素级混淆/解混淆（Uint8Array 操作） |
| 批处理引擎 | `src/batch.ts` | 临时存储管理、ZIP 打包、ZIP 解压、TTL 清理 |
| 画廊存储 | `src/server/gallery-storage.ts` | storage/ 目录管理、漫画 ZIP 读写、封面解密 |
| 日志模块 | `src/logger.ts` | 日志写入（logs/ 目录） |

### 前端模块 (src/client/)

| 模块 | 路径 | 职责 |
|------|------|------|
| 应用入口 | `src/client/main.ts` | Vue 应用挂载 |
| 路由配置 | `src/client/router.ts` | /confuse → /gallery → /gallery/:id/detail → reader |
| 根组件 | `src/client/App.vue` | 导航栏 + 路由出口 |
| 混淆页 | `src/client/pages/ConfusePage.vue` | 混淆工具（单图/批量） |
| 画廊页 | `src/client/pages/GalleryPage.vue` | 漫画画廊展示 |
| 详情页 | `src/client/pages/ComicDetailPage.vue` | 漫画详情 + 解密入口 |
| 阅读器 | `src/client/pages/ReaderPage.vue` | 翻页阅读器 |

## 混淆算法

1. 生成 `width × height` 的 Gilbert 曲线坐标序列
2. 计算偏移量 `offset = round((√5 - 1) / 2 × width × height)`
3. 沿曲线做循环移位：`curve[i] → curve[(i + offset) % total]`
4. 解码/编码借助 sharp 完成

## 性能优化（方向1）

- 使用 `Uint8Array.set()` 批量拷贝像素块（4字节/像素）
- 避免 `slice()` 产生的临时数组分配

---

## 批量处理架构

### 双流程设计

**Encrypt 流程（多图选择 → 混淆 → 用户手动打包）：**
```
用户选择多张图片/文件夹 → POST /api/batch/encrypt (image[])
  → sharp 解码 → Gilbert 混淆 → sharp 编码 JPEG(q95)
  → 存入 temp 目录 → archiver 打包 ZIP → 保存 ZIP 到 temp
  → 返回 JSON { items, zipId }
  → 前端缩略图灰化，标记"已混淆"
  → 用户手动点击"打包下载" → POST /api/batch/download?zipId=xxx
  → 下载 encrypt_results.zip（可重复下载，TTL 到期清理）
```

**Decrypt 流程（ZIP 上传 → 解压 → 解密 → 预览 → 手动打包）：**
```
① 用户上传 encrypt_results.zip
→ POST /api/batch/decrypt-zip (zip file)
→ 服务端解压 → 过滤非图片 → 逐张:
   sharp 解码 → Gilbert 解混淆 → sharp 编码 JPEG(q95)
→ 存入 temp 目录 → 返回 JSON { sessionId, items: [{ id }] }

② 前端 GET /api/batch/image/:id → 逐图预览（用户肉眼验证）

③ 用户点击"打包下载" → POST /api/batch/download { sessionId, ids }
→ 下载 decrypt_results.zip
```

### 临时存储

| 项目 | 详情 |
|---|---|
| 根目录 | `os.tmpdir()/imageconfusion-{sessionId}/` |
| 文件命名 | `{uuid}.jpg` |
| 元数据 | `manifest.json` 记录 id ↔ 原始文件名映射 |
| 清理时机 | ① ZIP 下载后删除 ② 新批次清理旧 session ③ TTL 30 分钟 ④ 服务启动清场 |
| 清理实现 | 定时器每 5 分钟扫描，删除过期文件 |

### 画廊导入流程

**通过 NewComicModal 上传 ZIP：**

```
用户选择 ZIP → 前端本地检测 metadata.json
  │
  ├── 含 metadata.json → 禁用 name 输入 → POST /api/gallery/create (zip)
  │   → 服务端直接保存原 ZIP → 返回 { id, name, totalPages }
  │
  └── 不含 metadata.json → name 必填 → POST /api/gallery/create (zip + name + author + source)
      → 服务端解压 → 提取图片 → 补写 metadata.json
      → 重新打包为 page_NNN.png → 保存 → 返回 { id, name, totalPages }
```

**关键约束：**
- Gallery 只接收 ZIP，不接收单张/多张图片
- 导入流程不对图片像素做任何变换（不再调用 encrypt）
- 不含 metadata 的 ZIP 内图片统一重命名为 `page_NNN.png`，保持原 buffer

### 画廊存储

| 项目 | 详情 |
|------|------|
| 根目录 | `storage/` |
| 组织结构 | `storage/<comic-id>/encrypted.zip` |
| 漫画 ZIP 格式 | 内含 `metadata.json` + `page_NNN.png/jpg`（混淆后图片） |
| metadata.json | `{ name, author, source, createdAt, coverIndex }` |
| 生命周期 | 永久保存，直到用户手动删除 |
| 解密临时文件 | `tmp/gallery-{sessionId}/page_NNN.jpg`，退出阅读时清理 |


