function css(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

:root, [data-theme="dark"] {
  --bg: #09090B;
  --fg: #FAFAFA;
  --accent: #EC4899;
  --accent2: #DFE104;
  --muted: #27272A;
  --muted-fg: #A1A1AA;
  --border: #3F3F46;
  --success: #2ECC71;
  --error: #E74C3C;
  --radius: 0px;
  --font: 'Space Mono', monospace;
  --btn-bg: #18181B;
  --btn-fg: #FAFAFA;
  --card-bg: #18181B;
}
[data-theme="light"] {
  --bg: #FAFAFA;
  --fg: #09090B;
  --muted: #E8ECF0;
  --muted-fg: #64748B;
  --border: #D4D4D8;
  --btn-bg: #E4E4E7;
  --btn-fg: #09090B;
  --card-bg: #FFFFFF;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font);
  text-align: center;
  padding: 1.5rem 1rem;
  background: var(--bg);
  color: var(--fg);
  transition: background 0.3s, color 0.3s;
}

/* === Entrance animations === */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* === Theme toggle === */
#theme-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  border: 2px solid var(--border);
  background: var(--btn-bg);
  color: var(--fg);
  font-family: var(--font);
  font-size: 1rem;
  cursor: pointer;
  z-index: 100;
  line-height: 1;
}
#theme-toggle:active {
  transform: translateY(2px);
}

/* === Header === */
h1 {
  font-size: 1.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -2px;
  margin-bottom: 0.15rem;
  animation: fadeUp 0.4s ease-out 0.1s forwards;
  opacity: 0;
}
.subtitle {
  font-size: 0.7rem;
  color: var(--muted-fg);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 0.15rem;
  animation: fadeUp 0.4s ease-out 0.2s forwards;
  opacity: 0;
}
.desc {
  max-width: 520px;
  margin: 0 auto 1rem;
  font-size: 0.7rem;
  color: var(--muted-fg);
  line-height: 1.6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: fadeUp 0.4s ease-out 0.3s forwards;
  opacity: 0;
}

/* === Controls === */
.controls {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.8rem;
  animation: fadeUp 0.4s ease-out 0.4s forwards;
  opacity: 0;
}
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.5rem;
  height: 2.3rem;
  padding: 0 0.8rem;
  border: 2px solid var(--border);
  background: var(--btn-bg);
  color: var(--btn-fg);
  font-family: var(--font);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
}
.btn:active {
  transform: translateY(3px);
}
.btn input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}
.btn-select {
  border-color: var(--muted);
  color: var(--muted-fg);
}
.btn-encrypt {
  border-color: var(--accent);
  color: var(--accent);
}
.btn-decrypt {
  border-color: var(--accent2);
  color: var(--accent2);
}
.btn-restore {
  border-color: var(--muted-fg);
  color: var(--muted-fg);
}
.btn-download {
  border-color: var(--success);
  color: var(--success);
}

/* === Pulse animation for batch-dl === */
.btn-pulse {
  animation: pulseBorder 1.2s ease-in-out infinite;
}
@keyframes pulseBorder {
  0%, 100% { border-color: var(--success); }
  50% { border-color: var(--accent); }
}

/* === Progress === */
#progress-wrap {
  display: none;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin: 6px 0;
  animation: fadeIn 0.2s ease-out;
}
#progress-wrap.show { display: flex; }
#progress-bar {
  width: 200px;
  height: 10px;
  background: var(--muted);
  overflow: hidden;
}
#progress-bar .bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
  width: 0%;
}
#progress-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted-fg);
}

/* === Spinner === */
.spinner {
  display: none;
  width: 20px;
  height: 20px;
  border: 2px solid var(--muted);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0.4rem auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* === Main area === */
#main-area {
  display: flex;
  gap: 10px;
  min-height: 65vh;
  margin-top: 0.5rem;
  animation: fadeUp 0.4s ease-out 0.5s forwards;
  opacity: 0;
}

