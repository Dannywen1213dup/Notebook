import axios from 'axios';
import type { DiaryEntry, DiaryIndex, GitHubRepoConfig } from '../types';

interface GitHubContentResponse {
  sha: string;
  content?: string;
  encoding?: string;
}

interface GitHubRepoResponse {
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
  };
}

interface GitReferenceResponse {
  object: {
    sha: string;
  };
}

interface GitCommitResponse {
  sha: string;
  tree: {
    sha: string;
  };
}

interface GitTreeResponse {
  sha: string;
}

const normalizeBasePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const buildDiaryPath = (config: GitHubRepoConfig, diaryId: string) => {
  const basePath = normalizeBasePath(config.basePath || 'data/diaries');
  return `${basePath}/${diaryId}.json`;
};

const INDEX_PATH = 'data/index.json';

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

const decodeBase64ToUtf8 = (value: string) => {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const emptyIndex = (): DiaryIndex => ({
  generatedAt: new Date().toISOString(),
  entries: [],
});

export const verifyGitHubWriteAccess = async (token: string, config: GitHubRepoConfig) => {
  const response = await axios.get<GitHubRepoResponse>(
    `https://api.github.com/repos/${config.owner}/${config.repo}`,
    {
      headers: githubHeaders(token),
    },
  );

  const permissions = response.data.permissions;
  if (!permissions?.push && !permissions?.admin && !permissions?.maintain) {
    throw new Error('当前 token 没有这个 repo 的写入权限');
  }

  return true;
};

const fetchDiaryIndexFromGitHub = async (
  token: string,
  config: GitHubRepoConfig,
): Promise<DiaryIndex> => {
  try {
    const response = await axios.get<GitHubContentResponse>(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${INDEX_PATH}`,
      {
        headers: githubHeaders(token),
        params: { ref: config.branch },
      },
    );
    if (response.data.encoding !== 'base64' || !response.data.content) return emptyIndex();
    const parsed = JSON.parse(decodeBase64ToUtf8(response.data.content)) as DiaryIndex;
    return {
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return emptyIndex();
    throw error;
  }
};

const buildNextIndex = (current: DiaryIndex, diary: DiaryEntry): DiaryIndex => {
  const entries = current.entries.filter((entry) => entry.id !== diary.id);
  entries.push(diary);
  entries.sort((a, b) => {
    const left = new Date(a.createdAt || a.date).getTime();
    const right = new Date(b.createdAt || b.date).getTime();
    return right - left;
  });
  return {
    generatedAt: new Date().toISOString(),
    entries,
  };
};

export const saveDiaryToGitHub = async (
  token: string,
  config: GitHubRepoConfig,
  diary: DiaryEntry,
) => {
  const path = buildDiaryPath(config, diary.id);
  const headers = githubHeaders(token);
  const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const refResponse = await axios.get<GitReferenceResponse>(
    `${repoUrl}/git/ref/heads/${encodeURIComponent(config.branch)}`,
    { headers },
  );
  const parentSha = refResponse.data.object.sha;
  const commitResponse = await axios.get<GitCommitResponse>(`${repoUrl}/git/commits/${parentSha}`, {
    headers,
  });
  const currentIndex = await fetchDiaryIndexFromGitHub(token, config);
  const nextIndex = buildNextIndex(currentIndex, diary);
  const treeResponse = await axios.post<GitTreeResponse>(
    `${repoUrl}/git/trees`,
    {
      base_tree: commitResponse.data.tree.sha,
      tree: [
        {
          path,
          mode: '100644',
          type: 'blob',
          content: JSON.stringify(diary, null, 2),
        },
        {
          path: INDEX_PATH,
          mode: '100644',
          type: 'blob',
          content: JSON.stringify(nextIndex, null, 2),
        },
      ],
    },
    { headers },
  );
  const nextCommitResponse = await axios.post<GitCommitResponse>(
    `${repoUrl}/git/commits`,
    {
      message: `Save diary ${diary.id}`,
      tree: treeResponse.data.sha,
      parents: [parentSha],
    },
    { headers },
  );
  const response = await axios.patch(
    `${repoUrl}/git/refs/heads/${encodeURIComponent(config.branch)}`,
    {
      sha: nextCommitResponse.data.sha,
      force: false,
    },
    { headers },
  );

  return response.data;
};

export const loadPublishedDiaryIndex = async (): Promise<DiaryIndex | null> => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const indexUrl = `${baseUrl.replace(/\/?$/, '/')}${INDEX_PATH}?v=${Date.now()}`;
  const response = await window.fetch(indexUrl, { cache: 'no-store' });
  if (!response.ok) return null;
  const parsed = (await response.json()) as DiaryIndex;
  return {
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
};
