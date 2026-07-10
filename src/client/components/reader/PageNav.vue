<script setup lang="ts">
defineProps<{
  current: number
  total: number
  canPrev: boolean
  canNext: boolean
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()
</script>

<template>
  <div class="page-nav">
    <button
      class="btn btn-secondary nav-btn"
      :disabled="!canPrev"
      @click="emit('prev')"
    >
      ◀ 上一页
    </button>

    <span class="nav-info">{{ current + 1 }} / {{ total }}</span>

    <button
      class="btn btn-secondary nav-btn"
      :disabled="!canNext"
      @click="emit('next')"
    >
      下一页 ▶
    </button>
  </div>
</template>

<style scoped>
.page-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 2px solid var(--border);
}

.nav-info {
  font-size: 0.9rem;
  font-weight: 700;
  min-width: 60px;
  text-align: center;
}

.nav-btn {
  min-width: 100px;
}
</style>
