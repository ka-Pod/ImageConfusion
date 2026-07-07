# Kinetic Typography Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ImageConfusion UI with neo-brutalist low-saturation misty blue palette, kinetic typography effects, and restructured layout.

**Architecture:** All changes are in `src/ui.ts` (three inline functions: `css()`, `html()`, `clientJS()` returning template strings) and `src/ui.test.ts`. No backend, no new dependencies, no new files. CSS variables drive the full theme. JS adds runtime kinetic effects (title scramble, background hue drift) and interaction polish (preview hide, button active states).

**Tech Stack:** TypeScript + Bun + Hono + inline SPA (no framework, no external CSS/JS dependencies)

## Global Constraints

- All CSS is inline in `src/ui.ts:css()` as a template literal string
- All HTML is inline in `src/ui.ts:html()` as a template literal string
- All JS is inline in `src/ui.ts:clientJS()` as a template literal string
- Zero external dependencies (fonts, CSS, JS)
- All 57 existing tests must continue to pass
- TypeScript strict mode: no `any`, prefer `unknown`
- Existing DOM IDs (`ipt`, `dir`, `zip-upload`, `enc`, `dec`, `re`, `download`, `batch-dl`, `thumb-sidebar`, `preview-scroll`, `main-area`, `toast-container`, `progress-wrap`, `spinner`, `status`, `status-marquee`) must remain unchanged
- `prefers-reduced-motion` must disable all animations

---

### Task 1: Update Tests (TDD RED Phase)

**Files:**
- Modify: `src/ui.test.ts`
- Test: `src/ui.test.ts`

**Interfaces:**
- Consumes: `renderPage()` exported from `src/ui.ts`
- Produces: failing tests for new CSS classes, layout structure, and JS behaviors

- [ ] **Step 1: Remove stale assertions**

Delete `expect(html).toContain('id="multi"')` (the `#multi` input was removed in v1.0).

- [ ] **Step 2: Update existing assertions for the new class names**

Replace `btn-select` / `btn-encrypt` / `btn-decrypt` / `btn-restore` / `btn-download` checks with generic `.btn` checks. Core buttons now use accent border, not background color.

Add check for new class `btn-text` pattern (if we use that) or verify all buttons still have `class="btn ..."`.

- [ ] **Step 3: Add header layout assertions**

```typescript
test('title and buttons are on same row', async () => {
  const { renderPage } = await import('./ui')
  const html = renderPage()
  // The controls div should be a sibling/flex child of h1 in a header container
  expect(html).toContain('class="header"')
  expect(html).toContain('space-between')
})
```

- [ ] **Step 4: Add kinetic typography CSS assertions**

```typescript
test('includes kinetic typography CSS', async () => {
  const { renderPage } = await import('./ui')
  const html = renderPage()
  expect(html).toContain('titleSweep')
  expect(html).toContain('scramble')
  expect(html).toContain('hueDrift')
  expect(html).toContain('letterPulse')
})
```

- [ ] **Step 5: Add button shadow assertions**

```typescript
test('includes neo-brutalist button styles', async () => {
  const { renderPage } = await import('./ui')
  const html = renderPage()
  expect(html).toContain('4px 4px 0 0')
  expect(html).toContain('border-radius: 0')
})
```

- [ ] **Step 6: Add preview title hide assertions**

```typescript
test('includes preview title hide logic', async () => {
  const { renderPage } = await import('./ui')
  const html = renderPage()
  expect(html).toContain('.previewing h1')
  expect(html).toContain('previewing')
})
```

- [ ] **Step 7: Verify all UI tests fail**

Run: `bun test src/ui.test.ts`
Expected: new assertions fail with "Expected to contain: ..."

- [ ] **Step 8: Commit**

```bash
git add src/ui.test.ts
git commit -m "test(ui): update tests for kinetic typography redesign (RED)"
```

---

### Task 2: Rewrite CSS — Color System + Typography + Buttons + Kinetic Keyframes

**Files:**
- Modify: `src/ui.ts` — replace entire `css()` function
- Test: `src/ui.test.ts`

**Interfaces:**
- Consumes: N/A
- Produces: new CSS string referenced by `renderPage()`

