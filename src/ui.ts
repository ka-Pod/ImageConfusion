function css(): string {
  return `
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
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif; text-align: left; padding: 1.5rem 2rem; background: var(--bg); color: var(--fg); min-height: 100vh; animation: hueDrift 30s ease-in-out infinite; }
.header { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.header-title { border-left: 4px solid var(--accent); padding-left: 1rem; }
h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; margin: 0; transition: opacity 0.4s ease; }
.desc { max-width: 480px; margin: 0; padding-left: calc(1rem + 4px); font-size: 0.85rem; color: var(--muted-fg); line-height: 1.6; animation: letterPulse 4s ease-in-out infinite; transition: opacity 0.4s ease; }
.previewing h1, .previewing .desc { opacity: 0; pointer-events: none; }
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
#main-area { display: flex; gap: 10px; min-height: 65vh; margin-top: 0.5rem; }
#thumb-sidebar { width: 140px; overflow-y: auto; display: none; flex-direction: column; gap: 4px; padding: 6px; background: #fff; max-height: 70vh; }
#thumb-sidebar .thumb-item { position: relative; cursor: pointer; border: 2px solid var(--border); padding: 2px; text-align: center; flex: 0 0 auto; transition: border-color .15s; }
#thumb-sidebar .thumb-item:hover { border-color: var(--muted-fg); }
#thumb-sidebar .thumb-item.active { border-color: var(--accent); background: rgba(0,0,0,.03); }
#thumb-sidebar .thumb-item img { width: 100%; height: 56px; object-fit: cover; display: block; }
#thumb-sidebar .thumb-item .thumb-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; color: #fff; font-size: .6rem; pointer-events: none; }
#thumb-sidebar .thumb-item .thumb-idx { position: absolute; top: 1px; left: 1px; background: var(--accent); color: #fff; font-size: .5rem; padding: 1px 4px; line-height: 1.3; }
#thumb-sidebar .thumb-item.status-processing { border-color: var(--accent); }
#thumb-sidebar .thumb-item.status-encrypted,#thumb-sidebar .thumb-item.status-decrypted { border-color: #2ecc71; }
#thumb-sidebar .thumb-item.status-error { border-color: #e74c3c; }
#preview-scroll { position: relative; flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-height: 50vh; max-height: 70vh; border: 2px solid var(--border); transition: border-color .2s; scroll-snap-type: y mandatory; }
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
.status-dots::after { animation: dots 1.5s steps(3) infinite; content: ''; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes letterPulse { 0%,100% { letter-spacing: -0.02em; } 50% { letter-spacing: 0.03em; } }
@keyframes hueDrift { 0%,100% { background-color: #FAFAFA; } 50% { background-color: #F0F4FA; } }
@keyframes titleSweep { 0% { background-position: 0 50%; } 100% { background-position: 100% 50%; } }
@keyframes scramble { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes shimmer { 0% { background-position: -200% 0; } to { background-position: 200% 0; } }
@keyframes dots { 0% { content: ''; } 33% { content: '.'; } 66% { content: '..'; } to { content: '...'; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
@media (max-width: 767px) { body { padding: 1rem; } h1 { font-size: 1.3rem; } .btn { padding: 0.5rem 0.8rem; font-size: 0.7rem; } #main-area { flex-direction: column; } #thumb-sidebar { width: 100%; flex-direction: row; overflow-x: auto; max-height: 80px; padding: 4px; } #thumb-sidebar .thumb-item { flex: 0 0 64px; } #thumb-sidebar .thumb-item img { height: 44px; } #preview-scroll { min-height: 40vh; max-height: 55vh; } .preview-item { flex: 0 0 100%; } .preview-item img { max-width: 96vw; max-height: 40vh; } .preview-nav { display: flex; } }`
}

