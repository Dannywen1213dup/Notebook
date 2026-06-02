<template>
  <div class="ipad-stage">
    <div class="diary-device">
      <aside class="diary-sidebar">
        <div class="sidebar-scroll">
          <div class="sidebar-brand">
            <strong>Notebook</strong>
            <span>{{ dayjs().format('YYYY.MM.DD') }}</span>
          </div>

          <section class="analysis-tile">
            <span>数据</span>
            <div class="analysis-count">
              <strong>{{ allPostCount }}</strong>
              <p>
                <Calendar :size="13" />
                {{ totalWritingDays }}<br />
                记笔记天数
              </p>
            </div>
            <small>
              <Quote :size="13" />
              {{ currentYearPostCount }} 篇帖子 - 今年
              <span>历年 {{ totalWordCount }} 字</span>
            </small>
          </section>

          <section class="location-tile">
            <div class="location-label">
              <MapPin :size="16" />
              地点 <span>{{ uniqueIpLocationCount }}</span>
            </div>
            <div class="map-marker">
              <ShoppingBag :size="16" />
            </div>
            <small>{{ ipLocationSummaryText }}</small>
          </section>

          <section class="notebook-nav">
            <div class="nav-title">
              <span>手记</span>
              <div class="nav-title-actions">
                <button type="button" :class="{ active: deleteNotebookMode }" @click="toggleNotebookDeleteMode">
                  <Trash2 :size="20" />
                </button>
                <button type="button" @click="createNotebook">
                  <Plus :size="20" />
                </button>
              </div>
            </div>
            <button
              v-for="notebook in visibleNotebooks"
              :key="notebook.id"
              type="button"
              class="nav-row"
              :class="{ active: !deletedView && notebook.id === activeNotebookId }"
              @click="selectNotebook(notebook.id)"
              @dblclick.stop="renameNotebook(notebook)"
            >
              <component :is="notebook.icon" :size="20" :class="notebook.iconClass" />
              <span>{{ notebook.name }}</span>
              <button
                v-if="deleteNotebookMode && notebook.id !== 'all'"
                type="button"
                class="nav-delete"
                @click.stop="deleteNotebook(notebook)"
              >
                <X :size="16" />
              </button>
              <small v-else>{{ entriesByNotebook[notebook.id]?.length || 0 }}</small>
            </button>
            <button type="button" class="nav-row muted" :class="{ active: deletedView }" @click="showDeletedView">
              <Trash2 :size="20" />
              <span>最近删除</span>
              <small>{{ deletedItemCount }}</small>
            </button>
          </section>
        </div>

        <div class="sidebar-bottom">
          <button type="button" title="清空本地缓存" @click="clearLocalCache">
            <Eraser :size="20" />
          </button>
        </div>
      </aside>

      <main class="list-view">
        <header class="list-header">
          <div
            class="search-row"
            :class="{ active: searchActive }"
            @focusin="searchActive = true"
            @mouseleave="collapseSearch"
          >
            <label class="search-shell">
              <Search :size="20" />
              <input
                ref="searchInput"
                v-model="searchQuery"
                placeholder="搜索当前日记本标题"
                @focus="searchActive = true"
              />
            </label>
            <button type="button" class="inline-add" title="新增帖子" @mousedown.stop @click.stop="newPost">
              <Plus :size="20" />
            </button>
          </div>
        </header>

        <div v-if="deletedView" class="notes-stream">
          <h1 class="stream-title">最近删除</h1>
          <section class="deleted-section">
            <article v-for="notebook in deletedNotebooks" :key="notebook.id" class="deleted-row">
              <BookOpen :size="20" />
              <div>
                <strong>{{ notebook.name }}</strong>
                <span>日记本 · {{ notebook.path }}</span>
              </div>
              <button type="button" @click="restoreNotebook(notebook)">
                <RotateCcw :size="17" />
                恢复
              </button>
            </article>

            <article v-for="entry in deletedEntries" :key="entry.id" class="deleted-row">
              <FileText :size="20" />
              <div>
                <strong>{{ entry.title || '无标题' }}</strong>
                <span>帖子 · {{ formatDateForList(entry.date, entry.dayOfWeek) }}</span>
              </div>
              <button type="button" @click="restoreEntry(entry)">
                <RotateCcw :size="17" />
                恢复
              </button>
            </article>

            <div v-if="deletedItemCount === 0" class="empty-state">最近删除为空</div>
          </section>
        </div>

        <div v-else class="notes-stream">
          <div class="stream-head">
            <Menu :size="24" class="mobile-menu" />
            <h1>{{ activeNotebook.name }}</h1>
          </div>

          <template v-for="entry in sortedActiveEntries" :key="entry.id">
            <article class="note-card" @click="openPost(entry)">
              <div class="card-month">{{ monthLabel(entry) }}</div>
              <div v-if="entry.coverImage" class="note-image">
                <img :src="entry.coverImage" alt="" />
              </div>
              <button v-else type="button" class="empty-cover" @click.stop="openPost(entry)">
              </button>

              <div v-if="entry.location" class="location-strip">
                <div>
                  <span><ShoppingBag :size="13" /></span>
                  {{ entry.location }}
                </div>
              </div>

              <div class="note-content">
                <h3>{{ entry.title || '无标题' }}</h3>
                <p>{{ previewText(entry) }}</p>
                <footer>
                  <span>{{ listTimestampLabel(entry) }}</span>
                  <button type="button" class="entry-delete" @click.stop="deleteEntry(entry)">
                    <Trash2 :size="17" />
                  </button>
                </footer>
              </div>
            </article>
          </template>

          <div v-if="sortedActiveEntries.length === 0" class="empty-state">还没有日记，点击右上角 “+” 记录第一篇吧！</div>
        </div>
      </main>

      <section class="edit-view" :class="{ open: editing }">
        <header class="edit-toolbar">
          <div class="toolbar-left">
            <button type="button" @click="closeEditor"><ChevronLeft :size="25" /></button>
          </div>

          <div class="toolbar-mid">
            <button type="button" title="添加照片" @click="triggerBodyUpload"><Camera :size="20" /></button>
            <button
              type="button"
              title="加粗"
              :class="{ active: editor?.isActive('bold') }"
              @click="editor?.chain().focus().toggleBold().run()"
            >
              <Bold :size="20" />
            </button>
            <button
              type="button"
              title="代码块"
              :class="{ active: editor?.isActive('codeBlock') }"
              @click="editor?.chain().focus().toggleCodeBlock().run()"
            >
              <Code2 :size="20" />
            </button>
          </div>

          <button type="button" class="save-check" :disabled="saving || !isDirty" @click="submitDiary">
            <Check :size="21" />
          </button>
        </header>

        <div class="edit-scroll">
          <div class="edit-date">
            <Calendar :size="16" />
            <span>{{ formatDateForList(form.date, form.dayOfWeek) }}</span>
          </div>
          <div class="edit-meta">
            <span>创建于 {{ formatTimestamp(form.createdAt, form.date) }}</span>
            <span>更新于 {{ formatTimestamp(form.updatedAt, form.date) }}</span>
          </div>

          <div v-if="form.coverImage" class="edit-image-container" @click="triggerCoverUpload">
            <img :src="form.coverImage" alt="上传的图片" />
            <button type="button" @click.stop="form.coverImage = ''"><X :size="16" /></button>
          </div>
          <button v-else type="button" class="edit-cover-placeholder" @click="triggerCoverUpload">
            <Plus :size="52" />
            <span>封面</span>
          </button>

          <label class="edit-location">
            <MapPin :size="13" />
            <input v-model="form.location" placeholder="添加地点..." />
          </label>

          <input
            v-model="form.title"
            class="edit-title"
            maxlength="50"
            placeholder="标题..."
            @keydown.enter.prevent="focusEditor"
          />

          <EditorContent class="edit-content" :editor="editor" />
        </div>
      </section>
    </div>

    <input ref="coverInput" class="hidden-file" type="file" accept="image/*" @change="handleCoverUpload" />
    <input ref="bodyInput" class="hidden-file" type="file" accept="image/*" multiple @change="handleBodyUpload" />

    <a-modal
      v-model:open="loginOpen"
      title="GitHub Token"
      ok-text="登录"
      cancel-text="取消"
      centered
      :confirm-loading="authChecking"
      @ok="handleLogin"
    >
      <a-input-password v-model:value="tokenInput" placeholder="GitHub token" autocomplete="off" />
      <p class="modal-note">需要有当前 repo 写入权限，校验通过后才能编辑和保存。</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { Modal } from 'ant-design-vue';
