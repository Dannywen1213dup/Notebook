const DATA_ROOT = "public/data";
const INDEX_PATH = `${DATA_ROOT}/index.json`;
const REPO_INDEX_PATH = "public/data/index.json";

const STORAGE = {
  token: "notetaker.githubToken",
  config: "notetaker.githubConfig.static.v1",
  notebooks: "notetaker.notebooks.static.v1",
  entries: "notetaker.entries.static.v1",
  draft: "notetaker.sessionDraft.static.v1",
};

const LEGACY_STORAGE = {
  notebooks: "notetaker.notebooks.v3",
  entries: "notetaker.entries.v3",
  config: "notetaker.githubConfig.v4",
};

const DEFAULT_CONFIG = {
  owner: "Dannywen1213dup",
  repo: "Notebook",
  branch: "main",
  basePath: "public/data/diaries",
};

const DEFAULT_NOTEBOOKS = [
  {
    id: "main",
    name: "Notebook",
    path: "public/data/diaries/notebook",
    accent: "#3b82f6",
  },
];

const FONT_SIZE_OPTIONS = [
  ["12px", "12"],
  ["14px", "14"],
  ["16px", "16"],
  ["18px", "18"],
  ["20px", "20"],
  ["24px", "24"],
  ["28px", "28"],
];

const CHINESE_MONTHS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

const state = {
  notebooks: [],
  entries: [],
  activeNotebookId: "main",
  deletedView: false,
  deleteNotebookMode: false,
  editing: false,
  saving: false,
  editingEntryId: "",
  selectedFontSize: "16px",
  selectedTextColor: "#374151",
  searchQuery: "",
  initialSnapshot: "",
  deploying: false,
  form: freshForm(),
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  document.execCommand?.("styleWithCSS", false, true);
  renderAppShell();
  cacheElements();
  bindEvents();

  state.notebooks = loadNotebooks();
  state.entries = loadEntries();
  render();

  await loadPublishedEntries();
  restoreDraft();
  render();
}

function renderAppShell() {
  document.getElementById("app").innerHTML = `
    <div class="diary-device">
      <aside id="sidebar" class="diary-sidebar"></aside>
      <section class="list-view">
        <header class="list-header">
          <div class="search-row">
            <button type="button" class="mobile-menu" data-action="toggle-sidebar" title="菜单">${icon("menu")}</button>
            <label class="search-shell">
              ${icon("search")}
              <input id="searchInput" type="search" placeholder="搜索当前日记本标题" autocomplete="off" />
            </label>
            <button type="button" class="inline-add" data-action="new-post" title="新增帖子">${icon("plus")}</button>
          </div>
        </header>
        <div id="notesStream" class="notes-stream"></div>
      </section>

      <section id="editView" class="edit-view">
        <header class="edit-toolbar">
          <div class="toolbar-left">
            <button type="button" data-action="close-editor" title="返回">${icon("chevron-left")}</button>
          </div>
          <div class="format-toolbar">
            <button type="button" data-action="body-image" title="添加照片">${icon("camera")}</button>
            <select id="fontSizeSelect" class="font-size-select" title="字号">
              ${FONT_SIZE_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
            <label class="color-control" title="字体颜色">
              <span id="colorChip"></span>
              <input id="textColorInput" type="color" value="#374151" />
            </label>
            <button type="button" data-action="bold" title="加粗">${icon("bold")}</button>
            <button type="button" data-action="code-block" title="代码块">${icon("code")}</button>
          </div>
          <button id="saveButton" type="button" class="save-check" data-action="save-post" title="保存">${icon("check")}</button>
        </header>

        <div class="edit-scroll">
          <div id="editDate" class="edit-date"></div>
          <div id="coverSlot"></div>
          <label class="edit-location">
            ${icon("map-pin")}
            <input id="locationInput" type="text" placeholder="添加地点..." />
          </label>
          <input
            id="titleInput"
            class="edit-title"
            type="text"
            name="note-title-${randomIdPart()}"
            maxlength="50"
            placeholder="标题..."
            autocomplete="new-password"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-autocomplete="none"
            data-form-type="other"
          />
          <div class="edit-content">
            <div id="editor" class="editable-area" contenteditable="true" data-placeholder="记录正文..."></div>
          </div>
          <div id="editMeta" class="edit-meta"></div>
        </div>
      </section>
    </div>

    <input id="coverInput" class="hidden-file" type="file" accept="image/*" />
    <input id="bodyInput" class="hidden-file" type="file" accept="image/*" />
    <div id="toast" class="app-toast" role="status"></div>
  `;
}

