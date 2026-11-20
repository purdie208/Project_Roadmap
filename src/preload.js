'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.send('state:save', state),

  saveImageData: (bytes, ext, name) => ipcRenderer.invoke('images:saveData', { bytes, ext, name }),
  importImagePaths: (paths) => ipcRenderer.invoke('images:importPaths', paths),
  pickImages: () => ipcRenderer.invoke('images:pick'),
  pasteClipboardImage: () => ipcRenderer.invoke('images:clipboard'),
  openImage: (file) => ipcRenderer.invoke('images:open', file),
  pathForFile: (file) => webUtils.getPathForFile(file),

  getInfo: () => ipcRenderer.invoke('app:info'),
  openDataFolder: () => ipcRenderer.invoke('data:openFolder'),
  exportBackup: () => ipcRenderer.invoke('data:export'),
  importBackup: () => ipcRenderer.invoke('data:import'),
  testNotification: () => ipcRenderer.invoke('notify:test'),

  onOpenItem: (cb) => ipcRenderer.on('open-item', (_e, id) => cb(id)),
  onNewItem: (cb) => ipcRenderer.on('new-item', () => cb()),
});
