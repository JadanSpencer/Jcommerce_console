// src/runnerOps.js
// Runner control room: turns one snapshot of Runner (electron/ops.js) into a
// verdict, alerts with what to do about each, and the tables the owner needs.
// Nothing here talks to the network or to React, so it can be tested with
// made-up data. The spec it follows is "Runner Control Room: What It Must Do"
// (see RUNNER_CONTEXT.md).
//
// Levels: 'act' red (now), 'look' amber (within the hour), 'unknown' amber (a
// check that could not be made, never shown as "none"), 'info' (no colour,
// does not change the verdict).

const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const mins = ms => Math.max(0, Math.round(ms / MIN));
export const J = n => `${n < 0 ? '−' : ''}J$${Math.abs(Math.round(n || 0)).toLocaleString('en-US')}`;
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const ago = m => (m < 60 ? plural(m, 'minute') : m < 48 * 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : plural(Math.round(m / 1440), 'day'));
const isAre = n => (n === 1 ? 'is' : 'are');
const orderName = o => `#${o.code}${o.storeName ? ` from ${o.storeName}` : ''}`;
const listOrders = list => list.slice(0, 3).map(orderName).join(', ') + (list.length > 3 ? ` and ${list.length - 3} more` : '');
const JM = 5 * HOUR; // Jamaica is UTC-5 all year
export const jmDate = t => new Date(t - JM).toISOString().slice(0, 10);
export const jmTime = t => { const d = new Date(t - JM); const h = d.getUTCHours(); return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };

// Time limits come from Runner's shared.ts when the folder can be read
const DEFAULT_LIMITS = { PENDING_TIMEOUT_MS: 30 * MIN, PAY_WINDOW_MS: 10 * MIN, STORE_CONFIRM_MS: 10 * MIN, DASHER_IDLE_NUDGE_MS: 2 * HOUR, DASHER_IDLE_GRACE_MS: 30 * MIN };
// The spec's thresholds (minutes unless noted)
export const LIMITS = {
  waitLook: 5, waitAct: 10,                  // delivery order nobody has taken
  acceptedLook: 30, acceptedAct: 60,         // runner took it, has not reached the store
  pickingLook: 30, pickingAct: 60,           // at the store, not collected
  onWayLook: 40, onWayAct: 60,               // on the way, not delivered
  storeAnswerLook: 5, storeAnswerAct: 8,     // pickup request the store has not answered
  storeGrace: 10, storeLateAct: 60,          // paid pickup not marked ready: stated time + these
  readyLook: 60,                             // ready to collect, not handed over
  noRunnerLook: 3, noRunnerAct: 5,           // cancelled because no runner was free (per day)
  payTimeoutInfo: 3,                         // students who did not pay in time (per day)
  payPendingLook: 30, verifiedLook: 15,      // card payment stuck
  runnerWaitLook: 120, runnerWaitAct: 1440,  // new runner waiting to be verified
  perRunnerLook: 1, perRunnerAct: 3,         // waiting orders per online runner
  siteSlowMs: 3000, cleanupLate: 12,
  speedMin: 20, speedReadyLook: 8000, speedInpLook: 500, // real-phone speed: reports needed, first screen (ms, 3 in 4 visits), tap response (ms)
  errorsLook: 1, errorsAct: 5, deadTokensLook: 20, pushFailAct: 20,
  appCheckLook: 98, appCheckAct: 90, backupDays: 2, codeAheadDays: 1,
  floatOrders: 5,                            // a float should cover about this many orders
};

// Plain words for everything that comes out of Runner's data
export const CANCEL_WORDS = {
  no_dasher: 'No runner took it in 30 minutes', payment_timeout: 'The student did not pay in 10 minutes',
  store_declined: 'The store said it could not make it', store_no_answer: 'The store did not answer in 10 minutes',
  store_closed: 'The store closed before it went through', item_unavailable: 'An item ran out before it went through',
  duplicate_order: 'Sent twice', rate_limited: 'Too many orders too fast', too_many_active: 'The student already had 3 open',
  admin: 'Cancelled by Runner support', insufficient_tokens: 'Not enough Runner coins', pickup_unavailable: 'Pickup is not offered there',
  store_not_found: 'The store no longer exists', invalid_item: 'An item was not valid', too_many_items: 'Too many items',
  empty_order: 'The order was empty', account_inactive: 'The account is switched off',
};
const cancelWord = r => (r ? CANCEL_WORDS[r] || `"${r}" (not understood)` : 'The student cancelled');
const KNOWN_PAYMENT_DOCS = ['pending', 'verified', 'paid', 'credited', 'review', 'failed'];
// Google's API only says whether the billing account is open, not whether a
// payment is past due: it closes the account (and stops the server) once a
// declined payment has gone unpaid long enough. A known unpaid balance is
// therefore kept here, red and at the top, until the owner marks it sorted.
// To raise a new one, add its date here.
// Past-due Google bills to pin at the top ({ id, what }). The 16 Oct one was paid on 19 Oct.
const BILLING_DUE = [];
export const reviewWords = r => {
  const s = String(r || '');
  if (s.startsWith('amount_short_')) return `Fygaro reported less money than was due (it said ${s.slice(13)}).`;
  if (s.startsWith('currency_')) return `Fygaro says it was paid in ${s.slice(9)}, not Jamaican dollars.`;
  if (s.startsWith('status_')) return `Fygaro said the payment was "${s.slice(7).replace(/_/g, ' ')}".`;
  if (s === 'amount_missing') return 'Fygaro did not say how much was paid.';
  return s ? `The server held it because: ${s.replace(/_/g, ' ')}.` : 'The server was not sure the money really arrived.';
};

// ── Store opening hours, as typed by an admin ("Mon-Fri 8am-9pm, Sat 8am-5pm")
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const clock = t => { const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(t.trim()); if (!m) return null; return ((Number(m[1]) % 12) + (m[3] === 'pm' ? 12 : 0)) * 60 + Number(m[2] || 0); };
/** true / false when the text is clear about this moment, null when it can't be read. */
export function saysOpen(hours, now) {
  if (!hours || !String(hours).trim()) return null;
  const local = new Date(now - JM);
  const day = local.getUTCDay(), minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  let open = false;
  for (const piece of String(hours).toLowerCase().split(',')) {
    const m = /^\s*(daily|[a-z]{3})(?:\s*-\s*([a-z]{3}))?\s+(?:(\d[\d:]*\s*(?:am|pm))\s*-\s*(\d[\d:]*\s*(?:am|pm))|from\s+(\d[\d:]*\s*(?:am|pm)))\s*$/.exec(piece);
    if (!m) return null;
    let days;
    if (m[1] === 'daily') days = [0, 1, 2, 3, 4, 5, 6];
    else {
      const a = DAYS.indexOf(m[1]), b = m[2] ? DAYS.indexOf(m[2]) : a;
      if (a < 0 || b < 0) return null;
      days = []; for (let d = a; ; d = (d + 1) % 7) { days.push(d); if (d === b) break; }
    }
    const from = clock(m[3] || m[5]), to = m[4] ? clock(m[4]) : 24 * 60;
    if (from === null || to === null) return null;
    if (days.includes(day) && minute >= from && minute < to) open = true;
  }
  return open;
}
const statedMinutes = text => { const n = String(text || '').match(/\d+/g); return n ? Math.max(...n.map(Number)) : 30; };
const food = o => Math.max(0, (Number(o.totalAmount) || 0) - (Number(o.deliveryFee) || 0));

// ── Routines that reset themselves ──────────────────────────────────────────
// A tick counts for the period it was made in: today, this week (from Monday),
// this month, or this UWI term (Aug–Dec, Jan–May, summer Jun–Jul).
export function periodKey(kind, t) {
  const d = new Date(t - JM), y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (kind === 'day') return jmDate(t);
  if (kind === 'week') { const back = (d.getUTCDay() + 6) % 7; return jmDate(t - back * DAY); }
  if (kind === 'month') return `${y}-${String(m + 1).padStart(2, '0')}`;
  return `${y}-${m >= 7 ? 'sem1' : m <= 4 ? 'sem2' : 'summer'}`;
}
export const ROUTINES = [
  { kind: 'day', title: 'Every day (about 10 minutes)', items: [
    ['d-morning', 'Morning: the verdict is green, stores opened on time, enough runners booked for lunch.'],
    ['d-billing', 'Google Cloud billing shows no "past due" or payment warning (the control room can\'t see this until Google closes the account).', 'billing'],
    ['d-verify', 'Verify or reject new runners.', '/verify-runners'],
    ['d-cards', 'Clear "Card payments to check" (once Fygaro is on).', '/dashboard'],
    ['d-cash', 'Match cash taken for coin top-ups against coins added (Money section lists them).'],
    ['d-support', 'Answer support emails; note any deletion request and its 30-day deadline.', 'inbox'],
    ['d-evening', 'Evening: no order left open; read the day\'s cancellations.'],
  ] },
  { kind: 'week', title: 'Every week', items: [
    ['w-stores', 'Settle each store: food cost of its delivered orders against its float.'],
    ['w-runners', 'Pay each runner their delivery share, and record the payout in the console.'],
    ['w-floats', 'Top up floats that ran low.', '/users'],
    ['w-review', 'Review runners: slow, cancelling or idle ones get a message.'],
    ['w-hours', 'Look at the hour-by-hour chart and adjust runner bookings.'],
    ['w-errors', 'Check server errors for the week, and send any repeat to the developer.', 'logs'],
    ['w-appcheck', 'Check App Check\'s verified share; once it holds 98%, enforce it for the database and sign-in.', 'appcheck'],
  ] },
  { kind: 'month', title: 'Every month', items: [
    ['m-bill', 'Read the Google Cloud bill: actual against the US$11 to 13 fixed cost, and what grew.', 'billing'],
    ['m-totals', 'Totals for the month: orders, delivered, Runner\'s share, average delivery time, new students, active runners.'],
    ['m-access', 'Review who has admin access and which store logins exist; remove any no longer needed.', '/users'],
    ['m-updates', 'Ask the developer for the monthly update round.'],
  ] },
  { kind: 'term', title: 'Every term', items: [
    ['t-stores', 'Check every store\'s hours, menu and prices for the new term.', '/stores'],
    ['t-recruit', 'Recruit runners before the term starts; remove ones who have left UWI.'],
    ['t-legal', 'Re-read the Privacy Policy and Terms; update them if anything Runner collects has changed.'],
    ['t-renew', 'Renew anything yearly: domain, Apple developer account.'],
  ] },
];

