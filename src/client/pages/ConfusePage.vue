<script setup lang="ts">
import { ref, computed } from 'vue'
import AppHeader from '../components/common/AppHeader.vue'
import ControlBar from '../components/confuse/ControlBar.vue'
import ImagePreview from '../components/confuse/ImagePreview.vue'
import ThumbnailSidebar from '../components/confuse/ThumbnailSidebar.vue'
import SaveAsComicModal from '../components/confuse/SaveAsComicModal.vue'
import ProgressBar from '../components/common/ProgressBar.vue'
import DropZone from '../components/common/DropZone.vue'
import { useConfuse } from '../composables/useConfuse'
import { useKeyboard } from '../composables/useKeyboard'
import { useToast } from '../composables/useToast'

const {
  batchMode, batchItems, selectedIndex, sessionId, zipId,
  originalSrc, originalFile, originalFileName, currentAction,
  hasItems, allEncrypted,
  loadSingleFile, loadBatchFiles, processSingle, processBatch, scrollToImage,
} = useConfuse()

const { showToast } = useToast()
const processing = ref(false)
const progressShow = ref(false)
const progressCurrent = ref(0)
const progressTotal = ref(0)
const showSaveModal = ref(false)

// Button disabled states
const encryptDisabled = computed(() =>
  (!hasItems.value && !originalSrc.value) || processing.value
)
const decryptDisabled = encryptDisabled
const restoreDisabled = computed(() =>
  (!hasItems.value && !originalFile.value) || processing.value
)
const downloadDisabled = computed(() =>
  processing.value || (!hasItems.value && !originalSrc.value)
)
const batchDlDisabled = computed(() =>
  !zipId.value && !sessionId.value
)

// Show "save as comic" button only when all items are encrypted
const showSaveButton = computed(() => allEncrypted.value)

function handleProgress(current: number, total: number) {
  progressCurrent.value = current
  progressTotal.value = total
  progressShow.value = true
}

function hideProgress() {
  progressShow.value = false
}

async function handleEncrypt() {
  processing.value = true
  try {
    if (batchMode.value) {
      handleProgress(0, batchItems.value.length)
      await processBatch('encrypt')
      showToast('混淆完成', 'success')
    } else {
      const blob = await processSingle('encrypt')
      if (blob) {
        if (originalSrc.value.startsWith('blob:')) URL.revokeObjectURL(originalSrc.value)
        originalSrc.value = URL.createObjectURL(blob)
        showToast('混淆完成', 'success')
      }
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : '操作失败', 'error')
  } finally {
    processing.value = false
    hideProgress()
  }
}

async function handleDecrypt() {
  processing.value = true
  try {
    if (batchMode.value) {
      handleProgress(0, batchItems.value.length)
      await processBatch('decrypt')
      showToast('解混淆完成', 'success')
    } else {
      const blob = await processSingle('decrypt')
      if (blob) {
        if (originalSrc.value.startsWith('blob:')) URL.revokeObjectURL(originalSrc.value)
        originalSrc.value = URL.createObjectURL(blob)
        showToast('解混淆完成', 'success')
      }
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : '操作失败', 'error')
  } finally {
    processing.value = false
    hideProgress()
  }
}

function handleRestore() {
  if (batchMode.value) {
    if (batchItems.value.length > 0) scrollToImage(0)
  } else if (originalFile.value) {
    if (originalSrc.value.startsWith('blob:')) {
      URL.revokeObjectURL(originalSrc.value)
    }
    originalSrc.value = URL.createObjectURL(originalFile.value)
    currentAction.value = ''
  }
}

