'use strict';
const fs = require('fs');
const path = require('path');

const STATUSES = ['idea', 'planned', 'in-progress', 'on-hold', 'done'];
const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'];
const DEFAULT_SETTINGS = {
  theme: 'system',
  notifications: true,
  minimizeToTray: true,
  launchAtLogin: false,
  defaultReminder: 60,
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function seed() {
  const now = new Date().toISOString();
  const work = { id: uid(), name: 'Work', color: '#4f7cff', order: 0 };
  const personal = { id: uid(), name: 'Personal', color: '#2fb67c', order: 1 };
  const workGeneral = { id: uid(), categoryId: work.id, name: 'General', color: '', order: 0 };
  const personalGeneral = { id: uid(), categoryId: personal.id, name: 'General', color: '', order: 0 };
  const steps = [
    'Add a category for each area you track (the + next to Categories)',
    'Add a project inside a category',
    'Paste a screenshot onto an item with Ctrl+V (Win+Shift+S to capture)',
    'Set a deadline and a reminder',
    'Drag this card to Done',
  ];
  const welcome = {
    id: uid(),
    projectId: personalGeneral.id,
    title: 'Welcome to Roadmap',
    notes:
      'Jot down ideas and features for your projects, then move them across the board as they progress.\n\n' +
      'Tips:\n' +
      '• Ctrl+N creates an item, Ctrl+F searches everything.\n' +
      '• Paste a screenshot anywhere to capture a new idea from it.\n' +
      '• Drop image files onto a card to attach them.\n' +
      '• Drag a card onto a project in the sidebar to move it.\n' +
      '• Closing the window keeps Roadmap in the tray so reminders still fire.',
    status: 'idea',
    priority: 'medium',
    color: '',
    tags: ['getting-started'],
    deadline: null,
    reminderMinutes: null,
    checklist: steps.map((text) => ({ id: uid(), text, done: false })),
    images: [],
    order: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    categories: [work, personal],
    projects: [workGeneral, personalGeneral],
    items: [welcome],
  };
}

function normalizeItem(it) {
  const now = new Date().toISOString();
  return {
    id: String(it.id || uid()),
    projectId: String(it.projectId || ''),
    title: String(it.title ?? ''),
    notes: String(it.notes ?? ''),
    status: STATUSES.includes(it.status) ? it.status : 'idea',
    priority: PRIORITIES.includes(it.priority) ? it.priority : 'none',
    color: typeof it.color === 'string' ? it.color : '',
    tags: Array.isArray(it.tags) ? it.tags.filter((t) => typeof t === 'string' && t) : [],
    deadline: it.deadline && !Number.isNaN(Date.parse(it.deadline)) ? it.deadline : null,
    reminderMinutes: typeof it.reminderMinutes === 'number' ? it.reminderMinutes : null,
    checklist: Array.isArray(it.checklist)
      ? it.checklist.map((c) => ({ id: String(c.id || uid()), text: String(c.text ?? ''), done: !!c.done }))
      : [],
    images: Array.isArray(it.images)
      ? it.images.filter((i) => i && i.file).map((i) => ({ file: path.basename(String(i.file)), name: String(i.name || 'Image') }))
      : [],
    order: Number(it.order) || 0,
    createdAt: it.createdAt || now,
    updatedAt: it.updatedAt || now,
    completedAt: it.completedAt || null,
  };
}

function normalize(s) {
  s = s && typeof s === 'object' ? s : {};
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    categories: (Array.isArray(s.categories) ? s.categories : []).map((c, i) => ({
      id: String(c.id || uid()),
      name: String(c.name || 'Untitled'),
      color: c.color || '#7a869a',
      order: Number.isFinite(c.order) ? c.order : i,
    })),
    projects: (Array.isArray(s.projects) ? s.projects : []).map((p, i) => ({
      id: String(p.id || uid()),
      categoryId: String(p.categoryId || ''),
      name: String(p.name || 'Untitled'),
      color: typeof p.color === 'string' ? p.color : '',
      order: Number.isFinite(p.order) ? p.order : i,
    })),
    items: (Array.isArray(s.items) ? s.items : []).map(normalizeItem),
  };
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'roadmap.json');
    this.imagesDir = path.join(dir, 'images');
    this.state = null;
    this.timer = null;
    fs.mkdirSync(this.imagesDir, { recursive: true });
  }

  load() {
    let data = null;
    if (fs.existsSync(this.file)) {
      try {
        data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        fs.copyFileSync(this.file, path.join(this.dir, 'roadmap.backup.json'));
      } catch (err) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.renameSync(this.file, path.join(this.dir, `roadmap.corrupt-${stamp}.json`));
        console.error('Could not read roadmap.json, starting fresh:', err);
        data = null;
      }
    }
    this.state = data ? normalize(data) : seed();
    if (!data) this.flush();
    return this.state;
  }

  save(state) {
    this.state = normalize(state);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.state) return;
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }

  readJson(name, fallback) {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.dir, name), 'utf8'));
    } catch {
      return fallback;
    }
  }

  writeJson(name, value) {
    try {
      fs.writeFileSync(path.join(this.dir, name), JSON.stringify(value));
    } catch (err) {
      console.error('Could not write', name, err);
    }
  }

  // Removes image files no longer referenced by any item (or by the pre-import snapshot).
  cleanupImages() {
    const keep = new Set();
    const collect = (st) => (st?.items || []).forEach((it) => (it.images || []).forEach((im) => keep.add(im.file)));
    collect(this.state);
    collect(this.readJson('roadmap.before-import.json', null));
    for (const f of fs.readdirSync(this.imagesDir)) {
      if (!keep.has(f)) {
        try { fs.unlinkSync(path.join(this.imagesDir, f)); } catch { /* ignore */ }
      }
    }
  }
}

module.exports = { Store };
