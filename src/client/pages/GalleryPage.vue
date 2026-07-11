<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ComicMeta } from '../types'
import ComicCard from '../components/gallery/ComicCard.vue'
import NewComicModal from '../components/gallery/NewComicModal.vue'
import ContextMenu, { type MenuItem } from '../components/common/ContextMenu.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
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

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  comic: null as ComicMeta | null,
})

const confirmDialog = ref({
  visible: false,
  comic: null as ComicMeta | null,
})

function openDeleteConfirm(comic: ComicMeta) {
  confirmDialog.value = { visible: true, comic }
}

function closeDeleteConfirm() {
  confirmDialog.value.visible = false
}

async function onDeleteConfirm() {
  const comic = confirmDialog.value.comic
  closeDeleteConfirm()
  if (!comic) return

  try {
    const res = await fetch(`/api/gallery/${comic.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    showToast('漫画已删除', 'success')
    await loadComics()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '删除失败', 'error')
  }
}

const menuItems: MenuItem[] = [
  { label: '查看详情', action: 'detail' },
  { label: '解密阅读', action: 'read' },
  { label: '删除漫画', action: 'delete', danger: true },
]

function openContextMenu(e: MouseEvent, comic: ComicMeta) {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    comic,
  }
}

async function onMenuSelect(action: string) {
  const comic = contextMenu.value.comic
  contextMenu.value.visible = false
  if (!comic) return

  if (action === 'detail') {
    router.push(`/gallery/${comic.id}/detail`)
  } else if (action === 'read') {
    router.push(`/gallery/${comic.id}/reader?total=${comic.totalPages}`)
  } else if (action === 'delete') {
    openDeleteConfirm(comic)
  }
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
        class="comic-card-wrapper"
        @click="openComic(comic.id)"
        @contextmenu.prevent="openContextMenu($event, comic)"
      >
        <ComicCard :comic="comic" />
      </div>
    </div>

    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="menuItems"
      @select="onMenuSelect"
      @close="contextMenu.visible = false"
    />

    <ConfirmDialog
      :visible="confirmDialog.visible"
      title="删除漫画"
      :message="`确定要删除《${confirmDialog.comic?.name || ''}》吗？此操作不可恢复。`"
      confirm-text="删除"
      cancel-text="取消"
      danger
      @confirm="onDeleteConfirm"
      @cancel="closeDeleteConfirm"
    />

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

.comic-card-wrapper {
  cursor: pointer;
}
</style>
