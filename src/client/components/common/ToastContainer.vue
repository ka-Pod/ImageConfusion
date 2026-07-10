<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <div id="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="['toast', `toast-${t.type}`]"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<style scoped>
#toast-container {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}

.toast {
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-left: 4px solid var(--border);
  background: #fff;
  color: var(--fg);
  font-size: 0.85rem;
  animation: toastIn 0.25s ease;
  pointer-events: auto;
  max-width: 360px;
}

.toast-success { border-left-color: var(--success); }
.toast-error   { border-left-color: var(--error); }
.toast-info    { border-left-color: var(--border); }
.toast-network { border-left-color: #e67e22; }
.toast-format  { border-left-color: #9b59b6; }
.toast-expired { border-left-color: #3498db; }
.toast-size    { border-left-color: #e74c3c; }
.toast-server  { border-left-color: #c0392b; }
</style>
