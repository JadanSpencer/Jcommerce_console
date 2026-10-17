// electron/ops.js
// Runner control room: a read-only snapshot of how Runner is running. It reads
// Runner's database and Google's own status pages with this Mac's Firebase CLI
// login, the same way venture.js does. It never writes, never deploys and never
// stores a key.
//
// Personal data: orders are read without names, phone numbers, emails or
// addresses. The only personal fields read are a runner's name and phone (the
// owner has to be able to call them) and admin emails (the admin list).
//
// Cost: every Runner document read is billed. Checks run at three speeds:
//   fast    every refresh (kept at least a minute): open orders, today's orders and money
//   medium  every 10 minutes: stores, runners, floats, admins, Google's status pages
//   slow    every hour: the last 7 days of orders, sign-ups and menus
// Finished days are therefore read about once an hour, not on every refresh.

const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const dns = require('dns').promises;

// Firebase Hosting's address for custom domains: the domain's A record must
// point here directly (Cloudflare's proxy, the orange cloud, breaks it).
const FIREBASE_HOSTING_IP = '199.36.158.100';
// Two callable functions, asked without signing in: a running server says
// "sign in first" (4xx); a stopped one (billing closed, outage) says 5xx.
const PROBE_FUNCTIONS = ['claimLaunchCode', 'myReferral'];
const FAST_MS = 60 * 1000, MEDIUM_MS = 10 * 60 * 1000, SLOW_MS = 60 * 60 * 1000, MENU_MS = 6 * 60 * 60 * 1000;
const SCHEDULER_REGION = 'us-central1'; // where Firebase puts scheduled jobs unless told otherwise
const JAMAICA_OFFSET_MS = -5 * 60 * 60 * 1000; // no daylight saving
const dayStart = now => Math.floor((now + JAMAICA_OFFSET_MS) / 86400000) * 86400000 - JAMAICA_OFFSET_MS;

const fromValue = v => {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return null;
};
const num = n => ({ integerValue: String(n) });
const str = s => ({ stringValue: s });
const cmp = (fieldPath, op, value) => ({ fieldFilter: { field: { fieldPath }, op, value } });
const all = filters => (filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } });
const oneOf = list => ({ arrayValue: { values: list.map(str) } });

