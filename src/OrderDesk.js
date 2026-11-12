// src/OrderDesk.js
// Runner's order desk in the control room (launch: Monday 16 Nov 2026). The owner is
// superadmin here:
//   - every open order at every store, refreshed every few seconds, with what
//     it needs next: the store's yes (answer for it), a runner (give it to
//     one, or take it yourself), the next step, or payment at the door;
//   - the launch plan: which stores open, a readiness list that checks itself,
//     and the Launch button (only the chosen stores open, the first-50 free
//     deliveries switched on); opening and closing any store;
//   - coins with no limit: into anyone's wallet, or an admin runner's stock.
// Every change goes through Runner's checked ownerAction endpoint
// (functions/src/owner.ts) and is logged there.

import React, { useEffect, useRef, useState } from 'react';
import { J, jmTime } from './runnerOps';

const POLL_MS = 8000;
const STEP = { pending: 'Waiting', accepted: 'Runner has it', picking_up: 'At the store', on_the_way: 'On the way' };
const NEXT_WORD = { accepted: 'Mark: at the store', picking_up: 'Mark: on the way', on_the_way: 'Mark: delivered' };
const PAY = o => (o.paymentMethod === 'cash' ? (o.fulfilment === 'pickup' ? 'Cash at the counter' : 'Pay on delivery') : o.paymentMethod === 'tokens' ? 'Runner coins' : o.paymentMethod === 'card' ? 'Card' : 'Not chosen');
const LAUNCH_MATCH = /mother|nardo/i;
// Launch day (owner, 11 Nov 2026): Monday 16 November 2026. The venture's own
// launch date in the console wins if it is set to a later day.
export const LAUNCH_DAY = '2026-11-16';
const STORE_ANSWER_WARN_MS = 3 * 60 * 1000;
export const dayWords = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('en-JM', { weekday: 'long', day: 'numeric', month: 'long' });
const todayIso = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); // Jamaica has no daylight saving
export const daysTo = iso => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 864e5);
const minsLeft = at => Math.max(0, Math.ceil((Number(at) - Date.now()) / 60000));
// The console's own runner (Runner functions/src/shared.ts CONSOLE_RUNNER_UID): you take orders from here.
const CONSOLE_RUNNER = 'console_runner';

// The steps on each docket's tracker, and how far an order has got.
const TRACK = { delivery: ['Placed', 'Store', 'Runner', 'At store', 'On the way', 'Delivered'], pickup: ['Placed', 'Store', 'Being made', 'Ready', 'Collected'] };
function progress(o) {
  if (o.fulfilment === 'pickup') return o.status === 'pending' ? (o.verifiedAt ? 1 : 0) : o.readyAt ? 3 : 2;
  if (o.status === 'pending') return !o.verifiedAt ? 0 : Number(o.storeAskedAt) > 0 && !o.storeConfirmedAt ? 1 : 2;
  return { accepted: 3, picking_up: 3, on_the_way: 4 }[o.status] ?? 2;
}
function Track({ o }) {
  const steps = TRACK[o.fulfilment === 'pickup' ? 'pickup' : 'delivery'], at = progress(o);
  // accepted = heading to the store; picking_up = at the store
  const here = o.fulfilment !== 'pickup' && o.status === 'accepted' ? 2.5 : at;
  return (
    <ol className="dk-track" aria-label={`Step: ${steps[Math.floor(here)]}`}>
      {steps.map((w, i) => <li key={w} className={i < here ? 'done' : i === Math.ceil(here) || i === here ? 'now' : ''}><i/><span>{w}</span></li>)}
    </ol>
  );
}

// What an order needs from someone now.
function stage(o) {
  if (o.status === 'pending') {
    if (!o.verifiedAt) return { key: 'checking', word: 'Being checked' };
    if (Number(o.storeAskedAt) > 0 && !o.storeConfirmedAt) return { key: 'store', word: 'Needs the store\'s yes' };
    if (o.fulfilment === 'pickup') return { key: 'other', word: 'Waiting' };
    return { key: 'runner', word: 'Needs a runner' };
  }
  if (o.fulfilment === 'pickup') return { key: 'counter', word: o.readyAt ? 'Ready at the counter' : 'Being made' };
  if (o.status === 'on_the_way' && o.paymentStatus === 'cash_due') return { key: 'door', word: 'Collect payment at the door' };
  return { key: 'moving', word: STEP[o.status] || o.status };
}

