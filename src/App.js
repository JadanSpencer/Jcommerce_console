import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where, limit, serverTimestamp
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend
} from 'recharts';

// ─── CUSTOM SVG ICONS (no lucide — proper hand-crafted icons) ─────────────────
const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', strokeWidth = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  home:      () => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />,
  pipeline:  () => <Icon d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  habits:    () => <Icon d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
  tasks:     () => <Icon d="M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />,
  schedule:  () => <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  finance:   () => <Icon d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-4H9l3-3 3 3h-2v4z" fill="currentColor" stroke="none" />,
  goals:     () => <Icon d="M18 20V10 M12 20V4 M6 20v-6" />,
  jaxon:     () => <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  bolt:      () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  plus:      () => <Icon d="M12 5v14M5 12h14" />,
  trash:     () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  edit:      () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
  close:     () => <Icon d="M18 6L6 18M6 6l12 12" />,
  check:     () => <Icon d="M20 6L9 17l-5-5" />,
  circle:    () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />,
  chevDown:  () => <Icon d="M6 9l6 6 6-6" />,
  chevUp:    () => <Icon d="M18 15l-6-6-6 6" />,
  bell:      () => <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />,
  dollar:    () => <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  trend:     () => <Icon d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  users:     () => <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  target:    () => <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z" fill="currentColor" stroke="none" />,
  flame:     () => <Icon d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7c-1.93 0-3.68-.79-4.95-2.05" />,
  whatsapp:  () => <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  send:      () => <Icon d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />,
  phone:     () => <Icon d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.22 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />,
  briefcase: () => <Icon d="M20 7H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />,
  loader:    () => <Icon d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />,
  bot:       () => <Icon d="M12 2a2 2 0 012 2v1h3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2zM9 11a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 16h6" />,
  barChart:  () => <Icon d="M18 20V10M12 20V4M6 20v-6" />,
  alert:     () => <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />,
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ['New','Contacted','Demo Sent','Negotiating','Paid','Flaked','Lost'];
const STATUS_COLOR = {
  New:'#3a4860', Contacted:'#00d4ff', 'Demo Sent':'#f0c060',
  Negotiating:'#e8a030', Paid:'#1adb8a', Flaked:'#ff6040', Lost:'#ff6040'
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const EXPENSE_CATS = ['Hosting','AI API','Tools','Transport','Food','Education','Other'];
const INCOME_CATS = ['Setup Fee','First Deposit','Second Deposit','Monthly Retainer','Completion Fee','Freelance','Other'];
const GOAL_CATS = ['Revenue','Clients','Skills','Health','Personal'];
const BLOCK_COLORS = {
  Work:'#00d4ff', Coding:'#f0c060', Outreach:'#1adb8a',
  University:'#7b6cf5', Rest:'#1e2a3f', Personal:'#ff8040', Other:'#ff6040'
};
const PAYMENT_STAGES = ['First Deposit','Second Deposit','Completion Fee','Monthly Retainer'];

const JAMAICAN_PARISHES = ['Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine'];
const CARIBBEAN_COUNTRIES = ['Jamaica', 'Trinidad', 'Barbados', 'Bahamas', 'Cayman Islands', 'Bermuda', 'Antigua', 'St. Lucia', 'Grenada', 'Dominica', 'Belize', 'Guyana', 'Suriname'];
const US_STATES_SAMPLE = ['New York','Florida','Georgia','Texas','California','New Jersey'];
const ALL_LOCATIONS = [...JAMAICAN_PARISHES, ...CARIBBEAN_COUNTRIES, ...US_STATES_SAMPLE];
const LOGO_B64 = 'data:image/jpeg;base64,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';


// Hollow neon SVG face icons — rendered inline as SVG paths
const EMOTION_SVG = {
  thriving: (c) => `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" stroke="${c}" stroke-width="2"/>
    <circle cx="17" cy="19" r="2.5" stroke="${c}" stroke-width="1.5"/>
    <circle cx="31" cy="19" r="2.5" stroke="${c}" stroke-width="1.5"/>
    <path d="M15 29 Q24 37 33 29" stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M19 14 L17 11 M29 14 L31 11" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  good: (c) => `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" stroke="${c}" stroke-width="2"/>
    <circle cx="17" cy="19" r="2.5" stroke="${c}" stroke-width="1.5"/>
    <circle cx="31" cy="19" r="2.5" stroke="${c}" stroke-width="1.5"/>
    <path d="M16 29 Q24 35 32 29" stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,
  watchout: (c) => `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" stroke="${c}" stroke-width="2"/>
    <line x1="15" y1="19" x2="21" y2="19" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="27" y1="19" x2="33" y2="19" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="32" x2="32" y2="32" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  struggling: (c) => `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" stroke="${c}" stroke-width="2"/>
    <path d="M15 18 L21 20 M33 18 L27 20" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="17" cy="21" r="2" stroke="${c}" stroke-width="1.5"/>
    <circle cx="31" cy="21" r="2" stroke="${c}" stroke-width="1.5"/>
    <path d="M16 33 Q24 27 32 33" stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,
  danger: (c) => `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" stroke="${c}" stroke-width="2"/>
    <path d="M15 17 L21 21 M33 17 L27 21" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="17" cy="22" r="2.5" stroke="${c}" stroke-width="1.5"/>
    <circle cx="31" cy="22" r="2.5" stroke="${c}" stroke-width="1.5"/>
    <path d="M15 34 Q24 28 33 34" stroke="${c}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <line x1="24" y1="8" x2="24" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="35" y1="11" x2="33" y2="14" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

const EMOTION_LEVELS = [
  { svgKey:'thriving',   label:'Thriving',   color:'#00d4ff', bg:'rgba(0,212,255,0.07)',   desc:'Ahead of target — keep going' },
  { svgKey:'good',       label:'Good',        color:'#40e8ff', bg:'rgba(64,232,255,0.07)',  desc:'On track' },
  { svgKey:'watchout',   label:'Watch Out',   color:'#f0c060', bg:'rgba(240,192,96,0.07)',  desc:'Needs attention' },
  { svgKey:'struggling', label:'Struggling',  color:'#ff8040', bg:'rgba(255,128,64,0.08)',  desc:'Pull up your socks' },
  { svgKey:'danger',     label:'Danger',      color:'#ff3030', bg:'rgba(255,48,48,0.08)',   desc:'Critical — act now' },
];

function calcEmotionLevel(finances, leads, xp, level) {
  const totalIncome   = finances.filter(f => f.type==='income').reduce((s,f) => s+(Number(f.amount)||0), 0);
  const totalExpenses = finances.filter(f => f.type==='expense').reduce((s,f) => s+(Number(f.amount)||0), 0);
  const profit        = totalIncome - totalExpenses;
  const mrr           = leads.filter(l => l.status==='Paid' && l.retainerAmount).reduce((s,l) => s+(Number(l.retainerAmount)||0), 0);
  const paidClients   = leads.filter(l => l.status==='Paid').length;
  const openLeads     = leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status)).length;
  const hasData       = finances.length > 0;

  if (!hasData && paidClients === 0) return 2;

  // ── PROFIT IS THE MASTER SIGNAL ──────────────────────────────────────────
  // Negative profit = cannot be Thriving or Good, no matter what else is true
  // The score bands are designed so profit alone determines the floor/ceiling

  let score = 50;

  // Profit — dominates the score (±40 pts possible)
  if      (profit > 200000) score += 40;
  else if (profit > 100000) score += 32;
  else if (profit > 50000)  score += 25;
  else if (profit > 20000)  score += 18;
  else if (profit > 5000)   score += 10;
  else if (profit > 0)      score += 4;
  else if (profit === 0)    score += 0;
  else if (profit > -5000)  score -= 15;   // slightly negative
  else if (profit > -20000) score -= 25;   // meaningfully negative
  else if (profit > -50000) score -= 35;   // bad
  else                      score -= 45;   // critical

  // MRR — stability bonus (max +12)
  if      (mrr > 50000) score += 12;
  else if (mrr > 20000) score += 8;
  else if (mrr > 7000)  score += 5;
  else if (mrr > 0)     score += 2;

  // Clients — proof bonus (max +8)
  if      (paidClients >= 5) score += 8;
  else if (paidClients >= 3) score += 5;
  else if (paidClients >= 1) score += 3;
  else                       score -= 4;

  // Pipeline (max +5)
  if      (openLeads >= 10) score += 5;
  else if (openLeads >= 5)  score += 3;
  else if (openLeads >= 1)  score += 1;
  else                      score -= 3;

  // Expense ratio (max ±5)
  if (hasData && totalIncome > 0) {
    const er = totalExpenses / totalIncome;
    if      (er < 0.3) score += 5;
    else if (er > 1.0) score -= 5;
    else if (er > 0.8) score -= 3;
  }

  score = Math.max(0, Math.min(100, score));

  // Proportional bands — each 20 points = one emoji step
  if (score >= 80) return 0; // 😎 Thriving
  if (score >= 60) return 1; // 😊 Good
  if (score >= 40) return 2; // 😐 Watch Out
  if (score >= 20) return 3; // 😟 Struggling
  return 4;                  // 🚨 Danger
}


// ─── LOCAL DATE (not UTC) ─────────────────────────────────────────────────────
// toISOString() uses UTC which causes date to flip at 7pm in Jamaica (UTC-5)
// Always use local date for XP, penalties, and todo logic
function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calcTodoXP(todos, todayStr) {
  const yesterday = localDateStr(new Date(new Date(todayStr) - 86400000));
  let xp = 0;

  // REWARD: +5 XP for every todo completed on any past day (not today)
  todos.forEach(t => {
    xp += Object.entries(t.doneOn||{})
      .filter(([date, done]) => done && date <= yesterday)
      .length * 5;
    // Today's completions also reward — but NO penalty for incomplete today
    if (t.doneOn?.[todayStr]) xp += 5;
  });

  // PENALTY: only for todos added ON yesterday that were NOT completed yesterday
  // KEY FIX: t.addedDate === yesterday (not <=) — we only judge ONE day at a time
  // Each day is judged exactly once — the next morning. Never retroactively.
  todos.forEach(t => {
    if (t.addedDate === yesterday && !t.doneOn?.[yesterday]) xp -= 10;
  });

  // PENALTY: if you had fewer than 5 todos yesterday (low effort)
  const todosAddedYesterday = todos.filter(t => t.addedDate === yesterday);
  const todosCompletedYesterday = todosAddedYesterday.filter(t => t.doneOn?.[yesterday]);
  if (todosAddedYesterday.length > 0 && todosCompletedYesterday.length < 5) xp -= 10;

  return xp;
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  // Uses local date via localDateStr — safe across timezones
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return localDateStr(d); });
}

function getLast20Weeks() {
  const weeks = []; const today = new Date();
  for (let w = 19; w >= 0; w--) {
    const days = []; const monday = new Date(today); const dow = today.getDay();
    monday.setDate(today.getDate() - (dow===0?6:dow-1) - w*7);
    for (let d = 0; d < 7; d++) { const day = new Date(monday); day.setDate(monday.getDate()+d); days.push(localDateStr(day)); }
    weeks.push(days);
  }
  return weeks;
}

function calcXP(habits, leads, todos, todayStr) {
  let xp = 0;
  const yesterday = localDateStr(new Date(new Date(todayStr) - 86400000));
  // RULE: Never penalise today. Penalties only apply to days strictly BEFORE today.
  // Today's habits and todos have until 11:59pm — no penalty until the next day.
  habits.forEach(h => {
    // Add XP for every completed habit on any past day
    xp += Object.values(h.completions||{}).filter(Boolean).length * 10;
    // Penalty: only if habit existed yesterday AND was not completed yesterday
    const created = h.createdAt?.toDate ? h.createdAt.toDate().toISOString().slice(0,10) : null;
    if (created && yesterday < created) return; // habit didn't exist yet yesterday
    if (!h.completions?.[yesterday]) xp -= 10;  // missed yesterday — deduct
    // Note: today (todayStr) is NEVER checked here — you have until midnight
  });
  leads.filter(l => l.status==='Paid').forEach(() => { xp += 200; });
  xp += calcTodoXP(todos, todayStr);
  return Math.max(0, xp);
}

function xpToLevel(xp) {
  return { level: Math.floor(xp/500)+1, progress: (xp%500)/500, xpInLevel: xp%500 };
}

// ─── USEANIMATION HOOK ────────────────────────────────────────────────────────
function useEntrance(delay = 0) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return visible;
}



// ─── WEB PUSH NOTIFICATIONS ───────────────────────────────────────────────────
const VAPID_PUBLIC = 'BHLx8C2kAHcDVJL13KyqNZYtADwBAii8vDpLbDMi5fjJi5Cn7XHuq9xlk08fCJdcQvOGhxovmHrZtp3Fmccdie0';

function urlBase64ToUint8Array(base64String) {
  const pad = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from({length: raw.length}, (_, i) => raw.charCodeAt(i));
}

function useNotifications() {
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [swReady, setSwReady]       = useState(false);
  const [subbed, setSubbed]         = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        setSwReady(true);
        // Check if already subscribed
        return reg.pushManager.getSubscription();
      })
      .then(sub => { if (sub) setSubbed(true); })
      .catch(err => console.warn('SW registration failed:', err));
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return;
    }

    // 1. Ask for notification permission
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return result;

    // 2. Subscribe to Web Push
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      // 3. Save subscription to Firebase so JAXON can reach this device
      const subJson = sub.toJSON();
      await fetch('https://jaxon-rctv.onrender.com/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          subscription: subJson,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      setSubbed(true);
      console.log('✓ Push subscription saved to JAXON');
    } catch (err) {
      console.error('Push subscription failed:', err);
    }

    return result;
  };

  return { permission, requestPermission, swReady, subbed };
}



// ─── VELOCITY TRACKER (SURPRISE) ─────────────────────────────────────────────
// Binary search to find records within a date window — O(log n) vs O(n) scan
function binarySearchDate(sortedArr, targetDate, key='date') {
  let lo = 0, hi = sortedArr.length - 1, result = sortedArr.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1; // bit-shift = faster integer division
    if ((sortedArr[mid][key] || '') >= targetDate) { result = mid; hi = mid - 1; }
    else lo = mid + 1;
  }
  return result;
}

function VelocityTracker({ leads, finances, habits, todos, todayStr, xp }) {
  // Sort finances by date once inside component — O(n log n)
  const financesSorted = useMemo(() =>
    [...(finances||[])].sort((a,b)=>(a.date||''). localeCompare(b.date||'')),
  [finances]);
  const now    = new Date(todayStr);
  const w7ago  = new Date(now - 7  * 86400000).toISOString().slice(0,10);
  const w14ago = new Date(now - 14 * 86400000).toISOString().slice(0,10);
  const w30ago = new Date(now - 30 * 86400000).toISOString().slice(0,10);

  // O(log n) — find start index of last 7 days in sorted finances
  const i7  = binarySearchDate(financesSorted, w7ago);
  const i14 = binarySearchDate(financesSorted, w14ago);
  const last7  = financesSorted.slice(i7);
  const prev7  = financesSorted.slice(i14, i7);

  const rev7  = last7.filter(f=>f.type==='income').reduce((s,f)=>s+(Number(f.amount)||0),0);
  const rev14 = prev7.filter(f=>f.type==='income').reduce((s,f)=>s+(Number(f.amount)||0),0);
  const revDelta = rev14 > 0 ? Math.round(((rev7-rev14)/rev14)*100) : (rev7>0?100:0);

  // Lead velocity — new leads this week vs last
  const newThis = leads.filter(l=>l.createdAt?.toDate?.()?.toISOString().slice(0,10)>=w7ago).length;
  const newPrev = leads.filter(l=>{
    const d=l.createdAt?.toDate?.()?.toISOString().slice(0,10)||'';
    return d>=w14ago && d<w7ago;
  }).length;
  const leadDelta = newPrev>0?Math.round(((newThis-newPrev)/newPrev)*100):(newThis>0?100:0);

  // Habit consistency — last 7 days
  const habitDays = habits.length * 7;
  const habitDone = habitDays > 0
    ? habits.reduce((s,h) => {
        for(let i=0;i<7;i++){
          const d=new Date(now-i*86400000).toISOString().slice(0,10);
          if(h.completions?.[d]) s++;
        }
        return s;
      }, 0)
    : 0;
  const consistency = habitDays > 0 ? Math.round((habitDone/habitDays)*100) : 0;

  const metrics = [
    {
      label: 'Revenue Velocity',
      value: `J$${rev7.toLocaleString()}`,
      sub: 'last 7 days',
      delta: revDelta,
      color: rev7 >= rev14 ? 'var(--bolt)' : '#ff6040',
    },
    {
      label: 'Lead Velocity',
      value: newThis,
      sub: 'new this week',
      delta: leadDelta,
      color: 'var(--bolt-lt)',
    },
    {
      label: 'Habit Consistency',
      value: `${consistency}%`,
      sub: '7-day streak rate',
      delta: null,
      color: consistency >= 70 ? 'var(--bolt)' : consistency >= 40 ? 'var(--horizon)' : '#ff6040',
    },
  ];

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(0,24,36,0.95) 0%, rgba(0,61,92,0.2) 100%)',
      border: '1px solid rgba(0,212,255,0.12)',
      borderRadius: 14, padding: '1.125rem',
    }}>
      {/* Top lightning line */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,
        background:'linear-gradient(90deg,transparent,var(--bolt-3),var(--bolt),var(--bolt-3),transparent)',
        opacity:0.6}}/>

      <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,
        letterSpacing:'0.3em',textTransform:'uppercase',
        color:'var(--bolt)',opacity:0.7,marginBottom:'0.625rem'}}>
        ⚡ Business Velocity
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.625rem'}}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background:'rgba(0,0,0,0.35)',
            border:'1px solid rgba(0,212,255,0.07)',
            borderRadius:10, padding:'0.75rem 0.625rem',
            position:'relative',overflow:'hidden',
          }}>
            <div style={{fontFamily:'var(--fm)',fontSize:'7px',color:'var(--mist-3)',
              letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6,lineHeight:1.3}}>
              {m.label}
            </div>
            <div style={{fontFamily:'var(--fe)',fontSize:'19px',fontWeight:700,
              color:m.color,lineHeight:1,
              textShadow:`0 0 16px ${m.color}60`}}>
              {m.value}
            </div>
            <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-3)',
              marginTop:3}}>
              {m.sub}
            </div>
            {m.delta !== null && (
              <div style={{
                position:'absolute',top:'0.5rem',right:'0.5rem',
                fontFamily:'var(--fm)',fontSize:'8px',fontWeight:600,
                color: m.delta >= 0 ? 'var(--bolt)' : '#ff6040',
                background: m.delta >= 0 ? 'rgba(0,212,255,0.1)' : 'rgba(255,96,64,0.1)',
                border: `1px solid ${m.delta>=0?'rgba(0,212,255,0.25)':'rgba(255,96,64,0.25)'}`,
                borderRadius:99, padding:'1px 5px',
              }}>
                {m.delta >= 0 ? '+' : ''}{m.delta}%
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{fontFamily:'var(--fm)',fontSize:'8px',color:'var(--mist-4)',
        marginTop:'0.625rem',letterSpacing:'0.08em',textAlign:'right'}}>
        vs prior 7 days · binary search O(log n)
      </div>
    </div>
  );
}

// ─── ALERT BANNER ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts }) {
  const [idx, setIdx] = useState(0);
  // Keep idx in bounds when alerts shrink
  const safeIdx = Math.min(idx, Math.max(0, alerts.length - 1));
  const cur = alerts[safeIdx];
  if (!cur) return null;

  const dismiss = (id) => {
    // Use the session-level dismiss that blocks Firestore from reverting
    if (window._dismissAlert) window._dismissAlert(id);
    setIdx(0); // reset to first remaining alert
  };

  const dismissAll = () => {
    alerts.forEach(a => window._dismissAlert?.(a.id));
    setIdx(0);
  };

  const typeColor = {
    MORNING_WAKE_UP: 'var(--bolt)',
    RESEARCH_FINDING: 'var(--bolt-lt)',
    OVERDUE: '#ff6040',
    DUE_SOON: 'var(--horizon)',
  }[cur.type] || 'var(--bolt)';

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(var(--bh) + 5rem)',
      left: '1rem', right: '1rem',
      maxWidth: 440, margin: '0 auto',
      background: 'rgba(4,8,15,0.98)',
      border: `1px solid ${typeColor}33`,
      borderTop: `2px solid ${typeColor}`,
      borderRadius: 12,
      padding: '0.875rem 1rem',
      zIndex: 300,
      boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${typeColor}10`,
      animation: 'riseUp 0.3s ease',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: typeColor, flexShrink: 0, marginTop: 5,
          boxShadow: `0 0 8px ${typeColor}`,
          animation: 'blink 1.5s ease-in-out infinite',
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--fm)', fontSize: '8px', color: typeColor,
            letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 3, opacity: 0.8,
          }}>
            {cur.type?.replace(/_/g,' ') || 'JAXON'}
            {alerts.length > 1 && (
              <span style={{marginLeft:8,opacity:0.5}}>{safeIdx+1}/{alerts.length}</span>
            )}
          </div>
          <div style={{
            fontFamily: 'var(--fe)', fontSize: '15px', fontWeight: 600,
            color: 'var(--mist-0)', lineHeight: 1.2, marginBottom: 4,
          }}>
            {cur.title || 'Alert'}
          </div>
          <div style={{
            fontSize: '12px', fontWeight: 300, color: 'var(--mist-2)',
            lineHeight: 1.6, wordBreak: 'break-word',
          }}>
            {cur.body || cur.message}
          </div>
        </div>
        {/* Close this alert */}
        <button
          onClick={() => dismiss(cur.id)}
          style={{
            flexShrink: 0, width: 32, height: 32,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, cursor: 'pointer',
            color: 'var(--mist-1)', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
          ×
        </button>
      </div>

      {/* Footer: nav + dismiss all */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '0.625rem', paddingTop: '0.5rem',
        borderTop: `1px solid ${typeColor}18`,
      }}>
        <button
          onClick={dismissAll}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--mist-3)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.2rem 0',
          }}>
          Clear all ({alerts.length})
        </button>
        {alerts.length > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={safeIdx===0}
              style={{ background:'none', border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:4, color:'var(--mist-2)', cursor:'pointer',
                padding:'0.15rem 0.6rem', fontSize:'12px', opacity: safeIdx===0?0.3:1 }}>←</button>
            <button onClick={() => setIdx(i => Math.min(alerts.length-1, i+1))} disabled={safeIdx===alerts.length-1}
              style={{ background:'none', border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:4, color:'var(--mist-2)', cursor:'pointer',
                padding:'0.15rem 0.6rem', fontSize:'12px', opacity: safeIdx===alerts.length-1?0.3:1 }}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CIRCUIT BOARD BACKGROUND ────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; init(); };

    // Blue shade palette
    const BLUES = ['#001824','#003d5c','#005f8a','#0088c8','#00aaee','#00d4ff','#40e8ff'];

    // Circuit nodes
    let nodes = [];
    // Active pulses travelling along edges
    let pulses = [];

    function init() {
      nodes = [];
      pulses = [];
      const cols = Math.floor(canvas.width / 80);
      const rows = Math.floor(canvas.height / 80);
      // Create grid nodes with slight jitter
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          nodes.push({
            x: c * 80 + (Math.random() - 0.5) * 28,
            y: r * 80 + (Math.random() - 0.5) * 28,
            active: Math.random() < 0.18,
            size: Math.random() * 1.5 + 0.5,
            blink: Math.random() * Math.PI * 2,
            blinkSpeed: Math.random() * 0.025 + 0.008,
            shade: BLUES[Math.floor(Math.random() * BLUES.length)],
          });
        }
      }
      // Spawn initial pulses
      for (let i = 0; i < 12; i++) spawnPulse();
    }

    function spawnPulse() {
      if (nodes.length < 2) return;
      const from = nodes[Math.floor(Math.random() * nodes.length)];
      // Pick nearby node as target
      const nearby = nodes.filter(n => {
        const dx = n.x - from.x; const dy = n.y - from.y;
        const d = Math.sqrt(dx*dx+dy*dy);
        return d > 20 && d < 180;
      });
      if (nearby.length === 0) return;
      const to = nearby[Math.floor(Math.random() * nearby.length)];
      const shadeIdx = Math.floor(Math.random() * BLUES.length);
      pulses.push({
        from, to,
        t: 0,
        speed: Math.random() * 0.008 + 0.003,
        shade: BLUES[shadeIdx],
        bright: Math.random() < 0.25,
        width: Math.random() * 0.8 + 0.3,
        trail: [], // stores last positions for trail
      });
    }

    function drawEdge(a, b, alpha, shade, w) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      // L-shaped routing — horizontal then vertical (circuit style)
      const mx = b.x;
      const my = a.y;
      ctx.lineTo(mx, my);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = shade.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#', 'rgba(').replace(/^rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}),/, (m,r,g,b) => `rgba(${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},`);
      ctx.lineWidth = w;
      ctx.stroke();
    }

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawCircuitLine(x1,y1,x2,y2, alpha, shade, w=0.5) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);  // horizontal
      ctx.lineTo(x2, y2);  // vertical
      ctx.strokeStyle = hexToRgba(shade, alpha);
      ctx.lineWidth = w;
      ctx.stroke();
    }

    function lerp(a, b, t) { return a + (b-a)*t; }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw static grid edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i+1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x-a.x; const dy = b.y-a.y;
          const d = Math.sqrt(dx*dx+dy*dy);
          if (d < 130) {
            const alpha = (1 - d/130) * 0.07;
            drawCircuitLine(a.x, a.y, b.x, b.y, alpha, '#003d5c', 0.5);
          }
        }
      }

      // Draw pulses
      pulses.forEach((p, idx) => {
        p.t += p.speed;
        const cx = lerp(p.from.x, p.to.x, p.t);
        const cy = lerp(p.from.y, p.to.y, p.t);

        // Trail
        p.trail.push({x: cx, y: cy});
        if (p.trail.length > 18) p.trail.shift();

        // Draw trail
        p.trail.forEach((pt, ti) => {
          const ta = (ti / p.trail.length) * 0.6 * (p.bright ? 1.4 : 1);
          const r2 = p.width * (0.5 + (ti / p.trail.length) * 1.5);
          const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r2 * 3);
          grd.addColorStop(0, hexToRgba('#e0faff', ta * 0.9));
          grd.addColorStop(0.4, hexToRgba(p.shade, ta * 0.7));
          grd.addColorStop(1, hexToRgba(p.shade, 0));
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r2 * 3, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        });

        // Draw path the pulse travels along
        drawCircuitLine(p.from.x, p.from.y, p.to.x, p.to.y, 0.25 * (p.bright ? 1.8 : 1), p.shade, p.width * 0.8);

        if (p.t >= 1) {
          pulses.splice(idx, 1);
          spawnPulse();
        }
      });

      // Draw nodes
      nodes.forEach(n => {
        n.blink += n.blinkSpeed;
        const alpha = n.active ? 0.55 + Math.sin(n.blink) * 0.35 : 0.08 + Math.sin(n.blink) * 0.04;
        const glow = n.active ? n.size * 5 : n.size * 1.5;
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glow);
        grd.addColorStop(0, hexToRgba('#e0faff', alpha));
        grd.addColorStop(0.4, hexToRgba(n.shade, alpha * 0.6));
        grd.addColorStop(1, hexToRgba(n.shade, 0));
        ctx.beginPath();
        ctx.arc(n.x, n.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });

      raf = requestAnimationFrame(loop);
    }

    resize();
    loop();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed', inset:0, width:'100%', height:'100%',
      pointerEvents:'none', zIndex:0, opacity:0.45,
    }}/>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [leads, setLeads]       = useState([]);
  const [habits, setHabits]     = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [finances, setFinances] = useState([]);
  const [goals, setGoals]       = useState([]);
  const [xpBonus, setXpBonus]   = useState(0);
  const [todos, setTodos]       = useState([]);
  const [queue, setQueue]       = useState([]);
  const [logs, setLogs]         = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const weekDates = getWeekDates();
  const { permission: notifPerm, requestPermission, subbed: notifSubbed } = useNotifications();
  // Allow pipeline to trigger invoice from lead
  useEffect(() => { window._openInvoice = (data) => { setInvoiceData(data); setInvoiceOpen(true); }; return () => { delete window._openInvoice; }; }, []);
  const todayStr  = localDateStr();  // Local date — avoids UTC flip at 7pm Jamaica time

  // ── O(1) LOOKUP MAPS — built once, used everywhere ──────────────────────────
  // Maps are recomputed only when underlying data changes (useMemo deps)

  // Lead map: id → lead  (O(1) lookup instead of O(n) .find)
  const leadMap = useMemo(() => {
    const m = new Map();
    leads.forEach(l => m.set(l.id, l));
    return m;
  }, [leads]);

  // Finance by lead: leadId → Finance[]  (O(1) lookup instead of O(n) .filter)
  const financeByLead = useMemo(() => {
    const m = new Map();
    finances.forEach(f => {
      if (!f.pipelineLeadId) return;
      if (!m.has(f.pipelineLeadId)) m.set(f.pipelineLeadId, []);
      m.get(f.pipelineLeadId).push(f);
    });
    return m;
  }, [finances]);

  // Schedule by day: day → Block[]  (O(1) lookup instead of O(n) .filter per day)
  const scheduleByDay = useMemo(() => {
    const m = new Map();
    schedule.forEach(b => {
      if (!m.has(b.day)) m.set(b.day, []);
      m.get(b.day).push(b);
    });
    return m;
  }, [schedule]);

  // Habits completion map: habitId+date → boolean  (O(1) streak check)
  const habitCompletionSet = useMemo(() => {
    const s = new Set();
    habits.forEach(h => {
      Object.entries(h.completions || {}).forEach(([date, done]) => {
        if (done) s.add(`${h.id}:${date}`);
      });
    });
    return s;
  }, [habits]);

  // Todo done set: todoId+date → boolean  (O(1) completion check)
  const todoDoneSet = useMemo(() => {
    const s = new Set();
    todos.forEach(t => {
      Object.entries(t.doneOn || {}).forEach(([date, done]) => {
        if (done) s.add(`${t.id}:${date}`);
      });
    });
    return s;
  }, [todos]);

  // ── O(log n) BINARY SEARCH for sorted finance list ──────────────────────────
  // Pre-sorted finances by date for the projection/chart (sorted once, O(n log n))
  const financesSorted = useMemo(() =>
    [...finances].sort((a, b) => (a.date||'').localeCompare(b.date||'')),
  [finances]);

  // ── DERIVED STATS (all O(n), computed once via useMemo) ─────────────────────
  const paidLeads   = useMemo(() => leads.filter(l => l.status === 'Paid'), [leads]);
  const openLeads   = useMemo(() => leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status)), [leads]);

  useEffect(() => {
    const SPLASH_MS = 4000;
    let timerDone = false;
    let dataReady = false;

    const tryDismiss = () => {
      if (timerDone && dataReady) setLoading(false);
    };

    // Hard 4-second minimum — always fires
    const timer = setTimeout(() => {
      timerDone = true;
      tryDismiss();
    }, SPLASH_MS);

    // Safety net — if Firebase never responds, dismiss after 8s anyway
    const fallback = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const cols = [
      ['leads',setLeads],['habits',setHabits],['schedule',setSchedule],
      ['finances',setFinances],['goals',setGoals],['todos',setTodos],
      ['jaxon_queue',setQueue],['jaxon_logs',setLogs],['briefings',setBriefings],
    ];

    // Track which collections have fired at least once
    const fired = new Set();
    const unsubs = [];

    cols.forEach(([col, setter]) => {
      try {
        const q = query(collection(db, col), orderBy('createdAt','desc'));
        const unsub = onSnapshot(q,
          snap => {
            setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            fired.add(col);
            if (fired.size >= cols.length) {
              dataReady = true;
              tryDismiss();
            }
          },
          err => {
            console.warn('Snapshot error for', col, err.message);
            fired.add(col); // count it as done so we don't hang
            if (fired.size >= cols.length) {
              dataReady = true;
              tryDismiss();
            }
          }
        );
        unsubs.push(unsub);
      } catch (e) {
        console.warn('Collection error', col, e.message);
        fired.add(col);
        if (fired.size >= cols.length) {
          dataReady = true;
          tryDismiss();
        }
      }
    });

    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
      unsubs.forEach(u => u());
    };
  }, []);

  // ── ALERTS — separate listener with local dismissed set ──────────────────
  useEffect(() => {
    const dismissed = new Set(); // tracks ids dismissed this session

    // Use already-imported firebase functions
    // Simple query — no composite index required
    // Client-side filter for seen:false and dismissed set
    const unsub = onSnapshot(
      query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(30)),
      snap => {
        const fresh = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => !a.seen && !dismissed.has(a.id));
        setAlerts(fresh);
      },
      err => {
        console.warn('Alerts listener error:', err.message);
      }
    );

    // Expose dismiss function that blocks Firestore from un-dismissing
    window._dismissAlert = (id) => {
      dismissed.add(id); // local block — permanent for this session
      setAlerts(prev => prev.filter(a => a.id !== id));
      // Write seen=true to Firestore so it never comes back after refresh
      update('alerts', id, { seen: true });
    };

    return () => { unsub(); delete window._dismissAlert; };
  }, []);

  const add    = async (col, data) => { try { await addDoc(collection(db,col), {...data, createdAt:serverTimestamp()}); } catch { setError('Failed to save.'); } };
  const update = async (col, id, data) => { try { await updateDoc(doc(db,col,id), data); } catch { setError('Failed to update.'); } };
  const remove = async (col, id) => { try { await deleteDoc(doc(db,col,id)); } catch { setError('Failed to delete.'); } };
  const toggleHabit = async (habit, date) => { await update('habits', habit.id, { completions: {...(habit.completions||{}), [date]: !habit.completions?.[date]} }); };
  const toggleTodo  = async (todo) => { await update('todos', todo.id, { doneOn: {...(todo.doneOn||{}), [todayStr]: !todo.doneOn?.[todayStr]} }); };

  const logPayment = async (lead, stage, amount, date) => {
    if (finances.some(f => f.pipelineLeadId===lead.id && f.paymentStage===stage)) return;
    await add('finances', { type:'income', description:`${lead.businessName} — ${stage}`, amount:Number(amount), category:stage.includes('Retainer')?'Monthly Retainer':'Setup Fee', date:date||todayStr, pipelineLeadId:lead.id, paymentStage:stage });
  };
  const updateLinkedPayment = async (lead, stage, amount, date) => {
    const entry = finances.find(f => f.pipelineLeadId===lead.id && f.paymentStage===stage);
    if (entry) await update('finances', entry.id, { amount:Number(amount), date:date||todayStr, description:`${lead.businessName} — ${stage}` });
    else await logPayment(lead, stage, amount, date);
  };

  const totalIncome   = finances.filter(f=>f.type==='income').reduce((s,f)=>s+(Number(f.amount)||0),0);
  const totalExpenses = finances.filter(f=>f.type==='expense').reduce((s,f)=>s+(Number(f.amount)||0),0);
  const profit     = totalIncome - totalExpenses;
  // paidLeads and openLeads passed as props from App useMemo
  const habitsToday = habits.length ? Math.round(habits.filter(h=>h.completions?.[todayStr]).length/habits.length*100) : 0;
  const xp = calcXP(habits, leads, todos, todayStr) + xpBonus;
  const { level, progress, xpInLevel } = xpToLevel(xp);
  const todayTodos = todos.filter(t=>t.addedDate===todayStr);
  const todayDone  = todayTodos.filter(t=>t.doneOn?.[todayStr]);
  const todayBriefing = briefings.find(b=>b.date===todayStr) || null;

  const navItems = [
    {id:'dashboard', label:'Home',     icon:Icons.home},
    {id:'pipeline',  label:'Pipeline', icon:Icons.pipeline},
    {id:'habits',    label:'Habits',   icon:Icons.habits},
    {id:'todos',     label:'Tasks',    icon:Icons.tasks},
    {id:'schedule',  label:'Schedule', icon:Icons.schedule},
    {id:'finance',   label:'Finance',  icon:Icons.finance},
    {id:'goals',     label:'Goals',    icon:Icons.goals},
    {id:'jaxon',     label:'JAXON',    icon:Icons.jaxon},
    {id:'clients',   label:'Clients',  icon:Icons.briefcase},
  ];

  if (loading) return (
    <div className="splash">
      <div className="splash-logo">
        <div className="splash-j">J</div>
        <div className="splash-c">C</div>
      </div>
      <div className="splash-wordmark">JCommerce</div>
      <div className="splash-sub">Founder Console</div>
      <div className="splash-track"><div className="splash-fill" /></div>
    </div>
  );

  return (
    <div className="app">
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <Particles />

      <header className="header">
        <div className="brand">
          <div className="brand-gem">J</div>
          <div>
            <div className="brand-name">JCommerce</div>
            <div className="brand-sub">Founder Console</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <button className="icon-btn" title="Create Invoice" onClick={()=>setInvoiceOpen(true)} style={{width:28,height:28,borderColor:'rgba(0,212,255,0.2)',color:'var(--bolt)'}}>📄</button>
          <button
            onClick={requestPermission}
            title={notifSubbed?'Push notifications active':notifPerm==='granted'?'Notifications on — tap to enable push':'Tap to enable notifications'}
            style={{
              position:'relative',background:'none',
              border:`1px solid ${notifSubbed?'rgba(0,212,255,0.35)':'rgba(255,255,255,0.08)'}`,
              cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              width:32,height:32,
              color:notifSubbed?'var(--bolt)':notifPerm==='granted'?'var(--bolt-3)':'var(--mist-3)',
              borderRadius:'var(--r1)',
              boxShadow:notifSubbed?'0 0 8px rgba(0,212,255,0.3)':'none',
              flexShrink:0,
            }}>
            <Icons.bell size={15}/>
            {alerts.length > 0 && (
              <span style={{
                position:'absolute',top:-3,right:-3,
                background:'#ff6040',color:'white',
                borderRadius:'50%',width:15,height:15,
                fontSize:'8px',fontWeight:700,lineHeight:1,
                display:'flex',alignItems:'center',justifyContent:'center',
                border:'1.5px solid var(--lake-1)',
                boxShadow:'0 0 6px rgba(255,96,64,0.7)',
              }}>{Math.min(9,alerts.length)}</span>
            )}
          </button>
          {todayBriefing && (
            <button className="briefing-pill" onClick={() => setBriefingOpen(true)}>
              <span className="briefing-dot"/>
              Briefing
            </button>
          )}
          <div className="xp-chip">
            <span className="xp-chip-lv">L{level}</span>
            <span className="xp-chip-sep">·</span>
            <span className="xp-chip-xp">{xp} XP</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-toast">
          <Icons.alert size={14}/>
          <span>{error}</span>
          <button onClick={() => setError('')}><Icons.close size={12}/></button>
        </div>
      )}

      <main className="main">
        {tab==='dashboard' && <Dashboard leads={leads} habits={habits} finances={finances} todos={todos} habitsToday={habitsToday} totalIncome={totalIncome} totalExpenses={totalExpenses} profit={profit} paidLeads={paidLeads} openLeads={openLeads} todayStr={todayStr} xp={xp} level={level} progress={progress} xpInLevel={xpInLevel} onToggleHabit={toggleHabit} onToggleTodo={toggleTodo} todayTodos={todayTodos} todayDone={todayDone}/>}
        {tab==='pipeline' && <Pipeline leads={leads} finances={finances} onAdd={d=>add('leads',d)} onUpdate={(id,d)=>update('leads',id,d)} onDelete={id=>remove('leads',id)} onLogPayment={logPayment} onUpdatePayment={updateLinkedPayment}/>}
        {tab==='habits'   && <Habits habits={habits} weekDates={weekDates} todayStr={todayStr} onAdd={d=>add('habits',{...d,completions:{}})} onUpdate={(id,d)=>update('habits',id,d)} onDelete={id=>remove('habits',id)} onToggle={toggleHabit}/>}
        {tab==='todos'    && <Todos todos={todos} todayStr={todayStr} onAdd={d=>add('todos',{...d,doneOn:{},addedDate:todayStr})} onUpdate={(id,d)=>update('todos',id,d)} onDelete={id=>remove('todos',id)} onToggle={toggleTodo}/>}
        {tab==='schedule' && <Schedule schedule={schedule} onAdd={d=>add('schedule',d)} onUpdate={(id,d)=>update('schedule',id,d)} onDelete={id=>remove('schedule',id)}/>}
        {tab==='finance'  && <Finance finances={finances} leads={leads} totalIncome={totalIncome} totalExpenses={totalExpenses} profit={profit} xp={xp} level={level} onAdd={d=>add('finances',d)} onUpdate={(id,d)=>update('finances',id,d)} onDelete={id=>remove('finances',id)}/>}
        {tab==='goals'    && <Goals goals={goals} onAdd={d=>add('goals',d)} onUpdate={(id,d)=>update('goals',id,d)} onDelete={id=>remove('goals',id)} onGoalComplete={g=>setXpBonus(b=>b+100)}/>}
        {tab==='jaxon'    && <JaxonDashboard queue={queue} logs={logs} briefings={briefings} todayStr={todayStr} onApprove={id=>update('jaxon_queue',id,{status:'approved'})} onReject={id=>update('jaxon_queue',id,{status:'rejected'})}/>}
        {tab==='clients'  && <ClientManagement leads={leads} finances={finances} onUpdateLead={(id,d)=>update('leads',id,d)}/>}
      </main>

      <nav className="bottom-nav">
        {navItems.map((n,i) => (
          <button key={n.id} className={`nav-btn ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)} style={{'--i':i}}>
            <span className="nav-icon"><n.icon /></span>
            <span className="nav-lbl">{n.label}</span>
            {tab===n.id && <span className="nav-pip"/>}
          </button>
        ))}
      </nav>

      {/* Briefing Modal */}
      {briefingOpen && todayBriefing && (
        <div className="modal-overlay" onClick={() => setBriefingOpen(false)}>
          <div className="modal modal-tall" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-head">
              <div>
                <div style={{fontFamily:'var(--fe)',fontWeight:800,fontSize:'16px'}}>Morning Briefing</div>
                <div style={{fontSize:'11px',color:'var(--mist-2)',fontFamily:'var(--fm)'}}>{todayBriefing.date}</div>
              </div>
              <button className="icon-btn" onClick={() => setBriefingOpen(false)}><Icons.close size={16}/></button>
            </div>
            <div style={{fontSize:'13.5px',lineHeight:'1.8',color:'var(--mist-1)',whiteSpace:'pre-line',overflowY:'auto',flex:1}}>
              {todayBriefing.content}
            </div>
          </div>
        </div>
      )}


      {/* NOTIFICATION CENTRE — zIndex 300 so it's always above FAB */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} />
      )}

      {/* Invoice Generator */}
      {invoiceOpen && <InvoiceGenerator leads={leads} finances={finances} initialData={invoiceData} onClose={()=>{setInvoiceOpen(false);setInvoiceData(null);}}/> }

      {/* Shortcut: invoice icon in header */}

      {/* JAXON Floating Chat */}
      <JaxonFloat leads={leads} habits={habits} finances={finances} goals={goals} todos={todos} schedule={schedule} totalIncome={totalIncome} totalExpenses={totalExpenses} profit={profit} xp={xp} level={level} todayStr={todayStr} paidLeads={paidLeads} openLeads={openLeads}/>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ leads, habits, finances, todos, habitsToday, totalIncome, totalExpenses, profit, paidLeads, openLeads, todayStr, xp, level, progress, xpInLevel, onToggleHabit, onToggleTodo, todayTodos, todayDone }) {
  const weeks = getLast20Weeks();
  const allDates = weeks.flat();
  const habitHeatmap = allDates.map(date => {
    const done = habits.filter(h=>h.completions?.[date]).length;
    const total = habits.length;
    return { date, lv: total===0 ? 0 : Math.ceil((done/total)*4) };
  });

  return (
    <div className="section">
      {/* XP Hero */}
      <div className="xp-hero" style={{'--prog':`${progress*100}%`}}>
        <div className="xp-avatar">J</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="xp-name">Jadan Spencer</div>
          <div className="xp-lvl-tag">Level {level} Founder</div>
          <div className="xp-track"><div className="xp-fill"/></div>
          <div className="xp-pts">{xpInLevel} / 500 XP → Level {level+1}</div>
        </div>
      </div>

      {/* ⚡ Velocity Tracker */}
      <VelocityTracker
        leads={leads} finances={finances}
        habits={habits} todos={todos}
        todayStr={todayStr} xp={xp}
      />

      {/* Stats */}
      <div className="grid-2">
        <StatCard label="Net Profit"    value={`J$${profit.toLocaleString()}`}    icon={Icons.trend}   color={profit>=0?'#1adb8a':'#ff6040'} />
        <StatCard label="Paid Clients"  value={paidLeads.length}                    icon={Icons.users}   color="var(--horizon)" />
        <StatCard label="Open Pipeline" value={openLeads.length}                    icon={Icons.target}  color="var(--horizon)" />
        <StatCard label="Habits Today"  value={`${habitsToday}%`}                   icon={Icons.flame}   color="var(--horizon)" />
      </div>

      {/* Today habits quick */}
      {habits.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Today's Habits</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {habits.map(h => (
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggleHabit(h,todayStr)} style={{color:h.completions?.[todayStr]?'#1adb8a':'var(--mist-3)',flexShrink:0}}>
                  {h.completions?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                </button>
                <span style={{flex:1,minWidth:0,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:h.completions?.[todayStr]?'var(--mist-2)':'var(--mist-0)',textDecoration:h.completions?.[todayStr]?'line-through':'none'}}>{h.name}</span>
                {h.completions?.[todayStr] && <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#1adb8a',flexShrink:0}}>+10</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today tasks quick */}
      {todayTodos.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Tasks · {todayDone.length}/{todayTodos.length}</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {todayTodos.map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggleTodo(t)} style={{color:t.doneOn?.[todayStr]?'#7b6cf5':'var(--mist-3)',flexShrink:0}}>
                  {t.doneOn?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                </button>
                <span style={{flex:1,minWidth:0,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-0)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}><span className='' style={{color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-0)'}}>{t.title}</span></span>
                {t.doneOn?.[todayStr] && <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#7b6cf5',flexShrink:0}}>+5</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="card fade-in">
        <div className="card-label">Consistency — 20 Weeks</div>
        <div style={{overflowX:'auto'}}>
          <div style={{display:'flex',gap:'3px',minWidth:'max-content'}}>
            {weeks.map((week,wi) => (
              <div key={wi} style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                {week.map(date => {
                  const e = habitHeatmap.find(h=>h.date===date);
                  return <div key={date} className={`hcell lv${e?.lv||0}${date===todayStr?' today':''}`} title={date}/>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0,1,2,3,4].map(l => <div key={l} className={`hcell lv${l}`}/>)}
          <span>More</span>
        </div>
      </div>

      {/* Pipeline chart */}
      {leads.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Pipeline</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={LEAD_STATUSES.map(s=>({name:s,count:leads.filter(l=>l.status===s).length})).filter(d=>d.count>0)} margin={{left:0,right:0,top:4,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="name" tick={{fill:'#4a5568',fontSize:9}}/>
              <YAxis tick={{fill:'#4a5568',fontSize:9}} allowDecimals={false} width={22}/>
              <Tooltip contentStyle={{background:'#0f172a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#e2e8f0',fontSize:'11px'}}/>
              <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({label,value,icon:Icon,color}) {
  return (
    <div className="stat-card fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
        <span className="stat-label">{label}</span>
        <span style={{color,opacity:0.8}}><Icon size={15}/></span>
      </div>
      <div className="stat-value" style={{color}}>{value}</div>
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────

// ─── PIPELINE (ENHANCED) ──────────────────────────────────────────────────────
function Pipeline({leads,finances,onAdd,onUpdate,onDelete,onLogPayment,onUpdatePayment}) {
  const [form,setForm]           = useState(null);
  const [payForm,setPayForm]     = useState(null);
  const [expanded,setExpanded]   = useState(null);
  const [showFilters,setShowFilters] = useState(false);
  const [page,setPage]           = useState(0);
  const PER_PAGE = 10;

  // Filters
  const [fStatus,setFStatus]     = useState('All');
  const [fLocation,setFLocation] = useState('All');
  const [fSource,setFSource]     = useState('All');
  const [fWhatsApp,setFWhatsApp] = useState('All'); // All / Yes / No
  const [fPriority,setFPriority] = useState('All');
  const [fSize,setFSize] = useState('All'); // All / Small / Medium / Large
  const [search,setSearch]       = useState('');

  // Dial queue
  const [dialQueue,setDialQueue] = useState([]);
  const [dialIdx,setDialIdx]     = useState(0);
  const [showDial,setShowDial]   = useState(false);

  const totalVal = leads.filter(l=>!['Flaked','Lost'].includes(l.status)).reduce((s,l)=>s+(Number(l.value)||0),0);
  const getPayments = lid => finances.filter(f=>f.pipelineLeadId===lid);

  const getAlert = lead => {
    if (!lead.retainerAmount || !lead.retainerDueDay) return null;
    const today=new Date(); const dueDay=parseInt(lead.retainerDueDay);
    const thisMonth=new Date(today.getFullYear(),today.getMonth(),dueDay);
    const nextMonth=new Date(today.getFullYear(),today.getMonth()+1,dueDay);
    const dT=Math.ceil((thisMonth-today)/86400000);
    const dN=Math.ceil((nextMonth-today)/86400000);
    const isOverdue=dT<0&&Math.abs(dT)<=5;
    return {daysUntil:isOverdue?dT:(dT>=0?dT:dN),isOverdue};
  };

  // Apply all filters
  const filtered = leads.filter(l => {
    if (fStatus!=='All' && l.status!==fStatus) return false;
    if (fLocation!=='All' && (l.location||l.parish||'')!==fLocation) return false;
    if (fSource!=='All') {
      if (fSource==='JAXON' && l.source!=='JAXON Agent') return false;
      if (fSource==='Manual' && l.source==='JAXON Agent') return false;
    }
    if (fWhatsApp==='Yes' && !l.phone) return false;
    if (fWhatsApp==='No' && l.phone) return false;
    if (fPriority!=='All' && l.priority!==fPriority) return false;
    if (fSize!=='All' && (l.businessSize||'Small')!==fSize) return false;
    if (search && !l.businessName?.toLowerCase().includes(search.toLowerCase()) &&
        !l.contactName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pageCount = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page+1) * PER_PAGE);

  // Build dial queue from all leads with phone numbers
  const buildDialQueue = () => {
    const nums = leads.filter(l=>l.phone).map(l=>({
      id:l.id, name:l.businessName, phone:l.phone,
      status:l.status, draft:l.outreachDraft||''
    }));
    setDialQueue(nums);
    setDialIdx(0);
    setShowDial(true);
  };

  const activeFilters = [fStatus,fLocation,fSource,fWhatsApp,fPriority,fSize].filter(f=>f!=='All').length + (search?1:0);

  // Unique locations from leads
  const leadLocations = [...new Set(leads.map(l=>l.location||l.parish).filter(Boolean))];

  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Sales Pipeline</div>
        <div className="hero-big filled">J${totalVal.toLocaleString()}</div>
        <div className="hero-sub">
          {leads.filter(l=>l.status==='Paid').length} paid ·{' '}
          {leads.filter(l=>!['Paid','Flaked','Lost'].includes(l.status)).length} open ·{' '}
          {filtered.length} shown
        </div>
      </div>

      {/* Search + controls */}
      <div style={{display:'flex',gap:'0.5rem'}}>
        <input
          className="input" style={{flex:1}}
          value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
          placeholder="Search businesses..."/>
        <button
          className={`btn-ghost ${showFilters?'active':''}`}
          style={{flexShrink:0,position:'relative',padding:'0.5rem 0.75rem'}}
          onClick={()=>setShowFilters(v=>!v)}>
          <Icons.target size={14}/>
          {activeFilters>0 && (
            <span style={{position:'absolute',top:-4,right:-4,background:'#1adb8a',color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{activeFilters}</span>
          )}
        </button>
        <button className="btn-primary icon-only" onClick={()=>setForm({})}><Icons.plus size={16}/></button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card fade-in" style={{padding:'0.875rem',display:'flex',flexDirection:'column',gap:'0.625rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="card-label" style={{margin:0}}>Filters</span>
            {activeFilters>0 && (
              <button className="btn-ghost" style={{fontSize:'11px',padding:'0.2rem 0.5rem'}}
                onClick={()=>{setFStatus('All');setFLocation('All');setFSource('All');setFWhatsApp('All');setFPriority('All');setFSize('All');setSearch('');setPage(0);}}>
                Clear all
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <div style={{fontSize:'9.5px',fontFamily:'var(--fm)',color:'var(--mist-2)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'0.375rem'}}>Status</div>
            <div className="pill-row">
              {['All',...LEAD_STATUSES].map(s=>(
                <button key={s} className={`pill ${fStatus===s?'active':''}`} onClick={()=>{setFStatus(s);setPage(0);}}>{s}</button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <div style={{fontSize:'9.5px',fontFamily:'var(--fm)',color:'var(--mist-2)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'0.375rem'}}>Location / Parish</div>
            <div className="pill-row">
              {['All',...leadLocations,...JAMAICAN_PARISHES.filter(p=>!leadLocations.includes(p))].slice(0,12).map(loc=>(
                <button key={loc} className={`pill ${fLocation===loc?'active':''}`} onClick={()=>{setFLocation(loc);setPage(0);}}>{loc}</button>
              ))}
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <div style={{fontSize:'9.5px',fontFamily:'var(--fm)',color:'var(--mist-2)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'0.375rem'}}>WhatsApp Number</div>
            <div className="pill-row">
              {['All','Yes','No'].map(w=>(
                <button key={w} className={`pill ${fWhatsApp===w?'active':''}`} onClick={()=>{setFWhatsApp(w);setPage(0);}}>{w==='Yes'?'✓ Has number':w==='No'?'✗ No number':'All'}</button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <div style={{fontSize:'9.5px',fontFamily:'var(--fm)',color:'var(--mist-2)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'0.375rem'}}>Source</div>
            <div className="pill-row">
              {['All','JAXON','Manual'].map(s=>(
                <button key={s} className={`pill ${fSource===s?'active':''}`} onClick={()=>{setFSource(s);setPage(0);}}>{s}</button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <div style={{fontSize:'9.5px',fontFamily:'var(--fm)',color:'var(--mist-2)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'0.375rem'}}>Priority</div>
            <div className="pill-row">
              {['All','high','medium','low'].map(p=>(
                <button key={p} className={`pill ${fPriority===p?'active':''}`} onClick={()=>{setFPriority(p);setPage(0);}}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
              ))}
            </div>
          </div>

          {/* Business Size */}
          <div>
            <div style={{fontSize:'9.5px',fontFamily:'var(--fm)',color:'var(--mist-2)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'0.375rem'}}>Business Size</div>
            <div className="pill-row">
              {['All','Small','Medium','Large'].map(s=>(
                <button key={s} className={`pill ${fSize===s?'active':''}`}
                  onClick={()=>{setFSize(s);setPage(0);}}>
                  {s==='Small'?'🏪 Small (1-10)':s==='Medium'?'🏢 Medium (10-50)':s==='Large'?'🏦 Large (50+)':'All Sizes'}
                </button>
              ))}
            </div>
          </div>

          {/* Dial queue button */}
          <button className="btn-primary" style={{width:'100%',justifyContent:'center',gap:'0.5rem'}}
            onClick={buildDialQueue}>
            <Icons.phone size={14}/>
            Build Dial Queue ({leads.filter(l=>l.phone).length} numbers found)
          </button>
        </div>
      )}

      {/* Dial Queue Modal */}
      {showDial && dialQueue.length > 0 && (
        <div className="modal-overlay" onClick={()=>setShowDial(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-head">
              <div>
                <div style={{fontWeight:800,fontSize:'15px'}}>📞 Dial Queue</div>
                <div style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)'}}>{dialIdx+1} of {dialQueue.length}</div>
              </div>
              <button className="icon-btn" onClick={()=>setShowDial(false)}><Icons.close size={15}/></button>
            </div>

            {/* Progress bar */}
            <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${((dialIdx+1)/dialQueue.length)*100}%`,background:'#1adb8a',borderRadius:'99px',transition:'width 0.4s'}}/>
            </div>

            {/* Current contact */}
            <div className="card" style={{textAlign:'center',padding:'1.5rem 1rem'}}>
              <div style={{fontSize:'28px',marginBottom:'0.5rem'}}>📞</div>
              <div style={{fontWeight:800,fontSize:'17px',marginBottom:'0.25rem'}}>{dialQueue[dialIdx].name}</div>
              <div style={{fontFamily:'var(--fm)',fontSize:'14px',color:'#1adb8a',marginBottom:'1rem'}}>{dialQueue[dialIdx].phone}</div>
              <div style={{display:'flex',gap:'0.5rem',justifyContent:'center',flexWrap:'wrap'}}>
                <a href={`tel:${dialQueue[dialIdx].phone}`}
                  className="btn-primary" style={{textDecoration:'none',gap:'0.5rem'}}>
                  <Icons.phone size={15}/> Call Now
                </a>
                <a href={`https://wa.me/${dialQueue[dialIdx].phone.replace(/\D/g,'')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="wa-btn" style={{padding:'0.5rem 1rem',borderRadius:'var(--r2)',fontSize:'13px'}}>
                  <Icons.whatsapp size={15}/> WhatsApp
                </a>
              </div>
            </div>

            {/* Draft message */}
            {dialQueue[dialIdx].draft && (
              <div className="draft-box">
                <div style={{fontFamily:'var(--fm)',fontSize:'9.5px',color:'#1adb8a',marginBottom:'4px'}}>SCRIPT / DRAFT</div>
                <div style={{fontSize:'12px',color:'var(--mist-1)',lineHeight:'1.6'}}>{dialQueue[dialIdx].draft}</div>
              </div>
            )}

            {/* Navigation */}
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button className="btn-ghost" style={{flex:1,justifyContent:'center'}}
                onClick={()=>setDialIdx(i=>Math.max(0,i-1))} disabled={dialIdx===0}>
                ← Prev
              </button>
              <button className="btn-ghost" style={{flex:1,justifyContent:'center',color:'#ff6040'}}
                onClick={()=>setDialIdx(i=>Math.min(dialQueue.length-1,i+1))}>
                Skip →
              </button>
              <button className="btn-primary" style={{flex:1,justifyContent:'center'}}
                onClick={()=>{
                  if(dialIdx < dialQueue.length-1) setDialIdx(i=>i+1);
                  else setShowDial(false);
                }}>
                {dialIdx < dialQueue.length-1 ? 'Next →' : '✓ Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {filtered.length === 0 ? <Empty text="No leads match your filters."/> : (
        <>
          <div className="list">
            {paged.map(l => {
              const payments = getPayments(l.id);
              const received = payments.reduce((s,p)=>s+(Number(p.amount)||0),0);
              const total    = Number(l.value)||0;
              const remaining = total - received;
              const pct = total>0 ? Math.min(100,(received/total)*100) : 0;
              const alert = getAlert(l);
              const isOpen = expanded===l.id;
              return (
                <div key={l.id} className="card lead-card fade-in">
                  <div className="lead-header" onClick={()=>setExpanded(isOpen?null:l.id)}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap',marginBottom:'2px'}}>
                        <span style={{fontWeight:700,fontSize:'14.5px',letterSpacing:'-0.02em'}}>{l.businessName}</span>
                        <span className="badge" style={{background:`${STATUS_COLOR[l.status]}18`,color:STATUS_COLOR[l.status],border:`1px solid ${STATUS_COLOR[l.status]}28`}}>{l.status}</span>
                        {l.source==='JAXON Agent' && <span className="badge badge-ai">🤖 AI</span>}
                        {l.priority==='high' && <span className="badge" style={{background:'rgba(239,68,68,0.1)',color:'#ff6040',border:'1px solid rgba(239,68,68,0.2)'}}>🔥 High</span>}
                        {alert?.isOverdue && <span className="badge badge-danger">⚠ Overdue</span>}
                      </div>
                      <div style={{fontSize:'11px',color:'var(--mist-2)',fontFamily:'var(--fm)',display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
                        {l.location && <span>📍 {l.location}</span>}
                        <span>{l.contactName||'No contact'}</span>
                        <span style={{color:l.phone?'#25d366':'var(--mist-3)'}}>{l.phone||'No number'}</span>
                      </div>
                      {total>0 && (
                        <div style={{marginTop:'5px',height:'2px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:remaining>0?'#f0c060':'#1adb8a',borderRadius:'99px',transition:'width 0.5s'}}/>
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.375rem',flexShrink:0}}>
                      <span style={{fontFamily:'var(--fm)',fontWeight:700,fontSize:'12px',color:STATUS_COLOR[l.status]}}>
                        {l.value ? `J$${Number(l.value).toLocaleString()}` : '—'}
                      </span>
                      <span style={{color:'var(--mist-2)',transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>
                        <Icons.chevDown size={14}/>
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="lead-drawer">
                      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap'}}>
                        <span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-1)'}}>👤 {l.contactName||'No contact'}</span>
                        {l.phone ? (
                          <div style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
                            <span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'#25d366'}}>📞 {l.phone}</span>
                            <a href={`https://wa.me/${l.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="wa-btn" onClick={e=>e.stopPropagation()}>
                              <Icons.whatsapp size={13}/> WhatsApp
                            </a>
                            <a href={`tel:${l.phone}`} className="wa-btn" style={{background:'rgba(201,168,76,0.1)',borderColor:'rgba(201,168,76,0.25)',color:'#1adb8a'}} onClick={e=>e.stopPropagation()}>
                              <Icons.phone size={13}/> Call
                            </a>
                          </div>
                        ) : (
                          <span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-3)'}}>📞 No number found</span>
                        )}
                      </div>
                      {l.location && <div style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-2)'}}>📍 {l.location} {l.country ? `· ${l.country}` : ''}</div>}
                      {l.websiteUrl && <div style={{fontFamily:'var(--fm)',fontSize:'11px'}}><a href={l.websiteUrl} target="_blank" rel="noopener noreferrer" style={{color:'#1adb8a'}}>{l.websiteUrl}</a></div>}
                      {l.notes && <div className="notes-box">{l.notes}</div>}
                      {total>0 && (
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                            <span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-2)'}}>J${received.toLocaleString()} received</span>
                            <span style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:700,color:remaining>0?'#f0c060':'#1adb8a'}}>
                              {remaining>0?`J$${remaining.toLocaleString()} due`:'✓ Fully paid'}
                            </span>
                          </div>
                          <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${pct}%`,background:remaining>0?'#f0c060':'#1adb8a',borderRadius:'99px'}}/>
                          </div>
                        </div>
                      )}
                      {payments.length>0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                          {payments.map(p=>(
                            <div key={p.id} style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                              <span style={{width:5,height:5,borderRadius:'50%',background:'#1adb8a',flexShrink:0,display:'inline-block'}}/>
                              <span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-2)'}}>{p.paymentStage} · J${Number(p.amount).toLocaleString()} · {p.date}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {l.outreachDraft && (
                        <div className="draft-box">
                          <div style={{fontFamily:'var(--fm)',fontSize:'9.5px',color:'#1adb8a',marginBottom:'4px',letterSpacing:'0.08em'}}>🤖 JAXON DRAFT</div>
                          <div style={{fontSize:'12px',color:'var(--mist-1)',lineHeight:'1.6'}}>{l.outreachDraft}</div>
                        </div>
                      )}
                      {alert && (
                        <div className={`retainer-tag ${alert.isOverdue?'overdue':''}`}>
                          <Icons.bell size={11}/>
                          {alert.isOverdue?`Retainer overdue ${Math.abs(alert.daysUntil)}d — J$${Number(l.retainerAmount).toLocaleString()}`
                            :alert.daysUntil===0?`Retainer due TODAY — J$${Number(l.retainerAmount).toLocaleString()}`
                            :`Retainer in ${alert.daysUntil}d — J$${Number(l.retainerAmount).toLocaleString()}`}
                        </div>
                      )}
                      <div style={{display:'flex',gap:'0.4rem',justifyContent:'flex-end'}}>
                        <button className="btn-ghost" style={{fontSize:'11px',padding:'0.3rem 0.6rem'}}
                          onClick={()=>{
                            const inv = {
                              clientName: l.businessName,
                              clientLocation: l.location||'Jamaica',
                              services:[{desc:'JCommerce Services',amount:Number(l.value)||45000}],
                              pipelineLeadId: l.id,
                            };
                            window._openInvoice && window._openInvoice(inv);
                          }}>
                          📄 Invoice
                        </button>
                        <button className="btn-ghost" style={{fontSize:'11px',padding:'0.3rem 0.6rem',borderColor:'rgba(0,212,255,0.25)',color:'var(--bolt)',background:'rgba(0,212,255,0.05)'}}
                          onClick={async ()=>{
                            const prompt = `LEAD ANALYSIS REQUEST\n\nBusiness: ${l.businessName}\nStatus: ${l.status}\nLocation: ${l.location||'Jamaica'}\nValue: J$${Number(l.value||0).toLocaleString()}\nPhone: ${l.phone||'Not found'}\nNotes: ${l.notes||'None'}\nLast action: ${l.nextAction||'None'} on ${l.nextActionDate||'N/A'}\nOutreach draft: ${l.outreachDraft||'None'}\n\nAs my business AI, analyse this lead and tell me:\n1. What is the best next move right now?\n2. What should I say to them?\n3. What is the probability of closing?\n4. Any red flags?`;
                            window._openJaxonChat && window._openJaxonChat(prompt);
                          }}>
                          ⚡ Ask JAXON
                        </button>
                        <button className="icon-btn mint-btn" onClick={()=>setPayForm(l)}><Icons.dollar size={13}/></button>
                        <button className="icon-btn" onClick={()=>setForm(l)}><Icons.edit size={13}/></button>
                        <button className="icon-btn danger-btn" onClick={()=>onDelete(l.id)}><Icons.trash size={13}/></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',paddingTop:'0.25rem'}}>
              <button className="icon-btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>
                ←
              </button>
              {Array.from({length:pageCount},(_,i)=>(
                <button key={i}
                  className={`pill ${page===i?'active':''}`}
                  style={{minWidth:32,justifyContent:'center'}}
                  onClick={()=>setPage(i)}>
                  {i+1}
                </button>
              ))}
              <button className="icon-btn" onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))} disabled={page===pageCount-1}>
                →
              </button>
            </div>
          )}
        </>
      )}

      {form!==null && <LeadModal data={form} onSave={d=>{d.id?onUpdate(d.id,d):onAdd(d);setForm(null);}} onClose={()=>setForm(null)}/>}
      {payForm!==null && <PaymentModal lead={payForm} existing={getPayments(payForm.id)} onLog={(s,a,d)=>onLogPayment(payForm,s,a,d)} onUpdateEntry={(s,a,d)=>onUpdatePayment(payForm,s,a,d)} onClose={()=>setPayForm(null)}/>}
    </div>
  );
}


// ─── LEAD MODAL ────────────────────────────────────────────────────────────────
function LeadModal({data,onSave,onClose}) {
  const [f,setF] = useState({
    businessName:'', contactName:'', phone:'', websiteUrl:'',
    location:'', country:'Jamaica', businessType:'Restaurant',
    businessSize:'Small', status:'New', value:'', retainerAmount:'',
    retainerDueDay:'', priority:'medium',
    notes:'', nextAction:'', nextActionDate:'',
    outreachDraft:'', ...data
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const BIZ_TYPES=['Restaurant','Retail','Pharmacy','School','Salon','Mechanic',
    'Wholesale','Real Estate','Bakery','Church','Hotel','Other'];
  return (
    <Modal title={data.id?'Edit Lead':'New Lead'} onClose={onClose}>
      <Field label="Business Name"><input className="input" value={f.businessName} onChange={e=>s('businessName',e.target.value)} placeholder="e.g. Kicks Jamaica"/></Field>
      <div className="grid-2">
        <Field label="Type">
          <select className="input" value={f.businessType} onChange={e=>s('businessType',e.target.value)}>
            {BIZ_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Size">
          <select className="input" value={f.businessSize||'Small'} onChange={e=>s('businessSize',e.target.value)}>
            <option>Small</option><option>Medium</option><option>Large</option>
          </select>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Contact Name"><input className="input" value={f.contactName} onChange={e=>s('contactName',e.target.value)}/></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={e=>s('phone',e.target.value)} placeholder="+1876..."/></Field>
      </div>
      <div className="grid-2">
        <Field label="Location"><input className="input" value={f.location} onChange={e=>s('location',e.target.value)} placeholder="Kingston"/></Field>
        <Field label="Country"><input className="input" value={f.country} onChange={e=>s('country',e.target.value)} placeholder="Jamaica"/></Field>
      </div>
      <Field label="Website"><input className="input" value={f.websiteUrl} onChange={e=>s('websiteUrl',e.target.value)} placeholder="https://..."/></Field>
      <div className="grid-2">
        <Field label="Status">
          <select className="input" value={f.status} onChange={e=>s('status',e.target.value)}>
            {LEAD_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={f.priority||'medium'} onChange={e=>s('priority',e.target.value)}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Setup Value (J$)"><input className="input" type="number" value={f.value} onChange={e=>s('value',e.target.value)} placeholder="45000"/></Field>
        <Field label="Retainer/mo (J$)"><input className="input" type="number" value={f.retainerAmount} onChange={e=>s('retainerAmount',e.target.value)} placeholder="15000"/></Field>
      </div>
      <Field label="Notes"><textarea className="input" style={{minHeight:'56px',resize:'vertical'}} value={f.notes} onChange={e=>s('notes',e.target.value)}/></Field>
      <div className="grid-2">
        <Field label="Next Action"><input className="input" value={f.nextAction} onChange={e=>s('nextAction',e.target.value)} placeholder="Follow up call"/></Field>
        <Field label="Date"><input className="input" type="date" value={f.nextActionDate} onChange={e=>s('nextActionDate',e.target.value)}/></Field>
      </div>
      <Field label="JAXON Draft Message"><textarea className="input" style={{minHeight:'56px',resize:'vertical'}} value={f.outreachDraft} onChange={e=>s('outreachDraft',e.target.value)} placeholder="WhatsApp outreach message..."/></Field>
      <ModalFoot onClose={onClose} onSave={()=>f.businessName.trim()&&onSave(f)}/>
    </Modal>
  );
}

// ─── PAYMENT MODAL ──────────────────────────────────────────────────────────────
function PaymentModal({lead,existing,onLog,onUpdateEntry,onClose}) {
  const [stage,setStage]=useState(PAYMENT_STAGES[0]);
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  return (
    <Modal title={`Log Payment — ${lead.businessName}`} onClose={onClose}>
      {existing.length>0&&(
        <div className="payment-log">
          <div className="card-label" style={{margin:0,marginBottom:'0.5rem'}}>Existing Payments</div>
          {existing.map(p=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'0.25rem 0',
              fontSize:'12px',borderBottom:'1px solid rgba(0,212,255,0.06)'}}>
              <span style={{fontFamily:'var(--fm)',color:'var(--mist-2)'}}>{p.paymentStage}</span>
              <span style={{fontFamily:'var(--fm)',color:'#1adb8a',fontWeight:600}}>J${Number(p.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <Field label="Payment Stage">
        <select className="input" value={stage} onChange={e=>setStage(e.target.value)}>
          {PAYMENT_STAGES.map(s=><option key={s}>{s}</option>)}
        </select>
      </Field>
      <div className="grid-2">
        <Field label="Amount (J$)"><input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="22500"/></Field>
        <Field label="Date"><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      </div>
      <button className="btn-primary" style={{width:'100%',justifyContent:'center'}}
        onClick={()=>{if(amount&&Number(amount)>0){onLog(stage,amount,date);onClose();}}}>
        Log Payment
      </button>
      <button className="btn-ghost" style={{width:'100%',justifyContent:'center'}} onClick={onClose}>Cancel</button>
    </Modal>
  );
}

// ─── HABITS ───────────────────────────────────────────────────────────────────
function Habits({habits,weekDates,todayStr,onAdd,onUpdate,onDelete,onToggle}) {
  const [form,setForm]     = useState(null);
  const [expanded,setExpanded] = useState(null);
  const weeks = getLast20Weeks();

  const streakFor = h => {
    let s = 0; const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const k = d.toISOString().slice(0,10);
      if (h.completions?.[k]) s++; else if (i>0) break;
    }
    return s;
  };

  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Daily Habits</div>
        <div className="hero-big filled">{habits.filter(h=>h.completions?.[todayStr]).length}/{habits.length}</div>
        <div className="hero-sub">Done today · +10 XP per habit · -10 XP if missed</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:700,fontSize:'15px'}}>Your Habits</span>
        <button className="btn-primary" onClick={()=>setForm({})}><Icons.plus size={14}/> Add</button>
      </div>
      {habits.length===0 ? <Empty text="No habits yet. Add your first one."/> : (
        <div className="list">
          {habits.map(h => {
            const streak = streakFor(h);
            const total  = Object.values(h.completions||{}).filter(Boolean).length;
            const isOpen = expanded===h.id;
            return (
              <div key={h.id} className="card habit-card fade-in">
                <div className="habit-head" onClick={()=>setExpanded(isOpen?null:h.id)}>
                  <button className="check-btn" onClick={e=>{e.stopPropagation();onToggle(h,todayStr);}} style={{color:h.completions?.[todayStr]?'#1adb8a':'var(--mist-3)',flexShrink:0}}>
                    {h.completions?.[todayStr] ? <Icons.check size={24}/> : <Icons.circle size={24}/>}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:'14.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:h.completions?.[todayStr]?'var(--mist-2)':'var(--mist-0)',textDecoration:h.completions?.[todayStr]?'line-through':'none'}}>{h.name}</div>
                    <div style={{display:'flex',gap:'0.75rem',marginTop:'2px'}}>
                      <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#f0c060'}}>🔥 {streak}</span>
                      <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)'}}>{total} done</span>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexShrink:0}}>
                    <button className="icon-btn" onClick={e=>{e.stopPropagation();setForm(h);}}><Icons.edit size={12}/></button>
                    <button className="icon-btn danger-btn" onClick={e=>{e.stopPropagation();onDelete(h.id);}}><Icons.trash size={12}/></button>
                    <span style={{color:'var(--mist-2)',transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}><Icons.chevDown size={14}/></span>
                  </div>
                </div>
                {isOpen && (
                  <div className="habit-body">
                    <div className="card-label" style={{marginBottom:'0.5rem'}}>20-Week History — tap to toggle past days</div>
                    <div style={{overflowX:'auto'}}>
                      <div style={{display:'flex',gap:'3px',minWidth:'max-content'}}>
                        {weeks.map((week,wi) => (
                          <div key={wi} style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                            {week.map(date => (
                              <div key={date}
                                className={`hcell small ${h.completions?.[date]?'lv4':'lv0'}${date===todayStr?' today':''}`}
                                onClick={()=>date<=todayStr&&onToggle(h,date)}
                                title={date}/>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card-label" style={{marginTop:'1rem',marginBottom:'0.5rem'}}>This Week</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'0.25rem'}}>
                      {weekDates.map((date,i) => (
                        <div key={date} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                          <span style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:700,color:date===todayStr?'#1adb8a':'var(--mist-2)'}}>{DAYS[i]}</span>
                          <button className="check-btn" onClick={()=>onToggle(h,date)} style={{color:h.completions?.[date]?'#1adb8a':'var(--mist-3)'}}>
                            {h.completions?.[date] ? <Icons.check size={19}/> : <Icons.circle size={19}/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {form!==null && (
        <Modal title={form.id?'Edit Habit':'New Habit'} onClose={()=>setForm(null)}>
          <Field label="Habit Name"><input className="input" defaultValue={form.name||''} id="hname" placeholder="e.g. Code 1hr, 10 cold messages"/></Field>
          <ModalFoot onClose={()=>setForm(null)} onSave={()=>{const n=document.getElementById('hname').value.trim();if(n){form.id?onUpdate(form.id,{name:n}):onAdd({name:n});setForm(null);}}}/>
        </Modal>
      )}
    </div>
  );
}

// ─── TODOS ────────────────────────────────────────────────────────────────────
function Todos({todos,todayStr,onAdd,onUpdate,onDelete,onToggle}) {
  const [form,setForm]       = useState(null);
  const [newTitle,setNewTitle] = useState('');
  const todayTasks  = todos.filter(t=>t.addedDate===todayStr);
  const olderTasks  = todos.filter(t=>t.addedDate!==todayStr);
  const doneCount   = todayTasks.filter(t=>t.doneOn?.[todayStr]).length;
  const taskCount   = todayTasks.length;
  const underMin    = taskCount < 5;
  const yesterday   = new Date(new Date(todayStr)-86400000).toISOString().slice(0,10);
  const missedYest  = todos.filter(t=>t.addedDate===yesterday&&!t.doneOn?.[yesterday]).length;
  const quickAdd    = () => { if(!newTitle.trim())return; onAdd({title:newTitle.trim(),note:''}); setNewTitle(''); };
  const sorted = [...todayTasks.filter(t=>!t.doneOn?.[todayStr]),...todayTasks.filter(t=>t.doneOn?.[todayStr])];

  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Daily Tasks</div>
        <div className="hero-big">{doneCount}/{taskCount}</div>
        <div className="hero-sub" style={{color:underMin?'#ff6040':'var(--mist-1)'}}>
          {underMin ? `Add ${5-taskCount} more — minimum 5 daily` : `${doneCount*5} XP earned · ${taskCount}/10 tasks`}
        </div>
      </div>

      <div className="xp-rules">
        {[{l:'+5 XP',d:'Per task done',c:'#1adb8a'},{l:'-10 XP',d:'Per missed task',c:'#ff6040'},{l:'Goal 10',d:'Tasks/day',c:'#7b6cf5'},{l:'Min 5',d:'Or -10 XP',c:'#f0c060'}].map(r => (
          <div key={r.l} style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
            <span style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:700,color:r.c,flexShrink:0}}>{r.l}</span>
            <span style={{fontSize:'11px',color:'var(--mist-2)'}}>{r.d}</span>
          </div>
        ))}
        {missedYest > 0 && <div style={{gridColumn:'1/-1',color:'#ff6040',fontFamily:'var(--fm)',fontSize:'11px'}}>⚠ {missedYest} missed yesterday = -{missedYest*10} XP</div>}
      </div>

      <div style={{display:'flex',gap:'0.5rem'}}>
        <input className="input" style={{flex:1}} value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&quickAdd()} placeholder="Add a task for today…"/>
        <button className="btn-primary icon-only" onClick={quickAdd}><Icons.plus size={16}/></button>
      </div>

      {taskCount > 0 && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
            <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)'}}>Today's progress</span>
            <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#7b6cf5'}}>{taskCount}/10 · {doneCount} done</span>
          </div>
          <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${Math.min(100,(taskCount/10)*100)}%`,background:'linear-gradient(90deg,var(--horizon),var(--mist-2))',borderRadius:'99px',transition:'width 0.4s'}}/>
          </div>
        </div>
      )}

      {sorted.length===0 ? <Empty text="No tasks yet. Add at least 5 to avoid XP penalty."/> : (
        <div className="list">
          {sorted.map(t => (
            <div key={t.id} className="card fade-in" style={{padding:'0.8rem 1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggle(t)} style={{color:t.doneOn?.[todayStr]?'#7b6cf5':'var(--mist-3)',flexShrink:0}}>
                  {t.doneOn?.[todayStr] ? <Icons.check size={24}/> : <Icons.circle size={24}/>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-0)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}><span className='' style={{color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-0)'}}>{t.title}</span></div>
                  {t.note && <div style={{fontSize:'11.5px',color:'var(--mist-2)',marginTop:'1px'}}>{t.note}</div>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexShrink:0}}>
                  {t.doneOn?.[todayStr] && <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#7b6cf5'}}>+5</span>}
                  <button className="icon-btn" onClick={()=>setForm(t)}><Icons.edit size={12}/></button>
                  <button className="icon-btn danger-btn" onClick={()=>onDelete(t.id)}><Icons.trash size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {olderTasks.length > 0 && (
        <>
          <div className="card-label" style={{marginTop:'0.25rem'}}>Recurring / Older</div>
          <div className="list">
            {olderTasks.map(t => (
              <div key={t.id} className="card fade-in" style={{padding:'0.75rem 1rem',opacity:0.7}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                  <button className="check-btn" onClick={()=>onToggle(t)} style={{color:t.doneOn?.[todayStr]?'#7b6cf5':'var(--mist-3)',flexShrink:0}}>
                    {t.doneOn?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                  </button>
                  <span style={{flex:1,minWidth:0,fontSize:'13.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-1)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}>{t.title}</span>
                  <button className="icon-btn danger-btn" onClick={()=>onDelete(t.id)}><Icons.trash size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {form!==null && (
        <Modal title="Edit Task" onClose={()=>setForm(null)}>
          <Field label="Task"><input className="input" defaultValue={form.title||''} id="ttitle"/></Field>
          <Field label="Note"><input className="input" defaultValue={form.note||''} id="tnote"/></Field>
          <ModalFoot onClose={()=>setForm(null)} onSave={()=>{const t=document.getElementById('ttitle').value.trim();const n=document.getElementById('tnote').value.trim();if(t){onUpdate(form.id,{title:t,note:n});setForm(null);}}}/>
        </Modal>
      )}
    </div>
  );
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
function Schedule({schedule,onAdd,onUpdate,onDelete}) {
  const [form,setForm]       = useState(null);
  const [viewMode,setViewMode] = useState('pills'); // 'pills' | 'grid'
  const [weekOffset,setWeekOffset] = useState(0);   // 0=this week, -1=last, +1=next
  const today = new Date();
  const [sel,setSel] = useState(DAYS[today.getDay()===0?6:today.getDay()-1]);

  // Week label
  const weekLabel = weekOffset===0 ? 'This Week'
    : weekOffset===-1 ? 'Last Week'
    : weekOffset===1  ? 'Next Week'
    : weekOffset < 0  ? `${Math.abs(weekOffset)} Weeks Ago`
    : `${weekOffset} Weeks Ahead`;

  const todayDayName = DAYS[today.getDay()===0?6:today.getDay()-1];

  const blocks = schedule.filter(s=>s.day===sel).sort((a,b)=>(a.start||'').localeCompare(b.start||''));

  // For grid — hours 6am–10pm
  const HOURS = Array.from({length:17},(_,i)=>i+6); // 6..22

  const timeToMin = t => { if(!t)return 0; const [h,m]=(t||'00:00').split(':').map(Number); return h*60+m; };

  const dayBlocks = day => schedule.filter(s=>s.day===day).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));

  // Clash detection
  const findClashes = (day) => {
    const db = dayBlocks(day);
    const clashes = new Set();
    for(let i=0;i<db.length;i++) {
      for(let j=i+1;j<db.length;j++) {
        const aS=timeToMin(db[i].start),aE=timeToMin(db[i].end);
        const bS=timeToMin(db[j].start),bE=timeToMin(db[j].end);
        if(aS<bE&&bS<aE){ clashes.add(db[i].id); clashes.add(db[j].id); }
      }
    }
    return clashes;
  };

  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Weekly Schedule</div>
        <div className="hero-big">Plan Your Time</div>
        <div className="hero-sub">Structure creates freedom</div>
      </div>

      {/* Week nav + view toggle */}
      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
        <button className="icon-btn" onClick={()=>setWeekOffset(w=>w-1)}>←</button>
        <div style={{flex:1,textAlign:'center',fontFamily:'var(--fm)',fontSize:'10px',
          fontWeight:400,color:weekOffset===0?'var(--bolt)':'var(--mist-2)',
          letterSpacing:'0.1em',textTransform:'uppercase'}}>
          {weekLabel}
        </div>
        <button className="icon-btn" onClick={()=>setWeekOffset(w=>w+1)}>→</button>
        <button className="icon-btn" onClick={()=>setWeekOffset(0)}
          style={{fontSize:'9px',fontFamily:'var(--fm)',width:36}}>NOW</button>
        <div style={{display:'flex',background:'rgba(0,24,36,0.6)',
          border:'1px solid rgba(0,212,255,0.08)',borderRadius:6,padding:2,gap:2}}>
          {['pills','grid'].map(v=>(
            <button key={v} onClick={()=>setViewMode(v)}
              style={{
                padding:'0.3rem 0.5rem',border:'none',borderRadius:4,cursor:'pointer',
                fontFamily:'var(--fm)',fontSize:'9px',letterSpacing:'0.06em',
                background:viewMode===v?'rgba(0,136,200,0.15)':'none',
                color:viewMode===v?'var(--bolt-lt)':'var(--mist-3)',
              }}>
              {v==='pills'?'LIST':'GRID'}
            </button>
          ))}
        </div>
        <button className="btn-primary icon-only" onClick={()=>setForm({day:sel})}><Icons.plus size={14}/></button>
      </div>

      {/* DAY PILLS — shown in both views */}
      <div className="pill-row">
        {DAYS.map(d => (
          <button key={d}
            className={`pill ${sel===d?'active':''}`}
            onClick={()=>setSel(d)}
            style={d===todayDayName&&weekOffset===0?{borderColor:'rgba(240,192,96,0.4)',color:'var(--horizon)'}:{}}>
            {d}
          </button>
        ))}
      </div>

      {/* ─── PILLS VIEW ───────────────────────────────────── */}
      {viewMode==='pills' && (
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:600,color:'var(--mist-0)'}}>{sel}</span>
            {weekOffset!==0 && (
              <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-3)',
                letterSpacing:'0.08em',textTransform:'uppercase'}}>
                {weekLabel}
              </span>
            )}
          </div>
          {blocks.length===0 ? <Empty text={`Nothing on ${sel}${weekOffset!==0?` — ${weekLabel}`:''}.`}/> : (
            <div className="list">
              {blocks.map(b => {
                const clashes = findClashes(b.day);
                return (
                  <div key={b.id} className="card fade-in"
                    style={{borderLeft:`3px solid ${clashes.has(b.id)?'#ff6040':BLOCK_COLORS[b.type]||'#3a4860'}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'0.375rem',marginBottom:2}}>
                          <div style={{fontWeight:500,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</div>
                          {clashes.has(b.id) && (
                            <span style={{fontFamily:'var(--fm)',fontSize:'8px',color:'#ff6040',
                              border:'1px solid rgba(255,96,64,0.3)',borderRadius:3,padding:'0 4px',flexShrink:0}}>
                              CLASH
                            </span>
                          )}
                        </div>
                        <div style={{fontFamily:'var(--fm)',fontSize:'11px',
                          color:BLOCK_COLORS[b.type]||'var(--mist-2)',marginTop:2,fontWeight:300}}>
                          {b.start} – {b.end} · {b.type}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                        <button className="icon-btn" onClick={()=>setForm(b)}><Icons.edit size={12}/></button>
                        <button className="icon-btn danger-btn" onClick={()=>onDelete(b.id)}><Icons.trash size={12}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── GRID / TIMETABLE VIEW ─────────────────────────── */}
      {viewMode==='grid' && (() => {
        const gridH = 640;
        const timeToMin = t => { if(!t)return 0; const [h,m]=(t||'00:00').split(':').map(Number); return h*60+m; };
        const startMin = 6*60; const endMin = 22*60; const totalMins = endMin-startMin;
        const topPct = t => ((timeToMin(t)-startMin)/totalMins)*gridH;
        const heightPct = (s,e) => ((timeToMin(e)-timeToMin(s))/totalMins)*gridH;
        const HOURS_G = Array.from({length:17},(_,i)=>i+6);
        const findClashesAll = () => {
          const clashes = new Set();
          DAYS.forEach(d => {
            const db = schedule.filter(b=>b.day===d).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
            for(let i=0;i<db.length;i++) for(let j=i+1;j<db.length;j++) {
              if(timeToMin(db[i].start)<timeToMin(db[j].end)&&timeToMin(db[j].start)<timeToMin(db[i].end)) {
                clashes.add(db[i].id); clashes.add(db[j].id);
              }
            }
          });
          return clashes;
        };
        const allClashes = findClashesAll();
        return (
          <div className="card" style={{padding:'0.75rem 0.5rem',overflowX:'auto'}}>
            <div style={{minWidth:520,userSelect:'none'}}>
              {/* Day headers */}
              <div style={{display:'grid',gridTemplateColumns:'40px repeat(7,1fr)',gap:1,marginBottom:4}}>
                <div/>
                {DAYS.map(d=>(
                  <div key={d} style={{fontFamily:'var(--fm)',fontSize:'8.5px',letterSpacing:'0.12em',
                    textTransform:'uppercase',textAlign:'center',padding:'0.375rem 0',
                    color:d===todayDayName&&weekOffset===0?'var(--bolt-lt)':'var(--mist-3)',
                    borderBottom:`1px solid ${d===todayDayName&&weekOffset===0?'rgba(0,212,255,0.4)':'rgba(255,255,255,0.04)'}`,
                  }}>{d}</div>
                ))}
              </div>
              {/* Grid body */}
              <div style={{display:'grid',gridTemplateColumns:'40px repeat(7,1fr)',gap:1}}>
                {/* Time column */}
                <div style={{position:'relative',height:gridH}}>
                  {HOURS_G.map(h=>(
                    <div key={h} style={{
                      position:'absolute',top:`${((h-6)/16)*gridH}px`,
                      right:4,fontFamily:'var(--fm)',fontSize:'8px',
                      color:'var(--mist-4)',lineHeight:1,transform:'translateY(-50%)',
                    }}>{h.toString().padStart(2,'0')}</div>
                  ))}
                  {/* Hour lines */}
                  {HOURS_G.map(h=>(
                    <div key={`l${h}`} style={{
                      position:'absolute',top:`${((h-6)/16)*gridH}px`,
                      left:0,right:0,height:1,
                      background:'rgba(0,212,255,0.04)',
                    }}/>
                  ))}
                </div>
                {/* Day columns */}
                {DAYS.map(d=>{
                  const dayB = schedule.filter(b=>b.day===d);
                  return (
                    <div key={d} style={{
                      position:'relative',height:gridH,
                      background:d===todayDayName&&weekOffset===0?'rgba(0,212,255,0.015)':'transparent',
                      borderLeft:'1px solid rgba(255,255,255,0.03)',
                      cursor:'pointer',
                    }}
                    onClick={e=>{
                      const rect=e.currentTarget.getBoundingClientRect();
                      const clickY=e.clientY-rect.top;
                      const mins=Math.floor((clickY/gridH)*totalMins/30)*30+startMin;
                      const hh=Math.floor(mins/60).toString().padStart(2,'0');
                      const mm=(mins%60).toString().padStart(2,'0');
                      const eh=Math.floor((mins+60)/60).toString().padStart(2,'0');
                      const em=((mins+60)%60).toString().padStart(2,'0');
                      setSel(d); setForm({day:d,start:`${hh}:${mm}`,end:`${eh}:${em}`});
                    }}>
                      {/* Hour gridlines */}
                      {HOURS_G.map(h=>(
                        <div key={h} style={{
                          position:'absolute',top:`${((h-6)/16)*gridH}px`,
                          left:0,right:0,height:1,
                          background:h%2===0?'rgba(0,212,255,0.05)':'rgba(255,255,255,0.02)',
                        }}/>
                      ))}
                      {/* Blocks */}
                      {dayB.map(b=>{
                        const t=topPct(b.start);
                        const h=Math.max(18,heightPct(b.start,b.end));
                        const c=allClashes.has(b.id)?'#ff6040':BLOCK_COLORS[b.type]||'#3a4860';
                        return (
                          <div key={b.id}
                            onClick={e=>{e.stopPropagation();setForm(b);}}
                            style={{
                              position:'absolute',top:`${t}px`,left:2,right:2,
                              height:`${h}px`,minHeight:18,
                              background:`${c}20`,
                              border:`1px solid ${c}60`,borderLeft:`3px solid ${c}`,
                              borderRadius:4,overflow:'hidden',cursor:'pointer',zIndex:2,
                              boxShadow:`0 0 8px ${c}20`,
                              transition:'all 0.15s',
                            }}>
                            <div style={{
                              fontFamily:'var(--fm)',fontSize:'8px',fontWeight:500,
                              color:c,padding:'3px 4px',lineHeight:1.3,
                              overflow:'hidden',textShadow:`0 0 6px ${c}80`,
                            }}>
                              {b.title}
                              {h>28&&<span style={{display:'block',opacity:0.7,fontSize:'7px'}}>{b.start}–{b.end}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-4)',
                marginTop:'0.5rem',textAlign:'center',letterSpacing:'0.08em'}}>
                TAP ANY SLOT TO ADD · TAP BLOCK TO EDIT · RED = CLASH
              </div>
            </div>
          </div>
        );
      })()}

      {form!==null && <SchedModal data={form} onSave={d=>{d.id?onUpdate(d.id,d):onAdd(d);setForm(null);}} onClose={()=>setForm(null)}/>}
    </div>
  );
}

function SchedModal({data,onSave,onClose}) {
  const [f,setF] = useState({day:'Mon',start:'09:00',end:'10:00',title:'',type:'Work',...data});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <Modal title={data.id?'Edit Block':'New Block'} onClose={onClose}>
      <Field label="Title"><input className="input" value={f.title} onChange={e=>s('title',e.target.value)} placeholder="e.g. Client work, Gym"/></Field>
      <div className="grid-2">
        <Field label="Day"><select className="input" value={f.day} onChange={e=>s('day',e.target.value)}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></Field>
        <Field label="Type"><select className="input" value={f.type} onChange={e=>s('type',e.target.value)}>{Object.keys(BLOCK_COLORS).map(t=><option key={t}>{t}</option>)}</select></Field>
      </div>
      <div className="grid-2">
        <Field label="Start"><input className="input" type="time" value={f.start} onChange={e=>s('start',e.target.value)}/></Field>
        <Field label="End"><input className="input" type="time" value={f.end} onChange={e=>s('end',e.target.value)}/></Field>
      </div>
      <ModalFoot onClose={onClose} onSave={()=>f.title.trim()&&onSave(f)}/>
    </Modal>
  );
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────
function Finance({finances,leads,totalIncome,totalExpenses,profit,xp,level,onAdd,onUpdate,onDelete}) {
  const [filter,setFilter]     = useState('all');
  const [report,setReport]     = useState('overview');
  const [form,setForm]         = useState(null);
  const [meterOpen,setMeterOpen] = useState(false);
  const [projMonths,setProjMonths] = useState(6);
  const [finPage,setFinPage] = useState(0);
  const [investAdvice,setInvestAdvice] = useState(null);
  const [investLoading,setInvestLoading] = useState(false);
  const FIN_PER_PAGE = 8;
  const filtered = filter==='all' ? finances : finances.filter(f=>f.type===filter);
  const finPageCount = Math.ceil(filtered.length / FIN_PER_PAGE);
  const finPaged = filtered.slice(finPage*FIN_PER_PAGE,(finPage+1)*FIN_PER_PAGE);
  const mrr = leads.filter(l=>l.status==='Paid'&&l.retainerAmount).reduce((s,l)=>s+(Number(l.retainerAmount)||0),0);
  const emotionIdx = calcEmotionLevel(finances,leads,xp,level);
  const emotion = EMOTION_LEVELS[emotionIdx];
  const minTarget = level * 5000;

  const monthly = useMemo(()=>{
    const map={};
    finances.forEach(f=>{const d=f.date?f.date.slice(0,7):new Date().toISOString().slice(0,7);if(!map[d])map[d]={month:d,income:0,expenses:0,profit:0};if(f.type==='income')map[d].income+=Number(f.amount)||0;else map[d].expenses+=Number(f.amount)||0;});
    Object.values(map).forEach(m=>{m.profit=m.income-m.expenses;});
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month));
  },[finances]);

  const proj = useMemo(()=>{
    const today=new Date(); const recent=monthly.slice(-3);
    const ai=recent.length>0?recent.reduce((s,m)=>s+m.income,0)/recent.length:0;
    const ae=recent.length>0?recent.reduce((s,m)=>s+m.expenses,0)/recent.length:0;
    return Array.from({length:projMonths},(_,i)=>{const d=new Date(today.getFullYear(),today.getMonth()+i+1,1);const p=ai+mrr;return{month:d.toISOString().slice(0,7),projected:Math.round(p),expenses:Math.round(ae),profit:Math.round(p-ae),minimum:minTarget};});
  },[monthly,mrr,minTarget,projMonths]);

  const cats = useMemo(()=>{
    const map={};finances.filter(f=>f.type==='income').forEach(f=>{const c=f.category||'Other';map[c]=(map[c]||0)+(Number(f.amount)||0);});
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[finances]);

  const tt={background:'#0f172a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',color:'#e2e8f0',fontSize:'11px'};

  return (
    <div className="section">
      {/* EMOTION METER — hollow neon SVG face */}
      {(() => {
        const svgStr = EMOTION_SVG[emotion.svgKey]?.(emotion.color) || '';
        return (
          <div style={{
            position:'relative', overflow:'hidden',
            background:`linear-gradient(160deg, rgba(4,8,15,0.95), ${emotion.color}08)`,
            border:`1px solid ${emotion.color}25`,
            borderRadius:14, cursor:'pointer',
            backdropFilter:'blur(12px)',
          }} onClick={()=>setMeterOpen(!meterOpen)}>
            {/* Top scan line */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,
              background:`linear-gradient(90deg,transparent,${emotion.color},transparent)`,
              opacity:0.7}}/>

            <div style={{padding:'1rem 1.125rem',position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                {/* Hollow SVG face — neon glow */}
                <div style={{
                  width:64, height:64, flexShrink:0,
                  filter:`drop-shadow(0 0 8px ${emotion.color}) drop-shadow(0 0 16px ${emotion.color}60)`,
                  animation:'float 3s ease-in-out infinite',
                }} dangerouslySetInnerHTML={{__html:svgStr}}/>

                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:'var(--fm)',fontSize:'7.5px',fontWeight:300,
                    letterSpacing:'0.3em',textTransform:'uppercase',
                    color:emotion.color,opacity:0.7,marginBottom:4}}>
                    Business Health
                  </div>
                  <div style={{fontFamily:'var(--fe)',fontSize:'24px',fontWeight:600,
                    color:emotion.color,lineHeight:1,marginBottom:4,
                    textShadow:`0 0 20px ${emotion.color}80`}}>
                    {emotion.label}
                  </div>
                  <div style={{fontFamily:'var(--fm)',fontSize:'10px',fontWeight:300,
                    color:'var(--mist-2)',letterSpacing:'0.04em'}}>
                    {emotion.desc}
                  </div>
                </div>

                {/* Signal bars */}
                <div style={{display:'flex',alignItems:'flex-end',gap:3,flexShrink:0,height:36}}>
                  {EMOTION_LEVELS.map((e,i) => {
                    const active = i <= (4 - emotionIdx);
                    const h = 8 + i * 7;
                    return (
                      <div key={i} style={{
                        width:5, height:h,
                        borderRadius:2,
                        background:active ? e.color : 'rgba(255,255,255,0.07)',
                        boxShadow:active ? `0 0 6px ${e.color}80` : 'none',
                        transition:'all 0.4s ease',
                        alignSelf:'flex-end',
                      }}/>
                    );
                  })}
                </div>
              </div>

              {/* Mini metric strip */}
              <div style={{display:'flex',gap:'0.75rem',marginTop:'0.75rem',
                paddingTop:'0.625rem',borderTop:`1px solid ${emotion.color}15`,
                flexWrap:'wrap'}}>
                {[
                  {l:'Profit',  v:`J$${profit.toLocaleString()}`,          c:profit>=0?'var(--bolt)':'#ff3030'},
                  {l:'MRR',     v:`J$${mrr.toLocaleString()}/mo`,          c:'var(--bolt-lt)'},
                  {l:'Clients', v:paidLeads.length,                         c:'var(--horizon)'},
                  {l:'Pipeline',v:openLeads.length,                         c:'var(--mist-2)'},
                ].map(m=>(
                  <div key={m.l}>
                    <div style={{fontFamily:'var(--fm)',fontSize:'7px',color:'var(--mist-3)',
                      letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:2}}>{m.l}</div>
                    <div style={{fontFamily:'var(--fe)',fontSize:'14px',fontWeight:600,
                      color:m.c,lineHeight:1,textShadow:`0 0 8px ${m.c}60`}}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {meterOpen && (
              <div style={{borderTop:`1px solid ${emotion.color}15`,
                padding:'0.875rem 1.125rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {/* MRR progress */}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-3)',letterSpacing:'0.1em'}}>
                      MRR vs Level Target
                    </span>
                    <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:emotion.color}}>
                      {minTarget>0?Math.round((mrr/minTarget)*100):0}%
                    </span>
                  </div>
                  <div style={{height:'3px',background:'rgba(0,212,255,0.07)',borderRadius:99,overflow:'hidden',position:'relative'}}>
                    <div style={{
                      position:'absolute',inset:0,
                      background:'repeating-linear-gradient(90deg,rgba(0,212,255,0.05) 0,rgba(0,212,255,0.05) 8px,transparent 8px,transparent 16px)',
                    }}/>
                    <div style={{height:'100%',width:`${Math.min(100,minTarget>0?(mrr/minTarget)*100:0)}%`,
                      background:`linear-gradient(90deg,var(--bolt-2),${emotion.color})`,
                      borderRadius:99,boxShadow:`0 0 8px ${emotion.color}80`,transition:'width 0.8s'}}/>
                  </div>
                  <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-4)',marginTop:4}}>
                    J${mrr.toLocaleString()} of J${minTarget.toLocaleString()} target
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid-2">
        <StatCard label="Net Profit"    value={`J$${profit.toLocaleString()}`}    icon={Icons.trend}   color={profit>=0?'#1adb8a':'#ff6040'} />
        <StatCard label="Paid Clients"  value={paidLeads.length}                    icon={Icons.users}   color="var(--horizon)" />
        <StatCard label="Open Pipeline" value={openLeads.length}                    icon={Icons.target}  color="var(--horizon)" />
        <StatCard label="Habits Today"  value={`${habitsToday}%`}                   icon={Icons.flame}   color="var(--horizon)" />
      </div>

      {/* Today habits quick */}
      {habits.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Today's Habits</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {habits.map(h => (
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggleHabit(h,todayStr)} style={{color:h.completions?.[todayStr]?'#1adb8a':'var(--mist-3)',flexShrink:0}}>
                  {h.completions?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                </button>
                <span style={{flex:1,minWidth:0,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:h.completions?.[todayStr]?'var(--mist-2)':'var(--mist-0)',textDecoration:h.completions?.[todayStr]?'line-through':'none'}}>{h.name}</span>
                {h.completions?.[todayStr] && <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#1adb8a',flexShrink:0}}>+10</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today tasks quick */}
      {todayTodos.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Tasks · {todayDone.length}/{todayTodos.length}</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {todayTodos.map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggleTodo(t)} style={{color:t.doneOn?.[todayStr]?'#7b6cf5':'var(--mist-3)',flexShrink:0}}>
                  {t.doneOn?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                </button>
                <span style={{flex:1,minWidth:0,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-0)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}><span className='' style={{color:t.doneOn?.[todayStr]?'var(--mist-2)':'var(--mist-0)'}}>{t.title}</span></span>
                {t.doneOn?.[todayStr] && <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#7b6cf5',flexShrink:0}}>+5</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="card fade-in">
        <div className="card-label">Consistency — 20 Weeks</div>
        <div style={{overflowX:'auto'}}>
          <div style={{display:'flex',gap:'3px',minWidth:'max-content'}}>
            {weeks.map((week,wi) => (
              <div key={wi} style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                {week.map(date => {
                  const e = habitHeatmap.find(h=>h.date===date);
                  return <div key={date} className={`hcell lv${e?.lv||0}${date===todayStr?' today':''}`} title={date}/>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0,1,2,3,4].map(l => <div key={l} className={`hcell lv${l}`}/>)}
          <span>More</span>
        </div>
      </div>

      {/* Pipeline chart */}
      {leads.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Pipeline</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={LEAD_STATUSES.map(s=>({name:s,count:leads.filter(l=>l.status===s).length})).filter(d=>d.count>0)} margin={{left:0,right:0,top:4,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="name" tick={{fill:'#4a5568',fontSize:9}}/>
              <YAxis tick={{fill:'#4a5568',fontSize:9}} allowDecimals={false} width={22}/>
              <Tooltip contentStyle={{background:'#0f172a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#e2e8f0',fontSize:'11px'}}/>
              <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
// ─── INVEST ADVISOR ────────────────────────────────────────────────────────────
function InvestAdvisor({profit,mrr,totalIncome,totalExpenses,level,paidClients,openLeads,finances,advice,loading,onFetch}) {
  const cashAvailable = Math.max(0, profit);
  const monthlyBurn   = totalExpenses;
  const runway        = monthlyBurn > 0 ? Math.floor(cashAvailable / monthlyBurn) : 99;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
      <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(160deg,rgba(0,24,36,0.95),rgba(0,61,92,0.3))',border:'1px solid rgba(0,212,255,0.15)',borderRadius:14,padding:'1.25rem'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,var(--bolt),transparent)'}}/>
        <div style={{fontFamily:'var(--fm)',fontSize:'8px',color:'var(--bolt)',letterSpacing:'0.3em',textTransform:'uppercase',marginBottom:'0.5rem',opacity:0.7}}>Financial Position</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
          {[{l:'Available Cash',v:`J$${cashAvailable.toLocaleString()}`,c:'var(--bolt)'},{l:'Monthly Burn',v:`J$${monthlyBurn.toLocaleString()}`,c:'#ff6040'},{l:'MRR',v:`J$${mrr.toLocaleString()}/mo`,c:'var(--bolt-lt)'},{l:'Runway',v:runway>=99?'Stable':`${runway}mo`,c:runway<3?'#ff6040':'var(--bolt)'}].map(s=>(
            <div key={s.l} style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'0.625rem 0.75rem',border:'1px solid rgba(0,212,255,0.06)'}}>
              <div style={{fontFamily:'var(--fm)',fontSize:'7.5px',color:'var(--mist-3)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:4}}>{s.l}</div>
              <div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:s.c,lineHeight:1}}>{s.v}</div>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{width:'100%',justifyContent:'center',opacity:loading?0.7:1}} onClick={onFetch} disabled={loading}>
          {loading?'JAXON analysing...':'⚡ Get Smart Reinvestment Advice'}
        </button>
      </div>
      {advice && (<>
        <div className="card fade-in" style={{borderLeft:'3px solid var(--bolt)'}}>
          <div className="card-label">JAXON Assessment</div>
          <div style={{fontSize:'13.5px',fontWeight:400,color:'var(--mist-0)',lineHeight:1.75,fontFamily:'var(--fe)'}}>{advice.summary}</div>
        </div>
        {advice.opportunities?.map((opp,i)=>(
          <div key={i} className="card fade-in" style={{borderLeft:`3px solid ${opp.risk==='Low'?'var(--bolt)':opp.risk==='Medium'?'rgba(0,212,255,0.5)':'#ff6040'}`,background:'rgba(0,24,36,0.85)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.625rem'}}>
              <div style={{fontFamily:'var(--fe)',fontSize:'17px',fontWeight:600,color:'var(--mist-0)',lineHeight:1.1}}>{opp.name}</div>
              <span style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:600,padding:'0.15rem 0.5rem',borderRadius:99,textTransform:'uppercase',background:opp.risk==='Low'?'rgba(0,212,255,0.1)':'rgba(255,96,64,0.1)',color:opp.risk==='Low'?'var(--bolt)':'#ff6040',border:`1px solid ${opp.risk==='Low'?'rgba(0,212,255,0.3)':'rgba(255,96,64,0.3)'}`,flexShrink:0,marginLeft:'0.5rem'}}>{opp.risk} Risk</span>
            </div>
            <div style={{fontSize:'12.5px',fontWeight:300,color:'var(--mist-1)',lineHeight:1.65,marginBottom:'0.75rem'}}>{opp.description}</div>
            {opp.firstStep&&<div style={{fontFamily:'var(--fm)',fontSize:'10.5px',color:'var(--bolt)',background:'rgba(0,95,138,0.1)',border:'1px solid rgba(0,136,200,0.15)',borderRadius:6,padding:'0.5rem 0.75rem'}}>→ {opp.firstStep}</div>}
          </div>
        ))}
        {advice.warning&&<div style={{background:'rgba(255,96,64,0.07)',border:'1px solid rgba(255,96,64,0.2)',borderLeft:'3px solid #ff6040',borderRadius:'0 8px 8px 0',padding:'0.875rem',fontSize:'12.5px',fontWeight:300,color:'var(--mist-1)',lineHeight:1.65}}><span style={{fontFamily:'var(--fm)',fontSize:'8px',color:'#ff6040',letterSpacing:'0.15em',textTransform:'uppercase',display:'block',marginBottom:4}}>⚠ Warning</span>{advice.warning}</div>}
      </>)}
    </div>
  );
}

// ─── FINANCE MODAL ──────────────────────────────────────────────────────────────
function FinanceModal({data,onSave,onClose}) {
  const [f,setF]=useState({type:'income',description:'',amount:'',category:INCOME_CATS[0],date:localDateStr(),...data});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const cats = f.type==='income'?INCOME_CATS:EXPENSE_CATS;
  return (
    <Modal title={data.id?'Edit Transaction':'New Transaction'} onClose={onClose}>
      <div className="tab-row">
        {['income','expense'].map(t=><button key={t} className={`tab-btn ${f.type===t?'active':''}`} onClick={()=>s('type',t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
      </div>
      <Field label="Description"><input className="input" value={f.description} onChange={e=>s('description',e.target.value)} placeholder="e.g. D&D Wholesale payment"/></Field>
      <div className="grid-2">
        <Field label="Amount (J$)"><input className="input" type="number" value={f.amount} onChange={e=>s('amount',e.target.value)} placeholder="22500"/></Field>
        <Field label="Date"><input className="input" type="date" value={f.date} onChange={e=>s('date',e.target.value)}/></Field>
      </div>
      <Field label="Category">
        <select className="input" value={f.category} onChange={e=>s('category',e.target.value)}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </Field>
      <ModalFoot onClose={onClose} onSave={()=>f.description.trim()&&Number(f.amount)>0&&onSave(f)}/>
    </Modal>
  );
}

// ─── GOALS ──────────────────────────────────────────────────────────────────────
function Goals({goals,onAdd,onUpdate,onDelete,onGoalComplete}) {
  const [form,setForm]=useState(null);
  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Goals</div>
        <div className="hero-big">Level Up</div>
        <div className="hero-sub">{goals.filter(g=>Number(g.current)>=Number(g.target)).length} of {goals.length} complete</div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button className="btn-primary" onClick={()=>setForm({})}><Icons.plus size={14}/> Goal</button>
      </div>
      {goals.length===0?<Empty text="No goals yet. What are you working toward?"/>:(
        <div className="list">
          {goals.map(g=>{
            const pct=g.target>0?Math.min(100,(Number(g.current)/Number(g.target))*100):0;
            const lvl=Math.floor(pct/5);
            return (
              <div key={g.id} className="card fade-in">
                <div className="goal-header">
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:4}}>
                      <div style={{fontFamily:'var(--fe)',fontSize:'15px',fontWeight:600,color:'var(--mist-0)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.title}</div>
                      {g.category&&<span className="badge" style={{background:'rgba(0,212,255,0.08)',color:'var(--bolt)',border:'1px solid rgba(0,212,255,0.2)',flexShrink:0}}>{g.category}</span>}
                    </div>
                    <div className="goal-level-label">
                      <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)'}}>J${Number(g.current||0).toLocaleString()} / J${Number(g.target||0).toLocaleString()}</span>
                      <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--bolt)'}}>Level {Math.min(20,lvl)}/20</span>
                    </div>
                    <div className="level-blocks">
                      {Array.from({length:20},(_,i)=>(
                        <div key={i} className={`level-block ${i<lvl?'filled':''} ${i===lvl&&pct<100?'current':''}`}/>
                      ))}
                    </div>
                    <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-3)',marginTop:3}}>{Math.round(pct)}% complete</div>
                  </div>
                  <div style={{display:'flex',gap:'0.35rem',flexShrink:0,alignItems:'flex-start',marginTop:2}}>
                    {pct<100?(
                      <button className="icon-btn mint-btn" title="Mark complete (+100 XP)" onClick={()=>{onUpdate(g.id,{...g,current:g.target});onGoalComplete&&onGoalComplete(g);}}>✓</button>
                    ):(
                      <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'#1adb8a',padding:'0.2rem 0.5rem',border:'1px solid rgba(26,219,138,0.3)',borderRadius:4,background:'rgba(26,219,138,0.07)'}}>DONE</span>
                    )}
                    <button className="icon-btn" onClick={()=>setForm(g)}><Icons.edit size={12}/></button>
                    <button className="icon-btn danger-btn" onClick={()=>onDelete(g.id)}><Icons.trash size={12}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {form!==null&&<GoalModal data={form} onSave={d=>{d.id?onUpdate(d.id,d):onAdd(d);setForm(null);}} onClose={()=>setForm(null)}/>}
    </div>
  );
}

function GoalModal({data,onSave,onClose}) {
  const [f,setF]=useState({title:'',category:GOAL_CATS[0],target:'',current:'0',...data});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <Modal title={data.id?'Edit Goal':'New Goal'} onClose={onClose}>
      <Field label="Goal Title"><input className="input" value={f.title} onChange={e=>s('title',e.target.value)} placeholder="e.g. Reach J$500k revenue"/></Field>
      <div className="grid-2">
        <Field label="Category">
          <select className="input" value={f.category} onChange={e=>s('category',e.target.value)}>
            {GOAL_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Target (J$)"><input className="input" type="number" value={f.target} onChange={e=>s('target',e.target.value)} placeholder="500000"/></Field>
      </div>
      <Field label="Current Progress (J$)"><input className="input" type="number" value={f.current} onChange={e=>s('current',e.target.value)} placeholder="0"/></Field>
      <ModalFoot onClose={onClose} onSave={()=>f.title.trim()&&onSave(f)}/>
    </Modal>
  );
}

// ─── CLIENT MANAGEMENT ────────────────────────────────────────────────────────
function ClientManagement({leads,finances,onUpdateLead}) {
  const paidClients=leads.filter(l=>l.status==='Paid');
  const [sel,setSel]=useState(paidClients[0]?.id||null);
  const [editProduct,setEditProduct]=useState(false);
  const client=paidClients.find(c=>c.id===sel);
  const clientFinances=finances.filter(f=>f.pipelineLeadId===sel);
  const totalReceived=clientFinances.reduce((s,f)=>s+(Number(f.amount)||0),0);
  if(paidClients.length===0) return(
    <div className="section">
      <div className="hero"><div className="hero-eye">Client Management</div><div className="hero-big">No Clients Yet</div><div className="hero-sub">Paid clients appear here for full product management.</div></div>
    </div>
  );
  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Client Management</div>
        <div className="hero-big" style={{fontSize:'26px'}}>{client?.businessName||'Select Client'}</div>
        <div className="hero-sub">{paidClients.length} active client{paidClients.length!==1?'s':''}</div>
      </div>
      {paidClients.length>1&&<div className="pill-row">{paidClients.map(c=><button key={c.id} className={`pill ${sel===c.id?'active':''}`} onClick={()=>setSel(c.id)}>{c.businessName}</button>)}</div>}
      {client&&(<>
        <div className="grid-2">
          {[{l:'Monthly Retainer',v:`J$${Number(client.retainerAmount||0).toLocaleString()}/mo`,c:'var(--bolt)'},{l:'Total Received',v:`J$${totalReceived.toLocaleString()}`,c:'#1adb8a'},{l:'Setup Value',v:`J$${Number(client.value||0).toLocaleString()}`,c:'var(--horizon)'},{l:'Balance',v:`J$${Math.max(0,Number(client.value||0)-totalReceived).toLocaleString()} due`,c:totalReceived>=Number(client.value||0)?'#1adb8a':'#ff6040'}].map(s=>(<div key={s.l} className="stat-card"><div className="stat-label">{s.l}</div><div className="stat-value" style={{color:s.c,fontSize:'18px'}}>{s.v}</div></div>))}
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.875rem'}}>
            <div className="card-label" style={{margin:0}}>Product Built</div>
            <button className="icon-btn" onClick={()=>setEditProduct(true)}><Icons.edit size={12}/></button>
          </div>
          {client.product?(<div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            <div><div style={{fontFamily:'var(--fm)',fontSize:'8px',color:'var(--bolt)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:4}}>Product Type</div><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:'var(--mist-0)'}}>{client.product.type||'—'}</div></div>
            {client.product.description&&<div style={{fontSize:'13px',color:'var(--mist-1)',lineHeight:1.6,fontWeight:300}}>{client.product.description}</div>}
          </div>):<div style={{fontSize:'13px',color:'var(--mist-3)',fontStyle:'italic'}}>No product details yet. Tap edit to add.</div>}
        </div>
        {client.product?.techStack&&(<div className="card">
          <div className="card-label">Tech Stack & Links</div>
          {[{l:'Framework',v:client.product.techStack.framework},{l:'Hosting',v:client.product.techStack.hosting},{l:'Database',v:client.product.techStack.database},{l:'APIs',v:client.product.techStack.apis},{l:'Live URL',v:client.product.techStack.liveUrl,link:true},{l:'GitHub Repo',v:client.product.techStack.repoUrl,link:true},{l:'Admin Panel',v:client.product.techStack.adminUrl,link:true}].filter(r=>r.v).map(row=>(<div key={row.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid rgba(0,212,255,0.05)'}}>
            <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-3)',letterSpacing:'0.1em',textTransform:'uppercase',flexShrink:0,marginRight:'1rem'}}>{row.l}</span>
            {row.link?<a href={row.v} target="_blank" rel="noopener noreferrer" style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--bolt)',textDecoration:'none',wordBreak:'break-all',textAlign:'right'}}>{row.v}</a>:<span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-1)',textAlign:'right'}}>{row.v}</span>}
          </div>))}
        </div>)}
        {client.product?.platforms?.length>0&&(<div className="card"><div className="card-label">Online Platforms</div><div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>{client.product.platforms.map((p,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.08)',borderRadius:6,padding:'0.625rem 0.875rem'}}><div><div style={{fontSize:'13px',fontWeight:500,color:'var(--mist-0)'}}>{p.name}</div><div style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-3)',marginTop:2}}>{p.role}</div></div>{p.url&&<a href={p.url} target="_blank" rel="noopener noreferrer" style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--bolt)',textDecoration:'none'}}>Open ↗</a>}</div>))}</div></div>)}
        {client.product?.monthlyCosts?.length>0&&(<div className="card"><div className="card-label">Monthly Running Costs</div>{client.product.monthlyCosts.map((c,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><span style={{fontSize:'13px',color:'var(--mist-1)'}}>{c.name}</span><span style={{fontFamily:'var(--fm)',fontSize:'12px',color:'#ff6040',fontWeight:500}}>{c.currency==='USD'?'$':'J$'}{Number(c.amount).toLocaleString()}/mo</span></div>))}<div style={{display:'flex',justifyContent:'space-between',marginTop:'0.625rem',paddingTop:'0.5rem',borderTop:'1px solid rgba(0,212,255,0.1)'}}><span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-3)',letterSpacing:'0.15em',textTransform:'uppercase'}}>Total Monthly</span><span style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:'#ff6040'}}>J${client.product.monthlyCosts.reduce((s,c)=>s+(Number(c.amount)||0),0).toLocaleString()}/mo</span></div></div>)}
        {client.product?.credentials?.length>0&&(<div className="card"><div className="card-label">Credentials & Access</div><div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>{client.product.credentials.map((c,i)=>(<div key={i} style={{background:'rgba(0,24,36,0.7)',border:'1px solid rgba(0,212,255,0.1)',borderLeft:'2px solid var(--bolt-3)',borderRadius:6,padding:'0.625rem 0.875rem'}}><div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--bolt)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{c.service}</div><div style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--mist-1)',lineHeight:1.6}}>{c.details}</div></div>))}</div></div>)}
        <div className="card"><div className="card-label">Payment History</div>{clientFinances.length===0?<div style={{fontSize:'13px',color:'var(--mist-3)',fontStyle:'italic'}}>No payments logged.</div>:clientFinances.map(f=>(<div key={f.id} style={{display:'flex',justifyContent:'space-between',padding:'0.5rem 0',borderBottom:'1px solid rgba(0,212,255,0.05)'}}><div><div style={{fontSize:'13px',color:'var(--mist-1)'}}>{f.paymentStage||f.description}</div><div style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-3)',marginTop:1}}>{f.date}</div></div><div style={{fontFamily:'var(--fm)',fontSize:'13px',fontWeight:600,color:'#1adb8a'}}>+J${Number(f.amount).toLocaleString()}</div></div>))}</div>
      </>)}
      {editProduct&&client&&<ProductModal client={client} onSave={d=>{onUpdateLead(client.id,{...client,product:d});setEditProduct(false);}} onClose={()=>setEditProduct(false)}/>}
    </div>
  );
}

function ProductModal({client,onSave,onClose}) {
  const p0=client.product||{};
  const [type,setType]=useState(p0.type||'WhatsApp AI Chatbot');
  const [desc,setDesc]=useState(p0.description||'');
  const [stack,setStack]=useState(p0.techStack||{framework:'',hosting:'Render',database:'Firebase',apis:'',liveUrl:'',repoUrl:'',adminUrl:''});
  const [platforms,setPlatforms]=useState(p0.platforms||[]);
  const [costs,setCosts]=useState(p0.monthlyCosts||[]);
  const [creds,setCreds]=useState(p0.credentials||[]);
  const ss=(k,v)=>setStack(s=>({...s,[k]:v}));
  const TYPES=['WhatsApp AI Chatbot','Business Website','Online Ordering System','Admin Dashboard','Delivery Tracker','E-commerce Store','Other'];
  return (
    <Modal title={`Product — ${client.businessName}`} onClose={onClose}>
      <Field label="Product Type"><select className="input" value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
      <Field label="Description"><textarea className="input" style={{minHeight:'60px',resize:'vertical'}} value={desc} onChange={e=>setDesc(e.target.value)}/></Field>
      <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--bolt)',letterSpacing:'0.2em',textTransform:'uppercase'}}>Tech Stack</div>
      <div className="grid-2">
        <Field label="Framework"><input className="input" value={stack.framework} onChange={e=>ss('framework',e.target.value)} placeholder="Node.js, React..."/></Field>
        <Field label="Hosting"><input className="input" value={stack.hosting} onChange={e=>ss('hosting',e.target.value)} placeholder="Render, Vercel..."/></Field>
        <Field label="Database"><input className="input" value={stack.database} onChange={e=>ss('database',e.target.value)} placeholder="Firebase..."/></Field>
        <Field label="APIs"><input className="input" value={stack.apis} onChange={e=>ss('apis',e.target.value)} placeholder="Claude AI, Twilio..."/></Field>
      </div>
      <Field label="Live URL"><input className="input" value={stack.liveUrl} onChange={e=>ss('liveUrl',e.target.value)} placeholder="https://..."/></Field>
      <Field label="GitHub Repo"><input className="input" value={stack.repoUrl} onChange={e=>ss('repoUrl',e.target.value)} placeholder="https://github.com/..."/></Field>
      <Field label="Admin URL"><input className="input" value={stack.adminUrl} onChange={e=>ss('adminUrl',e.target.value)} placeholder="https://..."/></Field>
      <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--bolt)',letterSpacing:'0.2em',textTransform:'uppercase'}}>Platforms</div>
      {platforms.map((p,i)=>(<div key={i} style={{display:'flex',gap:'0.375rem',alignItems:'flex-start'}}><div style={{flex:1,display:'flex',flexDirection:'column',gap:'0.375rem'}}><input className="input" style={{fontSize:'12px'}} value={p.name} onChange={e=>{const n=[...platforms];n[i]={...n[i],name:e.target.value};setPlatforms(n);}} placeholder="Platform name"/><input className="input" style={{fontSize:'12px'}} value={p.role} onChange={e=>{const n=[...platforms];n[i]={...n[i],role:e.target.value};setPlatforms(n);}} placeholder="Role"/><input className="input" style={{fontSize:'12px'}} value={p.url||''} onChange={e=>{const n=[...platforms];n[i]={...n[i],url:e.target.value};setPlatforms(n);}} placeholder="URL (optional)"/></div><button className="icon-btn danger-btn" style={{flexShrink:0,marginTop:4}} onClick={()=>setPlatforms(p=>p.filter((_,j)=>j!==i))}><Icons.trash size={11}/></button></div>))}
      <button className="btn-ghost" style={{justifyContent:'center'}} onClick={()=>setPlatforms(p=>[...p,{name:'',role:'',url:''}])}><Icons.plus size={13}/> Add Platform</button>
      <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--bolt)',letterSpacing:'0.2em',textTransform:'uppercase'}}>Monthly Costs</div>
      {costs.map((c,i)=>(<div key={i} style={{display:'flex',gap:'0.375rem',alignItems:'center'}}><input className="input" style={{flex:2,fontSize:'12px'}} value={c.name} onChange={e=>{const n=[...costs];n[i]={...n[i],name:e.target.value};setCosts(n);}} placeholder="Service"/><input className="input" style={{flex:1,fontSize:'12px'}} type="number" value={c.amount} onChange={e=>{const n=[...costs];n[i]={...n[i],amount:e.target.value};setCosts(n);}} placeholder="Amount"/><select className="input" style={{flex:1,fontSize:'12px'}} value={c.currency||'USD'} onChange={e=>{const n=[...costs];n[i]={...n[i],currency:e.target.value};setCosts(n);}}><option>USD</option><option>JMD</option></select><button className="icon-btn danger-btn" onClick={()=>setCosts(c=>c.filter((_,j)=>j!==i))}><Icons.trash size={11}/></button></div>))}
      <button className="btn-ghost" style={{justifyContent:'center'}} onClick={()=>setCosts(c=>[...c,{name:'',amount:'',currency:'USD'}])}><Icons.plus size={13}/> Add Cost</button>
      <div style={{fontFamily:'var(--fm)',fontSize:'9px',color:'var(--bolt)',letterSpacing:'0.2em',textTransform:'uppercase'}}>Credentials</div>
      {creds.map((c,i)=>(<div key={i} style={{display:'flex',gap:'0.375rem',alignItems:'flex-start'}}><div style={{flex:1,display:'flex',flexDirection:'column',gap:'0.375rem'}}><input className="input" style={{fontSize:'12px'}} value={c.service} onChange={e=>{const n=[...creds];n[i]={...n[i],service:e.target.value};setCreds(n);}} placeholder="Service name"/><textarea className="input" style={{fontSize:'12px',minHeight:'48px',resize:'vertical'}} value={c.details} onChange={e=>{const n=[...creds];n[i]={...n[i],details:e.target.value};setCreds(n);}} placeholder="Login details, API keys..."/></div><button className="icon-btn danger-btn" style={{flexShrink:0,marginTop:4}} onClick={()=>setCreds(c=>c.filter((_,j)=>j!==i))}><Icons.trash size={11}/></button></div>))}
      <button className="btn-ghost" style={{justifyContent:'center'}} onClick={()=>setCreds(c=>[...c,{service:'',details:''}])}><Icons.plus size={13}/> Add Credential</button>
      <ModalFoot onClose={onClose} onSave={()=>onSave({type,description:desc,techStack:stack,platforms,monthlyCosts:costs,credentials:creds})}/>
    </Modal>
  );
}

// ─── JAXON DASHBOARD ──────────────────────────────────────────────────────────
function JaxonDashboard({queue,logs,briefings,todayStr,onApprove,onReject}) {
  const [tab,setTab]=useState('queue');
  const pending=queue.filter(q=>q.status==='pending').sort((a,b)=>({high:0,medium:1,low:2}[a.priority]||1)-({high:0,medium:1,low:2}[b.priority]||1));
  const approved=queue.filter(q=>q.status==='approved');
  const executed=queue.filter(q=>q.status==='executed');
  const todayBriefing=briefings.find(b=>b.date===todayStr);
  const latestLog=logs[0];
  const AL={ADD_LEAD:'Add Lead',UPDATE_LEAD:'Update Lead',MARK_LEAD_DEAD:'Mark Dead',ADD_FINANCE_ENTRY:'Log Transaction',ADD_TODO:'Add Task'};
  const PS={high:{color:'#ff6040',border:'rgba(255,96,64,0.3)',bg:'rgba(255,96,64,0.07)'},medium:{color:'#f0c060',border:'rgba(240,192,96,0.3)',bg:'rgba(240,192,96,0.07)'},low:{color:'#3a4860',border:'rgba(58,72,96,0.3)',bg:'rgba(58,72,96,0.07)'}};
  return (
    <div className="section">
      <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(160deg,rgba(0,24,36,0.95),rgba(0,61,92,0.3),rgba(26,16,53,0.4) 100%)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:14,padding:'1.5rem 1.25rem'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,136,200,0.5),rgba(0,212,255,0.8),rgba(64,232,255,0.4),transparent)'}}/>
        <div style={{fontFamily:'var(--fm)',fontSize:'8px',color:'var(--bolt)',letterSpacing:'0.3em',textTransform:'uppercase',marginBottom:'0.5rem',opacity:0.7}}>JAXON Intelligence</div>
        <div style={{fontFamily:'var(--fe)',fontSize:'32px',fontWeight:600,letterSpacing:'-0.01em',lineHeight:1.05,marginBottom:'0.5rem',color:'var(--bolt-white)',textShadow:'0 0 30px rgba(0,212,255,0.3)'}}>Second Brain</div>
        <div style={{display:'flex',gap:'1.25rem',flexWrap:'wrap'}}>
          {[{label:'Pending',value:pending.length,color:'var(--bolt)',glow:'rgba(0,212,255,0.5)'},{label:'Approved',value:approved.length,color:'var(--valley)',glow:'rgba(26,219,138,0.4)'},{label:'Executed',value:executed.length,color:'var(--steel)',glow:'rgba(68,136,204,0.4)'}].map(s=>(<div key={s.label}><div style={{fontFamily:'var(--fe)',fontSize:'26px',fontWeight:700,color:s.color,lineHeight:1,textShadow:`0 0 16px ${s.glow}`}}>{s.value}</div><div style={{fontFamily:'var(--fm)',fontSize:'8px',letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--mist-3)',marginTop:2}}>{s.label}</div></div>))}
        </div>
      </div>
      {todayBriefing&&(<div className="fade-in" style={{position:'relative',overflow:'hidden',background:'linear-gradient(135deg,rgba(0,95,138,0.12),rgba(0,24,36,0.8))',border:'1px solid rgba(0,170,238,0.2)',borderLeft:'3px solid var(--bolt)',borderRadius:10,padding:'1.125rem'}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.625rem'}}><div style={{width:6,height:6,borderRadius:'50%',background:'var(--bolt)',boxShadow:'0 0 8px rgba(0,212,255,0.8)',animation:'blink 1.5s ease-in-out infinite'}}/><span style={{fontFamily:'var(--fm)',fontSize:'8px',letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--bolt-lt)',opacity:0.8}}>Morning Briefing — {todayStr}</span></div><div style={{fontSize:'13px',lineHeight:'1.75',color:'var(--mist-1)',whiteSpace:'pre-line',fontWeight:300}}>{todayBriefing.content}</div></div>)}
      <div style={{display:'flex',gap:'2px',background:'rgba(0,24,36,0.6)',border:'1px solid rgba(0,212,255,0.08)',borderRadius:8,padding:3}}>
        {[{id:'queue',label:'Queue',count:pending.length},{id:'approved',label:'Approved',count:approved.length},{id:'log',label:'Log',count:null},{id:'research',label:'Research',count:null}].map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'0.4rem 0.5rem',border:'none',background:tab===t.id?'rgba(0,136,200,0.15)':'none',borderRadius:5,cursor:'pointer',fontFamily:'var(--fs)',fontSize:'11.5px',fontWeight:400,color:tab===t.id?'var(--bolt-lt)':'var(--mist-3)',transition:'all 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.375rem'}}>{t.label}{t.count!==null&&<span style={{fontFamily:'var(--fm)',fontSize:'9px',background:t.count>0&&tab===t.id?'rgba(0,212,255,0.2)':'rgba(255,255,255,0.06)',color:t.count>0&&tab===t.id?'var(--bolt)':'var(--mist-3)',borderRadius:99,padding:'0.1rem 0.45rem',border:t.count>0&&tab===t.id?'1px solid rgba(0,212,255,0.3)':'1px solid transparent'}}>{t.count}</span>}</button>))}
      </div>
      {tab==='queue'&&(pending.length===0?(<div style={{textAlign:'center',padding:'3rem 1.5rem',background:'rgba(0,24,36,0.5)',border:'1px solid rgba(0,212,255,0.06)',borderRadius:14}}><div style={{fontSize:'32px',marginBottom:'0.75rem',filter:'drop-shadow(0 0 12px rgba(0,212,255,0.4))'}}>⚡</div><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:'var(--bolt-lt)',marginBottom:'0.375rem'}}>Clear horizon</div><div style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:300,color:'var(--mist-3)',letterSpacing:'0.06em'}}>JAXON is scanning for opportunities</div></div>):(
        <div className="list">{pending.map(item=>{const ps=PS[item.priority]||PS.low;return(<div key={item.id} className="fade-in" style={{background:'rgba(7,13,24,0.85)',border:'1px solid rgba(0,212,255,0.08)',borderLeft:`3px solid ${ps.color}`,borderRadius:12,padding:'1rem',backdropFilter:'blur(8px)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.625rem'}}><div style={{fontFamily:'var(--fm)',fontSize:'9.5px',fontWeight:500,color:'var(--bolt-lt)',letterSpacing:'0.08em'}}>{AL[item.action]||item.action}</div><div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,color:ps.color,background:ps.bg,border:`1px solid ${ps.border}`,borderRadius:99,padding:'0.15rem 0.5rem',textTransform:'uppercase',letterSpacing:'0.08em'}}>{item.priority}</div></div>{item.data?.businessName&&<div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,letterSpacing:'0.01em',marginBottom:'0.375rem',color:'var(--mist-0)'}}>{item.data.businessName}</div>}<div style={{fontSize:'12.5px',fontWeight:300,color:'var(--mist-2)',lineHeight:1.65,marginBottom:'0.75rem'}}><span style={{fontFamily:'var(--fm)',fontSize:'8.5px',color:'var(--bolt)',opacity:0.7,letterSpacing:'0.1em',marginRight:'0.5rem'}}>JAXON</span>{item.reasoning}</div>{item.data?.outreachDraft&&<div style={{background:'rgba(0,95,138,0.1)',borderLeft:'2px solid rgba(0,136,200,0.4)',borderRadius:'0 6px 6px 0',padding:'0.625rem 0.75rem',marginBottom:'0.75rem'}}><div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,color:'var(--bolt-4)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:6,opacity:0.8}}>Draft Message</div><div style={{fontSize:'12px',fontWeight:300,color:'var(--mist-1)',lineHeight:1.6}}>{item.data.outreachDraft}</div></div>}<div style={{display:'flex',gap:'0.5rem'}}><button style={{flex:1,padding:'0.55rem',border:'1.5px solid var(--bolt-3)',background:'rgba(0,95,138,0.15)',borderRadius:6,cursor:'pointer',fontFamily:'var(--fs)',fontSize:'12.5px',fontWeight:600,color:'var(--bolt-lt)'}} onClick={()=>onApprove(item.id)}>✓ Approve</button><button style={{flex:1,padding:'0.55rem',border:'1px solid rgba(255,96,64,0.2)',background:'rgba(255,96,64,0.05)',borderRadius:6,cursor:'pointer',fontFamily:'var(--fs)',fontSize:'12.5px',fontWeight:400,color:'#ff6040'}} onClick={()=>onReject(item.id)}>✕ Reject</button></div></div>);})}</div>
      ))}
      {tab==='approved'&&(<div className="list">{approved.length===0?<div style={{textAlign:'center',padding:'2.5rem 1rem'}}><div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:400,color:'var(--mist-3)',fontStyle:'italic'}}>Nothing approved yet</div></div>:approved.map(item=>(<div key={item.id} className="fade-in" style={{background:'rgba(0,95,138,0.07)',border:'1px solid rgba(0,136,200,0.15)',borderRadius:10,padding:'0.875rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}><div style={{width:8,height:8,borderRadius:'50%',background:'#1adb8a',boxShadow:'0 0 8px rgba(26,219,138,0.6)',flexShrink:0}}/><div><div style={{fontFamily:'var(--fm)',fontSize:'8.5px',fontWeight:300,color:'#1adb8a',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>Approved — executes next run</div><div style={{fontSize:'13.5px',fontWeight:400,color:'var(--mist-1)'}}>{AL[item.action]} — {item.data?.businessName||item.action}</div></div></div>))}</div>)}
      {tab==='log'&&(!latestLog?<div style={{textAlign:'center',padding:'3rem 1rem'}}><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:400,fontStyle:'italic',color:'var(--mist-3)'}}>First log at midnight</div></div>:(<div className="fade-in" style={{background:'rgba(0,24,36,0.7)',border:'1px solid rgba(0,136,200,0.15)',borderTop:'2px solid var(--bolt-3)',borderRadius:12,padding:'1.125rem'}}><div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:600,color:'var(--bolt-lt)',marginBottom:'0.875rem'}}>Daily Log — {latestLog.date}</div>{latestLog.stats&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',marginBottom:'1rem'}}>{[{l:'Queued',v:latestLog.stats.actionsQueued,c:'var(--bolt)',g:'rgba(0,212,255,0.5)'},{l:'Approved',v:latestLog.stats.approved,c:'#1adb8a',g:'rgba(26,219,138,0.5)'},{l:'Rejected',v:latestLog.stats.rejected,c:'#ff6040',g:'rgba(255,96,64,0.5)'}].map(s=>(<div key={s.l} style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'0.625rem',textAlign:'center',border:'1px solid rgba(0,212,255,0.06)'}}><div style={{fontFamily:'var(--fe)',fontSize:'24px',fontWeight:700,color:s.c,lineHeight:1,textShadow:`0 0 14px ${s.g}`}}>{s.v}</div><div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,color:'var(--mist-3)',letterSpacing:'0.15em',textTransform:'uppercase',marginTop:3}}>{s.l}</div></div>))}</div>}<div style={{fontSize:'13px',fontWeight:300,lineHeight:1.8,color:'var(--mist-1)',whiteSpace:'pre-line'}}>{latestLog.content}</div></div>))}
      {tab==='research'&&<ResearchLauncher/>}
    </div>
  );
}

function ResearchLauncher() {
  const [topic,setTopic]=useState('');
  const [goal,setGoal]=useState('');
  const [hours,setHours]=useState(24);
  const [launched,setLaunched]=useState(false);
  const [loading,setLoading]=useState(false);
  const launch=async()=>{
    if(!topic.trim())return;
    setLoading(true);
    try{
      const endTime=new Date(Date.now()+hours*3600000);
      const res=await fetch('https://jaxon-rctv.onrender.com/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,goal,hours,endTime:endTime.toISOString()})});
      if(res.ok)setLaunched(true);
    }catch(e){console.error(e);}
    setLoading(false);
  };
  if(launched)return(<div style={{textAlign:'center',padding:'1rem'}}><div style={{fontSize:'24px',marginBottom:'0.5rem',filter:'drop-shadow(0 0 10px rgba(0,212,255,0.6))'}}>⚡</div><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:'var(--bolt-lt)',marginBottom:'0.375rem'}}>Research Active</div><div style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-3)',letterSpacing:'0.08em'}}>JAXON hunting every hour for {hours}h</div></div>);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:'0.875rem',background:'linear-gradient(135deg,rgba(0,24,36,0.95),rgba(26,16,53,0.4))',border:'1px solid rgba(0,212,255,0.15)',borderRadius:14,padding:'1.125rem'}}>
      <div style={{fontFamily:'var(--fe)',fontSize:'22px',fontWeight:600,color:'var(--mist-0)',marginBottom:'0.25rem'}}>Intelligence Hunter</div>
      <Field label="Research Topic"><input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. WhatsApp Business adoption among Jamaican restaurants"/></Field>
      <Field label="Research Goal"><textarea className="input" style={{minHeight:'52px',resize:'vertical'}} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="What specific intelligence do we need?"/></Field>
      <div>
        <label style={{fontFamily:'var(--fm)',fontSize:'8.5px',color:'var(--mist-3)',letterSpacing:'0.15em',textTransform:'uppercase',display:'block',marginBottom:6}}>Research Period</label>
        <div style={{display:'flex',gap:'0.375rem'}}>{[6,12,24,48,72].map(h=>(<button key={h} className={`pill ${hours===h?'active':''}`} style={{padding:'0.28rem 0.6rem'}} onClick={()=>setHours(h)}>{h}h</button>))}</div>
      </div>
      <button className="btn-primary" style={{justifyContent:'center',opacity:loading?0.7:1}} onClick={launch} disabled={loading||!topic.trim()}>{loading?'Launching...':'⚡ Launch Research'}</button>
    </div>
  );
}

// ─── JAXON FLOATING CHAT ──────────────────────────────────────────────────────
function JaxonFloat({leads,habits,finances,goals,todos,schedule,totalIncome,totalExpenses,profit,xp,level,todayStr,paidLeads,openLeads}) {
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const quickPrompts=['What should I focus on today?','Which lead should I call first?','How is my business doing?','Draft a WhatsApp message for my hottest lead'];

  useEffect(()=>{
    window._openJaxonChat=(msg)=>{setOpen(true);setTimeout(()=>setInput(msg),100);};
    return()=>{delete window._openJaxonChat;};
  },[]);

  useEffect(()=>{
    if(open&&bottomRef.current)bottomRef.current.scrollIntoView({behavior:'smooth'});
  },[messages,open]);

  const send=async(text)=>{
    const msg=text||input.trim();
    if(!msg||loading)return;
    setInput('');
    setMessages(m=>[...m,{role:'user',content:msg}]);
    setLoading(true);
    try{
      const res=await fetch('https://jaxon-rctv.onrender.com/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...messages,{role:'user',content:msg}]})});
      const d=await res.json();
      setMessages(m=>[...m,{role:'assistant',content:d.reply||'Sorry, I had trouble responding.'}]);
    }catch(e){setMessages(m=>[...m,{role:'assistant',content:'Connection error. Is JAXON online?'}]);}
    setLoading(false);
  };

  return(<>
    <button className={`fab ${open?'fab-open':''}`} onClick={()=>setOpen(o=>!o)} style={{color:open?'var(--mist-2)':'var(--bolt)'}}>
      {open?<Icons.close size={20}/>:<Icons.bolt size={20}/>}
      {!open&&messages.length===0&&<div className="fab-pip"/>}
    </button>
    {open&&(
      <div className="chat-panel">
        <div className="chat-head">
          <div className="chat-avatar"><Icons.bolt size={14}/></div>
          <div><div className="chat-name">JAXON</div><div className="chat-status"><div className="chat-dot"/><span>AI Business Agent</span></div></div>
          <button style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--mist-3)'}} onClick={()=>setOpen(false)}><Icons.close size={15}/></button>
        </div>
        <div className="chat-msgs">
          {messages.length===0&&(<div style={{padding:'1rem 0'}}><div style={{fontFamily:'var(--fe)',fontSize:'15px',color:'var(--bolt-lt)',marginBottom:'0.5rem'}}>How can I help?</div><div style={{fontSize:'12px',fontWeight:300,color:'var(--mist-2)',lineHeight:1.6}}>Ask me anything about your business, leads, finances or strategy.</div></div>)}
          {messages.map((m,i)=>(<div key={i} className={`chat-msg ${m.role}`}>{m.role==='assistant'&&<div className="chat-msg-av"><Icons.bolt size={9}/></div>}<div className={`chat-bubble ${m.role}`}>{m.content}</div></div>))}
          {loading&&<div className="chat-msg assistant"><div className="chat-msg-av"><Icons.bolt size={9}/></div><div className="chat-bubble assistant"><div className="chat-typing"><span/><span/><span/></div></div></div>}
          <div ref={bottomRef}/>
        </div>
        {messages.length===0&&(<div className="chat-quick">{quickPrompts.map((p,i)=>(<button key={i} className="quick-btn" onClick={()=>send(p)}>{p}</button>))}</div>)}
        <div className="chat-input-row">
          <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Ask JAXON..." disabled={loading}/>
          <button className="chat-send" onClick={()=>send()} disabled={loading||!input.trim()}><Icons.send size={14}/></button>
        </div>
      </div>
    )}
  </>);
}

// ─── INVOICE GENERATOR ────────────────────────────────────────────────────────
function InvoiceGenerator({leads,finances,onClose,initialData=null}) {
  const nextNum=()=>{const ex=finances.filter(f=>f.invoiceNumber).map(f=>parseInt(f.invoiceNumber?.replace(/\D/g,'')||0));const mx=ex.length>0?Math.max(...ex):1;return `INV-2026-${String(mx+1).padStart(3,'0')}`;};
  const [inv,setInv]=useState({invoiceNumber:nextNum(),date:localDateStr(),dueDate:'',status:'PAYMENT DUE',clientName:initialData?.clientName||'',clientLocation:initialData?.clientLocation||'Kingston, Jamaica',services:initialData?.services||[{desc:'',amount:''}],notes:'',paymentMethod:'Bank Transfer: Name: Jadan Spencer, Acc#: 504813584, Bank: NCB Perth Mandeville',...initialData});
  const s=(k,v)=>setInv(p=>({...p,[k]:v}));
  const total=inv.services.reduce((sum,sv)=>sum+(Number(sv.amount)||0),0);
  const setService=(i,k,v)=>setInv(p=>{const svs=[...p.services];svs[i]={...svs[i],[k]:v};return{...p,services:svs};});
  const generatePDF=()=>{
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Helvetica,Arial,sans-serif;color:#1a1a2e;background:#fff;padding:40px;}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #0d9488;}.company h1{font-size:28px;font-weight:900;color:#0d9488;}.invoice-title{font-size:36px;font-weight:900;color:#1a1a2e;letter-spacing:-0.04em;margin-bottom:8px;}.badge{display:inline-block;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;background:#fef3c7;color:#d97706;}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0;}table{width:100%;border-collapse:collapse;margin-bottom:32px;}th{background:#f8fafc;padding:12px 16px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#999;font-weight:700;}td{padding:14px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;}td:last-child,th:last-child{text-align:right;}.total-row td{font-weight:800;font-size:16px;border-top:2px solid #0d9488;border-bottom:none;color:#0d9488;}.footer{margin-top:40px;padding-top:24px;border-top:1px solid #f1f5f9;}.payment{background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;}.thank-you{text-align:center;font-size:13px;color:#666;margin-top:24px;}</style></head><body><div class="header"><div><strong style="font-size:20px;color:#0d9488;">JCommerce & Tech</strong><br><small>Mandeville, Jamaica · (876) 817-0095</small></div><div class="company"><h1>${inv.invoiceNumber}</h1></div></div><div class="invoice-title">INVOICE</div><span class="badge">${inv.status}</span><div class="meta-grid"><div><strong>Billed To</strong><br>${inv.clientName}<br>${inv.clientLocation}</div><div><strong>Date:</strong> ${inv.date}<br><strong>Due:</strong> ${inv.dueDate||'Upon Receipt'}</div></div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${inv.services.map(sv=>`<tr><td>${sv.desc||'Service'}</td><td>JMD ${Number(sv.amount||0).toLocaleString()}.00</td></tr>`).join('')}</tbody><tfoot><tr class="total-row"><td>TOTAL DUE</td><td>JMD ${total.toLocaleString()}.00</td></tr></tfoot></table><div class="footer"><div class="payment"><strong>Payment:</strong> ${inv.paymentMethod}</div>${inv.notes?`<div class="payment"><strong>Notes:</strong> ${inv.notes}</div>`:''}<div class="thank-you">Thank you for your business! Contact Jadan Spencer: (876) 817-0095</div></div></body></html>`;
    const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`JCommerce-${inv.invoiceNumber}.html`;a.click();URL.revokeObjectURL(url);
  };
  return(
    <Modal title="Invoice Generator" onClose={onClose}>
      <>
      <div className="grid-2"><Field label="Invoice #"><input className="input" value={inv.invoiceNumber} onChange={e=>s('invoiceNumber',e.target.value)}/></Field><Field label="Status"><select className="input" value={inv.status} onChange={e=>s('status',e.target.value)}><option>PAYMENT DUE</option><option>DEPOSIT DUE</option><option>PAID</option></select></Field></div>
      <div className="grid-2"><Field label="Date"><input className="input" type="date" value={inv.date} onChange={e=>s('date',e.target.value)}/></Field><Field label="Due Date"><input className="input" type="date" value={inv.dueDate} onChange={e=>s('dueDate',e.target.value)}/></Field></div>
      <Field label="Client Name"><input className="input" value={inv.clientName} onChange={e=>s('clientName',e.target.value)} placeholder="e.g. D&D Wholesale"/></Field>
      <Field label="Client Location"><input className="input" value={inv.clientLocation} onChange={e=>s('clientLocation',e.target.value)}/></Field>
      <div>
        <div className="card-label">Services</div>
        {inv.services.map((sv,idx)=>(
          <div key={idx} style={{display:'flex',gap:'0.5rem',alignItems:'center',marginBottom:'0.5rem'}}>
            <input className="input" style={{flex:2}} value={sv.desc} onChange={e=>setService(idx,'desc',e.target.value)} placeholder="Description"/>
            <input className="input" style={{flex:1}} type="number" value={sv.amount} onChange={e=>setService(idx,'amount',e.target.value)} placeholder="Amount"/>
            {inv.services.length>1&&<button className="icon-btn danger-btn" onClick={()=>setInv(p=>({...p,services:p.services.filter((_,k)=>k!==idx)}))}><Icons.close size={12}/></button>}
          </div>
        ))}
        <button className="btn-ghost" style={{width:'100%',justifyContent:'center'}} onClick={()=>setInv(p=>({...p,services:[...p.services,{desc:'',amount:''}]}))}><Icons.plus size={13}/> Add Line</button>
      </div>
      <div style={{background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:'var(--r2)',padding:'0.75rem',display:'flex',justifyContent:'space-between'}}><span style={{fontFamily:'var(--fm)',fontSize:'12px',fontWeight:700}}>TOTAL</span><span style={{fontFamily:'var(--fm)',fontSize:'14px',fontWeight:800,color:'var(--bolt)'}}>J${total.toLocaleString()}</span></div>
      <Field label="Notes"><textarea className="input" style={{minHeight:'56px',resize:'vertical'}} value={inv.notes} onChange={e=>s('notes',e.target.value)}/></Field>
      <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={generatePDF}>📄 Download Invoice</button>
      <ModalFoot onClose={onClose}/>
      </>
    </Modal>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({title,onClose,children}) {
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-head">
          <div style={{fontFamily:'var(--fe)',fontSize:'17px',fontWeight:600,letterSpacing:'0.01em'}}>{title}</div>
          <button className="icon-btn" onClick={onClose}><Icons.close size={14}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({label,children}) {
  return(
    <div>
      <label style={{display:'block',fontFamily:'var(--fm)',fontSize:'8.5px',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.14em',color:'var(--mist-3)',marginBottom:'0.375rem'}}>{label}</label>
      {children}
    </div>
  );
}

function ModalFoot({onClose,onSave}) {
  return(
    <div style={{display:'flex',gap:'0.5rem',paddingTop:'0.25rem'}}>
      <button className="btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancel</button>
      {onSave&&<button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={onSave}>Save</button>}
    </div>
  );
}

function Empty({text}) {
  return <div className="empty">{text}</div>;
}