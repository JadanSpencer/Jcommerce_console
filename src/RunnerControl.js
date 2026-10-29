// src/RunnerControl.js
// The Runner control room: one screen that tells a person with no software
// background whether Runner needs them right now, and exactly what to do.
// Read-only. The reading is done by the Mac app (electron/ops.js), the judging
// by runnerOps.js. What is kept here (ticks, notes, the alert log, who is
// handling what) stays on this Mac and never goes to Runner.
import React, { useState, useEffect, useRef } from 'react';
import { judgeRunner, ago, J, plural, jmDate, jmTime, periodKey, ROUTINES, CANCEL_WORDS, STORE_STEPS, CLOSED_TEST_DAYS, CLOSED_TEST_TESTERS } from './runnerOps';
import './RunnerControl.css';

// Speed panel: seconds with one decimal, and a colour for good / so-so / slow
const secs = ms => (ms === null || ms === undefined ? '–' : `${(ms / 1000).toFixed(1)} s`);
const tone = (v, good, poor) => (v === null || v === undefined ? '' : v <= good ? 'rc-good' : v > poor ? 'rc-bad' : 'rc-meh');

const MIN = 60000;
const NORMAL_MS = 2 * MIN, LAUNCH_MS = MIN, GAP_MS = MIN; // never faster than once a minute
const REPEAT_RED_MS = 15 * MIN;
const KEY = 'jc_runner_local';
const SEAL = { good: '良', look: '注', act: '急' };                  // good, caution, urgent
const WORD = { act: 'Act now', look: 'Needs a look', unknown: "Couldn't check", info: 'Info' };
const INBOX = 'https://mail.google.com/mail/u/?authuser=jcommerceandtech@gmail.com';

// ── What is kept on this Mac ────────────────────────────────────────────────
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const local = { ticks: {}, routines: {}, resolved: {}, handling: {}, deletions: [], log: [], expectedAdmins: null, launch: false, watch: false, name: '', closedTestStart: '', ...load() };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...local, log: local.log.slice(-600) })); } catch {} };

// ── One watcher for the whole app ───────────────────────────────────────────
// The screen and the background watch share it, so Runner is never asked twice.
const store = { data: null, view: null, busy: false, last: 0, api: null, notify: null, project: '', dir: '', viewers: 0, timer: null, subs: new Set(), redSince: null, redNotified: 0 };
const emit = () => store.subs.forEach(f => f());
const every = () => (local.launch ? LAUNCH_MS : NORMAL_MS);
function judge() { store.view = store.data ? judgeRunner(store.data, local) : null; }
function setLocal(change) { Object.assign(local, typeof change === 'function' ? change(local) : change); save(); judge(); emit(); }
function addLog(entry) { local.log = [...local.log, { at: store.data?.fetchedAt || Date.now(), ...entry }].slice(-600); }

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 660, 880].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.22; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.start(t); o.stop(t + 0.22); });
  } catch {}
}
function afterRead(prev) {
  const v = store.view; if (!v) return;
  // The alert log: when each problem appeared and cleared
  const before = new Map((prev?.items || []).map(i => [i.key, i])), now = new Map((v.items || []).map(i => [i.key, i]));
  if (prev) {
    now.forEach((i, k) => { if (!before.has(k)) addLog({ key: k, lv: i.lv, event: 'appeared', what: i.what }); });
    before.forEach((i, k) => { if (!now.has(k)) addLog({ key: k, lv: i.lv, event: 'cleared', what: i.what }); });
  } else {
    addLog({ event: 'opened', what: `Control room started: ${v.headline}.` });
    now.forEach((i, k) => addLog({ key: k, lv: i.lv, event: 'appeared', what: i.what }));
  }
  save();
  // Getting the person's attention: a notification and a sound when it turns red, again every 15 minutes it stays red
  const t = Date.now();
  if (v.verdict === 'act') {
    if (!store.redSince) store.redSince = t;
    if (t - store.redNotified >= REPEAT_RED_MS) {
      store.redNotified = t;
      store.notify?.('Runner: act now', v.reason.slice(0, 220));
      chime();
    }
  } else { store.redSince = null; store.redNotified = 0; }
}
async function refresh() {
  if (!store.api?.ops || !store.project || store.busy) return;
  if (Date.now() - store.last < GAP_MS) return; // never faster than once a minute, even when asked
  store.busy = true; store.last = Date.now(); emit();
  const prev = store.view;
  try { store.data = await store.api.ops(store.project, store.dir); } catch (e) { store.data = { ok: false, error: e.message || 'The Mac app did not answer.' }; }
  store.gotAt = Date.now(); store.busy = false; judge(); afterRead(prev); emit();
}
function schedule() {
  clearTimeout(store.timer);
  if (!(store.viewers > 0 || local.watch)) return;
  store.timer = setTimeout(async () => { if (document.visibilityState === 'visible' || local.watch) await refresh(); schedule(); }, Math.max(GAP_MS, every() - (Date.now() - store.last)));
}
function configure({ api, project, dir, notify }) {
  if (api) store.api = api;
  if (notify) store.notify = notify;
  if (project && (project !== store.project || dir !== store.dir)) { store.project = project; store.dir = dir; store.data = null; store.view = null; try { localStorage.setItem('jc_runner_target', JSON.stringify({ project, dir })); } catch {} }
}
function useStore() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(n => n + 1); store.subs.add(f); return () => store.subs.delete(f); }, []);
  return store;
}

/** Mounted once by the app: keeps watching Runner while "Watch in the background" is on. */
export function RunnerWatch({ api, notify }) {
  useEffect(() => {
    let target = null; try { target = JSON.parse(localStorage.getItem('jc_runner_target')); } catch {}
    configure({ api, notify, ...(target || {}) });
    if (local.watch && store.project) { refresh(); schedule(); }
    return () => clearTimeout(store.timer);
  }, [api, notify]);
  return null;
}

// ── Small pieces ────────────────────────────────────────────────────────────
function Help({ children }) {
  return <details className="rc-help"><summary>What does this mean?</summary><p>{children}</p></details>;
}
const Go = ({ link }) => (link ? <a className="btn-ghost rc-go" href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a> : null);
const ext = (label, url) => <a href={url} target="_blank" rel="noreferrer">{label}</a>;
const goTo = id => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('rc-flash'); setTimeout(() => el.classList.remove('rc-flash'), 1800); };

