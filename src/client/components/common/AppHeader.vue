<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: '图片混淆',
  description: '基于空间填充曲线的图片混淆。仅供技术交流使用。输出 JPEG 质量 0.95。',
})

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const h1El = ref<HTMLHeadingElement>()
const titleTarget = ref('')
let scrambleTimer: ReturnType<typeof setInterval> | null = null
let titleInterval: ReturnType<typeof setInterval> | null = null

function scrambleText(target: string, duration = 600) {
  if (scrambleTimer) { clearInterval(scrambleTimer); scrambleTimer = null }
  if (!h1El.value) return
  let frame = 0
  const frames = Math.floor(duration / 50)
  scrambleTimer = setInterval(() => {
    frame++
    if (frame >= frames) {
      clearInterval(scrambleTimer!)
      scrambleTimer = null
      if (h1El.value) h1El.value.textContent = target
      return
    }
    let result = ''
    for (let ci = 0; ci < target.length; ci++) {
      result += target[ci] === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    }
    if (h1El.value) h1El.value.textContent = result
  }, 50)
}

onMounted(() => {
  if (h1El.value) {
    titleTarget.value = h1El.value.textContent || ''
    titleInterval = setInterval(() => scrambleText(titleTarget.value, 600), 8000)
  }
})

onUnmounted(() => {
  if (titleInterval) clearInterval(titleInterval)
  if (scrambleTimer) clearInterval(scrambleTimer)
})
</script>

<template>
  <div class="header">
    <div class="header-row">
      <div class="header-title">
        <h1 ref="h1El">{{ title }}</h1>
      </div>
      <div class="controls">
        <slot name="controls" />
      </div>
    </div>
    <p v-if="description" class="desc">{{ description }}</p>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-title {
  border-left: 4px solid var(--accent);
  padding-left: 1rem;
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  transition: opacity 0.4s ease;
}

.desc {
  max-width: 480px;
  margin: 0;
  padding-left: calc(1rem + 4px);
  font-size: 0.85rem;
  color: var(--muted-fg);
  line-height: 1.6;
}
</style>