export default function OrderDesk({ api, project, notify, launchDate = '' }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const seen = useRef(null);

  const load = async () => {
    const r = await api.desk(project);
    if (!r?.ok) { setErr(r?.error || 'Couldn\'t read Runner'); return; }
    setErr('');
    // A sound-free desktop alert for each new order after the first read.
    if (seen.current && notify) r.orders.filter(o => !seen.current.has(o.id)).forEach(o => notify('New Runner order', `${o.storeName || 'Store'} · ${J(o.totalAmount)} · ${o.customer}`));
    seen.current = new Set(r.orders.map(o => o.id));
    setD(r);
  };
  useEffect(() => {
    if (!api?.desk) return undefined;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [api, project]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (key, body, okText) => {
    if (busy) return;
    setBusy(key); setMsg(null);
    const r = await api.ownerAction(project, body);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: okText(r) } : { ok: false, text: r.error });
    if (r.ok) load();
  };

  if (!api?.desk) return <section className="card rc-sec"><p className="rc-small">Quit JCommerce Console with ⌘Q and open it again to load the order desk.</p></section>;
  if (!d) return <section className="card rc-sec"><p className="rc-small">{err || 'Reading every open order…'}</p></section>;

  const runners = d.runners.filter(x => x.verified && x.id !== CONSOLE_RUNNER);
  const mine = d.orders.filter(o => o.dasherId === CONSOLE_RUNNER);
  const groups = [
    ['store', 'Needs the store\'s yes', 'Call the store, then answer for it. Stores with a tablet answer themselves, but you can answer for any store.'],
    ['runner', 'Needs a runner', 'Take it yourself, or give it to a runner who is free.'],
    ['door', 'Collect payment at the door', 'Pay on delivery: record what happened when it arrived.'],
    ['moving', 'With a runner', 'Move it on if the runner can\'t, or if you are the runner.'],
    ['counter', 'Pickups at the counter', 'The store marks these ready and takes the cash.'],
    ['checking', 'Being checked', 'Runner\'s server is pricing these. They move on by themselves in a few seconds.'],
    ['other', 'Waiting', ''],
  ];
  const byStage = Object.fromEntries(groups.map(([k]) => [k, []]));
  d.orders.forEach(o => byStage[stage(o).key].push(o));
  const needsYou = byStage.store.length + byStage.runner.length + byStage.door.length;
  const online = runners.filter(x => x.online).length;
  const openStores = d.stores.filter(x => x.open).length;
  // The answer clock keeps moving between reads.
  const soon = byStage.store.filter(o => o.storeAnswerBy && Number(o.storeAnswerBy) - Date.now() < STORE_ANSWER_WARN_MS).length;

  return (
    <div className="desk">
      <section className="card rc-sec">
        <header><span className={`rc-dot ${d.orders.length ? 'look' : 'good'}`}/><h3>Order desk</h3>
          <span className="rc-quiet">{d.orders.length} open · updated {jmTime(d.at)}{err ? ` · last read failed: ${err}` : ''}</span></header>
        <div className="desk-tiles">
          <div className={needsYou ? 'look' : ''}><b>{needsYou}</b><span>need you now</span></div>
          <div><b>{d.orders.length}</b><span>open orders</span></div>
          <div className={online ? '' : 'look'}><b>{online}</b><span>runners online</span></div>
          <div><b>{openStores}</b><span>stores open</span></div>
          <div><b>{d.offer.given}/{d.offer.max}</b><span>free deliveries {d.offer.on ? 'used' : '(off)'}</span></div>
        </div>
        {soon > 0 && <div className="rc-note rc-bad">{soon} order{soon === 1 ? '' : 's'} will be cancelled within 3 minutes unless the store answers. Answer for the store below.</div>}
        {d.transfersToCheck > 0 && <p className="rc-small">{d.transfersToCheck} door transfer{d.transfersToCheck === 1 ? '' : 's'} to check in Runner admin (Bank transfers).</p>}
        {mine.length > 0 && <p className="rc-small"><b>You are running {mine.length} order{mine.length === 1 ? '' : 's'}</b> (shown to customers as "Runner team"). Move each on below; cash you collect is Runner's own, so nothing is owed.</p>}
        {msg && <div className={`rc-note ${msg.ok ? '' : 'rc-bad'}`}>{msg.text}</div>}
        {!d.orders.length && <p className="rc-small">No open orders right now. New ones show here within a few seconds, with a desktop alert.</p>}
        {groups.filter(([k]) => byStage[k].length).map(([k, title, help]) => (
          <div key={k} className={`desk-group tray-${k}`}>
            <h4 className="tray"><span>{title}</span><b>{byStage[k].length}</b></h4>
            {help && <p className="rc-small">{help}</p>}
            {byStage[k].map(o => <DeskOrder key={o.id} o={o} k={k} runners={runners} busy={busy} act={act}/>)}
          </div>
        ))}
      </section>

      <Launch d={d} api={api} project={project} busy={busy} setBusy={setBusy} setMsg={setMsg} act={act} load={load} launchDate={launchDate} runners={runners}/>

      <Coins api={api} project={project}/>
    </div>
  );
}

function DeskOrder({ o, k, runners, busy, act }) {
  const [runner, setRunner] = useState('');
  const [ref, setRef] = useState('');
  const pick = runner;
  const b = key => busy === `${key}${o.id}`;
  // The reason is typed here: the Mac app has no pop-up to type into.
  const [why, setWhy] = useState(null);
  const cancel = () => {
    if (why === null) { setWhy(''); return; }
    if (why.trim().length >= 3) act(`c${o.id}`, { action: 'cancelOrder', orderId: o.id, reason: why.trim() }, () => `#${o.code} cancelled.`);
  };
  const left = k === 'store' && o.storeAnswerBy && !o.storeConfirmedAt ? minsLeft(o.storeAnswerBy) : null;
  const mine = o.dasherId === CONSOLE_RUNNER;
  return (
    <div className={`desk-order docket ${k}`}>
      <div className="dk-head">
        <span className="dk-code">#{o.code}</span>
        <span className="dk-store">{o.storeName || 'Store'}</span>
        <span className="dk-pay">{PAY(o)}{o.deliveryDiscountJmd ? ' · free delivery' : ''}</span>
        <span className="dk-amt">{J(o.totalAmount)}</span>
      </div>
      <Track o={o}/>
      <p className="rc-why">
        {o.customer} · {o.fulfilment === 'pickup' ? 'Pickup' : o.place || 'No place'} · placed {jmTime(o.createdAt)}
        {o.dasherId ? ` · runner ${mine ? 'you' : (runners.find(x => x.id === o.dasherId)?.name || o.dasherName || 'Runner')}` : ''}
        {left !== null ? ` · store must answer by ${jmTime(o.storeAnswerBy)}` : ''}
      </p>
      {left !== null && <p className={`desk-clock ${left <= 3 ? 'late' : ''}`}>{left ? `${left} min left to answer` : 'Out of time: it is being cancelled'}</p>}
      {o.items.length > 0 && <p className="rc-why">{o.items.map(i => `${i.quantity} × ${i.name}`).join(', ')}</p>}
      {o.studentNote && <p className="rc-why"><b>Note</b> {o.studentNote}</p>}
      {mine && o.chat && <Chat o={o} busy={busy} act={act}/>}
      <div className="rc-row">
        {k === 'store' && <>
          <button className="btn-primary" disabled={!!busy} onClick={() => act(`y${o.id}`, { action: 'answerOrder', orderId: o.id, answer: 'yes' }, () => `#${o.code}: the store said yes${o.fulfilment === 'pickup' ? '' : '. It goes to runners now'}.`)}>{b('y') ? 'Saving…' : 'Store says yes'}</button>
          <button className="btn-ghost" disabled={!!busy} onClick={() => act(`n${o.id}`, { action: 'answerOrder', orderId: o.id, answer: 'no' }, () => `#${o.code} declined. The customer is told; nothing was charged.`)}>Store can't</button>
        </>}
        {k === 'runner' && <>
          <button className="btn-primary" disabled={!!busy} onClick={() => act(`me${o.id}`, { action: 'assignOrder', orderId: o.id, runnerUid: CONSOLE_RUNNER }, () => `#${o.code} is yours. It is confirmed now: go to ${o.storeName || 'the store'}.`)}>{b('me') ? 'Taking…' : 'Take it myself'}</button>
          <select className="input" value={pick} onChange={e => setRunner(e.target.value)} aria-label="Runner">
            <option value="">or give it to…</option>
            {runners.map(x => <option key={x.id} value={x.id} disabled={x.busy}>{x.name}{x.online ? ' · online' : ''}{x.busy ? ' · busy' : ''}</option>)}
          </select>
          <button className="btn-ghost" disabled={!!busy || !pick} onClick={() => act(`a${o.id}`, { action: 'assignOrder', orderId: o.id, runnerUid: pick }, () => `#${o.code} given to ${runners.find(x => x.id === pick)?.name || 'the runner'}. It is confirmed now.`)}>{b('a') ? 'Giving…' : 'Give it'}</button>
        </>}
        {k === 'moving' && NEXT_WORD[o.status] && !o.ask &&
          <button className="btn-primary" disabled={!!busy} onClick={() => act(`m${o.id}`, { action: 'advanceOrder', orderId: o.id }, () => `#${o.code}: ${NEXT_WORD[o.status].replace('Mark: ', '')}.`)}>{b('m') ? 'Saving…' : NEXT_WORD[o.status]}</button>}
        {(k === 'door' || (k === 'counter' && o.paymentStatus === 'cash_due')) && <>
          <button className="btn-primary" disabled={!!busy} onClick={() => act(`p${o.id}`, { action: 'doorPaid', orderId: o.id, how: 'cash' }, () => `#${o.code}: cash paid${k === 'door' ? ', delivered. The runner holds the cash' : ''}.`)}>{b('p') ? 'Saving…' : 'Cash paid'}</button>
          {k === 'door' && <>
            <input className="input" placeholder="Transfer reference" value={ref} onChange={e => setRef(e.target.value)} aria-label="Transfer reference"/>
            <button className="btn-ghost" disabled={!!busy || ref.trim().length < 3} onClick={() => act(`t${o.id}`, { action: 'doorPaid', orderId: o.id, how: 'transfer', reference: ref.trim() }, () => `#${o.code}: paid by transfer, delivered. Check the bank, then mark it in Runner admin.`)}>Paid by transfer</button>
          </>}
          <button className="btn-ghost" disabled={!!busy} onClick={() => {
            // eslint-disable-next-line no-alert
            if (window.confirm('Not paid? The order is cancelled and logged, and they can no longer pay on delivery.')) act(`x${o.id}`, { action: 'doorPaid', orderId: o.id, how: 'none' }, () => `#${o.code}: not paid, logged.`);
          }}>Not paid</button>
        </>}
        {o.status === 'pending' && why === null && <button className="btn-ghost" disabled={!!busy} onClick={cancel}>Cancel order</button>}
      </div>
      {why !== null && (
        <form className="rc-row" onSubmit={e => { e.preventDefault(); cancel(); }}>
          <input className="input" autoFocus maxLength={300} placeholder="Why cancel it? The customer is told; nothing was charged." value={why} onChange={e => setWhy(e.target.value)} aria-label="Reason for cancelling"/>
          <button className="btn-ghost" disabled={!!busy || why.trim().length < 3}>{b('c') ? 'Cancelling…' : 'Cancel the order'}</button>
          <button type="button" className="btn-ghost" onClick={() => setWhy(null)}>Keep it</button>
        </form>
      )}
    </div>
  );
}

// Launch day. The plan is set here ahead of time (which stores open; saved on
// this Mac), the list underneath checks itself from live data, and one button
// does it: opens only the chosen stores and starts the first free deliveries.
function Launch({ d, api, project, busy, setBusy, setMsg, act, load, launchDate, runners }) {
  const KEY = `rc_launch_stores_${project}`;
  const day = launchDate && launchDate > LAUNCH_DAY ? launchDate : LAUNCH_DAY;
  const [picked, setPicked] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(v)) return v; } catch { /* first time */ }
    return null;
  });
  // Until the owner chooses: Mother's and Nardo's (the plan of 10 Nov 2026).
  const ids = (picked ?? d.stores.filter(x => LAUNCH_MATCH.test(x.name)).map(x => x.id)).filter(id => d.stores.some(x => x.id === id));
  const keep = d.stores.filter(x => ids.includes(x.id));
  const toggle = id => {
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    setPicked(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* still works for this visit */ }
  };
  const n = daysTo(day);
  const live = d.offer.on;
  const online = runners.filter(x => x.online).length;
  const noTablet = keep.filter(x => !x.tablet);
  const noAlerts = keep.filter(x => x.tablet && !x.alerts);
  // good: ready. look: works, but know about it. act: fix before launching.
  const checks = [
    keep.length
      ? ['good', `${keep.length} store${keep.length === 1 ? '' : 's'} will open: ${keep.map(x => x.name).join(', ')}`, `Every other store (${d.stores.length - keep.length}) is closed by the Launch button.`]
      : ['act', 'No store is chosen to open', 'Tick at least one store below.'],
    d.bankSet
      ? ['good', 'Runner\'s bank account is entered', 'Customers paying by transfer see it on their order.']
      : ['act', 'Runner\'s bank account isn\'t entered', 'Without it nobody can pay on delivery by transfer, only cash. Enter it: "Is it running" tab → "WhatsApp number and bank account".'],
    ...(noTablet.length ? [['look', `No tablet login: ${noTablet.map(x => x.name).join(', ')}`, 'Its orders wait for you here under "Needs the store\'s yes". Call the store and answer within 10 minutes, or the order is cancelled.']] : []),
    ...(noAlerts.length ? [['look', `Tablet alerts are off: ${noAlerts.map(x => x.name).join(', ')}`, 'The tablet is signed in but won\'t ring for a new order. Open Runner on it and allow notifications, or answer for it here.']] : []),
    ...(keep.length && !noTablet.length && !noAlerts.length ? [['good', 'Every chosen store has a tablet with alerts on', 'They answer their own orders; you can still answer for them here.']] : []),
    online
      ? ['good', `${online} runner${online === 1 ? ' is' : 's are'} online`, `${runners.length} verified in all.`]
      : ['look', 'No runner is online', runners.length ? `${runners.length} verified runner${runners.length === 1 ? '' : 's'}, none online. Orders wait 30 minutes for a runner: give them to one here, or press "Take it myself".` : 'There are no verified runners. You run every order yourself with "Take it myself".'],
    live || !d.orders.length
      ? ['good', live ? 'Free deliveries are running' : 'No test orders are open', live ? `${d.offer.given} of ${d.offer.max} used.` : 'The desk is clear.']
      : ['look', `${d.orders.length} order${d.orders.length === 1 ? ' is' : 's are'} still open`, 'Finish or cancel test orders before launch so they don\'t mix with real ones.'],
    ...(!live && d.offer.given > 0 ? [['look', `${d.offer.given} of the ${d.offer.max} free deliveries are already used`, 'From an earlier switch-on. The count carries on from there.']] : []),
    ...(d.transfersToCheck ? [['look', `${d.transfersToCheck} door transfer${d.transfersToCheck === 1 ? '' : 's'} to check`, 'Runner admin → Bank transfers.']] : []),
  ];
  const blocked = checks.some(c => c[0] === 'act');
  const ready = checks.filter(c => c[0] === 'good').length;
  const launch = () => {
    if (!keep.length) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Launch now?\n\nOpen: ${keep.map(x => x.name).join(', ')}\nClose: every other store (${d.stores.length - keep.length})\nStart the first-${d.offer.max} free deliveries.${d.bankSet ? '' : '\n\nThe bank account is NOT entered: customers can only pay cash on delivery.'}`)) return;
    (async () => {
      setBusy('launch'); setMsg(null);
      const stores = await api.ownerAction(project, { action: 'onlyStoresOpen', storeIds: keep.map(x => x.id) });
      if (!stores.ok) { setBusy(''); setMsg({ ok: false, text: `Nothing changed: ${stores.error}` }); return; }
      const offer = await api.ownerAction(project, { action: 'launchOffer', on: true });
      setBusy('');
      setMsg(offer.ok
        ? { ok: true, text: `Launched. Open: ${keep.map(x => x.name).join(', ')}; ${stores.closed} other stores closed. Free deliveries are on: ${offer.given} of ${offer.max} used.` }
        : { ok: false, text: `Stores done (${stores.closed} closed), but the free deliveries didn't start: ${offer.error}. Press "Start free deliveries only".` });
      load();
    })();
  };
  const when = live ? `live${d.offer.startedAt ? ` since ${jmTime(d.offer.startedAt)}` : ''}` : n > 1 ? `${n} days to go` : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'launch day has passed';

  return (
    <section className="card rc-sec">
      <header><span className={`rc-dot ${live ? 'good' : blocked ? 'act' : 'look'}`}/><h3>Launch: {dayWords(day)}</h3>
        <span className="rc-quiet">{when} · free deliveries {live ? 'on' : 'off'} · {d.offer.given} of {d.offer.max} used</span></header>
      <div className="launch-board">
        <div className={`launch-count ${live ? 'live' : ''}`}>
          <b>{live ? 'Live' : n > 0 ? n : n === 0 ? 'Today' : 'Past'}</b>
          <span>{live ? `${d.offer.given} of ${d.offer.max} free deliveries used` : n > 0 ? `day${n === 1 ? '' : 's'} to launch` : n === 0 ? 'launch day' : 'the date has passed'}</span>
        </div>
        <div className="launch-meter">
          <p><b>{ready} of {checks.length}</b> checks ready{blocked ? ' · fix the red one before launch' : ready === checks.length ? ' · clear to launch' : ' · the amber ones still work'}</p>
          <div className="meter" role="img" aria-label={`${ready} of ${checks.length} ready`}>{checks.map(([lv, what]) => <i key={what} className={lv}/>)}</div>
        </div>
      </div>
      <p className="rc-small">Set the plan now, then press Launch on the day. Launch opens only the stores you ticked, closes every other store, and starts the free delivery for the first {d.offer.max} people to order. Customers see the places left in the app.</p>

      <h4>Ready for launch?</h4>
      <ul className="desk-checks">
        {checks.map(([lv, what, why]) => <li key={what} className={lv}><span className={`rc-dot ${lv}`}/><div><b>{what}</b><p>{why}</p></div></li>)}
      </ul>

      <div className="rc-row">
        <button className="btn-primary" disabled={!!busy || !keep.length} onClick={launch}>{busy === 'launch' ? 'Launching…' : live ? 'Launch again (re-apply the stores)' : 'Launch now'}</button>
        <button className="btn-ghost" disabled={!!busy} onClick={() => act('offer', { action: 'launchOffer', on: !d.offer.on }, r => `Free deliveries ${r.on ? 'on' : 'off'}: ${r.given} of ${r.max} used.`)}>{d.offer.on ? 'Stop free deliveries' : 'Start free deliveries only'}</button>
      </div>

      <h4>Stores</h4>
      <p className="rc-small">Tick the stores that open at launch (kept on this Mac). Open and Close change a store right now.</p>
      <ul className="desk-stores">
        {d.stores.map(x => (
          <li key={x.id} className={ids.includes(x.id) ? 'picked' : ''}>
            <label><input type="checkbox" checked={ids.includes(x.id)} onChange={() => toggle(x.id)} aria-label={`Open ${x.name} at launch`}/>
              <i className={`lamp ${x.open ? 'on' : ''}`} aria-hidden="true"/><span className={x.open ? 'good' : ''}>{x.name}</span></label>
            <em>{x.open ? 'Open' : 'Closed'}{x.tablet ? (x.alerts ? '' : ' · alerts off') : ' · no tablet'}</em>
            <button className="btn-ghost" disabled={!!busy} onClick={() => act(`s${x.id}`, { action: 'storeOpen', storeId: x.id, open: !x.open }, () => `${x.name} is now ${x.open ? 'closed' : 'open'}.`)}>{x.open ? 'Close' : 'Open'}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The order chat on an order you took: the customer gets it in the app or on WhatsApp.
function Chat({ o, busy, act }) {
  const [text, setText] = useState('');
  const send = e => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    act(`chat${o.id}`, { action: 'orderMessage', orderId: o.id, text: t }, () => `Sent to ${o.customer}.`);
    setText('');
  };
  return (
    <div className="desk-chat">
      {o.chat.length ? o.chat.slice(-8).map((m, i) => <p key={i} className={m.mine ? 'mine' : ''}><b>{m.mine ? 'You' : o.customer}</b> {m.text}</p>)
        : <p className="rc-small">No messages yet.</p>}
      <form className="rc-row" onSubmit={send}>
        <input className="input" maxLength={500} placeholder={`Message ${o.customer}`} value={text} onChange={e => setText(e.target.value)} aria-label="Message the customer"/>
        <button className="btn-ghost" disabled={!!busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}

// Superadmin coins: no cap. Wallet coins go straight to the customer; stock is
// what an admin runner sells for cash (they hand the cash in).
function Coins({ api, project }) {
  const [text, setText] = useState('');
  const [found, setFound] = useState(null);
  const [who, setWho] = useState(null);
  const [coins, setCoins] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const look = async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null); setWho(null);
    const r = await api.findUser(project, text);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.error }); setFound(null); return; }
    setFound(r.users);
    if (r.users.length === 1) setWho(r.users[0]);
  };
  const send = async kind => {
    const n = Math.round(Number(coins));
    if (!who || !Number.isInteger(n) || n === 0 || note.trim().length < 3 || busy) return;
    // eslint-disable-next-line no-alert
    if (Math.abs(n) >= 10000 && !window.confirm(`${n > 0 ? 'Give' : 'Take back'} ${Math.abs(n).toLocaleString('en-US')} coins (J$${Math.abs(n).toLocaleString('en-US')})${kind === 'allocateCoins' ? ' of selling stock' : ''} for ${who.name || who.email}?`)) return;
    setBusy(true); setMsg(null);
    const r = await api.ownerAction(project, { action: kind, uid: who.id, coins: n, note: note.trim() });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: `${who.name || who.email} now has ${Number(r.balanceJmd).toLocaleString('en-US')} ${kind === 'giveCoins' ? 'coins' : 'coins of stock to sell'}.` });
      setWho({ ...who, [kind === 'giveCoins' ? 'coins' : 'stock']: r.balanceJmd }); setCoins(''); setNote('');
    } else setMsg({ ok: false, text: r.error });
  };
  return (
    <section className="card rc-sec">
      <header><span className="rc-dot good"/><h3>Coins</h3><span className="rc-quiet">superadmin · no limit · 1 coin = J$1</span></header>
      <p className="rc-small">Find the account by email or phone. Give coins straight into their wallet, or give an admin runner stock to sell for cash. A minus number takes coins back (never more than they have free).</p>
      <form className="rc-row" onSubmit={look}>
        <input className="input" placeholder="Email or phone" value={text} onChange={e => setText(e.target.value)} aria-label="Email or phone"/>
        <button className="btn-ghost" disabled={busy || text.trim().length < 4}>{busy && !who ? 'Looking…' : 'Find'}</button>
      </form>
      {found && !found.length && <p className="rc-small">No account has exactly that email or phone.</p>}
      {found && found.length > 1 && <div className="rc-row">{found.map(u => <button key={u.id} className="btn-ghost" onClick={() => setWho(u)}>{u.name || u.email} · {u.role}</button>)}</div>}
      {who && <>
        <p className="rc-what">{who.name || 'No name'} · {who.email || who.phone} · {who.role}{who.adminRunner ? ', admin runner' : ''}</p>
        <p className="rc-why">Wallet: {who.coins.toLocaleString('en-US')} coins{who.adminRunner ? ` · stock to sell: ${who.stock.toLocaleString('en-US')}` : ''}</p>
        <div className="rc-row">
          <input className="input" style={{ maxWidth: 160 }} placeholder="Coins, e.g. 5000" value={coins} onChange={e => setCoins(e.target.value.replace(/[^0-9-]/g, ''))} aria-label="Coins"/>
          <input className="input" placeholder="Note, e.g. Launch float for Kemar" value={note} onChange={e => setNote(e.target.value)} aria-label="Note"/>
          <button className="btn-ghost" disabled={busy || !coins || note.trim().length < 3} onClick={() => send('giveCoins')}>Into their wallet</button>
          {who.adminRunner && <button className="btn-ghost" disabled={busy || !coins || note.trim().length < 3} onClick={() => send('allocateCoins')}>As stock to sell</button>}
        </div>
      </>}
      {msg && <div className={`rc-note ${msg.ok ? '' : 'rc-bad'}`}>{msg.text}</div>}
    </section>
  );
}
