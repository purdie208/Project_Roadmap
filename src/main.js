'use strict';
const {
  app, BrowserWindow, ipcMain, nativeTheme, Notification, Tray, Menu,
  protocol, net, shell, dialog, nativeImage, clipboard, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { Store } = require('./store');

// Lets you run a throwaway copy against a separate data folder (used for testing).
if (process.env.ROADMAP_DATA_DIR) app.setPath('userData', path.resolve(process.env.ROADMAP_DATA_DIR));

const SNAPSHOT_STEPS = process.env.ROADMAP_SNAPSHOT_STEPS || null;
const START_HIDDEN = process.argv.includes('--hidden');
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const DAY = 864e5;

protocol.registerSchemesAsPrivileged([
  { scheme: 'rmimg', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

if (!SNAPSHOT_STEPS && !app.requestSingleInstanceLock()) app.exit(0);
app.setAppUserModelId('com.personal.roadmap');

let win = null;
let tray = null;
let store = null;
let quitting = false;
let reminderTimer = null;
const liveNotifications = new Set();

// ---------- window ----------

function boundsVisible(b) {
  if (!b || typeof b.x !== 'number') return false;
  return screen.getAllDisplays().some(({ workArea: a }) =>
    b.x < a.x + a.width - 60 && b.x + b.width > a.x + 60 && b.y >= a.y - 20 && b.y < a.y + a.height - 60);
}

function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  store.writeJson('window.json', { bounds: win.getNormalBounds(), maximized: win.isMaximized() });
}

function createWindow(forceShow = false) {
  const saved = store.readJson('window.json', {});
  const opts = {
    width: 1320,
    height: 840,
    minWidth: 920,
    minHeight: 580,
    show: false,
    title: 'Roadmap',
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#14161c' : '#f5f6fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  };
  if (boundsVisible(saved.bounds)) Object.assign(opts, saved.bounds);
  win = new BrowserWindow(opts);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    if (SNAPSHOT_STEPS) return win.showInactive();
    if (START_HIDDEN && !forceShow) return;
    if (saved.maximized) win.maximize();
    win.show();
  });

  win.on('close', (e) => {
    saveWindowState();
    if (!quitting && !SNAPSHOT_STEPS && store.state.settings.minimizeToTray) {
      e.preventDefault();
      win.hide();
      const flags = store.readJson('flags.json', {});
      if (!flags.trayHint) {
        notify('Roadmap is still running', 'Reminders keep working in the background. Right-click the tray icon to quit.');
        store.writeJson('flags.json', { ...flags, trayHint: true });
      }
    }
  });
  win.on('closed', () => { win = null; });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
      if (input.key === 'F5') win.webContents.reload();
    });
  }

  if (SNAPSHOT_STEPS) {
    win.webContents.on('console-message', (e) => console.log('[renderer]', e.message));
    win.webContents.once('did-finish-load', runSnapshots);
  }
}

function showWindow() {
  if (!win || win.isDestroyed()) createWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function sendToRenderer(channel, ...args) {
  showWindow();
  const wc = win.webContents;
  if (wc.isLoading()) wc.once('did-finish-load', () => wc.send(channel, ...args));
  else wc.send(channel, ...args);
}

// ---------- tray ----------

function createTray() {
  const base = nativeImage.createFromPath(ICON);
  const img = nativeImage.createEmpty();
  img.addRepresentation({ scaleFactor: 1, buffer: base.resize({ width: 16, height: 16, quality: 'best' }).toPNG() });
  img.addRepresentation({ scaleFactor: 2, buffer: base.resize({ width: 32, height: 32, quality: 'best' }).toPNG() });
  tray = new Tray(img);
  tray.setToolTip('Roadmap');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Roadmap', click: showWindow },
    { label: 'New item', click: () => sendToRenderer('new-item') },
    { type: 'separator' },
    { label: 'Quit Roadmap', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', showWindow);
}

// ---------- notifications ----------

function notify(title, body, itemId) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: ICON });
  liveNotifications.add(n);
  n.on('click', () => {
    liveNotifications.delete(n);
    if (itemId) sendToRenderer('open-item', itemId);
    else showWindow();
  });
  n.on('close', () => liveNotifications.delete(n));
  n.show();
}

const fmtWhen = (ms) => new Date(ms).toLocaleString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

