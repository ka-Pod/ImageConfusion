<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ComicMeta } from '../types'
import ComicCard from '../components/gallery/ComicCard.vue'
import NewComicModal from '../components/gallery/NewComicModal.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { showToast } = useToast()
const comics = ref<ComicMeta[]>([])
const loading = ref(true)
const showNewModal = ref(false)

async function loadComics() {
  loading.value = true
  try {
    const res = await fetch('/api/gallery/list')
    if (!res.ok) throw new Error('加载失败')
    comics.value = await res.json()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '加载漫画列表失败', 'error')
  } finally {
    loading.value = false
  }
}

function openComic(id: string) {
  router.push(`/gallery/${id}/detail`)
}

onMounted(() => {
  loadComics()
})
</script>

<template>
  <div class="gallery-page">
    <div class="page-header">
      <h2>漫画画廊</h2>
      <button class="btn btn-primary" @click="showNewModal = true">
        + 新建漫画
      </button>
    </div>

    <div v-if="loading" class="loading">
      <p>加载中...</p>
    </div>

    <div v-else-if="comics.length === 0" class="empty">
      <p>暂无漫画，点击"新建漫画"开始</p>
    </div>

    <div v-else class="comic-grid">
      <div
        v-for="comic in comics"
        :key="comic.id"
        @click="openComic(comic.id)"
      >
        <ComicCard :comic="comic" />
      </div>
    </div>

    <NewComicModal
      v-if="showNewModal"
      @close="showNewModal = false"
      @created="showNewModal = false; loadComics()"
    />
  </div>
</template>

<style scoped>
.gallery-page {
  min-height: 50vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
}

.comic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.loading, .empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  color: var(--muted-fg);
  font-size: 1rem;
}
</style>