function cacheElements() {
  [
    "sidebar",
    "notesStream",
    "searchInput",
    "editView",
    "fontSizeSelect",
    "textColorInput",
    "colorChip",
    "saveButton",
    "editDate",
    "coverSlot",
    "locationInput",
    "titleInput",
    "editor",
    "editMeta",
    "coverInput",
    "bodyInput",
    "toast",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("dblclick", handleDblClick);
  document.addEventListener("selectionchange", updateToolbarState);

  els.searchInput.addEventListener("input", () => {
    state.searchQuery = els.searchInput.value.trim();
    renderList();
  });

  els.titleInput.addEventListener("input", updateDirtyState);
  els.titleInput.addEventListener("focus", () => {
    els.titleInput.setAttribute("autocomplete", "new-password");
    els.titleInput.setAttribute("name", `note-title-${randomIdPart()}`);
  });
  els.locationInput.addEventListener("input", updateDirtyState);
  els.editor.addEventListener("input", updateDirtyState);

  els.fontSizeSelect.addEventListener("change", () => {
    state.selectedFontSize = els.fontSizeSelect.value;
    applyFontSize(state.selectedFontSize);
  });

  els.textColorInput.addEventListener("input", () => {
    state.selectedTextColor = els.textColorInput.value;
    els.colorChip.style.backgroundColor = state.selectedTextColor;
    document.execCommand("foreColor", false, state.selectedTextColor);
    els.editor.focus();
    updateDirtyState();
  });

  els.coverInput.addEventListener("change", async () => {
    const image = await readSelectedImage(els.coverInput);
    if (!image) return;
    state.form.coverImage = image;
    renderCover();
    updateDirtyState();
  });

  els.bodyInput.addEventListener("change", async () => {
    const image = await readSelectedImage(els.bodyInput);
    if (!image) return;
    insertHtmlAtSelection(`<img src="${image}" alt="" />`);
    updateDirtyState();
  });

  window.addEventListener("beforeunload", () => {
    if (state.editing && isDirty()) saveDraft();
  });
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === "new-post") newPost();
  if (action === "select-notebook") selectNotebook(id);
  if (action === "create-notebook") createNotebook();
  if (action === "toggle-notebook-delete") toggleNotebookDeleteMode();
  if (action === "delete-notebook") deleteNotebook(id);
  if (action === "show-deleted") showDeletedView();
  if (action === "restore-notebook") restoreNotebook(id);
  if (action === "permanent-delete-notebook") permanentDeleteNotebook(id);
  if (action === "open-post") openPost(id);
  if (action === "clear-cache") clearLocalCache();
  if (action === "deploy-pages") deployPages();
  if (action === "delete-entry") {
    event.stopPropagation();
    deleteEntry(id);
  }
  if (action === "restore-entry") restoreEntry(id);
  if (action === "permanent-delete-entry") permanentDeleteEntry(id);
  if (action === "close-editor") closeEditor();
  if (action === "save-post") savePost();
  if (action === "cover-upload") els.coverInput.click();
  if (action === "remove-cover") {
    state.form.coverImage = "";
    renderCover();
    updateDirtyState();
  }
  if (action === "body-image") els.bodyInput.click();
  if (action === "bold") {
    document.execCommand("bold", false);
    els.editor.focus();
    updateDirtyState();
  }
  if (action === "code-block") toggleCodeBlock();
}

function handleDblClick(event) {
  const target = event.target.closest("[data-rename-notebook]");
  if (!target) return;
  renameNotebook(target.dataset.renameNotebook);
}

function render() {
  ensureNotebookForEntries(state.entries);
  renderSidebar();
  renderList();
  renderEditor();
}

function renderSidebar() {
  const visibleNotebooks = getVisibleNotebooks();
  const latestEntry = getVisibleEntries().sort((a, b) => latestActivityTime(b) - latestActivityTime(a))[0];
  const totalWords = getVisibleEntries().reduce((sum, entry) => sum + previewText(entry).length, 0);
  const totalDays = new Set(getVisibleEntries().map((entry) => entry.date)).size;

  els.sidebar.innerHTML = `
    <div class="sidebar-scroll">
      <div class="sidebar-brand">
        <strong>${escapeHtml(activeNotebook()?.name || "Notebook")}</strong>
        <span>${formatDateCompact(new Date())}</span>
      </div>
      <section class="analysis-tile">
        <span>数据</span>
        <div class="analysis-count">
          <strong>${getVisibleEntries().length}</strong>
          <p>${totalDays}<br />记笔记天数</p>
        </div>
        <small>${getVisibleEntries().length} 篇帖子 - 今年 <span>历年 ${totalWords} 字</span></small>
      </section>
      <section class="recent-note-tile">
        <div class="recent-note-label">${icon("file-text")} 最近笔记</div>
        ${
          latestEntry
            ? `<div class="recent-note-content">
                <strong>${escapeHtml(latestEntry.title || "无标题")}</strong>
                <span>${listTimestampLabel(latestEntry)}</span>
                <p>${escapeHtml(previewText(latestEntry) || "没有正文内容")}</p>
              </div>`
            : `<div class="recent-note-content empty"><span>暂无最近笔记</span></div>`
        }
      </section>
      <section class="notebook-nav">
        <div class="nav-title">
          <span>手记</span>
          <div class="nav-title-actions">
            <button type="button" class="${state.deleteNotebookMode ? "active" : ""}" data-action="toggle-notebook-delete" title="删除日记本">${icon("trash")}</button>
            <button type="button" data-action="create-notebook" title="新增日记本">${icon("plus")}</button>
          </div>
        </div>
        ${visibleNotebooks
          .map((notebook) => {
            const count = entriesByNotebook()[notebook.id]?.length || 0;
            return `
              <button type="button" class="nav-row ${!state.deletedView && notebook.id === state.activeNotebookId ? "active" : ""}"
                data-action="select-notebook" data-id="${escapeAttr(notebook.id)}" data-rename-notebook="${escapeAttr(notebook.id)}">
                ${icon("book")}
                <span>${escapeHtml(notebook.name)}</span>
                ${
                  state.deleteNotebookMode && notebook.id !== "all"
                    ? `<span class="nav-delete" data-action="delete-notebook" data-id="${escapeAttr(notebook.id)}">${icon("x")}</span>`
                    : `<small>${count}</small>`
                }
              </button>
            `;
          })
          .join("")}
        <button type="button" class="nav-row muted ${state.deletedView ? "active" : ""}" data-action="show-deleted">
          ${icon("trash")}
          <span>最近删除</span>
          <small>${deletedCount()}</small>
        </button>
      </section>
    </div>
    <div class="sidebar-bottom">
      <button type="button" data-action="clear-cache" title="清空本地缓存">${icon("eraser")}</button>
      <button type="button" data-action="deploy-pages" title="刷新部署到 GitHub Pages" ${state.deploying ? "disabled" : ""}>${icon("refresh")}</button>
    </div>
  `;
}