- [ ] **Step 1: Write CSS variables block**

Replace the `:root` block with new palette:

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
```

- [ ] **Step 2: Write base reset + body styles**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif; text-align: left; padding: 1.5rem 2rem; background: var(--bg); color: var(--fg); min-height: 100vh; }
```

Note: `text-align` changed from `center` to `left` for the poster layout.

- [ ] **Step 3: Write header area (title + subtitle + buttons row)**

```css
.header { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.header-title { border-left: 4px solid var(--accent); padding-left: 1rem; }
h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; margin: 0; transition: opacity 0.4s ease; }
.desc { max-width: 480px; margin: 0; padding-left: calc(1rem + 4px); font-size: 0.85rem; color: var(--muted-fg); line-height: 1.6; animation: letterPulse 4s ease-in-out infinite; transition: opacity 0.4s ease; }
.previewing h1, .previewing .desc { opacity: 0; pointer-events: none; }
```

- [ ] **Step 4: Write button system CSS**

```css
.controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.btn { position: relative; display: inline-flex; align-items: center; justify-content: center; padding: 0.7rem 1.2rem; border: 2px solid var(--border); border-radius: var(--radius); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; background: var(--bg); color: var(--fg); box-shadow: var(--shadow); transition: background 0.12s, box-shadow 0.12s, transform 0.12s, color 0.12s; }
.btn:hover { background: var(--accent); color: #fff; }
.btn:active { box-shadow: var(--shadow-sm); transform: translate(2px, 2px); }
.btn:disabled { opacity: 0.3; box-shadow: none; pointer-events: none; }
.btn input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

.btn-file { background: var(--accent-muted); }
.btn-file:hover { background: var(--accent); color: #fff; }

.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary { background: var(--bg); }
.btn-secondary:hover { background: var(--accent); color: #fff; }

.btn-sep { color: var(--muted-fg); user-select: none; padding: 0 0.1rem; font-size: 0.8rem; }
```

- [ ] **Step 5: Write kinetic typography keyframes**

```css
@keyframes letterPulse {
  0%, 100% { letter-spacing: -0.02em; }
  50% { letter-spacing: 0.03em; }
}

@keyframes hueDrift {
  0%, 100% { background-color: #FAFAFA; }
  50% { background-color: #F0F4FA; }
}

@keyframes titleSweep {
  0% { background-position: 0 50%; }
  100% { background-position: 100% 50%; }
}

@keyframes scramble {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.status-dots::after { animation: dots 1.5s steps(3) infinite; content: ''; }
@keyframes dots { 0% { content: ''; } 33% { content: '.'; } 66% { content: '..'; } to { content: '...'; } }
```

- [ ] **Step 6: Write remaining component styles (preview, sidebar, toast, spinner, progress, marquee)**

