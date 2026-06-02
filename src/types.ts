import type { JSONContent } from '@tiptap/vue-3';

export type Mood = 'happy' | 'normal' | 'tired' | 'sad';

export interface DiaryIpLocation {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  source: string;
  capturedAt: string;
  lookupFailed?: boolean;
  error?: string;
}

export interface DiaryMetadata {
  ipLocation?: DiaryIpLocation;
  ipLocationHistory?: DiaryIpLocation[];
}

export interface DiaryEntry {
  id: string;
  title: string;
  date: string;
  mood: Mood;
  notebookId?: string;
  notebookName?: string;
  coverImage?: string;
  location?: string;
  month?: string;
  dayOfWeek?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: DiaryMetadata;
  hasGrid?: boolean;
  deletedAt?: string;
  content: JSONContent;
}

export interface DiaryIndex {
  generatedAt: string;
  entries: DiaryEntry[];
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
}

export interface Notebook {
  id: string;
  name: string;
  path: string;
  accent: string;
  deletedAt?: string;
}
