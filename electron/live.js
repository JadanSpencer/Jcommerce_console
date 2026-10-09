// electron/live.js
// Live cost figures for the services a venture runs on. Read-only.
//   - Anthropic: the organisation's real cost per day (needs an Admin key)
//   - Render: the plan each service is on, so the fixed monthly price is exact
//     (needs an API key)
//   - Google Cloud: real cost per day by service, read from the billing export
//     in BigQuery with this Mac's existing Firebase CLI login (needs the
//     export switched on once in Google Cloud)
// Keys are encrypted with the Mac's Keychain (Electron safeStorage) and kept in
// this app's own data folder. They are never sent to the window, the database
// or the repository: the window can only ask "is one set?" and "fetch".
const { ipcMain, safeStorage, app } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const KEY_IDS = ['anthropic', 'render'];
const keyFile = () => path.join(app.getPath('userData'), 'live-keys.json');
const cfgFile = () => path.join(app.getPath('userData'), 'live-config.json');
const readJson = async f => { try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return {}; } };

async function getKey(id) {
  const blob = (await readJson(keyFile()))[id];
  if (!blob || !safeStorage.isEncryptionAvailable()) return null;
  try { return safeStorage.decryptString(Buffer.from(blob, 'base64')); } catch { return null; }
}
async function setKey(id, value) {
  if (!KEY_IDS.includes(id)) return { ok: false, error: 'Unknown key' };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'This Mac cannot encrypt the key right now' };
  const all = await readJson(keyFile());
  const clean = String(value || '').trim();
  if (clean) all[id] = safeStorage.encryptString(clean).toString('base64'); else delete all[id];
  await fs.writeFile(keyFile(), JSON.stringify(all), { mode: 0o600 });
  return { ok: true };
}
const status = async () => { const all = await readJson(keyFile()); return Object.fromEntries(KEY_IDS.map(id => [id, !!all[id]])); };

const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); };
const dayKey = d => d.toISOString().slice(0, 10);
const tidy = (days, extra = {}) => {
  const list = Object.entries(days).map(([date, amount]) => ({ date, amount: Math.round(amount * 10000) / 10000 })).sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, fetchedAt: Date.now(), mtd: Math.round(list.reduce((t, x) => t + x.amount, 0) * 100) / 100, days: list, ...extra };
};