function renderList() {
  if (state.deletedView) {
    const deletedNotebooks = state.notebooks.filter((notebook) => notebook.deletedAt);
    const deletedEntries = state.entries.filter((entry) => entry.deletedAt);
    els.notesStream.innerHTML = `
      <h1 class="stream-title">最近删除</h1>
      <section class="deleted-section">
        ${
          deletedNotebooks.length || deletedEntries.length
            ? [
                ...deletedNotebooks.map(
                  (notebook) => `
                    <article class="deleted-row">
                      ${icon("book")}
                      <div><strong>${escapeHtml(notebook.name)}</strong><span>日记本 · ${escapeHtml(notebook.path)}</span></div>
                      <div class="deleted-actions">
                        <button type="button" data-action="restore-notebook" data-id="${escapeAttr(notebook.id)}">${icon("rotate")} 恢复</button>
                        <button type="button" class="danger" data-action="permanent-delete-notebook" data-id="${escapeAttr(notebook.id)}">${icon("trash")} 删除</button>
                      </div>
                    </article>
                  `,
                ),
                ...deletedEntries.map(
                  (entry) => `
                    <article class="deleted-row">
                      ${icon("file-text")}
                      <div><strong>${escapeHtml(entry.title || "无标题")}</strong><span>${listTimestampLabel(entry)}</span></div>
                      <div class="deleted-actions">
                        <button type="button" data-action="restore-entry" data-id="${escapeAttr(entry.id)}">${icon("rotate")} 恢复</button>
                        <button type="button" class="danger" data-action="permanent-delete-entry" data-id="${escapeAttr(entry.id)}">${icon("trash")} 删除</button>
                      </div>
                    </article>
                  `,
                ),
              ].join("")
            : `<div class="empty-state">没有已删除内容。</div>`
        }
      </section>
    `;
    return;
  }

  const notebook = activeNotebook();
  const entries = activeEntries().filter((entry) => {
    if (!state.searchQuery) return true;
    return (entry.title || "").toLowerCase().includes(state.searchQuery.toLowerCase());
  });

  els.notesStream.innerHTML = `
    <div class="stream-head">
      <h1>${escapeHtml(notebook?.name || "Notebook")}</h1>
    </div>
    ${
      entries.length
        ? entries.map(renderEntryCard).join("")
        : `<div class="empty-state">还没有日记，点击右上角 “+” 记录第一篇吧！</div>`
    }
  `;
}

function renderEntryCard(entry) {
  return `
    <article class="note-card" data-action="open-post" data-id="${escapeAttr(entry.id)}">
      <span class="card-month">${escapeHtml(monthLabel(entry))}</span>
      ${
        entry.coverImage
          ? `<div class="note-image"><img src="${escapeAttr(entry.coverImage)}" alt="" /></div>`
          : `<button type="button" class="empty-cover" data-action="open-post" data-id="${escapeAttr(entry.id)}"></button>`
      }
      ${
        entry.location
          ? `<div class="location-strip"><div><span>${icon("map-pin")}</span>${escapeHtml(entry.location)}</div></div>`
          : ""
      }
      <div class="note-content">
        <h3>${escapeHtml(entry.title || "无标题")}</h3>
        <p>${escapeHtml(previewText(entry))}</p>
        <footer>
          <span>${listTimestampLabel(entry)}</span>
          <button type="button" class="entry-delete" data-action="delete-entry" data-id="${escapeAttr(entry.id)}" title="删除">${icon("trash")}</button>
        </footer>
      </div>
    </article>
  `;
}

function renderEditor() {
  els.editView.classList.toggle("open", state.editing);
  if (!state.editing) return;
  els.titleInput.value = state.form.title;
  els.locationInput.value = state.form.location;
  els.fontSizeSelect.value = state.selectedFontSize;
  els.textColorInput.value = state.selectedTextColor;
  els.colorChip.style.backgroundColor = state.selectedTextColor;
  els.editDate.innerHTML = `${icon("calendar")} <span>${formatDateForList(state.form.date, state.form.dayOfWeek)}</span>`;
  renderCover();
  renderEditorMeta();
  updateDirtyState();
}

function renderCover() {
  els.coverSlot.innerHTML = state.form.coverImage
    ? `<div class="edit-image-container" data-action="cover-upload">
        <img src="${escapeAttr(state.form.coverImage)}" alt="" />
        <button type="button" data-action="remove-cover" title="移除封面">${icon("x")}</button>
      </div>`
    : `<button type="button" class="edit-cover-placeholder" data-action="cover-upload">
        ${icon("image")}
        <span>封面</span>
      </button>`;
}

function renderEditorMeta() {
  els.editMeta.innerHTML = `
    <span>创建于 ${formatTimestamp(state.form.createdAt, state.form.date)}</span>
    <span>更新于 ${formatTimestamp(state.form.updatedAt, state.form.date)}</span>
  `;
}

function newPost() {
  clearDraft();
  const now = new Date();
  state.deletedView = false;
  state.editing = true;
  state.editingEntryId = "";
  state.form = freshForm(now);
  els.editor.innerHTML = "<p><br></p>";
  state.initialSnapshot = "";
  render();
  setTimeout(() => els.titleInput.focus(), 0);
  resetSnapshot();
}

function openPost(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  clearDraft();
  state.deletedView = false;
  state.editing = true;
  state.editingEntryId = entry.id;
  state.form = {
    title: entry.title || "",
    date: entry.date || isoDate(new Date()),
    dayOfWeek: entry.dayOfWeek || weekName(entry.date || isoDate(new Date())),
    mood: entry.mood || "normal",
    coverImage: entry.coverImage || "",
    location: entry.location || "",
    createdAt: entry.createdAt || defaultTimestampForDate(entry.date),
    updatedAt: entry.updatedAt || entry.createdAt || defaultTimestampForDate(entry.date),
  };
  els.editor.innerHTML = contentToHtml(entry.content);
  render();
  resetSnapshot();
}

function closeEditor() {
  if (state.editing && isDirty() && !window.confirm("当前内容还没有保存，确认关闭？")) return;
  state.editing = false;
  state.editingEntryId = "";
  clearDraft();
  render();
}

