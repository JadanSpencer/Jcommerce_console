// electron/venture.js
// Read-only window into another project folder (a "venture", e.g. Runner).
// Everything here looks; nothing changes the other project:
//   - repo + package overview, docs, and an inventory of secrets (masked)
//   - a fixed list of safe check commands (no deploys), output streamed back
//   - live money data from the venture's Firestore, read with this Mac's
//     existing Firebase CLI login. No keys are stored by the console.
const { ipcMain, dialog, shell } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const SHELL = '/bin/zsh'; // login shell, so npm/firebase are on PATH when launched from Finder

// The only commands the console may run. Fixed strings: nothing typed in the
// app ever reaches a shell.
const CHECKS = {
  'git-status':    { label: 'Git status',          cmd: 'git status -sb && echo && git log --oneline -8' },
  'git-fetch':     { label: 'Check for remote changes', cmd: 'git fetch --prune && git status -sb' },
  'typecheck':     { label: 'Typecheck',           cmd: 'npm run typecheck', script: 'typecheck' },
  'test-payments': { label: 'Payment tests',       cmd: 'npm --prefix functions run test:payments', fnScript: 'test:payments' },
  'test-rules':    { label: 'Security rules tests', cmd: 'npm run test:rules', script: 'test:rules' },
  'check':         { label: 'Full check',          cmd: 'npm run check', script: 'check' },
  'audit':         { label: 'Dependency audit',    cmd: 'npm audit --omit=dev || true' },
};

const exec = (file, args, cwd) => new Promise(resolve => {
  execFile(file, args, { cwd, timeout: 15000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : String(stdout)));
});
const readJson = async f => { try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return null; } };
const exists = async f => { try { await fs.access(f); return true; } catch { return false; } };

const mask = v => {
  if (!v) return '';
  if (v.length < 10) return '•'.repeat(v.length);
  return `${v.slice(0, 4)}${'•'.repeat(6)}${v.slice(-3)}`;
};

async function isDir(dir) {
  try { return (await fs.stat(dir)).isDirectory(); } catch { return false; }
}

