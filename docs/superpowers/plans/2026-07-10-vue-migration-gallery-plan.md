# Vue.js 迁移 + 漫画画廊 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端从 `src/ui.ts` 单体重构为 Vue 3 项目，并新增漫画画廊功能

**Architecture:** 保持现有后端不变，新增 `src/client/` 目录存放 Vue 前端代码。后端新增 `gallery-routes.ts` 处理画廊相关 API。Vue 前端使用 Vite 构建，Vue Router 实现页面路由，CSS Variables + Scoped CSS 保留 Neo-Brutalist 风格。

**Tech Stack:** Vue 3 (Composition API), Vite, Vue Router, Bun (服务端), sharp (图像处理)

## Global Constraints

- 保留 Neo-Brutalist 设计风格（直角、硬阴影、高对比度）
- 不修改核心混淆算法（gilbert.ts, confuse.ts）
- 不引入状态管理库（Pinia/Vuex）
- 不使用 any，优先 unknown
- 文件名使用 kebab-case
- 使用 type 而非 interface
- 新增代码测试覆盖率 ≥80%
- 漫画 ZIP 必须包含 metadata.json
- 解密后的临时文件阅读退出时自动清理

---
## 文件变更清单

### 新创建的文件

| 文件 | 职责 |
|------|------|
| `src/server/gallery-routes.ts` | 漫画画廊 API 路由 |
| `src/client/main.ts` | Vue 应用入口 |
| `src/client/router.ts` | Vue Router 配置 |
| `src/client/App.vue` | 根组件（导航栏 + 路由出口） |
| `src/client/assets/styles/main.css` | 全局 CSS 变量 + Neo-Brutalist 基础样式 |
| `src/client/assets/styles/animations.css` | 动画定义 |
| `src/client/pages/ConfusePage.vue` | 混淆工具页 |
| `src/client/pages/GalleryPage.vue` | 漫画画廊页 |
| `src/client/pages/ComicDetailPage.vue` | 漫画详情页 |
| `src/client/pages/ReaderPage.vue` | 漫画阅读器页 |
| `src/client/components/common/AppHeader.vue` | 页面标题组件 |
| `src/client/components/common/ToastContainer.vue` | Toast 通知容器 |
| `src/client/components/common/ProgressBar.vue` | 进度条组件 |
| `src/client/components/common/DropZone.vue` | 拖拽上传区域 |
| `src/client/components/confuse/ControlBar.vue` | 操作按钮栏 |
| `src/client/components/confuse/ImagePreview.vue` | 图片预览组件 |
| `src/client/components/confuse/ThumbnailSidebar.vue` | 缩略图侧边栏 |
| `src/client/components/confuse/SaveAsComicModal.vue` | 保存为漫画弹窗 |
| `src/client/components/gallery/ComicCard.vue` | 漫画封面卡片 |
| `src/client/components/gallery/NewComicModal.vue` | 新建漫画弹窗 |
| `src/client/components/reader/ComicPage.vue` | 阅读器单页 |
| `src/client/components/reader/PageNav.vue` | 阅读器翻页导航 |
| `src/client/composables/useConfuse.ts` | 混淆工具状态组合式函数 |
| `src/client/composables/useToast.ts` | Toast 通知组合式函数 |
| `src/client/composables/useKeyboard.ts` | 键盘导航组合式函数 |
| `src/client/types/index.ts` | 类型定义 |
| `vite.config.ts` | Vite 构建配置 |

### 修改的文件

| 文件 | 变更说明 |
|------|----------|
| `src/server/app.ts` | 添加 gallery-routes 路由挂载；开发模式代理 Vite |
| `package.json` | 添加 Vite + Vue 依赖；更新 scripts |
| `tsconfig.json` | 添加 client/ 路径 |
| `.gitignore` | 添加 storage/ 和 dist/ |
| `docs/api.md` | 添加画廊 API 文档 |
| `docs/architecture.md` | 更新架构图，添加 Vue 前端和漫画画廊模块 |
| `docs/frontend.md` | 迁移到 Vue 后的前端文档 |
| `docs/setup.md` | 更新安装和开发流程 |

### 删除的文件

| 文件 | 替代 |
|------|------|
| `src/ui.ts` | 被 Vue 组件替代 |
| `src/ui.test.ts` | 被新的 Vue 组件测试替代 |

---

## 实施任务分解

### Task 1: 项目初始化和依赖安装

