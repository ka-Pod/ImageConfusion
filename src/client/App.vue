<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import ToastContainer from './components/common/ToastContainer.vue'

const route = useRoute()
</script>

<template>
  <div class="app">
    <nav class="top-nav">
      <RouterLink to="/confuse" :class="{ active: route.path.startsWith('/confuse') }">
        混淆工具
      </RouterLink>
      <RouterLink to="/gallery" :class="{ active: route.path.startsWith('/gallery') }">
        漫画画廊
      </RouterLink>
    </nav>
    <main>
      <RouterView v-slot="{ Component }">
        <Transition name="route-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <ToastContainer />
  </div>
</template>

<style scoped>
.app {
  padding: 1.5rem 2rem;
}

.top-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 100;
  margin-bottom: 1.5rem;
}

.top-nav a {
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-fg);
  border-bottom: 3px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}

.top-nav a:hover {
  color: var(--fg);
}

.top-nav a.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

@media (max-width: 767px) {
  .app {
    padding: 0.75rem;
  }
}
</style>