import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import {
  BookOpen,
  Bold,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  Code2,
  Eraser,
  FileText,
  MapPin,
  Menu,
  Plus,
  Quote,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from '@lucide/vue';
import type { DiaryEntry, GitHubRepoConfig, Mood, Notebook } from '../types';
import { logout, saveRepoConfig, saveToken, session } from '../stores/session';
import { loadPublishedDiaryIndex, saveDiaryToGitHub, verifyGitHubWriteAccess } from '../services/github';
import { fetchIpLocation } from '../services/ipLocation';

type NotebookView = Notebook & {
  icon: unknown;
  iconClass: string;
};

const NOTEBOOKS_KEY = 'notetaker.notebooks.v3';
const ENTRIES_KEY = 'notetaker.entries.v3';
const DRAFT_KEY = 'notetaker.sessionDraft.v2';
const BODY_IMAGE_LIMIT = 1024 * 1024;
const COVER_IMAGE_LIMIT = 220 * 1024;
const CHINESE_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
interface SessionDraft {
  activeNotebookId: string;
  editingEntryId: string;
  idSuffix: string;
  form: {
    title: string;
    date: string;
    dayOfWeek: string;
    mood: Mood;
    coverImage: string;
    location: string;
    createdAt: string;
    updatedAt: string;
  };
  content: JSONContent;
  savedAt: string;
}

const defaultNotebooks: NotebookView[] = [
  { id: 'main', name: 'Notebook', path: 'data/diaries/notebook', accent: '#3b82f6', icon: markRaw(BookOpen), iconClass: 'blue-icon' },
];

const iconForNotebook = (notebook: Notebook): NotebookView => {
  const existing = defaultNotebooks.find((item) => item.id === notebook.id);
  return {
    ...notebook,
    icon: existing?.icon || markRaw(BookOpen),
    iconClass: existing?.iconClass || 'blue-icon',
  };
};

const loadNotebooks = (): NotebookView[] => {
  const raw = localStorage.getItem(NOTEBOOKS_KEY);
  if (!raw) return defaultNotebooks;
  try {
    const parsed = JSON.parse(raw) as Notebook[];
    return parsed.length ? parsed.map(iconForNotebook) : defaultNotebooks;
  } catch {
    return defaultNotebooks;
  }
};

const notebooks = ref<NotebookView[]>(loadNotebooks());
const activeNotebookId = ref('main');
const editing = ref(false);
const saving = ref(false);
const editingEntryId = ref('');
const idSuffix = ref(createIdSuffix());
const coverInput = ref<HTMLInputElement | null>(null);
const bodyInput = ref<HTMLInputElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const loginOpen = ref(false);
const tokenInput = ref('');
const authValidated = ref(false);
const authChecking = ref(false);
const searchQuery = ref('');
const searchActive = ref(false);
const deletedView = ref(false);
const deleteNotebookMode = ref(false);
const editorRevision = ref(0);
const initialDraftSnapshot = ref('');
const pendingAction = ref<null | (() => void | Promise<void>)>(null);
const repoConfig = reactive<GitHubRepoConfig>({ ...session.config });

const defaultEntries: DiaryEntry[] = [];

function randomIdPart() {
  const bytes = new Uint32Array(1);
  window.crypto?.getRandomValues(bytes);
  return (bytes[0] || Math.floor(Math.random() * 0xffffffff)).toString(36).padStart(7, '0');
}

function createIdSuffix(date = new Date()) {
  return `${dayjs(date).format('YYYYMMDDHHmmssSSS')}-${randomIdPart()}`;
}

const normalizeEntries = (entries: DiaryEntry[]) =>
  entries.map((entry) => {
    const createdAt = entry.createdAt || defaultTimestampForDate(entry.date);
    const ipLocationHistory = entry.metadata?.ipLocationHistory?.length
      ? entry.metadata.ipLocationHistory
      : entry.metadata?.ipLocation
        ? [entry.metadata.ipLocation]
        : [];
    const normalized = {
      ...entry,
      createdAt,
      updatedAt: entry.updatedAt || createdAt,
      metadata: entry.metadata
        ? {
            ...entry.metadata,
            ipLocationHistory,
          }
        : undefined,
    };
    return normalized;
  });

const loadEntries = () => {
  const raw = localStorage.getItem(ENTRIES_KEY);
  if (!raw) return normalizeEntries(defaultEntries);
  try {
    const parsed = JSON.parse(raw) as DiaryEntry[];
    return normalizeEntries(parsed.length ? parsed : defaultEntries);
  } catch {
    return normalizeEntries(defaultEntries);
  }
};

const sampleEntries = ref<DiaryEntry[]>(loadEntries());

const form = reactive({
  title: '',
  date: dayjs().format('YYYY-MM-DD'),
  dayOfWeek: '',
  mood: 'normal' as Mood,
  coverImage: '',
  location: '海宁银泰城 · 嘉兴市',
  createdAt: '',
  updatedAt: '',
});

const editor = useEditor({
  extensions: [StarterKit, Image.configure({ inline: false, allowBase64: true })],
  content: '<p></p>',
  onUpdate: () => {
    editorRevision.value += 1;
  },
  editorProps: {
    attributes: {
      class: 'editable-area',
    },
  },
});

const visibleNotebooks = computed(() => notebooks.value.filter((notebook) => !notebook.deletedAt));
const activeNotebook = computed(
  () => visibleNotebooks.value.find((item) => item.id === activeNotebookId.value) || visibleNotebooks.value[0] || defaultNotebooks[0],
);
const visibleEntries = computed(() =>
  sampleEntries.value.filter((entry) => {
    const notebook = notebooks.value.find((item) => item.id === entry.notebookId);
    return !entry.deletedAt && (!notebook || !notebook.deletedAt);
  }),
);

const entriesByNotebook = computed(() =>
  visibleEntries.value.reduce<Record<string, DiaryEntry[]>>((grouped, entry) => {
    const notebookId = entry.notebookId || 'all';
    grouped[notebookId] = grouped[notebookId] || [];
    grouped[notebookId].push(entry);
    grouped.all = grouped.all || [];
    grouped.all.push(entry);
    return grouped;
  }, {}),
);

const activeEntries = computed(() => entriesByNotebook.value[activeNotebook.value.id] || []);
const allPostCount = computed(() => visibleEntries.value.length);
const totalWordCount = computed(() => visibleEntries.value.reduce((sum, entry) => sum + previewText(entry).length, 0));
const totalWritingDays = computed(() => new Set(visibleEntries.value.map((entry) => entry.date)).size);
const currentYearPostCount = computed(() => {
  const year = dayjs().year();
  return visibleEntries.value.filter((entry) => dayjs(entry.date).year() === year).length;
});
const deletedItemCount = computed(
  () => sampleEntries.value.filter((entry) => entry.deletedAt).length + notebooks.value.filter((notebook) => notebook.deletedAt).length,
);
const deletedEntries = computed(() => sampleEntries.value.filter((entry) => entry.deletedAt));
const deletedNotebooks = computed(() => notebooks.value.filter((notebook) => notebook.deletedAt));
const ipLocationLogs = computed(() =>
  visibleEntries.value.flatMap((entry) => {
    const history = entry.metadata?.ipLocationHistory;
    if (history?.length) return history;
    return entry.metadata?.ipLocation ? [entry.metadata.ipLocation] : [];
  }).filter((location) => !location.lookupFailed),
);
const uniqueIpLocationCount = computed(() => {
  const keys = ipLocationLogs.value
    .map((location) => {
      if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
      }
      return [location.city, location.region, location.country].filter(Boolean).join('|');
    })
    .filter(Boolean);
  return new Set(keys).size;
});
const ipLocationSummaryText = computed(() => {
  if (!ipLocationLogs.value.length) return '等待定位';
  const latest = ipLocationLogs.value[ipLocationLogs.value.length - 1];
  const place = [latest.city, latest.region].filter(Boolean).join(' · ') || latest.country || 'IP地点';
  return `${place} · ${ipLocationLogs.value.length} 次`;
});