async function savePost() {
  if (state.saving) return;
  state.form.title = els.titleInput.value.trim();
  state.form.location = els.locationInput.value.trim();
  if (!state.form.title && !plainEditorText() && !state.form.coverImage) {
    state.editing = false;
    render();
    return;
  }
  if (state.form.title.length > 50) {
    showToast("标题不能超过 50 个字");
    return;
  }

  state.saving = true;
  updateDirtyState();

  try {
    const now = new Date().toISOString();
    const existing = state.editingEntryId ? state.entries.find((entry) => entry.id === state.editingEntryId) : null;
    const active = activeNotebook() || DEFAULT_NOTEBOOKS[0];
    const payload = {
      id: state.editingEntryId || `${active.id}-${state.form.date}-${createIdSuffix(new Date())}`,
      title: state.form.title,
      date: state.form.date,
      dayOfWeek: state.form.dayOfWeek || weekName(state.form.date),
      month: monthLabel({ date: state.form.date }),
      mood: state.form.mood || "normal",
      notebookId: active.id,
      notebookName: active.name,
      coverImage: state.form.coverImage,
      location: state.form.location,
      createdAt: existing?.createdAt || state.form.createdAt || now,
      updatedAt: now,
      content: editorToJson(),
      metadata: await buildMetadata(existing),
    };

    const token = await ensureToken();
    const repoConfig = { ...loadRepoConfig(), basePath: active.path };
    await saveDiaryToGitHub(token, repoConfig, payload);

    upsertEntry(payload);
    state.form.createdAt = payload.createdAt;
    state.form.updatedAt = payload.updatedAt;
    state.editing = false;
    state.editingEntryId = "";
    clearDraft();
    render();
    showToast("已保存到 GitHub JSON");
  } catch (error) {
    saveDraft();
    showToast(`保存失败：${error.message || "未知错误"}`);
  } finally {
    state.saving = false;
    updateDirtyState();
  }
}

function selectNotebook(id) {
  state.activeNotebookId = id;
  state.deletedView = false;
  state.editing = false;
  state.deleteNotebookMode = false;
  render();
}

function createNotebook() {
  const name = window.prompt("新日记本名称", "新的日记本")?.trim();
  if (!name) return;
  const notebook = {
    id: `${slugify(name)}-${Date.now().toString().slice(-4)}`,
    name,
    path: `public/data/diaries/${slugify(name)}`,
    accent: "#f472b6",
  };
  state.notebooks = [...state.notebooks, notebook];
  state.activeNotebookId = notebook.id;
  persistNotebooks();
  render();
}

function renameNotebook(id) {
  const notebook = state.notebooks.find((item) => item.id === id);
  if (!notebook) return;
  const name = window.prompt("日记本名称", notebook.name)?.trim();
  if (!name || name === notebook.name) return;
  if (!window.confirm(`确认改名为 ${name}`)) return;
  notebook.name = name;
  notebook.path = `public/data/diaries/${slugify(name)}`;
  state.entries = state.entries.map((entry) => (entry.notebookId === id ? { ...entry, notebookName: name } : entry));
  persistNotebooks();
  persistEntries();
  render();
}

function toggleNotebookDeleteMode() {
  state.deleteNotebookMode = !state.deleteNotebookMode;
  renderSidebar();
}

function deleteNotebook(id) {
  const notebook = state.notebooks.find((item) => item.id === id);
  if (!notebook || !window.confirm(`删除 ${notebook.name}`)) return;
  notebook.deletedAt = new Date().toISOString();
  if (state.activeNotebookId === id) state.activeNotebookId = getVisibleNotebooks()[0]?.id || "main";
  state.deleteNotebookMode = false;
  persistNotebooks();
  render();
}

function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !window.confirm(`删除 ${entry.title || "无标题"}`)) return;
  entry.deletedAt = new Date().toISOString();
  persistEntries();
  render();
}

function showDeletedView() {
  state.deletedView = true;
  state.editing = false;
  state.deleteNotebookMode = false;
  render();
}

function restoreNotebook(id) {
  const notebook = state.notebooks.find((item) => item.id === id);
  if (!notebook || !window.confirm(`恢复 ${notebook.name}`)) return;
  delete notebook.deletedAt;
  state.activeNotebookId = id;
  state.deletedView = false;
  persistNotebooks();
  render();
}

function restoreEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !window.confirm(`恢复 ${entry.title || "无标题"}`)) return;
  delete entry.deletedAt;
  state.activeNotebookId = entry.notebookId || "main";
  state.deletedView = false;
  persistEntries();
  render();
}

async function permanentDeleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !window.confirm(`彻底删除 ${entry.title || "无标题"}？这个操作不能恢复。`)) return;
  try {
    const token = await ensureToken();
    await deleteEntriesFromGitHub(token, loadRepoConfig(), [entry]);
    state.entries = state.entries.filter((item) => item.id !== id);
    persistEntries();
    render();
    showToast("已彻底删除");
  } catch (error) {
    showToast(`彻底删除失败：${error.message || "未知错误"}`);
  }
}

async function permanentDeleteNotebook(id) {
  const notebook = state.notebooks.find((item) => item.id === id);
  if (!notebook || !window.confirm(`彻底删除 ${notebook.name} 和里面的笔记？这个操作不能恢复。`)) return;
  const notebookEntries = state.entries.filter((entry) => (entry.notebookId || "main") === id);
  try {
    const token = await ensureToken();
    await deleteEntriesFromGitHub(token, loadRepoConfig(), notebookEntries);
    state.entries = state.entries.filter((entry) => (entry.notebookId || "main") !== id);
    state.notebooks = state.notebooks.filter((item) => item.id !== id);
    state.activeNotebookId = getVisibleNotebooks()[0]?.id || "main";
    persistEntries();
    persistNotebooks();
    render();
    showToast("已彻底删除");
  } catch (error) {
    showToast(`彻底删除失败：${error.message || "未知错误"}`);
  }
}

