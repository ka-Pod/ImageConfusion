# Vercel 部署修复计划

> **起因：** Vercel 部署后返回 "This Serverless Function has crashed."
> **原因：** `execSync('tar ...')` 在 Serverless 环境不存在 + 导出格式不兼容 + 缺少 `vercel.json`

**目标：** 图片的加密、解密，Vercel Serverless 环境下正常运行。

**约束：**
- ZIP 通常很大含多张大图（可能几百 MB，几十分文件），一次性读取到 memory 必须避免
- Serverless function 内存限制 128MB
- `/tmp` 目录可写但空间有限
- 平台日志通过 `console.log` 可查看

## 涉及变更

### `vercel.json`（新增）

根目录新增 Vercel 配置文件，指定入口和运行时。

### `src/index.ts`

改动导出格式：Bun `serve()` 格式是 `export default { port, fetch }`，Vercel 需要 serverless function 格式 `export default app.fetch`。

### `src/batch.ts`

替换 `extractZipBuffer()` 实现。当前用 `execSync('tar -xf ...')`，这是 Unix `tar` 命令的硬依赖，Vercel Serverless 环境没有。需用纯 JS 方案代替。

选用 **unzipper**（yauzl 的上层封装）：
- 纯 JS，零原生依赖
- 流式逐条解压，不占内存
- API 现代（async/await），和当前代码风格一致

同时可移除 `execSync`、`mkdtempSync`、`writeFileSync`、`readFileSync`、`readdirSync` 等同步 IO，因为 unzipper 从 buffer 直接解压，不需要写磁盘。

### `src/logger.ts`

写文件失败时不抛异常。Vercel 上 `process.cwd()/logs/` 是只读的。添加 `/tmp/logs/` fallback 路径：

1. 尝试写 `logs/{date}.log`
2. 失败 → 尝试写 `/tmp/logs/{date}.log`
3. 再失败 → 静默（`console.log` 已输出到平台日志）

### `package.json`

添加 `"build": "tsc --noEmit"` 脚本（Vercel 构建流程需要）.

### `.gitignore`

添加 `logs/` 目录，避免日志被包含。

## 检查

- `git status`、`git diff` 确认只改动目标文件

## 任务

- [ ] **Task 1: 新增 `vercel.json`**
- [ ] **Task 2: 修改 `src/index.ts` 导出格式**
- [ ] **Task 3: 加 unzipper 依赖 + 重写 `extractZipBuffer()`**
- [ ] **Task 4: 修改 `src/logger.ts` — `/tmp` fallback + 静默失败**
- [ ] **Task 5: 更新 `package.json` + `.gitignore`**
- [ ] **Task 6: 验证 — `bun test` 全通过, `pnpm lint` 干净**