const sortedActiveEntries = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return [...activeEntries.value]
    .filter((entry) => {
      if (!query) return true;
      return entry.title.toLowerCase().includes(query);
    })
    .sort((a, b) => timestampForSort(b) - timestampForSort(a));
});

const diaryPayload = computed<DiaryEntry>(() => {
  void editorRevision.value;
  const date = form.date || dayjs().format('YYYY-MM-DD');
  return {
    id: editingEntryId.value || `${activeNotebook.value.id}-${date}-${idSuffix.value}`,
    title: form.title.trim(),
    date,
    dayOfWeek: form.dayOfWeek || weekName(date),
    month: chineseMonth(date),
    mood: form.mood,
    notebookId: activeNotebook.value.id,
    notebookName: activeNotebook.value.name,
    coverImage: form.coverImage,
    location: form.location.trim(),
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: form.updatedAt || form.createdAt || new Date().toISOString(),
    content: editor.value?.getJSON() || { type: 'doc', content: [] },
  };
});
const currentDraftSnapshot = computed(() => JSON.stringify(diaryPayload.value));
const isDirty = computed(() => editing.value && currentDraftSnapshot.value !== initialDraftSnapshot.value);

const showErrorModal = (title: string, content: string) => {
  Modal.error({ title, content });
};

const clearLocalCache = () => {
  if (!window.confirm('清空本地缓存？GitHub 上已经提交的数据不会删除，页面会刷新。')) return;
  Object.keys(localStorage)
    .filter((key) => key.startsWith('notetaker.'))
    .forEach((key) => localStorage.removeItem(key));
  Object.keys(sessionStorage)
    .filter((key) => key.startsWith('notetaker.'))
    .forEach((key) => sessionStorage.removeItem(key));
  window.location.reload();
};