function clearLocalCache() {
  if (!window.confirm("清空本地缓存？GitHub 上的 JSON 不会被删除。")) return;
  Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(STORAGE.draft);
  state.notebooks = DEFAULT_NOTEBOOKS;
  state.entries = [];
  state.activeNotebookId = "main";
  state.deletedView = false;
  state.editing = false;
  render();
  void loadPublishedEntries().then(render);
}

async function deployPages() {
  if (state.deploying) return;
  state.deploying = true;
  renderSidebar();
  try {
    const token = await ensureToken();
    const config = loadRepoConfig();
    try {
      await requestPagesBuild(token, config);
      showToast("已触发 GitHub Pages 部署");
    } catch {
      await createDeployTriggerCommit(token, config);
      showToast("已用 main 空提交触发部署");
    }
  } catch (error) {
    showToast(`部署触发失败：${error.message || "未知错误"}`);
  } finally {
    state.deploying = false;
    renderSidebar();
  }
}

function applyFontSize(size) {
  els.editor.focus();
  document.execCommand("fontSize", false, "7");
  els.editor.querySelectorAll('font[size="7"]').forEach((font) => {
    const span = document.createElement("span");
    span.style.fontSize = size;
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  updateDirtyState();
}

function toggleCodeBlock() {
  els.editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const pre = closestElement(selection.anchorNode, "pre");
  if (pre && els.editor.contains(pre)) {
    const text = pre.textContent || "";
    const fragment = document.createDocumentFragment();
    text.split("\n").forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line || "";
      if (!line) p.appendChild(document.createElement("br"));
      fragment.appendChild(p);
    });
    pre.replaceWith(fragment);
    updateDirtyState();
    return;
  }

  const range = selection.getRangeAt(0);
  const selected = selection.toString();
  const preNode = document.createElement("pre");
  const code = document.createElement("code");
  if (selected) {
    code.textContent = selected;
  } else {
    code.appendChild(document.createElement("br"));
  }
  preNode.appendChild(code);
  range.deleteContents();
  range.insertNode(preNode);
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(code);
  nextRange.collapse(false);
  selection.addRange(nextRange);
  updateDirtyState();
}

function updateToolbarState() {
  const activePre = closestElement(window.getSelection()?.anchorNode, "pre");
  document.querySelector('[data-action="code-block"]')?.classList.toggle("active", Boolean(activePre && els.editor.contains(activePre)));
}

function insertHtmlAtSelection(html) {
  els.editor.focus();
  document.execCommand("insertHTML", false, html);
}

function readSelectedImage(input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function contentToHtml(content) {
  if (!content || !Array.isArray(content.content)) return "<p><br></p>";
  return content.content.map(nodeToHtml).join("") || "<p><br></p>";
}

function nodeToHtml(node) {
  if (!node) return "";
  if (node.type === "paragraph") {
    const inner = inlineNodesToHtml(node.content || []);
    return `<p>${inner || "<br>"}</p>`;
  }
  if (node.type === "codeBlock") {
    return `<pre><code>${escapeHtml(extractText(node))}</code></pre>`;
  }
  if (node.type === "image") {
    const src = node.attrs?.src || "";
    return src ? `<img src="${escapeAttr(src)}" alt="" />` : "";
  }
  return inlineNodesToHtml(node.content || []);
}

function inlineNodesToHtml(nodes) {
  return nodes
    .map((node) => {
      if (node.type === "text") return applyMarks(escapeHtml(node.text || ""), node.marks || []);
      if (node.type === "hardBreak") return "<br>";
      if (node.type === "image") return nodeToHtml(node);
      return inlineNodesToHtml(node.content || []);
    })
    .join("");
}

function applyMarks(html, marks) {
  return marks.reduce((value, mark) => {
    if (mark.type === "bold") return `<strong>${value}</strong>`;
    if (mark.type === "textStyle") {
      const styles = [];
      if (mark.attrs?.color) styles.push(`color: ${escapeAttr(mark.attrs.color)}`);
      if (mark.attrs?.fontSize) styles.push(`font-size: ${escapeAttr(mark.attrs.fontSize)}`);
      return styles.length ? `<span style="${styles.join("; ")}">${value}</span>` : value;
    }
    return value;
  }, html);
}

function editorToJson() {
  const content = [];
  Array.from(els.editor.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      content.push({ type: "paragraph", content: [{ type: "text", text: node.textContent }] });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "pre") {
      content.push({
        type: "codeBlock",
        content: [{ type: "text", text: node.textContent.replace(/\n$/, "") }],
      });
      return;
    }
    if (tag === "img") {
      content.push({ type: "image", attrs: { src: node.getAttribute("src") || "" } });
      return;
    }
    const inline = inlineDomToJson(node.childNodes, []);
    content.push(inline.length ? { type: "paragraph", content: inline } : { type: "paragraph" });
  });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function inlineDomToJson(nodes, inheritedMarks) {
  const out = [];
  Array.from(nodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) out.push(withMarks({ type: "text", text: node.textContent }, inheritedMarks));
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      out.push({ type: "hardBreak" });
      return;
    }
    if (tag === "img") {
      out.push({ type: "image", attrs: { src: node.getAttribute("src") || "" } });
      return;
    }

    const marks = [...inheritedMarks];
    if (tag === "strong" || tag === "b" || node.style.fontWeight === "bold" || Number(node.style.fontWeight) >= 600) {
      marks.push({ type: "bold" });
    }
    const textStyle = {};
    if (node.style.color) textStyle.color = normalizeCssColor(node.style.color);
    if (node.style.fontSize) textStyle.fontSize = node.style.fontSize;
    if (Object.keys(textStyle).length) marks.push({ type: "textStyle", attrs: textStyle });
    out.push(...inlineDomToJson(node.childNodes, marks));
  });
  return out;
}

