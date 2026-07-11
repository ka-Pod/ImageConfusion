<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ComicPage from '../components/reader/ComicPage.vue'
import PageNav from '../components/reader/PageNav.vue'
import { useKeyboard } from '../composables/useKeyboard'

const route = useRoute()
const router = useRouter()
const comicId = route.params.id as string
const currentPage = ref(0)
const totalPages = ref(parseInt((route.query.total as string) || '0', 10))
const pageSrc = ref('')
const loading = ref(true)

let currentObjectUrl = ''

async function loadPage(index: number) {
  if (index < 0 || index >= totalPages.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/gallery/${comicId}/page/${index}`)
    if (!res.ok) throw new Error('加载页面失败')
    const blob = await res.blob()
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = URL.createObjectURL(blob)
    pageSrc.value = currentObjectUrl
    currentPage.value = index
  } catch (err) {
    pageSrc.value = ''
  } finally {
    loading.value = false
  }
  preloadPage(index - 1)
  preloadPage(index + 1)
}

function preloadPage(index: number) {
  if (index < 0 || index >= totalPages.value) return
  fetch(`/api/gallery/${comicId}/page/${index}`).catch(() => {})
}

function prevPage() {
  if (currentPage.value > 0) loadPage(currentPage.value - 1)
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) loadPage(currentPage.value + 1)
}

function closeReader() {
  router.push('/gallery')
}

useKeyboard(
  () => true,
  prevPage,
  nextPage,
  () => loadPage(0),
  () => loadPage(totalPages.value - 1),
)

onMounted(() => {
  loadPage(0)
})

onUnmounted(() => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
})
</script>

<template>
  <div class="reader-page">
    <div class="reader-header">
      <button class="btn btn-secondary" @click="closeReader">
        ← 返回画廊
      </button>
      <span class="reader-title">漫画阅读</span>
      <button class="btn btn-secondary" @click="closeReader">
        关闭 ✕
      </button>
    </div>

    <div class="reader-content">
      <div v-if="loading" class="loading-state">
        <p>加载中...</p>
      </div>

      <div v-else-if="pageSrc" class="preview-scroll">
        <ComicPage
          :src="pageSrc"
          :index="currentPage"
          :total="totalPages || 1"
        />
      </div>

      <div v-else class="error-state">
        <p>页面加载失败</p>
      </div>
    </div>

    <PageNav
      v-if="totalPages > 0"
      :current="currentPage"
      :total="totalPages"
      :can-prev="currentPage > 0"
      :can-next="currentPage < totalPages - 1"
      @prev="prevPage"
      @next="nextPage"
    />
  </div>
</template>

<style scoped>
.reader-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 100px);
}

.reader-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
}

.reader-title {
  font-size: 1rem;
  font-weight: 700;
}

.reader-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border);
  min-height: 60vh;
}

.preview-scroll {
  width: 100%;
  height: 100%;
  display: flex;
  overflow-y: auto;
}

.loading-state, .error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-fg);
}
</style>
