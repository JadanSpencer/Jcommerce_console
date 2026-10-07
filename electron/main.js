// electron/main.js
// Desktop shell for JCommerce Console. Serves the CRA build over app:// so the
// absolute paths CRA emits (/static/..., /service-worker.js) resolve correctly.
const { app, BrowserWindow, Menu, protocol, net, shell, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const venture = require('./venture');

const SCHEME = 'app';
const BUILD_DIR = path.join(__dirname, '..', 'build');
const DEV_URL = process.env.ELECTRON_START_URL; // e.g. http://localhost:3000

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true } },
]);

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    fullscreen: true,
    backgroundColor: '#0c0506',
    title: 'JCommerce Console',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.once('ready-to-show', () => win.show());

  // External links (target="_blank", wa.me, client websites) open in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  // tel:, mailto:, and any off-app navigation are handed to macOS
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${SCHEME}://`) && !(DEV_URL && url.startsWith(DEV_URL))) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadURL(DEV_URL || `${SCHEME}://console/`);
}

// Render the invoice HTML off-screen, print it to PDF, and save where the user picks
ipcMain.handle('invoice:save-pdf', async (_e, { html, filename }) => {
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  try {
    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await pdfWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { marginType: 'none' },
    });
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: path.join(app.getPath('downloads'), path.basename(filename)),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false };
    await fs.writeFile(filePath, pdf);
    shell.openPath(filePath);
    return { ok: true, filePath };
  } finally {
    pdfWin.destroy();
  }
});

// Read-only access to another project folder (Ventures section)
venture.register(() => win);

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]));
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, (req) => {
    const { pathname } = new URL(req.url);
    let filePath = path.normalize(path.join(BUILD_DIR, decodeURIComponent(pathname)));
    // Block path traversal; fall back to index.html for SPA routes
    if (!filePath.startsWith(BUILD_DIR) || !path.extname(filePath)) {
      filePath = path.join(BUILD_DIR, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
