# 环境搭建

## 前置依赖

- [Bun](https://bun.sh) >= 1.0
- [pnpm](https://pnpm.io) >= 8
- [libvips](https://libvips.github.io/libvips/)（sharp 依赖，Windows 下通常自动安装）

## 初始化

```bash
pnpm install
bun run src/index.ts
```

服务默认运行在 `http://localhost:3000`

## 生产部署

```bash
pnpm install --production
bun run src/index.ts
```
