// electron/preload.js
// The small, explicit API the React app can use when running as the Mac app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  exportData: (json, filename) => ipcRenderer.invoke('data:export', { json, filename }),
  // A Mac notification (with its sound) for something that needs the owner now
  notify: (title, body) => ipcRenderer.invoke('app:notify', { title, body }),
  saveInvoicePdf: (html, filename) => ipcRenderer.invoke('invoice:save-pdf', { html, filename }),
  // Live cost figures. Keys go in, but never come back out to the window.
  live: {
    status: () => ipcRenderer.invoke('live:status'),
    setKey: (id, value) => ipcRenderer.invoke('live:setKey', { id, value }),
    fetch: (source, project) => ipcRenderer.invoke('live:fetch', { source, project }),
  },
  // Ventures: look into another project folder (read-only)
  venture: {
    overview: dir => ipcRenderer.invoke('venture:overview', dir),
    money: (project, days) => ipcRenderer.invoke('venture:money', { project, days }),
    billing: project => ipcRenderer.invoke('venture:billing', project),
    ops: (project, dir) => ipcRenderer.invoke('venture:ops', { project, dir }),
    ownerAction: (project, body) => ipcRenderer.invoke('venture:ownerAction', { project, body }),
    findOrder: (project, query) => ipcRenderer.invoke('venture:findOrder', { project, query }),
    pick: () => ipcRenderer.invoke('venture:pick'),
    open: dir => ipcRenderer.invoke('venture:open', dir),
    doc: (dir, file) => ipcRenderer.invoke('venture:doc', { dir, file }),
    run: (dir, id) => ipcRenderer.invoke('venture:run', { dir, id }),
    stop: () => ipcRenderer.invoke('venture:stop'),
    onOutput: cb => { const h = (_e, payload) => cb(payload); ipcRenderer.on('venture:output', h); return () => ipcRenderer.removeListener('venture:output', h); },
  },
});
