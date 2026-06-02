<template>
  <a-layout class="app-shell">
    <a-layout-content class="admin-content">
      <RouterView />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>