const collapseSearch = () => {
  searchActive.value = false;
  searchInput.value?.blur();
};

const ensureAuthorized = async (action: () => void | Promise<void>) => {
  if (!session.token) {
    authValidated.value = false;
    pendingAction.value = action;
    loginOpen.value = true;
    return;
  }

  if (authValidated.value) {
    await action();
    return;
  }

  authChecking.value = true;
  try {
    await verifyGitHubWriteAccess(session.token, repoConfig);
    authValidated.value = true;
    await action();
  } catch (error) {
    authValidated.value = false;
    logout();
    const detail = error instanceof Error ? error.message : 'token 不正确或没有写入权限';
    showErrorModal('无法编辑', detail);
    pendingAction.value = action;
    loginOpen.value = true;
  } finally {
    authChecking.value = false;
  }
};

const requireLogin = (action: () => void | Promise<void>) => {
  void ensureAuthorized(action);
};

const handleLogin = async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  authChecking.value = true;
  try {
    await verifyGitHubWriteAccess(token, repoConfig);
    saveToken(token);
    authValidated.value = true;
    tokenInput.value = '';
    loginOpen.value = false;
    const action = pendingAction.value;
    pendingAction.value = null;
    if (action) {
      await nextTick();
      await action();
    }
  } catch (error) {
    authValidated.value = false;
    logout();
    const detail = error instanceof Error ? error.message : 'token 不正确或没有写入权限';
    showErrorModal('登录失败', detail);
  } finally {
    authChecking.value = false;
  }
};

