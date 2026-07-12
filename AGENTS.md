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

## 9. AI 安全与 Bug 审查强制规则

本节是给 Codex、Claude、Trae、Cursor 等 AI 代理使用的强制规则。执行代码修改、审查、提交、推送前必须逐条检查；没有命令证据不得声称安全。

### 9.1 绝对禁止提交的内容

以下路径和文件属于本地运行数据、隐私数据、临时产物或构建产物，禁止进入 Git 索引、提交和 GitHub：

- `storage/`
- `storage-repro-*/`
- `tmp/`
- `logs/`
- `node_modules/`
- `dist/`
- `coverage/`
- `.env`, `.env.*`
- `*.log`
- `*.zip`
- `*.sqlite`, `*.db`
- 含用户上传图片、漫画 ZIP、解密结果、封面缓存、会话缓存的任何目录

如果确实需要提交示例数据，必须满足全部条件：

- 使用 `fixtures/` 或 `src/**/__fixtures__/` 下的最小化合成样本
- 文件不来自用户真实数据
- 文件大小合理，且用途写在测试或文档中
- 提交前明确说明“这是合成测试数据，不含用户内容”

### 9.2 Git 安全门禁

任何 AI 在提交、推送、创建 PR、声称“没有泄露”前，必须执行并汇报以下命令的关键结果：

```bash
git status --short
git diff --name-only
git diff --cached --name-only
git ls-files storage storage-repro-* tmp logs node_modules dist coverage
git ls-files | grep -E '(^|/)(storage|tmp|logs|node_modules|dist|coverage)(/|$)|\.env|\.zip$|\.sqlite$|\.db$|\.log$'
```

Windows PowerShell 环境下可以使用等价命令：

```powershell
git status --short
git diff --name-only
git diff --cached --name-only
git ls-files storage storage-repro-* tmp logs node_modules dist coverage
git ls-files | Select-String -Pattern '(^|/)(storage|tmp|logs|node_modules|dist|coverage)(/|$)|\.env|\.zip$|\.sqlite$|\.db$|\.log$'
```

判定规则：

- `git ls-files storage storage-repro-* tmp logs ...` 必须无输出
- 敏感文件扫描必须无输出，或仅输出经人工确认的合成 fixture
- `git status --short` 中不得出现未解释的删除、二进制文件、ZIP、数据库、日志、缓存目录
- 发现误提交后，禁止继续开发功能；必须先处理泄露风险

### 9.3 发现泄露时的应急流程

一旦发现 `storage/`、`storage-repro-*`、用户上传文件、ZIP、日志、数据库或密钥进入 Git 历史，立即执行以下流程：

1. 停止功能开发，记录泄露路径和最近相关提交。
2. 将泄露路径加入 `.gitignore`，例如 `storage-repro-*/`。
3. 从当前索引和工作区移除泄露文件，不得保留在可提交状态。
4. 用 `git filter-repo` 优先清理历史；若不可用，才使用 `git filter-branch`。
5. 清理后执行 `git log --all --stat -- <泄露路径>` 和 `git ls-files <泄露路径>` 验证无输出。
6. 如已推送到远端，必须使用 `git push --force-with-lease` 覆盖远端历史。
7. 如果文件包含真实用户数据或密钥，按泄露处理：通知用户、轮换密钥、重新生成数据。

禁止只删除当前工作区文件后声称已解决；进入 Git 历史的文件必须清理历史。

### 9.4 Bug 检查流程

审查或修改代码时必须按以下顺序检查：

1. **输入边界**：空文件、坏图片、空 ZIP、损坏 ZIP、非图片文件、大文件、中文文件名、子目录文件名。
2. **像素正确性**：encrypt/decrypt 是否使用同一 `width`、`height`、`channels`、offset 和 Gilbert 曲线。
3. **格式一致性**：上传、批量、画廊、阅读器支持的扩展名必须一致；不能统计支持 jpg，但读取只找 png。
4. **并发与竞态**：禁止依赖 `existsSync` 后再假设文件仍存在；读写文件必须 `try/catch` 兜底。
5. **HTTP 语义**：用户输入错误返回 400；缺资源返回 404；真实服务端异常才返回 500。
6. **资源清理**：临时 session、预览缓存、批量 ZIP、定时器必须可清理；后台 timer 不得阻止测试进程退出。
7. **安全输出**：错误信息不得暴露本机绝对路径、密钥、用户隐私文件名或完整堆栈。
8. **前端状态**：上传、保存、删除、阅读页必须处理 loading、失败、空列表、重复点击和路由参数错误。

### 9.5 修复完成验收

修复 bug 或安全问题后必须执行：

```bash
bun test
pnpm lint
git status --short
```

如果 `pnpm lint` 因环境问题无法执行，必须说明失败原因和已执行的替代检查。安全相关修复必须额外执行 9.2 的 Git 安全门禁命令。

最终报告必须包含：

- 修改了哪些文件
- 发现并修复了什么风险
- 执行了哪些验证命令
- 是否仍有无法验证的残余风险