```css
body { animation: hueDrift 30s ease-in-out infinite; }

#main-area { display: flex; gap: 10px; min-height: 65vh; margin-top: 0.5rem; }

#thumb-sidebar { width: 140px; overflow-y: auto; display: none; flex-direction: column; gap: 4px; padding: 6px; background: #fff; max-height: 70vh; border-radius: var(--radius); }
#thumb-sidebar .thumb-item { position: relative; cursor: pointer; border: 2px solid var(--border); padding: 2px; text-align: center; flex: 0 0 auto; transition: border-color .15s; }
#thumb-sidebar .thumb-item:hover { border-color: var(--muted-fg); }
#thumb-sidebar .thumb-item.active { border-color: var(--accent); background: rgba(0,0,0,.03); }
#thumb-sidebar .thumb-item img { width: 100%; height: 56px; object-fit: cover; display: block; }
#thumb-sidebar .thumb-item .thumb-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; color: #fff; font-size: .6rem; pointer-events: none; }
#thumb-sidebar .thumb-item .thumb-idx { position: absolute; top: 1px; left: 1px; background: var(--accent); color: #fff; font-size: .5rem; padding: 1px 4px; line-height: 1.3; }

#preview-scroll { position: relative; flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-height: 50vh; max-height: 70vh; border: 2px solid var(--border); border-radius: var(--radius); transition: border-color .2s; scroll-snap-type: y mandatory; }
#preview-scroll.drag-over { border-color: var(--accent); }
.preview-item { position: relative; flex: 0 0 100%; scroll-snap-align: start; display: flex; align-items: center; justify-content: center; min-height: 100%; }
.preview-item img { max-width: min(92vw, 800px); max-height: min(60vh, 500px); display: block; transition: opacity .2s; }
.preview-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; pointer-events: none; }
.preview-error { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: var(--error); color: #fff; padding: 4px 12px; font-size: .8rem; }
.preview-counter { position: absolute; bottom: 8px; right: 8px; background: var(--accent); color: #fff; font-size: .75rem; font-weight: 700; padding: 2px 8px; pointer-events: none; }

.preview-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; display: none; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(0,0,0,.3); color: #fff; font-size: 1.2rem; border: none; cursor: pointer; user-select: none; }
.preview-nav.prev { left: 8px; }
.preview-nav.next { right: 8px; }

.shimmer-placeholder { background: linear-gradient(90deg,var(--muted) 25%,#f0f0f0 50%,var(--muted) 75%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; min-height: 200px; width: 100%; }
@keyframes shimmer { 0% { background-position: -200% 0; } to { background-position: 200% 0; } }

.drop-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 40vh; color: var(--muted-fg); font-size: 1rem; cursor: default; user-select: none; }
.drop-placeholder .drop-icon { font-size: 2.5rem; margin-bottom: .5rem; line-height: 1; }

#toast-container { position: fixed; top: 12px; right: 12px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
.toast { padding: 10px 16px; border: 2px solid var(--border); border-left: 4px solid var(--border); background: #fff; color: var(--fg); font-size: .85rem; animation: toastIn .25s ease; pointer-events: auto; max-width: 360px; }
.toast-success { border-left-color: var(--success); }
.toast-error { border-left-color: var(--error); }
.toast-info { border-left-color: var(--border); }
.toast-out { animation: toastOut .2s ease-in forwards; }
@keyframes toastIn { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(60px); } }

#progress-wrap { display: none; align-items: center; gap: 8px; justify-content: center; margin: 6px 0; }
#progress-wrap.show { display: flex; }
#progress-bar { width: 200px; height: 6px; background: var(--muted); }
#progress-bar .bar-fill { height: 100%; background: var(--accent); transition: width .2s; width: 0%; }
#progress-label { font-size: .75rem; color: var(--muted-fg); }

#status { margin-top: .5rem; font-size: .8rem; color: var(--muted-fg); letter-spacing: 0.02em; font-weight: 500; transition: opacity 0.3s; }
#status-marquee { margin-top: 2px; font-size: .6rem; color: var(--muted-fg); letter-spacing: 0.08em; text-transform: uppercase; overflow: hidden; }
#status-marquee span { display: inline-block; animation: slideUp 0.3s ease; }

.spinner { display: none; width: 18px; height: 18px; border: 2px solid var(--muted); border-top-color: var(--accent); border-radius: 50%; animation: spin .6s linear infinite; margin: .4rem auto; }
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 7: Write responsive + accessibility rules**

```css
@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}