/* === Thumb sidebar === */
#thumb-sidebar {
  width: 140px;
  overflow-y: auto;
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background: var(--card-bg);
  max-height: 70vh;
}
#thumb-sidebar .thumb-item {
  position: relative;
  cursor: pointer;
  border: 2px solid var(--border);
  padding: 2px;
  text-align: center;
  flex: 0 0 auto;
  opacity: 0;
  transform: translateX(-8px);
  transition: border-color 0.2s, opacity 0.3s ease-out, transform 0.3s ease-out;
}
#thumb-sidebar .thumb-item.thumb-visible {
  opacity: 1;
  transform: translateX(0);
}
#thumb-sidebar .thumb-item:hover {
  border-color: var(--muted-fg);
}
#thumb-sidebar .thumb-item.active {
  border-color: var(--accent);
  background: rgba(236, 72, 153, 0.08);
}
#thumb-sidebar .thumb-item img {
  width: 100%;
  height: 56px;
  object-fit: cover;
  display: block;
}
#thumb-sidebar .thumb-item .thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  pointer-events: none;
}
#thumb-sidebar .thumb-item .thumb-idx {
  position: absolute;
  top: 1px;
  left: 1px;
  background: var(--accent);
  color: #fff;
  font-size: 0.5rem;
  font-weight: 700;
  padding: 1px 4px;
  line-height: 1.3;
}
#thumb-sidebar .thumb-item.status-processing {
  border-color: var(--accent);
}
#thumb-sidebar .thumb-item.status-encrypted,
#thumb-sidebar .thumb-item.status-decrypted {
  border-color: var(--success);
}
#thumb-sidebar .thumb-item.status-error {
  border-color: var(--error);
}

/* === Preview scroll === */
#preview-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 50vh;
  max-height: 70vh;
  border: 3px dashed var(--border);
  transition: border-color 0.15s, background 0.15s;
  scroll-snap-type: y mandatory;
}
#preview-scroll.drag-over {
  border-color: var(--accent);
  background: rgba(236, 72, 153, 0.05);
  border-style: solid;
}
.preview-item {
  position: relative;
  flex: 0 0 100%;
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}
.preview-item img {
  max-width: min(92vw, 800px);
  max-height: min(60vh, 500px);
  display: block;
  transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}
.preview-item img.img-entering {
  opacity: 0;
  transform: scale(0.97);
}
.preview-item .preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent2);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  pointer-events: none;
}
.preview-item .preview-error {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--error);
  color: #fff;
  padding: 4px 14px;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* === Drop placeholder === */
.drop-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 40vh;
  color: var(--muted-fg);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: default;
  user-select: none;
}
.drop-placeholder .drop-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  line-height: 1;
  color: var(--accent);
}

/* === Toast === */
#toast-container {
  position: fixed;
  top: 60px;
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
  background: var(--card-bg);
  color: var(--fg);
  font-family: var(--font);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 6px 6px 0 rgba(0,0,0,0.3);
  animation: toastIn 0.25s ease-out;
  pointer-events: auto;
  max-width: 360px;
}
.toast-success {
  border-left: 4px solid var(--success);
}
.toast-error {
  border-left: 4px solid var(--error);
}
.toast-info {
  border-left: 4px solid var(--accent);
}
.toast-out {
  animation: toastOut 0.2s ease-in forwards;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(60px); }
}

/* === Status === */
#status {
  margin-top: 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--muted-fg);
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: fadeUp 0.4s ease-out 0.6s forwards;
  opacity: 0;
}

/* === Responsive === */
@media (max-width: 767px) {
  h1 { font-size: 1.3rem; letter-spacing: -1px; }
  .controls { gap: 0.3rem; }
  .btn { min-width: 3.5rem; height: 1.9rem; font-size: 0.6rem; padding: 0 0.5rem; }
  #main-area { flex-direction: column; }
  #thumb-sidebar { width: 100%; flex-direction: row; overflow-x: auto; max-height: 80px; padding: 4px; }
  #thumb-sidebar .thumb-item { flex: 0 0 64px; }
  #thumb-sidebar .thumb-item img { height: 44px; }
  #preview-scroll { min-height: 40vh; max-height: 55vh; }
  .preview-item { flex: 0 0 100%; }
  .preview-item img { max-width: 96vw; max-height: 40vh; }
  #theme-toggle { top: 8px; right: 8px; width: 36px; height: 36px; font-size: 0.85rem; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`
}

