import axios from 'axios';
import type { DiaryEntry, GitHubRepoConfig } from '../types';

interface GitHubContentResponse {
  sha: string;
}

interface GitHubRepoResponse {
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
  };
}

const encodeUtf8ToBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

const normalizeBasePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const buildDiaryPath = (config: GitHubRepoConfig, diaryId: string) => {
  const basePath = normalizeBasePath(config.basePath || 'data/diaries');
  return `${basePath}/${diaryId}.json`;
};

export const verifyGitHubWriteAccess = async (token: string, config: GitHubRepoConfig) => {
  const response = await axios.get<GitHubRepoResponse>(
    `https://api.github.com/repos/${config.owner}/${config.repo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  const permissions = response.data.permissions;
  if (!permissions?.push && !permissions?.admin && !permissions?.maintain) {
    throw new Error('当前 token 没有这个 repo 的写入权限');
  }

  return true;
};

export const saveDiaryToGitHub = async (
  token: string,
  config: GitHubRepoConfig,
  diary: DiaryEntry,
) => {
  const path = buildDiaryPath(config, diary.id);
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let existingSha: string | undefined;
  try {
    const response = await axios.get<GitHubContentResponse>(url, {
      headers,
      params: { ref: config.branch },
    });
    existingSha = response.data.sha;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }
  }

  const content = JSON.stringify(diary, null, 2);
  const response = await axios.put(
    url,
    {
      message: `Add diary ${diary.id}`,
      content: encodeUtf8ToBase64(content),
      branch: config.branch,
      sha: existingSha,
    },
    { headers },
  );

  return response.data;
};