function withMarks(node, marks) {
  const unique = [];
  marks.forEach((mark) => {
    const key = `${mark.type}:${JSON.stringify(mark.attrs || {})}`;
    if (!unique.some((item) => item.key === key)) unique.push({ key, mark });
  });
  return unique.length ? { ...node, marks: unique.map((item) => item.mark) } : node;
}

function plainEditorText() {
  return els.editor.textContent.trim();
}

function loadNotebooks() {
  const stored = readJson(localStorage.getItem(STORAGE.notebooks)) || readJson(localStorage.getItem(LEGACY_STORAGE.notebooks));
  const notebooks = Array.isArray(stored) && stored.length ? stored : DEFAULT_NOTEBOOKS;
  return notebooks.map((notebook) => ({
    ...notebook,
    path: normalizeNotebookPath(notebook.path, notebook.name),
  }));
}

function loadEntries() {
  const stored = readJson(localStorage.getItem(STORAGE.entries)) || readJson(localStorage.getItem(LEGACY_STORAGE.entries));
  return normalizeEntries(Array.isArray(stored) ? stored : []);
}

async function loadPublishedEntries() {
  try {
    const response = await fetch(`${INDEX_PATH}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const index = await response.json();
    const remoteEntries = normalizeEntries(Array.isArray(index.entries) ? index.entries : []);
    state.entries = mergeEntriesById(remoteEntries, state.entries);
    ensureNotebookForEntries(state.entries);
    if (!getVisibleNotebooks().some((notebook) => notebook.id === state.activeNotebookId)) {
      state.activeNotebookId = getVisibleNotebooks()[0]?.id || "main";
    }
    persistEntries();
    persistNotebooks();
  } catch {
    // Local drafts remain available if static data cannot be reached.
  }
}

function normalizeEntries(entries) {
  return entries.map((entry) => {
    const date = entry.date || isoDate(new Date());
    const createdAt = entry.createdAt || defaultTimestampForDate(date);
    const ipLocationHistory = entry.metadata?.ipLocationHistory?.length
      ? entry.metadata.ipLocationHistory
      : entry.metadata?.ipLocation
        ? [entry.metadata.ipLocation]
        : [];
    return {
      ...entry,
      date,
      dayOfWeek: entry.dayOfWeek || weekName(date),
      createdAt,
      updatedAt: entry.updatedAt || createdAt,
      content: entry.content || { type: "doc", content: [{ type: "paragraph" }] },
      metadata: entry.metadata ? { ...entry.metadata, ipLocationHistory } : undefined,
    };
  });
}

function mergeEntriesById(primary, fallback) {
  const map = new Map();
  fallback.forEach((entry) => map.set(entry.id, entry));
  primary.forEach((entry) => map.set(entry.id, entry));
  return normalizeEntries([...map.values()]);
}

function ensureNotebookForEntries(entries) {
  const next = [...state.notebooks];
  entries.forEach((entry) => {
    const notebookId = entry.notebookId || "main";
    if (next.some((notebook) => notebook.id === notebookId)) return;
    const name = entry.notebookName || "Notebook";
    next.push({
      id: notebookId,
      name,
      path: `public/data/diaries/${slugify(name)}`,
      accent: "#3b82f6",
    });
  });
  state.notebooks = next;
}

function persistNotebooks() {
  localStorage.setItem(STORAGE.notebooks, JSON.stringify(state.notebooks));
}

function persistEntries() {
  localStorage.setItem(STORAGE.entries, JSON.stringify(state.entries));
}

function upsertEntry(entry) {
  const index = state.entries.findIndex((item) => item.id === entry.id);
  if (index >= 0) state.entries[index] = entry;
  else state.entries = [entry, ...state.entries];
  persistEntries();
}

function activeNotebook() {
  return state.notebooks.find((item) => item.id === state.activeNotebookId) || getVisibleNotebooks()[0] || DEFAULT_NOTEBOOKS[0];
}

function getVisibleNotebooks() {
  return state.notebooks.filter((notebook) => !notebook.deletedAt);
}

function getVisibleEntries() {
  return state.entries.filter((entry) => {
    const notebook = state.notebooks.find((item) => item.id === entry.notebookId);
    return !entry.deletedAt && (!notebook || !notebook.deletedAt);
  });
}

function entriesByNotebook() {
  return getVisibleEntries().reduce((grouped, entry) => {
    const notebookId = entry.notebookId || "main";
    grouped[notebookId] = grouped[notebookId] || [];
    grouped[notebookId].push(entry);
    return grouped;
  }, {});
}

function activeEntries() {
  return (entriesByNotebook()[activeNotebook()?.id] || []).sort((a, b) => timestampForSort(b) - timestampForSort(a));
}

function deletedCount() {
  return state.entries.filter((entry) => entry.deletedAt).length + state.notebooks.filter((notebook) => notebook.deletedAt).length;
}

function updateDirtyState() {
  if (!state.editing) return;
  state.form.title = els.titleInput.value;
  state.form.location = els.locationInput.value;
  els.saveButton.disabled = state.saving || !isDirty();
  if (isDirty()) saveDraft();
}

function resetSnapshot() {
  state.initialSnapshot = currentSnapshot();
  updateDirtyState();
}

function currentSnapshot() {
  return JSON.stringify({
    form: {
      ...state.form,
      title: els.titleInput?.value || state.form.title,
      location: els.locationInput?.value || state.form.location,
    },
    content: editorToJson(),
  });
}

function isDirty() {
  return state.editing && currentSnapshot() !== state.initialSnapshot;
}

function saveDraft() {
  if (!state.editing) return;
  sessionStorage.setItem(
    STORAGE.draft,
    JSON.stringify({
      activeNotebookId: state.activeNotebookId,
      editingEntryId: state.editingEntryId,
      form: {
        ...state.form,
        title: els.titleInput.value,
        location: els.locationInput.value,
      },
      content: editorToJson(),
      savedAt: new Date().toISOString(),
    }),
  );
}

function restoreDraft() {
  const draft = readJson(sessionStorage.getItem(STORAGE.draft));
  if (!draft) return;
  if (!window.confirm("检测到未保存草稿，是否恢复？")) {
    clearDraft();
    return;
  }
  state.activeNotebookId = draft.activeNotebookId || state.activeNotebookId;
  state.editingEntryId = draft.editingEntryId || "";
  state.form = { ...freshForm(), ...(draft.form || {}) };
  state.editing = true;
  els.editor.innerHTML = contentToHtml(draft.content);
  render();
  resetSnapshot();
}

function clearDraft() {
  sessionStorage.removeItem(STORAGE.draft);
}

async function ensureToken() {
  let token = localStorage.getItem(STORAGE.token) || "";
  if (!token) {
    token = window.prompt("GitHub token")?.trim() || "";
    if (!token) throw new Error("没有 GitHub token，无法写入 public/data JSON");
  }
  await verifyGitHubWriteAccess(token, loadRepoConfig());
  localStorage.setItem(STORAGE.token, token);
  return token;
}

function loadRepoConfig() {
  const stored = readJson(localStorage.getItem(STORAGE.config)) || readJson(localStorage.getItem(LEGACY_STORAGE.config));
  return { ...DEFAULT_CONFIG, ...(stored || {}) };
}

async function verifyGitHubWriteAccess(token, config) {
  const response = await githubFetch(token, `https://api.github.com/repos/${config.owner}/${config.repo}`);
  const permissions = response.permissions;
  if (!permissions?.push && !permissions?.admin && !permissions?.maintain) {
    throw new Error("当前 token 没有这个 repo 的写入权限");
  }
}

async function saveDiaryToGitHub(token, config, diary) {
  const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const diaryPath = `${trimSlashes(config.basePath || DEFAULT_CONFIG.basePath)}/${diary.id}.json`;
  const ref = await githubFetch(token, `${repoUrl}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parentSha = ref.object.sha;
  const commit = await githubFetch(token, `${repoUrl}/git/commits/${parentSha}`);
  const currentIndex = await fetchDiaryIndexFromGitHub(token, config);
  const nextIndex = buildNextIndex(currentIndex, diary);

  const tree = await githubFetch(token, `${repoUrl}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: commit.tree.sha,
      tree: [
        {
          path: diaryPath,
          mode: "100644",
          type: "blob",
          content: JSON.stringify(diary, null, 2),
        },
        {
          path: REPO_INDEX_PATH,
          mode: "100644",
          type: "blob",
          content: JSON.stringify(nextIndex, null, 2),
        },
      ],
    }),
  });

  const nextCommit = await githubFetch(token, `${repoUrl}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Save diary ${diary.id}`,
      tree: tree.sha,
      parents: [parentSha],
    }),
  });

  await githubFetch(token, `${repoUrl}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: nextCommit.sha, force: false }),
  });
}

async function deleteEntriesFromGitHub(token, config, entries) {
  const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const ref = await githubFetch(token, `${repoUrl}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parentSha = ref.object.sha;
  const commit = await githubFetch(token, `${repoUrl}/git/commits/${parentSha}`);
  const treeResponse = await githubFetch(token, `${repoUrl}/git/trees/${commit.tree.sha}?recursive=1`);
  const existingPaths = new Set((treeResponse.tree || []).map((item) => item.path));
  const removeIds = new Set(entries.map((entry) => entry.id));
  const currentIndex = await fetchDiaryIndexFromGitHub(token, config);
  const nextIndex = {
    generatedAt: new Date().toISOString(),
    entries: (currentIndex.entries || []).filter((entry) => !removeIds.has(entry.id)),
  };
  const deletionItems = entries
    .map((entry) => diaryPathForEntry(entry, config))
    .filter((path) => existingPaths.has(path))
    .map((path) => ({
      path,
      mode: "100644",
      type: "blob",
      sha: null,
    }));

  const tree = await githubFetch(token, `${repoUrl}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: commit.tree.sha,
      tree: [
        ...deletionItems,
        {
          path: REPO_INDEX_PATH,
          mode: "100644",
          type: "blob",
          content: JSON.stringify(nextIndex, null, 2),
        },
      ],
    }),
  });

  const nextCommit = await githubFetch(token, `${repoUrl}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Delete diary ${entries.map((entry) => entry.id).join(", ") || "entries"}`,
      tree: tree.sha,
      parents: [parentSha],
    }),
  });

  await githubFetch(token, `${repoUrl}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: nextCommit.sha, force: false }),
  });
}

