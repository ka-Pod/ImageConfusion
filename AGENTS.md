# ImageConfusion

基于 Gilbert 空间填充曲线的图片混淆工具。

---

## 1. 核心技术栈

| 项目 | 选型 |
|---|---|
| 编程语言 | TypeScript |
| 运行时 | Bun |
| HTTP 框架 | Hono |
| 图像处理 | sharp |
| 包管理器 | pnpm |
| 项目类型 | 服务端图片混淆工具 + Vue 3 前端 SPA |
| 核心约束 | 逐像素混淆，无损/有损可选输出；Vue 3 前端 SPA |

## 2. 环境搭建与开发流程

### 测试环境

```bash
pnpm install --ignore-scripts
pnpm dev          # 同时启动后端 http://localhost:3000 和前端 http://localhost:5173
pnpm dev:server   # 仅后端 http://localhost:3000
pnpm dev:client   # 仅前端 http://localhost:5173
```

### 生产环境

```bash
pnpm install --ignore-scripts --production
bun run src/index.ts
```

### 构建检查

构建部署前需执行：

```bash
pnpm lint
```

确保无 lint 错误后方可构建。

## 3. 测试规范

### 执行命令

```bash
bun test
```

### 测试要求

- 核心算法（gilbert2d、encrypt、decrypt）必须有单元测试覆盖
- 服务端 API 端到端测试（上传 → 混淆 → 下载 → 解混淆 → 验证）
- 新增代码测试覆盖率 **≥ 80%**

### 禁止行为

- 禁止跳过测试直接合并
- 禁止提交覆盖率下降的代码
- 禁止 mock 核心混淆逻辑进行测试（需测试真实像素排列结果）

## 4. 代码风格规范

- 使用 TypeScript strict 模式
- 使用 `type` 而非 `interface` 定义对象类型（项目统一风格）
- 函数参数超过 2 个时使用 options 对象
- 文件名使用 kebab-case（如 `gilbert.ts`, `confuse.ts`）
- 禁止使用 `any`，优先 `unknown`
- 异步操作使用 `async/await`，禁止裸 `.then()`

## 5. 调试与排错

### 日志

- 日志目录：`logs/`
- 按日期分区命名：`logs/2026-03-12.log`
- 日志级别：`INFO` / `WARN` / `ERROR`

### 常见问题

1. **开发服务启动失败**
   - 检查 3000 端口是否被占用：`netstat -ano | findstr :3000`
   - 或被占用时设置环境变量 `PORT=3001`
2. **sharp 安装失败**
   - 确保系统已安装 libvips 依赖，或使用 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 环境变量重试
3. **同一图片无法正确还原**
   - 检查混淆/解混淆使用同一 offset 和曲线算法
   - 确认图片经过解混淆后是否存储为有损格式导致数据丢失

## 8. 已知问题 / Bug Tracker

### 已修复

| Bug | 文件 | 描述 | 修复状态 |
|-----|------|------|----------|
| 后端入口路径错误 | `package.json` | `dev:server` 指向不存在的 `src/server/index.ts` | ✅ 已修复 |
| docs 后端路径错误 | `docs/architecture.md`, `docs/setup.md` | 文档中后端模块路径使用 `src/server/` 前缀，但实际在 `src/` | ✅ 已修复 |
| save-from-batch 双读 body | `gallery-routes.ts:72-75` | `c.req.json()` 和 `c.req.formData()` 同时调用导致 body 被消费两次 | ✅ 已修复 |
| ReaderPage totalPages 未设置 | `ReaderPage.vue` | `totalPages` 始终为 0，解密返回值未传递到阅读器 | ✅ 已修复 |
| cleanup 路由被 /:id 吞掉 | `gallery-routes.ts` | `/:id` 在 `/cleanup` 之前注册，"cleanup" 被当 id 匹配 | ✅ 已修复 |
| ComicDetailPage 类型导入路径错误 | `ComicDetailPage.vue:4` | `../../types` 应为 `../types` | ✅ 已修复 |
| logSync 缺少文件写入 | `logger.ts:60-72` | `logSync` 检查了 log 目录存在性但从未真正写入文件 | ✅ 已修复 |
| metadata.json 被 extractZipBuffer 过滤 | `batch.ts:97`, `gallery-storage.ts` | `extractZipBuffer` 只返回图片文件，导致 `listComics`/`getComic` 永远读不到 metadata.json | ✅ 已修复 |

### 待处理

| Bug | 文件 | 描述 | 影响 |
|-----|------|------|------|
| ConfusePage.vue 无测试覆盖 | `ConfusePage.vue` | 主混淆页面无组件测试 | 中 |
| gallery-storage coverBase64 生成时内存低效 | `gallery-storage.ts:59-64` | 封面解密先 raw 再转 Buffer 再 jpeg，可优化为直接 sharp pipe | 低 |

## 6. 第一性原理

- `(像素, 空间填充曲线)` → 重排列 → 图片
- encrypt 产出一个 ZIP，decrypt 消费一个 ZIP
- 所有处理在服务端完成，前端不执行混淆逻辑
- encrypt 有损（JPEG q95），decrypt 需要原始加密结果

## 7. 对抗性审查

审查四维度：
1. **正确性**——是否按要求实现？
2. **安全性**——漏洞、暴露密钥、权限问题？
3. **Bug**——边界情况、错误处理、回归？
4. **事实**——声明、版本号、URL 是否可验证？

验证者必须执行命令收集证据。没有证据就没有 PASS。

结论：
- **PASS**——所有检查通过并有证据
- **FAIL**——发现问题，报告详情，最多重试 3 次
- **PARTIAL**——部分通过，其他无法验证

