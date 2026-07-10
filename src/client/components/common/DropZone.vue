<script setup lang="ts">
const emit = defineEmits<{
  (e: 'files', files: File[]): void
  (e: 'zip', file: File): void
}>()

function onDrop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  if (files.length === 1 && files[0].name.match(/\.zip$/i)) {
    emit('zip', files[0])
    return
  }

  const images: File[] = []
  for (let i = 0; i < files.length; i++) {
    if (files[i].type.startsWith('image/')) images.push(files[i])
  }
  if (images.length > 0) emit('files', images)
}
</script>

<template>
  <div
    class="drop-zone"
    @dragenter.prevent
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <slot>
      <div class="drop-placeholder">
        <div class="drop-icon">+</div>
        <p>拖拽图片或 ZIP 到此处</p>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.drop-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 50vh;
  max-height: 70vh;
  border: 2px solid var(--border);
  transition: border-color 0.2s;
}

.drop-zone:global(.drag-over) {
  border-color: var(--accent);
}

.drop-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 40vh;
  color: var(--muted-fg);
  font-size: 1rem;
  cursor: default;
  user-select: none;
}

.drop-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  line-height: 1;
}
</style>
