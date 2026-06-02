import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import DiaryView from './views/DiaryView.vue';
import AdminView from './views/AdminView.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/diary/:id', name: 'diary', component: DiaryView },
    { path: '/admin', name: 'admin', component: AdminView },
  ],
});