async function requestPagesBuild(token, config) {
  return githubFetch(token, `https://api.github.com/repos/${config.owner}/${config.repo}/pages/builds`, {
    method: "POST",
  });
}

async function createDeployTriggerCommit(token, config) {
  const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const ref = await githubFetch(token, `${repoUrl}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parentSha = ref.object.sha;
  const commit = await githubFetch(token, `${repoUrl}/git/commits/${parentSha}`);
  const nextCommit = await githubFetch(token, `${repoUrl}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "Deploy GitHub Pages",
      tree: commit.tree.sha,
      parents: [parentSha],
    }),
  });
  await githubFetch(token, `${repoUrl}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: nextCommit.sha, force: false }),
  });
}

async function fetchDiaryIndexFromGitHub(token, config) {
  const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  try {
    const response = await githubFetch(
      token,
      `${repoUrl}/contents/${encodeURIComponent(REPO_INDEX_PATH).replaceAll("%2F", "/")}?ref=${encodeURIComponent(config.branch)}`,
    );
    if (response.encoding !== "base64" || !response.content) return emptyIndex();
    const parsed = JSON.parse(decodeBase64ToUtf8(response.content));
    return {
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch (error) {
    if (error.status === 404) return emptyIndex();
    throw error;
  }
}

async function githubFetch(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.message || `GitHub API 请求失败：${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function buildNextIndex(current, diary) {
  const entries = (current.entries || []).filter((entry) => entry.id !== diary.id);
  entries.push(diary);
  entries.sort((a, b) => timestampForSort(b) - timestampForSort(a));
  return { generatedAt: new Date().toISOString(), entries };
}

function emptyIndex() {
  return { generatedAt: new Date().toISOString(), entries: [] };
}

async function buildMetadata(existing) {
  const ipLocation = await fetchIpLocation();
  const previous = existing?.metadata?.ipLocationHistory || [];
  return {
    ...(existing?.metadata || {}),
    ipLocation,
    ipLocationHistory: [...previous, ipLocation],
  };
}

async function fetchIpLocation() {
  const capturedAt = new Date().toISOString();
  try {
    const response = await fetch("https://freeipapi.com/api/json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      ip: data.ipAddress,
      city: data.city,
      region: data.regionName,
      country: data.countryName,
      countryCode: data.countryCode,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timeZone,
      source: "freeipapi.com",
      capturedAt,
    };
  } catch (error) {
    return {
      source: "unavailable",
      capturedAt,
      lookupFailed: true,
      error: error.message || "IP lookup failed",
    };
  }
}

function freshForm(date = new Date()) {
  const iso = isoDate(date);
  const now = date.toISOString();
  return {
    title: "",
    date: iso,
    dayOfWeek: weekName(iso),
    mood: "normal",
    coverImage: "",
    location: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNotebookPath(path, name) {
  if (path?.startsWith("public/data/")) return path;
  if (path?.startsWith("data/")) return `public/${path}`;
  return `public/data/diaries/${slugify(name || "notebook")}`;
}

function previewText(entry) {
  return extractText(entry.content).replace(/\n{2,}/g, "\n").trim();
}

function extractText(content) {
  if (!content) return "";
  if (content.type === "text") return content.text || "";
  return (content.content || []).map(extractText).join(content.type === "doc" ? "\n" : "");
}

function formatDateForList(dateStr, dayOfWeekStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${dayOfWeekStr || weekName(dateStr)}`;
}

function formatDateCompact(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatTimestamp(timestamp, fallbackDate) {
  const date = timestamp ? new Date(timestamp) : new Date(defaultTimestampForDate(fallbackDate));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function listTimestampLabel(entry) {
  const createdAt = entry.createdAt || defaultTimestampForDate(entry.date);
  const updatedAt = entry.updatedAt || createdAt;
  return timestampsMatch(createdAt, updatedAt) ? `创建于 ${formatTimestamp(createdAt, entry.date)}` : `更新于 ${formatTimestamp(updatedAt, entry.date)}`;
}

function defaultTimestampForDate(dateStr = isoDate(new Date())) {
  return new Date(`${dateStr}T09:00:00`).toISOString();
}

function timestampsMatch(a, b) {
  if (!a || !b) return true;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 1000;
}

function timestampForSort(entry) {
  const value = new Date(entry.createdAt || defaultTimestampForDate(entry.date)).getTime();
  return Number.isFinite(value) ? value : 0;
}

function latestActivityTime(entry) {
  const value = new Date(entry.updatedAt || entry.createdAt || defaultTimestampForDate(entry.date)).getTime();
  return Number.isFinite(value) ? value : 0;
}

function monthLabel(entry) {
  const date = new Date(`${entry.date || isoDate(new Date())}T00:00:00`);
  return CHINESE_MONTHS[date.getMonth()] || `${date.getMonth() + 1}月`;
}

function weekName(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][day];
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createIdSuffix(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}${String(date.getMilliseconds()).padStart(3, "0")}-${randomIdPart()}`;
}

function randomIdPart() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues?.(bytes);
  return (bytes[0] || Math.floor(Math.random() * 0xffffffff)).toString(36).padStart(7, "0");
}

function slugify(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || `notebook-${Date.now()}`
  );
}

function normalizeCssColor(value) {
  if (!value.startsWith("rgb")) return value;
  const match = value.match(/\d+/g);
  if (!match) return value;
  return `#${match.slice(0, 3).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function closestElement(node, selector) {
  let current = node instanceof Element ? node : node?.parentElement;
  while (current) {
    if (current.matches(selector)) return current;
    current = current.parentElement;
  }
  return null;
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function diaryPathForEntry(entry, config) {
  const notebook = state.notebooks.find((item) => item.id === (entry.notebookId || "main"));
  const basePath = notebook?.path || config.basePath || DEFAULT_CONFIG.basePath;
  return `${trimSlashes(basePath)}/${entry.id}.json`;
}

function readJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeBase64ToUtf8(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function icon(name) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths = {
    "menu": '<path d="M4 6h16M4 12h16M4 18h16" />',
    "search": '<path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="7" />',
    "plus": '<path d="M12 5v14M5 12h14" />',
    "trash": '<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 16h10l1-16" />',
    "book": '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4v15.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5" />',
    "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" />',
    "x": '<path d="M18 6 6 18M6 6l12 12" />',
    "rotate": '<path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" />',
    "refresh": '<path d="M21 12a9 9 0 0 1-15.3 6.4" /><path d="M3 12A9 9 0 0 1 18.3 5.6" /><path d="M21 5v7h-7" /><path d="M3 19v-7h7" />',
    "eraser": '<path d="m7 21-4-4 10-10 4 4-8 8" /><path d="M13 7l2-2a2.8 2.8 0 0 1 4 4l-2 2" /><path d="M9 21h12" />',
    "chevron-left": '<path d="m15 18-6-6 6-6" />',
    "camera": '<path d="M14.5 4 16 7h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4l1.5-3z" /><circle cx="12" cy="14" r="4" />',
    "bold": '<path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" />',
    "code": '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /><path d="m14 4-4 16" />',
    "check": '<path d="m20 6-11 11-5-5" />',
    "calendar": '<path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" />',
    "map-pin": '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />',
    "image": '<rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />',
  };
  return `<svg class="icon" ${common}>${paths[name] || ""}</svg>`;
}
