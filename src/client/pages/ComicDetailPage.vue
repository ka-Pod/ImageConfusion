<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ComicMeta } from '../../types'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const { showToast } = useToast()

const comic = ref<ComicMeta | null>(null)
const loading = ref(true)
const decrypting = ref(false)
const comicId = route.params.id as string

async function loadDetail() {
  loading.value = true
  try {
    const res = await fetch(`/api/gallery/${comicId}`)
    if (!res.ok) throw new Error('漫画不存在')
    comic.value = await res.json()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '加载失败', 'error')
    router.push('/gallery')
  } finally {
    loading.value = false
  }
}

async function handleDecrypt() {
  if (!comic.value) return
  decrypting.value = true
  try {
    const res = await fetch(`/api/gallery/${comicId}/decrypt`, { method: 'POST' })
    if (!res.ok) throw new Error('解密失败')
    const data = await res.json()
    router.push(`/gallery/${comicId}/reader?session=${data.sessionId}`)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '解密失败', 'error')
  } finally {
    decrypting.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div v-if="loading" class="loading">
    <p>加载中...</p>
  </div>

  <div v-else-if="comic" class="detail-page">
    <button class="btn btn-secondary back-btn" @click="router.push('/gallery')">
      ← 返回画廊
    </button>

    <div class="detail-layout">
      <div class="cover-section">
        <div class="cover-frame">
          <div class="cover-placeholder">封面</div>
        </div>
      </div>

      <div class="info-section">
        <h2>{{ comic.name }}</h2>

        <div class="info-row">
          <span class="info-label">作者</span>
          <span class="info-value">{{ comic.author || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">图源</span>
          <span class="info-value">{{ comic.source || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">创建时间</span>
          <span class="info-value">{{ new Date(comic.createdAt).toLocaleDateString('zh-CN') }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">页数</span>
          <span class="info-value">{{ comic.totalPages }} 页</span>
        </div>

        <button
          class="btn btn-primary decrypt-btn"
          :disabled="decrypting"
          @click="handleDecrypt"
        >
          {{ decrypting ? '解密中...' : '开始解密并阅读' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 700px;
  margin: 0 auto;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  color: var(--muted-fg);
}

.back-btn {
  margin-bottom: 1.5rem;
}

.detail-layout {
  display: flex;
  gap: 2rem;
}

.cover-section {
  flex-shrink: 0;
}

.cover-frame {
  width: 250px;
  height: 333px;
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--muted-fg);
  font-size: 0.85rem;
}

.info-section {
  flex: 1;
}

.info-section h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--muted);
}

.info-label {
  width: 100px;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--muted-fg);
}

.info-value {
  font-size: 0.85rem;
}

.decrypt-btn {
  margin-top: 2rem;
  width: 100%;
}

@media (max-width: 767px) {
  .detail-layout {
    flex-direction: column;
    align-items: center;
  }
}
</style>
