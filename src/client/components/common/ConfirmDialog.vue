<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onBackdropClick() {
  emit('cancel')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="dialog-pop">
    <div v-if="visible" class="dialog-backdrop" @click="onBackdropClick">
      <div class="dialog-box" @click.stop>
        <h3 class="dialog-title">{{ title }}</h3>
        <p class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            {{ cancelText || '取消' }}
          </button>
          <button
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="$emit('confirm')"
          >
            {{ confirmText || '确认' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(27, 27, 47, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.dialog-box {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 0 0.75rem;
}

.dialog-message {
  margin: 0 0 1.5rem;
  line-height: 1.5;
  color: var(--fg);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