function Item({ i }) {
  const h = local.handling[i.key];
  const take = () => { const who = local.name.trim() || 'Someone'; setLocal(l => ({ handling: { ...l.handling, [i.key]: { name: who, at: store.data?.fetchedAt || Date.now() } } })); addLog({ key: i.key, event: 'handling', what: `${who} is handling: ${i.what}` }); save(); };
  const drop = () => setLocal(l => { const next = { ...l.handling }; delete next[i.key]; return { handling: next }; });
  const sorted = () => { setLocal(l => ({ resolved: { ...l.resolved, ...Object.fromEntries(i.resolve.map(k => [k, Date.now()])) } })); addLog({ key: i.key, event: 'sorted', what: `${local.name.trim() || 'Someone'} marked sorted: ${i.what}` }); save(); };
  return (
    <article className={`rc-item ${i.lv}`}>
      <span className={`rc-tag ${i.lv}`}>{WORD[i.lv]}</span>
      <div>
        <p className="rc-what">{i.what}</p>
        <p className="rc-why"><b>Why it matters</b> {i.why}</p>
        <p className="rc-next"><b>What to do</b> {i.next}</p>
        {i.lines && <ul className="rc-lines">{i.lines.map((l, n) => <li key={n}>{l}</li>)}</ul>}
        <div className="rc-actions">
          <Go link={i.link}/>
          {i.playbook && <button className="btn-ghost rc-go" onClick={() => goTo(`pb-${i.playbook}`)}>Open the steps</button>}
          {i.runnerId && <button className="btn-ghost rc-go" onClick={() => goTo(`runner-${i.runnerId}`)}>Show the runner</button>}
          {i.resolve && <button className="btn-ghost rc-go" onClick={sorted}>Sorted, hide it</button>}
          {i.lv !== 'info' && (h
            ? <span className="rc-handling">{h.name} is on it since {jmTime(h.at)} <button className="link-btn" onClick={drop}>undo</button></span>
            : <button className="btn-ghost rc-go rc-take" onClick={take}>I'm handling this</button>)}
        </div>
      </div>
    </article>
  );
}

function Section({ s, children, extra }) {
  const shown = s.items.filter(i => i.lv !== 'info'), info = s.items.filter(i => i.lv === 'info');
  const worst = shown.some(i => i.lv === 'act') ? 'act' : shown.length ? 'look' : 'good';
  return (
    <section className={`card rc-sec ${worst}`} id={`sec-${s.id}`}>
      <header>
        <span className={`rc-dot ${worst}`}/>
        <h3>{s.title}</h3>
        {shown.length === 0 && <span className="rc-quiet">{s.quiet}</span>}
        <Help>{s.help}</Help>
      </header>
      {shown.map(i => <Item key={i.key} i={i}/>)}
      {info.map(i => <Item key={i.key} i={i}/>)}
      {extra}
      {children}
    </section>
  );
}

// ── App stores: Android and iPhone steps, with the closed-test day counter ──
function StoreSteps() {
  const all = STORE_STEPS.flatMap(p => p.groups.flatMap(g => g.items));
  const left = all.filter(([id]) => !local.ticks[id]).length;
  const DAY = 86400000;
  const start = local.closedTestStart ? Date.parse(`${local.closedTestStart}T00:00:00-05:00`) : null;
  const day = start ? Math.floor((Date.now() - start) / DAY) + 1 : null;
  const applyOn = start ? jmDate(start + CLOSED_TEST_DAYS * DAY) : null;
  return (
    <Fold id="rc-stores" title="App stores: Android and iPhone" note={left ? `${left} of ${all.length} steps left` : 'all done'}>
      <p className="rc-small">Runner launches on the website (uwi-runner.online), which students add to their home screen. The store apps follow. On a personal Google Play account every new app, simple or not, must first run a closed test with at least {CLOSED_TEST_TESTERS} testers for {CLOSED_TEST_DAYS} days in a row; start it the day you launch, using your first real users as testers. An organisation account (Jcommerce & Tech, with a D-U-N-S number) skips the test. Never use fake testers: Google can ban the whole developer account.</p>
      {STORE_STEPS.map(p => (
        <div key={p.platform} className="rc-group"><h4>{p.platform}</h4>
          {p.groups.map(g => (
            <div key={g.title}><p className="rc-what" style={{ marginTop: 8 }}>{g.title}</p>
              {g.items.map(([id, title, how, url]) => (
                <label key={id} className={`rc-check ${local.ticks[id] ? 'done' : ''}`}>
                  <input type="checkbox" checked={!!local.ticks[id]} onChange={() => setLocal(l => ({ ticks: { ...l.ticks, [id]: !l.ticks[id] } }))}/>
                  <div><p className="rc-what">{title}</p>{how && <p className="rc-why">{how}</p>}{url && !local.ticks[id] && <Go link={{ label: 'Open', url }}/>}</div>
                </label>))}
              {g.tracker && (
                <div className="rc-row" style={{ alignItems: 'center', marginTop: 6 }}>
                  <span className="rc-small">Closed test started on</span>
                  <input className="input" type="date" value={local.closedTestStart} onChange={e => setLocal({ closedTestStart: e.target.value })} style={{ maxWidth: 180 }}/>
                  <span className={`rc-found ${day > CLOSED_TEST_DAYS ? 'ok' : ''}`}>
                    {!start ? 'Not started yet.' : day < 1 ? `Starts ${local.closedTestStart}.` : day > CLOSED_TEST_DAYS
                      ? `Done: ${CLOSED_TEST_DAYS} days passed ${applyOn ? `on ${applyOn}` : ''}. Apply for production, if at least ${CLOSED_TEST_TESTERS} testers stayed opted in.`
                      : `Day ${day} of ${CLOSED_TEST_DAYS}. You can apply on ${applyOn}, if at least ${CLOSED_TEST_TESTERS} testers stay opted in until then.`}
                  </span>
                </div>
              )}
            </div>))}
        </div>))}
    </Fold>
  );
}

function Fold({ id, title, note, children, open = false }) {
  return (
    <details className="rc-fold" id={id} open={open}>
      <summary><span>{title}</span>{note && <em>{note}</em>}</summary>
      <div className="rc-fold-body">{children}</div>
    </details>
  );
}

// Orders placed and runners working, hour by hour (average per day, last 7 days)
function HourChart({ hourly }) {
  const W = 720, rowH = 64, gap = 2, bw = (W - 40) / 24 - gap;
  const rows = [['Orders placed', 'orders', '#d9474f'], ['Runners who took an order', 'runners', '#4597c6']];
  return (
    <div className="rc-chart">
      <svg viewBox={`0 0 ${W} ${rows.length * (rowH + 44) + 10}`} role="img" aria-label="Orders placed and runners working, by hour of the day">
        {rows.map(([label, k, color], r) => {
          const max = Math.max(1, ...hourly.map(h => h[k])), y0 = r * (rowH + 44) + 20;
          return (
            <g key={k}>
              <text x="0" y={y0 - 6} className="rc-chart-label">{label} <tspan className="rc-chart-sub">(average per day; busiest {max} at {hourly.reduce((a, b) => (b[k] > a[k] ? b : a)).hour}:00)</tspan></text>
              <line x1="40" x2={W} y1={y0 + rowH} y2={y0 + rowH} className="rc-chart-base"/>
              {hourly.map(h => {
                const bh = (h[k] / max) * (rowH - 4), x = 40 + h.hour * (bw + gap);
                return (
                  <g key={h.hour}>
                    <rect x={x - gap / 2} y={y0} width={bw + gap} height={rowH} fill="transparent"><title>{`${h.hour}:00–${h.hour + 1}:00 · ${label.toLowerCase()}: ${h[k]} a day on average`}</title></rect>
                    {h[k] > 0 && <path d={`M${x},${y0 + rowH} V${y0 + rowH - bh + 3} q0,-3 3,-3 H${x + bw - 3} q3,0 3,3 V${y0 + rowH} Z`} fill={color}><title>{`${h.hour}:00–${h.hour + 1}:00 · ${label.toLowerCase()}: ${h[k]} a day on average`}</title></path>}
                  </g>
                );
              })}
              {[0, 6, 12, 18, 23].map(hr => <text key={hr} x={40 + hr * (bw + gap) + bw / 2} y={y0 + rowH + 13} className="rc-chart-tick" textAnchor="middle">{hr === 0 ? '12am' : hr === 12 ? '12pm' : hr < 12 ? `${hr}am` : `${hr - 12}pm`}</text>)}
            </g>
          );
        })}
      </svg>
      <p className="rc-small">Where the red is tall and the blue is short, students were ordering with few runners working: book more runners for those hours. Runner does not keep a history of who was online, so blue counts runners who took at least one order in that hour.</p>
    </div>
  );
}

const STATIC_PLAN = [
  ['Day before', 'No deploys from now until the day after launch. Place one real test order end to end.', 'The verdict is All good.'],
  ['1 hour before opening', 'Stores signed in on their tablets and switched to open. Runners told the start time.', 'Every store open; tablets show the order screen.'],
  ['Opening', 'Announce. At least 3 runners online before the announcement goes out.', 'Runners online is 3 or more.'],
  ['First hour', 'Answer every amber or red item within 5 minutes.', 'Orders nobody has taken; pickup requests unanswered; payments to check.'],
  ['Lunch rush', 'Ask extra runners to go online before it starts.', 'Waiting orders per online runner stays under 1.'],
  ['Every 2 hours', 'Note orders, delivered, cancelled and their reasons from Today at a glance.', 'Cancellations because no runner was free.'],
  ['Closing', 'Stores switch to closed. Thank the runners.', 'No order left open.'],
  ['After closing', 'Write down what went wrong, with times from the alert log. Settle cash top-ups against coins added.', 'Server errors from the day.'],
];
const WORDS = [
  ['Order code', 'The last 6 characters of an order, such as A7K2QD. It is on the receipt; use it to talk about one order.'],
  ['Runner coins', 'A prepaid balance. 1 coin = J$100. Students top up and pay with them.'],
  ['Float', 'Cash Runner gave a store or a runner to buy food with. Each paid order takes its food cost out of it.'],
  ['Pending', 'Placed, waiting for a runner (or, for pickup, waiting for the store to say yes).'],
  ['Accepted', 'A runner took it. For a card order the student now has 10 minutes to pay.'],
  ['Picking up, On the way, Delivered', 'The runner is at the store, then heading to the student, then done.'],
  ['Cancelled', 'Stopped, with a reason. The server returns any money automatically.'],
  ['Waves', 'A new order is offered to 3 runners at a time, 3 more every 45 seconds, then to everyone after about 2 minutes.'],
  ['Group order', 'A runner takes 2 or 3 orders at once from nearby stores.'],
  ['The server', 'Runner\'s own programs in Google\'s cloud. They price orders, move money and send notifications.'],
  ['The clean-up', 'A server job every 5 minutes: cancels orders nobody took or paid, retries payments, switches off idle runners.'],
  ['Held for review', 'A card payment the server was not sure about. A person must decide.'],
  ['App Check', 'Proof that a request came from the real Runner website, not a script.'],
  ['Deploy', 'Putting a new version of Runner live. Only the developer does this.'],
];

// ── The screen ──────────────────────────────────────────────────────────────
// ── Trading: how the business is doing since it opened ─────────────────────
function Trading({ T, launchDate }) {
  if (!T?.ok) return <section className="card rc-sec"><p className="rc-item unknown rc-plain">Couldn't read the last week of orders this time, so no numbers are shown rather than wrong ones.</p></section>;
  const live = T.days.filter(d => !launchDate || d.day >= launchDate);
  const tot = k => live.reduce((t, d) => t + (d[k] || 0), 0);
  const placed = tot('placed'), delivered = tot('delivered'), cancelled = tot('cancelled');
  const timed = live.filter(d => d.avgMins !== null), timedN = timed.reduce((t, d) => t + d.delivered, 0);
  const avg = timedN ? Math.round(timed.reduce((t, d) => t + d.avgMins * d.delivered, 0) / timedN) : null;
  const today = T.days[T.days.length - 1]?.day;
  const dayN = launchDate && today ? Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${launchDate}T12:00:00`)) / 864e5) + 1 : null;
  const top = Math.max(1, ...T.days.map(d => d.placed));
  const since = launchDate && T.days[0].day <= launchDate ? 'since launch' : 'over the last 8 days';
  return (<>
    <section className="card rc-sec rc-trading">
      <header><span className="rc-dot good"/><h3>{dayN ? `Day ${dayN} of trading` : 'Trading'}</h3><span className="rc-quiet">{since}{launchDate ? `, opened ${dayLabel(launchDate)}` : ''}</span>
        <Help>Every order since Runner opened, day by day, from Runner's own records. Only the last 7 days and today are read, to keep the cost of each check low.</Help></header>
      <div className="rc-tiles">
        <div className="fin-tile"><span>Orders</span><b>{placed}</b><span className="fin-delta">{delivered} delivered · {cancelled} cancelled</span></div>
        <div className="fin-tile"><span>Delivered rate</span><b className={placed && delivered / placed < 0.7 ? 'bad' : ''}>{placed ? `${Math.round(delivered / placed * 100)}%` : '–'}</b><span className="fin-delta">of orders placed</span></div>
        <div className="fin-tile"><span>Money taken</span><b>{J(tot('taken'))}</b><span className="fin-delta">paid orders, not cancelled</span></div>
        <div className="fin-tile"><span>Runner's share</span><b className="good">{J(tot('share'))}</b><span className="fin-delta">platform fee on delivered orders</span></div>
        <div className="fin-tile"><span>Students who ordered</span><b>{T.buyers}</b><span className="fin-delta">last 7 days, delivered</span></div>
        <div className="fin-tile"><span>Came back</span><b className={T.buyers && T.repeat / T.buyers >= 0.3 ? 'good' : ''}>{T.buyers ? `${Math.round(T.repeat / T.buyers * 100)}%` : '–'}</b><span className="fin-delta">{plural(T.repeat, 'student')} ordered twice or more</span></div>
        <div className="fin-tile"><span>Average delivery</span><b className={avg !== null && avg > 40 ? 'bad' : ''}>{avg === null ? '–' : `${avg} min`}</b><span className="fin-delta">placed to delivered</span></div>
      </div>
      <div className="rc-days" role="img" aria-label="Orders placed and delivered each day">
        {T.days.map(d => (
          <div key={d.day} className={`rc-day ${d.today ? 'today' : ''} ${launchDate && d.day < launchDate ? 'before' : ''} ${d.day === launchDate ? 'launch' : ''}`} title={`${d.day}: ${d.placed} placed, ${d.delivered} delivered, ${J(d.share)} share`}>
            <div className="rc-day-bar"><i style={{ height: `${(d.placed / top) * 100}%` }}/><b style={{ height: `${(d.delivered / top) * 100}%` }}/></div>
            <span className="rc-day-n">{d.placed}</span><span className="rc-day-l">{d.today ? 'Today' : dayLabel(d.day)}</span>
          </div>))}
      </div>
      <p className="rc-small">Light bar: orders placed. Solid bar: delivered.{launchDate ? ' Days before launch are faded.' : ''}{T.hitLimit ? ' Only the newest 3,000 orders of the week were read.' : ''}</p>
    </section>
    <section className="card rc-sec">
      <header><span className="rc-dot good"/><h3>Day by day</h3></header>
      <table className="rc-table"><thead><tr><th>Day</th><th>Placed</th><th>Delivered</th><th>Cancelled</th><th>Money taken</th><th>Runner's share</th><th>Students</th><th>Average delivery</th></tr></thead>
        <tbody>{[...T.days].reverse().filter(d => !launchDate || d.day >= launchDate).map(d => (
          <tr key={d.day} className={d.cancelled > d.delivered && d.placed ? 'warn' : ''}><td>{d.today ? 'Today' : dayLabel(d.day)}{d.day === launchDate ? <em> launch</em> : null}</td><td>{d.placed}</td><td>{d.delivered}</td><td>{d.cancelled || '–'}</td><td>{J(d.taken)}</td><td>{J(d.share)}</td><td>{d.students || '–'}</td><td>{d.avgMins === null ? '–' : `${d.avgMins} min`}</td></tr>))}</tbody></table>
    </section>
    <section className="card rc-sec">
      <header><span className="rc-dot good"/><h3>Stores by delivered orders</h3><span className="rc-quiet">last 7 days</span></header>
      {T.stores.length ? <table className="rc-table"><thead><tr><th>Store</th><th>Delivered</th><th>Money taken</th></tr></thead>
        <tbody>{T.stores.map(x => <tr key={x.name}><td>{x.name}</td><td>{x.orders}</td><td>{J(x.taken)}</td></tr>)}</tbody></table>
        : <p className="rc-small">No delivered orders in the last 7 days.</p>}
      <p className="rc-small">A store near the top is worth a thank-you visit; one with no orders may need its menu, photos or hours checked in the People tab.</p>
    </section>
  </>);
}

const TABS = [['now', 'Now'], ['trading', 'Trading'], ['money', 'Money'], ['people', 'People'], ['cash', 'Cash & referrals'], ['running', 'Is it running'], ['handbook', 'Handbook']];

// ── Cash & referrals (Runner's confirmed orders) ────────────────────────────
// Each customer's progress toward paying by cash (J$5,000 of confirmed coin
// spend unlocks it, permanently, unless taken away here), cash orders that
// weren't paid, admins' referral commission and payouts, and refunds Runner
// held back for a decision (a confirmed order cancelled outside the
// approved paths). The buttons are the control room's only changes to
// Runner: they go through Runner's own checked endpoint (ownerAction).
const CASH_UNLOCK = 5000;
function CashReferrals({ T, admins, api, project }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [why, setWhy] = useState({});
  const [orderId, setOrderId] = useState('');
  const [orderWhy, setOrderWhy] = useState('');
  const [filter, setFilter] = useState('');
  if (!T?.ok) return <section className="card rc-sec"><p className="rc-item unknown rc-plain">Couldn't read cash and referrals this time ({T?.error || 'not read yet'}), so nothing is shown rather than something wrong.</p></section>;
  const act = async (key, body, done) => {
    if (busy) return;
    setBusy(key); setMsg(null);
    const r = await api.ownerAction(project, body);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: done(r) } : { ok: false, text: r.error });
    if (r.ok) { store.last = 0; refresh(); }
  };
  const emailOf = uid => (admins?.rows || []).find(a => a.id === uid)?.email || uid;
  const shown = T.customers.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));
  const eligible = T.customers.filter(c => c.cashEligibleAt && !c.cashRevokedAt).length;
  return (<>
    {msg && <div className={`rc-note ${msg.ok ? '' : 'rc-bad'}`}>{msg.text}</div>}
    <section className="card rc-sec">
      <header><span className="rc-dot good"/><h3>Cash: who may pay cash</h3><span className="rc-quiet">{eligible} can pay cash · {T.customers.length} with confirmed coin spend</span>
        <Help>Cash unlocks once a customer has spent {J(CASH_UNLOCK)} with Runner coins on confirmed orders, and stays unlocked even if an order is later reversed. Cash orders never count toward it. Take cash away from anyone who doesn't pay; give it back the same way.</Help></header>
      <input className="input" placeholder="Find a customer" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 260, margin: '0.5rem 0' }}/>
      <table className="rc-table"><thead><tr><th>Customer</th><th>Confirmed coin spend</th><th>Cash</th><th>Not paid</th><th></th></tr></thead>
        <tbody>{shown.slice(0, 100).map(c => {
          const state = c.cashRevokedAt ? `Taken away ${jmDate(c.cashRevokedAt)}${c.cashRevokeReason ? `: ${c.cashRevokeReason}` : ''}` : c.cashEligibleAt ? `Yes, since ${jmDate(c.cashEligibleAt)}` : `${Math.min(100, Math.round((c.confirmedSpendJmd / CASH_UNLOCK) * 100))}% of the way`;
          return (<tr key={c.uid}>
            <td>{c.name}</td><td>{J(c.confirmedSpendJmd)}</td><td>{state}</td><td>{c.cashRefusals || 0}</td>
            <td>{c.cashRevokedAt
              ? <button className="btn-ghost" disabled={!!busy} onClick={() => act(`r${c.uid}`, { action: 'restoreCash', uid: c.uid }, () => `${c.name} can pay cash again.`)}>{busy === `r${c.uid}` ? 'Saving…' : 'Give cash back'}</button>
              : <span className="row-gap"><input className="input" style={{ width: 150 }} placeholder="Why" value={why[c.uid] || ''} onChange={e => setWhy(w => ({ ...w, [c.uid]: e.target.value }))}/>
                <button className="btn-ghost" disabled={!!busy || (why[c.uid] || '').trim().length < 3} onClick={() => act(`v${c.uid}`, { action: 'revokeCash', uid: c.uid, reason: why[c.uid].trim() }, () => `${c.name} can no longer pay cash.`)}>{busy === `v${c.uid}` ? 'Saving…' : 'Take cash away'}</button></span>}</td>
          </tr>);
        })}</tbody></table>
    </section>

    <section className="card rc-sec">
      <header><span className={`rc-dot ${T.issues.length ? 'look' : 'good'}`}/><h3>Cash not paid</h3><span className="rc-quiet">{T.issues.length ? `${T.issues.length} logged` : 'None logged'}</span>
        <Help>Confirmed cash orders the customer didn't pay at the door or the counter, as reported by the runner or the store. The order was cancelled; the food may still be owed to the store.</Help></header>
      {T.issues.length > 0 && <table className="rc-table"><thead><tr><th>When</th><th>Customer</th><th>Store</th><th>Amount</th><th>How</th><th>Note</th></tr></thead>
        <tbody>{T.issues.map(i => <tr key={i.id}><td>{jmDate(i.createdAt)} {jmTime(i.createdAt)}</td><td>{i.name}</td><td>{i.storeName}</td><td>{J(i.amountJmd)}</td><td>{i.mode} · {i.reporterRole === 'dasher' ? 'runner' : i.reporterRole}</td><td>{i.note}</td></tr>)}</tbody></table>}
    </section>

    <section className="card rc-sec">
      <header><span className="rc-dot good"/><h3>Admin referrals</h3><span className="rc-quiet">5% of confirmed orders + J$100 per first order</span>
        <Help>Sign-ups with each admin's code, how many of them ordered, what they spent on confirmed orders, and the commission: earned and not yet paid, paid, and held back because a paid commission's order was later reversed (taken off the next payout). Pay marks everything earned as paid in one payout; pay the admin the amount shown, outside Runner.</Help></header>
      <table className="rc-table"><thead><tr><th>Admin</th><th>Code</th><th>Signed up</th><th>Ordered</th><th>Spent</th><th>Earned, unpaid</th><th>Paid</th><th>Held back</th><th></th></tr></thead>
        <tbody>{T.admins.map(a => (<tr key={a.uid}>
          <td>{emailOf(a.uid)}</td><td>{a.code || '–'}</td><td>{a.signups || 0}</td><td>{a.orderingUsers || 0}</td><td>{J(a.spendJmd || 0)}</td>
          <td>{J(a.earnedJmd || 0)}</td><td>{J(a.paidJmd || 0)}</td><td>{J(a.clawbackJmd || 0)}</td>
          <td>{(a.earnedJmd || 0) > 0 && <button className="btn-ghost" disabled={!!busy} onClick={() => act(`p${a.uid}`, { action: 'payAdminCommissions', adminUid: a.uid, note: `Paid from the console ${new Date().toISOString().slice(0, 10)}` },
            r => `Recorded a payout of ${J(r.paidJmd)} to ${emailOf(a.uid)}${r.clawbackJmd ? ` (${J(r.clawbackJmd)} held back)` : ''}. Pay them that amount.`)}>{busy === `p${a.uid}` ? 'Saving…' : `Mark ${J(Math.max(0, (a.earnedJmd || 0) - (a.clawbackJmd || 0)))} paid`}</button>}</td>
        </tr>))}</tbody></table>
      {T.payouts.length > 0 && <Fold id="rc-payouts" title="Payouts" note={`${T.payouts.length} recorded`}>
        <table className="rc-table"><thead><tr><th>When</th><th>Admin</th><th>Paid</th><th>Held back</th><th>Commissions</th></tr></thead>
          <tbody>{T.payouts.map(x => <tr key={x.id}><td>{jmDate(x.createdAt)}</td><td>{emailOf(x.adminUid)}</td><td>{J(x.amountJmd)}</td><td>{J(x.clawbackJmd || 0)}</td><td>{x.count}</td></tr>)}</tbody></table>
      </Fold>}
    </section>

    <section className="card rc-sec">
      <header><span className={`rc-dot ${T.held.length ? 'act' : 'good'}`}/><h3>Refunds held and reversals</h3><span className="rc-quiet">{T.held.length ? `${T.held.length} held` : 'Nothing held'}</span>
        <Help>Confirmed orders are paid and final: no refunds. A confirmed order is only undone by its store, or by an approved reversal here (with a reason), which refunds the customer as Runner coins and takes back spend and commission. "Held" orders were cancelled some other way; their refund waits for you.</Help></header>
      {T.held.length > 0 && <table className="rc-table"><thead><tr><th>Order</th><th>Store</th><th>Total</th><th>Cancelled</th><th>Why</th></tr></thead>
        <tbody>{T.held.map(o => <tr key={o.id}><td>#{o.code}</td><td>{o.storeName}</td><td>{J(o.totalAmount)}</td><td>{jmDate(o.cancelledAt)}</td><td>{o.cancelReason || 'no reason'}</td></tr>)}</tbody></table>}
      <div className="row-gap" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <input className="input" style={{ width: 220 }} placeholder="Order id (the long one)" value={orderId} onChange={e => setOrderId(e.target.value.trim())}/>
        <input className="input" style={{ width: 280 }} placeholder="Reason for the reversal" value={orderWhy} onChange={e => setOrderWhy(e.target.value)}/>
        <button className="btn-ghost" disabled={!!busy || !orderId || orderWhy.trim().length < 5}
          onClick={() => act('rev', { action: 'reverseOrder', orderId, reason: orderWhy.trim() }, () => { setOrderId(''); setOrderWhy(''); return 'Reversed: the customer is refunded and the store and runner are told.'; })}>{busy === 'rev' ? 'Reversing…' : 'Approve reversal'}</button>
      </div>
    </section>
  </>);
}
const SECTION_TAB = { orders: 'now', money: 'money', people: 'people', running: 'running' };
const dayLabel = d => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

export default function RunnerControl({ project, dir, api, Mask, notify, bills = [], onRecordPayout, exportFile, launchDate = '' }) {
  const s = useStore();
  const [tab, setTabRaw] = useState(() => { try { return localStorage.getItem('rc_tab') || 'now'; } catch { return 'now'; } });
  const setTab = t => { setTabRaw(t); try { localStorage.setItem('rc_tab', t); } catch {} };
  const [, tick] = useState(0);
  const [delWho, setDelWho] = useState('');
  const [delDate, setDelDate] = useState('');
  const [noteFor, setNoteFor] = useState(null);
  const [clearing, setClearing] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    configure({ api, project, dir, notify });
    store.viewers += 1;
    if (!store.data || store.project !== project) { store.last = 0; refresh(); } else if (Date.now() - store.last >= every()) refresh();
    schedule();
    const clock = setInterval(() => tick(n => n + 1), 10000);
    return () => { store.viewers -= 1; clearInterval(clock); schedule(); };
  }, [api, project, dir, notify]);

  if (!project) return <div className="card span-12 rc-fatal"><b>This venture's folder has no Firebase project.</b><p>Press Edit at the top and set its folder to Runner's code folder (runner in Documents → Jcommerce; it was called dorm-dash-web before 15 Oct 2026).</p></div>;
  if (!api?.ops) return <div className="card span-12 rc-fatal"><b>The control room needs the Mac app.</b><p>Quit JCommerce Console with ⌘Q and open it again.</p></div>;
  if (!s.view) return <div className="card span-12 rc-wait"><span className="rc-seal look" lang="ja" aria-hidden="true">待</span><div><b>Checking Runner…</b><p>Reading orders, money, runners, stores and Google's status pages.</p></div></div>;

  const r = s.view, data = s.data;
  const age = Math.max(0, Math.round((Date.now() - (s.gotAt || 0)) / 1000));
  const wait = Math.max(0, Math.ceil((GAP_MS - (Date.now() - s.last)) / 1000));
  const clockOff = data?.ok ? Math.round(Math.abs(data.clockOffMs || 0) / MIN) : 0;
  const nowT = data?.fetchedAt || Date.now();

  if (r.fatal) return (
    <div className="rc span-12">
      <div className="rc-verdict act" role="alert">
        {Mask ? <Mask level="danger" color="#ff2d3d" size={96}/> : null}
        <span className="rc-seal act" lang="ja" aria-hidden="true">急</span>
        <div className="rc-verdict-text"><h2>Act now</h2><p>{r.reason}</p>
          <p className="rc-fix"><b>The one step that fixes it:</b> {r.fatal.next}</p>
          <div className="rc-meta"><button className="btn-ghost" onClick={() => refresh()} disabled={s.busy || wait > 0}>{s.busy ? 'Checking…' : wait > 0 ? `Refresh in ${wait}s` : '↻ Refresh'}</button></div></div>
      </div>
    </div>
  );

  // Settling up: since each store or runner was last paid, as recorded in the console's Finance
  const lastPaid = prefix => { const b = bills.filter(x => String(x.description || '').startsWith(prefix)).sort((a, b2) => String(b2.date).localeCompare(String(a.date)))[0]; return b ? b.date : null; };
  const since = (list, date) => (date ? list.filter(o => jmDate(o.at) > date) : list);
  const record = (prefix, amount, n) => { if (!onRecordPayout || !(amount > 0)) return; onRecordPayout({ type: 'expense', amount: Math.round(amount), category: 'Runner payouts', date: jmDate(nowT), description: `${prefix} · ${plural(n, 'order')}` }); addLog({ event: 'payout', what: `Recorded ${J(amount)}: ${prefix}` }); save(); };

  // Routines that reset themselves
  const routineDone = (kind, id) => { const at = local.routines[id]; return at && periodKey(kind, at) === periodKey(kind, nowT) ? at : null; };
  const toggleRoutine = id => setLocal(l => ({ routines: { ...l.routines, [id]: l.routines[id] && routineDone(ROUTINES.find(g => g.items.some(x => x[0] === id)).kind, id) ? 0 : Date.now() } }));
  const routineLink = where => (where === 'inbox' ? { label: 'Open the inbox', url: INBOX } : where === 'logs' ? { label: 'Open the error log', url: `https://console.cloud.google.com/logs/query?project=${project}` }
    : where === 'appcheck' ? { label: 'Open App Check', url: `https://console.firebase.google.com/project/${project}/appcheck/apis` } : where === 'billing' ? { label: 'Open billing reports', url: `https://console.cloud.google.com/billing/reports?project=${project}` }
      : where ? { label: 'Open Runner admin', url: `${data.adminUrl}${where}` } : null);

  const exportLog = async () => {
    const lines = local.log.map(e => `${jmDate(e.at)} ${jmTime(e.at)}\t${e.event === 'appeared' ? `${WORD[e.lv] || ''}: ${e.what}` : e.event === 'cleared' ? `Cleared: ${e.what}` : e.what}\t${e.done || ''}`);
    const text = `Runner alert log, exported ${jmDate(nowT)} ${jmTime(nowT)} (Jamaica time)\nTime\tWhat happened\tWhat was done\n${lines.join('\n')}\n`;
    if (exportFile) await exportFile(text, `runner-log-${jmDate(nowT)}.txt`);
  };
  const leftBefore = r.checklist.flatMap(g => g.items).filter(c => !c.ticked && !c.done).length;
  const k = r.keeping;

  return (
    <div className={`rc span-12 ${local.launch ? 'launch' : ''}`} data-no-i18n>
      {/* ── The verdict ─────────────────────────────────────────────────── */}
      <div className={`rc-verdict ${r.verdict}`} role="status">
        {Mask ? <Mask level={{ good: 'good', look: 'watchout', act: 'danger' }[r.verdict]} color={{ good: '#3ecf8e', look: '#ff9a4a', act: '#ff2d3d' }[r.verdict]} size={96}/> : null}
        <span className={`rc-seal ${r.verdict}`} lang="ja" aria-hidden="true">{SEAL[r.verdict]}</span>
        <div className="rc-verdict-text">
          <h2>{r.headline}</h2>
          <p>{r.reason}</p>
          <div className="rc-meta">
            <span>{s.busy ? 'Checking…' : `Checked ${age < 60 ? `${age} seconds` : ago(Math.round(age / 60))} ago`}{data.cached ? ' (kept for a minute to save cost)' : ''} · rechecks every {local.launch ? 'minute' : '2 minutes'} while open</span>
            <button className="btn-ghost" onClick={() => refresh()} disabled={s.busy || wait > 0}>{s.busy ? 'Checking…' : wait > 0 ? `Refresh in ${wait}s` : '↻ Refresh'}</button>
          </div>
        </div>
      </div>

      <nav className="rc-tabs">
        {TABS.map(([id, label]) => {
          const sec = id === 'now' ? null : r.sections.find(x => SECTION_TAB[x.id] === id);
          const n = sec ? sec.items.filter(i => i.lv === 'act' || i.lv === 'look').length : 0;
          const act = sec ? sec.items.some(i => i.lv === 'act') : false;
          return <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}{n > 0 && <i className={act ? 'act' : 'look'}>{n}</i>}</button>;
        })}
      </nav>

      {tab === 'now' && (<>
        <div className="rc-big">
          {[['Orders today', r.live.orders], ['Waiting for a runner', r.live.waiting, r.live.waiting > 0], ['Runners online', r.live.online ?? '?', r.live.online !== null && r.live.online < 3], ['Delivered', r.live.delivered], ['Open right now', r.live.open], ['Stores open', `${r.live.storesOpen}/${r.live.stores}`]].map(([l, v, bad]) => (
            <div key={l} className={bad ? 'bad' : ''}><b>{v}</b><span>{l}</span></div>))}
        </div>
        {(() => {
          const elsewhere = r.sections.filter(x => x.id !== 'orders').flatMap(x => x.items.filter(i => i.lv === 'act' || i.lv === 'look').map(i => ({ i, x })));
          return elsewhere.length > 0 && (
            <section className="card rc-sec rc-elsewhere">
              <header><span className={`rc-dot ${elsewhere.some(e => e.i.lv === 'act') ? 'act' : 'look'}`}/><h3>Needs you elsewhere</h3></header>
              {elsewhere.map(({ i, x }) => (
                <button key={i.key} className={`rc-else ${i.lv}`} onClick={() => setTab(SECTION_TAB[x.id] || 'now')}><span>{i.what}</span><em>{x.title} ›</em></button>))}
            </section>
          );
        })()}
        <section className="card rc-sec" id="sec-today">
          <header><span className="rc-dot good"/><h3>Today at a glance</h3><Help>Totals since midnight (Jamaica time), each against the same time yesterday, so you can see whether today is busier or quieter than normal.</Help></header>
          {r.today.ok ? <div className="rc-tiles">{r.today.tiles.map(t => <div key={t.label} className={`fin-tile ${t.bad ? 'rc-bad' : ''}`}><span>{t.label}</span><b>{t.value}</b><span className="fin-delta">{t.note}</span></div>)}</div>
            : <p className="rc-item unknown rc-plain">{r.today.note}</p>}
        </section>

      {/* ── Orders ─────────────────────────────────────────────────────── */}
      <Section s={r.sections[0]} extra={r.cancellations.length > 0 && (
        <div className="rc-sub"><h4>Today's cancellations</h4>
          <ul className="rc-list">{r.cancellations.map(([w, n]) => <li key={w}><b>{n}</b> {w}</li>)}</ul>
          <p className="rc-small">Runner admin has no Orders page yet, so nobody can look up or cancel an order there. An emergency cancel uses the steps in "An order must be cancelled" in the Handbook.</p></div>)}/>
      </>)}

      {tab === 'trading' && <Trading T={r.trading} launchDate={launchDate}/>}
      {tab === 'cash' && <CashReferrals T={data.parts.trust} admins={data.parts.admins} api={api} project={project}/>}

      {/* ── Money ──────────────────────────────────────────────────────── */}
      {tab === 'money' && <Section s={r.sections[1]}>
        <Fold id="rc-floats" title="Floats: cash Runner has advanced" note={r.floats.ok ? `${plural(r.floats.stores.length, 'store')}, ${plural(r.floats.runners.length, 'runner')}` : "couldn't check"}>
          <p className="rc-small">When an order is paid, its food cost comes out of the store's float if it has one, otherwise the delivering runner's. A negative store float is what Runner owes that store. Only an admin can top one up: Runner admin → Users or Stores → "Adjust float".</p>
          <table className="rc-table"><thead><tr><th>Who</th><th>Float</th><th>Food paid today</th><th>Returned today</th><th>Top-ups today</th></tr></thead>
            <tbody>{[...r.floats.stores.map(f => ({ ...f, kind: 'Store' })), ...r.floats.runners.map(f => ({ ...f, kind: 'Runner' }))].sort((a, b) => a.float - b.float).map(f => (
              <tr key={`${f.kind}${f.id}`} className={f.float < 0 ? 'warn' : ''}><td>{f.name} <em>{f.kind}</em></td><td>{J(f.float)}</td><td>{f.used ? J(-f.used) : '–'}</td><td>{f.returned ? J(f.returned) : '–'}</td><td>{f.topups ? J(f.topups) : '–'}</td></tr>))}
              {!r.floats.stores.length && !r.floats.runners.length && <tr><td colSpan="5">No floats set yet.</td></tr>}</tbody></table>
        </Fold>
        <Fold id="rc-settle" title="Settling up" note="what each store and runner is owed since you last paid them">
          <p className="rc-small">Some money leaves the app: you pay stores and runners by hand. Recording a payment here adds it to the console's Finance (never to Runner). Only the last 7 days of orders are read.</p>
          <h4>Stores</h4>
          <table className="rc-table"><thead><tr><th>Store</th><th>Food from delivered orders</th><th>Float now</th><th>Runner owes</th><th>Last settled</th><th/></tr></thead>
            <tbody>{r.settle.stores.map(x => { const last = lastPaid(`Runner store settlement · ${x.name}`); const list = since(x.orders, last);
              return <tr key={x.id}><td>{x.name}</td><td>{J(list.reduce((t, o) => t + o.amount, 0))} <em>{plural(list.length, 'order')}</em></td><td>{x.float === null ? 'none' : J(x.float)}</td><td className={x.owed ? 'warn' : ''}>{x.owed ? J(x.owed) : '–'}</td><td>{last || 'never'}</td>
                <td>{x.owed > 0 && <button className="btn-ghost rc-go" onClick={() => record(`Runner store settlement · ${x.name}`, x.owed, list.length)}>Record payment of {J(x.owed)}</button>}</td></tr>; })}
              {!r.settle.stores.length && <tr><td colSpan="6">Nothing delivered in the last 7 days.</td></tr>}</tbody></table>
          <h4>Runners</h4>
          <table className="rc-table"><thead><tr><th>Runner</th><th>Delivery share owed</th><th>Orders</th><th>Last paid</th><th/></tr></thead>
            <tbody>{r.settle.runners.map(x => { const last = lastPaid(`Runner payout · ${x.name}`); const list = since(x.orders, last); const owed = list.reduce((t, o) => t + o.amount, 0);
              return <tr key={x.id}><td>{x.name}</td><td>{J(owed)}</td><td title={list.map(o => `#${o.code} ${J(o.amount)}`).join('\n')}>{plural(list.length, 'order')}{list.length ? `: ${list.slice(0, 4).map(o => `#${o.code}`).join(', ')}${list.length > 4 ? '…' : ''}` : ''}</td><td>{last || 'never'}{x.held.length ? <em> · held: {x.held.map(o => `#${o.code}`).join(', ')} (problem reported)</em> : null}</td>
                <td>{owed > 0 && <button className="btn-ghost rc-go" onClick={() => record(`Runner payout · ${x.name}`, owed, list.length)}>Record payout of {J(owed)}</button>}</td></tr>; })}
              {!r.settle.runners.length && <tr><td colSpan="5">No deliveries in the last 7 days.</td></tr>}</tbody></table>
        </Fold>
        <Fold id="rc-cash" title="Cash top-ups added by hand today" note={`${J(r.cash.addedTotal)} in ${plural(r.cash.added.length, 'top-up')}`}>
          <p className="rc-small">When a student pays cash, an admin adds coins with "Adjust Runner coins" and a note like "Cash J$2,000, receipt 014". Match this list against the cash you hold.</p>
          <ul className="rc-list">{r.cash.added.map(t => <li key={t.id}><b>{J(t.amountJmd)}</b> {jmTime(t.createdAt)} · {t.note || 'no note'}</li>)}
            {r.cash.removed.map(t => <li key={t.id} className="warn"><b>{J(t.amountJmd)}</b> {jmTime(t.createdAt)} · taken back · {t.note || 'no note'}</li>)}
            {!r.cash.added.length && !r.cash.removed.length && <li>None today.</li>}</ul>
        </Fold>
      </Section>}

      {/* ── People ─────────────────────────────────────────────────────── */}
      {tab === 'people' && <Section s={r.sections[2]}>
        <Fold id="rc-runners" title="Runners" note={`${plural(r.runnerTable.length, 'runner')}, ${r.runnerTable.filter(x => x.online).length} online`}>
          <table className="rc-table"><thead><tr><th>Runner</th><th>Phone</th><th>Now</th><th>Deliveries this week</th><th>Average time</th><th>Slow (over 40 min)</th><th>Cancelled after taking</th><th>Float</th></tr></thead>
            <tbody>{r.runnerTable.map(x => (
              <tr key={x.id} id={`runner-${x.id}`} className={!x.active ? 'off' : ''}><td>{x.name}{x.status === 'pending' && <em> waiting to be verified</em>}{!x.active && <em> deactivated</em>}</td>
                <td>{x.phone ? <a href={`tel:${x.phone}`}>{x.phone}</a> : '–'}</td><td>{x.online ? <span className="rc-on">online</span> : 'offline'}</td><td>{x.deliveries}</td><td>{x.avgMins === null ? '–' : `${x.avgMins} min`}</td><td>{x.slow || '–'}</td><td>{x.dropped || '–'}</td><td>{x.float === null ? '–' : J(x.float)}</td></tr>))}
              {!r.runnerTable.length && <tr><td colSpan="8">No runners yet.</td></tr>}</tbody></table>
          <p className="rc-small">Use this for praise, coaching or removal. A runner is removed with Deactivate in Runner admin → Users.</p>
        </Fold>
        <Fold id="rc-hours" title="Hour by hour, last 7 days" note="which hours need more runners booked"><HourChart hourly={r.hourly}/></Fold>
        <Fold id="rc-stores" title="Stores" note={`${r.live.storesOpen} of ${plural(r.live.stores, 'store')} open`}>
          <table className="rc-table"><thead><tr><th>Store</th><th>Now</th><th>Hours</th><th>Tablet</th><th>Alerts</th><th>Pickup</th><th>Float</th><th>Menu</th></tr></thead>
            <tbody>{r.storeTable.map(x => (
              <tr key={x.id} className={!x.isOpen && x.hoursSay === true ? 'warn' : ''}><td><a href={`${data.adminUrl}/manage-store/${x.id}`} target="_blank" rel="noreferrer">{x.name}</a></td>
                <td>{x.isOpen ? <span className="rc-on">open</span> : 'closed'}{!x.isOpen && x.hoursSay === true && <em> (hours say open)</em>}</td><td>{x.hours || <em>not set</em>}</td>
                <td>{x.tablet ? 'yes' : <em>no login</em>}</td><td>{x.tablet ? (x.alerts ? 'on' : <em>off</em>) : '–'}</td><td>{x.pickup ? 'on' : 'off'}</td><td>{x.float === null ? '–' : J(x.float)}</td>
                <td>{x.menu ? plural(x.menu, 'item') : <em>empty</em>}{x.noPhoto ? `, ${x.noPhoto} no photo` : ''}{x.noPrice ? `, ${x.noPrice} price 0` : ''}{x.soldOut ? `, ${x.soldOut} sold out` : ''}</td></tr>))}</tbody></table>
          <p className="rc-small">Stores sign in on their own tablet (tabs: Orders, Kitchen, Menu, Today). Order alerts go only to that tablet.</p>
        </Fold>
        <Fold id="rc-students" title="Students" note={r.students.ok ? `${r.students.days.reduce((t, d) => t + d.signups, 0)} sign-ups this week` : "couldn't check"}>
          {r.students.ok ? (
            <table className="rc-table"><thead><tr><th>Day</th><th>Sign-ups</th><th>New students' first orders</th></tr></thead>
              <tbody>{r.students.days.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.signups}</td><td>{d.firstOrders}</td></tr>)}</tbody></table>
          ) : <p className="rc-item unknown rc-plain">Couldn't check sign-ups this time.</p>}
          <p className="rc-small">If sign-ups rise but first orders don't, students are curious but not ordering. Support requests arrive by email: {ext('open the inbox', INBOX)}. A problem account is paused with Deactivate in Runner admin → Users; it signs them out everywhere within an hour.</p>
          <h4>Deletion requests (Runner promises to act within 30 days)</h4>
          <ul className="rc-list">{local.deletions.map(d => { const left = Math.ceil((d.at + 30 * 86400000 - nowT) / 86400000); return (
            <li key={d.id} className={d.done ? 'done' : left < 7 ? 'warn' : ''}><label><input type="checkbox" checked={!!d.done} onChange={() => setLocal(l => ({ deletions: l.deletions.map(x => (x.id === d.id ? { ...x, done: x.done ? null : Date.now() } : x)) }))}/> {d.who || 'A student'} · asked {jmDate(d.at)} · {d.done ? 'done' : left < 0 ? `${-left} days overdue` : `${left} days left`}</label></li>); })}
            {!local.deletions.length && <li>None recorded.</li>}</ul>
          <div className="rc-row"><input className="input" placeholder="Who asked (an email or a note)" value={delWho} onChange={e => setDelWho(e.target.value)}/><input className="input" type="date" value={delDate} onChange={e => setDelDate(e.target.value)}/>
            <button className="btn-ghost" onClick={() => { const at = delDate ? Date.parse(`${delDate}T12:00:00-05:00`) : nowT; setLocal(l => ({ deletions: [...l.deletions, { id: Date.now().toString(36), who: delWho.trim(), at }] })); setDelWho(''); setDelDate(''); }}>Add request</button></div>
        </Fold>
        <Fold id="rc-admins" title="Admin accounts" note={plural(r.admins.length, 'account')} open={r.admins.some(a => !a.expected) || !local.expectedAdmins}>
          <p className="rc-small">Admin is the most powerful role and can only be given by hand in the Firebase console. Keep it to you plus at most one trusted person.</p>
          <ul className="rc-list">{r.admins.map(a => <li key={a.email} className={local.expectedAdmins && !a.expected ? 'warn' : ''}>{a.email}{local.expectedAdmins && !a.expected && <em> not expected</em>}</li>)}</ul>
          <button className="btn-ghost rc-go" onClick={() => setLocal({ expectedAdmins: r.admins.map(a => a.email) })}>These are all expected</button>
        </Fold>
      </Section>}

      {/* ── Is it running ──────────────────────────────────────────────── */}
      {tab === 'running' && <Section s={r.sections[3]}>
        <div className="rc-facts">
          <div><span>App Check: verified share, last 7 days</span>{k.appCheck.length ? k.appCheck.map(a => <b key={a.label}>{a.label}: {a.share === null ? 'no traffic' : `${a.share}%`} <em>{a.enforced ? 'enforced' : a.share !== null && a.share >= 98 ? 'safe to enforce once it holds 98% for a week' : 'not safe to enforce yet'}</em></b>) : <b>couldn't check</b>}
            <small>The server's own functions already refuse requests without proof. The database and sign-in are only watched until verified traffic stays at 98% or more for a week. Before the Android app ships, App Check must be set up for it too.</small></div>
          <div><span>Last deploy</span><b>{k.release?.at ? `${jmDate(k.release.at)} ${jmTime(k.release.at)}` : "couldn't check"}</b><small>{k.release?.by ? `by ${k.release.by}` : ''}{k.release?.message ? ` · "${k.release.message}"` : ' · no change-log line'}{k.server ? ` · server updated ${jmDate(k.server)}` : ''}</small></div>
          <div><span>Newest code in Runner's folder</span><b>{k.code ? `${jmDate(k.code.at)} ${jmTime(k.code.at)}` : "couldn't check"}</b><small>{k.code ? `"${k.code.message}"` : ''}</small></div>
          <div><span>Database backups</span><b>{k.backups ? (k.backups.last ? `last one ${jmDate(k.backups.last)}` : 'none yet') : "couldn't check"}</b><small>{k.backups?.scheduled ? 'A daily backup is scheduled.' : k.backups ? 'No daily backup is scheduled.' : ''}</small></div>
          <div><span>Google Cloud billing</span><b>{k.billing ? (k.billing.enabled ? 'on' : 'OFF') : "couldn't check"}</b><small>{ext('Open billing reports', `https://console.cloud.google.com/billing/reports?project=${project}`)}</small></div>
          <div><span>Budget alert</span><b>{k.budgets ? (k.budgets.length ? k.budgets.map(b => `${b.currency} ${b.amount}`).join(', ') : 'none set') : 'not connected'}</b>
            <small>{k.budgets ? 'Recommended: US$25 a month.' : <>The console can't see budgets until Google's Budget API is switched on for Runner. {ext('Switch it on', `https://console.cloud.google.com/apis/library/billingbudgets.googleapis.com?project=${project}`)}, then {ext('set a US$25 budget', `https://console.cloud.google.com/billing/budgets?project=${project}`)}.</>}</small></div>
        </div>
        <Fold id="rc-cost" title="What it costs to keep running" note="about US$11 to 13 a month with no orders">
          <table className="rc-table"><thead><tr><th>Item</th><th>Monthly</th></tr></thead><tbody>
            {[['Server copy kept awake for orders', 'about US$10'], ['The 5-minute clean-up', 'US$0 to 2'], ['Stored server images', 'under US$1'], ['Hosting, database, file storage, secrets, monitoring', 'US$0 within free limits'], ['Apple developer account, once enrolled', 'US$8.25 (US$99 a year)'], ['Domain, once bought', 'about US$1']].map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
          <p className="rc-small">Everything else grows with use: maps, the bot check above 10,000 checks a month, hosting traffic and database reads. Spend so far this month is only in Google's {ext('billing reports', `https://console.cloud.google.com/billing/reports?project=${project}`)}; the console can't read it without a billing export. A budget alert is what stops a runaway bug costing hundreds.</p>
        </Fold>
        <Fold id="rc-speed" title="Speed on real phones" note={!r.speed.ok ? "couldn't check" : r.speed.n ? `${plural(r.speed.n, 'visit')} this week` : 'no reports yet'}>
          {!r.speed.ok ? <p className="rc-item unknown rc-plain">Couldn't read the speed reports this time{r.speed.error ? ` (${r.speed.error})` : ''}.</p>
            : !r.speed.n ? <p className="rc-small">No speed reports yet. Each visit to the website sends one, anonymously, once the latest version is live (npm run deploy:all).</p>
            : <>
              <table className="rc-table"><thead><tr><th>Visits</th><th>How many</th><th>First screen (half / 3 in 4)</th><th>Largest picture or text</th><th>Slowest tap answered</th><th>Layout jumps</th></tr></thead>
                <tbody>{r.speed.groups.map(g => <tr key={g.label} className={g.ready > 8000 ? 'warn' : ''}><td>{g.label}</td><td>{g.n}</td>
                  <td>{secs(g.ready50)} / <b className={tone(g.ready, 5000, 8000)}>{secs(g.ready)}</b></td><td className={tone(g.lcp, 2500, 4000)}>{secs(g.lcp)}</td>
                  <td className={tone(g.inp, 200, 500)}>{g.inp === null ? '–' : `${Math.round(g.inp)} ms`}</td><td className={tone(g.cls, 0.1, 0.25)}>{g.cls === null ? '–' : g.cls.toFixed(2)}</td></tr>)}</tbody></table>
              <h4>By the page people opened first</h4>
              <table className="rc-table"><thead><tr><th>Page</th><th>Visits</th><th>First screen, 3 in 4</th></tr></thead>
                <tbody>{r.speed.pages.map(g => <tr key={g.label}><td>{g.label}</td><td>{g.n}</td><td className={tone(g.ready, 5000, 8000)}>{secs(g.ready)}</td></tr>)}</tbody></table>
              <h4>By app version (newest first)</h4>
              <table className="rc-table"><thead><tr><th>Version</th><th>Seen</th><th>Visits</th><th>First screen, 3 in 4</th><th>Slowest tap, 3 in 4</th></tr></thead>
                <tbody>{r.speed.releases.map(g => <tr key={g.label}><td>{g.label}</td><td>{jmDate(g.from)} to {jmDate(g.to)}</td><td>{g.n}</td><td className={tone(g.ready, 5000, 8000)}>{secs(g.ready)}</td><td className={tone(g.inp, 200, 500)}>{g.inp === null ? '–' : `${Math.round(g.inp)} ms`}</td></tr>)}</tbody></table>
            </>}
          <p className="rc-small">Each visit to the Runner website sends one anonymous report: no name, account or location (Runner's privacy policy, "Speed measurements"). Reports are deleted after 30 days. "3 in 4" means three quarters of visits were this fast or faster. Targets: first screen under 5 s is good, over 8 s is slow; largest picture or text under 2.5 s; taps answered under 200 ms; layout jumps under 0.1. Compare versions after each deploy to see whether a change helped.{r.speed.hitLimit ? ' Only the newest 3,000 reports are counted.' : ''}</p>
        </Fold>
      </Section>}

      {tab === 'handbook' && (<>
      <div className="rc-bar">
        <label className="rc-switch"><input type="checkbox" checked={local.launch} onChange={e => { setLocal({ launch: e.target.checked }); addLog({ event: 'mode', what: e.target.checked ? 'Launch mode on' : 'Launch mode off' }); save(); schedule(); }}/> Busy-hours mode <em>checks every minute and logs every alert, for lunch rushes and events</em></label>
        <label className="rc-switch"><input type="checkbox" checked={local.watch} onChange={e => { setLocal({ watch: e.target.checked }); schedule(); }}/> Watch in the background <em>keeps checking and notifies you while the console is open on any page</em></label>
        <label className="rc-name">Your name <input ref={nameRef} className="input" value={local.name} placeholder="for “I'm handling this”" onChange={e => setLocal({ name: e.target.value })}/></label>
        <span className="rc-phone">{k.policies ? `Phone alerts: ${k.policies.filter(p => p.on && p.emails).length} of 3 on (email)` : 'Phone alerts: couldn\'t check'}</span>
      </div>

      {data.ok && clockOff >= 3 && <div className="rc-note">This Mac's clock is {ago(clockOff)} {data.clockOffMs > 0 ? 'ahead of' : 'behind'} Google's. Every wait here uses Google's clock, so it is still right. Fix the Mac's clock in System Settings → General → Date &amp; Time.</div>}

      {/* ── Checklists ─────────────────────────────────────────────────── */}
      <section className="card rc-sec" id="sec-checklists">
        <header><span className={`rc-dot ${leftBefore ? 'look' : 'good'}`}/><h3>Checklists</h3><span className="rc-quiet">{leftBefore ? `${leftBefore} before-launch jobs left.` : 'Before-launch list done.'}</span>
          <Help>Jobs that need your own Google or Firebase sign-in, so no app can do them. Lines the control room can check tick themselves; tick the rest when done. Ticks are kept on this Mac.</Help></header>
        <Fold id="rc-before" title="Before-launch list" note={leftBefore ? `${leftBefore} still open from before launch` : 'all done'} open={false}>
          <p className="rc-small">Kept for reference now Runner is live. Anything still open here is still worth finishing; Android and iPhone come later.</p>
          {r.checklist.map(g => (
            <div key={g.title} className="rc-group"><h4>{g.title}</h4>
              {g.items.map(c => (
                <label key={c.id} className={`rc-check ${c.ticked || c.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={c.ticked || !!c.done} disabled={!!c.done} onChange={() => setLocal(l => ({ ticks: { ...l.ticks, [c.id]: !l.ticks[c.id] } }))}/>
                  <div><p className="rc-what">{c.title}</p>{c.how && <p className="rc-why">{c.how}</p>}
                    {c.found && <p className={`rc-found ${c.done ? 'ok' : ''}`}>Checked just now: {c.found}</p>}
                    {c.link && !(c.ticked || c.done) && <Go link={c.link}/>}</div>
                </label>))}
            </div>))}
        </Fold>
        <StoreSteps />
        {ROUTINES.map(g => {
          const done = g.items.filter(([id]) => routineDone(g.kind, id)).length;
          return (
            <Fold key={g.kind} id={`rc-r-${g.kind}`} title={g.title} note={`${done} of ${g.items.length} done ${g.kind === 'day' ? 'today' : g.kind === 'week' ? 'this week' : g.kind === 'month' ? 'this month' : 'this term'}`} open={g.kind === 'day'}>
              {g.items.map(([id, text, where]) => { const at = routineDone(g.kind, id), last = local.routines[id]; const lk = routineLink(where); return (
                <label key={id} className={`rc-check ${at ? 'done' : ''}`}>
                  <input type="checkbox" checked={!!at} onChange={() => toggleRoutine(id)}/>
                  <div><p className="rc-what">{text}</p><p className="rc-found ok">{last ? `Last done ${jmDate(last)} ${jmTime(last)}` : 'Not done yet'}</p>{lk && !at && <Go link={lk}/>}</div>
                </label>); })}
              <p className="rc-small">This list resets itself every {g.kind === 'term' ? 'term (August, January and June)' : g.kind === 'week' ? 'week on Monday' : g.kind}.</p>
            </Fold>
          );
        })}
      </section>

      {/* ── Launch day ─────────────────────────────────────────────────── */}
      <Fold id="rc-launch" title="Alert log and busy days" note={local.launch ? 'busy-hours mode is on' : `${local.log.length} alerts logged`} open={local.launch}>
        <p className="rc-small">On a busy day one person watches this screen; a second handles WhatsApp and phone calls. The plan below is the launch-day routine, still the right shape for any big day.</p>
        <table className="rc-table"><thead><tr><th>When</th><th>Do</th><th>Watch for</th></tr></thead><tbody>{STATIC_PLAN.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody></table>
        <h4>Alert log <span className="rc-small">every alert with the time it appeared and cleared (Jamaica time)</span></h4>
        <div className="rc-log">{[...local.log].reverse().slice(0, 150).map((e, n) => { const idx = local.log.length - 1 - n; return (
          <div key={idx} className={`rc-log-row ${e.event} ${e.lv || ''}`}><time>{jmDate(e.at).slice(5)} {jmTime(e.at)}</time><span>{e.event === 'appeared' ? `${WORD[e.lv] || ''}: ` : e.event === 'cleared' ? 'Cleared: ' : ''}{e.what}</span>
            {noteFor === idx ? <input className="input" autoFocus defaultValue={e.done || ''} placeholder="What was done" onBlur={ev => { local.log[idx] = { ...e, done: ev.target.value }; save(); setNoteFor(null); }} onKeyDown={ev => { if (ev.key === 'Enter') ev.target.blur(); }}/>
              : <button className="link-btn" onClick={() => setNoteFor(idx)}>{e.done ? `Done: ${e.done}` : 'what was done?'}</button>}</div>); })}
          {!local.log.length && <p className="rc-small">Nothing logged yet.</p>}</div>
        <div className="rc-row"><button className="btn-ghost" onClick={exportLog}>Export the log for the developer</button><button className="btn-ghost" onClick={() => { if (clearing) { setLocal({ log: [] }); setClearing(false); } else setClearing(true); }}>{clearing ? 'Click again to clear it' : 'Clear the log'}</button></div>
      </Fold>

      {/* ── When something breaks ──────────────────────────────────────── */}
      <Fold id="rc-playbooks" title="When something breaks" note="short steps each alert links to">
        <p className="rc-small"><b>First rule in every one:</b> never edit money, balances or floats by hand in the Firebase console. Money changes go through Runner admin, where they are checked and recorded.</p>
        {[
          ['site-down', 'The website is down', ['Open the site on a phone, on mobile data. If it works, the problem is local.', <>Check {ext('status.firebase.google.com', 'https://status.firebase.google.com')} for a Google outage.</>, <>Check Google Cloud {ext('billing', `https://console.cloud.google.com/billing/linkedaccount?project=${project}`)} is active; a failed card suspends everything.</>, <>If it broke right after a deploy, roll back the website: {ext('Firebase → Hosting', `https://console.firebase.google.com/project/${project}/hosting/sites/${project}`)} → Release history → the previous release → Rollback. You can do this.</>, 'Tell the developer, with the time it started.']],
          ['piling', 'Orders are piling up and nobody takes them', ['Check runners online. If 0, message the runners\' group now.', 'If runners are online, ask in the group whether the orders show on their phones. If not, they close and reopen Runner.', 'If many stores are open with no runners, ask stores to switch to closed until runners arrive.', 'Orders left 30 minutes are cancelled by the server, and nobody is charged.']],
          ['cancel', 'An order must be cancelled', ['Until Runner admin has an Orders page, this is done in the Firebase console, and only for an order not yet delivered.', <>Open {ext('Firebase → Firestore Database → orders', `https://console.firebase.google.com/project/${project}/firestore/databases/-default-/data/~2Forders`)}.</>, 'Find the order: its ID ends with the 6-character order code.', 'Edit two fields: status to cancelled; add cancelReason as text admin.', 'Change nothing else. The server then returns the student\'s money and tells the student and runner.', 'Within a minute the order should show Cancelled here. If it does not, tell the developer.']],
          ['paid-nothing', 'A student says they paid but nothing happened', [<>Coins: {ext('Runner admin → Users', `${data.adminUrl}/users`)} → the student. Their coin history shows every payment and refund.</>, <>Card (once Fygaro is on): {ext('Board → "Card payments to check"', `${data.adminUrl}/dashboard`)}. Compare with the Fygaro dashboard before pressing Paid.</>, 'If the order was cancelled after they paid, the money is already in their wallet as coins. Tell them.']],
          ['store-missed', 'A store did not get an order', ['Ask the store to open the Orders tab on its tablet. Orders always show there, even if the notification did not.', 'If nothing shows, sign out and back in on the tablet, and allow notifications when asked.', <>Check the store has a tablet login in {ext('Runner admin → Stores', `${data.adminUrl}/stores`)} → the store → Store access.</>]],
          ['misuse', 'Someone is misusing an account', [<>{ext('Runner admin → Users', `${data.adminUrl}/users`)} → the account → Deactivate. It signs them out everywhere within an hour.</>, <>If it is an admin account, also disable it in {ext('Firebase → Authentication', `https://console.firebase.google.com/project/${project}/authentication/users`)}, then change its password.</>, 'Note what happened and tell the developer.']],
          ['appcheck-blocked', 'Users are blocked after switching on App Check', [<>{ext('Firebase → App Check → APIs', `https://console.firebase.google.com/project/${project}/appcheck/apis`)}: press Unenforce on the database or sign-in. It takes effect within minutes.</>, 'For the server\'s functions, the developer sets APP_CHECK_ENFORCE=false and redeploys.']],
          ['bill', 'The bill jumped', [<>{ext('Google Cloud → Billing → Reports', `https://console.cloud.google.com/billing/reports?project=${project}`)}: group by service to see which one grew.</>, 'If it is still growing by the hour, tell the developer at once: it may be a loop.']],
        ].map(([id, title, steps]) => (
          <details key={id} id={`pb-${id}`} className="rc-playbook"><summary>{title}</summary><ol>{steps.map((x, n) => <li key={n}>{x}</li>)}</ol></details>))}
      </Fold>

      {/* ── When the software changes ──────────────────────────────────── */}
      <Fold id="rc-changes" title="When the software changes" note={k.release?.at ? `last deploy ${jmDate(k.release.at)}` : ''}>
        <table className="rc-table"><thead><tr><th>Job</th><th>Owner (you)</th><th>Developer</th></tr></thead><tbody>
          {[['Decide what changes and when', 'Yes', 'Advises'], ['Change the code, run the checks', 'No', 'Yes'], ['Put a version live (deploy)', 'Approves the time', 'Runs it'], ['Roll the website back to the last version', 'Yes, in Firebase Hosting', 'Yes'], ['Change settings in Firebase or Google Cloud', 'Yes, from a written step', 'Writes the step']].map(r2 => <tr key={r2[0]}>{r2.map(c => <td key={c}>{c}</td>)}</tr>)}</tbody></table>
        <ol className="rc-steps">
          <li>The change goes into GitHub, where the automatic checks run. A red check means it does not go live.</li>
          <li>It goes live in a quiet hour: never 11 am to 2 pm, never during exams, never the day before an event.</li>
          <li>Straight after, this screen must be All good, and someone places one real test order.</li>
          <li>If anything is wrong, roll the website back first, then investigate.</li>
          <li>Write one line in the change log: date, what changed, who deployed it.</li>
        </ol>
        <div className="rc-facts">
          <div><span>Last deploy</span><b>{k.release?.at ? `${jmDate(k.release.at)} ${jmTime(k.release.at)}` : "couldn't check"}</b><small>{k.release?.message ? `"${k.release.message}"` : 'No change-log line was given with this deploy.'}</small></div>
          <div><span>Runner's lists this screen reads</span><b>{k.lists ? `${k.lists.statuses} order steps, ${k.lists.reasons} cancel reasons` : "couldn't read"}</b><small>Read from Runner's shared.ts on every check. Anything new shows as "Couldn't understand: tell the developer".</small></div>
          <div><span>Automatic checks on the newest code</span><b>not connected</b><small>Needs a GitHub sign-in on this Mac, which the console does not have. See them on {ext('GitHub', 'https://github.com/JadanSpencer/Runner/actions')}.</small></div>
          <div><span>Updates waiting (monthly round)</span><b>not connected</b><small>Dependabot's list is on {ext('GitHub', 'https://github.com/JadanSpencer/Runner/security/dependabot')}. Once a year the app framework (Expo 54) needs a bigger upgrade, planned for a holiday.</small></div>
        </div>
        <p className="rc-small">One question on every Runner change: "Does this change anything the control room reads?" If yes, the control room is updated the same day, along with RUNNER_CONTEXT.md in the console folder. Expected: card payments switched on (turn on card alerts, add a daily Fygaro match), Runner's own domain (read automatically from Runner's settings), the Android app (show versions, watch App Check for Android), App Check enforced on the database (already turns red below 90%), an Orders page in Runner admin (point "cancel it" there).</p>
      </Fold>

      <Fold id="rc-words" title="Words you will see" note="plain meanings">
        <table className="rc-table"><tbody>{WORDS.map(([w, m]) => <tr key={w}><td><b>{w}</b></td><td>{m}</td></tr>)}
          {Object.entries(CANCEL_WORDS).slice(0, 6).map(([w, m]) => <tr key={w}><td><em>cancel reason "{w}"</em></td><td>{m}</td></tr>)}</tbody></table>
      </Fold>

      </>)}

      <p className="rc-foot">Read-only: this screen never changes anything in Runner, never deploys and never asks for a key. {data.ok ? `This check read about ${data.reads} records from Runner's database` : ''} (stores, runners and Google's status pages are re-read every 10 minutes; past days every hour). Order names, phone numbers and emails of students are never read; runner names and phones are, so you can call them.</p>
    </div>
  );
}
