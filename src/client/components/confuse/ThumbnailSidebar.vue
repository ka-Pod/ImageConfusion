<script setup lang="ts">
import type { BatchItem } from '../../types'

defineProps<{
  items: BatchItem[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  (e: 'select', index: number): void
}>()
</script>

<template>
  <div v-if="items.length > 0" id="thumb-sidebar">
    <div
      v-for="(item, i) in items"
      :key="i"
      :class="['thumb-item', `status-${item.status}`, { active: i === selectedIndex }]"
      @click="emit('select', i)"
    >
      <div class="thumb-idx">{{ i + 1 }}/{{ items.length }}</div>
      <img
        v-if="item.processedBlob"
        :src="URL.createObjectURL(item.processedBlob)"
        alt=""
      />
      <img
        v-else-if="item.file && item.file.size > 0"
        :src="URL.createObjectURL(item.file)"
        alt=""
      />
      <div v-else class="thumb-placeholder"></div>
      <div v-if="item.status === 'encrypted'" class="thumb-overlay">已混淆</div>
      <div v-else-if="item.status === 'processing'" class="thumb-overlay">处理中</div>
      <div v-else-if="item.status === 'error'" class="thumb-overlay">{{ item.errorMsg || '错误' }}</div>
    </div>
  </div>
</template>

<style scoped>
#thumb-sidebar {
  width: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background: #fff;
  max-height: 70vh;
}

.thumb-item {
  position: relative;
  cursor: pointer;
  border: 2px solid var(--border);
  padding: 2px;
  text-align: center;
  flex: 0 0 auto;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  box-shadow: var(--shadow-sm);
}

.thumb-item:hover { border-color: var(--muted-fg); }
.thumb-item.active { border-color: var(--accent); background: rgba(0,0,0,0.03); }
.thumb-item:active { transform: translate(2px, 2px); box-shadow: none; }

.thumb-item img {
  width: 100%;
  height: 56px;
  object-fit: cover;
  display: block;
}

.thumb-placeholder {
  width: 100%;
  height: 56px;
  background: var(--muted);
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.6rem;
  pointer-events: none;
}

.thumb-idx {
  position: absolute;
  top: 1px;
  left: 1px;
  background: var(--accent);
  color: #fff;
  font-size: 0.55rem;
  padding: 2px 5px;
  line-height: 1.3;
}

.thumb-item.status-processing { border-color: var(--accent); }
.thumb-item.status-encrypted,
.thumb-item.status-decrypted { border-color: #2ecc71; }
.thumb-item.status-error { border-color: #e74c3c; }
</style>
