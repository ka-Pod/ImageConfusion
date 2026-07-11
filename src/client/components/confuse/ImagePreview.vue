<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{
  src: string
  processing: boolean
}>()

const currentSrc = ref(props.src)

watch(() => props.src, (newVal) => {
  if (currentSrc.value && currentSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(currentSrc.value)
  }
  currentSrc.value = newVal
})
</script>

<template>
  <div class="preview-item">
    <div v-if="processing" class="shimmer-placeholder"></div>
    <img
      v-else-if="src"
      :src="src"
      alt="preview"
    />
    <div v-else class="empty-state">
      <slot name="empty">
        <p>请选择图片</p>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.preview-item {
  position: relative;
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.preview-item img {
  max-width: min(92vw, 800px);
  max-height: min(60vh, 500px);
  display: block;
  margin: 0 auto;
  transition: opacity 0.2s;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40vh;
  color: var(--muted-fg);
}
</style>
