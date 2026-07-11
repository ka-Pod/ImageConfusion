<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  batchMode: boolean
  hasItems: boolean
  singleLoaded: boolean
  encryptDisabled: boolean
  decryptDisabled: boolean
  restoreDisabled: boolean
  downloadDisabled: boolean
  batchDlDisabled: boolean
}>()

const emit = defineEmits<{
  (e: 'files-selected', files: File[]): void
  (e: 'zip-selected', file: File): void
  (e: 'encrypt'): void
  (e: 'decrypt'): void
  (e: 'restore'): void
  (e: 'download'): void
  (e: 'batch-dl'): void
}>()

const fileInput = ref<HTMLInputElement>()
const dirInput = ref<HTMLInputElement>()
const zipInput = ref<HTMLInputElement>()

function triggerFileInput() {
  fileInput.value?.click()
}

function triggerDirInput() {
  dirInput.value?.click()
}

function triggerZipInput() {
  zipInput.value?.click()
}

function onImageFilesChanged(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('files-selected', Array.from(input.files))
    input.value = ''
  }
}

function onDirFilesChanged(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('files-selected', Array.from(input.files))
    input.value = ''
  }
}

function onZipFileChanged(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('zip-selected', input.files[0])
    input.value = ''
  }
}
</script>

<template>
  <div class="controls-bar">
    <span class="btn btn-file" @click="triggerFileInput">
      选择图片
      <input ref="fileInput" type="file" multiple accept="image/*" hidden @change="onImageFilesChanged" />
    </span>
    <span class="btn btn-file" @click="triggerDirInput">
      选择文件夹
      <input ref="dirInput" type="file" webkitdirectory multiple accept="image/*" hidden @change="onDirFilesChanged" />
    </span>
    <span class="btn btn-file" @click="triggerZipInput">
      上传ZIP
      <input ref="zipInput" type="file" accept=".zip" hidden @change="onZipFileChanged" />
    </span>

    <span class="btn-sep">│</span>

    <button class="btn btn-primary" :disabled="encryptDisabled" @click="$emit('encrypt')">
      混淆
    </button>
    <button class="btn btn-primary" :disabled="decryptDisabled" @click="$emit('decrypt')">
      解混淆
    </button>

    <span class="btn-sep">│</span>

    <button class="btn btn-secondary" :disabled="restoreDisabled" @click="$emit('restore')">
      还原
    </button>
    <button class="btn btn-secondary" :disabled="downloadDisabled" @click="$emit('download')">
      下载
    </button>
    <button class="btn btn-secondary" :disabled="batchDlDisabled" @click="$emit('batch-dl')">
      打包下载
    </button>
  </div>
</template>

<style scoped>
.controls-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sep {
  color: var(--muted-fg);
  user-select: none;
  padding: 0 0.1rem;
  font-size: 0.8rem;
}
</style>