const persistNotebooks = () => {
  localStorage.setItem(
    NOTEBOOKS_KEY,
    JSON.stringify(notebooks.value.map(({ icon: _icon, iconClass: _iconClass, ...notebook }) => notebook)),
  );
};

const persistEntries = () => {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(sampleEntries.value));
};

const mergeEntriesById = (primary: DiaryEntry[], fallback: DiaryEntry[]) => {
  const merged = new Map<string, DiaryEntry>();
  fallback.forEach((entry) => merged.set(entry.id, entry));
  primary.forEach((entry) => merged.set(entry.id, entry));
  return normalizeEntries([...merged.values()]);
};

const ensureNotebookForEntries = (entries: DiaryEntry[]) => {
  const nextNotebooks = [...notebooks.value];
  entries.forEach((entry) => {
    const notebookId = entry.notebookId || 'main';
    if (nextNotebooks.some((notebook) => notebook.id === notebookId)) return;
    const notebookName = entry.notebookName || 'Notebook';
    nextNotebooks.push({
      id: notebookId,
      name: notebookName,
      path: `data/diaries/${slugify(notebookName)}`,
      accent: '#3b82f6',
      icon: markRaw(BookOpen),
      iconClass: 'blue-icon',
    });
  });
  notebooks.value = nextNotebooks;
  persistNotebooks();
};

const loadPublishedEntries = async () => {
  try {
    const publishedIndex = await loadPublishedDiaryIndex();
    if (!publishedIndex) return;
    const remoteEntries = normalizeEntries(publishedIndex.entries);
    sampleEntries.value = mergeEntriesById(remoteEntries, sampleEntries.value);
    ensureNotebookForEntries(sampleEntries.value);
    if (!visibleNotebooks.value.some((notebook) => notebook.id === activeNotebookId.value)) {
      activeNotebookId.value = visibleNotebooks.value[0]?.id || 'main';
    } else if (!activeEntries.value.length && remoteEntries[0]?.notebookId) {
      activeNotebookId.value = remoteEntries[0].notebookId;
    }
    persistEntries();
  } catch {
    // Published data is a convenience sync; local/session drafts stay authoritative during failures.
  }
};

