# Roadmap

A personal, offline roadmap for Windows. Use it to jot down ideas and features for your projects and follow them from idea to done.

## Run it

```powershell
npm install
npm start
```

If `npm install` blocks Electron's download step, run `node node_modules/electron/install.js` once.

## Build an installer

```powershell
npm run dist
```

This writes two files to `dist/`:
- `Roadmap Setup x.y.z.exe`: an installer with Start menu and desktop shortcuts. The "start at sign-in" setting only works in the installed app.
- `Roadmap x.y.z.exe`: a portable single file.

## Features

- **Categories → Projects → Items.** Work and Personal are created for you; add as many categories and projects as you like.
- **Color coding.** Categories and projects have colors. Items inherit their project's color unless you give them their own.
- **Board, List and Calendar views**, plus an **Upcoming** page that groups deadlines into overdue, today, tomorrow, the next 7 days and later.
- **Statuses:** Idea, Planned, In progress, On hold, Done. Drag cards between columns. Drag a card onto a project in the sidebar to move it there.
- **Deadlines and reminders.** Windows notifications fire before the deadline and again when it's due. Click a notification to open the item. When you close the window, Roadmap stays in the system tray so reminders keep working.
- **Images.** Paste a screenshot (Win+Shift+S, then Ctrl+V) to attach it to the open item. With no item open, pasting creates a new idea from the screenshot. You can also drop image files onto a card or into the editor.
- **Priorities, tags, checklists and notes** on every item. Search covers all of them.
- **Light and dark themes** that follow Windows by default. You can override this in Settings.
- **Backups.** Export and import a single `.json` file that includes your images.

## Keyboard

| Keys | Action |
| --- | --- |
| Ctrl+N | New item |
| Ctrl+F | Search |
| Ctrl+1 / 2 / 3 | Board / List / Calendar |
| Esc | Close editor, dialog or image viewer |
| ← / → | Previous / next image in the viewer |

## Data

Everything is stored locally in `%APPDATA%\Roadmap` (Settings → Open data folder):
- `roadmap.json`: your data. A copy is saved to `roadmap.backup.json` each time the app starts.
- `images\`: attached images.

## Project layout

```
src/main.js          Electron main process: window, tray, notifications, file I/O
src/store.js         JSON persistence and data normalization
src/preload.js       Safe bridge between the UI and the main process
src/renderer/        UI (plain HTML/CSS/JS, no build step)
scripts/make-icon.js Regenerates assets/icon.png
```
