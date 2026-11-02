// src/backupDoc.js
// The readable Jcommerce document inside every backup: a summary, then every
// collection as a table. The raw data travels alongside it in the same
// encrypted file, so nothing is lost by what a table leaves out.

const SECTIONS = [
  ['finances', 'Money in and out'], ['invoices', 'Invoices and receipts'], ['debts', 'Debts'], ['budgets', 'Budgets'],
  ['leads', 'Clients and leads'], ['ventures', 'Ventures'], ['venture_items', 'Venture steps and notes'], ['venture_services', 'Venture services'],
  ['venture_checks', 'Venture daily checks'], ['service_rounds', 'Service rounds'], ['control_ticks', 'Control-room ticks'],
  ['goals', 'Goals'], ['todos', 'Tasks'], ['habits', 'Habits'], ['schedule', 'Schedule'], ['courses', 'Studies'],
  ['timers', 'Focus'], ['journal', 'Journal'], ['settings', 'Settings'],
];
// Columns worth reading first; anything else is still in the raw data
const PREFERRED = ['date', 'addedDate', 'due', 'dueDate', 'deadline', 'title', 'name', 'businessName', 'code', 'description', 'text',
  'type', 'kind', 'category', 'status', 'stage', 'priority', 'amount', 'total', 'value', 'direction', 'note'];
const SKIP = new Set(['id', 'createdAt', 'updatedAt', 'activity', 'completions', 'doneOn', 'items', 'lines']);
const MAX_COLS = 7;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isStamp = v => v && typeof v === 'object' && typeof v.seconds === 'number' && Object.keys(v).length <= 3;
const show = v => {
  if (v === null || v === undefined || v === '') return '';
  if (isStamp(v)) return new Date(v.seconds * 1000).toISOString().slice(0, 16).replace('T', ' ');
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return v.toLocaleString('en-US');
  if (typeof v === 'object') { const t = JSON.stringify(v); return t.length > 160 ? `${t.slice(0, 157)}…` : t; }
  const t = String(v); return t.length > 400 ? `${t.slice(0, 397)}…` : t;
};
const columns = rows => {
  const seen = new Set(); rows.forEach(r => Object.keys(r || {}).forEach(k => !SKIP.has(k) && seen.add(k)));
  const first = PREFERRED.filter(k => seen.has(k));
  return [...first, ...[...seen].filter(k => !first.includes(k)).sort()].slice(0, MAX_COLS);
};
const label = k => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const table = rows => {
  if (!rows.length) return '<p class="none">Nothing here yet.</p>';
  const cols = columns(rows);
  const sorted = [...rows].sort((a, b) => String(b.date || b.addedDate || b.due || '').localeCompare(String(a.date || a.addedDate || a.due || '')));
  return `<table><thead><tr>${cols.map(c => `<th>${esc(label(c))}</th>`).join('')}</tr></thead><tbody>${
    sorted.map(r => `<tr>${cols.map(c => `<td>${esc(show(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
};

export function backupDocument({ collections, exportedAt, logo = '', xp = null, level = null, ledger = [], runnerLocal = null, parts = [], money = null }) {
  const when = new Date(exportedAt);
  const total = Object.values(collections).reduce((t, x) => t + x.length, 0);
  const known = SECTIONS.filter(([k]) => collections[k]);
  const extra = Object.keys(collections).filter(k => !SECTIONS.some(([s]) => s === k)).map(k => [k, label(k)]);
  const all = [...known, ...extra];
  const card = (n, t) => `<div class="card"><b>${esc(n)}</b><span>${esc(t)}</span></div>`;
  const runnerTicks = runnerLocal ? Object.entries(runnerLocal.ticks || {}).filter(([, v]) => v).map(([k]) => k) : [];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Jcommerce backup ${esc(exportedAt.slice(0, 10))}</title>
<style>
body{margin:0;background:#f7f3ec;color:#1d1a16;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:1000px;margin:0 auto;padding:28px 16px 60px}
header{display:flex;gap:16px;align-items:center;border-bottom:2px solid #8a1c22;padding-bottom:14px;margin-bottom:20px}
header img{width:56px;height:56px;border-radius:8px;object-fit:cover}
h1{font-size:24px;margin:0}h2{font-size:18px;margin:34px 0 8px;padding-top:8px;border-top:1px solid #d9cfbf}
.sub{color:#6b6257;margin:2px 0 0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:14px 0}
.card{background:#fbf8f2;border:1px solid #d9cfbf;border-radius:6px;padding:10px 12px}.card b{display:block;font-size:20px}.card span{color:#6b6257;font-size:12px}
nav ol{columns:2;padding-left:20px;margin:8px 0}nav a{color:#8a1c22}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12.5px;background:#fbf8f2}
th,td{border:1px solid #d9cfbf;padding:5px 7px;text-align:left;vertical-align:top}th{background:#efe7da;font-weight:600}
.none{color:#6b6257}.count{color:#6b6257;font-weight:400;font-size:13px}
@media print{body{background:#fff}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><main>
<header>${logo ? `<img src="${logo}" alt="">` : ''}<div><h1>Jcommerce backup</h1>
<p class="sub">Everything in JCommerce Console, taken ${esc(when.toLocaleString('en-JM', { dateStyle: 'full', timeStyle: 'short' }))}. ${total.toLocaleString('en-US')} records.</p></div></header>
<div class="cards">
${xp !== null ? card(`${xp} XP`, `Level ${level}`) : ''}
${money ? card(money.net, 'Net, all time') + card(money.income, 'Income, all time') + card(money.expenses, 'Expenses, all time') : ''}
${card((collections.ventures || []).length, 'Ventures')}${card((collections.leads || []).length, 'Clients and leads')}${card((collections.invoices || []).length, 'Invoices')}
</div>
<nav><b>Contents</b><ol>${all.map(([k, t]) => `<li><a href="#${k}">${esc(t)}</a> (${collections[k].length})</li>`).join('')}
${ledger.length ? '<li><a href="#xp">XP by section</a></li>' : ''}${parts.length ? '<li><a href="#runner">Runner: accounts, keys and versions</a></li>' : ''}</ol></nav>
${all.map(([k, t]) => `<h2 id="${k}">${esc(t)} <span class="count">${collections[k].length}</span></h2><div class="wrap">${table(collections[k])}</div>`).join('\n')}
${ledger.length ? `<h2 id="xp">XP by section</h2><div class="wrap"><table><thead><tr><th>Section</th><th>XP</th><th>How it counts</th></tr></thead><tbody>${ledger.map(r => `<tr><td>${esc(r.k)}</td><td>${esc(r.net)}</td><td>${esc(r.how || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
${parts.length ? `<h2 id="runner">Runner: accounts, keys and versions</h2><p class="sub">As last checked by the developer. Key values are never stored, only names, dates and limits.</p>${parts.map(g => `<h3>${esc(g.title)}</h3><div class="wrap"><table><thead><tr><th>What</th><th>Details</th><th>State</th></tr></thead><tbody>${g.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.value || r.ask || '')}</td><td>${esc({ ok: 'Checked', look: 'Needs a look', ask: 'Question' }[r.status] || '')}</td></tr>`).join('')}</tbody></table></div>`).join('')}` : ''}
${runnerLocal ? `<h2>Runner control room on this Mac</h2><p class="sub">${runnerTicks.length} checklist jobs ticked; ${(runnerLocal.log || []).length} alert log lines. All of it is in the raw data.</p>` : ''}
</main></body></html>`;
}
