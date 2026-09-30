// electron/preload.js
// The small, explicit API the React app can use when running as the Mac app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  saveInvoicePdf: (html, filename) => ipcRenderer.invoke('invoice:save-pdf', { html, filename }),
});
