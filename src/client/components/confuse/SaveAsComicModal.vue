<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '../../composables/useToast'

const props = defineProps<{
  zipId: string | null
}>()

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
  if (!props.zipId) {
    showToast('没有可保存的加密结果', 'error')
    return
  }
  saving.value = true
  try {
    const form = new FormData()
    form.append('name', name.value)
    form.append('author', author.value)
    form.append('source', source.value)
    form.append('zipId', props.zipId)

    // Fetch the zip and pass it along
    const zipRes = await fetch(`/api/batch/download?zipId=${props.zipId}`, { method: 'POST' })
    if (!zipRes.ok) throw new Error('获取加密 ZIP 失败')
    const zipBlob = await zipRes.blob()
    form.append('zip', zipBlob, 'encrypted.zip')

    const res = await fetch('/api/gallery/save-from-batch', { method: 'POST', body: form })
    if (!res.ok) throw new Error('保存失败')
    showToast('已保存到漫画画廊', 'success')
    emit('saved')
    emit('close')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '保存失败', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2>保存为漫画</h2>
      <p class="modal-desc">将本次加密结果保存到漫画画廊</p>
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
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存' }}
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
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}

.modal-desc {
  font-size: 0.8rem;
  color: var(--muted-fg);
  margin-bottom: 1rem;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