const BASE = project => `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const unauthorized = () => Object.assign(new Error('unauthorized'), { code: 401 });

// One query. `rows` also carry `movedAt`: when the document last changed.
async function query(project, token, { collectionId, allDescendants, where, orderBy, fields, limit }) {
  const body = { structuredQuery: {
    from: [{ collectionId, ...(allDescendants ? { allDescendants: true } : {}) }],
    select: { fields: fields.map(fieldPath => ({ fieldPath })) },
    ...(where ? { where } : {}),
    ...(orderBy ? { orderBy: [{ field: { fieldPath: orderBy }, direction: 'DESCENDING' }] } : {}),
    limit,
  } };
  const r = await fetch(`${BASE(project)}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 401) throw unauthorized();
  const out = await r.json();
  if (!Array.isArray(out)) throw new Error(out?.error?.message || 'Query failed');
  const rows = out.filter(x => x.document).map(x => ({
    id: x.document.name.split('/').pop(),
    parent: x.document.name.split('/').slice(-3, -2)[0],
    movedAt: Date.parse(x.document.updateTime) || null,
    ...Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, fromValue(v)])),
  }));
  return { rows, hitLimit: rows.length >= limit };
}
async function getDoc(project, token, docPath) {
  const r = await fetch(`${BASE(project)}/${docPath}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw unauthorized();
  const serverNow = Date.parse(r.headers.get('date') || '') || null;
  if (r.status === 404) return { doc: null, serverNow };
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  return { doc: Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, fromValue(v)])), serverNow };
}
// A Google status page (read-only GET or a read-only POST such as a log search)
async function google(token, project, url, body) {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (r.status === 401) throw unauthorized();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status, disabled: j?.error?.details?.some?.(d => d.reason === 'SERVICE_DISABLED') });
  return j;
}

// A part that failed is reported as failed. It is never turned into "none".
const part = async job => {
  try { return { ok: true, ...(await job()) }; }
  catch (e) { if (e.code === 401) throw e; return { ok: false, error: e.message || 'Could not check', disabled: !!e.disabled }; }
};

const ORDER_FIELDS = ['status', 'paymentStatus', 'paymentMethod', 'fulfilment', 'storeId', 'storeName', 'totalAmount', 'deliveryFee', 'platformFeeJmd', 'dasherPayoutJmd',
  'createdAt', 'verifiedAt', 'acceptedAt', 'paidAt', 'deliveredAt', 'readyAt', 'cancelledAt', 'cancelReason', 'deliveryMins', 'payDeadline',
  'storeAskedAt', 'storeAnswerBy', 'receipt.code', 'dasherId', 'refundAttemptFailed', 'refundAttemptReason', 'groupId', 'deliveryDiscountJmd'];
// The order code is what everyone uses to talk about an order
const tidyOrder = ({ receipt, ...o }) => ({ ...o, code: receipt?.code || o.id.slice(-6).toUpperCase(), hasRunner: !!o.dasherId });

// ── Runner's own folder: its lists, its web address, its newest code ──────
// shared.ts holds every status, reason and time limit. They are read from
// there so the control room can't drift from what Runner actually does.
async function sharedLists(dir) {
  const src = await fs.readFile(path.join(dir, 'functions', 'src', 'shared.ts'), 'utf8');
  const union = name => {
    const m = new RegExp(`export type ${name} =([\\s\\S]*?);`).exec(src);
    if (!m) return null;
    return [...m[1].replace(/\/\/.*$/gm, '').matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
  };
  const limits = {};
  for (const m of src.matchAll(/export const ([A-Z_]+_(?:MS|JMD|SIZE|WAVE))\s*=\s*([\d\s*+.]+);/g)) {
    if (/^[\d\s*+.]+$/.test(m[2])) limits[m[1]] = m[2].split('+').reduce((t, term) => t + term.split('*').reduce((p, f) => p * Number(f), 1), 0);
  }
  for (const m of src.matchAll(/export const (MAX_ACTIVE_ORDERS|TOKEN_JMD|PLATFORM_TAKE_RATE)\s*=\s*([\d.]+);/g)) limits[m[1]] = Number(m[2]);
  return { orderStatus: union('OrderStatus'), paymentStatus: union('PaymentStatus'), cancelReason: union('CancelReason'), limits };
}
// Only the public web address is taken from Runner's settings file; every
// other line in it is ignored and nothing from it leaves this function.
async function appUrl(dir, project) {
  for (const f of [`.env.${project}`, '.env']) {
    const text = await fs.readFile(path.join(dir, 'functions', f), 'utf8').catch(() => '');
    const m = /^\s*APP_URL\s*=\s*["']?(https:\/\/[A-Za-z0-9.-]+(?::\d+)?)\/?["']?\s*$/m.exec(text);
    if (m) return m[1];
  }
  return null;
}
const git = (dir, args) => new Promise(resolve => execFile('git', args, { cwd: dir, timeout: 8000 }, (err, out) => resolve(err ? null : String(out).trim())));
async function newestCode(dir) {
  const line = await git(dir, ['log', '-1', '--format=%ct|%s', 'main']) || await git(dir, ['log', '-1', '--format=%ct|%s']);
  if (!line) throw new Error('Could not read the Runner folder\'s history');
  const [t, ...msg] = line.split('|');
  return { at: Number(t) * 1000, message: msg.join('|').slice(0, 140) };
}

// ── The three speeds ──────────────────────────────────────────────────────
async function fast(project, token, ctx) {
  const { now, today, siteUrl } = ctx;
  const q = spec => part(() => query(project, token, spec));
  const orders = spec => part(async () => { const r = await query(project, token, spec); return { rows: r.rows.map(tidyOrder), hitLimit: r.hitLimit }; });
  const PAY = ['status', 'purpose', 'amountJmd', 'createdAt', 'orderId', 'failReason', 'reviewReason', 'returnVerifiedAt'];
  const [ordersActive, ordersToday, paymentsOpen, paymentsToday, walletToday, floatToday, site, scheduler, server] = await Promise.all([
    // Anything still open, whatever day it was placed
    orders({ collectionId: 'orders', where: cmp('status', 'IN', oneOf(['pending', 'accepted', 'picking_up', 'on_the_way'])), fields: ORDER_FIELDS, limit: 150 }),
    orders({ collectionId: 'orders', where: cmp('createdAt', 'GREATER_THAN_OR_EQUAL', num(today)), orderBy: 'createdAt', fields: ORDER_FIELDS, limit: 800 }),
    // The same list Runner admin shows under "Card payments to check", plus confirmed-but-not-applied
    q({ collectionId: 'payments', where: cmp('status', 'IN', oneOf(['pending', 'review', 'verified'])), orderBy: 'createdAt', fields: PAY, limit: 50 }),
    q({ collectionId: 'payments', where: cmp('createdAt', 'GREATER_THAN_OR_EQUAL', num(today - 3600000)), orderBy: 'createdAt', fields: PAY, limit: 500 }),
    // Coin movements today; the note is only kept for top-ups an admin made by hand
    part(async () => { const r = await query(project, token, { collectionId: 'walletTx', where: cmp('createdAt', 'GREATER_THAN_OR_EQUAL', num(today)), orderBy: 'createdAt', fields: ['type', 'orderId', 'amountJmd', 'createdAt', 'note', 'paymentId'], limit: 1500 });
      return { rows: r.rows.map(({ note, ...t }) => (t.type === 'admin_adjust' ? { ...t, note: String(note || '').slice(0, 120) } : t)), hitLimit: r.hitLimit }; }),
    q({ collectionId: 'floatTx', where: cmp('createdAt', 'GREATER_THAN_OR_EQUAL', num(today)), orderBy: 'createdAt', fields: ['kind', 'targetId', 'orderId', 'amountJmd', 'note', 'createdAt', 'by'], limit: 1000 }),
    part(async () => {
      const url = siteUrl;
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 10000);
      try { const t0 = Date.now(); const r = await fetch(url, { signal: ctl.signal, redirect: 'follow' }); return { url, status: r.status, ms: Date.now() - t0 }; }
      catch (e) { return { url, status: 0, down: e.name === 'AbortError' ? 'It took more than 10 seconds to answer' : 'It did not answer' }; }
      finally { clearTimeout(timer); }
    }),
    part(async () => {
      const j = await google(token, project, `https://cloudscheduler.googleapis.com/v1/projects/${project}/locations/${SCHEDULER_REGION}/jobs?pageSize=50`);
      return { jobs: (j.jobs || []).map(x => ({ name: x.name.split('/').pop(), state: x.state, lastRunAt: Date.parse(x.lastAttemptTime) || null, failed: !!(x.status && x.status.code) })) };
    }),
    // Is the server answering at all? (On 16 Oct 2026 a declined card closed the
    // billing account and every function returned 503 while billing still
    // said "enabled".) No sign-in is sent, so nothing runs past the door.
    part(async () => {
      const ask = async name => {
        const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 10000);
        try {
          const r = await fetch(`https://${SCHEDULER_REGION}-${project}.cloudfunctions.net/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}', signal: ctl.signal });
          return { name, status: r.status };
        } catch { return { name, status: 0 }; } finally { clearTimeout(timer); }
      };
      const answers = await Promise.all(PROBE_FUNCTIONS.map(ask));
      return { answers, up: answers.filter(a => a.status > 0 && a.status < 500).length, asked: answers.length };
    }),
  ]);
  return { ordersActive, ordersToday, paymentsOpen, paymentsToday, walletToday, floatToday, site, scheduler, server, at: now };
}

async function medium(project, token, ctx, dir) {
  const { now } = ctx;
  const q = spec => part(() => query(project, token, spec));
  const g = (url, body) => google(token, project, url, body);
  const hourAgo = new Date(now - 3600000).toISOString();
  const logs = filter => g('https://logging.googleapis.com/v2/entries:list', { resourceNames: [`projects/${project}`], filter: `${filter} AND timestamp>="${hourAgo}"`, orderBy: 'timestamp desc', pageSize: 100 });
  const firstLine = e => String(e.jsonPayload?.message || e.textPayload || '').split('\n')[0].slice(0, 160);
  // Runner's own address comes from its settings file, not from the last check
  const address = await appUrl(dir, project).catch(() => null) || ctx.siteUrl;
  const siteHost = (() => { try { return new URL(address).hostname; } catch { return null; } })();
  const hosts = [...new Set([siteHost, `${project}.web.app`].filter(Boolean))];
  const [stores, storeFloats, dashers, runners, storeLogins, admins, errors, pushes, release, functions, policies, billing, backups, lists, url, code,
    launchCodes, freeDeliveries, domains, signInHosts] = await Promise.all([
    q({ collectionId: 'stores', fields: ['name', 'isOpen', 'hours', 'model', 'colorNo', 'estimatedTime', 'offersPickup', 'pickupPointId'], limit: 150 }),
    q({ collectionId: 'storeFloats', fields: ['floatJmd'], limit: 150 }),
    q({ collectionId: 'dashers', fields: ['isOnline', 'floatJmd', 'lastSeenAt', 'offlineReason', 'offlineAt', 'activeOrderId', 'activeOrderIds'], limit: 400 }),
    // Runners: name and phone are read so the owner can call them; nothing else personal
    q({ collectionId: 'users', where: cmp('role', 'EQUAL', str('dasher')), fields: ['name', 'phone', 'dasherStatus', 'createdAt', 'isActive'], limit: 400 }),
    // Store tablet logins: which store, switched on, and whether the tablet can get alerts (yes or no only)
    part(async () => { const r = await query(project, token, { collectionId: 'users', where: cmp('role', 'EQUAL', str('store')), fields: ['storeId', 'storeName', 'isActive', 'pushToken'], limit: 200 });
      return { rows: r.rows.map(({ pushToken, ...u }) => ({ ...u, canNotify: !!pushToken })), hitLimit: r.hitLimit }; }),
    q({ collectionId: 'users', where: cmp('role', 'EQUAL', str('admin')), fields: ['email', 'isActive', 'createdAt'], limit: 50 }),
    part(async () => { const j = await logs('severity>=ERROR'); return { rows: (j.entries || []).map(e => ({ at: Date.parse(e.timestamp), where: e.resource?.labels?.service_name || e.resource?.labels?.function_name || e.resource?.type || '', text: firstLine(e) })), more: !!j.nextPageToken }; }),
    part(async () => { const j = await logs('(jsonPayload.message:"Dead web push token" OR jsonPayload.message:"push failed" OR jsonPayload.message:"Push notification failed" OR jsonPayload.message:"push batch failed")');
      const rows = (j.entries || []).map(e => firstLine(e)); return { dead: rows.filter(t => /Dead/i.test(t)).length, failed: rows.filter(t => !/Dead/i.test(t)).length, more: !!j.nextPageToken }; }),
    part(async () => { const j = await g(`https://firebasehosting.googleapis.com/v1beta1/sites/${project}/releases?pageSize=1`); const r = (j.releases || [])[0];
      return r ? { at: Date.parse(r.releaseTime), message: r.message || '', by: r.releaseUser?.email || '', type: r.type } : { at: null }; }),
    part(async () => { const j = await g(`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions?pageSize=200`);
      return { names: (j.functions || []).map(f => f.name.split('/').pop()), at: Math.max(0, ...(j.functions || []).map(f => Date.parse(f.updateTime) || 0)) || null }; }),
    part(async () => { const j = await g(`https://monitoring.googleapis.com/v3/projects/${project}/alertPolicies?pageSize=50`);
      return { rows: (j.alertPolicies || []).map(a => ({ name: a.displayName, on: a.enabled !== false, emails: (a.notificationChannels || []).length })) }; }),
    // "Enabled" only says a billing account is linked. The account itself can be
    // closed (a declined card), which stops the server all the same.
    part(async () => {
      const j = await g(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`);
      const account = (j.billingAccountName || '').split('/').pop();
      let open = null;
      if (account) { try { open = (await g(`https://cloudbilling.googleapis.com/v1/billingAccounts/${account}`)).open !== false; } catch { open = null; } }
      return { enabled: !!j.billingEnabled, account, open };
    }),
    part(async () => {
      const [b, s] = await Promise.all([g(`https://firestore.googleapis.com/v1/projects/${project}/locations/-/backups`), g(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/backupSchedules`)]);
      const ready = (b.backups || []).filter(x => x.state === 'READY').map(x => Date.parse(x.snapshotTime)).filter(Boolean);
      return { last: ready.length ? Math.max(...ready) : null, scheduled: (s.backupSchedules || []).length > 0 };
    }),
    part(() => sharedLists(dir)),
    part(async () => ({ url: await appUrl(dir, project) })),
    part(() => newestCode(dir)),
    // Launch codes: only when each was made and used. Who used it is not read.
    q({ collectionId: 'launchCodes', fields: ['createdAt', 'usedAt'], limit: 200 }),
    // Free deliveries students still hold (launch packs and referral rewards)
    q({ collectionId: 'wallets', where: cmp('freeDeliveries', 'GREATER_THAN', num(0)), fields: ['freeDeliveries'], limit: 3000 }),
    // The site's own domain: Firebase's view of it, and where its DNS really points
    part(async () => {
      const j = await g(`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${project}/customDomains`);
      const rows = await Promise.all((j.customDomains || []).map(async d => {
        const name = d.name.split('/').pop();
        const ips = await dns.resolve4(name).catch(() => []);
        return { name, host: d.hostState || '', ownership: d.ownershipState || '', cert: d.cert?.state || '', ips, direct: ips.includes(FIREBASE_HOSTING_IP) };
      }));
      return { rows };
    }),
    // Every Runner address must be allowed for sign-in and for the bot check, or
    // Google sign-in hangs and the database refuses the app on that address
    part(async () => {
      const [auth, keys] = await Promise.all([
        g(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`),
        g(`https://recaptchaenterprise.googleapis.com/v1/projects/${project}/keys?pageSize=50`),
      ]);
      const web = (keys.keys || []).filter(k => k.webSettings);
      return { hosts, missing: hosts.map(h => ({ host: h,
        signIn: !(auth.authorizedDomains || []).includes(h),
        botCheck: web.length > 0 && !web.some(k => k.webSettings.allowAllDomains || (k.webSettings.allowedDomains || []).includes(h)),
      })).filter(m => m.signIn || m.botCheck) };
    }),
  ]);
  return { stores, storeFloats, dashers, runners, storeLogins, admins, errors, pushes, release, functions, policies, billing, backups, lists, url, code,
    launchCodes, freeDeliveries, domains, signInHosts, at: now };
}