// Each reminder fires once per (item, deadline, reminder) combination, so editing
// the deadline re-arms it. Fired keys are persisted so restarts don't repeat them.
function checkReminders() {
  const st = store?.state;
  if (!st || !st.settings.notifications) return;
  const fired = new Set(store.readJson('fired.json', []));
  const now = Date.now();
  const out = [];
  let changed = false;

  for (const it of st.items) {
    if (!it.deadline || it.status === 'done' || it.reminderMinutes == null) continue;
    const due = Date.parse(it.deadline);
    if (Number.isNaN(due)) continue;
    const name = it.title.trim() || 'Untitled';
    const project = st.projects.find((p) => p.id === it.projectId);
    const where = project ? `${project.name} · ` : '';

    if (it.reminderMinutes > 0) {
      const key = `r|${it.id}|${it.deadline}|${it.reminderMinutes}`;
      if (now >= due - it.reminderMinutes * 60000 && now < due && !fired.has(key)) {
        fired.add(key);
        changed = true;
        out.push({ id: it.id, title: `Coming up: ${name}`, body: `${where}Due ${fmtWhen(due)}` });
      }
    }
    const key = `d|${it.id}|${it.deadline}`;
    if (now >= due && !fired.has(key)) {
      fired.add(key);
      changed = true;
      // Don't spam about things that went overdue long ago while the app was closed.
      if (now - due < 7 * DAY) out.push({ id: it.id, title: `Due now: ${name}`, body: `${where}Was due ${fmtWhen(due)}` });
    }
  }

  if (changed) {
    const ids = new Set(st.items.map((i) => i.id));
    store.writeJson('fired.json', [...fired].filter((k) => ids.has(k.split('|')[1])));
  }
  if (out.length > 3) {
    notify(`${out.length} items need attention`, out.slice(0, 3).map((o) => o.title).join('\n') + '\n…');
  } else {
    out.forEach((o) => notify(o.title, o.body, o.id));
  }
}

// ---------- settings ----------

function applySettings(s) {
  nativeTheme.themeSource = ['light', 'dark'].includes(s.theme) ? s.theme : 'system';
  if (app.isPackaged) {
    const want = !!s.launchAtLogin;
    if (app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin !== want) {
      app.setLoginItemSettings({ openAtLogin: want, args: ['--hidden'] });
    }
  }
}

// ---------- images ----------

function normalizeExt(ext) {
  ext = String(ext || '').toLowerCase();
  if (!ext.startsWith('.')) ext = '.' + ext;
  return IMAGE_EXTS.has(ext) ? ext : '.png';
}

function saveImageBuffer(buf, ext, name) {
  if (!buf || !buf.length || buf.length > MAX_IMAGE_BYTES) return null;
  const file = crypto.randomUUID() + normalizeExt(ext);
  fs.writeFileSync(path.join(store.imagesDir, file), buf);
  return { file, name: String(name || 'Image').slice(0, 200) };
}

function importImagePaths(paths) {
  const out = [];
  for (const p of Array.isArray(paths) ? paths : []) {
    try {
      if (typeof p !== 'string') continue;
      const ext = path.extname(p).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      const stat = fs.statSync(p);
      if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) continue;
      const file = crypto.randomUUID() + ext;
      fs.copyFileSync(p, path.join(store.imagesDir, file));
      out.push({ file, name: path.basename(p) });
    } catch (err) {
      console.error('Could not import image', p, err);
    }
  }
  return out;
}

// ---------- backup ----------

async function exportBackup() {
  store.flush();
  const stamp = new Date().toISOString().slice(0, 10);
  const r = await dialog.showSaveDialog(win, {
    title: 'Export backup',
    defaultPath: `roadmap-backup-${stamp}.json`,
    filters: [{ name: 'Roadmap backup', extensions: ['json'] }],
  });
  if (r.canceled || !r.filePath) return { ok: false };
  const images = {};
  for (const it of store.state.items) {
    for (const im of it.images) {
      const p = path.join(store.imagesDir, im.file);
      if (fs.existsSync(p)) images[im.file] = fs.readFileSync(p).toString('base64');
    }
  }
  fs.writeFileSync(r.filePath, JSON.stringify({
    format: 'roadmap-backup', version: 1, exportedAt: new Date().toISOString(), state: store.state, images,
  }));
  return { ok: true, path: r.filePath, images: Object.keys(images).length };
}

