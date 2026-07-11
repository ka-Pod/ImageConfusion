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
const zipHasMetadata = ref(false)

function checkZipHasMetadata(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const text = new TextDecoder('utf-8').decode(data)
        resolve(text.includes('metadata.json'))
      } catch {
        reject(new Error('无法读取 ZIP'))
      }
    }
    reader.onerror = () => reject(new Error('读取 ZIP 失败'))
    reader.readAsArrayBuffer(file)
  })
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    files.value = []
    zipHasMetadata.value = false
    return
  }
  const file = input.files[0]
  files.value = [file]
  try {
    zipHasMetadata.value = await checkZipHasMetadata(file)
    if (zipHasMetadata.value) {
      name.value = ''
    }
  } catch {
    zipHasMetadata.value = false
  }
}

async function handleCreate() {
  if (files.value.length === 0) {
    showToast('请上传 ZIP 文件', 'error')
    return
  }
  if (!zipHasMetadata.value && !name.value.trim()) {
    showToast('请输入漫画名称', 'error')
    return
  }
  uploading.value = true
  try {
    const form = new FormData()
    if (name.value.trim()) {
      form.append('name', name.value.trim())
    }
    form.append('author', author.value)
    form.append('source', source.value)
    form.append('zip', files.value[0])
    const res = await fetch('/api/gallery/create', { method: 'POST', body: form })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: '请求失败' }))
      throw new Error(errData.error || '创建失败')
    }
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
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2>新建漫画</h2>

      <div class="form-group">
        <label>漫画名称 {{ zipHasMetadata ? '' : '*' }}</label>
        <input
          v-model="name"
          type="text"
          placeholder="输入漫画名称"
          class="input"
          :disabled="zipHasMetadata"
        />
        <p v-if="zipHasMetadata" class="hint">已检测到漫画元数据，将直接导入</p>
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
        <label>上传加密 ZIP *</label>
        <input type="file" accept=".zip" class="input" @change="handleFileSelect" />
      </div>

      <div v-if="files.length > 0" class="file-count">
        已选择 {{ files[0].name }}
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
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

.hint {
  font-size: 0.75rem;
  color: var(--muted-fg);
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