async function slow(project, token, ctx) {
  const { now, today } = ctx;
  const since = today - 7 * 86400000;
  const [ordersWeek, signups, appCheck, budgets] = await Promise.all([
    part(async () => {
      const r = await query(project, token, { collectionId: 'orders', where: all([cmp('createdAt', 'GREATER_THAN_OR_EQUAL', num(since)), cmp('createdAt', 'LESS_THAN', num(today))]), orderBy: 'createdAt',
        fields: ['status', 'storeId', 'storeName', 'totalAmount', 'deliveryFee', 'platformFeeJmd', 'dasherPayoutJmd', 'createdAt', 'acceptedAt', 'paidAt', 'deliveredAt', 'deliveryMins', 'cancelReason', 'fulfilment', 'dasherId', 'studentId', 'receipt.code', 'paymentMethod', 'paymentStatus', 'refundAttemptFailed', 'refundAttemptReason'], limit: 3000 });
      return { rows: r.rows.map(({ movedAt, ...o }) => tidyOrder(o)), hitLimit: r.hitLimit };
    }),
    // Sign-ups: only when each account was made and what kind it is
    part(() => query(project, token, { collectionId: 'users', where: cmp('createdAt', 'GREATER_THAN_OR_EQUAL', num(since)), orderBy: 'createdAt', fields: ['role', 'createdAt'], limit: 2000 })),
    // App Check: share of requests that carried valid proof, last 7 days, per service
    part(async () => {
      const qs = new URLSearchParams({ filter: 'metric.type="firebaseappcheck.googleapis.com/services/verification_count"', 'interval.startTime': new Date(now - 7 * 86400000).toISOString(), 'interval.endTime': new Date(now).toISOString(),
        'aggregation.alignmentPeriod': '604800s', 'aggregation.perSeriesAligner': 'ALIGN_SUM', 'aggregation.crossSeriesReducer': 'REDUCE_SUM' });
      qs.append('aggregation.groupByFields', 'metric.label.security'); qs.append('aggregation.groupByFields', 'resource.label.service_id');
      const [series, services] = await Promise.all([google(token, project, `https://monitoring.googleapis.com/v3/projects/${project}/timeSeries?${qs}`), google(token, project, `https://firebaseappcheck.googleapis.com/v1/projects/${project}/services`)]);
      const by = {};
      for (const t of series.timeSeries || []) {
        const s = t.resource?.labels?.service_id || 'other', n = (t.points || []).reduce((a, p) => a + Number(p.value?.int64Value || 0), 0);
        by[s] = by[s] || { valid: 0, total: 0 }; by[s].total += n; if (t.metric?.labels?.security === 'VALID') by[s].valid += n;
      }
      const enforced = Object.fromEntries((services.services || []).map(s => [s.name.split('/').pop(), s.enforcementMode === 'ENFORCED']));
      return { by, enforced };
    }),
    // Budgets live on the billing account; Google keeps this API off until someone switches it on
    part(async () => {
      const info = await google(token, project, `https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`);
      const acct = (info.billingAccountName || '').split('/').pop();
      if (!acct) return { rows: [] };
      const j = await google(token, project, `https://billingbudgets.googleapis.com/v1/billingAccounts/${acct}/budgets`);
      return { rows: (j.budgets || []).map(b => ({ name: b.displayName, amount: Number(b.amount?.specifiedAmount?.units || 0), currency: b.amount?.specifiedAmount?.currencyCode || '' })) };
    }),
  ]);
  return { ordersWeek, signups, appCheck, budgets, at: now };
}