function handleDownload() {
  const previewEl = document.querySelector('.preview-item img') as HTMLImageElement
  if (!previewEl) return
  const a = document.createElement('a')
  a.href = previewEl.src
  if (batchMode.value && selectedIndex.value >= 0) {
    const item = batchItems.value[selectedIndex.value]
    a.download = item ? (item.processedName || item.file.name) : 'image.jpg'
  } else {
    a.download = currentAction.value ? `${currentAction.value}_${originalFileName.value}` : originalFileName.value
  }
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function handleBatchDl() {
  try {
    if (zipId.value) {
      const res = await fetch(`/api/batch/download?zipId=${zipId.value}`, { method: 'POST' })
      if (!res.ok) throw new Error('ZIP 下载失败')
      const blob = await res.blob()
      const a = document.createElement('a')
      const blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.download = 'encrypt_results.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      showToast('打包下载完成', 'success')
    } else if (sessionId.value) {
      const ids = batchItems.value
        .filter(i => i.id && i.status === 'decrypted')
        .map(i => i.id!)
      if (ids.length === 0) { showToast('没有可打包的图片', 'error'); return }
      const res = await fetch('/api/batch/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.value, ids }),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const blob = await res.blob()
      const a = document.createElement('a')
      const blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.download = 'decrypt_results.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      showToast('打包下载完成', 'success')
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : '下载失败', 'error')
  }
}

function onDropFiles(files: File[]) {
  if (files.length === 1) {
    loadSingleFile(files[0])
  } else {
    loadBatchFiles(files)
  }
}

async function onDropZip(file: File) {
  showToast('上传并解混淆 ZIP 中...', 'info')
  try {
    const form = new FormData()
    form.append('zip', file)
    const res = await fetch('/api/batch/decrypt-zip', { method: 'POST', body: form })
    if (!res.ok) throw new Error('ZIP 处理失败')
    const data = await res.json()
    batchItems.value = []
    for (const item of data.items) {
      batchItems.value.push({
        file: new File([], item.originalName),
        id: item.id,
        processedName: item.processedName,
        status: item.error ? 'error' : 'processing',
        errorMsg: item.error,
      })
    }
    for (let i = 0; i < data.items.length; i++) {
      const respItem = data.items[i]
      if (respItem.error) continue
      const imgRes = await fetch(`/api/batch/image/${respItem.id}?sessionId=${data.sessionId}`)
      if (imgRes.ok) {
        const blob = await imgRes.blob()
        batchItems.value[i].processedBlob = blob
        if (batchItems.value[i].processedUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(batchItems.value[i].processedUrl!)
        }
        batchItems.value[i].processedUrl = URL.createObjectURL(blob)
        batchItems.value[i].status = 'decrypted'
      }
    }
    showToast('解混淆完成', 'success')
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'ZIP 处理失败', 'error')
  }
}

// Keyboard navigation
useKeyboard(
  () => batchMode.value && batchItems.value.length > 0,
  () => scrollToImage(Math.max(0, selectedIndex.value - 1)),
  () => scrollToImage(Math.min(batchItems.value.length - 1, selectedIndex.value + 1)),
  () => scrollToImage(0),
  () => scrollToImage(batchItems.value.length - 1),
)
</script>

<template>
  <div class="confuse-page">
    <AppHeader :description="'基于空间填充曲线的图片混淆。仅供技术交流使用。输出 JPEG 质量 0.95。'">
      <template #controls>
        <ControlBar
          :batch-mode="batchMode"
          :has-items="hasItems"
          :single-loaded="!!originalSrc"
          :encrypt-disabled="encryptDisabled"
          :decrypt-disabled="decryptDisabled"
          :restore-disabled="restoreDisabled"
          :download-disabled="downloadDisabled"
          :batch-dl-disabled="batchDlDisabled"
          @files-selected="onDropFiles"
          @zip-selected="onDropZip"
          @encrypt="handleEncrypt"
          @decrypt="handleDecrypt"
          @restore="handleRestore"
          @download="handleDownload"
          @batch-dl="handleBatchDl"
        />
      </template>
    </AppHeader>

    <ProgressBar
      :show="progressShow"
      :current="progressCurrent"
      :total="progressTotal"
    />

    <div id="main-area">
      <ThumbnailSidebar
        v-if="batchMode && batchItems.length > 0"
        :items="batchItems"
        :selected-index="selectedIndex"
        @select="scrollToImage"
      />

      <DropZone
        v-if="!hasItems && !originalSrc"
        @files="onDropFiles"
        @zip="onDropZip"
      />

      <div v-else id="preview-scroll" class="preview-scroll">
        <div
          v-for="(item, i) in batchItems"
          v-show="batchMode"
          :key="i"
          class="preview-item"
        >
          <div v-if="item.status === 'processing' && !item.processedBlob" class="shimmer-placeholder"></div>
          <img
            v-if="item.processedUrl"
            :src="item.processedUrl"
            alt=""
          />
          <img
            v-else-if="item.fileUrl"
            :src="item.fileUrl"
            alt=""
          />
          <div v-if="item.status === 'encrypted'" class="preview-overlay">已混淆</div>
          <div v-if="item.errorMsg" class="preview-error">{{ item.errorMsg }}</div>
          <div class="preview-counter">{{ i + 1 }}/{{ batchItems.length }}</div>
        </div>

        <ImagePreview
          v-if="!batchMode && originalSrc"
          :src="originalSrc"
          :processing="processing"
        />
      </div>
    </div>

    <!-- Save as comic button -->
    <div v-if="showSaveButton" class="save-comic-bar">
      <button class="btn btn-primary" @click="showSaveModal = true">
        保存为漫画
      </button>
    </div>

    <!-- Save modal -->
    <SaveAsComicModal
      v-if="showSaveModal"
      :zip-id="zipId"
      @close="showSaveModal = false"
      @saved="showSaveModal = false"
    />
  </div>
</template>

<style scoped>
.confuse-page {
  min-height: 50vh;
}

#main-area {
  display: flex;
  gap: 10px;
  min-height: calc(100vh - 200px);
  max-height: calc(100vh - 160px);
  margin-top: 0.5rem;
}

.preview-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 50vh;
  max-height: 70vh;
  border: 2px solid var(--border);
}

.preview-item {
  position: relative;
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.preview-item img {
  max-width: min(92vw, 800px);
  max-height: min(60vh, 500px);
  display: block;
  margin: 0 auto;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2rem;
  pointer-events: none;
}

.preview-error {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--error);
  color: #fff;
  padding: 4px 12px;
  font-size: 0.8rem;
}

.preview-counter {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(74, 111, 165, 0.9);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  padding: 4px 12px;
  pointer-events: none;
}

.save-comic-bar {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

@media (max-width: 767px) {
  #main-area {
    flex-direction: column;
    min-height: 50vh;
    max-height: 60vh;
  }
}
</style>
