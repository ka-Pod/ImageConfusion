<script setup lang="ts">
import type { ComicMeta } from '../../types'

defineProps<{
  comic: ComicMeta
}>()
</script>

<template>
  <div class="comic-card">
    <div class="card-cover">
      <img
        v-if="comic.coverBase64"
        :src="`data:image/jpeg;base64,${comic.coverBase64}`"
        :alt="comic.name"
      />
      <div v-else class="cover-placeholder">暂无封面</div>
    </div>
    <div class="card-info">
      <h3 class="card-title">{{ comic.name }}</h3>
      <p v-if="comic.author" class="card-author">{{ comic.author }}</p>
      <p class="card-date">{{ new Date(comic.createdAt).toLocaleDateString('zh-CN') }}</p>
    </div>
  </div>
</template>

<style scoped>
.comic-card {
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: box-shadow 0.12s, transform 0.12s;
  background: #fff;
}

.comic-card:hover {
  box-shadow: none;
  transform: translate(4px, 4px);
}

.card-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-bottom: 2px solid var(--border);
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.card-info {
  padding: 0.5rem;
}

.card-title {
  font-size: 0.85rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-author {
  font-size: 0.75rem;
  color: var(--muted-fg);
  margin-top: 0.2rem;
}

.card-date {
  font-size: 0.7rem;
  color: var(--muted-fg);
  margin-top: 0.1rem;
}
</style>