async function menus(project, token, ctx) {
  // Every menu item, across stores, without descriptions. Read a few times a day.
  const items = await part(async () => {
    const r = await query(project, token, { collectionId: 'menuItems', allDescendants: true, fields: ['storeId', 'name', 'price', 'image', 'isAvailable', 'waitUntil', 'soldOutAt'], limit: 4000 });
    return { rows: r.rows.map(({ image, movedAt, ...m }) => ({ ...m, storeId: m.storeId || m.parent, hasPhoto: !!image })), hitLimit: r.hitLimit };
  });
  return { items, at: ctx.now };
}

// ── Putting it together ───────────────────────────────────────────────────
const cache = {}; // per project: { fast, medium, slow, menus, ...when }
let inFlight = null;
const reads = p => (p && p.ok && Array.isArray(p.rows) ? Math.max(1, p.rows.length) : 0);

async function snapshot(project, dir, token) {
  const c = cache[project] = cache[project] || {};
  const macNow = Date.now();
  // Google's clock, not this Mac's: Runner stamps everything with the server's time
  const stats = await part(() => getDoc(project, token, 'publicStats/app'));
  const now = (stats.ok && stats.serverNow) || macNow;
  const today = dayStart(now);
  const ctx = { now, today, siteUrl: c.medium?.url?.ok && c.medium.url.url ? `${c.medium.url.url}/` : `https://${project}.web.app/` };
  let read = stats.ok ? 1 : 0;
  const due = (key, ms) => !c[key] || macNow - c[`${key}At`] >= ms || c[`${key}Day`] !== today;
  if (due('medium', MEDIUM_MS)) { c.medium = await medium(project, token, ctx, dir); c.mediumAt = macNow; c.mediumDay = today;
    read += ['stores', 'storeFloats', 'dashers', 'runners', 'storeLogins', 'admins', 'launchCodes', 'freeDeliveries'].reduce((t, k) => t + reads(c.medium[k]), 0);
    if (c.medium.url.ok && c.medium.url.url) ctx.siteUrl = `${c.medium.url.url}/`; }
  if (due('slow', SLOW_MS)) { c.slow = await slow(project, token, ctx); c.slowAt = macNow; c.slowDay = today; read += reads(c.slow.ordersWeek) + reads(c.slow.signups); }
  if (due('menus', MENU_MS)) { c.menus = await menus(project, token, ctx); c.menusAt = macNow; c.menusDay = today; read += reads(c.menus.items); }
  const f = await fast(project, token, ctx);
  read += ['ordersActive', 'ordersToday', 'paymentsOpen', 'paymentsToday', 'walletToday', 'floatToday'].reduce((t, k) => t + reads(f[k]), 0);
  return {
    ok: true, project, dir, fetchedAt: now, clockOffMs: macNow - now, today, adminUrl: ctx.siteUrl.replace(/\/$/, ''), reads: read,
    ages: { medium: Math.round((macNow - c.mediumAt) / 1000), slow: Math.round((macNow - c.slowAt) / 1000), menus: Math.round((macNow - c.menusAt) / 1000) },
    parts: (({ at, ...p }) => p)({ stats, ...f, ...c.medium, ...c.slow, menuItems: c.menus.items }),
  };
}

