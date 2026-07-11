<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

export type MenuItem = {
  label: string
  action: string
  danger?: boolean
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: MenuItem[]
}>()

const emit = defineEmits<{
  (e: 'select', action: string): void
  (e: 'close'): void
}>()

function onItemClick(action: string) {
  emit('select', action)
}

function onBackdropClick() {
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="visible" class="context-menu-backdrop" @click="onBackdropClick">
    <div
      class="context-menu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      @click.stop
    >
      <div
        v-for="item in items"
        :key="item.action"
        class="context-menu-item"
        :class="{ danger: item.danger }"
        @click="onItemClick(item.action)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.context-menu {
  position: absolute;
  min-width: 140px;
  background: #fff;
  border: 2px solid #000;
  box-shadow: 4px 4px 0 #000;
  padding: 4px 0;
}
.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
}
.context-menu-item:hover {
  background: #f0f0f0;
}
.context-menu-item.danger:hover {
  background: #ff4444;
  color: #fff;
}
</style>
