'use strict';
/* global api */

// ================= constants =================

const STATUSES = [
  { id: 'idea', label: 'Idea' },
  { id: 'planned', label: 'Planned' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'on-hold', label: 'On hold' },
  { id: 'done', label: 'Done' },
];
const PRIORITIES = [
  { id: 'none', label: 'None', rank: 0 },
  { id: 'low', label: 'Low', rank: 1 },
  { id: 'medium', label: 'Medium', rank: 2 },
  { id: 'high', label: 'High', rank: 3 },
  { id: 'urgent', label: 'Urgent', rank: 4 },
];
const PALETTE = ['#4f7cff', '#7c5cff', '#c04fd8', '#e5487a', '#ef5b4c', '#f08a24',
  '#e2b007', '#2fb67c', '#17a3a3', '#3aa0e8', '#7a869a', '#a0785a'];
const REMINDERS = [
  { v: null, l: 'No reminder' },
  { v: 0, l: 'At the deadline' },
  { v: 15, l: '15 minutes before' },
  { v: 60, l: '1 hour before' },
  { v: 180, l: '3 hours before' },
  { v: 1440, l: '1 day before' },
  { v: 2880, l: '2 days before' },
  { v: 10080, l: '1 week before' },
];
const VIEWS = [
  { id: 'board', label: 'Board' },
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
];
const IMG_TYPES = /^image\/(png|jpe?g|gif|webp|bmp)$/;

