# 统一确认对话框与路由切换动画设计

## 背景

当前项目已实现漫画画廊右键菜单、封面显示、按需阅读等核心功能，但存在两个体验问题：

1. **原生确认对话框风格不统一**：`GalleryPage.vue` 的删除操作使用浏览器原生 `confirm()`，与 neo-brutalist 风格的按钮、ContextMenu、Modal 不一致。
2. **路由切换缺乏活力**：页面进入没有统一的过渡动画，显得生硬；之前尝试的淡入/滑动效果与整体风格不协调。

## 目标

- 创建与现有 neo-brutalist 风格统一的 `ConfirmDialog.vue` 组件，替换所有原生 `confirm()`。
- 为路由切换添加"利落上滑"进入动画：快速、克制、有质感。
- 其他组件和交互保持不变。

## 非目标

- 不改写按钮、ContextMenu、ComicCard 等其他动画。
- 不引入第三方动画库（如 GSAP）。
- 不改动核心功能逻辑。

## 方案概述

采用 **D 方案（利落上滑）+ 统一 ConfirmDialog**。

1. 新建 `src/client/components/common/ConfirmDialog.vue`，风格与现有按钮、ContextMenu、Modal 一致。
2. 在 `GalleryPage.vue` 中引入 `ConfirmDialog`，替换删除时的原生 `confirm()`。
3. 在 `src/client/App.vue` 的 `<router-view>` 外层包裹 `<Transition name="route-slide">`，实现路由切换动画。
4. 在 `src/client/assets/styles/main.css` 中定义 `route-slide-*` 动画类和全局动画变量。
5. 支持 `prefers-reduced-motion`。

## 详细设计

### 1. ConfirmDialog.vue 组件

**文件**：`src/client/components/common/ConfirmDialog.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onBackdropClick() {
  emit('cancel')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="dialog-pop">
    <div v-if="visible" class="dialog-backdrop" @click="onBackdropClick">
      <div class="dialog-box" @click.stop>
        <h3 class="dialog-title">{{ title }}</h3>
        <p class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            {{ cancelText || '取消' }}
          </button>
          <button
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="$emit('confirm')"
          >
            {{ confirmText || '确认' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(27, 27, 47, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.dialog-box {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 0 0.75rem;
}

.dialog-message {
  margin: 0 0 1.5rem;
  line-height: 1.5;
  color: var(--fg);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
```

**出现动画**（dialog-pop）：

```css
.dialog-pop-enter-active,
.dialog-pop-leave-active {
  transition: opacity var(--duration-fast) ease;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-active .dialog-box,
.dialog-pop-leave-active .dialog-box {
  transition: transform var(--duration-normal) var(--ease-out-expo), opacity var(--duration-normal) var(--ease-out-expo);
}

.dialog-pop-enter-from .dialog-box,
.dialog-pop-leave-to .dialog-box {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}
```

### 2. GalleryPage.vue 集成 ConfirmDialog

**文件**：`src/client/pages/GalleryPage.vue`

新增状态：

```typescript
const confirmDialog = ref({
  visible: false,
  comic: null as ComicMeta | null,
})

function openDeleteConfirm(comic: ComicMeta) {
  confirmDialog.value = { visible: true, comic }
}

function closeDeleteConfirm() {
  confirmDialog.value.visible = false
}

async function onDeleteConfirm() {
  const comic = confirmDialog.value.comic
  closeDeleteConfirm()
  if (!comic) return
  try {
    const res = await fetch(`/api/gallery/${comic.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    showToast('漫画已删除', 'success')
    await loadComics()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '删除失败', 'error')
  }
}
```

模板中替换删除逻辑：

```vue
<ContextMenu
  :visible="contextMenu.visible"
  :x="contextMenu.x"
  :y="contextMenu.y"
  :items="menuItems"
  @select="onMenuSelect"
  @close="contextMenu.visible = false"
/>