/**
 * @param data  what electron/ops.js returned
 * @param local what is kept on this Mac: { ticks, resolved, expectedAdmins, deletions, handling }
 */
export function judgeRunner(data, local = {}) {
  const ticks = local.ticks || {}, resolved = local.resolved || {}, deletions = local.deletions || [];
  if (!data?.ok) {
    const fix = data?.fix === 'login'
      ? 'Open Terminal, type firebase login --reauth and press Enter, then sign in with the Google account that owns Runner (plain "firebase login" only says you are already logged in). Come back and press Refresh.'
      : data?.fix === 'folder'
        ? 'Press Edit at the top of this venture and set its folder to Runner\'s code folder (runner in Documents → Jcommerce; it was called dorm-dash-web before 15 Oct 2026). Then press Refresh.'
        : 'Check this Mac is online, then press Refresh. If it keeps happening, send this line to your developer.';
    return { verdict: 'act', headline: 'Act now', reason: `The control room can't see Runner. ${data?.error || ''}`.trim(), fatal: { what: data?.error || 'No answer from the Mac app.', next: fix },
      sections: [], counts: { act: 1, look: 0, unknown: 0 }, items: [] };
  }
  const P = data.parts, now = data.fetchedAt, project = data.project, admin = data.adminUrl;
  const L = { ...DEFAULT_LIMITS, ...(P.lists?.ok ? P.lists.limits : {}) };
  const link = (label, where) => ({ label, url: where.startsWith('http') ? where : `${admin}${where}` });
  const fb = path => `https://console.firebase.google.com/project/${project}${path}`;
  const gc = (path, extra = '') => `https://console.cloud.google.com${path}?project=${project}${extra}`;
  const BOARD = link('Open Runner admin: Board', '/dashboard');
  const usable = p => p && p.ok && !p.hitLimit;
  const cant = (key, what, p) => ({ key, lv: 'unknown', what: `Couldn't check ${what}.`,
    why: p?.hitLimit ? 'There was more to read than one check allows, so any count would be wrong.' : `Google answered: ${p?.error || 'no answer'}.`,
    next: 'Press Refresh in a minute. If it keeps happening, send this exact line to your developer.' });
  const notUnderstood = (key, what) => ({ key, lv: 'unknown', what: `Couldn't understand ${what}: tell the developer.`,
    why: 'Runner has something new that this screen was not built for, so it may be missing a problem.', next: 'Send this line to your developer so the control room can be updated the same day.' });

  // Orders: today's, anything still open, and the last 7 days (finished days)
  const todayOrders = P.ordersToday?.ok ? P.ordersToday.rows : [];
  const weekOrders = P.ordersWeek?.ok ? P.ordersWeek.rows : [];
  const live = [...new Map([...(P.ordersActive?.ok ? P.ordersActive.rows : []), ...todayOrders].map(o => [o.id, o])).values()];
  const stores = P.stores?.ok ? P.stores.rows : [];
  const storeById = Object.fromEntries(stores.map(s => [s.id, s]));
  const isPickup = o => o.fulfilment === 'pickup';
  const runners = P.runners?.ok ? P.runners.rows : [];
  const runnerById = Object.fromEntries(runners.map(r => [r.id, r]));
  const dashers = P.dashers?.ok ? P.dashers.rows : [];
  const online = P.stats?.ok && P.stats.doc && typeof P.stats.doc.onlineDashers === 'number' ? P.stats.doc.onlineDashers : null;
  const busy = dashers.filter(d => d.isOnline && (d.activeOrderId || (d.activeOrderIds || []).length)).length;
  const waiting = live.filter(o => o.status === 'pending' && !isPickup(o) && o.verifiedAt);
  const openNow = live.filter(o => ['pending', 'accepted', 'picking_up', 'on_the_way'].includes(o.status));
  const runnerTag = o => (o.dasherId ? { runnerId: o.dasherId } : {});

  // ── Orders ─────────────────────────────────────────────────────────────────
  const orders = [];
  if (!usable(P.ordersActive)) orders.push(cant('orders.read', 'the orders that are open right now', P.ordersActive));
  else {
    const late = waiting.map(o => ({ ...o, wait: mins(now - (o.verifiedAt || o.createdAt)) })).filter(o => o.wait >= LIMITS.waitLook).sort((a, b) => b.wait - a.wait);
    if (late.length) orders.push({
      key: 'orders.waiting', lv: late[0].wait >= LIMITS.waitAct ? 'act' : 'look', playbook: 'piling',
      what: `${plural(late.length, 'order')} nobody has taken. The oldest has waited ${ago(late[0].wait)}: ${listOrders(late)}.`,
      why: `No runner has said "I'll take it". At ${mins(L.PENDING_TIMEOUT_MS)} minutes the server cancels it and the student gets nothing (nobody is charged).`,
      next: `Message the runners' WhatsApp group: "Order from ${late[0].storeName || 'a store'} waiting, who can take it?"${online === 0 ? ' Right now no runner is online at all.' : ''}`,
    });
    const STAGE = {
      accepted: ['taken by a runner who has not reached the store', LIMITS.acceptedLook, LIMITS.acceptedAct, 'Call the runner (their number is in Runners below).'],
      picking_up: ['at the store and not collected', LIMITS.pickingLook, LIMITS.pickingAct, 'Call the runner, then the store.'],
      on_the_way: ['on the way to the student', LIMITS.onWayLook, LIMITS.onWayAct, 'Call the runner. If the food is lost, the order must be cancelled so the student is refunded (see "An order must be cancelled").'],
    };
    live.filter(o => STAGE[o.status] && !isPickup(o) && o.hasRunner && o.paymentStatus !== 'awaiting_payment').forEach(o => {
      const since = Math.max(o.movedAt || 0, o.status === 'accepted' ? (o.paidAt || o.acceptedAt || 0) : 0) || o.acceptedAt || o.createdAt;
      const held = mins(now - since), [words, look, act, next] = STAGE[o.status];
      if (held < look) return;
      orders.push({ key: `orders.stage.${o.code}`, lv: held >= act ? 'act' : 'look', playbook: o.status === 'on_the_way' ? 'cancel' : undefined, ...runnerTag(o),
        what: `Order ${orderName(o)} has been ${words} for ${ago(held)}. Normal is under ${look} minutes.`,
        why: 'The student has paid and is waiting. Either the runner has a problem or forgot to tap the next step.', next });
    });
    const unanswered = live.filter(o => isPickup(o) && o.status === 'pending' && o.storeAskedAt).map(o => ({ ...o, held: mins(now - o.storeAskedAt) })).filter(o => o.held >= LIMITS.storeAnswerLook);
    if (unanswered.length) orders.push({ key: 'orders.storeAnswer', lv: unanswered.some(o => o.held >= LIMITS.storeAnswerAct) ? 'act' : 'look', playbook: 'store-missed',
      what: `${plural(unanswered.length, 'pickup request')} the store has not answered: ${unanswered.slice(0, 3).map(o => `#${o.code} at ${o.storeName || 'a store'} (${ago(o.held)})`).join(', ')}.`,
      why: `A pickup order waits for the store to say yes before the student pays. At ${mins(L.STORE_CONFIRM_MS)} minutes the server cancels it.`,
      next: `Call ${unanswered[0].storeName || 'the store'}: "Please check the Runner tablet."` });
    live.filter(o => isPickup(o) && o.status === 'accepted' && o.paymentStatus === 'paid' && !o.readyAt && o.paidAt)
      .map(o => ({ ...o, held: mins(now - o.paidAt), stated: statedMinutes(storeById[o.storeId]?.estimatedTime) }))
      .filter(o => o.held >= o.stated + LIMITS.storeGrace)
      .forEach(o => orders.push({ key: `orders.notReady.${o.code}`, lv: o.held >= o.stated + LIMITS.storeLateAct ? 'act' : 'look', playbook: 'store-missed',
        what: `${o.storeName || 'A store'} has had paid pickup order #${o.code} for ${ago(o.held)} and has not marked it ready. It tells students about ${o.stated} minutes.`,
        why: 'The student has paid and is coming to collect it. The store may not have seen it on its tablet.',
        next: `Call ${o.storeName || 'the store'} and give the order code #${o.code}.` }));
    live.filter(o => isPickup(o) && o.status === 'accepted' && o.readyAt && now - o.readyAt >= LIMITS.readyLook * MIN)
      .forEach(o => orders.push({ key: `orders.ready.${o.code}`, lv: 'look',
        what: `Order #${o.code} at ${o.storeName || 'a store'} has been ready to collect for ${ago(mins(now - o.readyAt))} and is not marked as handed over.`,
        why: 'Either the student never came, or they did and the store forgot to tap "handed over". It stays open on the tablet until then.',
        next: `Ask ${o.storeName || 'the store'} whether it was collected; if so, they tap "handed over".` }));
  }
  const cancelledToday = todayOrders.filter(o => o.status === 'cancelled');
  const noRunner = cancelledToday.filter(o => o.cancelReason === 'no_dasher').length;
  if (noRunner >= LIMITS.noRunnerLook) orders.push({ key: 'orders.noRunnerDay', lv: noRunner >= LIMITS.noRunnerAct ? 'act' : 'look',
    what: `${plural(noRunner, 'order')} cancelled today because no runner was free.`,
    why: 'Each one is a student who wanted food and gave up. It means too few runners at those hours.',
    next: 'Recruit or schedule more runners for those hours. The hour-by-hour chart under People shows when.' });
  const payTimeouts = cancelledToday.filter(o => o.cancelReason === 'payment_timeout').length;
  if (payTimeouts >= LIMITS.payTimeoutInfo) orders.push({ key: 'orders.payTimeout', lv: 'info',
    what: `${plural(payTimeouts, 'order')} today ended because the student did not pay within 10 minutes of a runner accepting.`,
    why: 'Waiting to pay is normal for a few minutes and nobody is charged. Many in a day usually means students do not understand they must pay after a runner accepts.',
    next: 'Nothing urgent. If it keeps happening, explain the "pay after a runner accepts" step in your marketing and WhatsApp messages.' });
  // Anything Runner sends that this screen does not know
  if (P.lists?.ok) {
    const all = [...live, ...todayOrders, ...weekOrders];
    const odd = (field, list) => [...new Set(all.map(o => o[field]).filter(x => x != null && x !== '' && list && !list.includes(x)))];
    const s = odd('status', P.lists.orderStatus), c = odd('cancelReason', P.lists.cancelReason), ps = odd('paymentStatus', P.lists.paymentStatus);
    if (s.length) orders.push(notUnderstood('orders.oddStatus', `an order step called ${s.map(x => `"${x}"`).join(', ')}`));
    if (c.length) orders.push(notUnderstood('orders.oddReason', `a cancel reason called ${c.map(x => `"${x}"`).join(', ')}`));
    // A reason Runner can now give that has no plain words here yet
    const unworded = (P.lists.cancelReason || []).filter(x => !CANCEL_WORDS[x]);
    if (unworded.length) orders.push(notUnderstood('orders.newReason', `Runner's new cancel reason ${unworded.map(x => `"${x}"`).join(', ')}`));
    if (ps.length) orders.push(notUnderstood('orders.oddPay', `an order payment state called ${ps.map(x => `"${x}"`).join(', ')}`));
  } else orders.push(cant('orders.lists', 'Runner\'s list of order steps and cancel reasons (shared.ts in Runner\'s folder)', P.lists));
  const cancellations = Object.entries(cancelledToday.reduce((m, o) => { const k = cancelWord(o.cancelReason); m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

  // ── Money ──────────────────────────────────────────────────────────────────
  const money = [];
  const billingLink = { label: 'Open Google Cloud billing payments', url: P.billing?.ok && P.billing.account ? `https://console.cloud.google.com/billing/${P.billing.account}/payment` : gc('/billing/linkedaccount') };
  BILLING_DUE.filter(b => !resolved[`billingdue.${b.id}`]).forEach(b => money.push({ key: `money.billingDue.${b.id}`, lv: 'act', top: true, resolve: [`billingdue.${b.id}`], playbook: 'site-down',
    what: b.what,
    why: 'Until it is paid Google can close the billing account again at any time, and that stops Runner\'s server: no orders, payments, launch codes or referrals (on 16 Oct it did exactly that for a few hours). The website still loads, so it can look fine.',
    next: 'Ask the bank to allow international online charges from "Google Cloud" (or use another card), then pay the balance on Google Cloud → Billing → Payments. When the warning banner there is gone, press "Sorted, hide it".',
    link: billingLink }));
  const pays = [...new Map([...(P.paymentsOpen?.ok ? P.paymentsOpen.rows : []), ...(P.paymentsToday?.ok ? P.paymentsToday.rows : [])].map(p => [p.id, p])).values()];
  if (!usable(P.paymentsOpen)) money.push(cant('money.read', 'card payments waiting for a person', P.paymentsOpen));
  if (!usable(P.paymentsToday)) money.push(cant('money.today', 'today\'s card payments', P.paymentsToday));
  const review = pays.filter(p => p.status === 'review');
  if (review.length) money.push({ key: 'money.review', lv: 'act', playbook: 'paid-nothing',
    what: `${plural(review.length, 'card payment')} (${J(review.reduce((t, p) => t + (Number(p.amountJmd) || 0), 0))}) ${isAre(review.length)} held for review. ${review.slice(0, 3).map(p => reviewWords(p.reviewReason)).join(' ')}`,
    why: 'The server was not sure about the money, so it did not hand over the order or the coins. A student may have been charged and be waiting.',
    next: 'Runner admin → Board → "Card payments to check". Look the payment up in Fygaro first. Paid there: press Paid and enter Fygaro\'s transaction ID. Not there: press Not paid. Both need a short note.', link: BOARD });
  const slow = pays.filter(p => p.status === 'pending' && now - p.createdAt >= LIMITS.payPendingLook * MIN);
  if (slow.length) money.push({ key: 'money.pending', lv: 'look',
    what: `${plural(slow.length, 'card payment')} started over ${LIMITS.payPendingLook} minutes ago and never confirmed. The oldest is ${ago(mins(now - Math.min(...slow.map(p => p.createdAt))))} old.`,
    why: 'Usually the student closed the card page. Sometimes they did pay and the confirmation was lost.',
    next: 'Same page: Runner admin → Board → "Card payments to check". Compare each with Fygaro, then press Paid or Not paid.', link: BOARD });
  const stuckPaid = pays.filter(p => p.status === 'verified' && now - (p.returnVerifiedAt || p.createdAt) >= LIMITS.verifiedLook * MIN);
  if (stuckPaid.length) money.push({ key: 'money.verified', lv: 'look',
    what: `${plural(stuckPaid.length, 'card payment')} confirmed by Fygaro but not applied after 15 minutes (payment ID ${stuckPaid.slice(0, 3).map(p => p.id).join(', ')}).`,
    why: 'The money arrived but the order or coins have not been handed over yet. The server retries every 5 minutes.',
    next: 'Wait for the next retry. If it is still here an hour after it started, send the payment ID to the developer.' });
  const recentOrders = [...new Map([...weekOrders, ...todayOrders, ...live].map(o => [o.id, o])).values()];
  const unknownRefunds = recentOrders.filter(o => o.refundAttemptReason === 'network_error' && !resolved[`refund.${o.code}`]);
  if (unknownRefunds.length) money.push({ key: 'money.refundUnknown', lv: 'act', resolve: unknownRefunds.map(o => `refund.${o.code}`),
    what: `${plural(unknownRefunds.length, 'card refund')} with an unknown outcome: ${listOrders(unknownRefunds)}. Fygaro did not answer.`,
    why: 'The student got coins back, and the card may also have been refunded. If both happened, they were paid twice.',
    next: 'Check each in Fygaro. If the card was refunded, take the coins back first with "Adjust Runner coins" (Runner admin → Users) before anything else. Then press "Sorted" here.', link: link('Open Runner admin: Users', '/users') });
  const coinRefunds = recentOrders.filter(o => o.paymentMethod === 'card' && (o.refundAttemptFailed === true || o.paymentStatus === 'refunded_tokens') && o.refundAttemptReason !== 'network_error' && !resolved[`coinrefund.${o.code}`]);
  if (coinRefunds.length) money.push({ key: 'money.coinRefund', lv: 'look', resolve: coinRefunds.map(o => `coinrefund.${o.code}`),
    what: `${plural(coinRefunds.length, 'cancelled card order')} ${coinRefunds.length === 1 ? 'was' : 'were'} refunded as Runner coins, not back to the card: ${listOrders(coinRefunds)}.`,
    why: 'The card refund did not go through, so the student was given coins instead. They may ask where their money is.',
    next: 'Nothing unless the student asks for card money. Then remove the coins first ("Adjust Runner coins"), then refund in Fygaro, never the other way round.', link: link('Open Runner admin: Users', '/users') });
  const late = pays.filter(p => p.status === 'credited' && p.createdAt >= data.today);
  if (late.length) money.push({ key: 'money.late', lv: 'info',
    what: `${plural(late.length, 'card payment')} today arrived after the order was cancelled (${J(late.reduce((t, p) => t + (Number(p.amountJmd) || 0), 0))}).`,
    why: 'The money became Runner coins in the student\'s wallet.', next: 'Tell the student if they ask.' });
  const walletToday = P.walletToday?.ok ? P.walletToday.rows : [];
  const paidLately = todayOrders.filter(o => o.paymentStatus === 'paid' && o.paidAt && now - o.paidAt > 3 * MIN && o.paidAt > data.today + 2 * MIN);
  if (paidLately.length && !usable(P.walletToday)) money.push(cant('money.ledger', 'the coin record behind paid orders', P.walletToday));
  else {
    const coinPaid = new Set(walletToday.filter(t => ['order_charge', 'order_payment'].includes(t.type)).map(t => t.orderId));
    const cardPaid = new Set(pays.filter(p => ['paid', 'verified'].includes(p.status)).map(p => p.orderId));
    const orphans = paidLately.filter(o => (o.paymentMethod === 'card' ? usable(P.paymentsToday) && !cardPaid.has(o.id) : !coinPaid.has(o.id))).filter(o => !resolved[`orphan.${o.code}`]);
    if (orphans.length) money.push({ key: 'money.orphan', lv: 'act', resolve: orphans.map(o => `orphan.${o.code}`),
      what: `${plural(orphans.length, 'order')} marked paid with no matching payment or coin record: ${listOrders(orphans)}.`,
      why: 'Every paid order should have a matching card payment or coin line. One without it means food may be going out that nobody paid for.',
      next: 'Change nothing. Send the order code to the developer the same day, then press "Sorted" here.' });
  }
  const cardOff = pays.filter(p => p.status === 'failed' && p.failReason === 'gateway_not_set_up' && p.createdAt >= data.today);
  if (cardOff.length) money.push({ key: 'money.cardOff', lv: 'info',
    what: `${plural(cardOff.length, 'student')} tried to pay by card today while cards are switched off.`,
    why: 'Nobody was charged; they were told to use Runner coins. Each one may be a lost order.', next: 'A count of likely lost orders until Fygaro is set up.' });
  if (P.walletToday?.ok && P.walletToday.rows.some(t => t.type && !['order_reserve', 'order_charge', 'order_payment', 'order_release', 'order_refund', 'order_refund_card', 'topup_card', 'late_payment_credit', 'admin_adjust',
    'launch_pack', 'referral_reward', 'free_delivery_used', 'free_delivery_returned', 'topup_redeemed'].includes(t.type)))
    money.push(notUnderstood('money.oddTx', 'a new kind of coin movement'));
  if (pays.some(p => p.status && !KNOWN_PAYMENT_DOCS.includes(p.status))) money.push(notUnderstood('money.oddPay', 'a new card payment state'));
  // Cash top-ups an admin made by hand today, so cash and coins can be matched
  const manual = walletToday.filter(t => t.type === 'admin_adjust');
  const cash = { added: manual.filter(t => t.amountJmd > 0), removed: manual.filter(t => t.amountJmd < 0) };
  cash.addedTotal = cash.added.reduce((t, x) => t + x.amountJmd, 0); cash.removedTotal = cash.removed.reduce((t, x) => t + x.amountJmd, 0);

  // Floats: cash Runner has advanced to stores and runners
  const avgFood = (() => { const d = weekOrders.filter(o => o.status === 'delivered'); return d.length ? d.reduce((t, o) => t + food(o), 0) / d.length : 1200; })();
  const floatToday = P.floatToday?.ok ? P.floatToday.rows : [];
  const moved = id => {
    const rows = floatToday.filter(x => x.targetId === id);
    return { used: rows.filter(x => x.amountJmd < 0 && !x.by).reduce((t, x) => t + x.amountJmd, 0), returned: rows.filter(x => x.amountJmd > 0 && !x.by).reduce((t, x) => t + x.amountJmd, 0), topups: rows.filter(x => x.by).reduce((t, x) => t + x.amountJmd, 0) };
  };
  const floats = {
    ok: usable(P.storeFloats) && usable(P.dashers),
    stores: (P.storeFloats?.ok ? P.storeFloats.rows : []).map(f => ({ id: f.id, name: storeById[f.id]?.name || f.id, float: Number(f.floatJmd) || 0, ...moved(f.id) })).sort((a, b) => a.float - b.float),
    runners: dashers.filter(d => typeof d.floatJmd === 'number').map(d => ({ id: d.id, name: runnerById[d.id]?.name || 'A runner', float: d.floatJmd, ...moved(d.id) })).sort((a, b) => a.float - b.float),
  };
  if (!floats.ok) money.push(cant('money.floats', 'the store and runner floats', P.storeFloats?.ok ? P.dashers : P.storeFloats));
  const owedS = floats.stores.filter(f => f.float < 0), owedR = floats.runners.filter(f => f.float < 0), owed = [...owedS, ...owedR];
  if (owed.length) money.push({ key: 'money.owedFloats', lv: 'look',
    what: `Runner owes ${[owedS.length && plural(owedS.length, 'store'), owedR.length && plural(owedR.length, 'runner')].filter(Boolean).join(' and ')} ${J(-owed.reduce((t, f) => t + f.float, 0))}: ${owed.slice(0, 4).map(f => `${f.name} ${J(-f.float)}`).join(', ')}.`,
    why: 'A float below zero is food a store handed over, or a runner bought with their own money, that Runner has not paid back yet.',
    next: 'Pay them, record it under "Settling up" below, then reset the float with "Adjust float" in Runner admin (Stores for a store, Users for a runner).', link: link('Open Runner admin: Users', '/users') });
  const low = [...floats.stores, ...floats.runners].filter(f => f.float >= 0 && f.float < avgFood * LIMITS.floatOrders);
  if (low.length) money.push({ key: 'money.lowFloat', lv: 'look',
    what: `${plural(low.length, 'float')} would not cover about ${LIMITS.floatOrders} orders (about ${J(avgFood * LIMITS.floatOrders)}): ${low.slice(0, 4).map(f => `${f.name} ${J(f.float)}`).join(', ')}.`,
    why: 'When a float runs out, a store or runner has to pay for food out of their own pocket, or stops.',
    next: 'Top it up before the next busy period: Runner admin → Users or Stores → "Adjust float", with a note.', link: link('Open Runner admin: Users', '/users') });

  // ── People ─────────────────────────────────────────────────────────────────
  const people = [];
  const openStores = stores.filter(s => s.isOpen === true);
  if (!P.stats?.ok || online === null) people.push(cant('people.online', 'how many runners are online', P.stats?.ok ? { error: 'the online count is missing' } : P.stats));
  else {
    const free = Math.max(0, online - busy);
    if (online === 0 && openStores.length) people.push({ key: 'people.noRunner', lv: waiting.length ? 'act' : 'look', playbook: 'piling',
      what: `No runner is online while ${plural(openStores.length, 'store')} ${isAre(openStores.length)} open${waiting.length ? ` and ${plural(waiting.length, 'order')} ${isAre(waiting.length)} waiting` : ''}.`,
      why: 'Orders only move when an open store and an online runner are both there. Anything ordered now will wait.',
      next: 'Message the runners\' group and ask someone to go online. If nobody can, ask the open stores to switch to closed until a runner is free.' });
    else if (online > 0 && waiting.length > Math.max(1, free) * LIMITS.perRunnerLook) {
      const per = waiting.length / Math.max(1, free);
      people.push({ key: 'people.perRunner', lv: per > LIMITS.perRunnerAct ? 'act' : 'look',
        what: `${plural(waiting.length, 'order')} waiting for ${plural(free, 'free runner')} (${plural(online, 'runner')} online).`,
        why: 'A runner carries one order at a time, or a group of 2 to 3 nearby. More waiting orders than free runners means students wait longer.',
        next: 'Ask more runners to go online.' });
    }
  }
  if (!usable(P.runners)) people.push(cant('people.runners', 'the runner list', P.runners));
  else {
    const toVerify = runners.filter(r => r.dasherStatus === 'pending');
    if (toVerify.length) {
      const oldest = mins(now - Math.min(...toVerify.map(r => r.createdAt || now)));
      if (oldest >= LIMITS.runnerWaitLook) people.push({ key: 'people.verify', lv: oldest >= LIMITS.runnerWaitAct ? 'act' : 'look',
        what: `${plural(toVerify.length, 'new runner')} waiting to be verified. The longest has waited ${ago(oldest)}.`,
        why: 'A new runner cannot go online or see orders until you approve them.',
        next: 'Runner admin → Users → Runner verification. Check the 9-digit UWI ID and the Jamaican phone number look real, message them on WhatsApp if unsure, then press Verify or Reject.',
        link: link('Open runner verification', '/verify-runners') });
    }
  }
  const idleOff = dashers.filter(d => d.offlineReason === 'idle' && d.offlineAt >= data.today).length;
  if (idleOff) people.push({ key: 'people.idle', lv: 'info', what: `${plural(idleOff, 'runner')} ${idleOff === 1 ? 'was' : 'were'} switched off today for being idle.`,
    why: 'Normal: a runner who has not opened Runner for 2 hours is nudged, then switched off 30 minutes later.', next: 'Nothing to do.' });
  const logins = P.storeLogins?.ok ? P.storeLogins.rows.filter(u => u.isActive !== false) : [];
  if (!usable(P.stores)) people.push(cant('people.stores', 'the stores', P.stores));
  else {
    const shut = stores.filter(s => s.isOpen === false && saysOpen(s.hours, now) === true);
    if (shut.length) people.push({ key: 'people.shut', lv: 'look',
      what: `${plural(shut.length, 'store')} ${isAre(shut.length)} switched to closed during ${shut.length === 1 ? 'its' : 'their'} stated hours: ${shut.slice(0, 5).map(s => `${s.name} (${s.hours})`).join('; ')}${shut.length > 5 ? ` and ${shut.length - 5} more` : ''}.`,
      why: 'Students cannot order from a store that shows as closed, even though its hours say it should be open.',
      next: 'Ask the store to flip the switch on its tablet, or do it in Runner admin → Stores. If it really is closed, nothing to do.', link: link('Open Runner admin: Stores', '/stores') });
    if (usable(P.storeLogins)) {
      const noTablet = stores.filter(s => s.offersPickup && !logins.some(u => u.storeId === s.id));
      if (noTablet.length) people.push({ key: 'people.pickupNoTablet', lv: 'act', playbook: 'store-missed',
        what: `${plural(noTablet.length, 'store')} ${noTablet.length === 1 ? 'offers' : 'offer'} pickup but ${noTablet.length === 1 ? 'has' : 'have'} no tablet login: ${noTablet.map(s => s.name).join(', ')}.`,
        why: 'Pickup orders there are refused at once, because nobody can say yes to them.',
        next: 'Create a login in Runner admin → Stores → the store → Store access, or switch pickup off for that store.', link: link('Open Runner admin: Stores', '/stores') });
      const deaf = logins.filter(u => !u.canNotify);
      if (deaf.length) people.push({ key: 'people.tabletAlerts', lv: 'look', playbook: 'store-missed',
        what: `${plural(deaf.length, 'store tablet')} ${deaf.length === 1 ? 'is' : 'are'} not set up for notifications: ${deaf.map(u => u.storeName || storeById[u.storeId]?.name || 'a store').join(', ')}.`,
        why: 'The store will miss new orders unless its order screen happens to be open.',
        next: 'On each store\'s tablet: sign in to Runner, and press Allow when it asks to send notifications.' });
    } else people.push(cant('people.logins', 'the store tablet logins', P.storeLogins));
  }
  const menuItems = P.menuItems?.ok ? P.menuItems.rows : [];
  const kitchen = menuItems.filter(m => (m.soldOutAt && now - m.soldOutAt < 14 * HOUR) || (m.waitUntil && m.waitUntil > now));
  if (kitchen.length) people.push({ key: 'people.kitchen', lv: 'info',
    what: `${plural(kitchen.length, 'item')} marked by kitchens right now: ${kitchen.slice(0, 5).map(m => `${m.name} at ${storeById[m.storeId]?.name || 'a store'} (${m.soldOutAt ? 'sold out' : `ready in ${mins(m.waitUntil - now)} min`})`).join(', ')}.`,
    why: 'This is what the kitchens have told students. Sold out clears itself after 14 hours.', next: 'Nothing to do.' });
  const badMenu = menuItems.filter(m => !m.hasPhoto || !(Number(m.price) > 0));
  if (badMenu.length) people.push({ key: 'people.menu', lv: 'info',
    what: `${plural(badMenu.length, 'menu item')} with no photo or a price of 0 (${plural(new Set(badMenu.map(m => m.storeId)).size, 'store')}).`,
    why: 'Items without photos sell less, and a price of 0 means it was never finished.', next: 'Fix in Runner admin → Stores → the store → Menu.', link: link('Open Runner admin: Stores', '/stores') });
  // Admin accounts: the most powerful role
  const admins = P.admins?.ok ? P.admins.rows.filter(a => a.isActive !== false) : [];
  const expected = local.expectedAdmins || null;
  if (!usable(P.admins)) people.push(cant('people.admins', 'who has admin access', P.admins));
  else if (!expected) people.push({ key: 'people.adminsConfirm', lv: 'look',
    what: `Confirm your admin list once: ${admins.map(a => a.email).join(', ') || 'no admin accounts were found'}.`,
    why: 'Admin can see and change everything. The control room will turn red if an admin appears that you did not expect.',
    next: 'Look at the list under "Admin accounts" below. If every one is you or someone you trust, press "These are all expected".' });
  else {
    const strangers = admins.filter(a => !expected.includes(a.email));
    if (strangers.length) people.push({ key: 'people.adminsNew', lv: 'act', playbook: 'misuse',
      what: `${plural(strangers.length, 'admin account')} you did not expect: ${strangers.map(a => a.email || '(no email)').join(', ')}.`,
      why: 'Admin can move money, read every account and change stores. Admin can only be given by hand in the Firebase console.',
      next: 'If you did not give this access, follow "Someone is misusing an account" now. If you did, press "These are all expected".', link: link('Open Firebase: Authentication', fb('/authentication/users')) });
    if (admins.length > 2) people.push({ key: 'people.adminsMany', lv: 'look', what: `${plural(admins.length, 'admin account')} exist.`,
      why: 'Keep it to the owner plus at most one trusted person.', next: 'Remove any you no longer need: Firebase console → Authentication.', link: link('Open Firebase: Authentication', fb('/authentication/users')) });
  }
  // Data protection: deletion requests promised within 30 days
  deletions.filter(d => !d.done).forEach(d => {
    const left = Math.ceil((d.at + 30 * DAY - now) / DAY);
    if (left <= 7) people.push({ key: `people.deletion.${d.id}`, lv: left < 0 ? 'act' : 'look',
      what: `A deletion request from ${d.who || 'a student'} (${jmDate(d.at)}) ${left < 0 ? `is ${plural(-left, 'day')} overdue` : `is due in ${plural(left, 'day')}`}.`,
      why: 'Runner promises to act on deletion requests within 30 days. Missing it breaks your own privacy policy.',
      next: 'Do it in Runner admin → Users → the account (delete), then tick it done below.', link: link('Open Runner admin: Users', '/users') });
  });

  // ── Is it running ──────────────────────────────────────────────────────────
  const running = [];
  const site = P.site;
  if (!site?.ok) running.push(cant('run.site', 'the website', site));
  else if (!(site.status >= 200 && site.status < 400)) running.push({ key: 'run.site', lv: 'act', playbook: 'site-down',
    what: `The Runner website is not answering${site.status ? ` (it replied with error ${site.status})` : ''}. ${site.down || ''}`.trim(),
    why: 'Students, runners and stores all use this address. If it is down, nobody can order.',
    next: 'Try it on a phone on mobile data. If it fails there too, check status.firebase.google.com and that billing is paid, then tell the developer.', link: { label: 'Open the Runner website', url: site.url } });
  else if (site.ms > LIMITS.siteSlowMs) running.push({ key: 'run.slow', lv: 'look', playbook: 'site-down',
    what: `The website took ${(site.ms / 1000).toFixed(1)} seconds to answer.`, why: 'Slower than 3 seconds feels broken on a phone.',
    next: 'Try it on a phone. If it stays slow, tell the developer.', link: { label: 'Open the Runner website', url: site.url } });
  const job = P.scheduler?.ok ? P.scheduler.jobs.find(j => /cancelStalePendingOrders/i.test(j.name)) : null;
  const cleanupNext = 'Check Google Cloud billing is active (a suspended account stops the server), then tell the developer.';
  const leftovers = live.filter(o => (o.status === 'pending' && !isPickup(o) && now - (o.verifiedAt || o.createdAt) > L.PENDING_TIMEOUT_MS + 10 * MIN)
    || (o.status === 'pending' && isPickup(o) && o.storeAnswerBy && now - o.storeAnswerBy > 10 * MIN)
    || (o.paymentStatus === 'awaiting_payment' && o.payDeadline && now - o.payDeadline > 10 * MIN));
  if (leftovers.length) running.push({ key: 'run.leftovers', lv: 'act',
    what: `${plural(leftovers.length, 'order')} the clean-up should already have cancelled: ${listOrders(leftovers)}.`,
    why: 'Every five minutes the server cancels orders nobody took or paid for and returns any held coins. Old ones still sitting there mean it is not running.',
    next: cleanupNext, link: { label: 'Open Google Cloud billing', url: gc('/billing/linkedaccount') } });
  if (!P.scheduler?.ok || !job) running.push(cant('run.cleanup', 'when the server last ran its 5-minute clean-up', P.scheduler?.ok ? { error: 'the clean-up job was not in Google\'s list' } : P.scheduler));
  else if (job.state !== 'ENABLED' || !job.lastRunAt || now - job.lastRunAt > LIMITS.cleanupLate * MIN) running.push({ key: 'run.cleanup', lv: 'act',
    what: job.state !== 'ENABLED' ? 'The server\'s 5-minute clean-up is switched off.' : `The server's 5-minute clean-up last ran ${job.lastRunAt ? `${ago(mins(now - job.lastRunAt))} ago` : 'never'}.`,
    why: 'While it is stopped, unclaimed and unpaid orders pile up, idle runners stay "online" and held coins are not returned.',
    next: cleanupNext, link: { label: 'Open Google Cloud billing', url: gc('/billing/linkedaccount') } });
  else if (job.failed) running.push({ key: 'run.cleanupFailed', lv: 'look', what: 'The server\'s last 5-minute clean-up reported an error.',
    why: 'One failed run is usually harmless; the next one catches up.', next: 'Press Refresh in ten minutes. If this is still here, tell the developer.', link: { label: 'Open the error log', url: gc('/logs/query') } });
  const billingPage = P.billing?.ok && P.billing.account ? `https://console.cloud.google.com/billing/${P.billing.account}/payment` : gc('/billing/linkedaccount');
  if (!P.billing?.ok) running.push(cant('run.billing', 'Google Cloud billing', P.billing));
  else if (!P.billing.enabled || P.billing.open === false) running.push({ key: 'run.billing', lv: 'act', playbook: 'site-down',
    what: P.billing.open === false ? 'Google has closed Runner\'s billing account, usually because a card payment was declined.' : 'Google Cloud billing is switched off for Runner.',
    why: 'Without an open billing account Google stops the server: orders, payments, launch codes and the clean-up all fail, even though the website still loads.',
    next: 'Open billing → Payments, pay the balance and fix the card. Jamaican banks often block international online charges: ask the bank to allow "Google Cloud", or add a second card as backup. Then press Refresh.',
    link: { label: 'Open the billing account', url: billingPage } });
  else if (P.billing.open === null) running.push(cant('run.billingOpen', 'whether Runner\'s billing account is open', { error: 'the billing account itself could not be read' }));
  if (!P.server?.ok) running.push(cant('run.server', 'whether Runner\'s server answers', P.server));
  else if (P.server.up === 0) running.push({ key: 'run.server', lv: 'act', playbook: 'site-down',
    what: `Runner's server is not answering (${P.server.answers.map(a => `${a.name}: ${a.status || 'no reply'}`).join(', ')}).`,
    why: 'Nobody can place or pay for an order, use a launch code or claim a referral while the server is down. The website still loads, so it can look fine.',
    next: 'First check billing is open (a closed account stops the server). If billing is fine, check status.firebase.google.com, then tell the developer.',
    link: { label: 'Open the billing account', url: billingPage } });
  // The site's own domain (uwi-runner.online): connected, certificate, DNS straight to Firebase
  if (!P.domains?.ok) running.push(cant('run.domain', 'the website\'s own domain', P.domains));
  else P.domains.rows.forEach(d => {
    const problem = !d.direct ? `its DNS does not point straight at Firebase (it points to ${d.ips.join(', ') || 'nothing'})`
      : d.host !== 'HOST_ACTIVE' ? 'Firebase is not serving it yet'
      : !['CERT_ACTIVE', 'CERT_PROPAGATING'].includes(d.cert) ? 'its security certificate is not ready' : null;
    if (problem) running.push({ key: `run.domain.${d.name}`, lv: 'act', playbook: 'site-down',
      what: `${d.name}: ${problem}.`,
      why: 'This is the address on the flyers and QR codes. If it breaks, every scan fails.',
      next: !d.direct ? 'Cloudflare → DNS → the A record for the domain: content 199.36.158.100, Proxy status DNS only (grey cloud). Then press Refresh.' : 'Firebase → Hosting → the domain: check what it asks for. A new certificate can take up to a day.',
      link: { label: 'Open Firebase Hosting', url: fb('/hosting/sites') } });
  });
  if (!P.signInHosts?.ok) running.push(cant('run.signInHosts', 'whether every Runner address is allowed for sign-in and the bot check', P.signInHosts));
  else if (P.signInHosts.missing.length) running.push({ key: 'run.signInHosts', lv: 'act',
    what: P.signInHosts.missing.map(m => `${m.host} is missing from ${[m.signIn && 'Firebase sign-in\'s authorized domains', m.botCheck && 'the reCAPTCHA (bot check) key'].filter(Boolean).join(' and ')}`).join('; ') + '.',
    why: 'On that address Google sign-in hangs on the loading screen, or the database refuses the app.',
    next: 'Add the address in Firebase → Authentication → Settings → Authorized domains, and in Google Cloud → Security → reCAPTCHA → the website key → Domains. Also add https://<address>/__/auth/handler as a redirect URI on the OAuth web client.',
    link: { label: 'Open authorized domains', url: fb('/authentication/settings') } });
  if (!P.errors?.ok) running.push(cant('run.errors', 'the server\'s errors in the last hour', P.errors));
  else if (P.errors.rows.length >= LIMITS.errorsLook) {
    const n = P.errors.rows.length, payErrs = P.errors.rows.filter(e => /pay|fygaro|refund|coin|token|wallet|float/i.test(`${e.text} ${e.where}`));
    running.push({ key: 'run.errors', lv: n > LIMITS.errorsAct || payErrs.length ? 'act' : 'look', lines: P.errors.rows.slice(0, 6).map(e => `${jmTime(e.at)} ${e.where ? `${e.where}: ` : ''}${e.text}`),
      what: `${P.errors.more ? 'Over 100' : plural(n, 'server error')} in the last hour${payErrs.length ? `, ${payErrs.length} about payments` : ''}.`,
      why: 'Errors mean something a student, runner or store tried did not work.',
      next: 'Send the error lines below to the developer. Monitoring also emails you about these.', link: { label: 'Open the error log', url: gc('/logs/query', `&query=${encodeURIComponent('severity>=ERROR')}`) } });
  }
  if (P.pushes?.ok) {
    if (P.pushes.failed >= LIMITS.pushFailAct) running.push({ key: 'run.push', lv: 'act', what: `${plural(P.pushes.failed, 'notification')} failed to send in the last hour.`,
      why: 'Runners, stores and students may not be hearing about orders.', next: 'Tell the developer. Phones re-register by themselves when people open Runner.' });
    else if (P.pushes.dead > LIMITS.deadTokensLook) running.push({ key: 'run.dead', lv: 'look', what: `${P.pushes.dead} dead phone tokens in the last hour.`,
      why: 'A phone that no longer accepts notifications. A few is normal; many at once means something changed.', next: 'Tell the developer. Phones re-register by themselves when people open Runner.' });
  } else running.push(cant('run.push', 'notification failures', P.pushes));
  // App Check: the share of requests that came from the real Runner website
  const appCheck = [];
  if (P.appCheck?.ok) {
    for (const [id, label] of [['firestore.googleapis.com', 'The database'], ['identitytoolkit.googleapis.com', 'Sign-in']]) {
      const s = P.appCheck.by[id], enforced = !!P.appCheck.enforced[id];
      if (!s || !s.total) { appCheck.push({ label, share: null, enforced }); continue; }
      const share = Math.floor((s.valid / s.total) * 1000) / 10;
      appCheck.push({ label, share, enforced, total: s.total });
      if (enforced && share < LIMITS.appCheckLook) running.push({ key: `run.appcheck.${id}`, lv: share < LIMITS.appCheckAct ? 'act' : 'look', playbook: 'appcheck-blocked',
        what: `${label}: only ${share}% of requests are verified, and it is enforced.`, why: 'The rest are being refused. Real students may be blocked.',
        next: 'If users report being blocked, press Unenforce in Firebase → App Check → APIs, then tell the developer.', link: { label: 'Open Firebase App Check', url: fb('/appcheck/apis') } });
    }
  } else running.push(cant('run.appcheck', 'App Check', P.appCheck));
  // Live version against the newest code in Runner's folder
  const liveAt = Math.max(P.release?.ok ? P.release.at || 0 : 0, P.functions?.ok ? P.functions.at || 0 : 0) || null;
  if (P.code?.ok && liveAt && P.code.at - liveAt > LIMITS.codeAheadDays * DAY) running.push({ key: 'run.version', lv: 'look',
    what: `The live version is ${ago(mins(P.code.at - liveAt))} older than the newest code ("${P.code.message}").`,
    why: 'Fixes that are written but not live do not help anyone.', next: 'Ask the developer whether a deploy is due. Deploy in a quiet hour, never 11 am to 2 pm.' });
  if (P.backups?.ok) {
    const age = P.backups.last ? (now - P.backups.last) / DAY : null;
    if (age === null || age > LIMITS.backupDays) running.push({ key: 'run.backup', lv: 'look',
      what: age === null ? 'Runner\'s database has no backup.' : `The newest database backup is ${ago(mins(now - P.backups.last))} old.`,
      why: 'A daily backup is what lets a mistake be undone.', next: 'Ask the developer to check the daily backup schedule in Google Cloud.', link: { label: 'Open backups', url: gc('/firestore/databases/-default-/disaster-recovery') } });
  } else running.push(cant('run.backup', 'the database backups', P.backups));
  if (P.policies?.ok) {
    const on = P.policies.rows.filter(p => p.on && p.emails > 0);
    if (on.length < 3) running.push({ key: 'run.alerts', lv: 'look', what: `Only ${plural(on.length, 'phone alert')} out of 3 ${isAre(on.length)} switched on with an email.`,
      why: 'Runner\'s monitoring emails you about server errors and card payments to check when you are away from the Mac.',
      next: 'Ask the developer to run node scripts/setup-alerts.mjs jcommerceandtech@gmail.com, then confirm Google\'s email.', link: { label: 'Open monitoring alerts', url: gc('/monitoring/alerting') } });
  } else running.push(cant('run.alerts', 'whether the phone alerts are on', P.policies));

  // ── Launch codes and free deliveries ───────────────────────────────────────
  const freeToday = todayOrders.filter(o => Number(o.deliveryDiscountJmd) > 0 && o.status !== 'cancelled');
  const codes = usable(P.launchCodes) ? P.launchCodes.rows : null;
  const launch = codes ? { made: codes.length, claimed: codes.filter(c => c.usedAt).length, claimedToday: codes.filter(c => c.usedAt >= data.today).length } : null;
  const freeHeld = usable(P.freeDeliveries) ? { students: P.freeDeliveries.rows.length, deliveries: P.freeDeliveries.rows.reduce((t, w) => t + (Number(w.freeDeliveries) || 0), 0) } : null;
  if (P.launchCodes && !usable(P.launchCodes)) money.push(cant('money.launchCodes', 'the launch codes', P.launchCodes));
  if (P.freeDeliveries && !usable(P.freeDeliveries)) money.push(cant('money.freeHeld', 'the free deliveries students hold', P.freeDeliveries));
  if (launch && launch.claimedToday) money.push({ key: 'money.launchToday', lv: 'info',
    what: `${plural(launch.claimedToday, 'launch code')} claimed today (${launch.claimed} of ${launch.made} so far).`,
    why: 'Each gives a student 3 free deliveries; Runner covers those delivery fees.', next: 'Nothing to do.' });

  // ── Today at a glance ──────────────────────────────────────────────────────
  const today = (() => {
    if (!usable(P.ordersToday)) return { ok: false, note: 'Couldn\'t check today\'s orders, so no numbers are shown rather than wrong ones.' };
    const yRows = weekOrders.filter(o => o.createdAt >= data.today - DAY), yOk = usable(P.ordersWeek);
    const yNow = yRows.filter(o => o.createdAt <= now - DAY), atY = t => t && t <= now - DAY;
    const share = list => list.filter(o => o.status === 'delivered').reduce((t, o) => t + (Number(o.platformFeeJmd) || 0), 0);
    const taken = list => list.filter(o => o.paidAt && o.status !== 'cancelled').reduce((t, o) => t + (Number(o.totalAmount) || 0), 0);
    const avg = list => { const d = list.filter(o => o.status === 'delivered' && Number(o.deliveryMins) > 0); return d.length ? Math.round(d.reduce((t, o) => t + Number(o.deliveryMins), 0) / d.length) : null; };
    const versus = (n, y, money = false) => {
      if (!yOk) return 'yesterday could not be checked';
      const diff = Math.round(n - y);
      return diff === 0 ? 'the same as yesterday at this time' : `${money ? J(Math.abs(diff)) : Math.abs(diff).toLocaleString('en-US')} ${diff > 0 ? 'more' : 'less'} than yesterday at this time`.replace(/^(\d[\d,]*) less/, '$1 fewer');
    };
    const delivered = todayOrders.filter(o => o.status === 'delivered'), yDelivered = yNow.filter(o => o.status === 'delivered' && atY(o.deliveredAt));
    const a = avg(todayOrders), ya = avg(yRows);
    return { ok: true, tiles: [
      { label: 'Orders', value: String(todayOrders.length), note: versus(todayOrders.length, yNow.length) },
      { label: 'Delivered', value: String(delivered.length), note: versus(delivered.length, yDelivered.length) },
      { label: 'Cancelled', value: String(cancelledToday.length), note: cancelledToday.length ? `mostly: ${cancellations[0][0].toLowerCase()}` : versus(0, yNow.filter(o => o.status === 'cancelled').length), bad: cancelledToday.length > 0 && cancelledToday.length >= delivered.length },
      { label: 'Money taken', value: J(taken(todayOrders)), note: versus(taken(todayOrders), taken(yNow.filter(o => atY(o.paidAt))), true) },
      { label: 'Runner\'s share', value: J(share(todayOrders)), note: versus(share(todayOrders), share(yDelivered), true) },
      { label: 'Average delivery', value: a === null ? 'none yet' : `${a} min`, note: a === null ? 'no deliveries finished today' : ya === null ? 'no deliveries yesterday to compare' : a === ya ? 'the same as yesterday' : `${Math.abs(a - ya)} min ${a > ya ? 'slower' : 'faster'} than yesterday's ${ya} min` },
      { label: 'Cash top-ups by hand', value: J(cash.addedTotal), note: cash.added.length ? `${plural(cash.added.length, 'top-up')} an admin added` : 'none added today' },
      { label: 'Card attempts (cards off)', value: String(cardOff.length), note: cardOff.length ? 'each may be a lost order' : 'nobody tried a card today' },
      { label: 'Free deliveries held', value: freeHeld ? String(freeHeld.deliveries) : '?', note: freeHeld ? `${plural(freeHeld.students, 'student')} holding them; ${launch ? `${launch.claimed} of ${launch.made} launch codes claimed` : 'launch codes couldn\'t be checked'}` : 'couldn\'t check' },
      { label: 'Free deliveries used', value: String(freeToday.length), note: freeToday.length ? `${J(freeToday.reduce((t, o) => t + (Number(o.deliveryDiscountJmd) || 0), 0))} of delivery fees Runner covered` : 'none used today' },
    ] };
  })();
  const liveCounts = { orders: todayOrders.length, waiting: waiting.length, online, busy, delivered: todayOrders.filter(o => o.status === 'delivered').length, open: openNow.length, storesOpen: openStores.length, stores: stores.length };

  // ── Tables for People and Money ────────────────────────────────────────────
  const weekStart = data.today - 6 * DAY, weekAll = [...new Map([...weekOrders, ...todayOrders].map(o => [o.id, o])).values()];
  const runnerTable = runners.filter(r => r.dasherStatus !== 'rejected').map(r => {
    const mine = weekAll.filter(o => o.dasherId === r.id && o.createdAt >= weekStart), done = mine.filter(o => o.status === 'delivered');
    const d = dashers.find(x => x.id === r.id) || {};
    const times = done.filter(o => Number(o.deliveryMins) > 0).map(o => Number(o.deliveryMins));
    return { id: r.id, name: r.name || 'Runner', phone: r.phone || '', status: r.dasherStatus || 'verified', active: r.isActive !== false, online: !!d.isOnline, lastSeenAt: d.lastSeenAt || null,
      deliveries: done.length, avgMins: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null, slow: times.filter(t => t > LIMITS.onWayLook).length,
      dropped: mine.filter(o => o.status === 'cancelled').length, float: typeof d.floatJmd === 'number' ? d.floatJmd : null };
  }).sort((a, b) => b.online - a.online || b.deliveries - a.deliveries);
  const storeTable = stores.map(s => {
    const login = logins.find(u => u.storeId === s.id), fl = floats.stores.find(f => f.id === s.id);
    const items = menuItems.filter(m => m.storeId === s.id);
    return { id: s.id, name: s.name, isOpen: s.isOpen === true, hoursSay: saysOpen(s.hours, now), hours: s.hours || '', model: s.model || '', pickup: !!s.offersPickup, tablet: !!login, alerts: !!login?.canNotify,
      float: fl ? fl.float : null, menu: items.length, noPhoto: items.filter(m => !m.hasPhoto).length, noPrice: items.filter(m => !(Number(m.price) > 0)).length,
      soldOut: items.filter(m => m.soldOutAt && now - m.soldOutAt < 14 * HOUR).length };
  }).sort((a, b) => b.isOpen - a.isOpen || a.name.localeCompare(b.name));
  // Hour by hour, last 7 days: orders placed, and runners who took an order in that hour
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, runners: 0 }));
  const seen = Array.from({ length: 24 }, () => new Set());
  weekAll.filter(o => o.createdAt >= weekStart).forEach(o => {
    const h = new Date(o.createdAt - JM).getUTCHours(); hourly[h].orders += 1;
    if (o.dasherId && o.acceptedAt) seen[new Date(o.acceptedAt - JM).getUTCHours()].add(`${o.dasherId}|${jmDate(o.acceptedAt)}`);
  });
  seen.forEach((s, h) => { hourly[h].runners = s.size; });
  hourly.forEach(x => { x.orders = Math.round((x.orders / 7) * 10) / 10; x.runners = Math.round((x.runners / 7) * 10) / 10; });
  // Students: sign-ups and first orders per day
  const signups = P.signups?.ok ? P.signups.rows.filter(u => u.role === 'student') : [];
  const firstOrder = {};
  weekAll.forEach(o => { if (o.studentId && (!firstOrder[o.studentId] || o.createdAt < firstOrder[o.studentId])) firstOrder[o.studentId] = o.createdAt; });
  const newIds = new Set(signups.map(u => u.id));
  const days = Array.from({ length: 7 }, (_, i) => jmDate(data.today - (6 - i) * DAY));
  const students = { ok: usable(P.signups) && usable(P.ordersWeek), days: days.map(day => ({ day, signups: signups.filter(u => jmDate(u.createdAt) === day).length,
    firstOrders: Object.entries(firstOrder).filter(([id, t]) => newIds.has(id) && jmDate(t) === day).length })) };
  // Settling up: what each store and runner is owed since it was last settled (the UI adds the dates)
  const delivered7 = weekAll.filter(o => o.status === 'delivered' && o.createdAt >= weekStart);
  const settle = {
    stores: stores.map(s => { const list = delivered7.filter(o => o.storeId === s.id); const fl = floats.stores.find(f => f.id === s.id);
      return { id: s.id, name: s.name, orders: list.map(o => ({ code: o.code, at: o.deliveredAt || o.createdAt, amount: food(o) })), food: list.reduce((t, o) => t + food(o), 0), float: fl ? fl.float : null, owed: fl && fl.float < 0 ? -fl.float : 0 }; })
      .filter(s => s.orders.length || s.owed),
    runners: runners.map(r => { const list = delivered7.filter(o => o.dasherId === r.id);
      return { id: r.id, name: r.name || 'Runner', orders: list.map(o => ({ code: o.code, at: o.deliveredAt || o.createdAt, amount: Number(o.dasherPayoutJmd) || 0 })), owed: list.reduce((t, o) => t + (Number(o.dasherPayoutJmd) || 0), 0) }; })
      .filter(r => r.orders.length),
  };

  // ── Before launch: the owner's list, ticking itself where the data can tell ─
  const has = fn => (usable(P.stores) ? fn() : null);
  const storeGaps = has(() => {
    const miss = k => stores.filter(s => !s[k]).length;
    const noMenu = stores.filter(s => !menuItems.some(m => m.storeId === s.id && Number(m.price) > 0)).length;
    const parts = [miss('hours') && `${miss('hours')} without hours`, miss('model') && `${miss('model')} without a "How it works" setting`, miss('pickupPointId') && `${miss('pickupPointId')} without a campus food spot`, noMenu && `${noMenu} without a priced menu`].filter(Boolean);
    return parts.length ? `${parts.join(', ')} (of ${stores.length})` : '';
  });
  const tabletGaps = usable(P.storeLogins) && usable(P.stores) ? stores.filter(s => !logins.some(u => u.storeId === s.id && u.canNotify)).length : null;
  const pickupGaps = usable(P.storeLogins) && usable(P.stores) ? stores.filter(s => s.offersPickup && !logins.some(u => u.storeId === s.id)).length : null;
  const noColour = usable(P.stores) ? stores.filter(s => typeof s.colorNo !== 'number').length : null;
  const verified = runners.filter(r => (r.dasherStatus || 'verified') === 'verified' && r.isActive !== false).length;
  const deployed = P.functions?.ok ? !P.functions.names.includes('storeAlertsAdmin') && !(P.code?.ok && liveAt && P.code.at - liveAt > DAY) : null;
  const alertsOn = P.policies?.ok ? P.policies.rows.filter(p => p.on && p.emails > 0).length : null;
  const budgets = P.budgets?.ok ? P.budgets.rows : null;
  const auto = (id, done, found) => ({ id, done: done === true, found: done === null || done === undefined ? found || null : found });
  const B = (id, title, how, extra = {}) => ({ id, title, how, ...extra, ticked: !!ticks[id] });
  const checklist = [
    { title: 'Accounts and security', items: [
      B('deploy', 'Put the latest version live', 'The developer runs npm run deploy:all and answers yes when asked to delete storeAlertsAdmin (the old ntfy alerts).', auto('deploy', deployed, deployed === null ? null : deployed ? 'The live server is up to date and the old ntfy alerts are gone.' : 'The live version is behind the newest code, or the old ntfy alerts are still there.')),
      B('apikeys', 'Lock the API keys', 'Google Cloud → APIs and services → Credentials: each key limited to the Runner website or the Android app, never "None".', { link: { label: 'Open API keys', url: gc('/apis/credentials') } }),
      B('sakeys', 'Delete old service-account keys', 'Google Cloud → IAM → Service accounts → each account → Keys: delete any not in use today.', { link: { label: 'Open service accounts', url: gc('/iam-admin/serviceaccounts') } }),
      B('recaptcha', 'Every Runner address allowed for sign-in and the bot check', `Firebase → Authentication → Authorized domains, and Google Cloud → Security → reCAPTCHA → the website key → Domains: ${(P.signInHosts?.ok ? P.signInHosts.hosts : [`${project}.web.app`]).join(' and ')}.`, { link: { label: 'Open reCAPTCHA', url: gc('/security/recaptcha') }, ...auto('recaptcha', P.signInHosts?.ok ? P.signInHosts.missing.length === 0 : null, P.signInHosts?.ok ? (P.signInHosts.missing.length ? `Missing for: ${P.signInHosts.missing.map(m => m.host).join(', ')}.` : 'Every address is allowed.') : null) }),
      B('billingcard', 'Billing account open, with a card the bank allows abroad', 'Google Cloud → Billing → Payments: no declined payment, and ideally a backup card. Ask the bank to allow international online charges from Google.', { link: { label: 'Open billing', url: billingPage }, ...auto('billingcard', P.billing?.ok && P.billing.open !== null ? P.billing.open && P.billing.enabled : null, P.billing?.ok && P.billing.open !== null ? (P.billing.open ? 'The billing account is open.' : 'The billing account is closed.') : null) }),
      B('debugtoken', 'Register the developer\'s test browser', 'Firebase → App Check → Apps → the web app → three dots → Manage debug tokens.', { link: { label: 'Open App Check apps', url: fb('/appcheck/apps') } }),
      B('budget', 'Set a budget alert', 'Google Cloud → Billing → Budgets: US$25 a month, emails to jcommerceandtech@gmail.com.', { link: { label: 'Open budgets', url: gc('/billing/budgets') }, ...auto('budget', budgets ? budgets.length > 0 : null, budgets ? (budgets.length ? `Found: ${budgets.map(b => `${b.name} ${b.currency} ${b.amount}`).join(', ')}.` : 'No budget is set.') : 'The control room can\'t see budgets until the Budget API is switched on (see Is it running).') }),
      B('alerts', 'Switch on monitoring emails', 'The developer runs node scripts/setup-alerts.mjs jcommerceandtech@gmail.com; confirm Google\'s email.', auto('alerts', alertsOn === null ? null : alertsOn >= 3, alertsOn === null ? null : `${alertsOn} of 3 alerts are on with an email.`)),
      B('naming', 'Use the Runner name everywhere people see it', 'Firebase project name and web app nickname "Runner"; sign-in email sender name; the Google sign-in consent screen\'s app name and support email.', { link: { label: 'Open Firebase settings', url: fb('/settings/general') } }),
    ] },
    { title: 'Stores', items: [
      B('storeinfo', 'Every store has its name, campus food spot, opening hours, "How it works" setting and menu with prices', 'Runner admin → Stores → each store.', { link: link('Open Runner admin: Stores', '/stores'), ...auto('storeinfo', storeGaps === null ? null : storeGaps === '', storeGaps === null ? null : storeGaps ? `Still missing: ${storeGaps}.` : 'Every store is complete.') }),
      B('tablets', 'Every store has a tablet login, signed in on its tablet, with notifications allowed', 'Runner admin → Stores → the store → Store access; then sign in on the tablet and allow notifications.', auto('tablets', tabletGaps === null ? null : tabletGaps === 0, tabletGaps === null ? null : tabletGaps ? `${plural(tabletGaps, 'store')} without a tablet that can get alerts.` : 'Every store tablet can get alerts.')),
      B('pickuponly', 'Pickup is switched on only for stores whose tablet is set up', 'Runner admin → Stores → the store → pickup switch.', auto('pickuponly', pickupGaps === null ? null : pickupGaps === 0, pickupGaps === null ? null : pickupGaps ? `${plural(pickupGaps, 'store')} offer pickup with no tablet.` : 'Pickup is only on where a tablet exists.')),
      B('floats', 'Floats decided: which stores get one, and how much', 'Runner admin → Stores → "Adjust float", with a note.', { found: floats.ok ? `${plural(floats.stores.length, 'store float')} set.` : null }),
      B('colours', 'Open Runner admin → Stores once, so every store\'s colour is saved', 'Opening the Stores page saves a colour for every store. Once is enough.', { link: link('Open Runner admin: Stores', '/stores'), ...auto('colours', noColour === null ? null : noColour === 0 && stores.length > 0, noColour === null ? null : noColour ? `${noColour} of ${plural(stores.length, 'store')} have no colour saved yet.` : 'Every store has a colour.') }),
    ] },
    { title: 'Runners', items: [
      B('firstrunners', 'The first runners are verified and in one WhatsApp group with the owner', 'Runner admin → Runner verification; then add each to the group.', { link: link('Open runner verification', '/verify-runners'), found: usable(P.runners) ? `${plural(verified, 'verified runner')} so far.` : null }),
      B('briefed', 'Each runner knows the rules', 'Orders arrive in waves, students pay after accepting, never buy food before "Payment received", and idle runners are switched off after 2 hours.'),
      B('runnerfloats', 'Runner floats topped up where runners buy the food', 'Runner admin → Users → the runner → "Adjust float".', { found: floats.ok ? `${plural(floats.runners.filter(f => f.float > 0).length, 'runner')} with a float above zero.` : null }),
    ] },
    { title: 'Launch', items: [
      B('domain', 'Runner\'s own address works: uwi-runner.online', 'Bought on Cloudflare, connected in Firebase Hosting, A record DNS only (grey cloud).', { link: { label: 'Open Firebase Hosting', url: fb('/hosting/sites') }, ...auto('domain', P.domains?.ok ? P.domains.rows.length > 0 && P.domains.rows.every(d => d.direct && d.host === 'HOST_ACTIVE' && d.cert === 'CERT_ACTIVE') : null, P.domains?.ok ? (P.domains.rows.length ? P.domains.rows.map(d => `${d.name}: ${d.host === 'HOST_ACTIVE' && d.cert === 'CERT_ACTIVE' && d.direct ? 'live' : 'not ready'}`).join(', ') : 'No custom domain is connected.') : null) }),
      B('launchcodes', 'Make the 100 launch codes and print their QR cards', 'Runner admin → Launch codes → Make codes, then Print QR cards (on a computer). Test-scan one card before handing them out.', { link: link('Open Runner admin: Launch codes', '/launch-codes'), ...auto('launchcodes', launch ? launch.made >= 100 : null, launch ? `${launch.made} of 100 made, ${launch.claimed} claimed.` : null) }),
      B('flyer', 'Flyer printed after a test scan', 'Print one copy at 100% (actual size), scan the QR with an iPhone and an Android phone, then print the rest.'),
    ] },
    { title: 'Money while cards are off', items: [
      B('cashroutine', 'A cash top-up routine', 'The student pays cash; you add coins with "Adjust Runner coins" and a note such as "Cash J$2,000, receipt 014". Money below lists each day\'s manual top-ups so cash and coins can be matched.'),
      B('fygarooff', 'Fygaro stays off until its setup is finished', 'Follow PAYMENTS_SETUP.md in the Runner code (this venture\'s Docs tab).'),
    ] },
    { title: 'Test it like a student', items: [
      B('t-phones', 'On a real Android phone and a real iPhone, with Runner installed to the home screen', 'Sign up, top up coins, order, have a second phone accept as a runner, pay, deliver.'),
      B('t-pickup', 'A pickup order at a store with its tablet', 'Store says yes, student pays, store marks ready, then handed over.'),
      B('t-cancel', 'Cancel an order after paying, and check the coins come back', ''),
      B('t-push', 'Notifications arrive with Runner closed, on both phones', ''),
      B('t-green', 'The control room shows All good afterwards', 'Ticks itself whenever the verdict is green.'),
    ] },
  ];

  // ── Speed on real phones (anonymous reports, last 7 days) ───────────────────
  // Each figure is the 75th percentile: 3 in 4 visits were this fast or faster,
  // the yardstick Google uses. "First screen" is when Runner's first real screen
  // was on show; the rest are the browser's standard measures.
  const speedRows = P.speedReports?.ok ? P.speedReports.rows : [];
  const pct = (list, key, p = 0.75) => {
    const v = list.map(x => x[key]).filter(x => typeof x === 'number').sort((a, b) => a - b);
    return v.length ? v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)] : null;
  };
  const sum = (label, list) => ({ label, n: list.length, ready50: pct(list, 'ready', 0.5), ready: pct(list, 'ready'), lcp: pct(list, 'lcp'), inp: pct(list, 'inp'), cls: pct(list, 'cls') });
  const slowNet = x => x.saveData || ['slow-2g', '2g', '3g'].includes(x.net);
  const groups = [
    ['All visits', () => true], ['First visits', x => x.firstVisit], ['Returning visits', x => !x.firstVisit],
    ['Android', x => x.os === 'android'], ['iPhone', x => x.os === 'ios'], ['Computers', x => x.os === 'desktop'],
    ['Weak phones', x => x.lowPower || (x.memoryGb && x.memoryGb <= 2)], ['Slow connection or Data Saver', slowNet],
    ['Opened from the home screen', x => x.installed], ['Inside another app (Instagram, TikTok…)', x => x.browser === 'inapp'],
  ].map(([label, f]) => sum(label, speedRows.filter(f))).filter(g => g.n > 0);
  const byKey = (key, n = 6) => Object.entries(speedRows.reduce((m, x) => { const k = x[key] || '(unknown)'; (m[k] = m[k] || []).push(x); return m; }, {}))
    .map(([k, list]) => ({ ...sum(k, list), from: Math.min(...list.map(x => x.at)), to: Math.max(...list.map(x => x.at)) }))
    .sort((a, b) => (key === 'release' ? b.to - a.to : b.n - a.n)).slice(0, n);
  const speed = { ok: !!P.speedReports?.ok, error: P.speedReports?.ok ? null : P.speedReports?.error || null, hitLimit: !!P.speedReports?.hitLimit,
    n: speedRows.length, groups, pages: byKey('page'), releases: byKey('release', 4), enough: speedRows.length >= LIMITS.speedMin };
  if (speed.enough) {
    const all = groups[0];
    if (all.ready !== null && all.ready > LIMITS.speedReadyLook) running.push({ key: 'run.speedReady', lv: 'look',
      what: `Runner is slow to open on real phones: 3 in 4 visits this week showed the first screen within ${(all.ready / 1000).toFixed(1)} s (target: under ${LIMITS.speedReadyLook / 1000} s).`,
      why: 'People give up on an app that takes this long to open, especially on their first visit.',
      next: 'Open "Speed on real phones" below to see which phones, connections or pages are slowest, then tell the developer.' });
    if (all.inp !== null && all.inp > LIMITS.speedInpLook) running.push({ key: 'run.speedTaps', lv: 'look',
      what: `Runner answers taps slowly on real phones: 3 in 4 visits had their slowest tap answered within ${Math.round(all.inp)} ms (target: under ${LIMITS.speedInpLook} ms).`,
      why: 'A tap that takes half a second to respond feels broken, and people tap twice.',
      next: 'Open "Speed on real phones" below to see where, then tell the developer.' });
  }

  // ── Keeping the control room in step with Runner ───────────────────────────
  const keeping = {
    release: P.release?.ok ? P.release : null, server: P.functions?.ok ? P.functions.at : null, code: P.code?.ok ? P.code : null,
    lists: P.lists?.ok ? { statuses: P.lists.orderStatus?.length || 0, reasons: P.lists.cancelReason?.length || 0 } : null,
    budgets, budgetError: P.budgets?.ok ? null : P.budgets?.error || null, budgetDisabled: !!P.budgets?.disabled,
    appCheck, backups: P.backups?.ok ? P.backups : null, policies: P.policies?.ok ? P.policies.rows : null, billing: P.billing?.ok ? P.billing : null,
    serverUp: P.server?.ok ? P.server : null, domains: P.domains?.ok ? P.domains.rows : null,
  };

  const sections = [
    { id: 'orders', title: 'Orders', items: orders, quiet: `No order is stuck. ${plural(openNow.length, 'order')} open right now.`,
      help: 'An order should go from placed to delivered in well under an hour. This lists any order that has stopped moving for longer than normal; the server cancels the worst ones by itself.' },
    { id: 'money', title: 'Money', items: money, quiet: 'No payment needs a person, and every paid order has its record.',
      help: 'The server moves all money by itself and keeps a line for every change. This shows the few cases where it wants a person, and the sums you settle by hand.' },
    { id: 'people', title: 'People', items: people, quiet: `${online === null ? 'Runners online: couldn\'t check' : `${plural(online, 'runner')} online`}, stores match their hours, and nobody is waiting on you.`,
      help: 'Orders only move when an open store and a verified, online runner are both there. This shows when either is missing, and who is waiting on you.' },
    { id: 'running', title: 'Is it running', items: running, quiet: `The website answers${site?.ok && site.ms ? ` (${(site.ms / 1000).toFixed(1)} s)` : ''}${job?.lastRunAt ? `, the clean-up ran ${ago(mins(now - job.lastRunAt))} ago` : ''}, and there are no server errors.`,
      help: 'Whether the machinery behind Runner is healthy: the website, the server\'s regular jobs, notifications, the security check, the live version and the bill. Most of this you can\'t fix yourself; the job is to notice early and tell the developer.' },
  ];
  const items = sections.flatMap(s => s.items);
  const counted = items.filter(i => i.lv !== 'info');
  const counts = { act: counted.filter(i => i.lv === 'act').length, look: counted.filter(i => i.lv === 'look').length, unknown: counted.filter(i => i.lv === 'unknown').length };
  const verdict = counts.act ? 'act' : counts.look + counts.unknown ? 'look' : 'good';
  const first = counted.find(i => i.top && i.lv === 'act') || counted.find(i => i.lv === 'act') || counted.find(i => i.lv === 'look') || counted.find(i => i.lv === 'unknown');
  const reason = verdict === 'good' ? 'Nothing is stuck, no money needs a person, and the website and server are running.'
    : `${first.what}${counted.length > 1 ? ` And ${plural(counted.length - 1, 'more thing')} below.` : ''}`;
  const testing = checklist.find(c => c.title === 'Test it like a student');
  if (verdict === 'good' && testing) testing.items.find(i => i.id === 't-green').done = true;
  return { verdict, headline: { good: 'All good', look: 'Needs a look', act: 'Act now' }[verdict], reason, sections, items: counted, counts,
    today, live: liveCounts, cancellations, cash, floats, settle, runnerTable, storeTable, hourly, students, admins: admins.map(a => ({ email: a.email || '(no email)', expected: !expected || expected.includes(a.email) })),
    checklist, keeping, limits: L, launch, freeHeld, speed };
}