const resetDraftSnapshot = () => {
  initialDraftSnapshot.value = currentDraftSnapshot.value;
};

const saveSessionDraft = () => {
  if (!editing.value) return;
  const draft: SessionDraft = {
    activeNotebookId: activeNotebook.value.id,
    editingEntryId: editingEntryId.value,
    idSuffix: idSuffix.value,
    form: { ...form },
    content: editor.value?.getJSON() || { type: 'doc', content: [] },
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

const clearSessionDraft = () => {
  sessionStorage.removeItem(DRAFT_KEY);
};

const restoreSessionDraft = async () => {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  try {
    const draft = JSON.parse(raw) as SessionDraft;
    if (!window.confirm('检测到未提交的本地草稿，是否恢复？')) {
      clearSessionDraft();
      return;
    }

    if (visibleNotebooks.value.some((notebook) => notebook.id === draft.activeNotebookId)) {
      activeNotebookId.value = draft.activeNotebookId;
    }
    editingEntryId.value = draft.editingEntryId;
    idSuffix.value = draft.idSuffix || createIdSuffix();
    form.title = draft.form.title || '';
    form.date = draft.form.date || dayjs().format('YYYY-MM-DD');
    form.dayOfWeek = draft.form.dayOfWeek || weekName(form.date);
    form.mood = draft.form.mood || 'normal';
    form.coverImage = draft.form.coverImage || '';
    form.location = draft.form.location || '';
    form.createdAt = draft.form.createdAt || new Date().toISOString();
    form.updatedAt = draft.form.updatedAt || form.createdAt;
    editor.value?.commands.setContent(draft.content || '<p></p>');
    editing.value = true;
    await nextTick();
    initialDraftSnapshot.value = '';
  } catch {
    clearSessionDraft();
  }
};

const upsertLocalEntry = (entry: DiaryEntry) => {
  const index = sampleEntries.value.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    sampleEntries.value[index] = entry;
  } else {
    sampleEntries.value = [entry, ...sampleEntries.value];
  }
  persistEntries();
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || `notebook-${Date.now()}`;

const createNotebook = () => {
  requireLogin(() => {
    const name = window.prompt('新日记本名称', '新的日记本')?.trim();
    if (!name) return;
    const notebook: NotebookView = {
      id: `${slugify(name)}-${Date.now().toString().slice(-4)}`,
      name,
      path: `data/diaries/${slugify(name)}`,
      accent: '#f472b6',
      icon: markRaw(BookOpen),
      iconClass: 'blue-icon',
    };
    notebooks.value = [...notebooks.value, notebook];
    activeNotebookId.value = notebook.id;
    persistNotebooks();
  });
};

const renameNotebook = (targetNotebook = activeNotebook.value) => {
  requireLogin(() => {
    if (targetNotebook.id === 'all') return;
    const name = window.prompt('日记本名称', targetNotebook.name)?.trim();
    if (!name || name === targetNotebook.name) return;
    if (!window.confirm(`确认改名为 ${name}`)) return;
    notebooks.value = notebooks.value.map((item) =>
      item.id === targetNotebook.id
        ? { ...item, name, path: `data/diaries/${slugify(name)}` }
        : item,
    );
    sampleEntries.value = sampleEntries.value.map((entry) =>
      entry.notebookId === targetNotebook.id ? { ...entry, notebookName: name } : entry,
    );
    persistNotebooks();
    persistEntries();
  });
};

const toggleNotebookDeleteMode = () => {
  deleteNotebookMode.value = !deleteNotebookMode.value;
};

const deleteNotebook = (notebook: NotebookView) => {
  requireLogin(() => {
    if (notebook.id === 'all') return;
    if (!window.confirm(`删除 ${notebook.name}`)) return;
    const deletedAt = new Date().toISOString();
    notebooks.value = notebooks.value.map((item) =>
      item.id === notebook.id ? { ...item, deletedAt } : item,
    );
    if (activeNotebookId.value === notebook.id) {
      activeNotebookId.value = visibleNotebooks.value.find((item) => item.id !== notebook.id)?.id || 'all';
    }
    deleteNotebookMode.value = false;
    persistNotebooks();
  });
};

const selectNotebook = (id: string) => {
  activeNotebookId.value = id;
  deletedView.value = false;
  editing.value = false;
};

const newPost = () => {
  requireLogin(async () => {
    clearSessionDraft();
    collapseSearch();
    deletedView.value = false;
    const now = new Date().toISOString();
    editingEntryId.value = '';
    form.title = '';
    form.date = dayjs().format('YYYY-MM-DD');
    form.dayOfWeek = weekName(form.date);
    form.mood = 'normal';
    form.coverImage = '';
    form.location = '';
    form.createdAt = now;
    form.updatedAt = now;
    idSuffix.value = createIdSuffix(new Date(now));
    editor.value?.commands.setContent('<p></p>');
    editing.value = true;
    await nextTick();
    resetDraftSnapshot();
  });
};

const openPost = (entry: DiaryEntry) => {
  requireLogin(async () => {
    clearSessionDraft();
    form.title = entry.title;
    form.date = entry.date;
    form.dayOfWeek = entry.dayOfWeek || weekName(entry.date);
    form.mood = entry.mood;
    form.coverImage = entry.coverImage || '';
    form.location = entry.location || '';
    form.createdAt = entry.createdAt || defaultTimestampForDate(entry.date);
    form.updatedAt = entry.updatedAt || form.createdAt;
    editingEntryId.value = entry.id;
    editor.value?.commands.setContent(entry.content);
    editing.value = true;
    await nextTick();
    resetDraftSnapshot();
  });
};

const deleteEntry = (entry: DiaryEntry) => {
  requireLogin(() => {
    if (!window.confirm(`删除 ${entry.title || '无标题'}`)) return;
    sampleEntries.value = sampleEntries.value.map((item) =>
      item.id === entry.id ? { ...item, deletedAt: new Date().toISOString() } : item,
    );
    persistEntries();
  });
};

const showDeletedView = () => {
  deletedView.value = true;
  editing.value = false;
  deleteNotebookMode.value = false;
};

const restoreNotebook = (notebook: NotebookView) => {
  requireLogin(() => {
    if (!window.confirm(`恢复 ${notebook.name}`)) return;
    notebooks.value = notebooks.value.map((item) =>
      item.id === notebook.id ? { ...item, deletedAt: undefined } : item,
    );
    activeNotebookId.value = notebook.id;
    deletedView.value = false;
    persistNotebooks();
  });
};

const restoreEntry = (entry: DiaryEntry) => {
  requireLogin(() => {
    if (!window.confirm(`恢复 ${entry.title || '无标题'}`)) return;
    sampleEntries.value = sampleEntries.value.map((item) =>
      item.id === entry.id ? { ...item, deletedAt: undefined } : item,
    );
    activeNotebookId.value = entry.notebookId || 'all';
    deletedView.value = false;
    persistEntries();
  });
};

const closeEditor = () => {
  if (!isDirty.value) clearSessionDraft();
  editing.value = false;
};

const triggerCoverUpload = () => {
  requireLogin(() => coverInput.value?.click());
};

const triggerBodyUpload = () => {
  requireLogin(() => bodyInput.value?.click());
};

const focusEditor = () => {
  editor.value?.commands.focus('end');
};

const fileToDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const imageToCanvas = (file: File, maxWidth: number, maxPixels: number) =>
  new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const pixelScale = Math.sqrt(maxPixels / Math.max(1, img.width * img.height));
      const scale = Math.min(1, maxWidth / img.width, pixelScale);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('浏览器不支持图片压缩'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片压缩失败'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });

const shrinkCanvas = (canvas: HTMLCanvasElement, scale: number) => {
  const nextCanvas = document.createElement('canvas');
  nextCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  nextCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const context = nextCanvas.getContext('2d');
  if (!context) return canvas;
  context.drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height);
  return nextCanvas;
};

const compressImage = async (file: File, maxBytes: number, maxWidth: number, maxPixels: number) => {
  if (file.size <= maxBytes) return fileToDataUrl(file);

  let canvas = await imageToCanvas(file, maxWidth, maxPixels);
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);

  for (let attempt = 0; blob.size > maxBytes && attempt < 18; attempt += 1) {
    if (quality > 0.46) {
      quality -= 0.08;
    } else {
      canvas = shrinkCanvas(canvas, 0.84);
      quality = 0.78;
    }
    blob = await canvasToBlob(canvas, quality);
  }

  return fileToDataUrl(blob);
};

const handleCoverUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  form.coverImage = await compressImage(file, COVER_IMAGE_LIMIT, 1200, 1_200_000);
  input.value = '';
};

const handleBodyUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  for (const file of files) {
    const image = await compressImage(file, BODY_IMAGE_LIMIT, 1800, 2_200_000);
    editor.value?.chain().focus().setImage({ src: image }).run();
  }
  input.value = '';
};

const submitDiary = () => {
  requireLogin(async () => {
    if (!isDirty.value) return;
    if (!form.title.trim() && editor.value?.isEmpty && !form.coverImage) {
      editing.value = false;
      return;
    }
    if (form.title.trim().length > 50) return;

    saving.value = true;
    try {
      const now = new Date().toISOString();
      const createdAt = editingEntryId.value ? form.createdAt || now : now;
      const existingEntry = editingEntryId.value
        ? sampleEntries.value.find((entry) => entry.id === editingEntryId.value)
        : undefined;
      const ipLocation = await fetchIpLocation();
      const ipLocationHistory = [
        ...(existingEntry?.metadata?.ipLocationHistory || []),
        ipLocation,
      ];
      const payload = {
        ...diaryPayload.value,
        createdAt,
        updatedAt: now,
        metadata: {
          ...(existingEntry?.metadata || {}),
          ipLocation,
          ipLocationHistory,
        },
      };
      const config = { ...repoConfig, basePath: activeNotebook.value.path };
      saveRepoConfig(config);
      saveSessionDraft();
      await saveDiaryToGitHub(session.token, config, payload);

      form.createdAt = payload.createdAt;
      form.updatedAt = payload.updatedAt;
      upsertLocalEntry(payload);
      clearSessionDraft();
      resetDraftSnapshot();
      editing.value = false;
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      saveSessionDraft();
      showErrorModal('保存失败', `${detail}\n\n草稿已暂存在当前浏览器标签页。`);
    } finally {
      saving.value = false;
    }
  });
};