function html(): string {
  return `
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
let toastTimer = null

const ipt = document.getElementById('ipt')
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

var statusEl = document.getElementById('status')
var _origStatusText = ''
if (statusEl) {
  _origStatusText = statusEl.textContent
  var statusObserver = new MutationObserver(function () {
    if (statusEl.textContent !== _origStatusText) {
      var newText = statusEl.textContent
      scrambleText(statusEl, newText, 400)
      _origStatusText = newText
    }
  })
  statusObserver.observe(statusEl, { childList: true, characterData: true, subtree: true })
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
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 260)
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

/* === Rendering === */
function setSrc(url) {
  previewScroll.innerHTML = ''
  var header = document.querySelector('.header')
  if (header) header.classList.add('previewing')
  var item = document.createElement('div')
  item.className = 'preview-item'
  var img = document.createElement('img')
  img.src = url
  item.appendChild(img)
  previewScroll.appendChild(item)
}

function renderReaderView() {
  previewScroll.innerHTML = ''
  thumbSidebar.innerHTML = ''

  if (batchItems.length === 0) {
    previewScroll.innerHTML = '<div class="drop-placeholder"><div class="drop-icon">+</div>拖拽图片或 ZIP 到此处</div>'
    thumbSidebar.style.display = 'none'
    var header = document.querySelector('.header')
    if (header) header.classList.remove('previewing')
    return
  }

  batchItems.forEach(function (item, i) {
    var previewItem = document.createElement('div')
    previewItem.className = 'preview-item'
    previewItem.dataset.index = i

    if (item.processedBlob) {
      var img = document.createElement('img')
      img.src = URL.createObjectURL(item.processedBlob)
      previewItem.appendChild(img)
    } else if (item.file instanceof File && item.file.size > 0) {
      var img = document.createElement('img')
      img.src = URL.createObjectURL(item.file)
      previewItem.appendChild(img)
    }

    if (item.status === 'processing' && !item.processedBlob) {
      var shimmer = document.createElement('div')
      shimmer.className = 'shimmer-placeholder'
      previewItem.appendChild(shimmer)
    }

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

    var counter = document.createElement('div')
    counter.className = 'preview-counter'
    counter.textContent = (i + 1) + '/' + batchItems.length
    previewItem.appendChild(counter)

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

  var header = document.querySelector('.header')
  if (header && !header.classList.contains('previewing')) header.classList.add('previewing')

  thumbSidebar.style.display = 'flex'

  var prevBtn = document.createElement('button')
  prevBtn.className = 'preview-nav prev'
  prevBtn.textContent = '‹'
  prevBtn.onclick = function () { scrollToImage(Math.max(0, selectedIndex - 1)) }
  previewScroll.appendChild(prevBtn)

  var nextBtn = document.createElement('button')
  nextBtn.className = 'preview-nav next'
  nextBtn.textContent = '›'
  nextBtn.onclick = function () { scrollToImage(Math.min(batchItems.length - 1, selectedIndex + 1)) }
  previewScroll.appendChild(nextBtn)

  observeItems()

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

/* === Marquee === */
var marqueeMessages = ['GILBERT 2D CURVE · SPACE-FILLING · OFFSET 0.618', 'PIXEL REARRANGEMENT · LOSSLESS CORE · JPEG Q95', 'IMAGE CONFUSION · ENCRYPT / DECRYPT · SERVER SIDE']
var marqueeIndex = 0
var marqueeEl = document.getElementById('status-marquee')
if (marqueeEl) {
  marqueeEl.style.position = 'relative'
  marqueeEl.textContent = marqueeMessages[0]
  setInterval(function () {
    marqueeIndex = (marqueeIndex + 1) % marqueeMessages.length
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

/* === Single image === */
ipt.onchange = function () {
  if (ipt.files.length === 0) return
  if (ipt.files.length === 1) {
    batchMode = false
    thumbSidebar.style.display = 'none'
    batchDlBtn.disabled = true
    var header = document.querySelector('.header')
    if (header) header.classList.add('previewing')
    var url = URL.createObjectURL(ipt.files[0])
    setSrc(url)
    originalSrc = url
    originalFileName = ipt.files[0].name
    currentAction = ''
    status.textContent = ipt.files[0].name
  } else {
    loadBatchFiles(ipt.files)
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

    batchDlBtn.disabled = false
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
      batchDlBtn.disabled = false
      renderReaderView()
      showToast('混淆完成，点击"打包下载"获取 ZIP', 'success')
      status.textContent = '混淆完成，点击"打包下载"获取 ZIP'
    } else {
      sessionId = data.sessionId
      batchDlBtn.disabled = false

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
    var header = document.querySelector('.header')
    if (header) header.classList.add('previewing')
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

/* === Touch Swipe === */
var touchStartX = 0
previewScroll.addEventListener('touchstart', function (e) {
  touchStartX = e.changedTouches[0].screenX
}, { passive: true })
previewScroll.addEventListener('touchend', function (e) {
  if (!batchMode || batchItems.length === 0) return
  var deltaX = e.changedTouches[0].screenX - touchStartX
  if (Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      scrollToImage(Math.max(0, selectedIndex - 1))
    } else {
      scrollToImage(Math.min(batchItems.length - 1, selectedIndex + 1))
    }
  }
}, { passive: true })

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
    loadBatchFiles(images)
  }
})`
}

export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
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
