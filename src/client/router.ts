import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/confuse',
    },
    {
      path: '/confuse',
      name: 'Confuse',
      component: () => import('./pages/ConfusePage.vue'),
    },
    {
      path: '/gallery',
      name: 'Gallery',
      component: () => import('./pages/GalleryPage.vue'),
    },
    {
      path: '/gallery/:id/detail',
      name: 'ComicDetail',
      component: () => import('./pages/ComicDetailPage.vue'),
      props: true,
    },
    {
      path: '/gallery/:id/reader',
      name: 'Reader',
      component: () => import('./pages/ReaderPage.vue'),
      props: true,
    },
  ],
})

export default router
