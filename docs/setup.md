# 环境搭建

## 前置依赖

- [Bun](https://bun.sh) >= 1.0
- [pnpm](https://pnpm.io) >= 8
- [libvips](https://libvips.github.io/libvips/)（sharp 依赖，Windows 下通常自动安装）

## 初始化

```bash
pnpm install
pnpm dev        # 同时启动后端 (3000) 和前端 Vite Dev Server (5173)
```

或分别启动：

```bash
pnpm dev:server   # 仅启动后端 http://localhost:3000
pnpm dev:client   # 仅启动前端 http://localhost:5173
```

访问 `http://localhost:5173`

## 生产构建

```bash
pnpm build                        # Vite 构建前端到 public/
pnpm install --ignore-scripts --production
bun run src/server/index.ts       # Hono 服务 public/ 静态文件
```

## 目录说明

| 目录 | 说明 |
|------|------|
| `src/server/` | 后端源码（Hono API） |
| `src/client/` | 前端源码（Vue 3） |
| `storage/` | 漫画持久化存储（自动创建） |
| `public/` | 生产构建产物 |
| `logs/` | 日志文件 |