function extractText(content?: JSONContent): string {
  if (!content) return '';
  if (content.type === 'text') return content.text || '';
  return (content.content || []).map(extractText).join('\n');
}

function previewText(entry: DiaryEntry) {
  return extractText(entry.content).replace(/\n{2,}/g, '\n').trim();
}

function formatDateForList(dateStr: string, dayOfWeekStr?: string) {
  const d = dayjs(dateStr);
  const weekStr = dayOfWeekStr || weekName(dateStr);
  return `${d.month() + 1}月${d.date()}日 ${weekStr}`;
}

function defaultTimestampForDate(dateStr: string) {
  const d = dayjs(dateStr);
  if (!d.isValid()) return new Date().toISOString();
  return d.hour(9).minute(0).second(0).millisecond(0).toISOString();
}

function formatTimestamp(timestamp?: string, fallbackDate?: string) {
  const source = timestamp || (fallbackDate ? defaultTimestampForDate(fallbackDate) : '');
  if (!source) return '';
  const d = dayjs(source);
  if (!d.isValid()) return '';
  return d.format('YYYY.MM.DD HH:mm');
}

function timestampsMatch(a?: string, b?: string) {
  if (!a || !b) return true;
  return Math.abs(dayjs(a).valueOf() - dayjs(b).valueOf()) < 1000;
}

function listTimestampLabel(entry: DiaryEntry) {
  const createdAt = entry.createdAt || defaultTimestampForDate(entry.date);
  const updatedAt = entry.updatedAt || createdAt;
  if (timestampsMatch(createdAt, updatedAt)) {
    return `创建于 ${formatTimestamp(createdAt, entry.date)}`;
  }
  return `更新于 ${formatTimestamp(updatedAt, entry.date)}`;
}

function timestampForSort(entry: DiaryEntry) {
  const source = entry.createdAt || defaultTimestampForDate(entry.date);
  const value = dayjs(source).valueOf();
  return Number.isFinite(value) ? value : 0;
}

function monthLabel(entry: DiaryEntry) {
  return chineseMonth(entry.date);
}

function chineseMonth(dateStr: string) {
  const month = dayjs(dateStr).month();
  return CHINESE_MONTHS[month] || `${month + 1}月`;
}

function weekName(dateStr: string) {
  const day = dayjs(dateStr).day();
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day];
}

watch(currentDraftSnapshot, () => {
  if (editing.value && isDirty.value) saveSessionDraft();
});

onMounted(() => {
  void loadPublishedEntries().finally(() => {
    void restoreSessionDraft();
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>
