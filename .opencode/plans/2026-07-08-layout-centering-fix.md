# 图片居中与页面跳动修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复混淆时图片左移（不居中）和页面乱动（scroll-snap 跳动）问题

**Architecture:** 
- 图片添加 `margin: 0 auto` 实现水平居中
- 移除 `scroll-snap-type: y mandatory` 避免 DOM 变化时跳动

**Tech Stack:** TypeScript, CSS

## Global Constraints

- TypeScript strict 模式
- 使用 `type` 而非 `interface`
- 禁止 `any`，优先 `unknown`
- 异步操作使用 `async/await`

---

## Task 1: 修复图片水平居中

**Files:**
- Modify: `src/ui.ts` (CSS `.preview-item img` 样式)

**Interfaces:**
- Consumes: 无
- Produces: 图片在 preview-item 内水平居中

- [ ] **Step 1: 修改 CSS 添加 margin: 0 auto**

修改 `css()` 函数中的 `.preview-item img` 样式：
```css
.preview-item img { 
  max-width: min(92vw, 800px); 
  max-height: min(60vh, 500px); 
  display: block; 
  margin: 0 auto;
  transition: opacity .2s; 
}
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts
git commit -m "fix: center image horizontally in preview-item"
```

---

## Task 2: 修复页面跳动（移除 scroll-snap）

**Files:**
- Modify: `src/ui.ts` (CSS `#preview-scroll` 样式)

**Interfaces:**
- Consumes: 无
- Produces: DOM 变化时页面不跳动

- [ ] **Step 1: 移除 scroll-snap-type**

修改 `css()` 函数中的 `#preview-scroll` 样式，移除 `scroll-snap-type: y mandatory`：
```css
#preview-scroll { 
  position: relative; 
  flex: 1; 
  overflow-y: auto; 
  display: flex; 
  flex-direction: column; 
  min-height: 50vh; 
  max-height: 70vh; 
  border: 2px solid var(--border); 
  transition: border-color .2s; 
}
```

同时移除 `.preview-item` 中的 `scroll-snap-align: start`：
```css
.preview-item { 
  position: relative; 
  flex: 0 0 100%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  min-height: 100%; 
}
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test src/ui.test.ts`
Expected: UI 测试通过

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts
git commit -m "fix: remove scroll-snap-type to prevent layout jump"
```

---

## Task 3: 更新 CHANGELOG 并验证

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: 无
- Produces: 更新的 CHANGELOG

- [ ] **Step 1: 更新 CHANGELOG**

在 `CHANGELOG.md` 中添加 v1.4.7 记录：
```markdown
## [v1.4.7] - 2026-07-08

### Fixed

- **Image not centered**: Add margin: 0 auto to horizontally center image in preview area
- **Layout jump during encryption/decryption**: Remove scroll-snap-type to prevent DOM change jumps
```

- [ ] **Step 2: 运行完整测试**

Run: `bun test`
Expected: 所有 62 个测试通过

- [ ] **Step 3: 运行 lint 检查**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add v1.4.7 changelog for layout fixes"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** 图片居中 + 页面跳动 - 全部覆盖
- [ ] **Placeholder scan:** 无 TBD/TODO
- [ ] **Type consistency:** CSS 属性正确
- [ ] **Test coverage:** 每个修复都有对应测试验证