function html(): string {
  return `
<button id="theme-toggle" aria-label="切换主题">✦</button>
<h1>图片混淆</h1>
<p class="subtitle">基于 Gilbert 空间填充曲线</p>
<p class="desc">混淆图被压缩仍能保持色彩。仅供技术交流使用。输出 JPEG 质量 0.95。</p>
<div class="controls">
  <span class="btn btn-select">选择图片<input type="file" accept="image/*" id="ipt" /></span>
  <span class="btn btn-select">选多张图片<input type="file" multiple accept="image/*" id="multi" /></span>
  <span class="btn btn-select">选文件夹<input type="file" accept="image/*" id="dir" webkitdirectory multiple /></span>
  <span class="btn btn-select">上传 ZIP<input type="file" accept=".zip" id="zip-upload" /></span>
  <button class="btn btn-encrypt" id="enc" disabled>混淆</button>
  <button class="btn btn-decrypt" id="dec" disabled>解混淆</button>
  <button class="btn btn-restore" id="re" disabled>还原</button>
  <button class="btn btn-download" id="download" disabled>下载</button>
  <button class="btn btn-download" id="batch-dl" disabled>打包下载</button>
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
<p id="status">选择图片开始</p>
<div id="toast-container"></div>`
}

function clientJS(): string {
  return `
let batchMode = false
let batchItems = []
let selectedIndex = -1
let sessionId = null
let zipId = null
let originalSrc = ''
let originalFileName = ''
let currentAction = ''
let observer = null
let scrollAnimObserver = null

const ipt = document.getElementById('ipt')
const multiIpt = document.getElementById('multi')
const dirIpt = document.getElementById('dir')
const zipIpt = document.getElementById('zip-upload')
const encBtn = document.getElementById('enc')
const decBtn = document.getElementById('dec')
const reBtn = document.getElementById('re')
const downloadBtn = document.getElementById('download')
const batchDlBtn = document.getElementById('batch-dl')
const spinner = document.getElementById('spinner')
const status = document.getElementById('status')
const previewScroll = document.getElementById('preview-scroll')
const thumbSidebar = document.getElementById('thumb-sidebar')
const progressWrap = document.getElementById('progress-wrap')
const barFill = document.getElementById('bar-fill')
const progressLabel = document.getElementById('progress-label')

/* === Theme toggle === */
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark' }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
  document.getElementById('theme-toggle').textContent = t === 'dark' ? '✦' : '☀'
}
setTheme(localStorage.getItem('theme') || 'dark')
document.getElementById('theme-toggle').onclick = function () {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
  localStorage.setItem('theme', getTheme())
}

/* === Toast === */
function showToast(msg, type) {
  type = type || 'info'
  const container = document.getElementById('toast-container')
  const el = document.createElement('div')
  el.className = 'toast toast-' + type
  el.textContent = msg
  container.appendChild(el)
  setTimeout(function () {
    el.classList.add('toast-out')
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 210)
  }, 3000)
}

/* === Progress bar === */
function showProgress(current, total) {
  progressWrap.classList.add('show')
  var pct = total > 0 ? (current / total) * 100 : 0
  barFill.style.width = pct + '%'
  progressLabel.textContent = current + ' / ' + total
}

function hideProgress() {
  progressWrap.classList.remove('show')
}

/* === Observer === */
function setupObserver() {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var idx = parseInt(entry.target.dataset.index)
        if (!isNaN(idx)) {
          selectedIndex = idx
          updateSidebarHighlight()
        }
      }
    })
  }, { root: previewScroll, threshold: 0.5 })
}

function observeItems() {
  setupObserver()
  previewScroll.querySelectorAll('.preview-item').forEach(function (el) {
    observer.observe(el)
  })
}

/* === Thumbnail scroll animation === */
function setupThumbScrollAnim() {
  if (scrollAnimObserver) scrollAnimObserver.disconnect()
  scrollAnimObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('thumb-visible')
        scrollAnimObserver.unobserve(entry.target)
      }
    })
  }, { root: thumbSidebar, threshold: 0.2 })
  thumbSidebar.querySelectorAll('.thumb-item').forEach(function (el, i) {
    el.style.transitionDelay = (i * 40) + 'ms'
    scrollAnimObserver.observe(el)
  })
}

/* === Rendering === */
function setSrc(url) {
  var placeholder = previewScroll.querySelector('.drop-placeholder')
  var existing = previewScroll.querySelector('img')

  if (existing && existing.src !== url) {
    var item = document.createElement('div')
    item.className = 'preview-item'
    var img = document.createElement('img')
    img.className = 'img-entering'
    img.src = url
    item.appendChild(img)
    previewScroll.innerHTML = ''
    previewScroll.appendChild(item)
    requestAnimationFrame(function () {
      img.classList.remove('img-entering')
    })
  } else if (existing && existing.src === url) {
    return
  } else {
    previewScroll.innerHTML = ''
    var item = document.createElement('div')
    item.className = 'preview-item'
    var img = document.createElement('img')
    img.src = url
    item.appendChild(img)
    previewScroll.appendChild(item)
  }
}

function renderReaderView() {
  previewScroll.innerHTML = ''
  thumbSidebar.innerHTML = ''

  if (batchItems.length === 0) {
    previewScroll.innerHTML = '<div class="drop-placeholder"><div class="drop-icon">+</div>拖拽图片或 ZIP 到此处</div>'
    thumbSidebar.style.display = 'none'
    return
  }

  batchItems.forEach(function (item, i) {
    var previewItem = document.createElement('div')
    previewItem.className = 'preview-item'
    previewItem.dataset.index = i

    var img = document.createElement('img')
    if (item.processedBlob) {
      img.src = URL.createObjectURL(item.processedBlob)
    } else if (item.file instanceof File && item.file.size > 0) {
      img.src = URL.createObjectURL(item.file)
    }
    previewItem.appendChild(img)

    if (item.status === 'encrypted') {
      var overlay = document.createElement('div')
      overlay.className = 'preview-overlay'
      overlay.textContent = '已混淆'
      previewItem.appendChild(overlay)
    }

    if (item.errorMsg) {
      var errEl = document.createElement('div')
      errEl.className = 'preview-error'
      errEl.textContent = item.errorMsg
      previewItem.appendChild(errEl)
    }

    previewScroll.appendChild(previewItem)

    var thumbItem = document.createElement('div')
    thumbItem.className = 'thumb-item status-' + item.status
    thumbItem.dataset.index = i
    thumbItem.onclick = function () { scrollToImage(i) }

    var idxLabel = document.createElement('div')
    idxLabel.className = 'thumb-idx'
    idxLabel.textContent = (i + 1) + '/' + batchItems.length
    thumbItem.appendChild(idxLabel)

    var thumbImg = document.createElement('img')
    if (item.processedBlob) {
      thumbImg.src = URL.createObjectURL(item.processedBlob)
    } else if (item.file instanceof File && item.file.size > 0) {
      thumbImg.src = URL.createObjectURL(item.file)
    }
    thumbItem.appendChild(thumbImg)

    if (item.status === 'encrypted') {
      var tOverlay = document.createElement('div')
      tOverlay.className = 'thumb-overlay'
      tOverlay.textContent = '已混淆'
      thumbItem.appendChild(tOverlay)
    } else if (item.status === 'processing') {
      var tOverlay = document.createElement('div')
      tOverlay.className = 'thumb-overlay'
      tOverlay.textContent = '处理中'
      thumbItem.appendChild(tOverlay)
    } else if (item.status === 'error') {
      var tOverlay = document.createElement('div')
      tOverlay.className = 'thumb-overlay'
      tOverlay.textContent = item.errorMsg || '错误'
      thumbItem.appendChild(tOverlay)
    }

    thumbSidebar.appendChild(thumbItem)
  })

  thumbSidebar.style.display = 'flex'
  observeItems()
  setupThumbScrollAnim()

  if (selectedIndex >= 0 && selectedIndex < batchItems.length) {
    requestAnimationFrame(function () { scrollToImage(selectedIndex) })
  } else {
    requestAnimationFrame(function () { scrollToImage(0) })
  }
}

function scrollToImage(index) {
  var items = previewScroll.querySelectorAll('.preview-item')
  if (index >= 0 && index < items.length) {
    selectedIndex = index
    items[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
    updateSidebarHighlight()
  }
}

function updateSidebarHighlight() {
  thumbSidebar.querySelectorAll('.thumb-item').forEach(function (el, i) {
    el.classList.toggle('active', i === selectedIndex)
    if (i === selectedIndex) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } catch (e) {}
    }
  })
}

/* === Batch-dl pulse === */
function enableBatchDl() {
  batchDlBtn.disabled = false
  batchDlBtn.classList.add('btn-pulse')
  setTimeout(function () { batchDlBtn.classList.remove('btn-pulse') }, 4000)
}

/* === Single image === */
ipt.onchange = function () {
  if (ipt.files.length > 0) {
    batchMode = false
    thumbSidebar.style.display = 'none'
    batchDlBtn.disabled = true
    var url = URL.createObjectURL(ipt.files[0])
    setSrc(url)
    originalSrc = url
    originalFileName = ipt.files[0].name
    currentAction = ''
    status.textContent = ipt.files[0].name
  }
}

/* === Batch loading === */
function loadBatchFiles(files) {
  if (sessionId) {
    fetch('/api/batch/cleanup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId })
    }).catch(function () {})
  }
  if (batchItems) {
    batchItems.forEach(function (item) {
      if (item.processedBlob) URL.revokeObjectURL(item.processedBlob)
    })
  }
  URL.revokeObjectURL(originalSrc)
  batchMode = true
  batchItems = []
  selectedIndex = 0
  sessionId = null
  zipId = null
  batchDlBtn.disabled = true

  for (var fi = 0; fi < files.length; fi++) {
    batchItems.push({ file: files[fi], status: 'pending', processedName: '' })
  }

  renderReaderView()
  status.textContent = '已加载 ' + batchItems.length + ' 张图片'
  encBtn.disabled = false
  decBtn.disabled = false
}

multiIpt.onchange = function () {
  if (multiIpt.files.length > 0) loadBatchFiles(multiIpt.files)
}

dirIpt.onchange = function () {
  if (dirIpt.files.length > 0) loadBatchFiles(dirIpt.files)
}

zipIpt.onchange = async function () {
  if (zipIpt.files.length === 0) return
  showToast('上传并解混淆 ZIP 中...', 'info')
  batchMode = true
  batchItems = []
  selectedIndex = 0
  sessionId = null
  zipId = null
  batchDlBtn.disabled = true

  try {
    var form = new FormData()
    form.append('zip', zipIpt.files[0])
    var res = await fetch('/api/batch/decrypt-zip', { method: 'POST', body: form })
    if (!res.ok) {
      var errData = await res.json().catch(function () { return { error: '请求失败' } })
      throw new Error(errData.error || 'HTTP ' + res.status)
    }
    var data = await res.json()
    sessionId = data.sessionId

    for (var zi = 0; zi < data.items.length; zi++) {
      var ri = data.items[zi]
      batchItems.push({
        file: new File([], ri.originalName),
        id: ri.id,
        processedName: ri.processedName,
        status: ri.error ? 'error' : 'processing',
        errorMsg: ri.error
      })
    }

    renderReaderView()
    status.textContent = '正在加载解混淆结果...'

    for (var pi = 0; pi < data.items.length; pi++) {
      var respItem = data.items[pi]
      if (respItem.error) continue
      var imgRes = await fetch('/api/batch/image/' + respItem.id + '?sessionId=' + sessionId)
      if (imgRes.ok) {
        var blob = await imgRes.blob()
        batchItems[pi].processedBlob = blob
        batchItems[pi].status = 'decrypted'
        renderReaderView()
      }
    }

    enableBatchDl()
    if (batchItems.length > 0) scrollToImage(0)
    status.textContent = '解混淆完成'
    showToast('解混淆完成', 'success')
  } catch (e) {
    status.textContent = '错误: ' + e.message
    showToast(e.message, 'error')
    batchItems.forEach(function (item) {
      if (item.status === 'processing') item.status = 'error'
    })
    renderReaderView()
  }
}

/* === Batch action === */
async function processBatchAction(action) {
  if (batchItems.length === 0) return
  batchItems.forEach(function (item) { item.status = 'processing' })
  renderReaderView()
  showProgress(0, batchItems.length)
  status.textContent = action === 'encrypt' ? '批量混淆中...' : '批量解混淆中...'

  try {
    var form = new FormData()
    for (var bi = 0; bi < batchItems.length; bi++) {
      form.append('image', batchItems[bi].file, batchItems[bi].file.name)
    }

    var res = await fetch('/api/batch/' + action, { method: 'POST', body: form })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    var data = await res.json()

    if (action === 'encrypt') {
      zipId = data.zipId
      data.items.forEach(function (respItem, i) {
        if (i < batchItems.length) {
          batchItems[i].processedName = respItem.processedName
          batchItems[i].status = respItem.error ? 'error' : 'encrypted'
          batchItems[i].errorMsg = respItem.error
        }
      })
      enableBatchDl()
      renderReaderView()
      showToast('混淆完成，点击"打包下载"获取 ZIP', 'success')
      status.textContent = '混淆完成，点击"打包下载"获取 ZIP'
    } else {
      sessionId = data.sessionId
      enableBatchDl()

      for (var di = 0; di < data.items.length; di++) {
        var dItem = data.items[di]
        if (di < batchItems.length) {
          batchItems[di].id = dItem.id
          batchItems[di].processedName = dItem.processedName
          if (dItem.error) {
            batchItems[di].status = 'error'
            batchItems[di].errorMsg = dItem.error
          } else {
            var imgRes = await fetch('/api/batch/image/' + dItem.id + '?sessionId=' + sessionId)
            if (imgRes.ok) {
              var blob = await imgRes.blob()
              batchItems[di].processedBlob = blob
              batchItems[di].status = 'decrypted'
            }
          }
        }
        showProgress(di + 1, data.items.length)
      }
      renderReaderView()
      if (batchItems.length > 0) scrollToImage(0)
      showToast('解混淆完成', 'success')
      status.textContent = '解混淆完成'
    }
  } catch (e) {
    status.textContent = '错误: ' + e.message
    showToast(e.message, 'error')
    batchItems.forEach(function (item) {
      if (item.status === 'processing') item.status = 'error'
    })
    renderReaderView()
  } finally {
    hideProgress()
  }
}

/* === Button handlers === */
encBtn.onclick = function () {
  if (batchMode) { processBatchAction('encrypt') }
  else if (previewScroll.querySelector('img')) { processImage('encrypt') }
}

decBtn.onclick = function () {
  if (batchMode) { processBatchAction('decrypt') }
  else if (previewScroll.querySelector('img')) { processImage('decrypt') }
}

reBtn.onclick = function () {
  if (batchMode) {
    if (batchItems.length > 0) scrollToImage(0)
  } else if (originalSrc) {
    setSrc(originalSrc)
    currentAction = ''
    status.textContent = '已还原原始图片'
  }
}

downloadBtn.onclick = function () {
  var imgEl = previewScroll.querySelector('.preview-item img')
  if (!imgEl) return
  if (batchMode) {
    var a = document.createElement('a')
    a.href = imgEl.src
    var item = batchItems[selectedIndex]
    a.download = item ? (item.processedName || item.file.name) : 'image.jpg'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  } else {
    var a = document.createElement('a')
    a.href = imgEl.src
    a.download = currentAction ? currentAction + '_' + originalFileName : originalFileName
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
}

batchDlBtn.onclick = async function () {
  try {
    if (zipId) {
      var res = await fetch('/api/batch/download?zipId=' + zipId, { method: 'POST' })
      if (!res.ok) throw new Error('ZIP 下载失败')
      var blob = await res.blob()
      var a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = 'encrypt_results.zip'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      showToast('打包下载完成', 'success')
      status.textContent = '打包下载完成'
    } else if (sessionId) {
      var ids = batchItems.filter(function (i) { return i.id && i.status === 'decrypted' }).map(function (i) { return i.id })
      if (ids.length === 0) { showToast('没有可打包的图片', 'error'); return }
      var res = await fetch('/api/batch/download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId, ids: ids })
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      var blob = await res.blob()
      var a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = 'decrypt_results.zip'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      showToast('打包下载完成', 'success')
      status.textContent = '打包下载完成'
    }
  } catch (e) { showToast(e.message, 'error'); status.textContent = '错误: ' + e.message }
}

/* === Single image processing === */
async function processImage(action) {
  var imgEl = previewScroll.querySelector('.preview-item img')
  if (!imgEl) return
  spinner.style.display = 'block'
  status.textContent = action === 'encrypt' ? '混淆中...' : '解混淆中...'
  encBtn.disabled = true; decBtn.disabled = true

  try {
    var blob = await fetch(imgEl.src).then(function (r) { return r.blob() })
    var form = new FormData()
    form.append('image', blob, 'image.jpeg')
    var res = await fetch('/api/' + action, { method: 'POST', body: form })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    var resultBlob = await res.blob()
    setSrc(URL.createObjectURL(resultBlob))
    currentAction = action
    showToast(action === 'encrypt' ? '混淆完成' : '解混淆完成', 'success')
    status.textContent = action === 'encrypt' ? '混淆完成' : '解混淆完成'
  } catch (e) { showToast(e.message, 'error'); status.textContent = '错误: ' + e.message }
  finally { spinner.style.display = 'none'; encBtn.disabled = false; decBtn.disabled = false }
}

/* === Keyboard navigation === */
document.addEventListener('keydown', function (e) {
  if (!batchMode || batchItems.length === 0) return
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) !== -1) {
    e.preventDefault()
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    scrollToImage(Math.max(0, selectedIndex - 1))
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    scrollToImage(Math.min(batchItems.length - 1, selectedIndex + 1))
  } else if (e.key === 'Home') {
    scrollToImage(0)
  } else if (e.key === 'End') {
    scrollToImage(batchItems.length - 1)
  }
})

/* === Drag & Drop === */
var dragCount = 0
previewScroll.addEventListener('dragenter', function (e) {
  e.preventDefault()
  dragCount++
  previewScroll.classList.add('drag-over')
})
previewScroll.addEventListener('dragleave', function (e) {
  e.preventDefault()
  dragCount--
  if (dragCount === 0) previewScroll.classList.remove('drag-over')
})
previewScroll.addEventListener('dragover', function (e) {
  e.preventDefault()
})
previewScroll.addEventListener('drop', function (e) {
  e.preventDefault()
  dragCount = 0
  previewScroll.classList.remove('drag-over')
  var files = e.dataTransfer.files
  if (files.length === 0) return

  if (files.length === 1 && files[0].name.match(/\\.zip$/i)) {
    var dt = new DataTransfer()
    dt.items.add(files[0])
    zipIpt.files = dt.files
    zipIpt.dispatchEvent(new Event('change'))
    return
  }

  var images = []
  for (var di = 0; di < files.length; di++) {
    if (files[di].type.startsWith('image/')) images.push(files[di])
  }
  if (images.length === 0) { showToast('未找到图片文件', 'error'); return }

  if (images.length === 1) {
    var dt = new DataTransfer()
    dt.items.add(images[0])
    ipt.files = dt.files
    ipt.dispatchEvent(new Event('change'))
  } else {
    var dt = new DataTransfer()
    for (var di2 = 0; di2 < images.length; di2++) dt.items.add(images[di2])
    multiIpt.files = dt.files
    multiIpt.dispatchEvent(new Event('change'))
  }
})`
}

export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>图片混淆 - ImageConfusion</title>
<style>${css()}</style>
</head>
<body>${html()}<script>${clientJS()}</script>
</body>
</html>`
}
