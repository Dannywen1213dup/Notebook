<template>
  <a-layout class="app-shell">
    <a-layout-header v-if="!isAdminRoute" class="app-header">
      <RouterLink class="brand" to="/">Notebook</RouterLink>
      <nav class="nav-links">
        <RouterLink to="/">日记</RouterLink>
        <RouterLink to="/admin">写日记</RouterLink>
      </nav>
      <div class="session-actions">
        <a-tag v-if="isLoggedIn" color="green">已登录</a-tag>
        <a-button v-if="isLoggedIn" @click="handleLogout">退出</a-button>
        <a-button v-else type="primary" @click="loginOpen = true">Login</a-button>
      </div>
    </a-layout-header>

    <a-layout-content :class="isAdminRoute ? 'admin-content' : 'app-content'">
      <RouterView />
    </a-layout-content>
  </a-layout>

  <a-modal v-model:open="loginOpen" title="GitHub Token" ok-text="登录" cancel-text="取消" @ok="handleLogin">
    <a-form layout="vertical">
      <a-form-item label="Token">
        <a-input-password
          v-model:value="tokenInput"
          placeholder="ghp_... 或 fine-grained token"
          autocomplete="off"
        />
      </a-form-item>
    </a-form>
    <p class="modal-note">Token 只保存在当前浏览器 localStorage，不会写入代码。未登录时只能查看。</p>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { isLoggedIn, logout, saveToken } from './stores/session';

const route = useRoute();
const isAdminRoute = computed(() => route.path.startsWith('/admin'));
const loginOpen = ref(false);
const tokenInput = ref('');

const handleLogin = () => {
  if (!tokenInput.value.trim()) {
    message.warning('请输入 GitHub token');
    return;
  }

  saveToken(tokenInput.value);
  tokenInput.value = '';
  loginOpen.value = false;
  message.success('已登录，可以写入 GitHub');
};

const handleLogout = () => {
  logout();
  message.info('已退出，只能查看日记');
};
</script>
