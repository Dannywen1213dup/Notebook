import { createRouter, createWebHistory } from 'vue-router';
import AdminView from './views/AdminView.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/admin' },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/:pathMatch(.*)*', redirect: '/admin' },
  ],
});