async function overview(dir) {
  if (!dir || !(await isDir(dir))) return { ok: false, error: 'Folder not found' };
  const pkg = await readJson(path.join(dir, 'package.json'));
  const fnPkg = await readJson(path.join(dir, 'functions', 'package.json'));
  const rc = await readJson(path.join(dir, '.firebaserc'));

  // Git
  const isRepo = await exists(path.join(dir, '.git'));
  let git = null;
  if (isRepo) {
    const status = await exec('/usr/bin/git', ['status', '--porcelain=v1', '-b'], dir);
    const lines = status.split('\n').filter(Boolean);
    const head = lines[0] || '';
    const m = head.match(/^## ([^.\s]+)(?:\.\.\.(\S+))?(?: \[(.*)\])?/);
    const ahead = Number((m?.[3] || '').match(/ahead (\d+)/)?.[1] || 0);
    const behind = Number((m?.[3] || '').match(/behind (\d+)/)?.[1] || 0);
    const log = await exec('/usr/bin/git', ['log', '-8', '--pretty=format:%h\t%ct\t%s'], dir);
    const remote = (await exec('/usr/bin/git', ['remote', 'get-url', 'origin'], dir)).trim();
    git = {
      branch: m?.[1] || '', upstream: m?.[2] || '', ahead, behind,
      dirty: lines.slice(1).map(l => ({ state: l.slice(0, 2).trim(), file: l.slice(3) })),
      commits: log.split('\n').filter(Boolean).map(l => { const [hash, ts, ...s] = l.split('\t'); return { hash, at: Number(ts) * 1000, subject: s.join('\t') }; }),
      remote: remote.replace(/\.git$/, ''),
    };
  }

  // Secrets inventory: names + masked previews only. Full values never leave this file.
  const tracked = isRepo ? new Set((await exec('/usr/bin/git', ['ls-files'], dir)).split('\n')) : new Set();
  const secrets = [], files = [];
  for (const rel of ['', 'functions']) {
    let names = [];
    try { names = await fs.readdir(path.join(dir, rel)); } catch { continue; }
    for (const name of names) {
      const relPath = rel ? `${rel}/${name}` : name;
      const isEnv = /^\.env(\..+)?$/.test(name) && !/\.example$|\.sample$/.test(name);
      const isCred = /service-account.*\.json$|credentials.*\.json$|\.pem$|\.p12$|\.keystore$|\.jks$/i.test(name);
      if (!isEnv && !isCred) continue;
      files.push({ file: relPath, kind: isEnv ? 'env' : 'credential', tracked: tracked.has(relPath) });
      if (!isEnv) continue;
      const text = await fs.readFile(path.join(dir, relPath), 'utf8').catch(() => '');
      text.split('\n').forEach(line => {
        const mm = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!mm) return;
        const value = mm[2].trim().replace(/^['"]|['"]$/g, '');
        secrets.push({ file: relPath, key: mm[1], set: value.length > 0, length: value.length, masked: mask(value), public: /^(EXPO_PUBLIC_|NEXT_PUBLIC_|REACT_APP_|VITE_)/.test(mm[1]) });
      });
    }
  }

  // Docs at the project root
  let docs = [];
  try { docs = (await fs.readdir(dir)).filter(f => /\.md$/i.test(f)).sort(); } catch {}

  // Which outside services the code actually uses (read from the source, names only)
  let fnSrc = '';
  try {
    for (const f of await fs.readdir(path.join(dir, 'functions', 'src'))) {
      if (/\.(ts|js)$/.test(f) && !/campusDistances/.test(f)) fnSrc += await fs.readFile(path.join(dir, 'functions', 'src', f), 'utf8').catch(() => '');
    }
  } catch {}
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const fb = await readJson(path.join(dir, 'firebase.json'));
  const appJson = await readJson(path.join(dir, 'app.json'));
  const keyNames = secrets.map(x => x.key).join(' ');
  const uses = {
    photoroom: /photoroom/i.test(fnSrc),
    ntfy: /ntfy/i.test(fnSrc),
    maps: !!deps['react-native-maps'] || /GOOGLE_MAPS/.test(keyNames),
    appCheck: /RECAPTCHA/.test(keyNames) || /enforceAppCheck/.test(fnSrc),
    push: !!deps['expo-notifications'] || /VAPID/.test(keyNames),
    googleSignIn: !!deps['@react-native-google-signin/google-signin'],
    play: !!(appJson?.expo?.android?.package) && await exists(path.join(dir, 'eas.json')),
    hosting: !!fb?.hosting, storage: !!fb?.storage,
    scheduler: /onSchedule\(/.test(fnSrc), tasks: /onTaskDispatched/.test(fnSrc),
    warm: (fnSrc.match(/minInstances:\s*[1-9]/g) || []).length,
  };

  const scripts = Object.keys(pkg?.scripts || {}), fnScripts = Object.keys(fnPkg?.scripts || {});
  const checks = Object.entries(CHECKS)
    .filter(([, c]) => (!c.script || scripts.includes(c.script)) && (!c.fnScript || fnScripts.includes(c.fnScript)))
    .filter(([id]) => isRepo || !id.startsWith('git-'))
    .map(([id, c]) => ({ id, label: c.label, cmd: c.cmd }));

  return {
    ok: true, dir, name: pkg?.name || path.basename(dir),
    firebaseProject: rc?.projects?.default || '',
    git, secrets, files, docs, checks, uses,
    has: { vercel: await exists(path.join(dir, 'vercel.json')), expo: await exists(path.join(dir, 'eas.json')) || !!pkg?.dependencies?.expo, ci: await exists(path.join(dir, '.github', 'workflows')), functions: !!fnPkg },
  };
}

// ── Firestore, read-only, through the Firebase CLI's login ──────────────────
const CLI_CONFIG = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
async function cliToken(forceRefresh) {
  let cfg = await readJson(CLI_CONFIG);
  const stale = !cfg?.tokens?.access_token || (cfg.tokens.expires_at || 0) < Date.now() + 60000;
  if (stale || forceRefresh) {
    // Any CLI call refreshes the saved token
    await new Promise(resolve => { const p = spawn(SHELL, ['-lc', 'firebase projects:list >/dev/null 2>&1']); p.on('close', resolve); p.on('error', resolve); });
    cfg = await readJson(CLI_CONFIG);
  }
  return cfg?.tokens?.access_token || null;
}
const fromValue = v => {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return null;
};
async function runQuery(project, token, collectionId, sinceMs, fields, limit) {
  const body = { structuredQuery: {
    from: [{ collectionId }],
    select: { fields: fields.map(fieldPath => ({ fieldPath })) },
    ...(sinceMs ? { where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { integerValue: String(sinceMs) } } }, orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }] } : {}),
    limit,
  } };
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (r.status === 401) throw Object.assign(new Error('unauthorized'), { code: 401 });
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error(rows?.error?.message || 'Query failed');
  return rows.filter(x => x.document).map(x => ({ id: x.document.name.split('/').pop(), ...Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, fromValue(v)])) }));
}
// Orders, card payments, wallet movements and floats for the last N days.
// Names and account ids are left out: the console only needs the money.
async function money(project, days = 30) {
  if (!/^[a-z0-9-]+$/.test(project || '')) return { ok: false, error: 'No Firebase project found in this folder' };
  const since = Date.now() - days * 86400000;
  const load = async token => ({
    orders: await runQuery(project, token, 'orders', since, ['status', 'totalAmount', 'deliveryFee', 'platformFeeJmd', 'dasherPayoutJmd', 'paymentMethod', 'paymentStatus', 'createdAt', 'paidAt', 'deliveredAt', 'storeName', 'cancelReason'], 1000),
    payments: await runQuery(project, token, 'payments', since, ['status', 'purpose', 'amountJmd', 'gateway', 'createdAt', 'orderId', 'refundFallback', 'flagged', 'needsReview'], 1000),
    walletTx: await runQuery(project, token, 'walletTx', since, ['type', 'amountJmd', 'createdAt'], 2000),
    storeFloats: await runQuery(project, token, 'storeFloats', 0, ['balanceJmd', 'name', 'storeName', 'updatedAt'], 100).catch(() => []),
  });
  try {
    let token = await cliToken(false);
    if (!token) return { ok: false, error: 'Not signed in to the Firebase CLI on this Mac. Run "firebase login" once.' };
    try { return { ok: true, since, fetchedAt: Date.now(), ...(await load(token)) }; }
    catch (e) {
      if (e.code !== 401) throw e;
      token = await cliToken(true);
      return { ok: true, since, fetchedAt: Date.now(), ...(await load(token)) };
    }
  } catch (e) {
    return { ok: false, error: e.message || 'Could not read the live data' };
  }
}

