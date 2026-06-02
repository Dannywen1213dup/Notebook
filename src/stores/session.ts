import { computed, reactive } from 'vue';
import type { GitHubRepoConfig } from '../types';

const TOKEN_KEY = 'notetaker.githubToken';
const CONFIG_KEY = 'notetaker.githubConfig.v4';

const defaultConfig: GitHubRepoConfig = {
  owner: 'Dannywen1213dup',
  repo: 'Notebook',
  branch: 'main',
  basePath: 'data/diaries',
};

const loadConfig = (): GitHubRepoConfig => {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return defaultConfig;

  try {
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
};

export const session = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  config: loadConfig(),
});

export const isLoggedIn = computed(() => Boolean(session.token));

export const saveToken = (token: string) => {
  session.token = token.trim();
  localStorage.setItem(TOKEN_KEY, session.token);
};

export const logout = () => {
  session.token = '';
  localStorage.removeItem(TOKEN_KEY);
};

export const saveRepoConfig = (config: GitHubRepoConfig) => {
  session.config = {
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    branch: config.branch.trim() || 'main',
    basePath: config.basePath.trim() || 'data/diaries',
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(session.config));
};