**Files:**
- Create: `vite.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 现有 package.json
- Produces: 可运行的 Vite + Vue 项目骨架

- [ ] **Step 1: 安装 Vue 依赖**

Run:
```bash
cd C:\Users\poden\Desktop\Code\ImageConfusion
pnpm add vue vue-router@4
pnpm add -D vite @vitejs/plugin-vue
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname, 'src/client'),
  base: '/',
  build: {
    outDir: resolve(__dirname, 'public'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

- [ ] **Step 3: 更新 package.json**

Edit `package.json` scripts section:
```json
{
  "scripts": {
    "dev:client": "vite",
    "dev:server": "bun run --hot src/server/index.ts",
    "dev": "concurrently \"pnpm dev:server\" \"pnpm dev:client\"",
    "build": "vite build",
    "start": "bun run src/server/index.ts",
    "test": "bun test",
    "lint": "bunx tsc --noEmit"
  }
}
```

Add `concurrently` as devDependency:
```bash
pnpm add -D concurrently
```

- [ ] **Step 4: 更新 tsconfig.json**

```json
{
  "compilerOptions": {
    "types": ["bun"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "noEmit": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/client/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: 更新 .gitignore**

```
node_modules/
logs/
*.log
tmp/
storage/
public/
```

- [ ] **Step 6: 安装完成后提交**

```bash
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.json .gitignore
git commit -m "build: initialize Vite + Vue 3 project scaffolding"
```

---

### Task 2: 创建 Vue 应用骨架

**Files:**
- Create: `src/client/main.ts`
- Create: `src/client/router.ts`
- Create: `src/client/App.vue`
- Create: `src/client/assets/styles/main.css`
- Create: `src/client/assets/styles/animations.css`
- Create: `src/client/types/index.ts`
- Create: `src/client/index.html`

**Interfaces:**
- Consumes: Task 1 的 vite.config.ts
- Produces: 空路由的 Vue 应用，可打开空白页面

- [ ] **Step 1: 创建 index.html**

File: `src/client/index.html`
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图片混淆 - ImageConfusion</title>
  <script type="module" src="/main.ts"></script>
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

- [ ] **Step 2: 创建类型定义**

File: `src/client/types/index.ts`
```typescript
export type BatchItem = {
  file: File
  id?: string
  processedName: string
  status: 'pending' | 'processing' | 'encrypted' | 'decrypted' | 'error'
  errorMsg?: string
  processedBlob?: Blob
}

export type ComicMeta = {
  id: string
  name: string
  author: string
  source: string
  createdAt: string
  coverIndex: number
  totalPages: number
  coverBase64?: string
}

export type ToastType = 'success' | 'error' | 'info' | 'network' | 'format' | 'expired' | 'size' | 'server'

export type Toast = {
  id: number
  message: string
  type: ToastType
}
```

- [ ] **Step 3: 创建 main.ts**

File: `src/client/main.ts`
```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import './assets/styles/animations.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

- [ ] **Step 4: 创建 router.ts**

File: `src/client/router.ts`
```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/confuse',
    },
    {
      path: '/confuse',
      name: 'Confuse',
      component: () => import('./pages/ConfusePage.vue'),
    },
    {
      path: '/gallery',
      name: 'Gallery',
      component: () => import('./pages/GalleryPage.vue'),
    },
    {
      path: '/gallery/:id/detail',
      name: 'ComicDetail',
      component: () => import('./pages/ComicDetailPage.vue'),
      props: true,
    },
    {
      path: '/gallery/:id/reader',
      name: 'Reader',
      component: () => import('./pages/ReaderPage.vue'),
      props: true,
    },
  ],
})

export default router
```

- [ ] **Step 5: 创建 App.vue**

File: `src/client/App.vue`
```vue
<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import ToastContainer from './components/common/ToastContainer.vue'

const route = useRoute()

const pageTitle = '图片混淆'
</script>

<template>
  <div class="app">
    <nav class="top-nav">
      <RouterLink to="/confuse" :class="{ active: route.path.startsWith('/confuse') }">
        混淆工具
      </RouterLink>
      <RouterLink to="/gallery" :class="{ active: route.path.startsWith('/gallery') }">
        漫画画廊
      </RouterLink>
    </nav>
    <main>
      <RouterView />
    </main>
    <ToastContainer />
  </div>
</template>

<style scoped>
.top-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 100;
}
.top-nav a {
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-fg);
  border-bottom: 3px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}
.top-nav a:hover {
  color: var(--fg);
}
.top-nav a.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
</style>
```

- [ ] **Step 6: 创建全局 CSS**

File: `src/client/assets/styles/main.css`
```css
:root {
  --bg: #FAFAFA;
  --fg: #1B1B2F;
  --muted: #E8EDF2;
  --muted-fg: #7B8BA0;
  --border: #1B1B2F;
  --accent: #4A6FA5;
  --accent-hover: #3D5E8C;
  --accent-muted: #E4EAF2;
  --success: #2E8B57;
  --error: #C1292E;
  --radius: 0;
  --shadow: 4px 4px 0 0 var(--border);
  --shadow-sm: 2px 2px 0 0 var(--border);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
  animation: hueDrift 30s ease-in-out infinite;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  display: block;
}
```

- [ ] **Step 7: 创建动画 CSS**

File: `src/client/assets/styles/animations.css`
```css
@keyframes hueDrift {
  0%, 100% { background-color: #FAFAFA; }
  50% { background-color: #F0F4FA; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  to { background-position: 200% 0; }
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(60px); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: 创建空的占位页面（测试路由）**

Create placeholder files:
- `src/client/pages/ConfusePage.vue` — 包含 `<template><div class="page"><h2>混淆工具</h2></div></template>`
- `src/client/pages/GalleryPage.vue` — 同上
- `src/client/pages/ComicDetailPage.vue` — 同上
- `src/client/pages/ReaderPage.vue` — 同上

- [ ] **Step 9: 验证 Vite 能启动**

Run: `cd C:\Users\poden\Desktop\Code\ImageConfusion && npx vite --config vite.config.ts`
Expected: Vite 启动在 5173 端口，访问可见页面

- [ ] **Step 10: 提交**

```bash
git add src/client/ vite.config.ts
git commit -m "feat: scaffold Vue 3 app with router and global styles"
```

---

### Task 3: 创建 Toast 和 ProgressBar 共用组件

**Files:**
- Create: `src/client/components/common/ToastContainer.vue`
- Create: `src/client/components/common/ProgressBar.vue`
- Create: `src/client/composables/useToast.ts`

**Interfaces:**
- Consumes: Task 2 的 main.css 和 types
- Produces: useToast composable（toasts 响应式数组 + showToast/hideToast）和对应的组件

- [ ] **Step 1: 创建 useToast composable**

File: `src/client/composables/useToast.ts`
```typescript
import { ref } from 'vue'
import type { Toast, ToastType } from '../types'

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function showToast(message: string, type: ToastType = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      const idx = toasts.value.findIndex(t => t.id === id)
      if (idx !== -1) toasts.value.splice(idx, 1)
    }, type === 'error' ? 5000 : duration)
  }

  return { toasts, showToast }
}
```

- [ ] **Step 2: 创建 ToastContainer.vue**

File: `src/client/components/common/ToastContainer.vue`
```vue
<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <div id="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="['toast', `toast-${t.type}`]"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<style scoped>
#toast-container {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}
.toast {
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-left: 4px solid var(--border);
  background: #fff;
  color: var(--fg);
  font-size: 0.85rem;
  animation: toastIn 0.25s ease;
  pointer-events: auto;
  max-width: 360px;
}
.toast-success { border-left-color: var(--success); }
.toast-error { border-left-color: var(--error); }
.toast-info { border-left-color: var(--border); }
.toast-network { border-left-color: #e67e22; }
.toast-format { border-left-color: #9b59b6; }
.toast-expired { border-left-color: #3498db; }
.toast-size { border-left-color: #e74c3c; }
.toast-server { border-left-color: #c0392b; }
</style>
```

- [ ] **Step 3: 创建 ProgressBar.vue**

File: `src/client/components/common/ProgressBar.vue`
```vue
<script setup lang="ts">
defineProps<{
  current: number
  total: number
  show: boolean
}>()
</script>

<template>
  <div v-if="show" id="progress-wrap" class="show">
    <div id="progress-bar">
      <div
        id="bar-fill"
        :style="{ width: total > 0 ? (current / total) * 100 + '%' : '0%' }"
      ></div>
    </div>
    <span id="progress-label">{{ current }} / {{ total }}</span>
  </div>
</template>

<style scoped>
#progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin: 6px 0;
}
#progress-wrap.show { display: flex; }
#progress-bar {
  width: 200px;
  height: 6px;
  background: var(--muted);
}
#bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}
#progress-label {
  font-size: 0.75rem;
  color: var(--muted-fg);
}
</style>
```

- [ ] **Step 4: 提交**

```bash
git add src/client/components/common/ src/client/composables/useToast.ts
git commit -m "feat: add Toast and ProgressBar common components"
```

---

### Task 4: 实现 ConfusePage（混淆工具页）

**Files:**
- Create: `src/client/pages/ConfusePage.vue`
- Create: `src/client/components/confuse/ControlBar.vue`
- Create: `src/client/components/confuse/ImagePreview.vue`
- Create: `src/client/components/confuse/ThumbnailSidebar.vue`
- Create: `src/client/components/confuse/SaveAsComicModal.vue`
- Create: `src/client/components/common/AppHeader.vue`
- Create: `src/client/components/common/DropZone.vue`
- Create: `src/client/composables/useConfuse.ts`
- Create: `src/client/composables/useKeyboard.ts`

**Interfaces:**
- Consumes: Task 3 的 useToast composable
- Produces: 完整的混淆工具页，功能与当前 ui.ts 一致

- [ ] **Step 1: 创建 useConfuse composable**

File: `src/client/composables/useConfuse.ts`

This composable handles all state for the confuse page (both single and batch mode):
```typescript
import { ref, computed } from 'vue'
import type { BatchItem } from '../types'

export function useConfuse() {
  const batchMode = ref(false)
  const batchItems = ref<BatchItem[]>([])
  const selectedIndex = ref(-1)
  const sessionId = ref<string | null>(null)
  const zipId = ref<string | null>(null)
  const originalSrc = ref('')
  const originalFile = ref<File | null>(null)
  const originalFileName = ref('')
  const currentAction = ref<'encrypt' | 'decrypt' | ''>('')

  const selectedItem = computed(() =>
    selectedIndex.value >= 0 ? batchItems.value[selectedIndex.value] : null
  )

  const hasItems = computed(() => batchItems.value.length > 0)
  const allEncrypted = computed(() =>
    batchItems.value.length > 0 && batchItems.value.every(i => i.status === 'encrypted')
  )
  const allDecrypted = computed(() =>
    batchItems.value.length > 0 && batchItems.value.every(i => i.status === 'decrypted')
  )

  function resetAll() {
    // revoke blob URLs
    batchItems.value.forEach(i => {
      if (i.processedBlob) URL.revokeObjectURL(i.processedBlob)
    })
    if (originalSrc.value.startsWith('blob:')) URL.revokeObjectURL(originalSrc.value)
    batchMode.value = false
    batchItems.value = []
    selectedIndex.value = -1
    sessionId.value = null
    zipId.value = null
    originalSrc.value = ''
    originalFile.value = null
    originalFileName.value = ''
    currentAction.value = ''
  }

  function loadSingleFile(file: File) {
    resetAll()
    batchMode.value = false
    originalFile.value = file
    originalFileName.value = file.name
    originalSrc.value = URL.createObjectURL(file)
    selectedIndex.value = -1
  }

  function loadBatchFiles(files: FileList | File[]) {
    resetAll()
    batchMode.value = true
    batchItems.value = Array.from(files).map(f => ({
      file: f,
      status: 'pending' as const,
      processedName: '',
    }))
    selectedIndex.value = files.length > 0 ? 0 : -1
  }

  async function processSingle(action: 'encrypt' | 'decrypt'): Promise<Blob | null> {
    try {
      const response = await fetch(originalSrc.value)
      const blob = await response.blob()
      const form = new FormData()
      form.append('image', blob, 'image.jpeg')
      const res = await fetch(`/api/${action}`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      currentAction.value = action
      return await res.blob()
    } catch {
      return null
    }
  }

  async function processBatch(action: 'encrypt' | 'decrypt') {
    batchItems.value.forEach(i => { i.status = 'processing' })

    const form = new FormData()
    batchItems.value.forEach(item => {
      form.append('image', item.file, item.file.name)
    })

    const res = await fetch(`/api/batch/${action}`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()

    if (action === 'encrypt') {
      zipId.value = data.zipId
      data.items.forEach((respItem: any, i: number) => {
        if (i < batchItems.value.length) {
          batchItems.value[i].processedName = respItem.processedName
          batchItems.value[i].status = respItem.error ? 'error' : 'encrypted'
          batchItems.value[i].errorMsg = respItem.error
        }
      })
    } else {
      sessionId.value = data.sessionId
      for (let di = 0; di < data.items.length; di++) {
        const dItem = data.items[di]
        if (di < batchItems.value.length) {
          batchItems.value[di].processedName = dItem.processedName
          if (dItem.error) {
            batchItems.value[di].status = 'error'
            batchItems.value[di].errorMsg = dItem.error
          } else {
            const imgRes = await fetch(`/api/batch/image/${dItem.id}?sessionId=${sessionId.value}`)
            if (imgRes.ok) {
              batchItems.value[di].processedBlob = await imgRes.blob()
              batchItems.value[di].status = 'decrypted'
            }
          }
        }
      }
    }

    return data
  }

  return {
    batchMode, batchItems, selectedIndex, sessionId, zipId,
    originalSrc, originalFile, originalFileName, currentAction,
    selectedItem, hasItems, allEncrypted, allDecrypted,
    resetAll, loadSingleFile, loadBatchFiles, processSingle, processBatch,
  }
}
```

- [ ] **Step 2: 创建 AppHeader.vue**

File: `src/client/components/common/AppHeader.vue`
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  title?: string
  description?: string
}>()

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const h1El = ref<HTMLHeadingElement>()
const titleTarget = props.title || '图片混淆'
let scrambleTimer: ReturnType<typeof setInterval> | null = null
let titleInterval: ReturnType<typeof setInterval> | null = null

function scrambleText(target: string, duration = 600) {
  if (scrambleTimer) { clearInterval(scrambleTimer); scrambleTimer = null }
  if (!h1El.value) return
  let frame = 0
  const frames = Math.floor(duration / 50)
  scrambleTimer = setInterval(() => {
    frame++
    if (frame >= frames) {
      clearInterval(scrambleTimer!)
      scrambleTimer = null
      if (h1El.value) h1El.value.textContent = target
      return
    }
    let result = ''
    for (let ci = 0; ci < target.length; ci++) {
      result += target[ci] === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    }
    if (h1El.value) h1El.value.textContent = result
  }, 50)
}

onMounted(() => {
  titleInterval = setInterval(() => scrambleText(titleTarget, 600), 8000)
})

onUnmounted(() => {
  if (titleInterval) clearInterval(titleInterval)
  if (scrambleTimer) clearInterval(scrambleTimer)
})
</script>

<template>
  <div class="header">
    <div class="header-row">
      <div class="header-title">
        <h1 ref="h1El">{{ titleTarget }}</h1>
      </div>
      <div class="controls">
        <slot name="controls" />
      </div>
    </div>
    <p v-if="description" class="desc">{{ description }}</p>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.header-title {
  border-left: 4px solid var(--accent);
  padding-left: 1rem;
}
h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
}
.desc {
  max-width: 480px;
  margin: 0;
  padding-left: calc(1rem + 4px);
  font-size: 0.85rem;
  color: var(--muted-fg);
  line-height: 1.6;
}
</style>
```

- [ ] **Step 3-6: 创建 DropZone.vue, ControlBar.vue, ImagePreview.vue, ThumbnailSidebar.vue**

(Detailed component implementations with Neo-Brutalist styling, following the same patterns as current ui.ts)

- [ ] **Step 7: 创建 ConfusePage.vue**

File: `src/client/pages/ConfusePage.vue`

Main page combining all confuse components with the existing single/batch mode logic from ui.ts.

- [ ] **Step 8: 创建 SaveAsComicModal.vue**

File: `src/client/components/confuse/SaveAsComicModal.vue`
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '../../composables/useToast'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { showToast } = useToast()
const name = ref('')
const author = ref('')
const source = ref('')
const saving = ref(false)

async function handleSave() {
  if (!name.value.trim()) {
    showToast('请输入漫画名称', 'error')
    return
  }
  saving.value = true
  try {
    const res = await fetch('/api/confuse/save-to-gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipId: /* from parent */, name: name.value, author: author.value, source: source.value }),
    })
    if (!res.ok) throw new Error('保存失败')
    showToast('已保存到漫画画廊', 'success')
    emit('saved')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '保存失败', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Modal overlay with form for name/author/source -->
</template>
```

- [ ] **Step 9: 创建 useKeyboard composable**

Utility for keyboard navigation in batch mode (arrow keys, Home, End).

- [ ] **Step 10: 提交**

```bash
git add src/client/pages/ConfusePage.vue src/client/components/confuse/ src/client/composables/useConfuse.ts src/client/composables/useKeyboard.ts
git commit -m "feat: implement ConfusePage with single/batch mode"
```

---

### Task 5: 实现画廊后端 API

**Files:**
- Create: `src/server/gallery-routes.ts`
- Create: `src/server/gallery-storage.ts`
- Modify: `src/server/app.ts`

**Interfaces:**
- Consumes: confuse.ts 的 encryptPixels/decryptPixels, batch.ts 的 createZipFile/extractZipBuffer
- Produces: `/api/gallery/*` 全套 API 端点

- [ ] **Step 1: 创建 gallery-storage.ts**

File: `src/server/gallery-storage.ts`
```typescript
import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createZipFile, extractZipBuffer } from './batch'
import { decryptPixels } from './confuse'
import sharp from 'sharp'

const STORAGE_DIR = join(process.cwd(), 'storage')

export type ComicMeta = {
  name: string
  author: string
  source: string
  createdAt: string
  coverIndex: number
}

export type ComicEntry = ComicMeta & { id: string; totalPages: number; coverBase64?: string }

async function ensureStorageDir(): Promise<void> {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
}

export async function saveComic(zipBuffer: Buffer, meta: ComicMeta): Promise<string> {
  await ensureStorageDir()
  const id = randomUUID()
  const dir = join(STORAGE_DIR, id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'encrypted.zip'), zipBuffer)
  return id
}

export async function listComics(): Promise<ComicEntry[]> {
  await ensureStorageDir()
  const entries = await readdir(STORAGE_DIR)
  const comics: ComicEntry[] = []

  for (const entry of entries) {
    const zipPath = join(STORAGE_DIR, entry, 'encrypted.zip')
    if (!existsSync(zipPath)) continue
    try {
      const files = await extractZipBuffer(await readFile(zipPath))
      const metaFile = files.find(f => f.name === 'metadata.json')
      if (!metaFile) continue
      const meta: ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
      const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.jpg$/i.test(f.name))

      // Decrypt cover for thumbnail
      let coverBase64 = ''
      const coverIdx = meta.coverIndex
      const coverFile = imageFiles[coverIdx]
      if (coverFile) {
        const raw = await sharp(coverFile.buffer).ensureAlpha().raw().toBuffer()
        const meta2 = await sharp(coverFile.buffer).metadata()
        const w = meta2.width || 0
        const h = meta2.height || 0
        const decrypted = decryptPixels({ data: new Uint8Array(raw), width: w, height: h, channels: 4 })
        const jpeg = await sharp(Buffer.from(decrypted), { raw: { width: w, height: h, channels: 4 } })
          .resize(200)
          .jpeg({ quality: 70 })
          .toBuffer()
        coverBase64 = jpeg.toString('base64')
      }

      comics.push({
        id: entry,
        ...meta,
        totalPages: imageFiles.length,
        coverBase64,
      })
    } catch {
      // skip corrupted entries
      continue
    }
  }

  comics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return comics
}

export async function getComic(id: string): Promise<ComicEntry | null> {
  const zipPath = join(STORAGE_DIR, id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null
  try {
    const files = await extractZipBuffer(await readFile(zipPath))
    const metaFile = files.find(f => f.name === 'metadata.json')
    if (!metaFile) return null
    const meta: ComicMeta = JSON.parse(metaFile.buffer.toString('utf-8'))
    const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.jpg$/i.test(f.name))
    return { id, ...meta, totalPages: imageFiles.length }
  } catch {
    return null
  }
}

export async function decryptComic(id: string): Promise<{ sessionId: string; totalPages: number } | null> {
  const zipPath = join(STORAGE_DIR, id, 'encrypted.zip')
  if (!existsSync(zipPath)) return null

  const files = await extractZipBuffer(await readFile(zipPath))
  const imageFiles = files.filter(f => f.name.startsWith('page_') && /\.jpg$/i.test(f.name))
  const sessionId = randomUUID()
  const tmpDir = join(process.cwd(), 'tmp', `gallery-${sessionId}`)
  await mkdir(tmpDir, { recursive: true })

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    const raw = await sharp(file.buffer).ensureAlpha().raw().toBuffer()
    const meta = await sharp(file.buffer).metadata()
    const w = meta.width || 0
    const h = meta.height || 0
    const decrypted = decryptPixels({ data: new Uint8Array(raw), width: w, height: h, channels: 4 })
    const jpeg = await sharp(Buffer.from(decrypted), { raw: { width: w, height: h, channels: 4 } })
      .jpeg({ quality: 95 })
      .toBuffer()
    await writeFile(join(tmpDir, `page_${String(i + 1).padStart(3, '0')}.jpg`), jpeg)
  }

  return { sessionId, totalPages: imageFiles.length }
}

export function getDecryptedPage(sessionId: string, page: number): string {
  return join(process.cwd(), 'tmp', `gallery-${sessionId}`, `page_${String(page + 1).padStart(3, '0')}.jpg`)
}

export async function cleanupDecryptSession(sessionId: string): Promise<void> {
  const dir = join(process.cwd(), 'tmp', `gallery-${sessionId}`)
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true })
  }
}
```

- [ ] **Step 2: 创建 gallery-routes.ts**

File: `src/server/gallery-routes.ts`
```typescript
import { Hono, type Context } from 'hono'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import * as storage from './gallery-storage'
import { processImageBuffer, createZipFile, extractZipBuffer } from './batch'
import { log } from './logger'

const api = new Hono()

api.post('/create', async (c: Context) => {
  try {
    const formData = await c.req.formData()
    const fileEntries = formData.getAll('image')
    const name = formData.get('name') as string
    const author = (formData.get('author') as string) || ''
    const source = (formData.get('source') as string) || ''

    if (!name) return c.json({ error: '请输入漫画名称' }, 400)
    if (fileEntries.length === 0) return c.json({ error: '请上传图片' }, 400)

    const files: { name: string; buffer: Buffer }[] = []
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue
      const buffer = Buffer.from(await entry.arrayBuffer())
      const processed = await processImageBuffer(buffer, 'encrypt')
      const idx = String(files.length + 1).padStart(3, '0')
      files.push({ name: `page_${idx}.jpg`, buffer: processed })
    }

    const meta = { name, author, source, createdAt: new Date().toISOString(), coverIndex: 0 }
    const metaBuffer = Buffer.from(JSON.stringify(meta, null, 2))
    files.unshift({ name: 'metadata.json', buffer: metaBuffer })

    const zipBuffer = await createZipFile(files)
    const id = await storage.saveComic(zipBuffer, meta)
    await log('INFO', `gallery create: ${name} (${id})`)

    return c.json({ id, name, totalPages: files.length - 1 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('ERROR', `gallery create failed: ${msg}`)
    return c.json({ error: msg }, 500)
  }
})

api.post('/save-from-batch', async (c: Context) => {
  try {
    const body = await c.req.json()
    const { zipBuffer, name, author, source } = body
    // zipBuffer is base64 encoded
    const buffer = Buffer.from(zipBuffer, 'base64')
    // Re-package with metadata
    const extracted = await extractZipBuffer(buffer)
    const images = extracted.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.path))
    const meta = { name, author, source, createdAt: new Date().toISOString(), coverIndex: 0 }
    const metaBuffer = Buffer.from(JSON.stringify(meta, null, 2))
    const files = [{ name: 'metadata.json', buffer: metaBuffer }]
    images.forEach((img, i) => {
      const idx = String(i + 1).padStart(3, '0')
      files.push({ name: `page_${idx}.jpg`, buffer: img.buffer })
    })
    const zipBuf = await createZipFile(files)
    const id = await storage.saveComic(zipBuf, meta)
    return c.json({ id, name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

api.get('/list', async (c: Context) => {
  try {
    const comics = await storage.listComics()
    return c.json(comics)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

api.get('/:id', async (c: Context) => {
  const id = c.req.param('id')
  const comic = await storage.getComic(id)
  if (!comic) return c.json({ error: '漫画不存在' }, 404)
  return c.json(comic)
})

api.post('/:id/decrypt', async (c: Context) => {
  const id = c.req.param('id')
  const result = await storage.decryptComic(id)
  if (!result) return c.json({ error: '漫画不存在或解密失败' }, 404)
  return c.json(result)
})

api.get('/decrypt/:sessionId/page/:n', async (c: Context) => {
  const { sessionId, n } = c.req.param()
  const pagePath = storage.getDecryptedPage(sessionId, parseInt(n, 10))
  if (!existsSync(pagePath)) return c.json({ error: '页面不存在' }, 404)
  const buffer = await readFile(pagePath)
  return c.body(new Uint8Array(buffer), 200, { 'Content-Type': 'image/jpeg' })
})

api.post('/cleanup', async (c: Context) => {
  try {
    const { sessionId } = await c.req.json()
    if (sessionId) await storage.cleanupDecryptSession(sessionId)
    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false })
  }
})

export { api }
```

- [ ] **Step 3: 更新 app.ts**

Add gallery routes:
```typescript
import { api as gallery } from './gallery-routes'
app.route('/api/gallery', gallery)
```

- [ ] **Step 4: 创建 storage/ 目录**

```bash
mkdir -p C:\Users\poden\Desktop\Code\ImageConfusion\storage
```

- [ ] **Step 5: 提交**

```bash
git add src/server/gallery-routes.ts src/server/gallery-storage.ts src/server/app.ts
git commit -m "feat: add gallery backend API with storage and decrypt support"
```

---

### Task 6: 实现画廊页面 (GalleryPage + ComicDetailPage)

**Files:**
- Create: `src/client/pages/GalleryPage.vue`
- Create: `src/client/pages/ComicDetailPage.vue`
- Create: `src/client/components/gallery/ComicCard.vue`
- Create: `src/client/components/gallery/NewComicModal.vue`

**Interfaces:**
- Consumes: Task 5 的 gallery API
- Produces: 完整的画廊首页和漫画详情页

- [ ] **Step 1: 创建 ComicCard.vue**

File: `src/client/components/gallery/ComicCard.vue`
```vue
<script setup lang="ts">
import type { ComicMeta } from '../../types'

const props = defineProps<{
  comic: ComicMeta
}>()
</script>

<template>
  <div class="comic-card">
    <div class="card-cover">
      <img
        v-if="comic.coverBase64"
        :src="`data:image/jpeg;base64,${comic.coverBase64}`"
        :alt="comic.name"
      />
      <div v-else class="cover-placeholder">暂无封面</div>
    </div>
    <div class="card-info">
      <h3 class="card-title">{{ comic.name }}</h3>
      <p v-if="comic.author" class="card-author">{{ comic.author }}</p>
      <p class="card-date">{{ new Date(comic.createdAt).toLocaleDateString('zh-CN') }}</p>
    </div>
  </div>
</template>

<style scoped>
.comic-card {
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: box-shadow 0.12s, transform 0.12s;
  background: #fff;
}
.comic-card:hover {
  box-shadow: none;
  transform: translate(4px, 4px);
}
.card-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-bottom: 2px solid var(--border);
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--muted-fg);
  font-size: 0.85rem;
}
.card-info {
  padding: 0.5rem;
}
.card-title {
  font-size: 0.85rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-author {
  font-size: 0.75rem;
  color: var(--muted-fg);
  margin-top: 0.2rem;
}
.card-date {
  font-size: 0.7rem;
  color: var(--muted-fg);
  margin-top: 0.1rem;
}
</style>
```

- [ ] **Step 2: 创建 NewComicModal.vue**

File: `src/client/components/gallery/NewComicModal.vue`
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '../../composables/useToast'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const { showToast } = useToast()
const name = ref('')
const author = ref('')
const source = ref('')
const files = ref<File[]>([])
const uploading = ref(false)

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    // Accept single ZIP or multiple images
    if (input.files.length === 1 && input.files[0].name.endsWith('.zip')) {
      // Import existing comic ZIP
      importZip(input.files[0])
      return
    }
    files.value = Array.from(input.files)
  }
}

async function importZip(zipFile: File) {
  uploading.value = true
  try {
    const form = new FormData()
    form.append('zip', zipFile)
    form.append('name', name.value)
    form.append('author', author.value)
    form.append('source', source.value)
    const res = await fetch('/api/gallery/create', { method: 'POST', body: form })
    if (!res.ok) throw new Error('导入失败')
    showToast('漫画导入成功', 'success')
    emit('created')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '导入失败', 'error')
  } finally {
    uploading.value = false
  }
}

async function handleCreate() {
  if (!name.value.trim()) {
    showToast('请输入漫画名称', 'error')
    return
  }
  if (files.value.length === 0) {
    showToast('请选择图片', 'error')
    return
  }
  uploading.value = true
  try {
    const form = new FormData()
    form.append('name', name.value)
    form.append('author', author.value)
    form.append('source', source.value)
    for (const file of files.value) {
      form.append('image', file)
    }
    const res = await fetch('/api/gallery/create', { method: 'POST', body: form })
    if (!res.ok) throw new Error('创建失败')
    showToast('漫画创建成功', 'success')
    emit('created')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '创建失败', 'error')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>新建漫画</h2>
      <div class="form-group">
        <label>漫画名称 *</label>
        <input v-model="name" type="text" placeholder="输入漫画名称" class="input" />
      </div>
      <div class="form-group">
        <label>作者</label>
        <input v-model="author" type="text" placeholder="可选" class="input" />
      </div>
      <div class="form-group">
        <label>图源</label>
        <input v-model="source" type="text" placeholder="可选" class="input" />
      </div>
      <div class="form-group">
        <label>选择图片或 ZIP</label>
        <input type="file" accept="image/*,.zip" multiple @change="handleFileSelect" class="input" />
      </div>
      <div v-if="files.length > 0" class="file-count">
        已选择 {{ files.length }} 个文件
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="uploading" @click="handleCreate">
          {{ uploading ? '创建中...' : '创建漫画' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border: 2px solid var(--border);
  padding: 1.5rem;
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow);
}
.modal h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}
.form-group {
  margin-bottom: 0.75rem;
}
.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
}
.input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--border);
  border-radius: 0;
  font-size: 0.85rem;
  background: var(--bg);
}
.file-count {
  font-size: 0.8rem;
  color: var(--muted-fg);
  margin-bottom: 0.75rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
```

- [ ] **Step 3: 创建 GalleryPage.vue**

File: `src/client/pages/GalleryPage.vue`

Page that fetches comic list from `/api/gallery/list`, displays grid of ComicCard, and includes NewComicModal.

- [ ] **Step 4: 创建 ComicDetailPage.vue**

File: `src/client/pages/ComicDetailPage.vue`

Shows comic metadata, cover image, and "开始解密并阅读" button that calls `/api/gallery/:id/decrypt` and navigates to reader.

- [ ] **Step 5: 提交**

```bash
git add src/client/pages/GalleryPage.vue src/client/pages/ComicDetailPage.vue src/client/components/gallery/
git commit -m "feat: implement gallery pages with comic list and detail view"
```

---

### Task 7: 实现漫画阅读器 (ReaderPage)

**Files:**
- Create: `src/client/pages/ReaderPage.vue`
- Create: `src/client/components/reader/ComicPage.vue`
- Create: `src/client/components/reader/PageNav.vue`

**Interfaces:**
- Consumes: Task 5 的 `/api/gallery/decrypt/:sessionId/page/:n` API
- Produces: 完整的翻页阅读体验

- [ ] **Step 1-3: 创建 ReaderPage.vue, ComicPage.vue, PageNav.vue**

With keyboard navigation, touch swipe support, thumbnail strip, and exit cleanup.

- [ ] **Step 4: 提交**

```bash
git add src/client/pages/ReaderPage.vue src/client/components/reader/
git commit -m "feat: implement comic reader with page navigation"
```

---

### Task 8: 更新现有文档

**Files:**
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: 更新 api.md**

Append gallery API endpoints to docs/api.md.

- [ ] **Step 2: 更新 architecture.md**

Add Vue frontend and gallery modules to architecture diagram.

- [ ] **Step 3: 更新 frontend.md**

Document new Vue component structure.

- [ ] **Step 4: 提交**

```bash
git add docs/api.md docs/architecture.md docs/frontend.md
git commit -m "docs: update documentation for Vue migration and gallery feature"
```

---

### Task 9: 编写测试

**Files:**
- Create: `src/client/__tests__/gallery-storage.test.ts`
- Create: `src/client/__tests__/ConfusePage.test.ts`
- Create: `src/client/__tests__/ToastContainer.test.ts`

- [ ] **Step 1-4**: Integration tests for gallery API and storage

- [ ] **Step 5**: Unit tests for Vue components (render, emit, user interaction)

- [ ] **Step 6**: Run full test suite

```bash
cd C:\Users\poden\Desktop\Code\ImageConfusion && bun test
```

- [ ] **Step 7**: Check existing tests still pass

- [ ] **Step 8**: 提交

```bash
git add src/client/__tests__/
git commit -m "test: add gallery and component tests"
```

---

### Task 10: 最终集成和验证

**Files:**
- All of the above

- [ ] **Step 1**: Run full test suite

```bash
cd C:\Users\poden\Desktop\Code\ImageConfusion && bun test 2>&1
```
Expected: All tests pass, coverage ≥80%

- [ ] **Step 2**: Manual verification - start both servers

```bash
# Terminal 1: Server
cd C:\Users\poden\Desktop\Code\ImageConfusion && pnpm dev:server

# Terminal 2: Client
cd C:\Users\poden\Desktop\Code\ImageConfusion && pnpm dev:client
```

- [ ] **Step 3**: Manual verification checklist
  - [ ] `/confuse` 页面正确渲染，单图加密/解密正常
  - [ ] `/confuse` 批量模式正常，缩略图显示正确
  - [ ] `/confuse` 批量加密后"保存为漫画"弹窗正常
  - [ ] `/gallery` 漫画列表正常展示（含封面缩略图）
  - [ ] 新建漫画功能正常（从画廊直接上传图片/ZIP）
  - [ ] 漫画详情页正确显示元信息
  - [ ] "开始解密并阅读"后跳转到阅读器
  - [ ] 阅读器翻页正常（键盘/点击/触摸）
  - [ ] 退出阅读器后临时文件被清理
  - [ ] Neo-Brutalist 风格保持
  - [ ] 拖拽上传正常
  - [ ] Toast 通知正常

- [ ] **Step 4**: Run lint

```bash
cd C:\Users\poden\Desktop\Code\ImageConfusion && pnpm lint
```
Expected: 0 errors

- [ ] **Step 5**: Final commit

```bash
git add .
git commit -m "feat: complete Vue migration with comic gallery"
```