async function importBackup() {
  const r = await dialog.showOpenDialog(win, {
    title: 'Import backup',
    properties: ['openFile'],
    filters: [{ name: 'Roadmap backup', extensions: ['json'] }],
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (data?.format !== 'roadmap-backup' || !data.state) return { ok: false, error: 'That file is not a Roadmap backup.' };
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Replace my data', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Import backup',
    message: 'Replace all current data with this backup?',
    detail: 'Your current data is first saved as roadmap.before-import.json in the data folder.',
  });
  if (response !== 0) return { ok: false };
  store.flush();
  if (fs.existsSync(store.file)) fs.copyFileSync(store.file, path.join(store.dir, 'roadmap.before-import.json'));
  for (const [file, b64] of Object.entries(data.images || {})) {
    const name = path.basename(file);
    if (IMAGE_EXTS.has(path.extname(name).toLowerCase())) {
      fs.writeFileSync(path.join(store.imagesDir, name), Buffer.from(String(b64), 'base64'));
    }
  }
  store.save(data.state);
  store.flush();
  applySettings(store.state.settings);
  return { ok: true, state: store.state };
}

// ---------- IPC ----------

function registerIpc() {
  ipcMain.handle('state:load', () => store.state);
  ipcMain.on('state:save', (_e, state) => {
    store.save(state);
    applySettings(store.state.settings);
    clearTimeout(reminderTimer);
    reminderTimer = setTimeout(checkReminders, 1500);
  });

  ipcMain.handle('images:saveData', (_e, { bytes, ext, name }) => saveImageBuffer(Buffer.from(bytes), ext, name));
  ipcMain.handle('images:importPaths', (_e, paths) => importImagePaths(paths));
  ipcMain.handle('images:pick', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Add images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
    });
    return r.canceled ? [] : importImagePaths(r.filePaths);
  });
  ipcMain.handle('images:clipboard', () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    return saveImageBuffer(img.toPNG(), '.png', `Screenshot ${new Date().toLocaleString()}`);
  });
  ipcMain.handle('images:open', (_e, file) => shell.openPath(path.join(store.imagesDir, path.basename(String(file)))));

  ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataDir: store.dir, packaged: app.isPackaged }));
  ipcMain.handle('data:openFolder', () => shell.openPath(store.dir));
  ipcMain.handle('data:export', exportBackup);
  ipcMain.handle('data:import', importBackup);
  ipcMain.handle('notify:test', () => {
    notify('Notifications are working', 'You will get reminders like this before deadlines.');
    return Notification.isSupported();
  });
}

// ---------- dev snapshot runner (ROADMAP_SNAPSHOT_STEPS=steps.json) ----------

async function runSnapshots() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const steps = JSON.parse(fs.readFileSync(SNAPSHOT_STEPS, 'utf8'));
    await wait(1200);
    for (const s of steps) {
      if (s.theme) nativeTheme.themeSource = s.theme;
      if (s.js) {
        const res = await win.webContents.executeJavaScript(s.js).catch((e) => `ERROR ${e.message}`);
        if (res !== undefined) console.log('[step]', JSON.stringify(res));
      }
      await wait(s.wait ?? 700);
      if (s.out) fs.writeFileSync(s.out, (await win.webContents.capturePage()).toPNG());
    }
  } catch (err) {
    console.error('Snapshot run failed:', err);
  }
  store.flush();
  app.exit(0);
}

// ---------- lifecycle ----------

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));
  store.load();
  store.cleanupImages();
  applySettings(store.state.settings);

  protocol.handle('rmimg', (req) => {
    const name = path.basename(decodeURIComponent(new URL(req.url).pathname));
    return net.fetch(pathToFileURL(path.join(store.imagesDir, name)).toString());
  });

  Menu.setApplicationMenu(null);
  registerIpc();
  createWindow();
  nativeTheme.on('updated', () => {
    if (win && !win.isDestroyed()) win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#14161c' : '#f5f6fa');
  });

  if (!SNAPSHOT_STEPS) {
    createTray();
    setTimeout(checkReminders, 5000);
    setInterval(checkReminders, 30000);
  }
});

app.on('second-instance', showWindow);
app.on('before-quit', () => {
  quitting = true;
  saveWindowState();
  store?.flush();
});
app.on('window-all-closed', () => app.quit());
