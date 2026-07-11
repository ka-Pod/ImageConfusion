<script setup lang="ts">
const props = defineProps<{
  src: string
  index: number
  total: number
}>()
</script>

<template>
  <div class="reader-item">
    <img
      :src="src"
      :alt="`第 ${index + 1} 页`"
    />
    <div class="page-counter">{{ index + 1 }} / {{ total }}</div>
  </div>
</template>

<style scoped>
.reader-item {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 100%;
}

.reader-item img {
  max-width: min(95vw, 900px);
  max-height: 85vh;
  object-fit: contain;
}

.page-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(74, 111, 165, 0.9);
  color: #fff;
  padding: 4px 12px;
  font-size: 0.9rem;
  font-weight: 700;
}
</style>
