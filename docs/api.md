# API 文档

## GET /

返回前端页面（图片上传/混淆/解混淆界面）

---

## POST /api/encrypt

上传原始图片，返回混淆后图片。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| image | file | 原始图片（JPEG/PNG/WebP） |

**响应：** `image/jpeg`（混淆后的图片）

---

## POST /api/decrypt

上传混淆图片，返回解混淆后图片。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| image | file | 混淆图片 |

**响应：** `image/jpeg`（还原后的图片）

---

## POST /api/batch/encrypt

上传多个图片，返回混淆后图片的 ZIP 下载标识。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `image[]` | file[] | 多个原始图片，保持表单顺序（JPEG/PNG/WebP），单张 ≤ 50MB，单批 ≤ 100 张 |

**响应：** `200 application/json`
```json
{
  "zipId": "uuid-string",
  "items": [
    { "originalName": "photo1.jpg", "processedName": "encrypt_photo1.jpg" },
    { "originalName": "photo2.jpg", "processedName": "encrypt_photo2.jpg", "error": "解析失败" }
  ]
}
```

**注意：** 图片顺序与上传时 FormData 中 `image[]` 的顺序一致。

---

## POST /api/batch/decrypt

上传多个混淆图，处理后返回可预览的 ID 列表。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `image[]` | file[] | 多个混淆图片 |

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

---

## GET /api/batch/image/:id

获取单张处理后的图片（用于 decrypt 后逐图预览）。

**响应：** `200 image/jpeg`
**错误：** `404 { "error": "图片已过期或不存在" }`

---

## POST /api/batch/download

打包指定处理后的图片为 ZIP。

**请求（decrypt 模式）：** `application/json`
```json
{ "sessionId": "session-uuid", "ids": ["img-uuid-1", "img-uuid-2"] }
```

**请求（encrypt 模式）：** `POST /api/batch/download?zipId=uuid-string`

> **注意：** 必须使用 POST 方法。前端 fetch 默认 GET 会导致 404。

**响应：** `200 application/zip`
- 文件名：`encrypt_results.zip` 或 `decrypt_results.zip`
- ZIP 内文件按原始上传顺序排列，文件名带 `encrypt_` / `decrypt_` 前缀
- ZIP 下载后不删除临时文件（可重复下载），TTL 30 分钟到期自动清理

---

## POST /api/batch/decrypt-zip

上传 encrypt_results.zip，服务端解压后逐张解密，返回可预览的 ID 列表。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `zip` | file | encrypt_results.zip，单次 ≤ 200MB |

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

**内部流程：** 接收 ZIP buffer → unzipper 流式解压 → 过滤非图片文件 → 逐张 decrypt → 存入 session temp → 返回 items

---

---

## 画廊 API

## POST /api/gallery/create

上传图片创建漫画，服务端混淆后打包为漫画 ZIP 存入 storage/。

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| image[] | file[] | 原始图片（单张或多张） |
| name | string | 漫画名称（必填） |
| author | string | 作者（可选） |
| source | string | 图源（可选） |

**响应：** `200 application/json`
```json
{ "id": "uuid", "name": "海贼王 第1话", "totalPages": 32 }
```

---

## POST /api/gallery/save-from-batch

将批量加密结果保存为漫画（从 /confuse 页面触发）。

**请求：** `application/json`
```json
{ "zipBuffer": "base64-encoded-zip", "name": "...", "author": "...", "source": "..." }
```

**响应：** `200 application/json`
```json
{ "id": "uuid", "name": "..." }
```

---

## GET /api/gallery/list

返回 storage/ 中所有漫画列表。

**响应：** `200 application/json`
```json
[
  {
    "id": "uuid",
    "name": "海贼王 第1话",
    "author": "尾田荣一郎",
    "source": "腾讯动漫",
    "createdAt": "2026-07-10T12:00:00Z",
    "coverIndex": 0,
    "totalPages": 32,
    "coverBase64": "/9j/4AAQ..."  // 已解密的封面 JPEG base64
  }
]
```

---

## GET /api/gallery/:id

返回单部漫画详情。

**响应：** `200 application/json`
```json
{
  "id": "uuid",
  "name": "海贼王 第1话",
  "author": "尾田荣一郎",
  "source": "腾讯动漫",
  "createdAt": "2026-07-10T12:00:00Z",
  "coverIndex": 0,
  "totalPages": 32
}
```

---

## POST /api/gallery/:id/decrypt

解密指定漫画的全部页面。

**响应：** `200 application/json`
```json
{ "sessionId": "session-uuid", "totalPages": 32 }
```

解密后的图片存入 `tmp/gallery-{sessionId}/` 目录。

---

## GET /api/gallery/decrypt/:sessionId/page/:n

获取指定页的解密图片。

| 参数 | 说明 |
|------|------|
| sessionId | 解密会话 ID |
| n | 页码（从 0 开始） |

**响应：** `200 image/jpeg`

---

## POST /api/gallery/cleanup

清理解密会话临时文件。

**请求：** `application/json`
```json
{ "sessionId": "session-uuid" }
```

**响应：** `200 { "ok": true }`

---

## POST /api/batch/cleanup

通知服务端清理当前 session 的临时文件（用户重新选文件夹时前端自动调用）。

**请求：** `application/json`
```json
{ "sessionId": "session-uuid" }
```

**响应：** `200 { "ok": true }`
