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
  if (!input.files) return
  files.value = Array.from(input.files)
}

async function handleCreate() {
  if (!name.value.trim()) {
    showToast('请输入漫画名称', 'error')
    return
  }
  if (files.value.length === 0) {
    showToast('请选择图片或 ZIP 文件', 'error')
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
        <input type="file" accept="image/*,.zip" multiple class="input" @change="handleFileSelect" />
      </div>

      <div v-if="files.length > 0" class="file-count">
        已选择 {{ files.length }} 个文件
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
