// src/OrderDesk.js
// Runner's order desk in the control room (launch, 10 Nov 2026). The owner is
// superadmin here:
//   - every open order at every store, refreshed every few seconds, with what
//     it needs next: the store's yes (answer for it), a runner (give it to
//     one, or take it yourself), the next step, or payment at the door;
//   - opening and closing stores, and the Launch button (only the chosen
//     stores open, the first-50 free deliveries switched on);
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
// The console's own runner (Runner functions/src/shared.ts CONSOLE_RUNNER_UID): you take orders from here.
const CONSOLE_RUNNER = 'console_runner';

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

export default function OrderDesk({ api, project, notify }) {
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
  const keep = d.stores.filter(x => LAUNCH_MATCH.test(x.name));
  const launch = () => {
    if (!keep.length) { setMsg({ ok: false, text: 'No store called Mother\'s or Nardo\'s was found.' }); return; }
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Launch now?\n\nOpen: ${keep.map(x => x.name).join(', ')}\nClose: every other store (${d.stores.length - keep.length})\nStart the first-${d.offer.max} free deliveries.`)) return;
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

  return (
    <div className="desk">
      <section className="card rc-sec">
        <header><span className={`rc-dot ${d.orders.length ? 'look' : 'good'}`}/><h3>Order desk</h3>
          <span className="rc-quiet">{d.orders.length} open · updated {jmTime(d.at)}{err ? ` · last read failed: ${err}` : ''}</span></header>
        {d.transfersToCheck > 0 && <p className="rc-small">{d.transfersToCheck} door transfer{d.transfersToCheck === 1 ? '' : 's'} to check in Runner admin (Bank transfers).</p>}
        {mine.length > 0 && <p className="rc-small"><b>You are running {mine.length} order{mine.length === 1 ? '' : 's'}</b> (shown to customers as "Runner team"). Move each on below; cash you collect is Runner's own, so nothing is owed.</p>}
        {msg && <div className={`rc-note ${msg.ok ? '' : 'rc-bad'}`}>{msg.text}</div>}
        {!d.orders.length && <p className="rc-small">No open orders right now. New ones show here within a few seconds, with a desktop alert.</p>}
        {groups.filter(([k]) => byStage[k].length).map(([k, title, help]) => (
          <div key={k} className="desk-group">
            <h4>{title} · {byStage[k].length}</h4>
            {help && <p className="rc-small">{help}</p>}
            {byStage[k].map(o => <DeskOrder key={o.id} o={o} k={k} runners={runners} busy={busy} act={act}/>)}
          </div>
        ))}
      </section>

      <section className="card rc-sec">
        <header><span className={`rc-dot ${d.offer.on ? 'good' : 'look'}`}/><h3>Launch</h3>
          <span className="rc-quiet">free deliveries {d.offer.on ? 'on' : 'off'} · {d.offer.given} of {d.offer.max} used</span></header>
        <p className="rc-small">Launch opens only {keep.length ? keep.map(x => x.name).join(' and ') : 'Mother\'s and Nardo\'s'}, closes every other store, and starts the free delivery for the first {d.offer.max} people to order. Customers see the places left in the app.</p>
        <div className="rc-row">
          <button className="btn-ghost" disabled={!!busy} onClick={launch}>{busy === 'launch' ? 'Launching…' : 'Launch'}</button>
          <button className="btn-ghost" disabled={!!busy} onClick={() => act('offer', { action: 'launchOffer', on: !d.offer.on }, r => `Free deliveries ${r.on ? 'on' : 'off'}: ${r.given} of ${r.max} used.`)}>{d.offer.on ? 'Stop free deliveries' : 'Start free deliveries only'}</button>
        </div>
        <h4>Stores</h4>
        <ul className="desk-stores">
          {d.stores.map(x => (
            <li key={x.id}>
              <span className={x.open ? 'good' : ''}>{x.name}</span><em>{x.open ? 'Open' : 'Closed'}</em>
              <button className="btn-ghost" disabled={!!busy} onClick={() => act(`s${x.id}`, { action: 'storeOpen', storeId: x.id, open: !x.open }, () => `${x.name} is now ${x.open ? 'closed' : 'open'}.`)}>{x.open ? 'Close' : 'Open'}</button>
            </li>
          ))}
        </ul>
      </section>

      <Coins api={api} project={project}/>
    </div>
  );
}

function DeskOrder({ o, k, runners, busy, act }) {
  const [runner, setRunner] = useState('');
  const [ref, setRef] = useState('');
  const pick = runner;
  const b = key => busy === `${key}${o.id}`;
  const cancel = () => {
    // eslint-disable-next-line no-alert
    const why = window.prompt('Why cancel it? The customer is told; nothing was charged.');
    if (why && why.trim().length >= 3) act(`c${o.id}`, { action: 'cancelOrder', orderId: o.id, reason: why.trim() }, () => `#${o.code} cancelled.`);
  };
  const mine = o.dasherId === CONSOLE_RUNNER;
  return (
    <div className={`desk-order ${k}`}>
      <p className="rc-what">#{o.code} · {o.storeName || 'Store'} · {J(o.totalAmount)}{o.deliveryDiscountJmd ? ' (free delivery)' : ''} · {PAY(o)}</p>
      <p className="rc-why">
        {o.customer} · {o.fulfilment === 'pickup' ? 'Pickup' : o.place || 'No place'} · placed {jmTime(o.createdAt)}
        {o.dasherId ? ` · runner ${mine ? 'you' : (runners.find(x => x.id === o.dasherId)?.name || o.dasherName || 'Runner')}` : ''}
        {o.storeAnswerBy && !o.storeConfirmedAt ? ` · store must answer by ${jmTime(o.storeAnswerBy)}` : ''}
      </p>
      {o.items.length > 0 && <p className="rc-why">{o.items.map(i => `${i.quantity} × ${i.name}`).join(', ')}</p>}
      {o.studentNote && <p className="rc-why"><b>Note</b> {o.studentNote}</p>}
      {mine && o.chat && <Chat o={o} busy={busy} act={act}/>}
      <div className="rc-row">
        {k === 'store' && <>
          <button className="btn-ghost" disabled={!!busy} onClick={() => act(`y${o.id}`, { action: 'answerOrder', orderId: o.id, answer: 'yes' }, () => `#${o.code}: the store said yes${o.fulfilment === 'pickup' ? '' : '. It goes to runners now'}.`)}>{b('y') ? 'Saving…' : 'Store says yes'}</button>
          <button className="btn-ghost" disabled={!!busy} onClick={() => act(`n${o.id}`, { action: 'answerOrder', orderId: o.id, answer: 'no' }, () => `#${o.code} declined. The customer is told; nothing was charged.`)}>Store can't</button>
        </>}
        {k === 'runner' && <>
          <button className="btn-ghost" disabled={!!busy} onClick={() => act(`me${o.id}`, { action: 'assignOrder', orderId: o.id, runnerUid: CONSOLE_RUNNER }, () => `#${o.code} is yours. It is confirmed now: go to ${o.storeName || 'the store'}.`)}>{b('me') ? 'Taking…' : 'Take it myself'}</button>
          <select className="input" value={pick} onChange={e => setRunner(e.target.value)} aria-label="Runner">
            <option value="">or give it to…</option>
            {runners.map(x => <option key={x.id} value={x.id} disabled={x.busy}>{x.name}{x.online ? ' · online' : ''}{x.busy ? ' · busy' : ''}</option>)}
          </select>
          <button className="btn-ghost" disabled={!!busy || !pick} onClick={() => act(`a${o.id}`, { action: 'assignOrder', orderId: o.id, runnerUid: pick }, () => `#${o.code} given to ${runners.find(x => x.id === pick)?.name || 'the runner'}. It is confirmed now.`)}>{b('a') ? 'Giving…' : 'Give it'}</button>
        </>}
        {k === 'moving' && NEXT_WORD[o.status] && !o.ask &&
          <button className="btn-ghost" disabled={!!busy} onClick={() => act(`m${o.id}`, { action: 'advanceOrder', orderId: o.id }, () => `#${o.code}: ${NEXT_WORD[o.status].replace('Mark: ', '')}.`)}>{b('m') ? 'Saving…' : NEXT_WORD[o.status]}</button>}
        {(k === 'door' || (k === 'counter' && o.paymentStatus === 'cash_due')) && <>
          <button className="btn-ghost" disabled={!!busy} onClick={() => act(`p${o.id}`, { action: 'doorPaid', orderId: o.id, how: 'cash' }, () => `#${o.code}: cash paid${k === 'door' ? ', delivered. The runner holds the cash' : ''}.`)}>{b('p') ? 'Saving…' : 'Cash paid'}</button>
          {k === 'door' && <>
            <input className="input" placeholder="Transfer reference" value={ref} onChange={e => setRef(e.target.value)} aria-label="Transfer reference"/>
            <button className="btn-ghost" disabled={!!busy || ref.trim().length < 3} onClick={() => act(`t${o.id}`, { action: 'doorPaid', orderId: o.id, how: 'transfer', reference: ref.trim() }, () => `#${o.code}: paid by transfer, delivered. Check the bank, then mark it in Runner admin.`)}>Paid by transfer</button>
          </>}
          <button className="btn-ghost" disabled={!!busy} onClick={() => {
            // eslint-disable-next-line no-alert
            if (window.confirm('Not paid? The order is cancelled and logged, and they can no longer pay on delivery.')) act(`x${o.id}`, { action: 'doorPaid', orderId: o.id, how: 'none' }, () => `#${o.code}: not paid, logged.`);
          }}>Not paid</button>
        </>}
        {o.status === 'pending' && <button className="btn-ghost" disabled={!!busy} onClick={cancel}>Cancel</button>}
      </div>
    </div>
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
