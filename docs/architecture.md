# 架构说明

## 系统架构

```
用户浏览器                   Bun/Hono 服务端
    │                            │
    │── POST /api/encrypt ──────→│  sharp 解码 → Gilbert 混淆 → sharp 编码 JPEG
    │←───── 混淆后图片 ──────────│
    │                            │
    │── POST /api/decrypt ──────→│  sharp 解码 → Gilbert 解混淆 → sharp 编码 JPEG
    │←──── 还原后图片 ───────────│
```

## 核心模块

| 模块 | 路径 | 职责 |
|---|---|---|
| 服务入口 | `src/index.ts` | Hono HTTP 路由，请求处理 |
| Gilbert 曲线 | `src/gilbert.ts` | 任意尺寸矩形空间填充曲线生成 |
| 混淆引擎 | `src/confuse.ts` | 像素级混淆/解混淆（Uint8Array 操作） |
| 前端渲染 | `src/ui.ts` | `renderPage()` 生成完整 HTML/CSS/JS（阅读器布局、拖拽、Toast、进度条、键盘导航、Kinetic Typography） |
| 服务入口 | `src/index.ts` | Hono HTTP 路由，请求处理，调用 `renderPage()` |
| 批处理引擎 | `src/batch.ts` | 临时存储管理、ZIP 打包（archiver）、ZIP 解压（tar）、TTL 清理 |

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


