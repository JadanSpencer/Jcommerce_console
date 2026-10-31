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
const dns = require('dns').promises;
const { ops, ownerAction, findOrder } = require('./ops');

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


// ── Websites: domain, registrar, DNS host and the outside services a static
// site loads. Reads the folder's HTML and two public lookups (DNS and the
// domain registry's RDAP record). Nothing is changed anywhere.
const withTimeout = (p, ms) => Promise.race([p, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
// The registry that answers for a domain comes from IANA's bootstrap list
// (rdap.org refuses requests that don't come from a browser).
let rdapBoot = null;
async function rdapLookup(domain) {
  try {
    rdapBoot = rdapBoot || await (await fetch('https://data.iana.org/rdap/dns.json')).json();
    const tld = domain.split('.').pop();
    const base = rdapBoot.services.find(([tlds]) => tlds.includes(tld))?.[1]?.[0];
    if (!base) return null;
    const r = await fetch(`${base.replace(/\/?$/, '/')}domain/${domain}`, { headers: { accept: 'application/rdap+json' } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function siteInfo(dir) {
  let html = '', names = [];
  try { names = (await fs.readdir(dir)).filter(f => /\.html?$/i.test(f)); } catch {}
  if (!names.length) return null;
  for (const f of names.slice(0, 40)) html += await fs.readFile(path.join(dir, f), 'utf8').catch(() => '');
  const cname = (await fs.readFile(path.join(dir, 'CNAME'), 'utf8').catch(() => '')).trim();
  const canon = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\/([^/"']+)/i)?.[1]
    || html.match(/property=["']og:url["'][^>]+content=["']https?:\/\/([^/"']+)/i)?.[1] || '';
  const domain = (cname || canon).replace(/^www\./, '').toLowerCase();
  const site = {
    domain, pages: names.length,
    emailjs: /@emailjs\/browser|emailjs\.send\(/.test(html),
    fonts: /fonts\.googleapis\.com/.test(html),
    cdns: ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'].filter(h => html.includes(h)),
    metaVerified: /facebook-domain-verification/.test(html),
    host: '', ns: [], registrar: '', expires: '', created: '', live: null,
  };
  if (!domain) return site;
  const [ns, rdap, live] = await Promise.all([
    withTimeout(dns.resolveNs(domain).catch(() => []), 5000),
    withTimeout(rdapLookup(domain), 9000),
    withTimeout((async () => { const t = Date.now(); try { const r = await fetch(`https://${domain}/`, { method: 'GET', redirect: 'follow' }); return { ok: r.ok, status: r.status, ms: Date.now() - t, server: r.headers.get('server') || '' }; } catch (e) { return { ok: false, status: 0, ms: Date.now() - t, error: String(e.message || e) }; } })(), 10000),
  ]);
  site.ns = ns || [];
  const nsText = site.ns.join(' ');
  site.host = /vercel-dns/.test(nsText) || /vercel/i.test(live?.server || '') ? 'vercel'
    : /netlify/.test(nsText) ? 'netlify' : /cloudflare/.test(nsText) ? 'cloudflare' : /github/i.test(live?.server || '') ? 'github-pages' : '';
  if (rdap) {
    const ev = a => (rdap.events || []).find(e => e.eventAction === a)?.eventDate?.slice(0, 10) || '';
    site.expires = ev('expiration'); site.created = ev('registration');
    const reg = (rdap.entities || []).find(e => (e.roles || []).includes('registrar'));
    site.registrar = reg?.vcardArray?.[1]?.find(x => x[0] === 'fn')?.[3] || '';
  }
  site.live = live || { ok: false, status: 0, ms: 0, error: 'No answer in 10 seconds' };
  return site;
}

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
    const offRemote = Number((await exec('/usr/bin/git', ['rev-list', '--count', 'HEAD', '--not', '--remotes'], dir)).trim()) || 0;
    git = {
      branch: m?.[1] || '', upstream: m?.[2] || '', ahead: Math.max(ahead, remote ? offRemote : 0), behind,
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
      text.split(/\r?\n/).forEach(line => {   // Windows line endings too
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
  // Top-level source and setup notes too, for projects that are a plain server
  let rootSrc = '', notes = '';
  try {
    for (const f of await fs.readdir(dir)) {
      const full = path.join(dir, f);
      if (/\.(js|mjs|ts|py)$/.test(f) && !/test|mock|soak/i.test(f)) { const st = await fs.stat(full).catch(() => null); if (st && st.size < 400000) rootSrc += await fs.readFile(full, 'utf8').catch(() => ''); }
      if (/^(README|DEPLOY|\.env\.example)/i.test(f) || f === 'render.yaml') notes += await fs.readFile(full, 'utf8').catch(() => '');
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
    anthropic: /ANTHROPIC/.test(keyNames) || /api\.anthropic\.com/.test(rootSrc + fnSrc),
    meta: /WHATSAPP|META_APP/.test(keyNames) || /graph\.facebook\.com/.test(rootSrc + fnSrc),
    ecwid: /ECWID/.test(keyNames) || /ecwid\.com/.test(rootSrc),
    redis: !!deps.redis || !!deps.ioredis || /REDIS_URL/.test(keyNames),
    render: /onrender\.com|render\.com/i.test(notes) || await exists(path.join(dir, 'render.yaml')),
    groq: /GROQ/.test(keyNames), groqCalled: /api\.groq\.com|groq-sdk/.test(rootSrc + fnSrc) || !!deps['groq-sdk'],
  };

  const scripts = Object.keys(pkg?.scripts || {}), fnScripts = Object.keys(fnPkg?.scripts || {});
  const checks = Object.entries(CHECKS)
    .filter(([, c]) => (!c.script || scripts.includes(c.script)) && (!c.fnScript || fnScripts.includes(c.fnScript)))
    .filter(([id]) => isRepo || !id.startsWith('git-'))
    .map(([id, c]) => ({ id, label: c.label, cmd: c.cmd }));

  return {
    ok: true, dir, name: pkg?.name || path.basename(dir),
    firebaseProject: rc?.projects?.default || '',
    git, secrets, files, docs, checks, uses, site: await siteInfo(dir),
    has: { vercel: await exists(path.join(dir, 'vercel.json')) || await exists(path.join(dir, '.vercel', 'project.json')), expo: await exists(path.join(dir, 'eas.json')) || !!pkg?.dependencies?.expo, ci: await exists(path.join(dir, '.github', 'workflows')), functions: !!fnPkg },
  };
}

// ── Firestore, read-only, through the Firebase CLI's login ──────────────────
const CLI_CONFIG = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
// The CLI saves a one-hour access token and a long-lived refresh token. When
// the access token runs out, renew it the way the CLI itself does (Google's
// token endpoint with the CLI's public client id), and keep the new one in
// memory only. If that fails, fall back to letting the CLI refresh its file.
// Firebase CLI's public OAuth client (lib/api.js in firebase-tools); not a secret
const CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
let fresh = null; // { token, until } measured on this Mac's own clock
async function renew(refreshToken) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLI_CLIENT_ID, client_secret: CLI_CLIENT_SECRET }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw Object.assign(new Error(j.error_description || j.error || `HTTP ${r.status}`), { reauth: j.error === 'invalid_grant' });
  fresh = { token: j.access_token, until: Date.now() + (Number(j.expires_in) || 3600) * 1000 - 5 * 60000 };
  return fresh.token;
}
async function cliToken(forceRefresh) {
  if (!forceRefresh && fresh && Date.now() < fresh.until) return fresh.token;
  let cfg = await readJson(CLI_CONFIG);
  const stale = !cfg?.tokens?.access_token || (cfg.tokens.expires_at || 0) < Date.now() + 5 * 60000;
  if (!stale && !forceRefresh) return cfg.tokens.access_token;
  if (cfg?.tokens?.refresh_token) {
    try { return await renew(cfg.tokens.refresh_token); }
    catch (e) { if (e.reauth) { fresh = null; return null; } }
  }
  // Fallback: any CLI call refreshes the saved token
  await new Promise(resolve => { const p = spawn(SHELL, ['-lc', 'firebase projects:list >/dev/null 2>&1']); p.on('close', resolve); p.on('error', resolve); });
  cfg = await readJson(CLI_CONFIG);
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
  // The control room's read-only snapshot of a live service (see ops.js)
  ipcMain.handle('venture:ops', (_e, { project, dir } = {}) => ops(project, dir, cliToken));
  // The control room's only writes, through Runner's own checked endpoint
  ipcMain.handle('venture:ownerAction', (_e, { project, body } = {}) => ownerAction(project, cliToken, body));
  ipcMain.handle('venture:findOrder', (_e, { project, query } = {}) => findOrder(project, cliToken, query));
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

module.exports = { register, cliToken };
