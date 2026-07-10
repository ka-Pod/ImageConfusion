<script setup lang="ts">
defineProps<{
  current: number
  total: number
  show: boolean
}>()
</script>

<template>
  <div v-if="show" id="progress-wrap" class="show">
    <div id="progress-bar">
      <div
        id="bar-fill"
        :style="{ width: total > 0 ? (current / total) * 100 + '%' : '0%' }"
      ></div>
    </div>
    <span id="progress-label">{{ current }} / {{ total }}</span>
  </div>
</template>

<style scoped>
#progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin: 6px 0;
}

#progress-wrap.show { display: flex; }

#progress-bar {
  width: 200px;
  height: 6px;
  background: var(--muted);
}

#bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}

#progress-label {
  font-size: 0.75rem;
  color: var(--muted-fg);
}
</style>