async function ops(project, dir, cliToken) {
  if (!/^[a-z0-9-]+$/.test(project || '')) return { ok: false, fix: 'folder', error: 'No Firebase project was found in this venture\'s folder.' };
  try { await fs.access(path.join(dir || '', 'functions', 'src', 'shared.ts')); }
  catch { return { ok: false, fix: 'folder', error: `Runner's folder was not found at ${dir || '(no folder set)'}.` }; }
  const c = cache[project];
  if (c?.last && Date.now() - c.lastAt < FAST_MS) return { ...c.last, cached: true };
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      let token = await cliToken(false);
      if (!token) return { ok: false, fix: 'login', error: 'This Mac\'s Firebase sign-in has run out and Google would not renew it.' };
      let data;
      try { data = await snapshot(project, dir, token); }
      catch (e) { if (e.code !== 401) throw e; token = await cliToken(true); data = await snapshot(project, dir, token); }
      cache[project].last = data; cache[project].lastAt = Date.now();
      return data;
    } catch (e) {
      return e.code === 401 ? { ok: false, fix: 'login', error: 'Google did not accept this Mac\'s Firebase sign-in.' } : { ok: false, error: e.message || 'Could not read the live data' };
    } finally { inFlight = null; }
  })();
  return inFlight;
}

module.exports = { ops, snapshot, dayStart, sharedLists, FAST_MS };