@media (max-width: 767px) {
  body { padding: 1rem; }
  h1 { font-size: 1.3rem; }
  .btn { padding: 0.5rem 0.8rem; font-size: 0.7rem; }
  #main-area { flex-direction: column; }
  #thumb-sidebar { width: 100%; flex-direction: row; overflow-x: auto; max-height: 80px; padding: 4px; }
  #thumb-sidebar .thumb-item { flex: 0 0 64px; }
  #thumb-sidebar .thumb-item img { height: 44px; }
  #preview-scroll { min-height: 40vh; max-height: 55vh; }
  .preview-item { flex: 0 0 100%; }
  .preview-item img { max-width: 96vw; max-height: 40vh; }
  .preview-nav { display: flex; }
}
```

- [ ] **Step 8: Run tests to verify CSS assertions pass**

Run: `bun test src/ui.test.ts`
Expected: UI tests pass (or mostly pass — some may still fail due to JS behaviors not yet implemented)

- [ ] **Step 9: Commit**

```bash
git add src/ui.ts
git commit -m "feat(ui): add neo-brutalist CSS with misty blue palette and kinetic keyframes"
```

---

### Task 3: Update HTML Structure

**Files:**
- Modify: `src/ui.ts` — replace `html()` function body
- Test: `src/ui.test.ts`

**Interfaces:**
- Consumes: N/A
- Produces: new HTML string with header container, title+buttons inline layout

- [ ] **Step 1: Write new html() function**

Replace the `html()` function body:

```html
<div class="header">
  <div class="header-row">
    <div class="header-title">
      <h1>图片混淆</h1>
    </div>
    <div class="controls">
      <span class="btn btn-file">选择图片<input type="file" multiple accept="image/*" id="ipt" /></span>
      <span class="btn btn-file">选择文件夹<input type="file" accept="image/*" id="dir" webkitdirectory multiple /></span>
      <span class="btn btn-file">上传ZIP<input type="file" accept=".zip" id="zip-upload" /></span>
      <span class="btn-sep">│</span>
      <button class="btn btn-primary" id="enc" disabled>混淆</button>
      <button class="btn btn-primary" id="dec" disabled>解混淆</button>
      <span class="btn-sep">│</span>
      <button class="btn btn-secondary" id="re" disabled>还原</button>
      <button class="btn btn-secondary" id="download" disabled>下载</button>
      <button class="btn btn-secondary" id="batch-dl" disabled>打包下载</button>
    </div>
  </div>
  <p class="desc">基于空间填充曲线的图片混淆。混淆图被压缩仍能保持色彩。仅供技术交流使用。输出 JPEG 质量 0.95。</p>
</div>
<div id="progress-wrap">
  <div id="progress-bar"><div class="bar-fill" id="bar-fill"></div></div>
  <span id="progress-label"></span>
</div>
<div class="spinner" id="spinner"></div>
<div id="main-area">
  <div id="thumb-sidebar"></div>
  <div id="preview-scroll"><div class="drop-placeholder"><div class="drop-icon">+</div>拖拽图片或 ZIP 到此处</div></div>
</div>
<p id="status">请选择一张图片</p>
<div id="status-marquee"></div>
<div id="toast-container"></div>
```

- [ ] **Step 2: Run tests**

Run: `bun test src/ui.test.ts`
Expected: most UI tests pass (new class names may require test updates)

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts
git commit -m "feat(ui): restructure HTML with header container and button classes"
```

---

### Task 4: JavaScript — Preview Hide, Scramble, Button Active States, Marquee Slide

**Files:**
- Modify: `src/ui.ts` — replace `clientJS()` function
- Test: `src/ui.test.ts`

**Interfaces:**
- Consumes: existing DOM IDs and constants
- Produces: runtime behaviors — title scramble, preview title hide, button active states, marquee slide

- [ ] **Step 1: Add title scramble function**

```js
/* === Kinetic Typography === */
var scrambleTimer = null
var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function scrambleText(el, target, duration) {
  duration = duration || 600
  var frame = 0
  var frames = Math.floor(duration / 50)
  if (scrambleTimer) { clearInterval(scrambleTimer); el.textContent = target; return }
  scrambleTimer = setInterval(function () {
    frame++
    if (frame >= frames) {
      clearInterval(scrambleTimer)
      scrambleTimer = null
      el.textContent = target
      return
    }
    var result = ''
    for (var ci = 0; ci < target.length; ci++) {
      if (target[ci] === ' ') { result += ' '; continue }
      result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    }
    el.textContent = result
  }, 50)
}

// Auto-scramble title every 8 seconds, cancel on hover
var titleEl = document.querySelector('h1')
if (titleEl) {
  var titleTarget = titleEl.textContent
  var titleScrambleInterval = setInterval(function () { scrambleText(titleEl, titleTarget, 600) }, 8000)
  titleEl.addEventListener('mouseenter', function () {
    clearInterval(titleScrambleInterval)
    if (scrambleTimer) { clearInterval(scrambleTimer); scrambleTimer = null }
    titleEl.textContent = titleTarget
  })
  titleEl.addEventListener('mouseleave', function () {
    titleScrambleInterval = setInterval(function () { scrambleText(titleEl, titleTarget, 600) }, 8000)
  })
}

// Status scramble on textContent change
var statusEl = document.getElementById('status')
var originalStatusSet = true
if (statusEl) {
  var _origStatusText = statusEl.textContent
  var statusObserver = new MutationObserver(function () {
    if (statusEl.textContent !== _origStatusText) {
      var newText = statusEl.textContent
      scrambleText(statusEl, newText, 400)
      _origStatusText = newText
    }
  })
  statusObserver.observe(statusEl, { childList: true, characterData: true, subtree: true })
}
```