// ── Anthropic: cost report, one bucket a day, amounts come in cents ──────────
async function anthropic() {
  const key = await getKey('anthropic');
  if (!key) return { ok: false, needs: 'key' };
  const days = {}, byModel = {};
  let page = '';
  try {
    for (let i = 0; i < 4; i++) {
      const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(monthStart().toISOString())}&bucket_width=1d&limit=31&group_by[]=description${page ? `&page=${encodeURIComponent(page)}` : ''}`;
      const r = await fetch(url, { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: r.status === 401 || r.status === 403 ? 'Anthropic refused the key. It must be an Admin key (sk-ant-admin…), which only organisation accounts can create.' : (j?.error?.message || `Anthropic answered ${r.status}`) };
      (j.data || []).forEach(b => (b.results || []).forEach(x => {
        const usd = (Number(x.amount) || 0) / 100, d = String(b.starting_at).slice(0, 10);
        days[d] = (days[d] || 0) + usd;
        const m = x.model || x.cost_type || 'other'; byModel[m] = (byModel[m] || 0) + usd;
      }));
      if (!j.has_more || !j.next_page) break;
      page = j.next_page;
    }
    return tidy(days, { currency: 'USD', parts: Object.entries(byModel).map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount).slice(0, 5) });
  } catch (e) { return { ok: false, error: e.message || 'Could not reach Anthropic' }; }
}

// ── Render: which plan each service is on ────────────────────────────────────
// US$ a month. From Render's published plans; checked from memory, not from an
// API (Render does not expose prices or invoices), so the window says so.
const RENDER_WEB = { free: 0, starter: 7, standard: 25, pro: 85, pro_plus: 175, pro_max: 225, pro_ultra: 450 };
const RENDER_KV = { free: 0, starter: 10, standard: 32, pro: 135, pro_plus: 250 };
async function render() {
  const key = await getKey('render');
  if (!key) return { ok: false, needs: 'key' };
  const get = async p => { const r = await fetch(`https://api.render.com/v1/${p}`, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } }); return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) }; };
  try {
    const sv = await get('services?limit=100');
    if (!sv.ok) return { ok: false, error: sv.status === 401 ? 'Render refused the key.' : `Render answered ${sv.status}` };
    const items = (sv.body || []).map(w => w.service).filter(Boolean).map(x => {
      const plan = String(x.serviceDetails?.plan || (x.type === 'static_site' ? 'free' : '')).toLowerCase();
      return { name: x.name, kind: String(x.type || '').replace(/_/g, ' '), plan: plan || 'unknown', usd: plan in RENDER_WEB ? RENDER_WEB[plan] : null, down: x.suspended === 'suspended' };
    });
    let kv = await get('key-value?limit=100');
    if (!kv.ok) kv = await get('redis?limit=100');
    if (kv.ok) (kv.body || []).map(w => w.keyValue || w.redis).filter(Boolean).forEach(x => {
      const plan = String(x.plan || '').toLowerCase();
      items.push({ name: x.name, kind: 'key value', plan: plan || 'unknown', usd: plan in RENDER_KV ? RENDER_KV[plan] : null, down: x.status && x.status !== 'available' });
    });
    return { ok: true, fetchedAt: Date.now(), currency: 'USD', items, monthly: items.reduce((t, x) => t + (x.usd || 0), 0), unknown: items.filter(x => x.usd === null).length };
  } catch (e) { return { ok: false, error: e.message || 'Could not reach Render' }; }
}

// ── Google Cloud: the billing export in BigQuery ─────────────────────────────
async function gcp(project, cliToken) {
  if (!/^[a-z0-9-]+$/.test(project || '')) return { ok: false, error: 'No Google project for this venture' };
  const token = await cliToken(false);
  if (!token) return { ok: false, error: 'Not signed in to the Firebase CLI on this Mac.' };
  const call = async (url, body) => {
    const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
  };
  try {
    const cfg = await readJson(cfgFile());
    let table = cfg.gcpTable?.[project];
    if (!table) {
      const ds = await call(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/datasets?maxResults=50`);
      if (!ds.ok) return { ok: false, needs: 'export', error: ds.body?.error?.message || `BigQuery answered ${ds.status}` };
      for (const d of ds.body.datasets || []) {
        const id = d.datasetReference.datasetId;
        const tb = await call(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/datasets/${id}/tables?maxResults=200`);
        const hit = (tb.body.tables || []).find(t => /^gcp_billing_export_v1_/.test(t.tableReference.tableId));
        if (hit) { table = `${project}.${id}.${hit.tableReference.tableId}`; break; }
      }
      if (!table) return { ok: false, needs: 'export' };
      await fs.writeFile(cfgFile(), JSON.stringify({ ...cfg, gcpTable: { ...(cfg.gcpTable || {}), [project]: table } }));
    }
    const sql = `SELECT FORMAT_DATE('%F', DATE(usage_start_time)) AS d, service.description AS s,
        SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS cost, ANY_VALUE(currency) AS cur
      FROM \`${table}\` WHERE project.id = '${project}' AND usage_start_time >= TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), MONTH)
      GROUP BY d, s ORDER BY d`;
    const q = await call(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`, { query: sql, useLegacySql: false, timeoutMs: 20000 });
    if (!q.ok) return { ok: false, error: q.body?.error?.message || `BigQuery answered ${q.status}` };
    const days = {}, parts = {}; let currency = 'USD';
    (q.body.rows || []).forEach(r => {
      const [d, s, cost, cur] = r.f.map(x => x.v);
      days[d] = (days[d] || 0) + Number(cost); parts[s] = (parts[s] || 0) + Number(cost); if (cur) currency = cur;
    });
    return tidy(days, { currency, parts: Object.entries(parts).map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 })).filter(x => Math.abs(x.amount) >= 0.01).sort((a, b) => b.amount - a.amount) });
  } catch (e) { return { ok: false, error: e.message || 'Could not read the billing export' }; }
}

function register(cliToken) {
  ipcMain.handle('live:status', () => status());
  ipcMain.handle('live:setKey', (_e, { id, value }) => setKey(id, value));
  ipcMain.handle('live:fetch', (_e, { source, project }) => (source === 'anthropic' ? anthropic() : source === 'render' ? render() : source === 'gcp' ? gcp(project, cliToken) : { ok: false, error: 'Unknown source' }));
}

module.exports = { register };
