// electron/backup.js
// Encrypted backups of everything in the console.
//
// One file per backup: a web page that opens in any browser and asks for the
// backup password. The data inside is encrypted with AES-256-GCM, using a key
// made from the password with PBKDF2-SHA256 (600,000 rounds), so the page
// decrypts itself with the browser's own Web Crypto and needs nothing else.
// Without the password the file is unreadable, so it is safe in iCloud or email.
//
// The password is kept in this Mac's Keychain (Electron safeStorage) so daily
// backups can run by themselves. It never goes back to the window, the
// database or the repository. If it is lost, the backups can't be opened.
const { ipcMain, safeStorage, app, dialog, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const ROUNDS = 600000;
const MIN_PASSWORD = 12;
const OWNER_EMAIL = 'jcommerceandtech@gmail.com';
const keyFile = () => path.join(app.getPath('userData'), 'backup-key.json');
const stateFile = () => path.join(app.getPath('userData'), 'backup-state.json');
const readJson = async f => { try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return {}; } };

// iCloud Drive when it's on (synced online by the Mac), otherwise Documents
const ICLOUD = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
async function folder() {
  let base = path.join(app.getPath('documents'));
  let online = false;
  try { await fs.access(ICLOUD); base = ICLOUD; online = true; } catch {}
  const dir = path.join(base, 'Jcommerce Backups');
  await fs.mkdir(dir, { recursive: true });
  return { dir, online };
}

async function password() {
  const { blob } = await readJson(keyFile());
  if (!blob || !safeStorage.isEncryptionAvailable()) return null;
  try { return safeStorage.decryptString(Buffer.from(blob, 'base64')); } catch { return null; }
}

function encrypt(text, pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, ROUNDS, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(text, 'utf8'), c.final(), c.getAuthTag()]); // tag last, as Web Crypto expects
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), data: body.toString('base64'), rounds: ROUNDS };
}
function decrypt(box, pass) {
  const body = Buffer.from(box.data, 'base64');
  const key = crypto.pbkdf2Sync(pass, Buffer.from(box.salt, 'base64'), box.rounds, 32, 'sha256');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(body.subarray(body.length - 16));
  return Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]).toString('utf8');
}