const ICONS = {
  board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 13 10 5 10-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  checklist: '<path d="m4 7 2 2 3-3M4 15l2 2 3-3M12 8h8M12 16h8"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};
const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ================= helpers =================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowIso = () => new Date().toISOString();
const pad = (n) => String(n).padStart(2, '0');
const imgUrl = (file) => `rmimg://img/${encodeURIComponent(file)}`;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 864e5);
const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtFull = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function fmtDue(iso) {
  const d = new Date(iso);
  const diff = dayDiff(d, new Date());
  if (diff === 0) return `Today ${fmtTime(d)}`;
  if (diff === 1) return `Tomorrow ${fmtTime(d)}`;
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${d.toLocaleDateString([], { weekday: 'short' })} ${fmtTime(d)}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

function relTime(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dueState(it) {
  if (!it.deadline || it.status === 'done') return '';
  const left = Date.parse(it.deadline) - Date.now();
  if (left < 0) return 'overdue';
  if (left < 48 * 36e5) return 'soon';
  return '';
}

function autosize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ================= state =================

let state = null;
let editingId = null;
let dragId = null;
let lightbox = null;
let ready = false;
const whenReadyQueue = [];
const whenReady = (fn) => (ready ? fn() : whenReadyQueue.push(fn));

const UI_DEFAULTS = { scope: 'all', view: 'board', showDone: true, priority: 'any', sort: { key: 'deadline', dir: 1 }, collapsed: {}, calMonth: null, lastProject: null };
const ui = { ...UI_DEFAULTS, search: '' };
try { Object.assign(ui, JSON.parse(localStorage.getItem('roadmap-ui') || '{}'), { search: '' }); } catch { /* ignore */ }
function saveUi() {
  const { search, ...rest } = ui;
  try { localStorage.setItem('roadmap-ui', JSON.stringify(rest)); } catch { /* ignore */ }
}

let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
function flush() { clearTimeout(saveTimer); saveTimer = null; api.saveState(state); }
window.addEventListener('beforeunload', () => { if (saveTimer) flush(); });

function touch(it) { it.updatedAt = nowIso(); save(); }

const catById = (id) => state.categories.find((c) => c.id === id);
const projById = (id) => state.projects.find((p) => p.id === id);
const itemById = (id) => state.items.find((i) => i.id === id);
const sortedCats = () => [...state.categories].sort((a, b) => a.order - b.order);
const projsOf = (cid) => state.projects.filter((p) => p.categoryId === cid).sort((a, b) => a.order - b.order);
const sortedProjects = () => sortedCats().flatMap((c) => projsOf(c.id));
const projColor = (p) => (p && (p.color || catById(p.categoryId)?.color)) || '#7a869a';
const itemColor = (it) => it.color || projColor(projById(it.projectId));
const prioRank = (id) => PRIORITIES.find((p) => p.id === id)?.rank ?? 0;
const byOrder = (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt);

function setStatus(it, status) {
  if (it.status === status) return;
  it.status = status;
  it.completedAt = status === 'done' ? nowIso() : null;
}

function createCategory(name, color) {
  const c = { id: uid(), name, color, order: Math.max(-1, ...state.categories.map((x) => x.order)) + 1 };
  state.categories.push(c);
  return c;
}
function createProject(categoryId, name, color = '') {
  const p = { id: uid(), categoryId, name, color, order: Math.max(-1, ...projsOf(categoryId).map((x) => x.order)) + 1 };
  state.projects.push(p);
  return p;
}

// ================= scope & filtering =================

function parseScope() {
  const s = ui.scope || 'all';
  if (s === 'all' || s === 'upcoming') return { type: s };
  const id = s.slice(2);
  if (s.startsWith('c:') && catById(id)) return { type: 'category', id, cat: catById(id) };
  if (s.startsWith('p:') && projById(id)) return { type: 'project', id, proj: projById(id) };
  ui.scope = 'all';
  return { type: 'all' };
}

function matchesSearch(it, q) {
  const p = projById(it.projectId);
  const c = p && catById(p.categoryId);
  return [it.title, it.notes, p?.name, c?.name, ...it.tags, ...it.checklist.map((x) => x.text)]
    .some((s) => s && s.toLowerCase().includes(q));
}

function baseItems(sc) {
  let items = state.items;
  if (sc.type === 'category') {
    const ids = new Set(projsOf(sc.id).map((p) => p.id));
    items = items.filter((i) => ids.has(i.projectId));
  } else if (sc.type === 'project') {
    items = items.filter((i) => i.projectId === sc.id);
  }
  const q = ui.search.trim().toLowerCase();
  if (q) items = items.filter((it) => matchesSearch(it, q));
  return items;
}

function filteredItems(sc) {
  let items = baseItems(sc);
  if (ui.priority !== 'any') items = items.filter((i) => i.priority === ui.priority);
  if (!ui.showDone) items = items.filter((i) => i.status !== 'done');
  return items;
}

const openCount = (items) => items.filter((i) => i.status !== 'done').length;

// ================= rendering: sidebar =================

function renderSidebar() {
  const overdue = state.items.filter((i) => dueState(i) === 'overdue').length;
  let h = `
    <button class="nav-item ${ui.scope === 'all' ? 'active' : ''}" data-scope="all">${icon('layers')}<span class="name">All items</span><span class="count">${openCount(state.items) || ''}</span></button>
    <button class="nav-item ${ui.scope === 'upcoming' ? 'active' : ''}" data-scope="upcoming">${icon('clock')}<span class="name">Upcoming</span>${overdue ? `<span class="count badge-danger" title="${plural(overdue, 'overdue item')}">${overdue}</span>` : ''}</button>
    <div class="section-title"><span>Categories</span><button class="icon-btn sm" id="add-cat" title="New category">${icon('plus')}</button></div>`;

  for (const c of sortedCats()) {
    const projs = projsOf(c.id);
    const ids = new Set(projs.map((p) => p.id));
    const open = !ui.collapsed[c.id];
    const n = openCount(state.items.filter((i) => ids.has(i.projectId)));
    h += `<div class="cat-group">
      <div class="nav-item cat-row ${ui.scope === 'c:' + c.id ? 'active' : ''}" data-scope="c:${c.id}" role="button" tabindex="0">
        <button class="twisty ${open ? 'open' : ''}" data-toggle="${c.id}" title="${open ? 'Collapse' : 'Expand'}">${icon('chevron')}</button>
        <span class="dot" style="background:${esc(c.color)}"></span>
        <span class="name">${esc(c.name)}</span>
        <span class="count">${n || ''}</span>
        <button class="more" data-cat-menu="${c.id}" title="Category options">${icon('more')}</button>
      </div>`;
    if (open) {
      for (const p of projs) {
        const pn = openCount(state.items.filter((i) => i.projectId === p.id));
        h += `<div class="nav-item proj-row ${ui.scope === 'p:' + p.id ? 'active' : ''}" data-scope="p:${p.id}" data-proj-drop="${p.id}" role="button" tabindex="0">
          <span class="dot sm" style="background:${esc(projColor(p))}"></span>
          <span class="name">${esc(p.name)}</span>
          <span class="count">${pn || ''}</span>
          <button class="more" data-proj-menu="${p.id}" title="Project options">${icon('more')}</button>
        </div>`;
      }
      h += `<button class="add-proj" data-add-proj="${c.id}">${icon('plus')}Add project</button>`;
    }
    h += '</div>';
  }
  if (!state.categories.length) h += '<div class="empty-side">No categories yet. Use + to add one.</div>';
  $('#nav').innerHTML = h;
}

// ================= rendering: main =================

function scopeInfo(sc) {
  switch (sc.type) {
    case 'upcoming': return { title: 'Upcoming', sub: 'Deadlines across all projects' };
    case 'category': return { title: sc.cat.name, color: sc.cat.color, sub: plural(projsOf(sc.id).length, 'project') };
    case 'project': return { title: sc.proj.name, color: projColor(sc.proj), sub: catById(sc.proj.categoryId)?.name || '' };
    default: return { title: 'All items', sub: `${plural(state.categories.length, 'category').replace('categorys', 'categories')} · ${plural(state.projects.length, 'project')}` };
  }
}

function renderTopbar(sc) {
  const info = scopeInfo(sc);
  const items = baseItems(sc.type === 'upcoming' ? { type: 'all' } : sc);
  const overdue = items.filter((i) => dueState(i) === 'overdue').length;
  const stats = ` · ${openCount(items)} open${overdue ? ` · <span class="warn-text">${overdue} overdue</span>` : ''}`;
  const filters = sc.type === 'upcoming' ? '' : `
    <div class="seg" role="tablist">${VIEWS.map((v, i) => `<button class="${ui.view === v.id ? 'on' : ''}" data-view="${v.id}" title="${v.label} (Ctrl+${i + 1})">${icon(v.id)}<span>${v.label}</span></button>`).join('')}</div>
    <select id="f-priority" class="select" title="Filter by priority">
      <option value="any">Any priority</option>
      ${PRIORITIES.map((p) => `<option value="${p.id}" ${ui.priority === p.id ? 'selected' : ''}>${p.id === 'none' ? 'No priority' : p.label}</option>`).join('')}
    </select>
    <label class="toggle" title="Show done items"><input type="checkbox" id="f-done" ${ui.showDone ? 'checked' : ''}><span>Show done</span></label>`;
  $('#topbar').innerHTML = `
    <div class="scope-title">
      ${info.color ? `<span class="dot lg" style="background:${esc(info.color)}"></span>` : ''}
      <div style="min-width:0"><h1>${esc(info.title)}</h1><div class="sub">${esc(info.sub)}${stats}</div></div>
    </div>
    <div class="top-actions">${filters}<button class="btn primary" id="new-item" title="New item (Ctrl+N)">${icon('plus')}<span class="label">New item</span></button></div>`;
}

function renderMain() {
  const sc = parseScope();
  renderTopbar(sc);
  const el = $('#content');
  const scroll = { top: el.scrollTop, left: el.scrollLeft };
  const colScroll = $$('.col-body', el).map((b) => b.scrollTop);
  let view = sc.type === 'upcoming' ? 'upcoming' : ui.view;
  if (!state.projects.length && view !== 'upcoming') {
    el.innerHTML = emptyHtml('layers', 'Start with a category and a project',
      'Categories group your projects (Work, Personal, Hobbies…). Projects hold the ideas and features you want to track.',
      `<button class="btn primary" data-empty="category">${icon('plus')}New category</button>`);
    view = 'empty';
  } else if (view === 'upcoming') el.innerHTML = upcomingHtml();
  else if (view === 'list') el.innerHTML = listHtml(sc);
  else if (view === 'calendar') el.innerHTML = calendarHtml(sc);
  else el.innerHTML = boardHtml(sc);
  el.className = 'view-' + view;
  el.scrollTop = scroll.top;
  el.scrollLeft = scroll.left;
  $$('.col-body', el).forEach((b, i) => { b.scrollTop = colScroll[i] || 0; });
}

function renderAll() {
  renderSidebar();
  renderMain();
}
const renderSoon = debounce(renderAll, 150);

function emptyHtml(ic, title, text, actions = '') {
  return `<div class="empty">${icon(ic, 'big-icon')}<h2>${esc(title)}</h2><p>${esc(text)}</p>${actions}</div>`;
}

function prioChip(it) {
  if (it.priority === 'none') return '';
  const p = PRIORITIES.find((x) => x.id === it.priority);
  return `<span class="chip prio p-${it.priority}">${icon('flag')}${p.label}</span>`;
}

function deadlineChip(it) {
  if (!it.deadline) return '';
  const st = dueState(it);
  return `<span class="chip due ${st} ${it.status === 'done' ? 'done' : ''}" title="Due ${esc(fmtFull(it.deadline))}${it.reminderMinutes != null ? ' · reminder set' : ''}">
    ${icon(st === 'overdue' ? 'clock' : 'calendar')}${st === 'overdue' ? 'Overdue · ' : ''}${esc(fmtDue(it.deadline))}${it.reminderMinutes != null ? icon('bell', 'tiny') : ''}</span>`;
}

function projChip(it) {
  const p = projById(it.projectId);
  if (!p) return '<span class="chip proj">No project</span>';
  return `<span class="chip proj" title="${esc(catById(p.categoryId)?.name || '')} › ${esc(p.name)}"><span class="dot sm" style="background:${esc(projColor(p))}"></span>${esc(p.name)}</span>`;
}

function cardHtml(it, showProject) {
  const img = it.images[0];
  const done = it.checklist.filter((c) => c.done).length;
  const meta = [
    showProject ? projChip(it) : '',
    prioChip(it),
    deadlineChip(it),
    it.checklist.length ? `<span class="chip" title="Checklist">${icon('checklist')}${done}/${it.checklist.length}</span>` : '',
    it.images.length > 1 ? `<span class="chip" title="Images">${icon('image')}${it.images.length}</span>` : '',
  ].join('');
  return `<article class="card ${it.id === editingId ? 'editing' : ''} ${it.status === 'done' ? 'is-done' : ''}" draggable="true" data-id="${it.id}" style="--c:${esc(itemColor(it))}">
    ${img ? `<div class="thumb"><img src="${imgUrl(img.file)}" alt="" loading="lazy" draggable="false"></div>` : ''}
    <div class="card-body">
      <div class="card-title">${esc(it.title.trim() || 'Untitled')}</div>
      ${it.notes.trim() ? `<div class="card-notes">${esc(it.notes.slice(0, 200))}</div>` : ''}
      ${meta.trim() ? `<div class="card-meta">${meta}</div>` : ''}
      ${it.tags.length ? `<div class="tags">${it.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    </div>
  </article>`;
}

function boardHtml(sc) {
  const items = filteredItems(sc);
  const cols = STATUSES.filter((s) => ui.showDone || s.id !== 'done');
  const showProject = sc.type !== 'project';
  return `<div class="board">${cols.map((s) => {
    const list = items.filter((i) => i.status === s.id).sort(byOrder);
    return `<section class="column s-${s.id}" data-status="${s.id}">
      <header class="col-head"><span class="sdot"></span><span>${s.label}</span><span class="count">${list.length}</span>
        <button class="icon-btn sm" data-quick-add="${s.id}" title="Add to ${s.label}">${icon('plus')}</button></header>
      <div class="col-body" data-drop="${s.id}">${list.map((i) => cardHtml(i, showProject)).join('') || '<div class="col-empty">Drop cards or images here</div>'}</div>
    </section>`;
  }).join('')}</div>`;
}

function listHtml(sc) {
  const items = filteredItems(sc);
  if (!items.length) return emptyHtml('list', 'Nothing here yet', ui.search ? 'No items match your search.' : 'Create an item with New item or Ctrl+N.');
  const { key, dir } = ui.sort;
  const getters = {
    title: (i) => i.title.toLowerCase(),
    project: (i) => (projById(i.projectId)?.name || '').toLowerCase(),
    status: (i) => STATUSES.findIndex((s) => s.id === i.status),
    priority: (i) => -prioRank(i.priority),
    deadline: (i) => (i.deadline ? Date.parse(i.deadline) : null),
    updated: (i) => -Date.parse(i.updatedAt),
  };
  const get = getters[key] || getters.deadline;
  const sorted = [...items].sort((a, b) => {
    const x = get(a), y = get(b);
    if (x === y) return 0;
    if (x === null) return 1; // items without a value always sink to the bottom
    if (y === null) return -1;
    return (x < y ? -1 : 1) * dir;
  });
  const cols = [['title', 'Title'], ['project', 'Project'], ['status', 'Status'], ['priority', 'Priority'], ['deadline', 'Deadline'], ['updated', 'Updated']];
  return `<div class="list-wrap"><table class="list">
    <thead><tr>${cols.map(([k, l]) => `<th data-sort="${k}">${l} ${key === k ? `<span class="arrow">${dir > 0 ? '↑' : '↓'}</span>` : ''}</th>`).join('')}</tr></thead>
    <tbody>${sorted.map((it) => {
      const st = STATUSES.find((s) => s.id === it.status);
      return `<tr data-open="${it.id}" class="${it.id === editingId ? 'editing' : ''} ${it.status === 'done' ? 'is-done' : ''}" style="--c:${esc(itemColor(it))}">
        <td><div class="t-title"><span class="bar"></span><span class="ttl">${esc(it.title.trim() || 'Untitled')}</span>${it.images.length ? icon('image', 'tiny') : ''}</div></td>
        <td>${projChip(it)}</td>
        <td><span class="pill s-${it.status}">${st.label}</span></td>
        <td>${prioChip(it) || '<span class="muted">—</span>'}</td>
        <td>${deadlineChip(it) || '<span class="muted">—</span>'}</td>
        <td class="muted">${relTime(it.updatedAt)}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function calendarHtml(sc) {
  const all = filteredItems(sc);
  const items = all.filter((i) => i.deadline);
  const [y, m] = (ui.calMonth || monthKey(new Date())).split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(y, m, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const byDay = {};
  for (const it of items) (byDay[dayKey(new Date(it.deadline))] ??= []).push(it);
  const today = dayKey(new Date());
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let n = 0; n < rows * 7; n++) {
    const d = new Date(y, m - 1, 1 - offset + n);
    const k = dayKey(d);
    const list = (byDay[k] || []).sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    cells += `<div class="cal-cell ${d.getMonth() !== m - 1 ? 'other' : ''} ${k === today ? 'today' : ''}" data-day="${k}" title="Click to add an item due this day">
      <div class="cal-date">${d.getDate()}</div>
      <div class="cal-items">${list.map((i) => `<div class="cal-chip ${dueState(i)} ${i.status === 'done' ? 'done' : ''}" draggable="true" data-id="${i.id}" style="--c:${esc(itemColor(i))}" title="${esc(i.title || 'Untitled')} · ${fmtTime(new Date(i.deadline))}">${esc(i.title.trim() || 'Untitled')}</div>`).join('')}</div>
    </div>`;
  }
  const undated = all.length - items.length;
  return `<div class="cal">
    <div class="cal-head">
      <button class="icon-btn" data-cal="-1" title="Previous month">${icon('left')}</button>
      <h2>${first.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
      <button class="icon-btn" data-cal="1" title="Next month">${icon('right')}</button>
      <button class="btn sm" data-cal="0">Today</button>
      <span class="muted">Click a day to add an item · drag items to reschedule</span>
    </div>
    <div class="cal-grid" style="grid-template-rows: 30px repeat(${rows}, minmax(96px, 1fr))">${cells}</div>
    ${undated ? `<div class="cal-note">${plural(undated, 'item')} without a deadline ${undated === 1 ? 'is' : 'are'} not shown.</div>` : ''}
  </div>`;
}

function upcomingHtml() {
  const items = baseItems({ type: 'all' })
    .filter((i) => i.deadline && i.status !== 'done')
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  if (!items.length) {
    return emptyHtml('clock', 'Nothing scheduled', 'Give an item a deadline and it shows up here. Reminders pop up as Windows notifications.');
  }
  const now = new Date();
  const groups = [
    { id: 'overdue', label: 'Overdue', items: [] },
    { id: 'today', label: 'Today', items: [] },
    { id: 'tomorrow', label: 'Tomorrow', items: [] },
    { id: 'week', label: 'Next 7 days', items: [] },
    { id: 'later', label: 'Later', items: [] },
  ];
  for (const it of items) {
    const d = new Date(it.deadline);
    const diff = dayDiff(d, now);
    const g = d < now ? 0 : diff === 0 ? 1 : diff === 1 ? 2 : diff < 7 ? 3 : 4;
    groups[g].items.push(it);
  }
  return `<div class="upcoming">${groups.filter((g) => g.items.length).map((g) => `
    <div class="up-group ${g.id}"><h3>${g.label}<span>${g.items.length}</span></h3>
      <div class="up-list">${g.items.map((it) => {
        const p = projById(it.projectId);
        const c = p && catById(p.categoryId);
        return `<div class="up-row" data-open="${it.id}" style="--c:${esc(itemColor(it))}">
          <button class="check" data-done="${it.id}" title="Mark done">${icon('check')}</button>
          <div class="up-main"><div class="up-title">${esc(it.title.trim() || 'Untitled')}</div>
            <div class="up-sub">${c ? `<span class="dot sm" style="background:${esc(c.color)}"></span>${esc(c.name)} › ` : ''}${esc(p?.name || 'No project')}</div></div>
          ${prioChip(it)}${deadlineChip(it)}
        </div>`;
      }).join('')}</div>
    </div>`).join('')}</div>`;
}

// ================= items =================

function ensureProjectFor(sc) {
  if (sc.type === 'project') return sc.id;
  if (sc.type === 'category') return (projsOf(sc.id)[0] || createProject(sc.id, 'General')).id;
  if (projById(ui.lastProject)) return ui.lastProject;
  const first = sortedProjects()[0];
  if (first) return first.id;
  const cat = sortedCats()[0] || createCategory('Personal', PALETTE[7]);
  return createProject(cat.id, 'General').id;
}

function newItem({ status = 'idea', deadline = null, images = [], title = '' } = {}) {
  const projectId = ensureProjectFor(parseScope());
  const sameStatus = state.items.filter((i) => i.status === status);
  const ts = nowIso();
  const it = {
    id: uid(), projectId, title, notes: '', status, priority: 'none', color: '', tags: [],
    deadline, reminderMinutes: deadline ? state.settings.defaultReminder : null,
    checklist: [], images, order: Math.min(0, ...sameStatus.map((i) => i.order)) - 1,
    createdAt: ts, updatedAt: ts, completedAt: null,
  };
  state.items.push(it);
  if (status === 'done') it.completedAt = ts;
  if (!ui.showDone && status === 'done') ui.showDone = true;
  if (ui.priority !== 'any') ui.priority = 'any';
  save();
  openEditor(it.id, { focusTitle: true });
  return it;
}

function moveCard(it, status, beforeId) {
  setStatus(it, status);
  const col = state.items.filter((i) => i.status === status && i.id !== it.id).sort(byOrder);
  let idx = beforeId ? col.findIndex((i) => i.id === beforeId) : col.length;
  if (idx < 0) idx = col.length;
  col.splice(idx, 0, it);
  col.forEach((i, n) => { i.order = n; });
  touch(it);
  renderAll();
  if (it.id === editingId) renderDrawer();
}

function reschedule(it, day) {
  const [y, m, d] = day.split('-').map(Number);
  const old = it.deadline ? new Date(it.deadline) : null;
  const next = new Date(y, m - 1, d, old ? old.getHours() : 17, old ? old.getMinutes() : 0);
  setDeadline(it, next.toISOString());
}

function setDeadline(it, iso) {
  if (iso && !it.deadline && it.reminderMinutes == null) it.reminderMinutes = state.settings.defaultReminder;
  if (!iso) it.reminderMinutes = null;
  it.deadline = iso;
  touch(it);
  renderAll();
  if (it.id === editingId) renderDrawer();
}

function markDone(it) {
  const prev = it.status;
  moveCard(it, 'done', null);
  toast(`Completed “${it.title.trim() || 'Untitled'}”`, {
    action: 'Undo',
    onAction: () => moveCard(it, prev, null),
  });
}

function deleteItem(it) {
  const idx = state.items.indexOf(it);
  if (idx < 0) return;
  state.items.splice(idx, 1);
  if (editingId === it.id) hideDrawer();
  save();
  renderAll();
  toast(`Deleted “${it.title.trim() || 'Untitled'}”`, {
    action: 'Undo',
    onAction: () => { state.items.splice(Math.min(idx, state.items.length), 0, it); save(); renderAll(); },
  });
}

// ================= images =================

const imageFiles = (list) => [...(list || [])].filter((f) => IMG_TYPES.test(f.type));

async function storeFiles(files) {
  const out = [];
  const paths = [];
  for (const f of files) {
    let p = '';
    try { p = api.pathForFile(f); } catch { /* not a disk file */ }
    if (p) { paths.push(p); continue; }
    const ext = '.' + (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const name = f.name && f.name !== 'image.png' ? f.name : `Screenshot ${new Date().toLocaleString()}`;
    const saved = await api.saveImageData(new Uint8Array(await f.arrayBuffer()), ext, name);
    if (saved) out.push(saved);
  }
  if (paths.length) out.push(...(await api.importImagePaths(paths)));
  return out;
}

function attachImages(it, imgs) {
  if (!imgs.length) return;
  it.images.push(...imgs);
  touch(it);
  renderMain();
  if (it.id === editingId) renderDrawer();
}

// ================= editor drawer =================

function openEditor(id, { focusTitle = false } = {}) {
  const it = itemById(id);
  if (!it) return;
  const prev = editingId && editingId !== id ? itemById(editingId) : null;
  editingId = id;
  if (prev) discardIfEmpty(prev);
  ui.lastProject = it.projectId;
  saveUi();
  $('#app').classList.add('drawer-open');
  renderDrawer(true);
  renderAll();
  if (focusTitle) { const t = $('#ed-title'); t.focus(); t.select(); }
}

function hideDrawer() {
  editingId = null;
  $('#drawer').hidden = true;
  $('#app').classList.remove('drawer-open');
}

function discardIfEmpty(it) {
  if (!it.title.trim() && !it.notes.trim() && !it.images.length && !it.checklist.length && !it.tags.length && !it.deadline) {
    state.items = state.items.filter((i) => i !== it);
    save();
  }
}

function closeEditor() {
  const it = itemById(editingId);
  hideDrawer();
  if (it) discardIfEmpty(it);
  renderAll();
}

function swatchesHtml(current, allowAuto, autoTitle = 'Automatic: use the project color') {
  const custom = current && !PALETTE.includes(current);
  return (allowAuto ? `<button class="swatch auto ${!current ? 'on' : ''}" data-swatch="" title="${esc(autoTitle)}">A</button>` : '')
    + PALETTE.map((c) => `<button class="swatch ${current === c ? 'on' : ''}" data-swatch="${c}" style="background:${c}" title="${c}"></button>`).join('')
    + `<label class="swatch custom ${custom ? 'on' : ''}" title="Pick any color" ${custom ? `style="background:${esc(current)}"` : ''}><input type="color" data-custom-color value="${esc(custom ? current : '#888888')}">${custom ? '' : '+'}</label>`;
}

function renderDrawer(resetScroll = false) {
  const it = itemById(editingId);
  if (!it) { hideDrawer(); return; }
  const d = $('#drawer');
  const prevScroll = resetScroll ? 0 : $('.drawer-body', d)?.scrollTop || 0;
  d.hidden = false;
  const color = itemColor(it);
  const projOptions = sortedCats().map((c) => `<optgroup label="${esc(c.name)}">${projsOf(c.id).map((p) =>
    `<option value="${p.id}" ${p.id === it.projectId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
  const done = it.checklist.filter((c) => c.done).length;

  d.innerHTML = `
    <div class="drawer-head" style="--c:${esc(color)}">
      <span class="dot" style="background:${esc(color)}"></span>
      <select id="ed-project" class="select bare" title="Move to another project">${projOptions}</select>
      <div class="spacer"></div>
      <button class="icon-btn" id="ed-delete" title="Delete item">${icon('trash')}</button>
      <button class="icon-btn" id="ed-close" title="Close (Esc)">${icon('x')}</button>
    </div>
    <div class="drawer-body">
      <textarea id="ed-title" class="title-input" rows="1" placeholder="Idea or feature…" spellcheck="true">${esc(it.title)}</textarea>
      <div class="field-grid">
        <div class="flabel">Status</div>
        <div class="status-picker">${STATUSES.map((s) => `<button class="spill s-${s.id} ${it.status === s.id ? 'on' : ''}" data-status="${s.id}">${s.label}</button>`).join('')}</div>
        <div class="flabel">Priority</div>
        <div class="prio-picker">${PRIORITIES.map((p) => `<button class="ppill p-${p.id} ${it.priority === p.id ? 'on' : ''}" data-priority="${p.id}">${p.label}</button>`).join('')}</div>
        <div class="flabel">Color</div>
        <div class="swatches" id="ed-swatches">${swatchesHtml(it.color, true)}</div>
        <div class="flabel">Deadline</div>
        <div class="deadline-row">
          <input type="datetime-local" id="ed-deadline" value="${toLocalInput(it.deadline)}">
          <div class="quick">${[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next week'], ['month', 'In a month']].map(([k, l]) => `<button class="btn xs" data-quick="${k}">${l}</button>`).join('')}
            ${it.deadline ? `<button class="btn ghost xs" data-quick="clear">Clear</button>` : ''}</div>
        </div>
        <div class="flabel">Reminder</div>
        <select id="ed-reminder" class="select" ${it.deadline ? '' : 'disabled title="Set a deadline first"'}>${REMINDERS.map((r) =>
          `<option value="${r.v ?? 'none'}" ${r.v === it.reminderMinutes ? 'selected' : ''}>${r.l}</option>`).join('')}</select>
        <div class="flabel">Tags</div>
        <div class="tags-input" id="ed-tags">${it.tags.map((t, i) => `<span class="tag">#${esc(t)}<button data-untag="${i}" title="Remove tag">${icon('x')}</button></span>`).join('')}
          <input id="ed-tag-input" placeholder="${it.tags.length ? '' : 'Add tags, press Enter'}" spellcheck="false"></div>
      </div>

      <div class="ed-section">
        <div class="ed-section-title">Notes</div>
        <textarea id="ed-notes" class="notes" placeholder="Details, links, thoughts, how it should work…">${esc(it.notes)}</textarea>
      </div>

      <div class="ed-section">
        <div class="ed-section-title">Checklist ${it.checklist.length ? `<span>${done}/${it.checklist.length}</span>` : ''}</div>
        ${it.checklist.length ? `<div class="progress"><span style="width:${(done / it.checklist.length) * 100}%"></span></div>` : ''}
        <ul class="checklist">${it.checklist.map((c) => `<li data-cid="${c.id}" class="${c.done ? 'done' : ''}">
          <input type="checkbox" data-ccheck ${c.done ? 'checked' : ''}>
          <input class="ctext" data-ctext value="${esc(c.text)}">
          <button class="icon-btn xs" data-cdel title="Remove step">${icon('x')}</button></li>`).join('')}</ul>
        <input id="ed-check-add" class="input" placeholder="Add a step and press Enter">
      </div>

      <div class="ed-section">
        <div class="ed-section-title">Images ${it.images.length ? `<span>${it.images.length}</span>` : ''}</div>
        ${it.images.length ? `<div class="img-grid">${it.images.map((im, i) => `<figure class="img-thumb" data-img="${i}" title="${esc(im.name)}">
          <img src="${imgUrl(im.file)}" alt="${esc(im.name)}" draggable="false">
          <button class="img-del" data-img-del="${i}" title="Remove image">${icon('x')}</button></figure>`).join('')}</div>` : ''}
        <div class="dropzone" id="ed-drop">${icon('image')}
          <div>Paste a screenshot with <kbd>Ctrl</kbd> + <kbd>V</kbd> or drop image files here</div>
          <div class="dz-actions"><button class="btn sm" id="ed-browse">Browse…</button><button class="btn sm" id="ed-clip">${icon('paste')}Paste from clipboard</button></div>
          <div class="small">Tip: <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> captures part of your screen.</div>
        </div>
      </div>

      <div class="ed-foot muted">Created ${fmtFull(it.createdAt)} · Updated ${relTime(it.updatedAt)}${it.completedAt ? ` · Completed ${fmtFull(it.completedAt)}` : ''}</div>
    </div>`;
  autosize($('#ed-title'));
  autosize($('#ed-notes'));
  $('.drawer-body', d).scrollTop = prevScroll;
}

function quickDeadline(kind) {
  const d = new Date();
  if (kind === 'today') {
    d.setHours(17, 0, 0, 0);
    if (d < new Date()) { const n = new Date(); n.setMinutes(0, 0, 0); n.setHours(n.getHours() + 2); return n; }
  } else if (kind === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
  else if (kind === 'week') { d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); }
  else if (kind === 'month') { d.setMonth(d.getMonth() + 1); d.setHours(9, 0, 0, 0); }
  return d;
}

function bindDrawer() {
  const d = $('#drawer');
  const cur = () => itemById(editingId);

  d.addEventListener('click', async (e) => {
    const it = cur();
    if (!it) return;
    const t = e.target;
    if (t.closest('#ed-close')) return closeEditor();
    if (t.closest('#ed-delete')) return deleteItem(it);
    const s = t.closest('[data-status]');
    if (s) { setStatus(it, s.dataset.status); touch(it); renderDrawer(); renderAll(); return; }
    const p = t.closest('[data-priority]');
    if (p) { it.priority = p.dataset.priority; touch(it); renderDrawer(); renderAll(); return; }
    const sw = t.closest('[data-swatch]');
    if (sw) { it.color = sw.dataset.swatch; touch(it); renderDrawer(); renderAll(); return; }
    const q = t.closest('[data-quick]');
    if (q) { setDeadline(it, q.dataset.quick === 'clear' ? null : quickDeadline(q.dataset.quick).toISOString()); return; }
    const ut = t.closest('[data-untag]');
    if (ut) { it.tags.splice(+ut.dataset.untag, 1); touch(it); renderDrawer(); renderAll(); $('#ed-tag-input').focus(); return; }
    if (t.closest('[data-cdel]')) {
      const id = t.closest('li').dataset.cid;
      it.checklist = it.checklist.filter((c) => c.id !== id);
      touch(it); renderDrawer(); renderAll(); return;
    }
    const del = t.closest('[data-img-del]');
    if (del) {
      const [removed] = it.images.splice(+del.dataset.imgDel, 1);
      touch(it); renderDrawer(); renderMain();
      toast('Image removed', { action: 'Undo', onAction: () => attachImages(it, [removed]) });
      return;
    }
    const th = t.closest('[data-img]');
    if (th) return openLightbox(it.id, +th.dataset.img);
    if (t.closest('#ed-browse')) return attachImages(it, await api.pickImages());
    if (t.closest('#ed-clip')) {
      const img = await api.pasteClipboardImage();
      if (img) attachImages(it, [img]); else toast('There is no image on the clipboard.');
    }
    if (t.closest('.tags-input') && t === $('#ed-tags')) $('#ed-tag-input').focus();
  });

  d.addEventListener('input', (e) => {
    const it = cur();
    if (!it) return;
    const t = e.target;
    if (t.id === 'ed-title') { it.title = t.value.replace(/\n/g, ' '); autosize(t); touch(it); renderSoon(); }
    else if (t.id === 'ed-notes') { it.notes = t.value; autosize(t); touch(it); renderSoon(); }
    else if (t.matches('[data-ctext]')) {
      const c = it.checklist.find((x) => x.id === t.closest('li').dataset.cid);
      if (c) { c.text = t.value; touch(it); }
    } else if (t.matches('[data-custom-color]')) {
      it.color = t.value;
      const label = t.parentElement;
      label.style.background = t.value;
      $$('.swatch', d).forEach((x) => x.classList.toggle('on', x === label));
      $('.drawer-head', d).style.setProperty('--c', t.value);
      touch(it); renderSoon();
    }
  });

  d.addEventListener('change', (e) => {
    const it = cur();
    if (!it) return;
    const t = e.target;
    if (t.id === 'ed-project') { it.projectId = t.value; ui.lastProject = t.value; saveUi(); touch(it); renderDrawer(); renderAll(); }
    else if (t.id === 'ed-deadline') setDeadline(it, t.value ? new Date(t.value).toISOString() : null);
    else if (t.id === 'ed-reminder') { it.reminderMinutes = t.value === 'none' ? null : Number(t.value); touch(it); renderAll(); }
    else if (t.matches('[data-ccheck]')) {
      const c = it.checklist.find((x) => x.id === t.closest('li').dataset.cid);
      if (c) { c.done = t.checked; touch(it); renderDrawer(); renderAll(); }
    } else if (t.matches('[data-custom-color]')) renderDrawer();
  });

  d.addEventListener('keydown', (e) => {
    const it = cur();
    if (!it) return;
    const t = e.target;
    if (t.id === 'ed-title' && e.key === 'Enter') { e.preventDefault(); $('#ed-notes').focus(); }
    else if (t.id === 'ed-tag-input') {
      if ((e.key === 'Enter' || e.key === ',') && t.value.trim()) {
        e.preventDefault();
        const tag = t.value.trim().replace(/^#/, '').replace(/,/g, '');
        if (tag && !it.tags.includes(tag)) it.tags.push(tag);
        touch(it); renderDrawer(); renderAll(); $('#ed-tag-input').focus();
      } else if (e.key === 'Backspace' && !t.value && it.tags.length) {
        it.tags.pop(); touch(it); renderDrawer(); renderAll(); $('#ed-tag-input').focus();
      }
    } else if (t.id === 'ed-check-add' && e.key === 'Enter' && t.value.trim()) {
      it.checklist.push({ id: uid(), text: t.value.trim(), done: false });
      touch(it); renderDrawer(); renderAll(); $('#ed-check-add').focus();
    } else if (t.matches('[data-ctext]') && e.key === 'Enter') { t.blur(); renderAll(); }
  });

  d.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    d.classList.add('drop-target');
  });
  d.addEventListener('dragleave', (e) => { if (!d.contains(e.relatedTarget)) d.classList.remove('drop-target'); });
  d.addEventListener('drop', async (e) => {
    d.classList.remove('drop-target');
    const files = imageFiles(e.dataTransfer.files);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    const it = cur();
    if (it) attachImages(it, await storeFiles(files));
  });
}

// ================= lightbox =================

function openLightbox(itemId, index) {
  lightbox = { itemId, index };
  renderLightbox();
}
function closeLightbox() { lightbox = null; $('#lightbox').hidden = true; $('#lightbox').innerHTML = ''; }
function renderLightbox() {
  const it = itemById(lightbox?.itemId);
  if (!it || !it.images.length) return closeLightbox();
  lightbox.index = (lightbox.index + it.images.length) % it.images.length;
  const im = it.images[lightbox.index];
  const many = it.images.length > 1;
  const el = $('#lightbox');
  el.hidden = false;
  el.innerHTML = `
    <div class="lb-bar"><span>${esc(it.title || 'Untitled')} — ${esc(im.name)}${many ? ` (${lightbox.index + 1} of ${it.images.length})` : ''}</span>
      <div class="spacer"></div>
      <button class="icon-btn" data-lb="open" title="Open in your image viewer">${icon('external')}</button>
      <button class="icon-btn" data-lb="close" title="Close (Esc)">${icon('x')}</button></div>
    <div class="lb-stage" data-lb="backdrop">
      ${many ? `<button class="lb-nav prev" data-lb="prev" title="Previous (←)">${icon('left')}</button>` : ''}
      <img src="${imgUrl(im.file)}" alt="${esc(im.name)}">
      ${many ? `<button class="lb-nav next" data-lb="next" title="Next (→)">${icon('right')}</button>` : ''}
    </div>`;
}
$('#lightbox').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lb]');
  if (!b || !lightbox) return;
  const it = itemById(lightbox.itemId);
  const act = b.dataset.lb;
  if (act === 'close' || (act === 'backdrop' && e.target === b)) closeLightbox();
  else if (act === 'prev') { lightbox.index--; renderLightbox(); }
  else if (act === 'next') { lightbox.index++; renderLightbox(); }
  else if (act === 'open') api.openImage(it.images[lightbox.index].file);
});

// ================= modals, menus, toasts =================

function openModal({ title, body, actions = [], onMount, wide = false }) {
  closeMenu();
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-modal-close title="Close">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>
    ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-action="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
  </div></div>`;
  const m = root.firstElementChild;
  let downOnBackdrop = false;
  m.addEventListener('mousedown', (e) => { downOnBackdrop = e.target === m; });
  m.addEventListener('click', (e) => {
    if ((e.target === m && downOnBackdrop) || e.target.closest('[data-modal-close]')) return closeModal();
    const b = e.target.closest('[data-action]');
    if (b) {
      const a = actions[+b.dataset.action];
      if (a.onClick?.(m) !== false) closeModal();
    }
  });
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=color])')) {
      e.preventDefault();
      $$('[data-action]', m).pop()?.click();
    }
  });
  onMount?.(m);
  return m;
}
function closeModal() { $('#modal-root').innerHTML = ''; }

function confirmDialog(title, message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p>${esc(message)}</p>`,
      actions: [{ label: 'Cancel', onClick: () => resolve(false) }, { label: okLabel, kind: 'danger', onClick: () => resolve(true) }],
    });
  });
}

let menuCleanup = null;
function openMenu(anchor, items) {
  closeMenu();
  const el = document.createElement('div');
  el.className = 'menu';
  el.innerHTML = items.map((it, i) => (it === '-' ? '<div class="menu-sep"></div>'
    : `<button class="menu-item ${it.danger ? 'danger' : ''}" data-mi="${i}">${it.icon ? icon(it.icon) : ''}${esc(it.label)}</button>`)).join('');
  $('#menu-root').appendChild(el);
  const r = anchor.getBoundingClientRect();
  const left = Math.min(r.left, innerWidth - el.offsetWidth - 8);
  let top = r.bottom + 4;
  if (top + el.offsetHeight > innerHeight - 8) top = r.top - el.offsetHeight - 4;
  el.style.left = Math.max(8, left) + 'px';
  el.style.top = Math.max(8, top) + 'px';
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mi]');
    if (!b) return;
    closeMenu();
    items[+b.dataset.mi].onClick();
  });
  const outside = (e) => { if (!el.contains(e.target)) closeMenu(); };
  setTimeout(() => document.addEventListener('mousedown', outside), 0);
  menuCleanup = () => document.removeEventListener('mousedown', outside);
}
function closeMenu() { menuCleanup?.(); menuCleanup = null; $('#menu-root').innerHTML = ''; }

function toast(msg, { action, onAction, timeout = 5500 } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="btn xs">${esc(action)}</button>` : ''}`;
  $('#toast-root').appendChild(el);
  const t = setTimeout(() => el.remove(), timeout);
  if (action) el.querySelector('button').onclick = () => { clearTimeout(t); el.remove(); onAction(); };
  while ($('#toast-root').children.length > 3) $('#toast-root').firstElementChild.remove();
}

// ================= categories & projects =================

function entityModal({ kind, entity = null, categoryId = null }) {
  const isProj = kind === 'project';
  let color = entity ? entity.color : isProj ? '' : PALETTE[(state.categories.length * 5 + 2) % PALETTE.length];
  const catId = entity?.categoryId || categoryId || sortedCats()[0]?.id;
  const body = `
    <label class="field"><span>Name</span><input class="input" id="m-name" value="${esc(entity?.name || '')}" placeholder="${isProj ? 'e.g. Website redesign' : 'e.g. Side projects'}" maxlength="80"></label>
    ${isProj ? `<label class="field"><span>Category</span><select class="select" id="m-cat">${sortedCats().map((c) => `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    <div class="field"><span>Color</span><div class="swatches" id="m-swatches">${swatchesHtml(color, isProj, 'Automatic: use the category color')}</div></div>`;
  openModal({
    title: entity ? `Edit ${kind}` : `New ${kind}`,
    body,
    actions: [
      { label: 'Cancel' },
      {
        label: entity ? 'Save' : 'Create',
        kind: 'primary',
        onClick: (m) => {
          const input = $('#m-name', m);
          const name = input.value.trim();
          if (!name) { input.classList.add('invalid'); input.focus(); return false; }
          if (entity) {
            entity.name = name;
            entity.color = color;
            if (isProj) entity.categoryId = $('#m-cat', m).value;
          } else if (isProj) {
            const p = createProject($('#m-cat', m).value, name, color);
            ui.collapsed[p.categoryId] = false;
            ui.scope = 'p:' + p.id;
          } else {
            const c = createCategory(name, color);
            ui.scope = 'c:' + c.id;
          }
          saveUi();
          save();
          renderAll();
          if (editingId) renderDrawer();
          return true;
        },
      },
    ],
    onMount: (m) => {
      const input = $('#m-name', m);
      input.focus();
      input.select();
      m.addEventListener('click', (e) => {
        const s = e.target.closest('[data-swatch]');
        if (s) { color = s.dataset.swatch; $('#m-swatches', m).innerHTML = swatchesHtml(color, isProj, 'Automatic: use the category color'); }
      });
      m.addEventListener('input', (e) => {
        if (!e.target.matches('[data-custom-color]')) return;
        color = e.target.value;
        const label = e.target.parentElement;
        label.style.background = color;
        $$('.swatch', m).forEach((x) => x.classList.toggle('on', x === label));
      });
    },
  });
}

function moveEntity(list, entity, delta) {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const i = sorted.indexOf(entity);
  const j = i + delta;
  if (j < 0 || j >= sorted.length) return;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  sorted.forEach((x, n) => { x.order = n; });
  save();
  renderAll();
}

function categoryMenu(anchor, c) {
  openMenu(anchor, [
    { label: 'Edit category…', icon: 'edit', onClick: () => entityModal({ kind: 'category', entity: c }) },
    { label: 'Add project…', icon: 'plus', onClick: () => entityModal({ kind: 'project', categoryId: c.id }) },
    { label: 'Move up', icon: 'up', onClick: () => moveEntity(state.categories, c, -1) },
    { label: 'Move down', icon: 'down', onClick: () => moveEntity(state.categories, c, 1) },
    '-',
    {
      label: 'Delete category…', icon: 'trash', danger: true,
      onClick: async () => {
        const projs = projsOf(c.id);
        const ids = new Set(projs.map((p) => p.id));
        const n = state.items.filter((i) => ids.has(i.projectId)).length;
        const ok = await confirmDialog('Delete category?',
          `“${c.name}” and its ${plural(projs.length, 'project')} and ${plural(n, 'item')} will be permanently deleted.`);
        if (!ok) return;
        if (editingId && ids.has(itemById(editingId)?.projectId)) hideDrawer();
        state.items = state.items.filter((i) => !ids.has(i.projectId));
        state.projects = state.projects.filter((p) => p.categoryId !== c.id);
        state.categories = state.categories.filter((x) => x !== c);
        save();
        renderAll();
      },
    },
  ]);
}

function projectMenu(anchor, p) {
  openMenu(anchor, [
    { label: 'Edit project…', icon: 'edit', onClick: () => entityModal({ kind: 'project', entity: p }) },
    { label: 'New item here', icon: 'plus', onClick: () => { ui.scope = 'p:' + p.id; saveUi(); newItem(); } },
    { label: 'Move up', icon: 'up', onClick: () => moveEntity(projsOf(p.categoryId), p, -1) },
    { label: 'Move down', icon: 'down', onClick: () => moveEntity(projsOf(p.categoryId), p, 1) },
    '-',
    {
      label: 'Delete project…', icon: 'trash', danger: true,
      onClick: async () => {
        const n = state.items.filter((i) => i.projectId === p.id).length;
        const ok = await confirmDialog('Delete project?', `“${p.name}” and its ${plural(n, 'item')} will be permanently deleted.`);
        if (!ok) return;
        if (editingId && itemById(editingId)?.projectId === p.id) hideDrawer();
        state.items = state.items.filter((i) => i.projectId !== p.id);
        state.projects = state.projects.filter((x) => x !== p);
        save();
        renderAll();
      },
    },
  ]);
}

// ================= settings =================

async function openSettings() {
  const info = await api.getInfo();
  const s = state.settings;
  const body = `<div class="settings">
    <section><h3>Appearance</h3>
      <div class="seg wide" id="s-theme">${[['system', 'Match Windows'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button data-theme="${v}" class="${s.theme === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    </section>
    <section><h3>Reminders</h3>
      <label class="check-row"><input type="checkbox" id="s-notif" ${s.notifications ? 'checked' : ''}><span>Show Windows notifications for deadlines</span></label>
      <label class="field inline"><span>Default reminder for new deadlines</span>
        <select class="select" id="s-defrem">${REMINDERS.map((r) => `<option value="${r.v ?? 'none'}" ${r.v === s.defaultReminder ? 'selected' : ''}>${r.l}</option>`).join('')}</select></label>
      <button class="btn sm" id="s-test">${icon('bell')}Send a test notification</button>
    </section>
    <section><h3>Background</h3>
      <label class="check-row"><input type="checkbox" id="s-tray" ${s.minimizeToTray ? 'checked' : ''}>
        <span>Keep running in the system tray when the window is closed<small>Needed for reminders to fire while the window is closed.</small></span></label>
      <label class="check-row ${info.packaged ? '' : 'disabled'}"><input type="checkbox" id="s-login" ${s.launchAtLogin ? 'checked' : ''} ${info.packaged ? '' : 'disabled'}>
        <span>Start Roadmap when I sign in to Windows<small>${info.packaged ? 'Starts quietly in the tray.' : 'Available in the installed app (npm run dist).'}</small></span></label>
    </section>
    <section><h3>Your data</h3>
      <p class="small muted">Everything is stored on this PC in <code>${esc(info.dataDir)}</code></p>
      <div class="row-btns">
        <button class="btn sm" id="s-folder">${icon('folder')}Open data folder</button>
        <button class="btn sm" id="s-export">Export backup…</button>
        <button class="btn sm" id="s-import">Import backup…</button>
      </div>
    </section>
    <p class="small muted">Roadmap ${esc(info.version)}</p>
  </div>`;
  openModal({
    title: 'Settings',
    body,
    wide: true,
    onMount: (m) => {
      m.addEventListener('click', async (e) => {
        const th = e.target.closest('[data-theme]');
        if (th) {
          s.theme = th.dataset.theme;
          $$('[data-theme]', m).forEach((b) => b.classList.toggle('on', b === th));
          flush();
        }
        if (e.target.closest('#s-test')) {
          const ok = await api.testNotification();
          toast(ok ? 'Test notification sent. If you did not see it, check Windows notification settings.' : 'Notifications are not supported on this system.');
        }
        if (e.target.closest('#s-folder')) api.openDataFolder();
        if (e.target.closest('#s-export')) {
          flush();
          const r = await api.exportBackup();
          if (r.ok) toast(`Backup saved with ${plural(r.images, 'image')}.`);
        }
        if (e.target.closest('#s-import')) {
          const r = await api.importBackup();
          if (r.ok) {
            state = r.state;
            hideDrawer();
            closeModal();
            ui.scope = 'all';
            renderAll();
            toast('Backup imported.');
          } else if (r.error) toast(r.error);
        }
      });
      m.addEventListener('change', (e) => {
        const t = e.target;
        if (t.id === 's-notif') s.notifications = t.checked;
        if (t.id === 's-tray') s.minimizeToTray = t.checked;
        if (t.id === 's-login') s.launchAtLogin = t.checked;
        if (t.id === 's-defrem') s.defaultReminder = t.value === 'none' ? null : Number(t.value);
        save();
      });
    },
  });
}

// ================= global events =================

function setView(v) {
  ui.view = v;
  if (ui.scope === 'upcoming') ui.scope = 'all';
  saveUi();
  renderMain();
}

function bindEvents() {
  const nav = $('#nav');
  nav.addEventListener('click', (e) => {
    const t = e.target;
    const tog = t.closest('[data-toggle]');
    if (tog) { ui.collapsed[tog.dataset.toggle] = !ui.collapsed[tog.dataset.toggle]; saveUi(); renderSidebar(); return; }
    const cm = t.closest('[data-cat-menu]');
    if (cm) return categoryMenu(cm, catById(cm.dataset.catMenu));
    const pm = t.closest('[data-proj-menu]');
    if (pm) return projectMenu(pm, projById(pm.dataset.projMenu));
    const ap = t.closest('[data-add-proj]');
    if (ap) return entityModal({ kind: 'project', categoryId: ap.dataset.addProj });
    if (t.closest('#add-cat')) return entityModal({ kind: 'category' });
    const sc = t.closest('[data-scope]');
    if (sc) { ui.scope = sc.dataset.scope; saveUi(); renderAll(); }
  });
  nav.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-scope]')) { e.preventDefault(); e.target.click(); }
  });
  // Drag a card onto a project in the sidebar to move it there.
  nav.addEventListener('dragover', (e) => {
    const row = e.target.closest('[data-proj-drop]');
    if (!row || !dragId) return;
    e.preventDefault();
    $$('.nav-item.drop-target').forEach((x) => x !== row && x.classList.remove('drop-target'));
    row.classList.add('drop-target');
  });
  nav.addEventListener('dragleave', (e) => {
    const row = e.target.closest('[data-proj-drop]');
    if (row && !row.contains(e.relatedTarget)) row.classList.remove('drop-target');
  });
  nav.addEventListener('drop', (e) => {
    const row = e.target.closest('[data-proj-drop]');
    const it = itemById(dragId);
    if (!row || !it) return;
    e.preventDefault();
    const p = projById(row.dataset.projDrop);
    it.projectId = p.id;
    touch(it);
    renderAll();
    if (it.id === editingId) renderDrawer();
    toast(`Moved to ${p.name}`);
  });

  $('#open-settings').addEventListener('click', openSettings);

  const search = $('#search');
  const runSearch = debounce(() => { ui.search = search.value; renderMain(); }, 120);
  search.addEventListener('input', runSearch);
  search.addEventListener('keydown', (e) => { if (e.key === 'Escape' && search.value) { e.stopPropagation(); search.value = ''; ui.search = ''; renderMain(); } });

  const top = $('#topbar');
  top.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (v) return setView(v.dataset.view);
    if (e.target.closest('#new-item')) newItem();
  });
  top.addEventListener('change', (e) => {
    if (e.target.id === 'f-priority') ui.priority = e.target.value;
    if (e.target.id === 'f-done') ui.showDone = e.target.checked;
    saveUi();
    renderMain();
  });

  const content = $('#content');
  content.addEventListener('click', (e) => {
    const t = e.target;
    const dn = t.closest('[data-done]');
    if (dn) { e.stopPropagation(); return markDone(itemById(dn.dataset.done)); }
    const qa = t.closest('[data-quick-add]');
    if (qa) return newItem({ status: qa.dataset.quickAdd });
    if (t.closest('[data-empty="category"]')) return entityModal({ kind: 'category' });
    const sort = t.closest('[data-sort]');
    if (sort) {
      const k = sort.dataset.sort;
      ui.sort = { key: k, dir: ui.sort.key === k ? -ui.sort.dir : 1 };
      saveUi();
      return renderMain();
    }
    const cal = t.closest('[data-cal]');
    if (cal) {
      const delta = +cal.dataset.cal;
      if (!delta) ui.calMonth = null;
      else {
        const [y, m] = (ui.calMonth || monthKey(new Date())).split('-').map(Number);
        ui.calMonth = monthKey(new Date(y, m - 1 + delta, 1));
      }
      saveUi();
      return renderMain();
    }
    const open = t.closest('[data-open], .card[data-id], .cal-chip[data-id]');
    if (open) return openEditor(open.dataset.open || open.dataset.id);
    const cell = t.closest('.cal-cell');
    if (cell) {
      const [y, m, d] = cell.dataset.day.split('-').map(Number);
      newItem({ deadline: new Date(y, m - 1, d, 17, 0).toISOString() });
    }
  });

  // ---- drag and drop (cards, calendar chips, and image files) ----
  const clearDropMarks = () => {
    $$('.drop-target').forEach((x) => x.classList.remove('drop-target'));
    $$('.drop-line').forEach((x) => x.remove());
  };
  const dropBefore = (body, y) => $$('.card:not(.dragging)', body).find((c) => {
    const r = c.getBoundingClientRect();
    return y < r.top + r.height / 2;
  }) || null;

  content.addEventListener('dragstart', (e) => {
    const c = e.target.closest('.card, .cal-chip');
    if (!c) return;
    dragId = c.dataset.id;
    e.dataTransfer.setData('text/x-roadmap-item', dragId);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => c.classList.add('dragging'));
  });
  document.addEventListener('dragend', () => {
    dragId = null;
    $$('.dragging').forEach((x) => x.classList.remove('dragging'));
    clearDropMarks();
  });
  content.addEventListener('dragover', (e) => {
    const files = e.dataTransfer.types.includes('Files');
    if (files) {
      const target = e.target.closest('.card, .col-body, .cal-cell');
      if (!target) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!target.classList.contains('drop-target')) { clearDropMarks(); target.classList.add('drop-target'); }
      return;
    }
    if (!dragId) return;
    const body = e.target.closest('.col-body');
    if (body) {
      e.preventDefault();
      let line = $('.drop-line');
      if (!line) { line = document.createElement('div'); line.className = 'drop-line'; }
      const before = dropBefore(body, e.clientY);
      if (before) { if (line.nextSibling !== before) body.insertBefore(line, before); }
      else if (body.lastElementChild !== line) body.appendChild(line);
      return;
    }
    const cell = e.target.closest('.cal-cell');
    if (cell) {
      e.preventDefault();
      if (!cell.classList.contains('drop-target')) { clearDropMarks(); cell.classList.add('drop-target'); }
    }
  });
  content.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = imageFiles(e.dataTransfer.files);
    const card = e.target.closest('.card');
    const body = e.target.closest('.col-body');
    const cell = e.target.closest('.cal-cell');
    if (files.length) {
      clearDropMarks();
      const imgs = await storeFiles(files);
      if (!imgs.length) return;
      if (card) {
        const it = itemById(card.dataset.id);
        attachImages(it, imgs);
        toast(`Added ${plural(imgs.length, 'image')} to “${it.title.trim() || 'Untitled'}”`);
      } else if (body || cell) {
        let deadline = null;
        if (cell) { const [y, m, d] = cell.dataset.day.split('-').map(Number); deadline = new Date(y, m - 1, d, 17, 0).toISOString(); }
        newItem({ status: body?.dataset.drop || 'idea', deadline, images: imgs });
      }
      return;
    }
    const it = itemById(dragId);
    if (!it) return;
    if (body) {
      const before = $('.drop-line', body)?.nextElementSibling;
      const beforeId = before?.classList.contains('card') ? before.dataset.id : null;
      clearDropMarks();
      moveCard(it, body.dataset.drop, beforeId);
    } else if (cell) {
      clearDropMarks();
      reschedule(it, cell.dataset.day);
    }
  });

  // Stop the window from navigating to files dropped outside a drop zone.
  document.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', (e) => e.preventDefault());

  // Paste an image anywhere: attaches to the open item, or captures a new idea.
  document.addEventListener('paste', async (e) => {
    if ($('#modal-root').firstChild) return;
    const files = imageFiles(e.clipboardData?.files);
    if (!files.length) return;
    e.preventDefault();
    const imgs = await storeFiles(files);
    if (!imgs.length) return;
    const it = itemById(editingId);
    if (it) { attachImages(it, imgs); toast('Image added'); }
    else { newItem({ images: imgs }); toast('New idea created from your screenshot. Give it a title.'); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightbox) return closeLightbox();
      if ($('#modal-root').firstChild) return closeModal();
      if ($('#menu-root').firstChild) return closeMenu();
      if (editingId) return closeEditor();
    }
    if (lightbox && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      lightbox.index += e.key === 'ArrowLeft' ? -1 : 1;
      return renderLightbox();
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && !$('#modal-root').firstChild) {
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); newItem(); }
      else if (k === 'f') { e.preventDefault(); $('#search').focus(); $('#search').select(); }
      else if (['1', '2', '3'].includes(k)) { e.preventDefault(); setView(VIEWS[+k - 1].id); }
    }
  });

  bindDrawer();
}

// ================= boot =================

(async function init() {
  state = await api.loadState();
  bindEvents();
  renderAll();
  ready = true;
  whenReadyQueue.splice(0).forEach((fn) => fn());
  // Keep relative dates ("Today", "Overdue") fresh.
  setInterval(() => {
    if (dragId || $('#menu-root').firstChild) return;
    renderSidebar();
    renderMain();
  }, 60000);
})();

api.onOpenItem((id) => whenReady(() => {
  const it = itemById(id);
  if (it) openEditor(id);
}));
api.onNewItem(() => whenReady(() => newItem()));