<ConfirmDialog
  :visible="confirmDialog.visible"
  title="删除漫画"
  :message="`确定要删除《${confirmDialog.comic?.name || ''}》吗？此操作不可恢复。`"
  confirm-text="删除"
  cancel-text="取消"
  danger
  @confirm="onDeleteConfirm"
  @cancel="closeDeleteConfirm"
/>
```

修改 `onMenuSelect` 中删除分支：

```typescript
} else if (action === 'delete') {
  openDeleteConfirm(comic)
}
```

移除原生的 `if (!confirm(...)) return` 代码。

### 3. 路由切换动画

#### 3.1 App.vue 改造

**文件**：`src/client/App.vue`

将 `<router-view />` 改为：

```vue
<template>
  <div class="app-root">
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <Transition name="route-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>
```

> 假设当前 App.vue 中 `<router-view />` 是直接使用。需要先读取实际文件确认。

#### 3.2 全局 CSS 动画

**文件**：`src/client/assets/styles/main.css`

在 `:root` 中添加动画变量：

```css
:root {
  /* existing vars */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
}
```

在文件底部添加路由动画：

```css
/* Route transition: clean slide-up */
.route-slide-enter-active,
.route-slide-leave-active {
  transition: opacity var(--duration-fast) ease, transform var(--duration-normal) var(--ease-out-expo);
}

.route-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.route-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.route-slide-enter-to,
.route-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Dialog transition */
.dialog-pop-enter-active,
.dialog-pop-leave-active {
  transition: opacity var(--duration-fast) ease;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-active .dialog-box,
.dialog-pop-leave-active .dialog-box {
  transition: transform var(--duration-normal) var(--ease-out-expo), opacity var(--duration-normal) var(--ease-out-expo);
}

.dialog-pop-enter-from .dialog-box,
.dialog-pop-leave-to .dialog-box {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .route-slide-enter-active,
  .route-slide-leave-active,
  .dialog-pop-enter-active,
  .dialog-pop-leave-active,
  .dialog-pop-enter-active .dialog-box,
  .dialog-pop-leave-active .dialog-box {
    transition-duration: 0.01ms !important;
  }
}
```

### 4. App.vue 布局调整

如果当前 App.vue 有类似 `.container` 的样式，需要确保 `.main-content` 不会导致过渡期间的布局抖动。必要时给 `<component :is="Component" />` 包裹层设置 `min-height: 100%`。

## 数据流

### 删除确认流程

```
用户右键漫画卡片
  → ContextMenu 弹出
  → 点击"删除漫画"
  → GalleryPage.openDeleteConfirm(comic)
  → ConfirmDialog 显示
  → 用户点击"删除"
  → GalleryPage.onDeleteConfirm
  → DELETE /api/gallery/:id
  → 成功后 showToast + loadComics()
```

### 路由切换流程

```
用户点击导航 / 路由变化
  → Vue Router 解析新组件
  → <Transition name="route-slide" mode="out-in">
  → 旧页面：opacity 1 → 0, translateY(0) → -6px, 150ms
  → 新页面：opacity 0 → 1, translateY(12px) → 0, 200ms ease-out-expo
```

## 错误处理

| 场景 | 处理 |
|---|---|
| 用户点击 Backdrop | 触发 cancel，关闭对话框 |
| 用户按 Esc | 触发 cancel，关闭对话框 |
| 删除 API 失败 | showToast 错误信息，对话框已关闭 |
| 路由切换动画期间再次导航 | Vue Transition 自动处理中断 |

## 测试计划

- 新增 `ConfirmDialog.vue` 简单渲染测试（可选）。
- 更新 `GalleryPage` 删除流程测试：验证点击删除打开对话框，确认后调用 API。
- 运行 `pnpm lint` 和 `bun test` 全部通过。
- 手动验证：右键删除弹出自定义对话框、取消/确认行为、路由切换动画流畅。

## 风险与回退

- 路由切换 `mode="out-in"` 会在旧页面完全离开后才进入新页面，可能带来 150-200ms 的空白感。如果用户觉得太慢，可改为同时动画或缩短时长。
- 动画变量加入全局 CSS 后，后续如需扩展动画可直接复用。