// Is Google Cloud billing switched on for the project? (Read-only. Google has
// no API for the amount spent; that only shows in the billing report.)
async function billing(project) {
  if (!/^[a-z0-9-]+$/.test(project || '')) return { ok: false, error: 'No project' };
  try {
    const call = async token => fetch(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`, { headers: { Authorization: `Bearer ${token}` } });
    let r = await call(await cliToken(false));
    if (r.status === 401) r = await call(await cliToken(true));
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j?.error?.message || `HTTP ${r.status}` };
    return { ok: true, enabled: !!j.billingEnabled, hasAccount: !!j.billingAccountName };
  } catch (e) { return { ok: false, error: e.message || 'Could not check' }; }
}

function register(getWindow) {
  let running = null;
  ipcMain.handle('venture:overview', (_e, dir) => overview(dir));
  ipcMain.handle('venture:billing', (_e, project) => billing(project));
  ipcMain.handle('venture:money', (_e, { project, days }) => money(project, days));
  ipcMain.handle('venture:pick', async () => {
    const r = await dialog.showOpenDialog(getWindow(), { properties: ['openDirectory'], message: 'Choose the project folder' });
    return r.canceled ? null : r.filePaths[0];
  });
  // Shows the folder in Finder. Opens nothing else.
  ipcMain.handle('venture:open', async (_e, dir) => ((await isDir(dir)) ? !(await shell.openPath(dir)) : false));
  ipcMain.handle('venture:doc', async (_e, { dir, file }) => {
    if (!/^[\w .-]+\.md$/i.test(file || '')) return { ok: false, error: 'Not a document' };
    try { return { ok: true, text: (await fs.readFile(path.join(dir, path.basename(file)), 'utf8')).slice(0, 200000) }; }
    catch { return { ok: false, error: 'Could not read it' }; }
  });
  ipcMain.handle('venture:run', async (_e, { dir, id }) => {
    const check = CHECKS[id];
    if (!check || !(await isDir(dir))) return { ok: false, error: 'Unknown check' };
    if (running) return { ok: false, error: 'Another check is still running' };
    const runId = Date.now();
    const send = payload => getWindow()?.webContents.send('venture:output', { runId, id, ...payload });
    const child = spawn(SHELL, ['-lc', check.cmd], { cwd: dir, env: { ...process.env, FORCE_COLOR: '0', CI: '1' } });
    running = child;
    send({ chunk: `$ ${check.cmd}\n` });
    child.stdout.on('data', d => send({ chunk: String(d) }));
    child.stderr.on('data', d => send({ chunk: String(d) }));
    child.on('close', code => { running = null; send({ done: true, code }); });
    child.on('error', err => { running = null; send({ chunk: `\n${err.message}\n`, done: true, code: 1 }); });
    return { ok: true, runId };
  });
  ipcMain.handle('venture:stop', () => { if (running) { running.kill('SIGTERM'); return true; } return false; });
}

module.exports = { register };