- [ ] **Step 2: Add marquee vertical slide transition**

Replace the existing marquee setInterval:

```js
var marqueeMessages = ['GILBERT 2D CURVE · SPACE-FILLING · OFFSET 0.618', 'PIXEL REARRANGEMENT · LOSSLESS CORE · JPEG Q95', 'IMAGE CONFUSION · ENCRYPT / DECRYPT · SERVER SIDE']
var marqueeIndex = 0
var marqueeEl = document.getElementById('status-marquee')
if (marqueeEl) {
  marqueeEl.textContent = marqueeMessages[0]
  setInterval(function () {
    marqueeIndex = (marqueeIndex + 1) % marqueeMessages.length
    // Slide up transition via transform
    marqueeEl.style.transform = 'translateY(-100%)'
    marqueeEl.style.opacity = '0'
    setTimeout(function () {
      marqueeEl.textContent = marqueeMessages[marqueeIndex]
      marqueeEl.style.transform = 'translateY(100%)'
      marqueeEl.style.opacity = '0'
      requestAnimationFrame(function () {
        marqueeEl.style.transform = 'translateY(0)'
        marqueeEl.style.opacity = '1'
      })
    }, 300)
  }, 5000)
}
```

- [ ] **Step 3: Add preview title hide**

In `setSrc()` function, add `.previewing` class to the header:

```js
function setSrc(url) {
  var header = document.querySelector('.header')
  if (header) header.classList.add('previewing')
  previewScroll.innerHTML = ''
  // ... rest of setSrc unchanged
}
```

In `renderReaderView()`, add `.previewing` class:

```js
function renderReaderView() {
  var header = document.querySelector('.header')
  if (header) header.classList.add('previewing')
  // ... rest of renderReaderView unchanged
}
```

When clearing images (drop placeholder, restore single), remove `.previewing`:

In the batch empty check and single restore:

```js
function clearPreviewing() {
  var header = document.querySelector('.header')
  if (header) header.classList.remove('previewing')
}
```

Call `clearPreviewing()` when:
- batchItems becomes empty → in renderReaderView's empty branch
- restore single image → in reBtn.onclick's single branch
- new single image selected → in ipt.onchange's single branch

- [ ] **Step 4: Add body hue drift CSS (inline in clientJS)**

Replace the `body` background animation with a JS-driven variant if CSS `@property` is not available. Actually, the simplest approach is to use the CSS `animation: hueDrift` already defined in the CSS. No JS needed.

- [ ] **Step 5: Run all tests**

Run: `bun test`
Expected: all 57+ tests pass

- [ ] **Step 6: Run lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/ui.ts
git commit -m "feat(ui): add kinetic JS — title scramble, preview hide, marquee slide"
```

---

### Task 5: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `bun test`
Expected: 57+ pass, 0 fail

- [ ] **Step 2: Run TypeScript type check**

Run: `pnpm lint`
Expected: no output (clean pass)

- [ ] **Step 3: Final commit of any outstanding changes**

```bash
git add -A
git commit -m "chore: final adjustments for kinetic typography redesign"
```

- [ ] **Step 4: Update v1.0 tag or create v1.1 tag**

```bash
git tag -a v1.1 -m "v1.1 — Kinetic Typography Redesign

Neo-brutalist UI redesign with low-saturation misty blue palette,
kinetic typography effects (title scramble, status scramble, letter-pulse,
hue drift), restructured layout (title+buttons inline), and interaction
polish (preview title hide, button active states)."
git push origin v1.1
```
