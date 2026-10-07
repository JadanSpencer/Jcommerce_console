// electron/preload.js
// The small, explicit API the React app can use when running as the Mac app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  saveInvoicePdf: (html, filename) => ipcRenderer.invoke('invoice:save-pdf', { html, filename }),
  // Ventures: look into another project folder (read-only)
  venture: {
    overview: dir => ipcRenderer.invoke('venture:overview', dir),
    money: (project, days) => ipcRenderer.invoke('venture:money', { project, days }),
    pick: () => ipcRenderer.invoke('venture:pick'),
    doc: (dir, file) => ipcRenderer.invoke('venture:doc', { dir, file }),
    run: (dir, id) => ipcRenderer.invoke('venture:run', { dir, id }),
    stop: () => ipcRenderer.invoke('venture:stop'),
    onOutput: cb => { const h = (_e, payload) => cb(payload); ipcRenderer.on('venture:output', h); return () => ipcRenderer.removeListener('venture:output', h); },
  },
});