// The page a backup is saved as. Nothing readable is in it until the password is typed.
const page = (box, label) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jcommerce backup</title>
<style>
:root{--bg:#f4efe6;--ink:#1d1a16;--mute:#6b6257;--line:#d9cfbf;--card:#fbf8f2;--accent:#8a1c22}
@media (prefers-color-scheme:dark){:root{--bg:#16130f;--ink:#efe8dc;--mute:#a69b8c;--line:#3a332a;--card:#1f1b16;--accent:#e0646b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.lock{max-width:420px;margin:12vh auto;padding:28px 16px}
h1{font-size:22px;margin:0 0 4px}p{color:var(--mute);margin:0 0 18px}
input{width:100%;padding:12px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);font-size:16px}
button{margin-top:12px;padding:11px 16px;border:0;border-radius:6px;background:var(--accent);color:#fff;font-size:15px;cursor:pointer}
.bad{color:var(--accent);margin-top:12px}
.bar{position:sticky;top:0;display:flex;gap:8px;flex-wrap:wrap;padding:10px 16px;background:var(--card);border-bottom:1px solid var(--line)}
.bar button{margin:0}iframe{width:100%;height:calc(100vh - 58px);border:0;background:#fff}
</style></head>
<body>
<div class="lock" id="lock">
  <h1>Jcommerce backup</h1>
  <p>${escHtml(label)}. Type the backup password to open it. Nothing leaves this computer.</p>
  <form id="f"><input id="pw" type="password" autocomplete="off" placeholder="Backup password" autofocus>
  <button type="submit">Open</button></form>
  <div class="bad" id="err"></div>
</div>
<script id="box" type="application/json">${JSON.stringify(box)}</script>
<script>
const box = JSON.parse(document.getElementById('box').textContent);
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
document.getElementById('f').onsubmit = async e => {
  e.preventDefault();
  const err = document.getElementById('err'); err.textContent = 'Opening…';
  try {
    if (!window.crypto || !crypto.subtle) throw new Error('nocrypto');
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(document.getElementById('pw').value), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.rounds, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.data)));
    const { html, data, name } = JSON.parse(plain);
    document.body.innerHTML = '<div class="bar"><button id="dl">Download the raw data (JSON)</button><button id="pr">Print or save as PDF</button></div><iframe id="doc" sandbox="allow-same-origin allow-modals"></iframe>';
    const fr = document.getElementById('doc'); fr.srcdoc = html;
    document.getElementById('dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = name + '.json'; a.click(); };
    document.getElementById('pr').onclick = () => fr.contentWindow.print();
  } catch (x) {
    err.textContent = x && x.message === 'nocrypto' ? 'This browser can\\'t decrypt files. Open the file in Chrome, Safari or Firefox on a computer.' : 'That password doesn\\'t open this backup.';
  }
};
</script></body></html>`;

const readBox = text => JSON.parse(text.match(/<script id="box" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stamp = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}`; };

async function list() {
  const { dir } = await folder();
  const names = (await fs.readdir(dir).catch(() => [])).filter(n => /^Jcommerce backup .*\.html$/.test(n));
  const rows = await Promise.all(names.map(async n => { const s = await fs.stat(path.join(dir, n)); return { name: n, path: path.join(dir, n), size: s.size, at: s.mtimeMs }; }));
  return rows.sort((a, b) => b.at - a.at);
}

function register(getWin) {
  ipcMain.handle('backup:status', async () => {
    const { dir, online } = await folder();
    const st = await readJson(stateFile());
    const files = await list();
    return { ok: true, hasPassword: !!(await password()), canEncrypt: safeStorage.isEncryptionAvailable(), dir, online, lastAuto: st.lastAuto || 0, last: files[0] || null, files: files.slice(0, 10), count: files.length, minPassword: MIN_PASSWORD };
  });

  ipcMain.handle('backup:setPassword', async (_e, { value, current }) => {
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'This Mac cannot keep the password safely right now.' };
    const was = await password();
    if (was && current !== was) return { ok: false, error: 'The current password is wrong.' };
    const clean = String(value || '');
    if (clean.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters.` };
    await fs.writeFile(keyFile(), JSON.stringify({ blob: safeStorage.encryptString(clean).toString('base64'), at: Date.now() }), { mode: 0o600 });
    return { ok: true };
  });

  // payload: JSON text of { name, html, data }, built by the window
  ipcMain.handle('backup:make', async (_e, { payload, auto = false, label = '' }) => {
    const pass = await password();
    if (!pass) return { ok: false, error: 'Set a backup password first.' };
    const { dir, online } = await folder();
    const file = path.join(dir, `Jcommerce backup ${stamp(new Date())}${auto ? ' (daily)' : ''}.html`);
    const box = encrypt(payload, pass);
    await fs.writeFile(file, page(box, label || 'Everything in JCommerce Console'), 'utf8');
    // Prove it opens before calling it done
    try { const back = JSON.parse(decrypt(readBox(await fs.readFile(file, 'utf8')), pass)); if (!back.data) throw new Error(); }
    catch { await fs.unlink(file).catch(() => {}); return { ok: false, error: 'The backup did not check out after saving, so it was removed. Try again.' }; }
    if (auto) { const st = await readJson(stateFile()); await fs.writeFile(stateFile(), JSON.stringify({ ...st, lastAuto: Date.now() })); }
    return { ok: true, path: file, online, size: Buffer.byteLength(payload) };
  });

  // Open any backup with the saved password, to check it is whole
  ipcMain.handle('backup:verify', async (_e, file) => {
    const pass = await password();
    if (!pass) return { ok: false, error: 'No backup password is set on this Mac.' };
    try {
      const { data } = JSON.parse(decrypt(readBox(await fs.readFile(file, 'utf8')), pass));
      const records = Object.values(data.collections || {}).reduce((t, x) => t + (Array.isArray(x) ? x.length : 0), 0);
      return { ok: true, records, exportedAt: data.exportedAt };
    } catch { return { ok: false, error: 'This backup does not open with the password saved on this Mac (an older password, or a damaged file).' }; }
  });

  ipcMain.handle('backup:saveCopy', async (_e, file) => {
    const { canceled, filePath } = await dialog.showSaveDialog(getWin(), { defaultPath: path.join(app.getPath('downloads'), path.basename(file)), filters: [{ name: 'Backup', extensions: ['html'] }] });
    if (canceled || !filePath) return { ok: false };
    await fs.copyFile(file, filePath);
    return { ok: true, path: filePath };
  });

  ipcMain.handle('backup:reveal', (_e, file) => { shell.showItemInFolder(file); return true; });

  // A new email in the Mac's Mail app with the backup attached. If Mail isn't
  // set up, the file is shown in Finder to drag into Gmail instead.
  ipcMain.handle('backup:email', (_e, file) => new Promise(resolve => {
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Mail"
  set m to make new outgoing message with properties {subject:"${esc(path.basename(file, '.html'))}", content:"Encrypted Jcommerce backup. Open the attached file in a browser on a computer and type the backup password." & return & return, visible:true}
  tell m to make new to recipient at end of to recipients with properties {address:"${OWNER_EMAIL}"}
  tell content of m to make new attachment with properties {file name:(POSIX file "${esc(file)}")} at after last paragraph
  activate
end tell`;
    execFile('osascript', ['-e', script], { timeout: 20000 }, err => {
      if (err) { shell.showItemInFolder(file); resolve({ ok: false, error: 'Mail isn\'t set up on this Mac, so the file is shown in Finder. Drag it into a Gmail message.' }); }
      else resolve({ ok: true });
    });
  }));
}

module.exports = { register, _test: { encrypt, decrypt, page, readBox } };
