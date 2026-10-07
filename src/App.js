import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from './firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where, limit, serverTimestamp
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Cell, ComposedChart, Line, ReferenceLine
} from 'recharts';
import kakuzuArt from './assets/ghosts/kakuzu.webp';
import uchihaArt from './assets/ghosts/uchiha.webp';
import akazaArt from './assets/ghosts/akaza.webp';

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
  chevLeft:  () => <Icon d="M15 18l-6-6 6-6" />,
  chevRight: () => <Icon d="M9 18l6-6-6-6" />,
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
  logout:    () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  book:      () => <Icon d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />,
  rocket:    () => <Icon d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />,
  search:    () => <Icon d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />,
  hourglass: () => <Icon d="M6 2h12M6 22h12M17 2v3.5a5 5 0 0 1-2.2 4.1L12 12l-2.8-2.4A5 5 0 0 1 7 5.5V2M7 22v-3.5a5 5 0 0 1 2.2-4.1L12 12l2.8 2.4a5 5 0 0 1 2.2 4.1V22" />,
  filter:    () => <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  alert:     () => <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />,
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ['New','Contacted','Demo Sent','Negotiating','Paid','Flaked','Lost'];
const STATUS_COLOR = {
  New:'#3a4860', Contacted:'#e63946', 'Demo Sent':'#f0c060',
  Negotiating:'#e8a030', Paid:'#1adb8a', Flaked:'#ff5a36', Lost:'#ff5a36'
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const EXPENSE_CATS = ['Hosting','AI API','Tools','Transport','Food','Education','Other'];
const INCOME_CATS = ['Setup Fee','First Deposit','Second Deposit','Monthly Retainer','Completion Fee','Freelance','Other'];
const GOAL_CATS = ['Revenue','Clients','Skills','Health','Personal'];
const BLOCK_COLORS = {
  Work:'#e63946', Coding:'#f0c060', Outreach:'#1adb8a',
  University:'#7b6cf5', Rest:'#1e2a3f', Personal:'#ff8040', Other:'#ff5a36'
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
  { svgKey:'thriving',   label:'Thriving',   color:'#f2ddab', bg:'rgba(242,221,171,0.07)', desc:'Ahead of target — keep going' },
  { svgKey:'good',       label:'Good',        color:'#e6c47c', bg:'rgba(230,196,124,0.07)', desc:'On track' },
  { svgKey:'watchout',   label:'Watch Out',   color:'#ff9a4a', bg:'rgba(255,154,74,0.07)',  desc:'Needs attention' },
  { svgKey:'struggling', label:'Struggling',  color:'#ff5a36', bg:'rgba(255,90,54,0.08)',   desc:'Pull up your socks' },
  { svgKey:'danger',     label:'Danger',      color:'#ff2d3d', bg:'rgba(255,45,61,0.08)',   desc:'Critical — act now' },
];

// ─── LOCAL DATE (not UTC) ─────────────────────────────────────────────────────
// toISOString() uses UTC which causes date to flip at 7pm in Jamaica (UTC-5)
// Always use local date for XP, penalties, and todo logic
function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a YYYY-MM-DD string as LOCAL midnight. new Date('YYYY-MM-DD') parses
// as UTC, which lands on the previous day anywhere west of Greenwich.
function parseLocal(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function addDays(dateStr, n) {
  const d = parseLocal(dateStr);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function mondayOf(dateStr) {
  const d = parseLocal(dateStr);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return localDateStr(d);
}

function calcTodoXP(todos, todayStr) {
  const yesterday = addDays(todayStr, -1);
  let xp = 0;

  // REWARD: +5 XP once per task that got done. (Re-ticking an old task on
  // later days used to earn +5 every day.)
  todos.forEach(t => {
    if (Object.values(t.doneOn || {}).some(Boolean)) xp += 5;
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

function getLast20Weeks(count = 20) {
  const weeks = []; const today = new Date();
  for (let w = count - 1; w >= 0; w--) {
    const days = []; const monday = new Date(today); const dow = today.getDay();
    monday.setDate(today.getDate() - (dow===0?6:dow-1) - w*7);
    for (let d = 0; d < 7; d++) { const day = new Date(monday); day.setDate(monday.getDate()+d); days.push(localDateStr(day)); }
    weeks.push(days);
  }
  return weeks;
}

function calcXP(habits, leads, todos, todayStr, goals = [], journal = [], timers = [], ventureChecks = [], courses = []) {
  let xp = 0;
  // RULE: Never penalise today. Penalties only apply to days strictly BEFORE today.
  habits.forEach(h => {
    // +10 XP for every day the habit was completed (any day)
    xp += Object.values(h.completions||{}).filter(Boolean).length * 10;
    // Get the day the habit was created (so we don't penalise before it existed)
    const createdRaw = h.createdAt?.toDate ? h.createdAt.toDate() : null;
    const createdStr = createdRaw ? localDateStr(createdRaw) : todayStr;
    // Walk every past day from creation up to (not including) today
    // and deduct 10 XP for each day it was missed
    // Cap at 90 days to avoid huge lookback on very old habits
    const msPerDay = 86400000;
    const daysBack = Math.min(90, Math.round((parseLocal(todayStr) - parseLocal(createdStr)) / msPerDay));
    for (let i = 1; i <= daysBack; i++) {
      const d = addDays(todayStr, -i);
      if (d < createdStr) break; // habit didn't exist yet
      if (h.archivedAt && d >= h.archivedAt) continue; // no longer tracked
      if (!h.completions?.[d]) xp -= 10; // missed that day — deduct
    }
  });
  leads.filter(l => l.status==='Paid').forEach(() => { xp += 200; });
  xp += calcTodoXP(todos, todayStr);
  // Bonuses derived from stored data so they survive a restart:
  // +100 per completed goal, +15 per Tide Log entry
  // +100 per goal reached, −50 per goal missed or given up
  goals.forEach(g => { xp += goalXP(g, todayStr); });
  // +10 for each day the venture's daily check was read
  xp += new Set(ventureChecks.map(c => c.date)).size * 10;
  // +5 per syllabus topic that is backed by focus time on that course
  xp += studyXP(courses, timers, todayStr);
  xp += journal.length * 15;
  xp += focusXP(timers, todayStr);
  return Math.max(0, xp);
}

// ─── GOALS ────────────────────────────────────────────────────────────────────
// A goal is not always a number. Three shapes:
//   milestone  one thing that is done or not ("Register the business")
//   steps      reached by finishing a list of steps
//   number     a figure to hit; some track themselves from real data
const GOAL_AREAS = [
  { id:'Business', hex:'#e63946' },
  { id:'Money',    hex:'#e6c47c' },
  { id:'School',   hex:'#ff9a4a' },
  { id:'Health',   hex:'#3ab88e' },
  { id:'Personal', hex:'#b89f8b' },
];
const GOAL_AREA_HEX = Object.fromEntries(GOAL_AREAS.map(a => [a.id, a.hex]));
const GOAL_KINDS = [
  { id:'milestone', label:'Milestone',   shape:'do',     hint:'One thing that is either done or not: register the business, get a TRN, launch the app.' },
  { id:'steps',     label:'Steps',       shape:'do',     hint:'A goal you reach by finishing a list of steps. Tick them off as you go.' },
  { id:'revenue',   label:'Revenue',     shape:'number', unit:'J$',      auto:true,  hint:'Counts income logged in Finance since the start date.' },
  { id:'profit',    label:'Profit',      shape:'number', unit:'J$',      auto:true,  hint:'Counts income minus expenses since the start date.' },
  { id:'clients',   label:'New clients', shape:'number', unit:'clients', auto:true,  hint:'Counts paying clients won since the start date.' },
  { id:'focus',     label:'Focus hours', shape:'number', unit:'hours',   auto:true,  hint:'Counts time filled in Focus timers since the start date.' },
  { id:'savings',   label:'Savings',     shape:'number', unit:'J$',      auto:false, hint:'Money you have put aside. You update it.' },
  { id:'custom',    label:'Other number', shape:'number', unit:'',       auto:false, hint:'Any other figure: books read, kg lost, apps shipped. You update it.' },
];
const goalKind = g => GOAL_KINDS.find(k => k.id === (g.kind || 'custom')) || GOAL_KINDS[7];
const goalArea = g => g.area || ({ Revenue:'Money', Clients:'Business', Skills:'School', Health:'Health', Personal:'Personal' }[g.category]) || 'Business';
const goalUnit = g => (g.kind ? (g.kind === 'custom' ? g.unit || '' : goalKind(g).unit || '') : 'J$');
const goalTarget = g => (g.kind === 'milestone' ? 1 : g.kind === 'steps' ? (g.steps || []).length : Number(g.target) || 0);
const fmtGoal = (g, v) => {
  if (g.kind === 'milestone') return v >= 1 ? 'Done' : 'Not yet';
  if (g.kind === 'steps') return `${Math.round(v)} step${Math.round(v) === 1 ? '' : 's'}`;
  const u = goalUnit(g); const n = u === 'hours' ? Math.round(v * 10) / 10 : Math.round(v);
  return u === 'J$' ? `J$${n.toLocaleString()}` : `${n.toLocaleString()}${u ? ` ${u}` : ''}`;
};
function goalProgress(g, { finances = [], leads = [], timers = [] } = {}) {
  const start = g.startDate || '0000-00-00';
  const inRange = d => d && d >= start;
  switch (g.kind) {
    case 'milestone': return g.status === 'done' || g.completedAt ? 1 : 0;
    case 'steps':   return (g.steps || []).filter(s => s.done).length;
    case 'revenue': return finances.filter(f => f.type === 'income' && inRange(f.date)).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    case 'profit':  return finances.filter(f => inRange(f.date)).reduce((s, f) => s + (f.type === 'income' ? 1 : -1) * (Number(f.amount) || 0), 0);
    case 'clients': return leads.filter(l => l.status === 'Paid' && inRange(l.clientSince || (l.createdAt?.toDate ? localDateStr(l.createdAt.toDate()) : ''))).length;
    case 'focus':   return timers.reduce((s, t) => s + (t.sessions || []).filter(x => inRange(localDateStr(new Date(x.end)))).reduce((a, x) => a + (Number(x.sec) || 0), 0), 0) / 3600;
    default:        return Number(g.current) || 0;
  }
}
// done/failed are written once (by the App watcher or the Done button) so a finished goal stays finished
function goalStatus(g, todayStr) {
  if (g.status === 'done' || g.completedAt) return 'done';
  if (g.status === 'failed') return 'failed';
  if (!g.kind && Number(g.target) > 0 && Number(g.current) >= Number(g.target)) return 'done';   // older goals
  if (g.deadline && g.deadline < todayStr) return 'failed';
  return 'active';
}
// XP: +100 for a goal reached after you committed to it, −50 for one missed.
// Wins logged after the fact are on the record but earn nothing.
const goalXP = (g, todayStr) => { const st = goalStatus(g, todayStr); return st === 'done' ? (g.logged ? 0 : 100) : st === 'failed' ? -50 : 0; };

function xpToLevel(xp) {
  return { level: Math.floor(xp/500)+1, progress: (xp%500)/500, xpInLevel: xp%500 };
}

// Min monthly profit required at each level: J$5,000 × 2^(level-1)
// Level 1 = J$5k, Level 2 = J$10k, Level 3 = J$20k, Level 4 = J$40k ...
function minProfitForLevel(level) {
  return 5000 * Math.pow(2, level - 1);
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

// Set by electron/preload.js when running as the installed Mac app
const DESKTOP = typeof window !== 'undefined' ? window.desktop : undefined;

// Charts get more vertical room on wide (desktop) layouts
const CHART_H = h => (window.innerWidth >= 1024 ? Math.round(h * 1.6) : h);

function useNotifications() {
  const [permission, setPermission] = useState(window.Notification?.permission || 'default');
  const [swReady, setSwReady]       = useState(false);
  const [subbed, setSubbed]         = useState(!!DESKTOP);

  // Register service worker on mount (web only — the desktop app shows
  // native notifications for new alerts instead of Web Push)
  useEffect(() => {
    if (DESKTOP || !('serviceWorker' in navigator)) return;
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
    if (result !== 'granted' || DESKTOP) return result;

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

// ─── SYSTEM HEALTH MONITOR ────────────────────────────────────────────────────
// Pings JAXON and detects Anthropic credit errors from logs
function useSystemHealth() {
  const [health, setHealth] = useState({
    jaxon: 'unknown',      // 'ok' | 'error' | 'unknown'
    anthropic: 'unknown',  // 'ok' | 'out_of_credits' | 'error' | 'unknown'
    lastChecked: null,
    jaxonMsg: '',
    anthropicMsg: '',
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // 1. Ping JAXON server
      let jaxon = 'unknown', jaxonMsg = '';
      try {
        // Render's free tier can take ~30-50s to wake from sleep
        const r = await fetch('https://jaxon-rctv.onrender.com/', { signal: AbortSignal.timeout(60000) });
        if (r.ok) { jaxon = 'ok'; }
        else { jaxon = 'error'; jaxonMsg = `HTTP ${r.status}`; }
      } catch (e) {
        jaxon = 'error';
        jaxonMsg = e.name === 'TimeoutError' ? 'Timed out (Render may be sleeping)' : e.message;
      }

      // 2. Anthropic credit status can't be checked from here: the API needs a
      // key and rejects browser origins (CORS), so a direct call always failed
      // and showed a permanent false alarm. JAXON's server owns that key.
      const anthropic = 'unknown', anthropicMsg = '';

      if (!cancelled) {
        setHealth({ jaxon, jaxonMsg, anthropic, anthropicMsg, lastChecked: new Date() });
      }
    };

    check();
    const interval = setInterval(check, 5 * 60 * 1000); // every 5 mins
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return health;
}

// System alert banner (shown in header area)
function SystemAlertBanner({ health }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = [];

  if (health.anthropic === 'out_of_credits' && !dismissed.has('anthropic_credits')) {
    alerts.push({
      id: 'anthropic_credits',
      color: '#ff5a36',
      icon: '⚠',
      title: 'Anthropic out of credits',
      body: 'JAXON and the chat will not work until you top up at console.anthropic.com → Billing',
    });
  }
  if (health.anthropic === 'error' && !dismissed.has('anthropic_error')) {
    alerts.push({
      id: 'anthropic_error',
      color: '#f0c060',
      icon: '⚡',
      title: 'Anthropic API error',
      body: health.anthropicMsg || 'Could not reach Anthropic. Check API key.',
    });
  }
  if (health.jaxon === 'error' && !dismissed.has('jaxon_error')) {
    alerts.push({
      id: 'jaxon_error',
      color: '#f0c060',
      icon: '🤖',
      title: 'JAXON is offline',
      body: health.jaxonMsg || 'Cannot reach the JAXON server. It may still be waking up.',
    });
  }

  if (!alerts.length) return null;

  return (
    <div className="sys-alerts">
      {alerts.map(a => (
        <div key={a.id} style={{
          display:'flex', alignItems:'flex-start', gap:'0.75rem',
          background:'rgba(10,5,5,0.97)', borderBottom:`2px solid ${a.color}`,
          padding:'0.625rem 1rem', boxShadow:`0 4px 20px ${a.color}20`,
        }}>
          <span style={{ fontSize:'14px', flexShrink:0, marginTop:1 }}>{a.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--fm)', fontSize:'11px', fontWeight:700,
              color:a.color, marginBottom:2 }}>{a.title}</div>
            <div style={{ fontSize:'11px', color:'var(--mist-2)', lineHeight:1.5 }}>{a.body}</div>
          </div>
          <button onClick={() => setDismissed(s => new Set([...s, a.id]))} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'var(--mist-3)', fontSize:'16px', flexShrink:0, lineHeight:1,
          }}>×</button>
        </div>
      ))}
    </div>
  );
}



// ─── LEVEL UP SPLASH ─────────────────────────────────────────────────────────
function LevelUpSplash({ level, onDismiss }) {
  // Keep the latest callback in a ref so parent re-renders (every Firestore
  // snapshot) don't keep restarting the auto-dismiss timer
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const t = setTimeout(() => dismissRef.current(), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
    <style>{`
      @keyframes ringBurst {
        0%   { transform: scale(0.3); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    `}</style>
    <div onClick={onDismiss} style={{
      position:'fixed',inset:0,zIndex:9998,
      background:'rgba(var(--b0),0.92)',
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      backdropFilter:'blur(12px)',
      animation:'fadeIn 0.4s ease',
      cursor:'pointer',
    }}>
      {/* Ring burst */}
      <div style={{
        position:'absolute',width:260,height:260,
        border:'2px solid rgba(var(--p3),0.3)',
        borderRadius:'50%',
        animation:'ringBurst 1.2s ease-out forwards',
      }}/>
      <div style={{
        position:'absolute',width:200,height:200,
        border:'1px solid rgba(240,192,96,0.25)',
        borderRadius:'50%',
        animation:'ringBurst 1.5s 0.2s ease-out forwards',
      }}/>
      <div style={{
        width:96,height:96,borderRadius:'50%',
        background:'linear-gradient(135deg,rgba(var(--p6),0.6),rgba(var(--p3),0.15))',
        border:'2px solid var(--bolt)',
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:'0 0 40px rgba(var(--p3),0.5),0 0 80px rgba(var(--p3),0.2)',
        marginBottom:'1.5rem',
        fontSize:'36px',fontWeight:900,fontFamily:'var(--fe)',
        color:'var(--bolt)',
        animation:'float 2s ease-in-out infinite',
      }}>
        {level}
      </div>
      <div style={{
        fontFamily:'var(--fm)',fontSize:'10px',color:'var(--bolt)',
        letterSpacing:'0.4em',textTransform:'uppercase',marginBottom:'0.5rem',opacity:0.7,
      }}>LEVEL UP</div>
      <div style={{
        fontFamily:'var(--fe)',fontSize:'36px',fontWeight:700,
        color:'var(--mist-0)',letterSpacing:'-0.02em',lineHeight:1,
        textShadow:'0 0 30px rgba(var(--p3),0.4)',marginBottom:'0.5rem',
      }}>Level {level}</div>
      <div style={{
        fontFamily:'var(--fm)',fontSize:'12px',color:'var(--mist-2)',
        marginBottom:'2rem',
      }}>
        Min profit now J${(5000*Math.pow(2,level-1)).toLocaleString()}/mo
      </div>
      <div style={{
        fontFamily:'var(--fm)',fontSize:'9px',color:'var(--mist-4)',
        letterSpacing:'0.1em',
      }}>Click to continue</div>
    </div>
    </>
  );
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
      color: rev7 >= rev14 ? 'var(--bolt)' : '#ff5a36',
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
      color: consistency >= 70 ? 'var(--bolt)' : consistency >= 40 ? 'var(--horizon)' : '#ff5a36',
    },
  ];

  return (
    <div className="span-7" style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(var(--b2),0.95) 0%, rgba(var(--b3),0.2) 100%)',
      border: '1px solid rgba(var(--p3),0.12)',
      borderRadius: 14, padding: '1.125rem',
    }}>
      {/* Top lightning line */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,
        background:'linear-gradient(90deg,transparent,var(--bolt-3),var(--bolt),var(--bolt-3),transparent)',
        opacity:0.6}}/>

      <div className="card-label" style={{marginBottom:'0.75rem'}}>
        ⚡ Business Velocity
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.625rem'}}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background:'rgba(0,0,0,0.35)',
            border:'1px solid rgba(var(--p3),0.07)',
            borderRadius:10, padding:'0.75rem 0.625rem',
            position:'relative',overflow:'hidden',
          }}>
            <div className="vel-label">{m.label}</div>
            <div className="vel-value" style={{color:m.color,textShadow:`0 0 16px ${m.color}60`}}>
              {m.value}
            </div>
            <div className="vel-sub">{m.sub}</div>
            {m.delta !== null && (
              <div style={{
                position:'absolute',top:'0.5rem',right:'0.5rem',
                fontFamily:'var(--fm)',fontSize:'8px',fontWeight:600,
                color: m.delta >= 0 ? 'var(--bolt)' : '#ff5a36',
                background: m.delta >= 0 ? 'rgba(var(--p3),0.1)' : 'rgba(255,90,54,0.1)',
                border: `1px solid ${m.delta>=0?'rgba(var(--p3),0.25)':'rgba(255,90,54,0.25)'}`,
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
        vs prior 7 days
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
    OVERDUE: '#ff5a36',
    DUE_SOON: 'var(--horizon)',
  }[cur.type] || 'var(--bolt)';

  return (
    <div className="alert-toast" style={{
      background: 'rgba(var(--b0),0.98)',
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

// ─── DEEP WATER BACKGROUND ────────────────────────────────────────────────
// Bioluminescent plankton drifting on slow currents, quiet bubbles rising
// from the trench, and the occasional soft caustic band of light moving
// across the water — replaces the old circuit-board grid with something
// that actually belongs to the ocean theme.
function Particles({ palette }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; init(); };

    // Bioluminescent palette — teal current, a rarer violet glow, a trace of amber
    const GLOWS = palette || ['#7a131e', '#c8202f', '#e63946', '#ff7a3d', '#d3a855', '#f2ddab'];

    let motes = [];   // slow-drifting bioluminescent plankton
    let bubbles = []; // quietly rising bubbles
    let caustics = []; // soft moving light bands

    function rand(a, b) { return a + Math.random() * (b - a); }

    function init() {
      motes = [];
      bubbles = [];
      caustics = [];

      const moteCount = Math.max(28, Math.floor((canvas.width * canvas.height) / 26000));
      for (let i = 0; i < moteCount; i++) {
        motes.push({
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          r: rand(0.6, 2.2),
          drift: rand(-0.12, 0.12),
          rise: rand(0.12, 0.42),
          blink: rand(0, Math.PI * 2),
          blinkSpeed: rand(0.008, 0.02),
          shade: GLOWS[Math.floor(Math.random() * GLOWS.length)],
          sway: rand(0.2, 0.6),
          swaySpeed: rand(0.004, 0.01),
        });
      }

      const bubbleCount = Math.max(10, Math.floor(canvas.width / 60));
      for (let i = 0; i < bubbleCount; i++) bubbles.push(spawnBubble(true));

      for (let i = 0; i < 3; i++) {
        caustics.push({
          y: rand(0, canvas.height),
          speed: rand(0.05, 0.15),
          width: rand(120, 260),
          alpha: rand(0.02, 0.045),
          phase: rand(0, Math.PI * 2),
        });
      }
    }

    function spawnBubble(randomHeight) {
      return {
        x: rand(0, canvas.width),
        y: randomHeight ? rand(0, canvas.height) : canvas.height + rand(10, 60),
        r: rand(1, 3.4),
        speed: rand(0.15, 0.45),
        wobble: rand(0, Math.PI * 2),
        wobbleSpeed: rand(0.02, 0.045),
        wobbleAmt: rand(4, 14),
        alpha: rand(0.08, 0.22),
      };
    }

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Soft caustic light bands drifting slowly downward
      caustics.forEach(c => {
        c.y += c.speed;
        c.phase += 0.004;
        if (c.y - c.width > canvas.height) c.y = -c.width;
        const sway = Math.sin(c.phase) * 30;
        const grd = ctx.createLinearGradient(0, c.y - c.width, 0, c.y + c.width);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.5, hexToRgba('#d3a855', c.alpha * 0.7));
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.translate(sway, 0);
        ctx.fillStyle = grd;
        ctx.fillRect(-40, c.y - c.width, canvas.width + 80, c.width * 2);
        ctx.restore();
      });

      // Bioluminescent plankton — gentle upward drift with a soft sideways sway
      motes.forEach(m => {
        m.blink += m.blinkSpeed;
        m.y -= m.rise;
        m.x += m.drift + Math.sin(m.blink * m.swaySpeed * 10) * 0.05;
        if (m.y < -10) { m.y = canvas.height + 10; m.x = rand(0, canvas.width); }
        if (m.x < -10) m.x = canvas.width + 10;
        if (m.x > canvas.width + 10) m.x = -10;

        const alpha = Math.max(0, 0.3 + Math.sin(m.blink) * 0.22 + (Math.random() < 0.02 ? 0.3 : 0)); // flicker
        const glow = m.r * 5;
        const grd = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, glow);
        grd.addColorStop(0, hexToRgba('#fff1d6', alpha));
        grd.addColorStop(0.4, hexToRgba(m.shade, alpha * 0.65));
        grd.addColorStop(1, hexToRgba(m.shade, 0));
        ctx.beginPath();
        ctx.arc(m.x, m.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });

      // Bubbles quietly rising from below
      bubbles.forEach((b, idx) => {
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        const bx = b.x + Math.sin(b.wobble) * b.wobbleAmt;

        ctx.beginPath();
        ctx.arc(bx, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba('#e6c47c', b.alpha);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // faint inner highlight
        ctx.beginPath();
        ctx.arc(bx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba('#fff4ef', b.alpha * 0.8);
        ctx.fill();

        if (b.y < -10) bubbles[idx] = spawnBubble(false);
      });

      raf = requestAnimationFrame(loop);
    }

    resize();
    loop();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [palette]);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed', inset:0, width:'100%', height:'100%',
      pointerEvents:'none', zIndex:0, opacity:0.5,
    }}/>
  );
}

// ─── SECTION THEMES ───────────────────────────────────────────────────────────
// Every section has its own colour. A theme is generated from one hue: accent
// shades, matching dark backgrounds and the ember colours. Gold stays constant
// across all of them, and red/green keep meaning bad/good everywhere.
const SECTION_HUES = {
  dashboard: [355, 72], pipeline: [22, 85],  habits: [150, 66],  todos: [265, 68],
  focus: [214, 78],     studies: [196, 78],  schedule: [176, 68], finance: [42, 62],
  goals: [330, 72],     jaxon: [300, 62],    clients: [238, 66],  ventures: [84, 58],
};
const hslToRgb = (h, sat, l) => {
  const s1 = sat / 100, l1 = l / 100, k = n => (n + h / 30) % 12, a = s1 * Math.min(l1, 1 - l1);
  const f = n => Math.round(255 * (l1 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
};
const rgbHex = c => '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
function makeTheme([h, sat]) {
  const P = l => hslToRgb(h, sat, l), G = l => hslToRgb(h, Math.min(52, sat * 0.62), l);
  const accent = { 900: P(9), 700: P(21), 600: P(28), 500: P(38), 400: P(45), 300: P(56), 200: P(76), 100: P(90), '050': P(97) };
  const ground = { 950: G(2.2), 900: G(3.4), 850: G(5.2), 800: G(6.8), 700: G(8.5), 600: G(11), 500: G(15), 400: G(20), 300: G(27) };
  const vars = {
    ...Object.fromEntries(Object.entries(accent).map(([k, v]) => [`--teal-${k}`, rgbHex(v)])),
    ...Object.fromEntries(Object.entries(ground).map(([k, v]) => [`--abyss-${k}`, rgbHex(v)])),
    '--p2': accent[200].join(','), '--p3': accent[300].join(','), '--p4': accent[400].join(','), '--p6': accent[600].join(','),
    '--b0': ground[950].join(','), '--b1': ground[900].join(','), '--b2': ground[850].join(','), '--b3': G(15).join(','),
    '--teal-glow': `rgba(${accent[400].join(',')},0.22)`, '--teal-deep': `rgba(${accent[400].join(',')},0.09)`, '--teal-trace': `rgba(${accent[400].join(',')},0.045)`,
  };
  return { vars, embers: [rgbHex(accent[600]), rgbHex(accent[400]), rgbHex(accent[300]), rgbHex(accent[200]), '#d3a855', '#f2ddab'] };
}
const THEMES = Object.fromEntries(Object.entries(SECTION_HUES).map(([id, hs]) => [id, makeTheme(hs)]));
function applyTheme(id) {
  const theme = THEMES[id] || THEMES.dashboard;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.classList.add('theme-shift');
  clearTimeout(applyTheme.t);
  applyTheme.t = setTimeout(() => document.body.classList.remove('theme-shift'), 750);
  return theme;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── AUTH GATE ────────────────────────────────────────────────────────────────
// Firestore rules only admit the owner's account, so nothing loads until
// someone signs in.
export default function Root() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);
  if (user === undefined) return <div className="splash" style={{animation:'none'}}/>;
  if (!user) return <SignIn/>;
  return <App key={user.uid}/>;
}

const AUTH_ERRORS = {
  'auth/invalid-credential':     'Wrong email or password.',
  'auth/wrong-password':         'Wrong email or password.',
  'auth/user-not-found':         'No account with that email.',
  'auth/email-already-in-use':   'That email already has an account — sign in instead.',
  'auth/weak-password':          'Use at least 6 characters.',
  'auth/invalid-email':          'That email address looks wrong.',
  'auth/too-many-requests':      'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your internet.',
  'auth/configuration-not-found':'Email sign-in isn\'t enabled in the Firebase console yet.',
  'auth/operation-not-allowed':  'Email sign-in isn\'t enabled in the Firebase console yet.',
};

function SignIn() {
  const [mode, setMode]         = useState('signin'); // signin | create
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState(null); // { text, ok }

  const submit = async e => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === 'create') await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setMsg({ text: AUTH_ERRORS[err.code] || err.message });
    }
    setBusy(false);
  };

  const reset = async () => {
    if (!email.trim()) { setMsg({ text: 'Enter your email first, then click "Forgot password".' }); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setMsg({ text: 'Password reset email sent.', ok: true }); }
    catch (err) { setMsg({ text: AUTH_ERRORS[err.code] || err.message }); }
  };

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <div className="splash-logo" style={{marginBottom:'1rem',animation:'none'}}>
          <div className="splash-j" style={{fontSize:64}}>J</div>
          <div className="splash-c" style={{fontSize:64}}>C</div>
        </div>
        <div className="splash-wordmark" style={{animation:'none',fontSize:15}}>JCommerce</div>
        <div className="splash-sub" style={{animation:'none',marginBottom:'1.75rem'}}>
          {mode === 'create' ? 'Create your owner account' : 'Founder Console'}
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="username" autoFocus value={email} onChange={e=>setEmail(e.target.value)}/>
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete={mode==='create'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/>
        </Field>
        {msg && <div className="signin-msg" style={{color: msg.ok ? 'var(--sea-400)' : 'var(--coral-400)'}}>{msg.text}</div>}
        <button className="btn-primary" type="submit" disabled={busy} style={{justifyContent:'center',width:'100%',marginTop:'0.5rem',opacity:busy?0.7:1}}>
          {busy ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Sign in'}
        </button>
        <div className="signin-links">
          <button type="button" onClick={()=>{setMode(m=>m==='create'?'signin':'create');setMsg(null);}}>
            {mode === 'create' ? 'Have an account? Sign in' : 'First time? Create account'}
          </button>
          {mode === 'signin' && <button type="button" onClick={reset}>Forgot password</button>}
        </div>
      </form>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('dashboard');
  // Each section wears its own colours
  const theme = useMemo(() => applyTheme(tab), [tab]);
  const [leads, setLeads]       = useState([]);
  const [habits, setHabits]     = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [finances, setFinances] = useState([]);
  const [goals, setGoals]       = useState([]);
  const [todos, setTodos]       = useState([]);
  const [queue, setQueue]       = useState([]);
  const [logs, setLogs]         = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [journal, setJournal]   = useState([]);
  const [budgets, setBudgets]   = useState([]);
  const [timers, setTimers]     = useState([]);
  const [ventureServices_, setVentureServices] = useState([]);
  const [ventureChecks, setVentureChecks] = useState([]);
  const [courses, setCourses]   = useState([]);
  const [settings, setSettings] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts]     = useState([]);
  const [xpPops, setXpPops]     = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const systemHealth = useSystemHealth();
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
      ['journal',setJournal],['budgets',setBudgets],['timers',setTimers],['venture_services',setVentureServices],['venture_checks',setVentureChecks],['courses',setCourses],['settings',setSettings],
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
    let initialSnapshot = true;
    const unsub = onSnapshot(
      query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(30)),
      snap => {
        const fresh = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => !a.seen && !dismissed.has(a.id));
        setAlerts(fresh);
        // Desktop app: raise a native macOS notification for alerts that
        // arrive while the app is open (stands in for Web Push)
        if (DESKTOP && !initialSnapshot && window.Notification?.permission === 'granted') {
          snap.docChanges()
            .filter(c => c.type === 'added' && !c.doc.data().seen)
            .forEach(c => {
              const a = c.doc.data();
              new window.Notification(a.title || 'JAXON', { body: a.body || a.message || '' });
            });
        }
        initialSnapshot = false;
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

  const add    = async (col, data) => { try { return await addDoc(collection(db,col), {...data, createdAt:serverTimestamp()}); } catch { setError('Failed to save.'); } };
  const update = async (col, id, data) => { try { await updateDoc(doc(db,col,id), data); } catch { setError('Failed to update.'); } };
  const remove = async (col, id) => { try { await deleteDoc(doc(db,col,id)); } catch { setError('Failed to delete.'); } };
  // Only today and yesterday can be changed: back-filling old days used to erase penalties
  const toggleHabit = async (habit, date) => {
    if (date > todayStr || date < addDays(todayStr, -1)) return;
    await update('habits', habit.id, { completions: {...(habit.completions||{}), [date]: !habit.completions?.[date]} });
  };
  const toggleTodo  = async (todo) => { await update('todos', todo.id, { doneOn: {...(todo.doneOn||{}), [todayStr]: !todo.doneOn?.[todayStr]} }); };

  // ── TIDE LOG — a one-line-each nightly check-in that ties the business
  // and personal sides of the day together. First entry of a given day
  // earns a small XP bonus; editing that same day's entry afterward does not
  // double-dip. ──────────────────────────────────────────────────────────
  const todayJournal = journal.find(j => j.date === todayStr) || null;
  const saveJournal = async (data) => {
    if (todayJournal) {
      await update('journal', todayJournal.id, data);
    } else {
      await add('journal', { ...data, date: todayStr });
    }
  };

  // ── Focus timers ─────────────────────────────────────────────────────────
  const closeSession = (t, endMs) => {
    const startMs = Date.parse(t.runningSince);
    const sec = Math.max(0, Math.min(SESSION_CAP_SEC, (endMs - startMs) / 1000, timerTargetSec(t) - (Number(t.elapsedSec) || 0)));
    return {
      elapsedSec: Math.min(timerTargetSec(t), (Number(t.elapsedSec) || 0) + sec),
      runningSince: null,
      sessions: [...(t.sessions || []), { start: t.runningSince, end: new Date(startMs + sec * 1000).toISOString(), sec: Math.round(sec) }],
    };
  };
  const pauseTimer = t => t.runningSince && update('timers', t.id, closeSession(t, Date.now()));
  const startTimer = t => {
    timers.filter(x => x.runningSince && x.id !== t.id).forEach(pauseTimer); // one bottle at a time
    update('timers', t.id, { runningSince: new Date().toISOString(), cappedAt: null });
  };
  const timerWatch = useRef(new Set());
  useEffect(() => {
    const check = () => {
      const now = Date.now(), today = localDateStr();
      timers.forEach(t => {
        if (t.status === 'done' || t.status === 'failed' || timerWatch.current.has(t.id)) return;
        const mark = () => { timerWatch.current.add(t.id); setTimeout(() => timerWatch.current.delete(t.id), 4000); };
        const base = Number(t.elapsedSec) || 0, target = timerTargetSec(t);
        if (t.runningSince) {
          const startMs = Date.parse(t.runningSince), run = (now - startMs) / 1000;
          if (base + Math.min(run, SESSION_CAP_SEC) >= target) {          // bottle full
            const endMs = startMs + (target - base) * 1000;
            mark();
            update('timers', t.id, { ...closeSession(t, endMs), status: 'done', completedAt: new Date(endMs).toISOString() });
            if (window.Notification?.permission === 'granted') new window.Notification('Bottle full', { body: `${t.title}: +${timerBonus(t)} XP` });
            return;
          }
          if (run > SESSION_CAP_SEC) {                                  // left running too long
            mark();
            update('timers', t.id, { ...closeSession(t, startMs + SESSION_CAP_SEC * 1000), cappedAt: new Date().toISOString() });
            return;
          }
        }
        if (t.deadline && t.deadline < today) {                          // deadline passed
          mark();
          update('timers', t.id, { ...(t.runningSince ? closeSession(t, now) : {}), status: 'failed', failedAt: new Date().toISOString() });
        }
      });
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, [timers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Goals: write done/failed once, so XP can't flip back and forth ─────────
  useEffect(() => {
    const ctx = { finances, leads, timers };
    goals.forEach(g => {
      if (g.status === 'done' || g.status === 'failed' || g.completedAt) return;
      const target = goalTarget(g);
      if (g.kind !== 'milestone' && target > 0 && goalProgress(g, ctx) >= target) update('goals', g.id, { status: 'done', completedAt: new Date().toISOString() });
      else if (g.deadline && g.deadline < todayStr) update('goals', g.id, { status: 'failed', failedAt: new Date().toISOString() });
    });
  }, [goals, finances, leads, timers, todayStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Weekly hour targets for Work / School / Life
  const balanceDoc = settings.find(x => x.key === 'balance');
  const setBalance = targets => (balanceDoc ? update('settings', balanceDoc.id, { targets }) : add('settings', { key: 'balance', targets }));

  // One budget doc per expense category; a limit of 0 removes it
  const setBudget = async (category, limit) => {
    const existing = budgets.find(b => b.category === category);
    if (!limit) { if (existing) await remove('budgets', existing.id); return; }
    if (existing) await update('budgets', existing.id, { limit });
    else await add('budgets', { category, limit });
  };

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
  const xp = calcXP(habits, leads, todos, todayStr, goals, journal, timers, ventureChecks, courses);
  const { level, progress, xpInLevel } = xpToLevel(xp);
  const [prevLevel, setPrevLevel] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  useEffect(() => {
    // Only celebrate real level-ups — not the jump from L1 to your actual
    // level while data is still loading behind the splash screen
    if (!loading && prevLevel !== null && level > prevLevel) setShowLevelUp(true);
    setPrevLevel(level);
  }, [level, loading]);
  const todayTodos = todos.filter(t=>t.addedDate===todayStr);
  const todayDone  = todayTodos.filter(t=>t.doneOn?.[todayStr]);
  const todayBriefing = briefings.find(b=>b.date===todayStr) || null;

  const navItems = [
    {id:'dashboard', label:'Home',     icon:Icons.home},
    {id:'pipeline',  label:'Pipeline', icon:Icons.pipeline},
    {id:'habits',    label:'Habits',   icon:Icons.habits},
    {id:'todos',     label:'Tasks',    icon:Icons.tasks},
    {id:'focus',     label:'Focus',    icon:Icons.hourglass},
    {id:'studies',   label:'Studies',  icon:Icons.book},
    {id:'schedule',  label:'Schedule', icon:Icons.schedule},
    {id:'finance',   label:'Finance',  icon:Icons.finance},
    {id:'goals',     label:'Goals',    icon:Icons.goals},
    {id:'jaxon',     label:'JAXON',    icon:Icons.jaxon},
    {id:'clients',   label:'Clients',  icon:Icons.briefcase},
    {id:'ventures',  label:'Ventures', icon:Icons.rocket},
  ];
  const currentNav = navItems.find(n => n.id === tab) || navItems[0];

  const toast = (text, tone = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };
  // Every XP change floats up from the XP chip, so wins and losses are felt
  const prevXp = useRef(null);
  useEffect(() => {
    if (loading) { prevXp.current = xp; return; }
    const before = prevXp.current;
    prevXp.current = xp;
    if (before === null || before === xp) return;
    const id = Date.now() + Math.random();
    setXpPops(p => [...p.slice(-3), { id, d: xp - before }]);
    setTimeout(() => setXpPops(p => p.filter(x => x.id !== id)), 1900);
  }, [xp, loading]);
  const paletteRun = {
    nav: id => { setTab(id); },
    toast,
    addFinance: d => { add('finances', d); return `Logged ${d.type === 'income' ? '+' : '−'}${J(d.amount)} · ${d.category}`; },
    addTodo: title => { add('todos', { title, note: '', doneOn: {}, addedDate: todayStr }); return `Task added: ${title}`; },
    addLead: name => { add('leads', { businessName: name, status: 'New', priority: 'medium', value: '', nextAction: 'First contact', nextActionDate: todayStr, source: 'Manual' }); return `Lead added: ${name}`; },
    toggleHabit: h => { toggleHabit(h, todayStr); return `${h.completions?.[todayStr] ? 'Unticked' : 'Ticked'}: ${h.name}`; },
    toggleTodo: t => { toggleTodo(t); return `${t.doneOn?.[todayStr] ? 'Reopened' : 'Done'}: ${t.title}`; },
    startTimer: t => { startTimer(t); return `Started: ${t.title}`; },
    pauseTimer: t => { pauseTimer(t); return `Paused: ${t.title}`; },
  };

  // ⌘1 – ⌘9 jump between sections
  useEffect(() => {
    const onKey = e => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const n = Number(e.key);
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); return; }
      const idx = e.key === '0' ? 9 : n - 1;
      if (e.key >= '0' && e.key <= '9' && navItems[idx]) { e.preventDefault(); setTab(navItems[idx].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // navItems is static

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
      <Particles palette={theme.embers}/>

      <header className="header">
        <div className="brand">
          <div className="brand-gem">J</div>
          <div>
            <div className="brand-name">JCommerce</div>
            <div className="brand-sub">Founder Console</div>
          </div>
        </div>
        <div className="page-title">
          <span className="page-title-icon"><currentNav.icon /></span>
          <span>{currentNav.label}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <button className="icon-btn" title="Create Invoice" onClick={()=>setInvoiceOpen(true)} style={{width:28,height:28,borderColor:'rgba(var(--p3),0.2)',color:'var(--bolt)'}}>📄</button>
          <button
            onClick={requestPermission}
            title={notifSubbed?'Push notifications active':notifPerm==='granted'?'Notifications on':'Click to enable notifications'}
            style={{
              position:'relative',background:'none',
              border:`1px solid ${notifSubbed?'rgba(var(--p3),0.35)':'rgba(255,255,255,0.08)'}`,
              cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              width:32,height:32,
              color:notifSubbed?'var(--bolt)':notifPerm==='granted'?'var(--bolt-3)':'var(--mist-3)',
              borderRadius:'var(--r1)',
              boxShadow:notifSubbed?'0 0 8px rgba(var(--p3),0.3)':'none',
              flexShrink:0,
            }}>
            <Icons.bell size={15}/>
            {alerts.length > 0 && (
              <span style={{
                position:'absolute',top:-3,right:-3,
                background:'#ff5a36',color:'white',
                borderRadius:'50%',width:15,height:15,
                fontSize:'8px',fontWeight:700,lineHeight:1,
                display:'flex',alignItems:'center',justifyContent:'center',
                border:'1.5px solid var(--lake-1)',
                boxShadow:'0 0 6px rgba(255,90,54,0.7)',
              }}>{Math.min(9,alerts.length)}</span>
            )}
          </button>
          <button className="cmdk-btn" onClick={() => setPaletteOpen(true)} title="Command bar (⌘K)">
            <Icons.search size={14}/><span>Log or find anything</span><kbd>⌘K</kbd>
          </button>
          <FocusPill timers={timers} onOpen={() => setTab('focus')}/>
          {todayBriefing && (
            <button className="briefing-pill" onClick={() => setBriefingOpen(true)}>
              <span className="briefing-dot"/>
              Briefing
            </button>
          )}
          <button className="icon-btn" title="Sign out" onClick={()=>signOut(auth)}><Icons.logout size={14}/></button>
          <div className="xp-chip">
            <span className="xp-chip-lv">L{level}</span>
            <span className="xp-chip-sep">·</span>
            <span className="xp-chip-xp">{xp} XP</span>
          </div>
        </div>
      </header>

      {showLevelUp && <LevelUpSplash level={level} onDismiss={() => setShowLevelUp(false)}/>}

      <SystemAlertBanner health={systemHealth}/>

      {error && (
        <div className="error-toast">
          <Icons.alert size={14}/>
          <span>{error}</span>
          <button onClick={() => setError('')}><Icons.close size={12}/></button>
        </div>
      )}

      <main className="main">
        {tab==='dashboard' && <Dashboard leads={leads} habits={habits} finances={finances} todos={todos} schedule={schedule} goals={goals} timers={timers} journal={journal} todayStr={todayStr} xp={xp} level={level} progress={progress} xpInLevel={xpInLevel} onToggleHabit={toggleHabit} onToggleTodo={toggleTodo} onAddTodo={d=>add('todos',{...d,doneOn:{},addedDate:todayStr})} onSaveJournal={saveJournal} onNav={setTab} onStartTimer={startTimer} ventureChecked={ventureChecks.some(c=>c.date===todayStr)} courses={courses} balance={balanceDoc?.targets} onSetBalance={setBalance}/>}
        {tab==='pipeline' && <Pipeline leads={leads} finances={finances} onAdd={d=>add('leads',d)} onUpdate={(id,d)=>update('leads',id,d)} onDelete={id=>remove('leads',id)} onLogPayment={logPayment} onUpdatePayment={updateLinkedPayment}/>}
        {tab==='habits'   && <Habits habits={habits} weekDates={weekDates} todayStr={todayStr} onAdd={d=>add('habits',{...d,completions:{}})} onUpdate={(id,d)=>update('habits',id,d)} onDelete={id=>remove('habits',id)} onToggle={toggleHabit}/>}
        {tab==='focus'    && <Focus timers={timers} todayStr={todayStr} onAdd={d=>add('timers',d)} onUpdate={(id,d)=>update('timers',id,d)} onDelete={id=>remove('timers',id)} onStart={startTimer} onPause={pauseTimer} courses={courses}/>}
        {tab==='studies'  && <Studies courses={courses} timers={timers} schedule={schedule} todayStr={todayStr} balance={balanceDoc?.targets} onSetBalance={setBalance}
          onAdd={d=>add('courses',d)} onUpdate={(id,d)=>update('courses',id,d)} onDelete={id=>remove('courses',id)}
          onAddTimer={d=>add('timers',d)} onStartTimer={startTimer} onPauseTimer={pauseTimer}/>}
        {tab==='todos'    && <Todos todos={todos} todayStr={todayStr} onAdd={d=>add('todos',{...d,doneOn:{},addedDate:todayStr})} onUpdate={(id,d)=>update('todos',id,d)} onDelete={id=>remove('todos',id)} onToggle={toggleTodo}/>}
        {tab==='schedule' && <Schedule schedule={schedule} onAdd={d=>add('schedule',d)} onUpdate={(id,d)=>update('schedule',id,d)} onDelete={id=>remove('schedule',id)}/>}
        {tab==='finance'  && <Finance finances={finances} leads={leads} budgets={budgets} level={level} onAdd={d=>add('finances',d)} onUpdate={(id,d)=>update('finances',id,d)} onDelete={id=>remove('finances',id)} onSetBudget={setBudget}/>}
        {tab==='goals'    && <Goals goals={goals} finances={finances} leads={leads} timers={timers} todayStr={todayStr} onAdd={d=>add('goals',d)} onUpdate={(id,d)=>update('goals',id,d)} onDelete={id=>remove('goals',id)}/>}
        {tab==='jaxon'    && <JaxonDashboard queue={queue} logs={logs} briefings={briefings} todayStr={todayStr} onApprove={id=>update('jaxon_queue',id,{status:'approved'})} onReject={id=>update('jaxon_queue',id,{status:'rejected'})}/>}
        {tab==='ventures' && <Ventures services={ventureServices_} checks={ventureChecks} todayStr={todayStr}
          onSaveService={d => { const { id, createdAt, ...data } = d; const existing = id ? { id } : ventureServices_.find(x => x.serviceId === d.serviceId); existing ? update('venture_services', existing.id, data) : add('venture_services', data); }}
          onDeleteService={id => remove('venture_services', id)}
          onSaveCheck={d => { if (!ventureChecks.some(c => c.date === d.date)) add('venture_checks', d); }}/>}
        {tab==='clients'  && <ClientManagement leads={leads} finances={finances} todayStr={todayStr} onAdd={add} onUpdate={update} onRemove={remove}/>}
      </main>

      <nav className="bottom-nav">
        <div className="nav-brand">
          <div className="brand-gem">J</div>
          <div>
            <div className="brand-name">JCommerce</div>
            <div className="brand-sub">Founder Console</div>
          </div>
        </div>
        {navItems.map((n,i) => (
          <button key={n.id} className={`nav-btn ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)} style={{'--i':i}} title={i < 10 ? `${n.label} (⌘${(i+1)%10})` : n.label}>
            <span className="nav-icon"><n.icon /></span>
            <span className="nav-lbl">{n.label}</span>
            {i < 10 && <span className="nav-key">⌘{(i+1)%10}</span>}
          </button>
        ))}
        <div className="nav-foot">
          <div className="nav-foot-lv">Level {level}</div>
          <div className="xp-track"><div className="xp-fill" style={{width:`${progress*100}%`}}/></div>
          <div className="nav-foot-xp">{xpInLevel} / 500 XP</div>
        </div>
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

      {paletteOpen && (
        <CommandPalette sections={navItems} leads={leads} habits={habits} timers={timers} todos={todos} todayStr={todayStr}
          run={paletteRun} onClose={() => setPaletteOpen(false)}/>
      )}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>)}
      </div>
      <div className="xp-pops" aria-hidden="true">
        {xpPops.map(p => <span key={p.id} className={`xp-pop ${p.d > 0 ? 'up' : 'down'}`}>{p.d > 0 ? '+' : ''}{p.d} XP</span>)}
      </div>

      {/* JAXON Floating Chat */}
      <JaxonFloat leads={leads} habits={habits} finances={finances} goals={goals} todos={todos} schedule={schedule} totalIncome={totalIncome} totalExpenses={totalExpenses} profit={profit} xp={xp} level={level} todayStr={todayStr} paidLeads={paidLeads} openLeads={openLeads}/>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
// ─── TIDE LOG ─────────────────────────────────────────────────────────────────
// A one-line-each nightly check-in: one business win, one personal win, one
// thing to hit tomorrow. Ties the business side of the app to the personal
// side without asking for more than thirty seconds of anyone's evening.
function TideLog({ journal, todayStr, onSave }) {
  const [editing, setEditing] = useState(false);
  const [biz, setBiz]   = useState('');
  const [life, setLife] = useState('');
  const [next, setNext] = useState('');

  const sorted = useMemo(() => [...journal].sort((a,b) => (b.date||'').localeCompare(a.date||'')), [journal]);
  const today  = sorted.find(j => j.date === todayStr) || null;
  const recent = sorted.filter(j => j.date !== todayStr).slice(0, 4);

  // Tide streak — consecutive days (counting back from today) with an entry
  const streak = useMemo(() => {
    const dates = new Set(journal.map(j => j.date));
    const dateMinus = (dateStr, days) => {
      const dt = new Date(dateStr + 'T12:00:00');
      dt.setDate(dt.getDate() - days);
      return dt.toISOString().slice(0,10);
    };
    const streakFrom = (startDate) => {
      let count = 0;
      let cur = startDate;
      while (dates.has(cur)) { count++; cur = dateMinus(cur, 1); }
      return count;
    };
    if (!dates.has(todayStr)) {
      const y = dateMinus(todayStr, 1);
      return dates.has(y) ? streakFrom(y) : 0;
    }
    return streakFrom(todayStr);
  }, [journal, todayStr]);

  const startEdit = () => {
    setBiz(today?.biz || ''); setLife(today?.life || ''); setNext(today?.next || '');
    setEditing(true);
  };

  const save = async () => {
    if (!biz.trim() && !life.trim() && !next.trim()) return;
    await onSave({ biz: biz.trim(), life: life.trim(), next: next.trim() });
    setEditing(false);
  };

  return (
    <div className="card fade-in">
      <div className="row-between" style={{ marginBottom: today || editing ? '0.75rem' : 0 }}>
        <span className="card-label" style={{ margin: 0 }}>Tide Log</span>
        {streak > 0 && (
          <span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'var(--fm)', fontSize:'10px', color:'var(--horizon)' }}>
            <Icons.flame size={11}/> {streak} day{streak===1?'':'s'}
          </span>
        )}
      </div>

      {!editing && !today && (
        <button className="btn-ghost" style={{ width:'100%', justifyContent:'center' }} onClick={startEdit}>
          What came in with today's tide?
        </button>
      )}

      {!editing && today && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          <TideRow tag="BIZ"  color="var(--bolt)"    text={today.biz}/>
          <TideRow tag="LIFE" color="var(--lume-400, #ff9a4a)" text={today.life}/>
          <TideRow tag="NEXT" color="var(--horizon)" text={today.next}/>
          <button className="btn-ghost" style={{ alignSelf:'flex-start', marginTop:'0.125rem', fontSize:'11px', padding:'0.35rem 0.75rem' }} onClick={startEdit}>
            Edit today's entry
          </button>
        </div>
      )}

      {editing && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          <input className="input" style={{ fontSize:'13px', padding:'0.55rem 0.75rem' }}
            placeholder="One business win today…" value={biz} onChange={e=>setBiz(e.target.value)} maxLength={140}/>
          <input className="input" style={{ fontSize:'13px', padding:'0.55rem 0.75rem' }}
            placeholder="One personal win today…" value={life} onChange={e=>setLife(e.target.value)} maxLength={140}/>
          <input className="input" style={{ fontSize:'13px', padding:'0.55rem 0.75rem' }}
            placeholder="One thing to hit tomorrow…" value={next} onChange={e=>setNext(e.target.value)} maxLength={140}/>
          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.125rem' }}>
            <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={save}>Save</button>
            <button className="btn-ghost" onClick={()=>setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ marginTop:'0.875rem', paddingTop:'0.75rem', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:'0.625rem' }}>
          {recent.map(j => (
            <div key={j.id}>
              <div style={{ fontFamily:'var(--fm)', fontSize:'8.5px', color:'var(--mist-3)', letterSpacing:'0.1em', marginBottom:3 }}>
                {j.date}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                {j.biz  && <TideRow tag="BIZ"  color="var(--bolt)"    text={j.biz}  compact/>}
                {j.life && <TideRow tag="LIFE" color="var(--lume-400, #ff9a4a)" text={j.life} compact/>}
                {j.next && <TideRow tag="NEXT" color="var(--horizon)" text={j.next} compact/>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TideRow({ tag, color, text, compact }) {
  if (!text) return null;
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
      <span style={{
        fontFamily:'var(--fm)', fontSize: compact ? '7.5px' : '8px', fontWeight:600,
        color, letterSpacing:'0.08em', flexShrink:0, width: compact ? 28 : 32,
        marginTop: compact ? 2 : 1,
      }}>{tag}</span>
      <span style={{ fontSize: compact ? '11.5px' : '13px', color: 'var(--mist-1)', lineHeight:1.4, flex:1, minWidth:0, wordBreak:'break-word' }}>{text}</span>
    </div>
  );
}

// ─── HOME: the Today command centre ──────────────────────────────────────────
// Pulls every section together into one answer: what to do next, and whether
// you're on track. Everything here is read from the same data the other
// sections use, so the two never disagree.
function Dashboard({ leads, habits, finances, todos, schedule, goals, timers, journal, courses = [], balance, onSetBalance, ventureChecked, todayStr, xp, level, progress, xpInLevel,
  onToggleHabit, onToggleTodo, onAddTodo, onSaveJournal, onNav, onStartTimer }) {
  const [taskDraft, setTaskDraft] = useState('');
  const now = new Date(), hour = now.getHours(), nowMin = hour * 60 + now.getMinutes();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const thisMonth = todayStr.slice(0, 7), today = Number(todayStr.slice(8));
  const dim = daysInMonth(thisMonth), daysLeft = dim - today;

  // ── Money ────────────────────────────────────────────────────────────────
  const sumMonth = (mk, type) => finances.filter(f => monthOf(f.date) === mk && f.type === type).reduce((s, f) => s + amountOf(f), 0);
  const inc = sumMonth(thisMonth, 'income'), exp = sumMonth(thisMonth, 'expense'), net = inc - exp;
  const target = minProfitForLevel(level);
  const last3 = [1, 2, 3].map(i => addMonths(thisMonth, -i));
  const avgInc = last3.reduce((s, m) => s + sumMonth(m, 'income'), 0) / 3;
  const avgExp = last3.reduce((s, m) => s + sumMonth(m, 'expense'), 0) / 3;
  const cash = finances.reduce((s, f) => s + (f.type === 'income' ? amountOf(f) : -amountOf(f)), 0);
  const clients = leads.filter(l => l.status === 'Paid' && l.clientStatus !== 'Churned');
  const arrears = clients.map(l => ({ l, months: retainerArrears(l, finances, todayStr) })).filter(x => x.months.length);
  const owedRet = arrears.reduce((s, x) => s + x.months.length * (Number(x.l.retainerAmount) || 0), 0);
  const pendingRet = clients.filter(l => l.clientStatus !== 'Paused' && Number(l.retainerAmount) > 0 && retainerDueDate(l, thisMonth) >= todayStr && !retainerCollected(l, thisMonth, finances))
    .reduce((s, l) => s + Number(l.retainerAmount), 0);
  const projNet = net + pendingRet - avgExp * (daysLeft / dim);
  // Expected income this month: the better of your 3-month average and what's
  // actually in plus retainers still due. Spend past (expected − minimum) and you miss it.
  const expectedInc = Math.max(avgInc, inc + pendingRet);
  const allowed = Math.max(0, expectedInc - target);
  const safeLeft = allowed - exp;
  const safePerDay = safeLeft > 0 ? safeLeft / (daysLeft + 1) : 0;
  const lastLog = finances.reduce((m, f) => (f.date && f.date > m ? f.date : m), '');
  const sinceLog = lastLog ? Math.round((parseLocal(todayStr) - parseLocal(lastLog)) / 864e5) : null;

  // ── Day ──────────────────────────────────────────────────────────────────
  const activeHabits = habits.filter(h => !h.archivedAt);
  const habitsLeft = activeHabits.filter(h => !h.completions?.[todayStr]);
  const todayTasks = todos.filter(t => t.addedDate === todayStr)
    .sort((a, b) => (a.doneOn?.[todayStr] ? 1 : 0) - (b.doneOn?.[todayStr] ? 1 : 0) || (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
  const tasksDone = todayTasks.filter(t => t.doneOn?.[todayStr]).length;
  const blocks = schedule.filter(b => blockOccursOn(b, todayStr)).sort((a, b) => toMin(a.start) - toMin(b.start));
  const nextBlock = blocks.find(b => toMin(b.end) > nowMin);
  const activeTimers = timers.filter(t => timerStatus(t, todayStr) === 'active');
  const wroteTide = journal.some(j => j.date === todayStr);

  // ── Next moves: ranked from every section ────────────────────────────────
  const moves = [];
  const push = (lv, text, cta, act) => moves.push({ lv, text, cta, act });
  const go = tab => () => onNav(tab);
  if (projNet < target) {
    const gap = target - projNet;
    push('danger', `Profit is heading for ${J(projNet)} this month, ${J(gap)} short of your Level ${level} minimum. That's ${J(gap / Math.max(1, daysLeft + 1))} a day.`, 'Finance', go('finance'));
  }
  arrears.forEach(({ l, months }) => push('danger', `Chase ${l.businessName}: ${months.length} unpaid retainer${months.length === 1 ? '' : 's'} (${J(months.length * Number(l.retainerAmount))}).`, 'Client', go('clients')));
  const openLeads = leads.filter(l => !['Paid', 'Flaked', 'Lost'].includes(l.status));
  const followUps = openLeads.filter(l => l.nextActionDate && l.nextActionDate <= todayStr).sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));
  followUps.slice(0, 3).forEach(l => {
    const late = Math.round((parseLocal(todayStr) - parseLocal(l.nextActionDate)) / 864e5);
    push(late > 0 ? 'danger' : 'warn', `Follow up with ${l.businessName}${l.nextAction ? `: ${l.nextAction}` : ''}${late > 0 ? ` (${late}d late)` : ''}.`, 'Pipeline', go('pipeline'));
  });
  if (followUps.length > 3) push('warn', `${followUps.length - 3} more follow-ups are due.`, 'Pipeline', go('pipeline'));
  activeTimers.forEach(t => {
    const left = timerTargetSec(t) - timerElapsed(t, Date.now());
    const d = Math.round((parseLocal(t.deadline) - parseLocal(todayStr)) / 864e5);
    const perDay = left / Math.max(1, d + 1);
    if (d <= 1 || perDay > 1.5 * 3600) push(d <= 0 ? 'danger' : 'warn', `${t.title}: ${fmtHM(left)} left, due ${d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`}.`, t.runningSince ? 'Open' : 'Start', t.runningSince ? go('focus') : () => { onStartTimer(t); onNav('focus'); });
  });
  if (habitsLeft.length) {
    const risky = habitsLeft.map(h => ({ h, s: habitStreak(h, todayStr) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s)[0];
    push(hour >= 18 ? 'warn' : 'info', `${habitsLeft.length} habit${habitsLeft.length === 1 ? '' : 's'} left today${risky ? `, including your ${risky.s}-day "${risky.h.name}" streak` : ''}.`, 'Habits', go('habits'));
  }
  if (todayTasks.length < 5) push(hour >= 12 ? 'warn' : 'info', `Plan ${5 - todayTasks.length} more task${5 - todayTasks.length === 1 ? '' : 's'}. Five is the minimum.`, 'Tasks', go('todos'));
  else if (tasksDone < 5) push(hour >= 15 ? 'warn' : 'info', `Finish ${5 - tasksDone} more task${5 - tasksDone === 1 ? '' : 's'} today to avoid −10 XP tomorrow.`, 'Tasks', go('todos'));
  goals.forEach(g => {
    if (goalStatus(g, todayStr) !== 'active' || !g.deadline) return;
    const dueIn = Math.round((parseLocal(g.deadline) - parseLocal(todayStr)) / 864e5);
    if (g.kind === 'milestone') { if (dueIn <= 3) push(dueIn <= 1 ? 'danger' : 'warn', `"${g.title}" is due ${dueIn === 0 ? 'today' : dueIn === 1 ? 'tomorrow' : `in ${dueIn} days`}.`, 'Goals', go('goals')); return; }
    const cur = goalProgress(g, { finances, leads, timers }), tgt = goalTarget(g);
    const start = g.startDate || todayStr;
    const span = Math.max(1, Math.round((parseLocal(g.deadline) - parseLocal(start)) / 864e5));
    const elapsed = Math.min(1, Math.max(0, Math.round((parseLocal(todayStr) - parseLocal(start)) / 864e5) / span));
    if (tgt > 0 && cur / tgt + 0.05 < elapsed) push('warn', `"${g.title}" is behind pace: ${fmtGoal(g, cur)} of ${fmtGoal(g, tgt)} with ${Math.round((1 - elapsed) * 100)}% of the time left.`, 'Goals', go('goals'));
  });
  if (sinceLog !== null && sinceLog >= 3) push('warn', `Nothing logged in Finance for ${sinceLog} days. Log what you spent.`, 'Log it', go('finance'));
  if (openLeads.filter(l => !l.nextActionDate).length) push('info', `${openLeads.filter(l => !l.nextActionDate).length} open lead${openLeads.filter(l => !l.nextActionDate).length === 1 ? ' has' : 's have'} no next step. A lead without a date gets forgotten.`, 'Pipeline', go('pipeline'));
  if (nextBlock && toMin(nextBlock.start) > nowMin && toMin(nextBlock.start) - nowMin <= 120) push('info', `Next up: ${nextBlock.title} at ${fmtTime(nextBlock.start)}.`, 'Schedule', go('schedule'));
  courses.forEach(c => {
    const cs = courseStats(c, timers, todayStr);
    if (!cs.total) { push('info', `${c.code} has no syllabus yet. Paste it in so you can track it.`, 'Studies', go('studies')); return; }
    if (cs.left === 0 || cs.daysToExam === null || cs.daysToExam < 0) return;
    if (cs.daysToExam <= 14) push(cs.daysToExam <= 7 ? 'danger' : 'warn', `${c.code} exam in ${cs.daysToExam} day${cs.daysToExam === 1 ? '' : 's'} with ${cs.left} topic${cs.left === 1 ? '' : 's'} uncovered.`, 'Studies', go('studies'));
    else if (cs.behind) push('warn', `${c.code} is behind: ${Math.round(cs.pct * 100)}% covered, ${Math.round(cs.elapsed * 100)}% of the term gone. ${Math.ceil(cs.perWeek)} topics a week from here.`, 'Studies', go('studies'));
  });
  todos.filter(t => t.addedDate > todayStr && t.addedDate <= addDays(todayStr, 3) && !taskDone(t))
    .sort((a, b) => a.addedDate.localeCompare(b.addedDate)).slice(0, 3)
    .forEach(t => push(t.addedDate === addDays(todayStr, 1) ? 'danger' : 'warn', `${t.title} is due ${t.addedDate === addDays(todayStr, 1) ? 'tomorrow' : fmtDate(t.addedDate, { weekday:'long' })}.`, 'Tasks', go('todos')));
  if (DESKTOP?.venture && !ventureChecked) push(hour >= 12 ? 'warn' : 'info', "Dorm Dash's daily check hasn't been read today. +10 XP.", 'Ventures', go('ventures'));
  if (hour >= 18 && !wroteTide) push('info', "Write tonight's Tide Log before bed. +15 XP.", null, null);
  const order = { danger: 0, warn: 1, info: 2 };
  moves.sort((a, b) => order[a.lv] - order[b.lv]);
  const dangerCount = moves.filter(m => m.lv === 'danger').length;

  const verdict = dangerCount >= 3 ? 'A lot needs you today. Start at the top.'
    : dangerCount ? 'Handle the red items first. Everything else can wait.'
    : moves.length ? 'On track. Keep the streak going.' : 'All clear. Use the time to find new clients.';

  const weekCount = window.innerWidth >= 1024 ? 26 : 16;
  const weeks = getLast20Weeks(weekCount);

  return (
    <div className="section home">
      <div className="card home-hero span-8">
        <div className="home-greet">{greet}, Jadan.</div>
        <div className="home-date">{fmtDate(todayStr, { weekday:'long', month:'long', day:'numeric' })}</div>
        <div className="home-verdict">{verdict}</div>
        <div className="home-stats">
          <div><b className={habitsLeft.length ? '' : 'good'}>{activeHabits.length - habitsLeft.length}/{activeHabits.length}</b><span>habits</span></div>
          <div><b className={tasksDone >= 5 ? 'good' : ''}>{tasksDone}/{Math.max(5, todayTasks.length)}</b><span>tasks</span></div>
          <div><b>{fmtHM((focusByDay(timers)[todayStr] || 0) + timers.filter(t => t.runningSince).reduce((s2, t) => s2 + timerRunSec(t, Date.now()), 0))}</b><span>focused</span></div>
          <div><b className={dangerCount ? 'bad' : 'good'}>{dangerCount}</b><span>urgent</span></div>
        </div>
        <div className="home-level">
          <span className="home-lv">Level {level}</span>
          <div className="xp-track home-xp"><div className="xp-fill" style={{ width: `${progress * 100}%` }}/></div>
          <span className="home-xpn">{xpInLevel} / 500 XP</span>
        </div>
      </div>

      <div className="card home-money span-4">
        <div className="card-label">{monthName(thisMonth, { month:'long' })} money</div>
        <div className="row-between" style={{ alignItems:'flex-end' }}>
          <div className={`fin-net ${net >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 34 }}>{J(net)}</div>
          <div className="home-target">of {J(target)}</div>
        </div>
        <div className="goal-bar" style={{ margin:'0.6rem 0 0.9rem' }}>
          <div className="goal-fill" style={{ width: `${Math.max(0, Math.min(100, (net / target) * 100))}%` }}/>
          <div className="goal-time" style={{ left: `${(today / dim) * 100}%` }}/>
        </div>
        <dl className="fin-kv">
          <div><dt>Safe to spend</dt><dd className={safeLeft > 0 ? 'good' : 'bad'}>{safeLeft > 0 ? `${J(safePerDay)}/day` : 'Nothing'}</dd></div>
          <div><dt>Cash on hand</dt><dd className={cash < 0 ? 'bad' : ''}>{J(cash)}</dd></div>
          <div><dt>Owed to you</dt><dd className={owedRet ? 'bad' : ''}>{J(owedRet)}</dd></div>
        </dl>
        {safeLeft <= 0 && <div className="goal-hint" style={{ marginTop:'0.5rem' }}>{expectedInc === 0 ? 'No income coming in. Every dollar spent is borrowed from the future.' : `Spending past ${J(allowed)} this month means missing your minimum.`}</div>}
        {safeLeft > 0 && <div className="goal-hint" style={{ marginTop:'0.5rem' }}>{J(safeLeft)} left this month before you dip under your minimum.</div>}
      </div>

      <div className="card home-moves span-8">
        <div className="row-between" style={{ marginBottom:'0.6rem' }}>
          <span className="card-label" style={{ margin:0 }}>Next moves</span>
          <span className="fin-delta">{moves.length} item{moves.length === 1 ? '' : 's'}</span>
        </div>
        {moves.length === 0 ? <div className="agenda-empty small">Nothing urgent. Go find the next client.</div> : (
          <ul className="moves">
            {moves.slice(0, 8).map((m, i) => (
              <li key={i} className={`move ${m.lv}`}>
                <span className="move-dot"/>
                <span className="move-text">{m.text}</span>
                {m.cta && <button className="btn-ghost move-cta" onClick={m.act}>{m.cta}</button>}
              </li>
            ))}
            {moves.length > 8 && <li className="move info"><span className="move-dot"/><span className="move-text">+{moves.length - 8} more</span></li>}
          </ul>
        )}
      </div>

      <div className="card span-4">
        <div className="row-between" style={{ marginBottom:'0.6rem' }}>
          <span className="card-label" style={{ margin:0 }}>Today's schedule</span>
          <button className="link-btn" onClick={() => onNav('schedule')}>Open</button>
        </div>
        {blocks.length === 0 ? <div className="agenda-empty small">Nothing scheduled. Protect the time.</div> : (
          <div className="home-sched">
            {blocks.map(b => {
              const state = toMin(b.end) <= nowMin ? 'past' : toMin(b.start) <= nowMin ? 'now' : b === nextBlock ? 'next' : '';
              return (
                <div key={b.id} className={`home-block ${state}`} style={{ '--c': SCHED_HEX[calOf(b)] }}>
                  <span className="home-block-time">{fmtTime(b.start)}</span>
                  <span className="home-block-bar"/>
                  <span className="home-block-title">{b.title}</span>
                  {state === 'now' && <span className="agenda-badge" style={{ '--c': SCHED_HEX[calOf(b)] }}>Now</span>}
                  {state === 'next' && <span className="home-next">next</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dash-row home-quads">
        <div className="card">
          <div className="row-between" style={{ marginBottom:'0.6rem' }}>
            <span className="card-label" style={{ margin:0 }}>Habits · {activeHabits.length - habitsLeft.length}/{activeHabits.length}</span>
            <button className="link-btn" onClick={() => onNav('habits')}>Open</button>
          </div>
          {activeHabits.length === 0 ? <div className="agenda-empty small">No habits yet.</div> : activeHabits.map(h => {
            const done = !!h.completions?.[todayStr], s = habitStreak(h, todayStr);
            return (
              <div key={h.id} className={`home-check ${done ? 'done' : ''}`}>
                <button className="check-btn" onClick={() => onToggleHabit(h, todayStr)} style={{ color: done ? 'var(--sea-400)' : 'var(--mist-3)' }}>{done ? <Icons.check size={20}/> : <Icons.circle size={20}/>}</button>
                <span className="home-check-title">{h.name}</span>
                {s > 0 && <span className="home-streak">🔥{s}</span>}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom:'0.6rem' }}>
            <span className="card-label" style={{ margin:0 }}>Tasks · {tasksDone}/{todayTasks.length}</span>
            <button className="link-btn" onClick={() => onNav('todos')}>Open</button>
          </div>
          {todayTasks.slice(0, 7).map(t => {
            const done = !!t.doneOn?.[todayStr];
            return (
              <div key={t.id} className={`home-check ${done ? 'done' : ''}`}>
                <button className="check-btn" onClick={() => onToggleTodo(t)} style={{ color: done ? '#ff9a4a' : 'var(--mist-3)' }}>{done ? <Icons.check size={20}/> : <Icons.circle size={20}/>}</button>
                <span className="home-check-title">{t.starred ? '★ ' : ''}{t.title}</span>
              </div>
            );
          })}
          <input className="input home-add" value={taskDraft} onChange={e => setTaskDraft(e.target.value)} placeholder={todayTasks.length < 5 ? `Add a task (${5 - todayTasks.length} to go)…` : 'Add a task…'}
            onKeyDown={e => { if (e.key === 'Enter' && taskDraft.trim()) { onAddTodo({ title: taskDraft.trim(), note: '' }); setTaskDraft(''); } }}/>
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom:'0.6rem' }}>
            <span className="card-label" style={{ margin:0 }}>Focus</span>
            <button className="link-btn" onClick={() => onNav('focus')}>Open</button>
          </div>
          {activeTimers.length === 0 ? <div className="agenda-empty small">No timers running. <button className="link-btn" onClick={() => onNav('focus')}>Set one</button></div>
            : activeTimers.sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 4).map(t => {
              const pct = timerElapsed(t, Date.now()) / timerTargetSec(t);
              const d = Math.round((parseLocal(t.deadline) - parseLocal(todayStr)) / 864e5);
              return (
                <div key={t.id} className="dash-focus" style={{ '--liq': FOCUS_HEX[t.category] || '#ff9a4a' }}>
                  <div className="row-between"><span>{t.runningSince ? '● ' : ''}{t.title}</span><span className={d <= 1 ? 'bad' : ''}>{d === 0 ? 'today' : d === 1 ? 'tomorrow' : `${d}d`}</span></div>
                  <div className="dash-focus-bar"><div style={{ width: `${pct * 100}%` }}/></div>
                </div>
              );
            })}
        </div>

        <TideLog journal={journal} todayStr={todayStr} onSave={onSaveJournal}/>
      </div>

      <div className="dash-row wide">
        <BalanceCard schedule={schedule} timers={timers} todayStr={todayStr} targets={balance} onSetTargets={onSetBalance}/>
        <VelocityTracker leads={leads} finances={finances} habits={activeHabits} todos={todos} todayStr={todayStr} xp={xp}/>
        <div className="card fade-in">
          <div className="card-label">Habit consistency · {weekCount} weeks</div>
          <div style={{ overflowX:'auto' }}>
            <div style={{ display:'flex', gap:'3px', minWidth:'max-content' }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                  {week.map(date => {
                    const done = activeHabits.filter(h => h.completions?.[date]).length;
                    const lv = activeHabits.length === 0 ? 0 : Math.ceil((done / activeHabits.length) * 4);
                    return <div key={date} className={`hcell lv${lv}${date === todayStr ? ' today' : ''}`} title={`${date}: ${done}/${activeHabits.length}`}/>;
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(l => <div key={l} className={`hcell lv${l}`}/>)}<span>More</span></div>
        </div>
      </div>
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
  const { confirm: pipeConfirm, ConfirmUI: PipeConfirmUI } = useConfirm();
  const handleDeleteLead = async (id, name) => {
    const ok = await pipeConfirm({ message: `Remove "${name}" from pipeline? This cannot be undone.`, label: 'Delete Lead', danger: true });
    if (ok) onDelete(id);
  };
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

  // ── Follow-ups: every open lead should have a next step with a date ──────
  const todayStr = localDateStr();
  const openLeads = leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status));
  const openValue = openLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const won = leads.filter(l => l.status === 'Paid').length;
  const closedLost = leads.filter(l => ['Lost','Flaked'].includes(l.status)).length;
  const winRate = won + closedLost ? Math.round((won / (won + closedLost)) * 100) : null;
  const followUps = openLeads.filter(l => l.nextActionDate && l.nextActionDate <= todayStr).sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));
  const noNextStep = openLeads.filter(l => !l.nextActionDate);
  const lateBy = l => Math.round((parseLocal(todayStr) - parseLocal(l.nextActionDate)) / 864e5);
  const markContacted = l => onUpdate(l.id, {
    status: l.status === 'New' ? 'Contacted' : l.status, lastContacted: todayStr,
    nextActionDate: addDays(todayStr, 3), nextAction: l.nextAction || 'Follow up',
  });

  return (
    <div className="section pipeline">
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Pipeline</div></div>
        <button className="btn-primary" onClick={()=>setForm({})}><Icons.plus size={14}/> Lead</button>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Open pipeline</span><b className="good">{J(openValue)}</b><span className="fin-delta">{openLeads.length} open lead{openLeads.length === 1 ? '' : 's'}</span></div>
        <div className="fin-tile"><span>Win rate</span><b className={winRate !== null && winRate < 20 ? 'bad' : ''}>{winRate === null ? '—' : `${winRate}%`}</b><span className="fin-delta">{won} won · {closedLost} lost</span></div>
        <div className="fin-tile"><span>Follow-ups due</span><b className={followUps.length ? 'bad' : 'good'}>{followUps.length}</b><span className="fin-delta">{followUps.length ? 'do them today' : 'all caught up'}</span></div>
        <div className="fin-tile"><span>No next step</span><b className={noNextStep.length ? 'warn' : ''}>{noNextStep.length}</b><span className="fin-delta">leads without a date</span></div>
      </div>

      {followUps.length > 0 && (
        <div className="card pl-follow">
          <div className="card-label">Follow-ups due</div>
          {followUps.map(l => (
            <div key={l.id} className="pl-follow-row">
              <div className="pl-follow-main">
                <span className="pl-follow-name">{l.businessName}</span>
                <span className="pl-follow-meta">{l.status}{l.nextAction ? ` · ${l.nextAction}` : ''}{lateBy(l) > 0 ? ` · ${lateBy(l)}d late` : ' · today'}</span>
              </div>
              {l.phone && <a className="wa-btn" href={`https://wa.me/${l.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"><Icons.whatsapp size={13}/> WhatsApp</a>}
              <button className="btn-primary pl-done" onClick={() => markContacted(l)} title="Marks them contacted and books the next follow-up in 3 days">✓ Contacted</button>
            </div>
          ))}
        </div>
      )}

      {/* Search + controls */}
      <div style={{display:'flex',gap:'0.5rem'}}>
        <input
          className="input" style={{flex:1}}
          value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
          placeholder="Search businesses..."/>
        <button
          className={`btn-ghost ${showFilters?'active':''}`}
          style={{flexShrink:0,position:'relative',padding:'0.5rem 0.75rem'}}
          onClick={()=>setShowFilters(v=>!v)} title="Filters">
          <Icons.filter size={14}/>
          {activeFilters>0 && (
            <span style={{position:'absolute',top:-4,right:-4,background:'#1adb8a',color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{activeFilters}</span>
          )}
        </button>
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
              <button className="btn-ghost" style={{flex:1,justifyContent:'center',color:'#ff5a36'}}
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
                        {l.priority==='high' && <span className="badge" style={{background:'rgba(239,68,68,0.1)',color:'#ff5a36',border:'1px solid rgba(239,68,68,0.2)'}}>🔥 High</span>}
                        {alert?.isOverdue && <span className="badge badge-danger">⚠ Overdue</span>}
                        {!['Paid','Flaked','Lost'].includes(l.status) && l.nextActionDate && l.nextActionDate <= todayStr && <span className="badge badge-danger">Follow up{lateBy(l) > 0 ? ` · ${lateBy(l)}d late` : ' today'}</span>}
                        {!['Paid','Flaked','Lost'].includes(l.status) && !l.nextActionDate && <span className="badge" style={{background:'rgba(230,196,124,0.1)',color:'var(--gold-300)',border:'1px solid rgba(230,196,124,0.3)'}}>No next step</span>}
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
                      <div style={{display:'flex',gap:'0.4rem',justifyContent:'flex-end',flexWrap:'wrap'}}>
                        {!['Paid','Flaked','Lost'].includes(l.status) && (
                          <button className="btn-ghost" style={{fontSize:'11px',padding:'0.3rem 0.6rem'}} onClick={() => markContacted(l)} title="Next follow-up in 3 days">✓ Contacted</button>
                        )}
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
                        <button className="btn-ghost" style={{fontSize:'11px',padding:'0.3rem 0.6rem',borderColor:'rgba(var(--p3),0.25)',color:'var(--bolt)',background:'rgba(var(--p3),0.05)'}}
                          onClick={async ()=>{
                            const prompt = `LEAD ANALYSIS REQUEST\n\nBusiness: ${l.businessName}\nStatus: ${l.status}\nLocation: ${l.location||'Jamaica'}\nValue: J$${Number(l.value||0).toLocaleString()}\nPhone: ${l.phone||'Not found'}\nNotes: ${l.notes||'None'}\nLast action: ${l.nextAction||'None'} on ${l.nextActionDate||'N/A'}\nOutreach draft: ${l.outreachDraft||'None'}\n\nAs my business AI, analyse this lead and tell me:\n1. What is the best next move right now?\n2. What should I say to them?\n3. What is the probability of closing?\n4. Any red flags?`;
                            window._openJaxonChat && window._openJaxonChat(prompt);
                          }}>
                          ⚡ Ask JAXON
                        </button>
                        <button className="icon-btn mint-btn" onClick={()=>setPayForm(l)}><Icons.dollar size={13}/></button>
                        <button className="icon-btn" onClick={()=>setForm(l)}><Icons.edit size={13}/></button>
                        <button className="icon-btn danger-btn" onClick={()=>handleDeleteLead(l.id,l.businessName)}><Icons.trash size={13}/></button>
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
      {PipeConfirmUI}
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
    notes:'', nextAction:'First contact', nextActionDate:localDateStr(),
    outreachDraft:'', ...data
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
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
  const [date,setDate]=useState(localDateStr());
  return (
    <Modal title={`Log Payment — ${lead.businessName}`} onClose={onClose}>
      {existing.length>0&&(
        <div className="payment-log">
          <div className="card-label" style={{margin:0,marginBottom:'0.5rem'}}>Existing Payments</div>
          {existing.map(p=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'0.25rem 0',
              fontSize:'12px',borderBottom:'1px solid rgba(var(--p3),0.06)'}}>
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
const habitCreated = (h, todayStr) => (h.createdAt?.toDate ? localDateStr(h.createdAt.toDate()) : todayStr);
const habitStreakFrom = (h, start) => { let n = 0, d = start; while (h.completions?.[d]) { n++; d = addDays(d, -1); } return n; };
const habitStreak = (h, todayStr) => (h.completions?.[todayStr] ? habitStreakFrom(h, todayStr) : habitStreakFrom(h, addDays(todayStr, -1)));
function habitBest(h) {
  let best = 0, run = 0, prev = null;
  Object.keys(h.completions || {}).filter(k => h.completions[k]).sort().forEach(d => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  });
  return best;
}
function habitRate(h, todayStr, days = 30) {
  const from = [addDays(todayStr, -(days - 1)), habitCreated(h, todayStr)].sort()[1];
  const total = Math.round((parseLocal(todayStr) - parseLocal(from)) / 864e5) + 1;
  let done = 0;
  for (let i = 0; i < total; i++) if (h.completions?.[addDays(from, i)]) done++;
  return total > 0 ? done / total : 0;
}

function Habits({habits,weekDates,todayStr,onAdd,onUpdate,onDelete,onToggle}) {
  const { confirm, ConfirmUI } = useConfirm();
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const weeks = getLast20Weeks();
  const yesterday = addDays(todayStr, -1);
  const evening = new Date().getHours() >= 18;
  const active = habits.filter(h => !h.archivedAt);
  const archived = habits.filter(h => h.archivedAt);
  const doneToday = active.filter(h => h.completions?.[todayStr]).length;
  const atRisk = active.filter(h => !h.completions?.[todayStr] && habitStreak(h, todayStr) > 0);
  const avgRate = active.length ? active.reduce((s, h) => s + habitRate(h, todayStr), 0) / active.length : 0;
  const longest = active.reduce((m, h) => Math.max(m, habitStreak(h, todayStr)), 0);
  const createdMs = h => (h.createdAt?.toDate ? h.createdAt.toDate().getTime() : Date.now());

  const archive = async h => {
    if (await confirm({ message: `Stop tracking "${h.name}"? It won't cost XP from tomorrow. Its history and XP so far stay.`, label: 'Archive', danger: false })) {
      onUpdate(h.id, { archivedAt: todayStr }); setForm(null);
    }
  };
  const remove = async h => {
    if (await confirm({ message: `Delete "${h.name}"? Only allowed right after creating it.`, label: 'Delete', danger: true })) { onDelete(h.id); setForm(null); }
  };

  const list = showArchived ? archived : active;
  return (
    <div className="section habits">
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Habits</div></div>
        <div className="seg">
          <button className={!showArchived ? 'on' : ''} onClick={() => setShowArchived(false)}>Tracking {active.length}</button>
          <button className={showArchived ? 'on' : ''} onClick={() => setShowArchived(true)}>Archived {archived.length}</button>
        </div>
        <button className="btn-primary" onClick={() => setForm({})}><Icons.plus size={14}/> Habit</button>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Done today</span><b className={active.length && doneToday === active.length ? 'good' : ''}>{doneToday}/{active.length}</b><span className="fin-delta">+{doneToday * 10} XP today</span></div>
        <div className="fin-tile"><span>Longest streak</span><b>{longest} day{longest === 1 ? '' : 's'}</b><span className="fin-delta">still alive</span></div>
        <div className="fin-tile"><span>Last 30 days</span><b className={avgRate >= 0.8 ? 'good' : avgRate < 0.5 ? 'bad' : ''}>{Math.round(avgRate * 100)}%</b><span className="fin-delta">of days completed</span></div>
        <div className="fin-tile"><span>Missed day costs</span><b className="bad">−10 XP</b><span className="fin-delta">per habit, judged next morning</span></div>
      </div>

      {!showArchived && atRisk.length > 0 && (
        <ul className="fin-findings focus-warn">
          {atRisk.map(h => (
            <li key={h.id} className={evening ? 'danger' : 'warn'}>
              Your {habitStreak(h, todayStr)}-day "{h.name}" streak ends tonight if you skip it.
            </li>
          ))}
        </ul>
      )}

      {list.length === 0 ? (
        <div className="card agenda-empty">{showArchived ? 'Nothing archived.' : 'No habits yet. Start with one you can do even on your worst day.'}
          {!showArchived && <> <button className="link-btn" onClick={() => setForm({})}>Add a habit</button></>}
        </div>
      ) : (
        <div className="habit-list">
          {list.map(h => {
            const done = !!h.completions?.[todayStr];
            const streak = habitStreak(h, todayStr), best = habitBest(h), rate = habitRate(h, todayStr);
            const open = expanded === h.id;
            const created = habitCreated(h, todayStr);
            return (
              <div key={h.id} className={`card hb-card ${done ? 'done' : ''}`}>
                <div className="hb-row">
                  {!h.archivedAt && (
                    <button className={`hb-check ${done ? 'on' : ''}`} onClick={() => onToggle(h, todayStr)} title={done ? 'Undo' : 'Done today'}>
                      {done ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                    </button>
                  )}
                  <div className="hb-main">
                    <div className="hb-name">{h.name}</div>
                    <div className="hb-meta">
                      <span className={streak ? 'hb-fire' : ''}>🔥 {streak}</span>
                      <span>best {best}</span>
                      <span className={rate >= 0.8 ? 'good' : rate < 0.5 ? 'bad' : ''}>{Math.round(rate * 100)}% · 30d</span>
                      {h.archivedAt && <span>archived {fmtDate(h.archivedAt, { month:'short', day:'numeric' })}</span>}
                    </div>
                  </div>
                  <div className="hb-week">
                    {weekDates.map((d, i) => {
                      const on = !!h.completions?.[d];
                      const editable = !h.archivedAt && (d === todayStr || d === yesterday);
                      const state = on ? 'on' : d > todayStr || d < created ? 'future' : d === todayStr ? 'today' : 'miss';
                      return (
                        <button key={d} className={`hb-day ${state} ${editable ? 'edit' : ''}`} disabled={!editable}
                          onClick={() => onToggle(h, d)} title={`${fmtDate(d, { weekday:'long', month:'short', day:'numeric' })}${editable ? '' : ' (locked)'}`}>
                          <span>{DAYS[i][0]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="row-gap">
                    <button className="icon-btn" title="History" onClick={() => setExpanded(open ? null : h.id)} style={{ transform: open ? 'rotate(180deg)' : 'none' }}><Icons.chevDown size={13}/></button>
                    <button className="icon-btn" title="Edit" onClick={() => setForm(h)}><Icons.edit size={12}/></button>
                  </div>
                </div>
                {open && (
                  <div className="hb-history">
                    <div className="card-label" style={{ marginBottom:'0.5rem' }}>20 weeks · only today and yesterday can be changed</div>
                    <div style={{ overflowX:'auto' }}>
                      <div style={{ display:'flex', gap:'3px', minWidth:'max-content' }}>
                        {weeks.map((week, wi) => (
                          <div key={wi} style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                            {week.map(date => <div key={date} className={`hcell small ${h.completions?.[date] ? 'lv4' : 'lv0'}${date === todayStr ? ' today' : ''}`} title={date}/>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {form !== null && (
        <Modal title={form.id ? 'Edit Habit' : 'New Habit'} onClose={() => setForm(null)}>
          <Field label="Habit"><input className="input" autoFocus defaultValue={form.name || ''} id="hname" placeholder="e.g. Code 1 hour, 10 cold messages, gym"/></Field>
          {!form.id && <div className="focus-preview"><div><b className="good">+10 XP</b> every day you do it. <b className="bad">−10 XP</b> every day you don't.</div><div className="muted">Pick something you can do daily. You can only tick today or yesterday.</div></div>}
          <ModalFoot onClose={() => setForm(null)} onSave={() => { const n = document.getElementById('hname').value.trim(); if (n) { form.id ? onUpdate(form.id, { name: n }) : onAdd({ name: n }); setForm(null); } }}/>
          {form.id && Date.now() - createdMs(form) < DELETE_GRACE_MS && <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={() => remove(form)}><Icons.trash size={13}/> Delete (created by mistake)</button>}
          {form.id && Date.now() - createdMs(form) >= DELETE_GRACE_MS && !form.archivedAt && <button className="btn-ghost" style={{ justifyContent:'center' }} onClick={() => archive(form)}>Archive (stop tracking)</button>}
          {form.archivedAt && <button className="btn-ghost" style={{ justifyContent:'center' }} onClick={() => { onUpdate(form.id, { archivedAt: null }); setForm(null); }}>Start tracking again</button>}
        </Modal>
      )}
      {ConfirmUI}
    </div>
  );
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
const taskDone = t => Object.values(t.doneOn || {}).some(Boolean);

function Todos({todos,todayStr,onAdd,onUpdate,onDelete,onToggle}) {
  const { confirm, ConfirmUI } = useConfirm();
  const [form, setForm] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [star, setStar] = useState(false);
  const yesterday = addDays(todayStr, -1);

  const today = todos.filter(t => t.addedDate === todayStr);
  const doneCount = today.filter(t => t.doneOn?.[todayStr]).length;
  const yList = todos.filter(t => t.addedDate === yesterday);
  const yMissed = yList.filter(t => !t.doneOn?.[yesterday]).length;
  const yDone = yList.length - yMissed;
  const yPenalty = yMissed * 10 + (yList.length > 0 && yDone < 5 ? 10 : 0);
  const unfinished = todos
    .filter(t => t.addedDate < todayStr && t.addedDate >= addDays(todayStr, -7) && !taskDone(t) && !t.movedTo)
    .sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
  // Tasks planned for a later day (coursework deadlines): shown ahead of time
  const upcoming = todos.filter(t => t.addedDate > todayStr).sort((a, b) => a.addedDate.localeCompare(b.addedDate));
  const daysTo = d => Math.round((parseLocal(d) - parseLocal(todayStr)) / 864e5);
  const sorted = [...today].sort((a, b) =>
    (a.doneOn?.[todayStr] ? 1 : 0) - (b.doneOn?.[todayStr] ? 1 : 0) || (b.starred ? 1 : 0) - (a.starred ? 1 : 0));

  const quickAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({ title: newTitle.trim(), note: '', starred: star });
    setNewTitle(''); setStar(false);
  };
  const carry = async t => {
    const ref = await onAdd({ title: t.title, note: t.note || '', starred: !!t.starred, carriedFrom: t.id });
    onUpdate(t.id, { movedTo: ref?.id || true });
  };
  const carryAll = () => unfinished.forEach(carry);
  const remove = async t => {
    if (await confirm({ message: `Delete "${t.title}"?`, label: 'Delete', danger: true })) onDelete(t.id);
  };

  return (
    <div className="section tasks">
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Tasks · {fmtDate(todayStr, { weekday:'long', month:'short', day:'numeric' })}</div></div>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Done today</span><b className={doneCount >= 5 ? 'good' : ''}>{doneCount}/{today.length}</b><span className="fin-delta">+{doneCount * 5} XP</span></div>
        <div className="fin-tile"><span>Daily minimum</span><b className={today.length >= 5 ? 'good' : 'bad'}>{Math.min(today.length, 5)}/5</b><span className="fin-delta">{today.length >= 5 ? 'set' : `add ${5 - today.length} more`}</span></div>
        <div className="fin-tile"><span>Finish at least</span><b className={doneCount >= 5 ? 'good' : ''}>{Math.min(doneCount, 5)}/5</b><span className="fin-delta">or −10 XP tomorrow</span></div>
        <div className="fin-tile"><span>Yesterday</span><b className={yPenalty ? 'bad' : 'good'}>{yList.length ? (yPenalty ? `−${yPenalty} XP` : 'Clean') : '—'}</b><span className="fin-delta">{yList.length ? `${yDone}/${yList.length} done` : 'nothing planned'}</span></div>
      </div>

      <div className="card tk-add">
        <button className={`tk-star ${star ? 'on' : ''}`} onClick={() => setStar(v => !v)} title="Important">★</button>
        <input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && quickAdd()} placeholder="Add a task for today and press Enter…"/>
        <button className="btn-primary icon-only" onClick={quickAdd}><Icons.plus size={16}/></button>
      </div>

      <div className="card tk-list span-8">
        <div className="card-label">Today</div>
        {sorted.length === 0 ? <div className="agenda-empty small">Nothing planned. Five tasks minimum, or it costs you tomorrow.</div> : sorted.map(t => {
          const done = !!t.doneOn?.[todayStr];
          return (
            <div key={t.id} className={`tk-row ${done ? 'done' : ''}`}>
              <button className="check-btn" onClick={() => onToggle(t)} style={{ color: done ? '#ff9a4a' : 'var(--mist-3)' }}>
                {done ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
              </button>
              <button className={`tk-star ${t.starred ? 'on' : ''}`} onClick={() => onUpdate(t.id, { starred: !t.starred })} title="Important">★</button>
              <div className="tk-main">
                <div className="tk-title">{t.title}</div>
                {t.note && <div className="tk-note">{t.note}</div>}
                {t.carriedFrom && <div className="tk-note">carried forward</div>}
              </div>
              {done && <span className="tk-xp">+5</span>}
              <button className="icon-btn" onClick={() => setForm(t)}><Icons.edit size={12}/></button>
              <button className="icon-btn danger-btn" onClick={() => remove(t)}><Icons.trash size={12}/></button>
            </div>
          );
        })}
      </div>

      <div className="card span-4">
        <div className="row-between" style={{ marginBottom:'0.75rem' }}>
          <span className="card-label" style={{ margin:0 }}>Unfinished · last 7 days</span>
          {unfinished.length > 1 && <button className="link-btn" onClick={carryAll}>Carry all</button>}
        </div>
        {unfinished.length === 0 ? <div className="agenda-empty small">Nothing left behind.</div> : unfinished.map(t => (
          <div key={t.id} className="tk-row old">
            <div className="tk-main">
              <div className="tk-title">{t.title}</div>
              <div className="tk-note">{fmtDate(t.addedDate, { weekday:'short', month:'short', day:'numeric' })} · cost −10 XP</div>
            </div>
            <button className="btn-ghost tk-carry" onClick={() => carry(t)}>Carry to today</button>
          </div>
        ))}
        <div className="goal-hint" style={{ marginTop:'0.75rem' }}>A task only counts on the day it's planned. Carrying it forward gives you another shot; the missed day still counts.</div>
      </div>

      {upcoming.length > 0 && (
        <div className="card tk-list">
          <div className="card-label">Coming up · {upcoming.length}</div>
          {upcoming.map(t => {
            const n = daysTo(t.addedDate);
            return (
              <div key={t.id} className="tk-row old">
                <div className="tk-main">
                  <div className="tk-title">{t.title}</div>
                  <div className="tk-note">{fmtDate(t.addedDate, { weekday:'short', month:'short', day:'numeric' })}{t.note ? ` · ${t.note}` : ''}</div>
                </div>
                <span className={`tk-due ${n <= 3 ? 'soon' : ''}`}>{n === 1 ? 'tomorrow' : `${n} days`}</span>
                <button className="icon-btn" onClick={() => setForm(t)}><Icons.edit size={12}/></button>
                <button className="icon-btn danger-btn" onClick={() => remove(t)}><Icons.trash size={12}/></button>
              </div>
            );
          })}
          <div className="goal-hint" style={{ marginTop:'0.75rem' }}>These land in Today on their date. Finish early if you can; the date is the last day, not the plan.</div>
        </div>
      )}

      {form !== null && (
        <Modal title="Edit Task" onClose={() => setForm(null)}>
          <Field label="Task"><input className="input" autoFocus defaultValue={form.title || ''} id="ttitle"/></Field>
          <Field label="Note"><input className="input" defaultValue={form.note || ''} id="tnote"/></Field>
          <ModalFoot onClose={() => setForm(null)} onSave={() => { const t = document.getElementById('ttitle').value.trim(); const n = document.getElementById('tnote').value.trim(); if (t) { onUpdate(form.id, { title: t, note: n }); setForm(null); } }}/>
        </Modal>
      )}
      {ConfirmUI}
    </div>
  );
}

// ─── FOCUS TIMERS ─────────────────────────────────────────────────────────────
// A timer is a bottle: it fills as you work, can be paused, and must be full
// by its deadline. Rules are strict on purpose:
//   - the target can only go up and the deadline can only come sooner
//   - a single session is capped, so a timer left running can't fill itself
//   - after the first few minutes a timer can't be deleted, only given up
const FOCUS_CATS = [
  { id:'Study', hex:'#e6c47c' },
  { id:'Work',  hex:'#e63946' },
  { id:'Build', hex:'#ff9a4a' },
  { id:'Other', hex:'#b89f8b' },
];
const FOCUS_HEX = Object.fromEntries(FOCUS_CATS.map(c => [c.id, c.hex]));
const SESSION_CAP_SEC = 3 * 3600;       // longest single sitting that counts
const DELETE_GRACE_MS = 10 * 60 * 1000; // window to delete a mistake

const timerTargetSec = t => (Number(t.targetMinutes) || 0) * 60;
const timerBonus = t => 20 + Math.round((Number(t.targetMinutes) || 0) / 3);
const timerRunSec = (t, nowMs) => (t.runningSince ? Math.min(SESSION_CAP_SEC, Math.max(0, (nowMs - Date.parse(t.runningSince)) / 1000)) : 0);
const timerElapsed = (t, nowMs) => Math.min(timerTargetSec(t), (Number(t.elapsedSec) || 0) + timerRunSec(t, nowMs));
const timerStatus = (t, todayStr) => t.status === 'done' ? 'done'
  : t.status === 'failed' || (t.deadline && t.deadline < todayStr) ? 'failed' : 'active';
const fmtDur = sec => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
const fmtHM = sec => {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};

// XP from focus: +1 per 10 minutes worked, plus a completion bonus;
// a missed deadline costs the bonus you would have earned.
function focusXP(timers, todayStr) {
  const now = Date.now();
  return timers.reduce((xp, t) => {
    xp += Math.floor(timerElapsed(t, now) / 600);
    const st = timerStatus(t, todayStr);
    if (st === 'done') xp += timerBonus(t);
    if (st === 'failed') xp -= timerBonus(t);
    return xp;
  }, 0);
}

// Seconds of focus that ended on each local day
function focusByDay(timers) {
  const days = {};
  timers.forEach(t => (t.sessions || []).forEach(s => {
    const d = localDateStr(new Date(s.end));
    days[d] = (days[d] || 0) + (Number(s.sec) || 0);
  }));
  return days;
}

// The bottle: liquid level = progress, a moving surface while it runs
function Bottle({ id, pct, color, running, done, failed }) {
  const body = 'M49 8h22v14c0 5 3 8 8 12 11 9 19 19 19 35v104c0 13-9 21-22 21H44c-13 0-22-8-22-21V69c0-16 8-26 19-35 5-4 8-7 8-12z';
  const top = 34, bottom = 194;
  const y = bottom - (bottom - top) * Math.max(0, Math.min(1, pct));
  return (
    <svg className={`bottle ${running ? 'running' : ''} ${done ? 'done' : ''} ${failed ? 'failed' : ''}`} viewBox="0 0 120 200" style={{ '--liq': color }}>
      <defs>
        <clipPath id={`bottle-${id}`}><path d={body}/></clipPath>
        <linearGradient id={`liq-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95"/>
          <stop offset="1" stopColor={color} stopOpacity="0.45"/>
        </linearGradient>
      </defs>
      <g clipPath={`url(#bottle-${id})`}>
        <rect x="0" y="0" width="120" height="200" fill="rgba(12,5,6,0.75)"/>
        <g className="liquid" style={{ transform: `translateY(${y}px)` }}>
          <path className="wave wave-back" d="M0 5 Q15 0 30 5 T60 5 T90 5 T120 5 T150 5 T180 5 T210 5 T240 5 V220 H0Z" fill={color} opacity="0.35"/>
          <path className="wave wave-front" d="M0 5 Q15 10 30 5 T60 5 T90 5 T120 5 T150 5 T180 5 T210 5 T240 5 V220 H0Z" fill={`url(#liq-${id})`}/>
          {running && [18, 44, 70, 92].map((x, i) => <circle key={i} className="bubble" cx={x + 6} cy="160" r={1.4 + (i % 2)} style={{ animationDelay: `${i * 0.7}s` }}/>)}
        </g>
        {[0.25, 0.5, 0.75].map(m => <line key={m} x1="24" x2="34" y1={bottom - (bottom - top) * m} y2={bottom - (bottom - top) * m} className="tick"/>)}
      </g>
      <path d={body} className="glass"/>
      <path d="M33 72c0-10 4-17 10-23" className="shine"/>
      <rect x="46" y="2" width="28" height="9" rx="3" className="cap"/>
    </svg>
  );
}

// Live pill in the header while a timer runs
function FocusPill({ timers, onOpen }) {
  const running = timers.find(t => t.runningSince && t.status !== 'done' && t.status !== 'failed');
  const [, tick] = useState(0);
  useEffect(() => { if (!running) return; const iv = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(iv); }, [running]);
  if (!running) return null;
  const el = timerElapsed(running, Date.now()), target = timerTargetSec(running);
  return (
    <button className="focus-pill" onClick={onOpen} style={{ '--liq': FOCUS_HEX[running.category] || '#ff9a4a' }} title={`${running.title}: ${fmtHM(target - el)} to go`}>
      <span className="focus-pill-fill" style={{ width: `${(el / target) * 100}%` }}/>
      <span className="focus-pill-dot"/>{fmtDur(el)}<span className="focus-pill-title">{running.title}</span>
    </button>
  );
}

function Focus({ timers, courses = [], todayStr, onAdd, onUpdate, onDelete, onStart, onPause }) {
  const { confirm, ConfirmUI } = useConfirm();
  const [filter, setFilter] = useState('active');
  const [form, setForm] = useState(null);
  const [, tick] = useState(0);
  const anyRunning = timers.some(t => t.runningSince);
  useEffect(() => { if (!anyRunning) return; const iv = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(iv); }, [anyRunning]);

  const now = Date.now();
  const withState = timers.map(t => ({ t, st: timerStatus(t, todayStr) }));
  const counts = { active: 0, done: 0, failed: 0 };
  withState.forEach(x => { counts[x.st]++; });
  const shown = withState
    .filter(x => filter === 'all' || x.st === filter)
    .sort((a, b) => (b.t.runningSince ? 1 : 0) - (a.t.runningSince ? 1 : 0) || (a.t.deadline || '').localeCompare(b.t.deadline || ''));

  const byDay = focusByDay(timers);
  const running = timers.find(t => t.runningSince);
  const runToday = running ? timerRunSec(running, now) : 0;
  const todaySec = (byDay[todayStr] || 0) + runToday;
  const monday = mondayOf(todayStr);
  const weekSec = Object.entries(byDay).filter(([d]) => d >= monday).reduce((s, [, v]) => s + v, 0) + runToday;
  const xpFromFocus = focusXP(timers, todayStr);
  const atRisk = withState.filter(x => x.st === 'active').map(({ t }) => {
    const left = timerTargetSec(t) - timerElapsed(t, now);
    const days = Math.max(1, Math.round((parseLocal(t.deadline) - parseLocal(todayStr)) / 864e5) + 1);
    return { t, perDay: left / days };
  }).filter(x => x.perDay > 3 * 3600);

  const giveUp = async t => {
    if (await confirm({ message: `Give up on "${t.title}"? It counts as missed: −${timerBonus(t)} XP.`, label: 'Give up', danger: true })) {
      onUpdate(t.id, { status: 'failed', failedAt: new Date().toISOString(), runningSince: null, elapsedSec: timerElapsed(t, Date.now()) });
      setForm(null);
    }
  };
  const remove = async t => {
    if (await confirm({ message: `Delete "${t.title}"? This is only allowed right after creating it.`, label: 'Delete', danger: true })) { onDelete(t.id); setForm(null); }
  };

  return (
    <div className="section focus">
      <SectionGhost src={akazaArt}/>
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Focus</div></div>
        <div className="seg">
          {[['active', `Active ${counts.active}`], ['done', `Done ${counts.done}`], ['failed', `Missed ${counts.failed}`], ['all', 'All']].map(([id, label]) => (
            <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setForm({})}><Icons.plus size={14}/> Timer</button>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Today</span><b>{fmtHM(todaySec)}</b><span className="fin-delta">{running ? 'running now' : 'focused'}</span></div>
        <div className="fin-tile"><span>This week</span><b>{fmtHM(weekSec)}</b><span className="fin-delta">since Monday</span></div>
        <div className="fin-tile"><span>XP from focus</span><b className={xpFromFocus < 0 ? 'bad' : 'good'}>{xpFromFocus >= 0 ? '+' : ''}{xpFromFocus}</b><span className="fin-delta">counts toward your level</span></div>
        <div className="fin-tile"><span>Missed</span><b className={counts.failed ? 'bad' : ''}>{counts.failed}</b><span className="fin-delta">{counts.done} completed</span></div>
      </div>

      {atRisk.length > 0 && (
        <ul className="fin-findings focus-warn">
          {atRisk.map(({ t, perDay }) => <li key={t.id} className="danger">"{t.title}" now needs {fmtHM(perDay)} a day to finish by {fmtDate(t.deadline, { weekday:'short', month:'short', day:'numeric' })}. Start now.</li>)}
        </ul>
      )}

      {shown.length === 0 ? (
        <div className="card agenda-empty">{filter === 'active' ? 'No active timers. Set a target and a deadline, then fill the bottle.' : 'Nothing here yet.'}
          {filter === 'active' && <> <button className="link-btn" onClick={() => setForm({})}>Create a timer</button></>}
        </div>
      ) : (
        <div className="focus-grid">
          {shown.map(({ t, st }) => {
            const target = timerTargetSec(t), el = timerElapsed(t, now), left = target - el;
            const color = FOCUS_HEX[t.category] || '#ff9a4a';
            const daysLeft = Math.round((parseLocal(t.deadline) - parseLocal(todayStr)) / 864e5);
            const perDay = st === 'active' ? left / Math.max(1, daysLeft + 1) : 0;
            const runningNow = !!t.runningSince && st === 'active';
            return (
              <div key={t.id} className={`card focus-card ${st} ${runningNow ? 'is-running' : ''}`} style={{ '--liq': color }}>
                <div className="focus-head">
                  <div>
                    <div className="focus-title">{t.title}</div>
                    <div className="focus-meta">{t.category}{t.courseId && courses.find(c => c.id === t.courseId) ? ` · ${courses.find(c => c.id === t.courseId).code}` : ''} · {fmtHM(target)} target</div>
                  </div>
                  <button className="icon-btn" title="Edit" onClick={() => setForm(t)}><Icons.edit size={12}/></button>
                </div>
                <div className="focus-body">
                  <Bottle id={t.id} pct={el / target} color={color} running={runningNow} done={st === 'done'} failed={st === 'failed'}/>
                  <div className="focus-stats">
                    <div className="focus-time">{fmtDur(el)}</div>
                    <div className="focus-of">of {fmtDur(target)} · {Math.floor((el / target) * 100)}%</div>
                    {st === 'active' && <>
                      <div className="focus-line"><b>{fmtHM(left)}</b> to go</div>
                      <div className={`focus-line ${daysLeft <= 1 ? 'bad' : ''}`}>
                        Due {fmtDate(t.deadline, { weekday:'short', month:'short', day:'numeric' })} · {daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `${daysLeft} days`}
                      </div>
                      <div className={`focus-line ${perDay > 3 * 3600 ? 'bad' : perDay > 1.5 * 3600 ? 'warn' : ''}`}>{fmtHM(perDay)} a day needed</div>
                    </>}
                    {st === 'done' && <div className="focus-line good">Filled {t.completedAt ? fmtDate(localDateStr(new Date(t.completedAt)), { month:'short', day:'numeric' }) : ''} · +{timerBonus(t)} XP</div>}
                    {st === 'failed' && <div className="focus-line bad">Missed · −{timerBonus(t)} XP</div>}
                    {t.cappedAt && st === 'active' && <div className="focus-line warn">Last session stopped at the 3h cap.</div>}
                  </div>
                </div>
                {st === 'active' && (
                  <div className="focus-actions">
                    {runningNow
                      ? <button className="btn-ghost focus-go" onClick={() => onPause(t)}>❚❚ Pause</button>
                      : <button className="btn-primary focus-go" onClick={() => onStart(t)}>▶ {el > 0 ? 'Resume' : 'Start'}</button>}
                    <span className="focus-xp">+{timerBonus(t)} XP when full · −{timerBonus(t)} if missed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {form !== null && (
        <TimerModal data={form} todayStr={todayStr} courses={courses}
          onSave={d => { form.id ? onUpdate(form.id, d) : onAdd(d); setForm(null); }}
          onGiveUp={form.id && timerStatus(form, todayStr) === 'active' ? () => giveUp(form) : null}
          onDelete={form.id && (!form.createdAt?.toDate || Date.now() - form.createdAt.toDate().getTime() < DELETE_GRACE_MS) && timerElapsed(form, Date.now()) < 60 ? () => remove(form) : null}
          onClose={() => setForm(null)}/>
      )}
      {ConfirmUI}
    </div>
  );
}

function TimerModal({ data, todayStr, courses = [], onSave, onGiveUp, onDelete, onClose }) {
  const editing = !!data.id;
  const locked = editing && timerStatus(data, todayStr) !== 'active';
  const minTarget = editing ? Number(data.targetMinutes) || 0 : 0;
  const [title, setTitle] = useState(data.title || '');
  const [category, setCategory] = useState(data.category || 'Study');
  const [hours, setHours] = useState(data.targetMinutes ? Math.floor(data.targetMinutes / 60) : 2);
  const [mins, setMins] = useState(data.targetMinutes ? data.targetMinutes % 60 : 0);
  const [deadline, setDeadline] = useState(data.deadline || addDays(todayStr, 7));
  const [courseId, setCourseId] = useState(data.courseId || '');
  const targetMinutes = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const days = Math.round((parseLocal(deadline) - parseLocal(todayStr)) / 864e5) + 1;
  const done = editing ? (Number(data.elapsedSec) || 0) / 60 : 0;
  const perDay = days > 0 ? (targetMinutes - done) / days : Infinity;

  const problems = [];
  if (!title.trim()) problems.push('Give it a name.');
  if (targetMinutes < 10) problems.push('Minimum is 10 minutes.');
  if (editing && targetMinutes < minTarget) problems.push(`You can't lower the target below ${fmtHM(minTarget * 60)}.`);
  if (!deadline || deadline < todayStr) problems.push('The deadline must be today or later.');
  if (editing && deadline > data.deadline) problems.push(`You can't push the deadline past ${fmtDate(data.deadline, { month:'short', day:'numeric' })}.`);
  if (perDay > 12 * 60) problems.push('That needs more than 12 hours a day. Be realistic.');

  const bonus = timerBonus({ targetMinutes });
  const presets = [[0, 30], [1, 0], [2, 0], [5, 0], [10, 0], [20, 0]];

  return (
    <Modal title={editing ? 'Edit Timer' : 'New Timer'} onClose={onClose}>
      <Field label="What are you working on?">
        <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. COMP 2201 exam prep" disabled={locked}/>
      </Field>
      <Field label="Type">
        <div className="sched-cals">
          {FOCUS_CATS.map(c => <button key={c.id} type="button" className={`sched-cal ${category === c.id ? 'on' : ''}`} style={{ '--c': c.hex }} onClick={() => !locked && setCategory(c.id)}><span className="dot"/>{c.id}</button>)}
        </div>
      </Field>
      {category === 'Study' && courses.length > 0 && (
        <Field label="Course (study time counts toward its syllabus)">
          <select className="input" value={courseId} onChange={e => setCourseId(e.target.value)} disabled={locked}>
            <option value="">No course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code}{c.title ? ` · ${c.title}` : ''}</option>)}
          </select>
        </Field>
      )}
      <Field label={editing ? `Target (can only go up from ${fmtHM(minTarget * 60)})` : 'Minimum time'}>
        <div className="focus-target">
          <input className="input" type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} disabled={locked}/><span>h</span>
          <input className="input" type="number" min="0" max="59" step="5" value={mins} onChange={e => setMins(e.target.value)} disabled={locked}/><span>m</span>
        </div>
        {!locked && <div className="sched-cals" style={{ marginTop: 8 }}>
          {presets.filter(([h, m]) => h * 60 + m >= minTarget).map(([h, m]) => (
            <button key={`${h}${m}`} type="button" className={`sched-cal ${targetMinutes === h * 60 + m ? 'on' : ''}`} style={{ '--c': '#ff9a4a' }} onClick={() => { setHours(h); setMins(m); }}>{h ? `${h}h` : `${m}m`}</button>
          ))}
        </div>}
      </Field>
      <Field label={editing ? 'Deadline (can only come sooner)' : 'Must be finished by'}>
        <input className="input" type="date" value={deadline} min={todayStr} max={editing ? data.deadline : undefined} onChange={e => setDeadline(e.target.value)} disabled={locked}/>
      </Field>

      {!locked && (
        <div className="focus-preview">
          <div><b className="good">+{bonus} XP</b> when the bottle is full, plus 1 XP for every 10 minutes.</div>
          <div><b className="bad">−{bonus} XP</b> if it isn't full by the end of {deadline ? fmtDate(deadline, { weekday:'long', month:'short', day:'numeric' }) : 'the deadline'}.</div>
          {days > 0 && targetMinutes > 0 && <div>That's about <b>{fmtHM(Math.max(0, perDay) * 60)}</b> a day.</div>}
          {!editing && <div className="muted">Once it's set, the target can't go down and the deadline can't move later.</div>}
        </div>
      )}
      {problems.length > 0 && !locked && <div className="form-warn">{problems[0]}</div>}

      {!locked && <ModalFoot onClose={onClose} onSave={() => problems.length === 0 && onSave({ title: title.trim(), category, targetMinutes, deadline, courseId: category === 'Study' ? courseId : '', ...(editing ? {} : { elapsedSec: 0, runningSince: null, status: 'active', sessions: [] }) })}/>}
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={onDelete}><Icons.trash size={13}/> Delete (created by mistake)</button>}
      {!onDelete && onGiveUp && <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={onGiveUp}>Give up (counts as missed)</button>}
      {locked && <ModalFoot onClose={onClose}/>}
    </Modal>
  );
}

// ─── STUDIES ──────────────────────────────────────────────────────────────────
// Every course carries its full syllabus as a tree (unit → topic → subtopic)
// that gets ticked off. Focus timers attach to a course, and that study time
// is what backs the ticks: nobody is watching, so the timer is the witness.
const MIN_PER_TOPIC = 20;   // focus minutes that back one ticked topic
const XP_PER_TOPIC = 5;
const COURSE_HEX = ['#e6c47c', '#ff9a4a', '#e63946', '#3ab88e', '#7fb4ff', '#c58bd6'];
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const leavesOf = nodes => (nodes || []).flatMap(n => (n.children?.length ? leavesOf(n.children) : [n]));
const nodeDone = n => (n.children?.length ? n.children.every(nodeDone) : !!n.done);
const editTree = (nodes, id, fn) => (nodes || []).flatMap(n => {
  if (n.id === id) { const r = fn(n); return r ? [r] : []; }
  return [{ ...n, children: editTree(n.children, id, fn) }];
});
const setAll = (n, done) => (n.children?.length ? { ...n, children: n.children.map(c => setAll(c, done)) } : { ...n, done, doneAt: done ? new Date().toISOString() : null });

// Turn a pasted outline into a tree. Depth comes from numbering (1, 1.2, 1.2.3)
// or from indentation; "Unit 3", "Week 2", "Module 1" always start a new top level.
function parseOutline(text) {
  const rows = [];
  text.split('\n').forEach(raw => {
    if (!raw.trim()) return;
    const indent = raw.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length;
    let line = raw.trim().replace(/^[-*•·▪◦–]\s+/, '');
    let level = null;
    const num = line.match(/^(\d+(?:\.\d+)*)[.)]?\s+(.*)$/);
    if (num) { level = num[1].split('.').length - 1; line = num[2]; }
    const heading = /^(unit|week|module|chapter|section|part|lecture)\s*\d+/i.test(line);
    rows.push({ title: line.replace(/\s+/g, ' ').trim(), indent, level, heading });
  });
  if (!rows.length) return [];
  const indents = [...new Set(rows.filter(r => r.level === null).map(r => r.indent))].sort((a, b) => a - b);
  const tree = [];
  const stack = [];
  let prev = -1;
  rows.forEach(r => {
    let lvl = r.heading ? 0 : r.level !== null ? r.level : indents.indexOf(r.indent);
    if (!r.heading && r.level === null && stack.length && rows.some(x => x.heading) && lvl === 0) lvl = 1; // plain lines under a "Unit" heading
    lvl = Math.max(0, Math.min(2, Math.min(lvl, prev + 1)));
    const node = { id: newId(), title: r.title, done: false, children: [] };
    stack.length = lvl;
    (lvl === 0 ? tree : stack[lvl - 1].children).push(node);
    stack[lvl] = node;
    prev = lvl;
  });
  return tree;
}

const courseFocusSec = (course, timers, nowMs) => timers.filter(t => t.courseId === course.id)
  .reduce((s, t) => s + (Number(t.elapsedSec) || 0) + timerRunSec(t, nowMs), 0);
function courseStats(course, timers, todayStr) {
  const leaves = leavesOf(course.syllabus), done = leaves.filter(l => l.done).length;
  const focusSec = courseFocusSec(course, timers, Date.now());
  const backed = Math.min(done, Math.floor(focusSec / 60 / MIN_PER_TOPIC));
  const daysToExam = course.examDate ? Math.round((parseLocal(course.examDate) - parseLocal(todayStr)) / 864e5) : null;
  const left = leaves.length - done;
  const perWeek = daysToExam !== null && daysToExam > 0 ? left / (daysToExam / 7) : null;
  // Pace: how far through the term you are vs how far through the syllabus
  const start = course.startDate || (course.createdAt?.toDate ? localDateStr(course.createdAt.toDate()) : todayStr);
  const span = course.examDate ? Math.max(1, Math.round((parseLocal(course.examDate) - parseLocal(start)) / 864e5)) : null;
  const elapsed = span ? Math.min(1, Math.max(0, Math.round((parseLocal(todayStr) - parseLocal(start)) / 864e5) / span)) : null;
  const pct = leaves.length ? done / leaves.length : 0;
  return { total: leaves.length, done, left, pct, focusSec, backed, unbacked: done - backed, daysToExam, perWeek, elapsed, behind: elapsed !== null && left > 0 && pct + 0.05 < elapsed };
}
const studyXP = (courses, timers, todayStr) => courses.reduce((s, c) => s + courseStats(c, timers, todayStr).backed * XP_PER_TOPIC, 0);

// ── Work / School / Life: where this week's hours actually went ─────────────
const BALANCE_DEFAULT = { School: 25, Work: 20, Life: 10 };
const BALANCE_HEX = { School: '#e6c47c', Work: '#e63946', Life: '#3ab88e' };
function weekBalance(schedule, timers, todayStr) {
  const monday = mondayOf(todayStr), nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const out = { School: { planned: 0, done: 0 }, Work: { planned: 0, done: 0 }, Life: { planned: 0, done: 0 } };
  const bucket = b => ({ School: 'School', Work: 'Work', Personal: 'Life' }[calOf(b)] || 'Work');
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    schedule.filter(b => blockOccursOn(b, d)).forEach(b => {
      const mins = Math.max(0, toMin(b.end) - toMin(b.start));
      if (d > todayStr) return;                              // only count what has happened
      const past = d < todayStr ? mins : Math.max(0, Math.min(mins, nowMin - toMin(b.start)));
      out[bucket(b)].planned += past / 60;
    });
  }
  timers.forEach(t => {
    const key = t.category === 'Study' ? 'School' : t.category === 'Other' ? 'Life' : 'Work';
    const sec = (t.sessions || []).filter(s => localDateStr(new Date(s.end)) >= monday).reduce((a, s) => a + (Number(s.sec) || 0), 0) + timerRunSec(t, Date.now());
    out[key].done += sec / 3600;
  });
  const dayNo = Math.round((parseLocal(todayStr) - parseLocal(monday)) / 864e5) + 1;
  return { out, dayNo };
}

function BalanceCard({ schedule, timers, todayStr, targets, onSetTargets }) {
  const [edit, setEdit] = useState(null);
  const t = { ...BALANCE_DEFAULT, ...(targets || {}) };
  const { out, dayNo } = weekBalance(schedule, timers, todayStr);
  const rows = Object.keys(BALANCE_DEFAULT).map(k => {
    const hours = out[k].planned + out[k].done, due = (Number(t[k]) || 0) * (dayNo / 7);
    return { k, hours, target: Number(t[k]) || 0, due, ratio: due > 0 ? hours / due : 1, ...out[k] };
  });
  const worst = rows.filter(r => r.target > 0).sort((a, b) => a.ratio - b.ratio)[0];
  const best = rows.filter(r => r.target > 0).sort((a, b) => b.ratio - a.ratio)[0];
  const verdict = !worst ? 'Set weekly hours for each part of your life.'
    : worst.ratio >= 0.9 ? 'Balanced so far this week. Keep it that way.'
    : `${worst.k} is the one slipping: ${fmtHM(worst.hours * 3600)} of the ${fmtHM(worst.due * 3600)} you should have by today${best && best.k !== worst.k && best.ratio > 1.15 ? `, while ${best.k} is over` : ''}.`;
  return (
    <div className="card balance">
      <div className="row-between" style={{ marginBottom: '0.6rem' }}>
        <span className="card-label" style={{ margin: 0 }}>This week's balance</span>
        <button className="link-btn" onClick={() => setEdit({ ...t })}>Set hours</button>
      </div>
      {rows.map(r => (
        <div key={r.k} className="bal-row" style={{ '--c': BALANCE_HEX[r.k] }}>
          <div className="row-between">
            <span className="bal-name">{r.k}</span>
            <span className={`bal-num ${r.target && r.ratio < 0.75 ? 'bad' : ''}`}>{fmtHM(r.hours * 3600)} <em>/ {r.target}h</em></span>
          </div>
          <div className="goal-bar">
            <div className="goal-fill" style={{ width: `${r.target ? Math.min(100, (r.hours / r.target) * 100) : 0}%`, background: 'var(--c)' }}/>
            {r.target > 0 && <div className="goal-time" style={{ left: `${(dayNo / 7) * 100}%` }} title="Where you should be by today"/>}
          </div>
          <div className="bal-sub">{r.k === 'Life' ? `${fmtHM(r.planned * 3600)} of personal time kept` : `${fmtHM(r.planned * 3600)} ${r.k === 'School' ? 'in class' : 'scheduled'} + ${fmtHM(r.done * 3600)} focused`}</div>
        </div>
      ))}
      <div className="goal-hint" style={{ marginTop: '0.7rem' }}>{verdict}</div>
      {edit && (
        <Modal title="Hours per week" onClose={() => setEdit(null)}>
          <div className="focus-preview"><div>There are 168 hours in a week. Sleep takes about 56. Decide where the rest goes before the week decides for you.</div></div>
          {Object.keys(BALANCE_DEFAULT).map(k => (
            <Field key={k} label={`${k} (hours a week)`}><input className="input" type="number" min="0" max="100" value={edit[k]} onChange={e => setEdit(v => ({ ...v, [k]: e.target.value }))}/></Field>
          ))}
          <ModalFoot onClose={() => setEdit(null)} onSave={() => { onSetTargets(Object.fromEntries(Object.keys(BALANCE_DEFAULT).map(k => [k, Math.max(0, Number(edit[k]) || 0)]))); setEdit(null); }}/>
        </Modal>
      )}
    </div>
  );
}

function Studies({ courses, timers, schedule, todayStr, balance, onSetBalance, onAdd, onUpdate, onDelete, onAddTimer, onStartTimer, onPauseTimer }) {
  const { confirm, ConfirmUI } = useConfirm();
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [paste, setPaste] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [draft, setDraft] = useState({});
  const [timerForm, setTimerForm] = useState(null);
  const [, tick] = useState(0);
  const anyRunning = timers.some(t => t.runningSince && t.courseId);
  useEffect(() => { if (!anyRunning) return; const iv = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(iv); }, [anyRunning]);

  const stats = Object.fromEntries(courses.map(c => [c.id, courseStats(c, timers, todayStr)]));
  const list = [...courses].sort((a, b) => (a.examDate || '9999').localeCompare(b.examDate || '9999') || (a.code || '').localeCompare(b.code || ''));
  const course = courses.find(c => c.id === sel) || list[0] || null;
  const st = course ? stats[course.id] : null;
  const hex = c => c.color || COURSE_HEX[Math.max(0, courses.indexOf(c)) % COURSE_HEX.length];

  const totalLeft = courses.reduce((s, c) => s + stats[c.id].left, 0);
  const totalDone = courses.reduce((s, c) => s + stats[c.id].done, 0);
  const weekSec = timers.filter(t => t.category === 'Study').reduce((s, t) => s + (t.sessions || []).filter(x => localDateStr(new Date(x.end)) >= mondayOf(todayStr)).reduce((a, x) => a + (Number(x.sec) || 0), 0) + timerRunSec(t, Date.now()), 0);
  const nextExam = list.find(c => c.examDate && stats[c.id].daysToExam >= 0);

  // Courses seen in the School schedule that have no syllabus yet
  const codes = [...new Set(schedule.filter(b => calOf(b) === 'School').map(b => (b.title.match(/[A-Za-z]{3,4}\s?\d{4}/) || [])[0]).filter(Boolean).map(c => c.toUpperCase().replace(/\s/g, '').replace(/^([A-Z]+)(\d+)$/, '$1 $2')))];
  const missing = codes.filter(code => !courses.some(c => (c.code || '').toUpperCase().replace(/\s/g, '') === code.replace(/\s/g, '')));

  const save = syllabus => onUpdate(course.id, { syllabus });
  const toggle = n => save(editTree(course.syllabus, n.id, x => setAll(x, !nodeDone(x))));
  const addUnder = (parentId, key) => {
    const title = (draft[key] || '').trim();
    if (!title) return;
    const node = { id: newId(), title, done: false, children: [] };
    save(parentId ? editTree(course.syllabus, parentId, x => ({ ...x, children: [...(x.children || []), node] })) : [...(course.syllabus || []), node]);
    setDraft(d => ({ ...d, [key]: '' }));
  };
  const rename = n => { const title = window.prompt('Rename', n.title); if (title && title.trim()) save(editTree(course.syllabus, n.id, x => ({ ...x, title: title.trim() }))); };
  const removeNode = async n => {
    const count = leavesOf([n]).length;
    if (await confirm({ message: `Remove "${n.title}"${n.children?.length ? ` and its ${count} topic${count === 1 ? '' : 's'}` : ''}?`, label: 'Remove', danger: true })) save(editTree(course.syllabus, n.id, () => null));
  };
  const removeCourse = async c => {
    if (await confirm({ message: `Delete ${c.code} and its whole syllabus? Its focus timers stay.`, label: 'Delete', danger: true })) { onDelete(c.id); setForm(null); setSel(null); }
  };
  const applyPaste = () => {
    const tree = parseOutline(paste.text);
    if (!tree.length) return;
    save(paste.mode === 'replace' ? tree : [...(course.syllabus || []), ...tree]);
    setPaste(null);
  };

  const renderNode = (n, depth) => {
    const hasKids = n.children?.length > 0;
    const done = nodeDone(n), kids = leavesOf([n]);
    const isClosed = collapsed[n.id] ?? (depth === 0 && done);
    return (
      <div key={n.id} className={`sy-node d${depth}`}>
        <div className={`sy-row ${done ? 'done' : ''}`}>
          {hasKids && depth < 2
            ? <button className="sy-caret" onClick={() => setCollapsed(c => ({ ...c, [n.id]: !isClosed }))} style={{ transform: isClosed ? 'rotate(-90deg)' : 'none' }}><Icons.chevDown size={12}/></button>
            : <span className="sy-caret"/>}
          <button className={`sy-box ${done ? 'on' : hasKids && kids.some(k => k.done) ? 'part' : ''}`} onClick={() => toggle(n)} title={hasKids ? (done ? 'Untick all' : 'Tick all') : 'Tick'}>{done ? '✓' : ''}</button>
          <span className="sy-title" onClick={() => !hasKids && toggle(n)}>{n.title}</span>
          {hasKids && <span className="sy-count">{kids.filter(k => k.done).length}/{kids.length}</span>}
          {editing && (
            <span className="row-gap">
              <button className="icon-btn" title="Rename" onClick={() => rename(n)}><Icons.edit size={11}/></button>
              <button className="icon-btn danger-btn" title="Remove" onClick={() => removeNode(n)}><Icons.trash size={11}/></button>
            </span>
          )}
        </div>
        {!isClosed && (hasKids || (editing && depth < 2)) && (
          <div className="sy-kids">
            {(n.children || []).map(c => renderNode(c, depth + 1))}
            {editing && depth < 2 && (
              <input className="input sy-add" value={draft[n.id] || ''} placeholder={depth === 0 ? 'Add a topic…' : 'Add a subtopic…'}
                onChange={e => setDraft(d => ({ ...d, [n.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addUnder(n.id, n.id)}/>
            )}
          </div>
        )}
      </div>
    );
  };

  const linked = course ? timers.filter(t => t.courseId === course.id) : [];
  return (
    <div className="section studies">
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Studies</div></div>
        <button className="btn-primary" onClick={() => setForm({})}><Icons.plus size={14}/> Course</button>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Topics covered</span><b className="good">{totalDone}</b><span className="fin-delta">{totalLeft} still to go</span></div>
        <div className="fin-tile"><span>Studied this week</span><b>{fmtHM(weekSec)}</b><span className="fin-delta">on focus timers</span></div>
        <div className="fin-tile"><span>Next exam</span><b className={nextExam && stats[nextExam.id].daysToExam <= 14 ? 'bad' : ''}>{nextExam ? `${stats[nextExam.id].daysToExam}d` : '—'}</b><span className="fin-delta">{nextExam ? `${nextExam.code} · ${fmtDate(nextExam.examDate, { month:'short', day:'numeric' })}` : 'no exam dates set'}</span></div>
        <div className="fin-tile"><span>Behind pace</span><b className={courses.some(c => stats[c.id].behind) ? 'bad' : 'good'}>{courses.filter(c => stats[c.id].behind).length}</b><span className="fin-delta">of {courses.length} course{courses.length === 1 ? '' : 's'}</span></div>
      </div>

      {missing.length > 0 && (
        <div className="card sy-missing">
          <span>Your timetable has {missing.length === 1 ? 'a course' : 'courses'} with no syllabus here yet:</span>
          {missing.map(code => <button key={code} className="btn-ghost tk-carry" onClick={() => setForm({ code })}>+ {code}</button>)}
        </div>
      )}

      <div className="span-4 sy-left">
        <div className="card cl-list" style={{ position: 'static', maxHeight: 'none' }}>
          {list.length === 0 ? <div className="agenda-empty small">No courses yet. <button className="link-btn" onClick={() => setForm({})}>Add one</button></div> : list.map(c => {
            const s = stats[c.id];
            return (
              <button key={c.id} className={`cl-row ${course?.id === c.id ? 'on' : ''}`} style={{ '--c': hex(c) }} onClick={() => { setSel(c.id); setEditing(false); }}>
                <span className="cl-avatar" style={{ fontSize: 11, fontFamily: 'var(--fm)' }}>{Math.round(s.pct * 100)}%</span>
                <span className="cl-row-main">
                  <span className="cl-row-name">{c.code}</span>
                  <span className="cl-row-meta">{s.done}/{s.total} topics{s.daysToExam !== null && s.daysToExam >= 0 ? ` · exam in ${s.daysToExam}d` : ''}</span>
                </span>
                {s.behind && <span className="cl-owed">behind</span>}
              </button>
            );
          })}
        </div>
        <BalanceCard schedule={schedule} timers={timers} todayStr={todayStr} targets={balance} onSetTargets={onSetBalance}/>
      </div>

      {!course ? <div className="card span-8 agenda-empty">Add a course, then paste in its syllabus. Tick topics off as you actually cover them.</div> : (
        <div className="cl-detail span-8">
          <div className="card cl-head" style={{ '--c': hex(course) }}>
            <div className="cl-head-top">
              <span className="cl-avatar big" style={{ fontSize: 15, fontFamily: 'var(--fm)' }}>{Math.round(st.pct * 100)}%</span>
              <div className="cl-head-main">
                <div className="cl-name">{course.code}</div>
                <div className="cl-sub">
                  {course.title && <span>{course.title}</span>}
                  {course.credits && <span>{course.credits} credits</span>}
                  {course.examDate && <span className={st.daysToExam <= 14 ? 'bad' : ''}>exam {fmtDate(course.examDate, { weekday:'short', month:'short', day:'numeric' })}{st.daysToExam >= 0 ? ` · ${st.daysToExam}d` : ' · passed'}</span>}
                </div>
              </div>
              <div className="cl-head-actions">
                <button className="icon-btn" title="Edit course" onClick={() => setForm(course)}><Icons.edit size={13}/></button>
              </div>
            </div>
            <div className="goal-bar" style={{ margin: '1rem 0 0.5rem' }}>
              <div className="goal-fill" style={{ width: `${st.pct * 100}%` }}/>
              {st.elapsed !== null && st.left > 0 && <div className="goal-time" style={{ left: `${st.elapsed * 100}%` }} title="Where the term is"/>}
            </div>
            <div className="goal-foot">
              <span>{st.done} of {st.total} topics · {st.left} left</span>
              {st.perWeek !== null && st.left > 0 && <span className={st.behind ? 'bad' : ''}>{Math.ceil(st.perWeek)} a week to finish before the exam</span>}
            </div>
            {st.behind && <div className="goal-warn" style={{ marginTop: '0.5rem' }}>Behind. {Math.round(st.elapsed * 100)}% of the term is gone and {Math.round(st.pct * 100)}% of the syllabus is covered.</div>}
          </div>

          <div className="grid-2">
            <div className="fin-tile"><span>Time studied</span><b>{fmtHM(st.focusSec)}</b><span className="fin-delta">on linked timers</span></div>
            <div className="fin-tile"><span>Backed ticks</span><b className={st.unbacked ? 'warn' : 'good'}>{st.backed}/{st.done}</b><span className="fin-delta">{MIN_PER_TOPIC} min of focus backs one</span></div>
            <div className="fin-tile"><span>XP from this course</span><b className="good">+{st.backed * XP_PER_TOPIC}</b><span className="fin-delta">{st.unbacked ? `${st.unbacked} tick${st.unbacked === 1 ? '' : 's'} waiting on study time` : `+${XP_PER_TOPIC} per backed topic`}</span></div>
            <div className="fin-tile"><span>Per topic so far</span><b>{st.done ? fmtHM(st.focusSec / st.done) : '—'}</b><span className="fin-delta">average study time</span></div>
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: '0.6rem' }}>
              <span className="card-label" style={{ margin: 0 }}>Focus timers for {course.code}</span>
              <button className="btn-ghost tk-carry" onClick={() => setTimerForm({ category: 'Study', courseId: course.id, title: `${course.code} study` })}><Icons.plus size={12}/> Timer</button>
            </div>
            {linked.length === 0 ? <div className="agenda-empty small">No timer yet. Study time on a timer is what turns ticks into XP.</div> : linked.map(t => {
              const state = timerStatus(t, todayStr), el = timerElapsed(t, Date.now()), target = timerTargetSec(t);
              return (
                <div key={t.id} className="dash-focus sy-timer" style={{ '--liq': hex(course) }}>
                  <div className="row-between">
                    <span>{t.runningSince ? '● ' : ''}{t.title}</span>
                    <span>{fmtDur(el)} / {fmtHM(target)} · {state === 'done' ? 'filled' : state === 'failed' ? 'missed' : `due ${fmtDate(t.deadline, { month:'short', day:'numeric' })}`}</span>
                  </div>
                  <div className="row-gap">
                    <div className="dash-focus-bar" style={{ flex: 1 }}><div style={{ width: `${(el / target) * 100}%` }}/></div>
                    {state === 'active' && (t.runningSince
                      ? <button className="btn-ghost tk-carry" onClick={() => onPauseTimer(t)}>❚❚ Pause</button>
                      : <button className="btn-primary tk-carry" onClick={() => onStartTimer(t)}>▶ Study</button>)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: '0.6rem' }}>
              <span className="card-label" style={{ margin: 0 }}>Syllabus</span>
              <span className="row-gap">
                <button className="btn-ghost tk-carry" onClick={() => setPaste({ text: '', mode: (course.syllabus || []).length ? 'append' : 'replace' })}>Paste outline</button>
                <button className={`btn-ghost tk-carry ${editing ? 'on' : ''}`} onClick={() => setEditing(v => !v)}>{editing ? 'Done editing' : 'Edit'}</button>
              </span>
            </div>
            {(course.syllabus || []).length === 0 && !editing ? (
              <div className="agenda-empty small">No syllabus yet. <button className="link-btn" onClick={() => setPaste({ text: '', mode: 'replace' })}>Paste the course outline</button> or <button className="link-btn" onClick={() => setEditing(true)}>add units by hand</button>.</div>
            ) : (
              <div className="sy-tree">
                {(course.syllabus || []).map(n => renderNode(n, 0))}
                {editing && <input className="input sy-add" value={draft.root || ''} placeholder="Add a unit…" onChange={e => setDraft(d => ({ ...d, root: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addUnder(null, 'root')}/>}
              </div>
            )}
          </div>
        </div>
      )}

      {paste && (
        <Modal title={`Paste the ${course.code} outline`} onClose={() => setPaste(null)}>
          <div className="focus-preview">
            <div>One topic per line. Indent, or number them (1, 1.1, 1.1.1), to nest. Lines like "Unit 2" or "Week 5" start a new section.</div>
          </div>
          <textarea className="input sy-paste" value={paste.text} onChange={e => setPaste(p => ({ ...p, text: e.target.value }))} autoFocus
            onKeyDown={e => { if (e.key !== 'Tab') return; e.preventDefault(); const el = e.target, a = el.selectionStart, b = el.selectionEnd; const text = paste.text.slice(0, a) + '  ' + paste.text.slice(b); setPaste(p => ({ ...p, text })); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2; }); }}
            placeholder={'Unit 1: Algorithm analysis\n  Big-O notation\n  Recurrences\n    Master theorem\nUnit 2: Sorting\n  Merge sort\n  Quick sort'}/>
          <div className="row-between">
            <span className="fin-delta">{(() => { const t = parseOutline(paste.text); return t.length ? `${t.length} section${t.length === 1 ? '' : 's'} · ${leavesOf(t).length} topics to tick` : 'Nothing to add yet'; })()}</span>
            {(course.syllabus || []).length > 0 && (
              <div className="seg">
                <button className={paste.mode === 'append' ? 'on' : ''} onClick={() => setPaste(p => ({ ...p, mode: 'append' }))}>Add to it</button>
                <button className={paste.mode === 'replace' ? 'on' : ''} onClick={() => setPaste(p => ({ ...p, mode: 'replace' }))}>Replace it</button>
              </div>
            )}
          </div>
          {paste.mode === 'replace' && (course.syllabus || []).length > 0 && <div className="form-warn">Replacing wipes the ticks you already have.</div>}
          <ModalFoot onClose={() => setPaste(null)} onSave={applyPaste}/>
        </Modal>
      )}
      {form !== null && <CourseModal data={form} onSave={d => { form.id ? onUpdate(form.id, d) : onAdd({ ...d, syllabus: [] }); setForm(null); }} onDelete={form.id ? () => removeCourse(form) : null} onClose={() => setForm(null)} todayStr={todayStr}/>}
      {timerForm && <TimerModal data={timerForm} todayStr={todayStr} courses={courses} onSave={d => { onAddTimer({ ...d, courseId: timerForm.courseId }); setTimerForm(null); }} onClose={() => setTimerForm(null)}/>}
      {ConfirmUI}
    </div>
  );
}

function CourseModal({ data, todayStr, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ code: '', title: '', credits: '', examDate: '', startDate: todayStr, color: '', ...data });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.code.trim()) return;
    const { id, createdAt, syllabus, ...rest } = f;
    onSave({ ...rest, code: f.code.trim().toUpperCase(), title: (f.title || '').trim() });
  };
  return (
    <Modal title={data.id ? `Edit ${data.code}` : 'New Course'} onClose={onClose}>
      <div className="grid-2">
        <Field label="Course code"><input className="input" autoFocus value={f.code} onChange={e => s('code', e.target.value)} placeholder="COMP 2201"/></Field>
        <Field label="Credits (optional)"><input className="input" type="number" min="0" value={f.credits} onChange={e => s('credits', e.target.value)}/></Field>
      </div>
      <Field label="Course title"><input className="input" value={f.title} onChange={e => s('title', e.target.value)} placeholder="Discrete Mathematics for Computer Science"/></Field>
      <div className="grid-2">
        <Field label="Term started"><input className="input" type="date" value={f.startDate || ''} onChange={e => s('startDate', e.target.value)}/></Field>
        <Field label="Exam date"><input className="input" type="date" value={f.examDate || ''} onChange={e => s('examDate', e.target.value)}/></Field>
      </div>
      <Field label="Colour">
        <div className="sched-cals">
          {COURSE_HEX.map(c => <button key={c} type="button" className={`sched-cal ${f.color === c ? 'on' : ''}`} style={{ '--c': c }} onClick={() => s('color', c)}><span className="dot"/></button>)}
        </div>
      </Field>
      <div className="focus-preview"><div>With an exam date, the console works out how many topics a week you need and tells you the day you fall behind.</div></div>
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent: 'center' }} onClick={onDelete}><Icons.trash size={13}/> Delete course</button>}
    </Modal>
  );
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
// Three calendars (Work / School / Personal) that can be shown or hidden,
// a week grid for the desktop and a day agenda for narrow screens.
const SCHED_CALS = [
  { id:'Work',     hex:'#e63946' },
  { id:'School',   hex:'#e6c47c' },
  { id:'Personal', hex:'#ff9a4a' },
];
const SCHED_HEX = Object.fromEntries(SCHED_CALS.map(c => [c.id, c.hex]));
const HOUR_PX = 56;
const calOf  = b => b.scheduleType || 'Work';
const toMin  = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const fmtTime = t => {
  const m = toMin(t), h = Math.floor(m / 60) % 24, mm = m % 60;
  return `${((h + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''}${h >= 12 ? 'pm' : 'am'}`;
};
const fmtHour = h => `${((h + 11) % 12) + 1} ${h >= 12 && h < 24 ? 'PM' : 'AM'}`;
const dayNameOf = date => DAYS[(parseLocal(date).getDay() + 6) % 7];
const fmtDate = (date, opts) => parseLocal(date).toLocaleDateString('en-US', opts);

// Does a (possibly recurring) block occur on this calendar date?
function blockOccursOn(b, date) {
  if (b.day !== dayNameOf(date)) return false;
  if (b.recurrence === 'once') return !b.startDate || mondayOf(date) === mondayOf(b.startDate);
  const start = b.startDate || '2000-01-01', end = b.endDate || '2099-12-31';
  if (date < start || date > end) return false;
  if (b.recurrence === 'biweekly') {
    const weeks = Math.round((parseLocal(mondayOf(date)) - parseLocal(mondayOf(start))) / (7 * 86400000));
    return weeks >= 0 && weeks % 2 === 0;
  }
  return true;
}

// Ids of blocks that overlap another block on the same day
function findClashes(blocks) {
  const ids = new Set();
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], b = blocks[j];
    if (toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)) { ids.add(a.id); ids.add(b.id); }
  }
  return ids;
}

// Place overlapping blocks side by side: [{ b, col, cols }]
function layoutDay(blocks) {
  const sorted = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end));
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const colEnds = [];
    cluster.forEach(item => {
      let c = colEnds.findIndex(end => end <= toMin(item.b.start));
      if (c === -1) { c = colEnds.length; colEnds.push(0); }
      colEnds[c] = toMin(item.b.end);
      item.col = c;
    });
    cluster.forEach(item => { item.cols = colEnds.length; });
    out.push(...cluster);
    cluster = [];
  };
  sorted.forEach(b => {
    if (cluster.length && toMin(b.start) >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push({ b });
    clusterEnd = Math.max(clusterEnd, toMin(b.end));
  });
  if (cluster.length) flush();
  return out;
}

function Schedule({schedule,onAdd,onUpdate,onDelete}) {
  const { confirm, ConfirmUI } = useConfirm();
  const todayStr = localDateStr();
  const [view, setView]     = useState(window.innerWidth >= 1024 ? 'week' : 'day');
  const [monday, setMonday] = useState(mondayOf(todayStr));
  const [sel, setSel]       = useState(todayStr);
  const [form, setForm]     = useState(null);
  const [now, setNow]       = useState(new Date());
  const [visible, setVisible] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem('jc_sched_cals')); if (Array.isArray(v) && v.length) return v; } catch {}
    return SCHED_CALS.map(c => c.id);
  });

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem('jc_sched_cals', JSON.stringify(visible)); } catch {} }, [visible]);

  const weekDates = DAYS.map((_, i) => addDays(monday, i));
  const isThisWeek = monday === mondayOf(todayStr);
  const shiftWeek = n => { setMonday(m => addDays(m, 7 * n)); setSel(s => addDays(s, 7 * n)); };
  const goToday   = () => { setMonday(mondayOf(todayStr)); setSel(todayStr); };
  const toggleCal = id => setVisible(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

  const allOn   = date => schedule.filter(b => blockOccursOn(b, date)).sort((a, b) => toMin(a.start) - toMin(b.start));
  const shownOn = date => allOn(date).filter(b => visible.includes(calOf(b)));
  const week    = weekDates.map(date => { const blocks = shownOn(date); return { date, blocks, clashes: findClashes(blocks) }; });

  // Hours per calendar this week (all calendars, even hidden ones)
  const hours = {};
  weekDates.forEach(d => allOn(d).forEach(b => {
    hours[calOf(b)] = (hours[calOf(b)] || 0) + Math.max(0, toMin(b.end) - toMin(b.start)) / 60;
  }));

  // Visible hour range — at least 7am–7pm, stretched to fit the week's events
  const weekBlocks = week.flatMap(d => d.blocks);
  const startH = Math.max(0,  Math.min(7,  ...weekBlocks.map(b => Math.floor(toMin(b.start) / 60))));
  const endH   = Math.min(24, Math.max(19, ...weekBlocks.map(b => Math.ceil(toMin(b.end) / 60))));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const sun = weekDates[6];
  const rangeLabel = monday.slice(0, 7) === sun.slice(0, 7)
    ? `${fmtDate(monday, { month:'long', day:'numeric' })} – ${fmtDate(sun, { day:'numeric' })}, ${sun.slice(0, 4)}`
    : `${fmtDate(monday, { month:'short', day:'numeric' })} – ${fmtDate(sun, { month:'short', day:'numeric' })}, ${sun.slice(0, 4)}`;

  const newEvent = (date, start = '09:00', end = '10:00') => setForm({
    day: dayNameOf(date), start, end, startDate: date,
    scheduleType: visible.length === 1 ? visible[0] : 'Work',
  });

  const addAtClick = (e, date) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const mins = Math.min(endH * 60 - 60, Math.max(startH * 60, startH * 60 + Math.floor(y / HOUR_PX * 2) * 30));
    const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    newEvent(date, hhmm(mins), hhmm(mins + 60));
  };

  const deleteForm = async () => {
    if (await confirm({ message: `Delete "${form.title}" from your schedule?`, label: 'Delete', danger: true })) {
      onDelete(form.id); setForm(null);
    }
  };

  // Upcoming one-time events in the next two weeks
  const upcoming = schedule
    .filter(b => b.recurrence === 'once' && b.startDate && b.startDate >= todayStr && b.startDate <= addDays(todayStr, 14))
    .sort((a, b) => (a.startDate + a.start).localeCompare(b.startDate + b.start));

  const AgendaItem = ({ b, date, clash, compact }) => {
    const isToday = date === todayStr;
    const state = date < todayStr || (isToday && toMin(b.end) <= nowMin) ? 'past'
      : isToday && toMin(b.start) <= nowMin ? 'now' : '';
    return (
      <button className={`agenda-item ${state} ${compact ? 'compact' : ''}`} style={{ '--c': SCHED_HEX[calOf(b)] }} onClick={() => setForm(b)}>
        <span className="agenda-time"><span>{fmtTime(b.start)}</span><span className="end">{fmtTime(b.end)}</span></span>
        <span className="agenda-bar"/>
        <span className="agenda-main">
          <span className="agenda-title">{b.title}</span>
          <span className="agenda-meta">
            {calOf(b)}{b.type && b.type !== calOf(b) ? ` · ${b.type}` : ''}
            {b.recurrence === 'once' ? ' · one-time' : b.recurrence === 'biweekly' ? ' · every 2 weeks' : ''}
            {clash && <span className="warn"> · overlaps</span>}
          </span>
        </span>
        {state === 'now' && <span className="agenda-badge">Now</span>}
      </button>
    );
  };

  const selDay = week.find(d => d.date === sel) || { date: sel, blocks: shownOn(sel), clashes: new Set() };
  const todayBlocks = shownOn(todayStr);
  const todayClashes = findClashes(todayBlocks);

  return (
    <div className="section sched">
      {/* Toolbar */}
      <div className="sched-bar">
        <div className="sched-range">
          <button className="icon-btn" title="Previous week" onClick={() => shiftWeek(-1)}><Icons.chevLeft size={15}/></button>
          <button className="icon-btn" title="Next week" onClick={() => shiftWeek(1)}><Icons.chevRight size={15}/></button>
          <button className="btn-ghost sched-today" onClick={goToday} disabled={isThisWeek && sel === todayStr}>Today</button>
          <div className="sched-title">{rangeLabel}</div>
        </div>
        <div className="sched-cals">
          {SCHED_CALS.map(c => (
            <button key={c.id} className={`sched-cal ${visible.includes(c.id) ? 'on' : ''}`} style={{ '--c': c.hex }}
              onClick={() => toggleCal(c.id)} title={visible.includes(c.id) ? `Hide ${c.id}` : `Show ${c.id}`}>
              <span className="dot"/>{c.id}<span className="hrs">{Math.round((hours[c.id] || 0) * 10) / 10}h</span>
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>Week</button>
          <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>Day</button>
        </div>
        <button className="btn-primary" onClick={() => newEvent(sel)}><Icons.plus size={14}/> Event</button>
      </div>

      {/* Week grid */}
      {view === 'week' && (
        <div className="card sched-week span-9" style={{ '--hour': `${HOUR_PX}px` }}>
          <div className="sched-head">
            <div/>
            {week.map(d => (
              <button key={d.date} className={`sched-dayhead ${d.date === todayStr ? 'today' : ''}`}
                onClick={() => { setSel(d.date); setView('day'); }} title="Open day">
                <span className="dow">{dayNameOf(d.date)}</span>
                <span className="dnum">{Number(d.date.slice(8))}</span>
              </button>
            ))}
          </div>
          <div className="sched-body" style={{ height: (endH - startH) * HOUR_PX }}>
            <div className="sched-gutter">
              {Array.from({ length: endH - startH }, (_, i) => i + startH).filter(h => h > startH).map(h => (
                <span key={h} className="sched-hour" style={{ top: (h - startH) * HOUR_PX }}>{fmtHour(h)}</span>
              ))}
            </div>
            {week.map((d, i) => (
              <div key={d.date} className={`sched-col ${d.date === todayStr ? 'today' : ''} ${i >= 5 ? 'weekend' : ''}`}
                style={{ backgroundPositionY: `${-startH * HOUR_PX}px` }} onClick={e => addAtClick(e, d.date)}>
                {layoutDay(d.blocks).map(({ b, col, cols }) => {
                  const top = (toMin(b.start) - startH * 60) / 60 * HOUR_PX;
                  const h = Math.max(22, (toMin(b.end) - toMin(b.start)) / 60 * HOUR_PX - 3);
                  return (
                    <button key={b.id}
                      className={`sched-ev ${h < 40 ? 'short' : ''} ${cols >= 3 ? 'narrow' : ''} ${d.clashes.has(b.id) ? 'clash' : ''} ${d.date < todayStr || (d.date === todayStr && toMin(b.end) <= nowMin) ? 'past' : ''}`}
                      style={{ top, height: h, left: `calc(${col / cols * 100}% + 3px)`, width: `calc(${100 / cols}% - 6px)`, '--c': SCHED_HEX[calOf(b)] }}
                      onClick={e => { e.stopPropagation(); setForm(b); }}
                      title={`${b.title}\n${fmtTime(b.start)} – ${fmtTime(b.end)} · ${calOf(b)}`}>
                      <span className="ev-title">{b.title}</span>
                      <span className="ev-time">{fmtTime(b.start)} – {fmtTime(b.end)}</span>
                    </button>
                  );
                })}
                {d.date === todayStr && nowMin >= startH * 60 && nowMin <= endH * 60 && (
                  <div className="sched-now" style={{ top: (nowMin - startH * 60) / 60 * HOUR_PX }}/>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day agenda */}
      {view === 'day' && (
        <div className="sched-dayview span-9">
          <div className="sched-strip">
            {week.map(d => (
              <button key={d.date} className={`${d.date === sel ? 'on' : ''} ${d.date === todayStr ? 'today' : ''}`} onClick={() => setSel(d.date)}>
                <span className="dow">{dayNameOf(d.date)}</span>
                <span className="dnum">{Number(d.date.slice(8))}</span>
                <span className="dots">{d.blocks.slice(0, 4).map(b => <i key={b.id} style={{ background: SCHED_HEX[calOf(b)] }}/>)}</span>
              </button>
            ))}
          </div>
          <div className="card">
            <div className="agenda-head">
              <span>{fmtDate(sel, { weekday:'long', month:'long', day:'numeric' })}</span>
              <span className="muted">{selDay.blocks.length} event{selDay.blocks.length === 1 ? '' : 's'}</span>
            </div>
            {selDay.blocks.length === 0
              ? <div className="agenda-empty">Nothing scheduled. <button className="link-btn" onClick={() => newEvent(sel)}>Add an event</button></div>
              : <div className="agenda">{selDay.blocks.map(b => <AgendaItem key={b.id} b={b} date={sel} clash={selDay.clashes.has(b.id)}/>)}</div>}
          </div>
        </div>
      )}

      {/* Side panel */}
      <div className="sched-side span-3">
        <div className="card">
          <div className="card-label">Today · {fmtDate(todayStr, { weekday:'short', month:'short', day:'numeric' })}</div>
          {todayBlocks.length === 0
            ? <div className="agenda-empty small">A free day.</div>
            : <div className="agenda">{todayBlocks.map(b => <AgendaItem key={b.id} b={b} date={todayStr} clash={todayClashes.has(b.id)} compact/>)}</div>}
        </div>
        <div className="card">
          <div className="card-label">Coming up · one-time</div>
          {upcoming.length === 0
            ? <div className="agenda-empty small">No one-off events in the next two weeks.</div>
            : <div className="agenda">{upcoming.map(b => (
                <div key={b.id}>
                  <div className="agenda-date">{fmtDate(b.startDate, { weekday:'short', month:'short', day:'numeric' })}</div>
                  <AgendaItem b={b} date={b.startDate} compact/>
                </div>
              ))}</div>}
        </div>
      </div>

      {form !== null && (
        <SchedModal data={form}
          onSave={d => { d.id ? onUpdate(d.id, d) : onAdd(d); setForm(null); }}
          onDelete={form.id ? deleteForm : null}
          onClose={() => setForm(null)}/>
      )}
      {ConfirmUI}
    </div>
  );
}

function SchedModal({data, onSave, onDelete, onClose}) {
  const [f, setF] = useState({
    day:'Mon', start:'09:00', end:'10:00', title:'', type:'Work',
    scheduleType: 'Work',
    recurrence: 'weekly',     // weekly | biweekly | once | period
    startDate: localDateStr(), // first occurrence / start of period
    endDate: '',               // end of period (for 'period' recurrence)
    ...data,
  });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const invalid = f.start && f.end && toMin(f.end) <= toMin(f.start);

  const RECURRENCE_OPTS = [
    { id:'weekly',   label:'Every week'   },
    { id:'biweekly', label:'Every 2 weeks'},
    { id:'once',     label:'One time'     },
    { id:'period',   label:'Date range'   },
  ];
  const setDate = v => {
    s('startDate', v);
    if (f.recurrence === 'once' && v) s('day', dayNameOf(v));
  };

  return (
    <Modal title={data.id ? 'Edit Event' : 'New Event'} onClose={onClose}>
      <Field label="Title">
        <input className="input" autoFocus value={f.title} onChange={e => s('title', e.target.value)} placeholder="e.g. COMP 2201 Lecture, Gym, Client call"/>
      </Field>

      <Field label="Calendar">
        <div className="sched-cals">
          {SCHED_CALS.map(c => (
            <button key={c.id} type="button" className={`sched-cal ${f.scheduleType === c.id ? 'on' : ''}`} style={{ '--c': c.hex }} onClick={() => s('scheduleType', c.id)}>
              <span className="dot"/>{c.id}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Day">
        <div className="day-pick">
          {DAYS.map(d => (
            <button key={d} type="button" className={f.day === d ? 'on' : ''} onClick={() => s('day', d)}>{d}</button>
          ))}
        </div>
      </Field>

      <div className="grid-2">
        <Field label="Starts"><input className="input" type="time" value={f.start} onChange={e => s('start', e.target.value)}/></Field>
        <Field label="Ends"><input className="input" type="time" value={f.end} onChange={e => s('end', e.target.value)}/></Field>
      </div>
      {invalid && <div className="form-warn">End time must be after the start time.</div>}

      <Field label="Repeats">
        <div className="seg seg-full">
          {RECURRENCE_OPTS.map(r => (
            <button key={r.id} type="button" className={f.recurrence === r.id ? 'on' : ''} onClick={() => s('recurrence', r.id)}>{r.label}</button>
          ))}
        </div>
      </Field>

      <div className="grid-2">
        <Field label={f.recurrence === 'once' ? 'Date' : 'Starting'}>
          <input className="input" type="date" value={f.startDate} onChange={e => setDate(e.target.value)}/>
        </Field>
        {f.recurrence !== 'once' && (
          <Field label="Until (optional)">
            <input className="input" type="date" value={f.endDate} onChange={e => s('endDate', e.target.value)}/>
          </Field>
        )}
      </div>

      <Field label="Tag">
        <select className="input" value={f.type} onChange={e => s('type', e.target.value)}>
          {Object.keys(BLOCK_COLORS).map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>

      <ModalFoot onClose={onClose} onSave={() => f.title.trim() && !invalid && onSave(f)}/>
      {onDelete && (
        <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={onDelete}>
          <Icons.trash size={13}/> Delete event
        </button>
      )}
    </Modal>
  );
}


// ─── FINANCE ──────────────────────────────────────────────────────────────────
// A strict monthly ledger. Everything is judged month by month against the
// Level minimum profit; forecasts only count money that is contracted
// (retainers) and averages include months where nothing came in.
const monthOf    = ds => (ds || '').slice(0, 7);
const addMonths  = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthName  = (mk, opts = { month:'long', year:'numeric' }) => { const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-US', opts); };
const daysInMonth = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const J = n => `${n < 0 ? '−' : ''}J$${Math.abs(Math.round(n)).toLocaleString()}`;
const Jk = n => Math.abs(n) >= 1000 ? `${n < 0 ? '−' : ''}${Math.round(Math.abs(n) / 1000)}k` : `${Math.round(n)}`;
const pctChange = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null);
const amountOf = f => Number(f.amount) || 0;

// Retainer months that were due (since the client started) but never collected.
// Only Active clients owe retainers; Paused and Churned don't accrue.
const clientSinceOf = l => l.clientSince || (l.createdAt?.toDate ? localDateStr(l.createdAt.toDate()) : '');
const retainerDueDate = (l, mk) => `${mk}-${String(Math.min(Number(l.retainerDueDay) || 1, daysInMonth(mk))).padStart(2, '0')}`;
const retainerCollected = (l, mk, finances) => !!(l.retainerLog || {})[mk] ||
  finances.some(f => f.pipelineLeadId === l.id && f.paymentStage === 'Monthly Retainer' && monthOf(f.date) === mk);
function retainerArrears(l, finances, todayStr) {
  if (!(Number(l.retainerAmount) > 0) || (l.clientStatus || 'Active') !== 'Active') return [];
  const since = clientSinceOf(l), out = [];
  for (let i = 0; i < 12; i++) {
    const mk = addMonths(todayStr.slice(0, 7), -i), due = retainerDueDate(l, mk);
    if (since && due < since) break;           // before they were a client
    if (due >= todayStr) continue;             // not late yet
    if (!retainerCollected(l, mk, finances)) out.push(mk);
  }
  return out;
}

// The ledger's voice, one line per health level (best → worst)
const LEDGER_LINES = [
  'Profitable. Now protect it.',
  "On track. Don't get comfortable.",
  'Sloppy. Fix the leaks.',
  'Too many leaks. This is how businesses die.',
  'Stop spending. Start collecting.',
];

// Etched character art that sits behind a section. One character per section.
function SectionGhost({ src }) {
  return <div className="ghost-art" aria-hidden="true"><img src={src} alt=""/></div>;
}

function Finance({finances,leads,budgets,level,onAdd,onUpdate,onDelete,onSetBudget}) {
  const { confirm, ConfirmUI } = useConfirm();
  const todayStr  = localDateStr();
  const thisMonth = monthOf(todayStr);
  const today     = Number(todayStr.slice(8));
  const [month, setMonth]   = useState(thisMonth);
  const [view, setView]     = useState('overview');
  const [form, setForm]     = useState(null);
  const [txType, setTxType] = useState('all');
  const [search, setSearch] = useState('');
  const [horizon, setHorizon] = useState(6);
  const [investAdvice, setInvestAdvice]   = useState(null);
  const [investLoading, setInvestLoading] = useState(false);

  // ── Month aggregates ───────────────────────────────────────────────────────
  const byMonth = useMemo(() => {
    const m = {};
    finances.forEach(f => {
      if (!f.date) return;
      const k = monthOf(f.date);
      m[k] = m[k] || { inc: 0, exp: 0, cats: {} };
      if (f.type === 'income') m[k].inc += amountOf(f);
      else { m[k].exp += amountOf(f); m[k].cats[f.category || 'Other'] = (m[k].cats[f.category || 'Other'] || 0) + amountOf(f); }
    });
    return m;
  }, [finances]);
  const agg = k => byMonth[k] || { inc: 0, exp: 0, cats: {} };

  const cur = agg(month), prev = agg(addMonths(month, -1));
  const net = cur.inc - cur.exp;
  const target = minProfitForLevel(level);
  const isCurrent = month === thisMonth;
  const isFuture  = month > thisMonth;
  const dim = daysInMonth(month);
  const daysLeft = isCurrent ? dim - today : 0;

  // Last three COMPLETE months; months with nothing logged count as zero
  const last3 = [1, 2, 3].map(i => agg(addMonths(thisMonth, -i)));
  const avgInc = last3.reduce((s, m) => s + m.inc, 0) / 3;
  const avgExp = last3.reduce((s, m) => s + m.exp, 0) / 3;
  const avgNet = avgInc - avgExp;
  const cash = finances.reduce((s, f) => s + (f.type === 'income' ? amountOf(f) : -amountOf(f)), 0);
  const runway = avgExp > 0 ? Math.max(0, cash) / avgExp : Infinity;

  // ── Clients: retainers and money owed ──────────────────────────────────────
  const paidClients = leads.filter(l => l.status === 'Paid' && l.clientStatus !== 'Churned');
  const mrr = paidClients.filter(l => l.clientStatus !== 'Paused').reduce((s, l) => s + (Number(l.retainerAmount) || 0), 0);
  const retainerIn = (l, mk) => !!(l.retainerLog || {})[mk] ||
    finances.some(f => f.pipelineLeadId === l.id && f.paymentStage === 'Monthly Retainer' && monthOf(f.date) === mk);
  const retainers = paidClients.filter(l => Number(l.retainerAmount) > 0 && l.clientStatus !== 'Paused')
    .map(l => ({ l, amount: Number(l.retainerAmount), due: Number(l.retainerDueDay) || 1, got: retainerIn(l, thisMonth) }));
  const overdueRet = retainers.map(r => { const months = retainerArrears(r.l, finances, todayStr); return { ...r, months, amount: months.length * r.amount }; }).filter(r => r.months.length);
  const pendingRet = retainers.filter(r => !r.got && r.due >= today);
  const setupOwed = paidClients.map(l => {
    const paid = finances.filter(f => f.type === 'income' && f.pipelineLeadId === l.id && f.paymentStage !== 'Monthly Retainer').reduce((s, f) => s + amountOf(f), 0);
    return { l, due: Math.max(0, (Number(l.value) || 0) - paid) };
  }).filter(x => x.due > 0);
  const owed = overdueRet.reduce((s, r) => s + r.amount, 0) + setupOwed.reduce((s, x) => s + x.due, 0);

  // ── Strict projection for the current month ───────────────────────────────
  // Income: what's in, plus retainers still due (contracted money only).
  // Expenses: what's out, plus the 3-month average pace for the days left.
  const pendingIncome = isCurrent ? pendingRet.reduce((s, r) => s + r.amount, 0) : 0;
  const projInc = cur.inc + pendingIncome;
  const projExp = isCurrent ? cur.exp + avgExp * (daysLeft / dim) : cur.exp;
  const projNet = projInc - projExp;
  const judged  = isCurrent ? projNet : net;
  const gap     = target - projNet;
  const perDay  = isCurrent && daysLeft > 0 && gap > 0 ? gap / daysLeft : 0;

  // ── The verdict ────────────────────────────────────────────────────────────
  const findings = [];
  const add = (lv, t) => findings.push({ lv, t });
  const lastLog = finances.reduce((m, f) => (f.date && f.date > m ? f.date : m), '');
  const sinceLog = lastLog ? Math.round((parseLocal(todayStr) - parseLocal(lastLog)) / 864e5) : null;
  const lastIncome = finances.filter(f => f.type === 'income').reduce((m, f) => (f.date && f.date > m ? f.date : m), '');
  const sinceIncome = lastIncome ? Math.round((parseLocal(todayStr) - parseLocal(lastIncome)) / 864e5) : null;

  if (!finances.length) add('danger', "Nothing logged. Money you don't record is money you can't manage.");
  else if (isCurrent && sinceLog >= 7) add('warn', `Nothing logged in ${sinceLog} days. Log every dollar the day it moves.`);

  if (!isFuture) {
    if (net >= target) add('ok', `${isCurrent ? 'Target already cleared' : 'Target met'}: ${J(net)} against the ${J(target)} Level ${level} minimum.`);
    else if (isCurrent && projNet >= target) add('warn', `On course for the ${J(target)} minimum only if the ${J(pendingIncome)} in retainers still due actually arrives.`);
    else if (isCurrent) add('danger', `At this pace you finish ${J(gap)} short of the ${J(target)} Level ${level} minimum. That's ${J(perDay)} more profit every day, starting today.`);
    else add('danger', `Missed the Level ${level} minimum by ${J(target - net)}.`);
  }
  if (!isFuture && cur.inc === 0 && cur.exp > 0) add('danger', `${J(cur.exp)} spent and nothing earned in ${monthName(month, { month:'long' })}.`);
  else if (cur.inc > 0 && net / cur.inc < 0.3) add('warn', `You keep ${Math.max(0, Math.round((net / cur.inc) * 100))}¢ of every dollar earned. Keep at least 30¢.`);
  const expUp = pctChange(isCurrent ? projExp : cur.exp, prev.exp);
  if (!isFuture && expUp !== null && expUp > 20) add('warn', `Spending ${isCurrent ? 'is heading' : 'was'} ${expUp}% higher than ${monthName(addMonths(month, -1), { month:'long' })}.`);

  const budgetOf = cat => Number(budgets.find(b => b.category === cat)?.limit) || 0;
  Object.entries(cur.cats).forEach(([cat, spent]) => {
    const limit = budgetOf(cat);
    if (!limit) return;
    if (spent > limit) add('danger', `${cat}: ${J(spent)} spent against a ${J(limit)} budget. Over by ${J(spent - limit)}.`);
    else if (isCurrent && spent > (limit * today) / dim * 1.15) add('warn', `${cat} is running ahead of its budget pace (${J(spent)} of ${J(limit)} with ${daysLeft} days left).`);
  });
  const unbudgeted = Object.entries(cur.cats).filter(([cat, v]) => v > 0 && !budgetOf(cat));
  if (unbudgeted.length) add('warn', `${J(unbudgeted.reduce((s, [, v]) => s + v, 0))} spent on ${unbudgeted.map(([c]) => c).join(', ')} with no budget set.`);

  // Present-tense problems only belong on the current month
  if (isCurrent && overdueRet.length) add('danger', `Unpaid retainers: ${overdueRet.map(r => `${r.l.businessName} (${r.months.length} month${r.months.length === 1 ? '' : 's'})`).join(', ')}. That's ${J(overdueRet.reduce((s, r) => s + r.amount, 0))}. Chase it today.`);
  if (isCurrent && setupOwed.length) add('warn', `Clients still owe ${J(setupOwed.reduce((s, x) => s + x.due, 0))} on project fees. Collect before you spend.`);
  if (isCurrent && sinceIncome !== null && sinceIncome > 30) add('danger', `No income in ${sinceIncome} days.`);
  if (isCurrent && avgExp > 0 && runway < 3) add('danger', `Cash covers ${runway.toFixed(1)} months of spending. You want 3 or more.`);

  // Client concentration over the last 90 days
  const since90 = addDays(todayStr, -90);
  const recentByClient = {};
  finances.filter(f => f.type === 'income' && f.date >= since90 && f.pipelineLeadId)
    .forEach(f => { recentByClient[f.pipelineLeadId] = (recentByClient[f.pipelineLeadId] || 0) + amountOf(f); });
  const recentIncome = finances.filter(f => f.type === 'income' && f.date >= since90).reduce((s, f) => s + amountOf(f), 0);
  const [topId, topAmt] = Object.entries(recentByClient).sort((a, b) => b[1] - a[1])[0] || [];
  if (isCurrent && topId && recentIncome > 0 && topAmt / recentIncome > 0.6) {
    const name = leads.find(l => l.id === topId)?.businessName || 'One client';
    add('warn', `${name} is ${Math.round((topAmt / recentIncome) * 100)}% of your income over 90 days. Lose them and you lose the business.`);
  }

  // Health: how close to target, minus every problem found
  const dangers = findings.filter(f => f.lv === 'danger').length;
  const warns   = findings.filter(f => f.lv === 'warn').length;
  const ratio   = target > 0 ? judged / target : 1;
  const score   = 50 + Math.max(-1, Math.min(1, ratio - 1)) * 32 - dangers * 12 - warns * 4 + (ratio >= 1 ? 12 : 0);
  const healthIdx = score >= 78 ? 0 : score >= 60 ? 1 : score >= 42 ? 2 : score >= 25 ? 3 : 4;
  const health = EMOTION_LEVELS[healthIdx];
  findings.sort((a, b) => ({ danger: 0, warn: 1, ok: 2 }[a.lv] - { danger: 0, warn: 1, ok: 2 }[b.lv]));

  // ── Charts ─────────────────────────────────────────────────────────────────
  const paceData = useMemo(() => {
    const daily = {};
    finances.filter(f => monthOf(f.date) === month).forEach(f => {
      const d = Number(f.date.slice(8));
      daily[d] = (daily[d] || 0) + (f.type === 'income' ? amountOf(f) : -amountOf(f));
    });
    const lastActual = isCurrent ? today : isFuture ? 0 : dim;
    let run = 0;
    return Array.from({ length: dim }, (_, i) => {
      const d = i + 1;
      run += daily[d] || 0;
      const row = { day: d, pace: Math.round((target * d) / dim) };
      if (d <= lastActual) row.actual = run;
      if (isCurrent && d >= today) row.projected = Math.round(net + ((projNet - net) * (d - today)) / Math.max(1, dim - today));
      return row;
    });
  }, [finances, month, isCurrent, isFuture, today, dim, target, net, projNet]);

  const trend = Array.from({ length: 12 }, (_, i) => {
    const mk = addMonths(thisMonth, i - 11), a = agg(mk);
    return { mk, label: monthName(mk, { month:'short' }), income: a.inc, expenses: a.exp, net: a.inc - a.exp };
  });

  const expCats = Object.entries(cur.cats).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...expCats.map(([, v]) => v), ...expCats.map(([c]) => budgetOf(c)));

  // ── Transactions ───────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const txs = finances
    .filter(f => (q ? true : monthOf(f.date) === month))
    .filter(f => txType === 'all' || f.type === txType)
    .filter(f => !q || [f.description, f.category, leads.find(l => l.id === f.pipelineLeadId)?.businessName].some(s => (s || '').toLowerCase().includes(q)))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const txGroups = [];
  txs.forEach(f => { const g = txGroups[txGroups.length - 1]; if (g && g.date === f.date) g.items.push(f); else txGroups.push({ date: f.date, items: [f] }); });

  const deleteForm = async () => {
    if (await confirm({ message: `Delete "${form.description}" (${J(amountOf(form))})?`, label: 'Delete', danger: true })) { onDelete(form.id); setForm(null); }
  };

  const tt = { background:'rgba(var(--b1),0.96)', border:'1px solid rgba(var(--p4),0.25)', borderRadius:'10px', color:'#e8d6c3', fontSize:'12px' };
  const axis = { fill:'#7f6758', fontSize:10 };
  const Delta = ({ v, good = 'up' }) => v === null ? <span className="fin-delta">new</span>
    : <span className={`fin-delta ${(v >= 0) === (good === 'up') ? 'good' : 'bad'}`}>{v >= 0 ? '▲' : '▼'} {Math.abs(v)}%</span>;

  // ── Forecast (realistic) ───────────────────────────────────────────────────
  const topRetainer = retainers.slice().sort((a, b) => b.amount - a.amount)[0];
  const worstNet = avgNet - (topRetainer?.amount || 0);
  const forecast = Array.from({ length: horizon }, (_, i) => ({
    label: monthName(addMonths(thisMonth, i + 1), { month:'short' }),
    expected: Math.round(cash + avgNet * (i + 1)),
    worst: Math.round(cash + worstNet * (i + 1)),
  }));
  const basis = `${monthName(addMonths(thisMonth, -3), { month:'short' })}–${monthName(addMonths(thisMonth, -1), { month:'short' })}`;

  return (
    <div className="section fin">
      <SectionGhost src={kakuzuArt}/>

      {/* Toolbar */}
      <div className="sched-bar">
        <div className="sched-range">
          <button className="icon-btn" title="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><Icons.chevLeft size={15}/></button>
          <button className="icon-btn" title="Next month" onClick={() => setMonth(m => addMonths(m, 1))} disabled={month >= thisMonth}><Icons.chevRight size={15}/></button>
          <button className="btn-ghost sched-today" onClick={() => setMonth(thisMonth)} disabled={isCurrent}>This month</button>
          <div className="sched-title">{monthName(month)}</div>
        </div>
        <div className="seg">
          {[['overview','Overview'],['budgets','Budgets'],['forecast','Forecast'],['invest','Invest']].map(([id, label]) => (
            <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setForm({ date: isCurrent ? todayStr : `${month}-01` })}><Icons.plus size={14}/> Transaction</button>
      </div>

      {view === 'overview' && (<>
        {/* The verdict */}
        <div className="card fin-verdict span-8">
          <div className="card-label">{isCurrent ? `${monthName(month, { month:'long' })} · month to date` : monthName(month)}</div>
          <div className="fin-net-row">
            <div>
              <div className={`fin-net ${net >= 0 ? 'pos' : 'neg'}`}>{J(net)}</div>
              <div className="fin-net-sub">net profit · {J(cur.inc)} in · {J(cur.exp)} out</div>
            </div>
            <div className="fin-target">
              <div className="fin-target-num">{J(target)}</div>
              <div className="fin-net-sub">Level {level} minimum</div>
            </div>
          </div>
          <div className="fin-bar">
            <div className="fin-bar-fill" style={{ width: `${Math.max(0, Math.min(100, (net / target) * 100))}%` }}/>
            {isCurrent && <div className="fin-bar-proj" style={{ width: `${Math.max(0, Math.min(100, (projNet / target) * 100))}%` }}/>}
            {isCurrent && <div className="fin-bar-today" style={{ left: `${(today / dim) * 100}%` }} title="Where you should be today"/>}
          </div>
          <div className="fin-bar-legend">
            {isCurrent
              ? <>Projected <b className={projNet >= target ? 'good' : 'bad'}>{J(projNet)}</b> · {daysLeft} day{daysLeft === 1 ? '' : 's'} left{perDay > 0 && <> · need <b className="bad">{J(perDay)}/day</b></>}</>
              : <>{net >= target ? 'Target met' : `Short by ${J(target - net)}`}</>}
          </div>
          <ul className="fin-findings">
            {findings.length === 0 && <li className="ok">Nothing to flag. Keep logging.</li>}
            {findings.map((f, i) => <li key={i} className={f.lv}>{f.t}</li>)}
          </ul>
        </div>

        <div className="card fin-health span-4" style={{ '--hc': health.color }}>
          <div className="fin-health-top">
            <div className={`emotion-face lv-${health.svgKey}`} style={{ width:58, height:58, color: health.color }}
              dangerouslySetInnerHTML={{ __html: EMOTION_SVG[health.svgKey](health.color) }}/>
            <div>
              <div className="fin-health-label">{health.label}</div>
              <div className="fin-health-line">{judged < 0 ? "You're bleeding money." : LEDGER_LINES[healthIdx]}</div>
            </div>
          </div>
          <dl className="fin-kv">
            <div><dt>Cash on hand</dt><dd className={cash < 0 ? 'bad' : ''}>{J(cash)}</dd></div>
            <div><dt>Runway</dt><dd className={runway < 3 ? 'bad' : ''}>{runway === Infinity ? 'No burn' : `${runway.toFixed(1)} mo`}</dd></div>
            <div><dt>Retainers (MRR)</dt><dd>{J(mrr)}/mo</dd></div>
            <div><dt>Owed to you</dt><dd className={owed > 0 ? 'warn' : ''}>{J(owed)}</dd></div>
            <div><dt>3-month avg net</dt><dd className={avgNet < target ? 'bad' : 'good'}>{J(avgNet)}</dd></div>
          </dl>
        </div>

        <div className="grid-2">
          <div className="fin-tile"><span>Income</span><b className="good">{J(cur.inc)}</b><Delta v={pctChange(cur.inc, prev.inc)}/></div>
          <div className="fin-tile"><span>Expenses</span><b className="bad">{J(cur.exp)}</b><Delta v={pctChange(cur.exp, prev.exp)} good="down"/></div>
          <div className="fin-tile"><span>Kept per J$1 earned</span><b>{cur.inc > 0 ? `${Math.round((net / cur.inc) * 100)}¢` : '—'}</b><span className="fin-delta">aim for 30¢+</span></div>
          <div className="fin-tile"><span>Transactions</span><b>{finances.filter(f => monthOf(f.date) === month).length}</b><span className="fin-delta">{sinceLog === null ? 'none yet' : sinceLog === 0 ? 'logged today' : `last ${sinceLog}d ago`}</span></div>
        </div>

        <div className="card span-8">
          <div className="row-between" style={{ marginBottom:'0.75rem' }}>
            <span className="card-label" style={{ margin:0 }}>Profit pace</span>
            <span className="fin-legend"><i className="l-actual"/>Actual<i className="l-proj"/>Projected<i className="l-pace"/>Required pace</span>
          </div>
          <ResponsiveContainer width="100%" height={CHART_H(170)}>
            <ComposedChart data={paceData} margin={{ left:0, right:8, top:6, bottom:0 }}>
              <defs>
                <linearGradient id="finAct" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f2ddab" stopOpacity={0.35}/><stop offset="95%" stopColor="#f2ddab" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,166,74,0.08)"/>
              <XAxis dataKey="day" tick={axis} interval={4}/>
              <YAxis tick={axis} width={40} tickFormatter={Jk}/>
              <Tooltip contentStyle={tt} formatter={v => J(v)} labelFormatter={d => `${monthName(month, { month:'short' })} ${d}`}/>
              <ReferenceLine y={target} stroke="#d3a855" strokeDasharray="5 4" label={{ value:'Minimum', fill:'#d3a855', fontSize:10, position:'insideTopLeft' }}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)"/>
              <Line type="linear" dataKey="pace" name="Required pace" stroke="rgba(211,168,85,0.45)" strokeWidth={1.5} dot={false}/>
              <Area type="stepAfter" dataKey="actual" name="Actual" stroke="#e6c47c" fill="url(#finAct)" strokeWidth={2} connectNulls={false}/>
              <Line type="linear" dataKey="projected" name="Projected" stroke="#ff9a4a" strokeDasharray="4 4" strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card span-4">
          <div className="card-label">Where the money went</div>
          {expCats.length === 0 ? <div className="agenda-empty small">No expenses in {monthName(month, { month:'long' })}.</div> : (
            <div className="fin-cats">
              {expCats.map(([cat, v]) => {
                const limit = budgetOf(cat);
                return (
                  <div key={cat} className="fin-cat">
                    <div className="row-between"><span>{cat}</span><span className={limit && v > limit ? 'bad' : ''}>{J(v)}{limit ? <em> / {J(limit)}</em> : ''}</span></div>
                    <div className="fin-cat-bar">
                      <div className={`fill ${limit && v > limit ? 'over' : ''}`} style={{ width: `${(v / maxCat) * 100}%` }}/>
                      {limit > 0 && <div className="limit" style={{ left: `${(limit / maxCat) * 100}%` }}/>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {owed > 0 && (
            <div className="fin-owed">
              <div className="card-label" style={{ margin:'1.1rem 0 0.5rem' }}>Owed to you</div>
              {overdueRet.map(r => <div key={r.l.id} className="row-between"><span>{r.l.businessName} · {r.months.length > 1 ? `${r.months.length} retainers` : 'retainer'}</span><span className="bad">{J(r.amount)}</span></div>)}
              {setupOwed.map(x => <div key={x.l.id} className="row-between"><span>{x.l.businessName} · project</span><span className="warn">{J(x.due)}</span></div>)}
            </div>
          )}
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom:'0.75rem' }}>
            <span className="card-label" style={{ margin:0 }}>12 months · click a month to open it</span>
            <span className="fin-legend"><i className="l-inc"/>Income<i className="l-exp"/>Expenses<i className="l-net"/>Net</span>
          </div>
          <ResponsiveContainer width="100%" height={CHART_H(150)}>
            <ComposedChart data={trend} margin={{ left:0, right:8, top:6, bottom:0 }} onClick={e => e?.activePayload?.[0] && setMonth(e.activePayload[0].payload.mk)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,166,74,0.08)"/>
              <XAxis dataKey="label" tick={axis}/>
              <YAxis tick={axis} width={40} tickFormatter={Jk}/>
              <Tooltip contentStyle={tt} formatter={v => J(v)} cursor={{ fill:'rgba(212,166,74,0.07)' }}/>
              <ReferenceLine y={target} stroke="#d3a855" strokeDasharray="5 4"/>
              <Bar dataKey="income" name="Income" maxBarSize={22} radius={[3,3,0,0]}>
                {trend.map(t => <Cell key={t.mk} fill={t.mk === month ? '#f2ddab' : 'rgba(212,166,74,0.6)'}/>)}
              </Bar>
              <Bar dataKey="expenses" name="Expenses" maxBarSize={22} radius={[3,3,0,0]}>
                {trend.map(t => <Cell key={t.mk} fill={t.mk === month ? '#ff6a45' : 'rgba(255,106,69,0.5)'}/>)}
              </Bar>
              <Line type="monotone" dataKey="net" name="Net" stroke="#e6c47c" strokeWidth={2} dot={{ r:2.5 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Ledger */}
        <div className="card fin-ledger">
          <div className="fin-ledger-bar">
            <span className="card-label" style={{ margin:0 }}>{q ? 'Search results · all months' : `Ledger · ${monthName(month, { month:'long' })}`}</span>
            <div className="fin-ledger-tools">
              <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all transactions…"/>
              <div className="seg">
                {[['all','All'],['income','In'],['expense','Out']].map(([id, label]) => (
                  <button key={id} className={txType === id ? 'on' : ''} onClick={() => setTxType(id)}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          {txGroups.length === 0
            ? <div className="agenda-empty">{q ? 'No matches.' : `Nothing logged in ${monthName(month, { month:'long' })}.`} <button className="link-btn" onClick={() => setForm({ date: isCurrent ? todayStr : `${month}-01` })}>Log a transaction</button></div>
            : txGroups.map(g => (
              <div key={g.date} className="fin-day">
                <div className="fin-day-head">
                  <span>{g.date ? fmtDate(g.date, { weekday:'short', month:'short', day:'numeric', ...(q ? { year:'numeric' } : {}) }) : 'No date'}</span>
                  <span>{J(g.items.reduce((s, f) => s + (f.type === 'income' ? amountOf(f) : -amountOf(f)), 0))}</span>
                </div>
                {g.items.map(f => {
                  const client = leads.find(l => l.id === f.pipelineLeadId);
                  return (
                    <button key={f.id} className={`fin-tx ${f.type}`} onClick={() => setForm(f)}>
                      <span className="fin-tx-dot"/>
                      <span className="fin-tx-main">
                        <span className="fin-tx-desc">{f.description}</span>
                        <span className="fin-tx-meta">{f.category}{client ? ` · ${client.businessName}` : ''}{f.paymentStage && f.paymentStage !== f.category ? ` · ${f.paymentStage}` : ''}</span>
                      </span>
                      <span className="fin-tx-amt">{f.type === 'income' ? '+' : '−'}{J(amountOf(f)).replace('−', '')}</span>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </>)}

      {view === 'budgets' && (
        <BudgetsView month={month} cats={cur.cats} last3={last3} budgets={budgets} avgInc={avgInc} target={target}
          level={level} onSetBudget={onSetBudget} isCurrent={isCurrent} today={today} dim={dim}/>
      )}

      {view === 'forecast' && (<>
        <div className="card span-8">
          <div className="row-between" style={{ marginBottom:'0.75rem' }}>
            <span className="card-label" style={{ margin:0 }}>Cash on hand · next {horizon} months</span>
            <div className="seg">{[3,6,12].map(m => <button key={m} className={horizon === m ? 'on' : ''} onClick={() => setHorizon(m)}>{m}M</button>)}</div>
          </div>
          <ResponsiveContainer width="100%" height={CHART_H(190)}>
            <ComposedChart data={[{ label:'Now', expected: Math.round(cash), worst: Math.round(cash) }, ...forecast]} margin={{ left:0, right:8, top:6, bottom:0 }}>
              <defs><linearGradient id="finExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f2ddab" stopOpacity={0.3}/><stop offset="95%" stopColor="#f2ddab" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,166,74,0.08)"/>
              <XAxis dataKey="label" tick={axis}/>
              <YAxis tick={axis} width={44} tickFormatter={Jk}/>
              <Tooltip contentStyle={tt} formatter={v => J(v)}/>
              <ReferenceLine y={0} stroke="#ff6a45" strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="expected" name="Expected" stroke="#e6c47c" fill="url(#finExp)" strokeWidth={2}/>
              <Line type="monotone" dataKey="worst" name={topRetainer ? `If ${topRetainer.l.businessName} leaves` : 'Worst case'} stroke="#ff6a45" strokeDasharray="5 4" strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="card span-4">
          <div className="card-label">The honest numbers</div>
          <dl className="fin-kv">
            <div><dt>Average month ({basis})</dt><dd className={avgNet >= target ? 'good' : 'bad'}>{J(avgNet)}</dd></div>
            <div><dt>Level {level} minimum</dt><dd>{J(target)}</dd></div>
            <div><dt>Monthly gap</dt><dd className={avgNet >= target ? 'good' : 'bad'}>{avgNet >= target ? 'None' : J(target - avgNet)}</dd></div>
            <div><dt>Cash in {horizon} months</dt><dd className={forecast[horizon - 1].expected < 0 ? 'bad' : ''}>{J(forecast[horizon - 1].expected)}</dd></div>
            {topRetainer && <div><dt>Without {topRetainer.l.businessName}</dt><dd className={worstNet < 0 ? 'bad' : 'warn'}>{J(worstNet)}/mo</dd></div>}
          </dl>
          <ul className="fin-assume">
            <li>Based on {basis}, including any month where nothing came in.</li>
            <li>Only signed retainers count. Deals still in negotiation don't.</li>
            <li>Spending held at its 3-month average. It rarely goes down on its own.</li>
          </ul>
        </div>
      </>)}

      {view === 'invest' && (
        <InvestAdvisor cash={cash} avgExp={avgExp} avgNet={avgNet} runway={runway} mrr={mrr} target={target}
          advice={investAdvice} loading={investLoading}
          onFetch={async () => {
            setInvestLoading(true);
            try {
              const r = await fetch('https://jaxon-rctv.onrender.com/invest', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({
                profit: cash, cashOnHand: cash, avgMonthlyNet: avgNet, avgMonthlyExpenses: avgExp, runwayMonths: runway === Infinity ? null : runway,
                mrr, totalIncome: finances.filter(f => f.type === 'income').reduce((s, f) => s + amountOf(f), 0),
                totalExpenses: finances.filter(f => f.type === 'expense').reduce((s, f) => s + amountOf(f), 0),
                level, paidClients: paidClients.length, openLeads: leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status)).length,
                recentFinances: finances.slice(0, 20).map(f => ({ type:f.type, amount:f.amount, category:f.category, date:f.date })),
              }) });
              setInvestAdvice(await r.json());
            } catch (e) { console.error(e); }
            setInvestLoading(false);
          }}/>
      )}

      {form !== null && (
        <FinanceModal data={form} leads={leads}
          onSave={d => { d.id ? onUpdate(d.id, d) : onAdd(d); setForm(null); }}
          onDelete={form.id ? deleteForm : null}
          onClose={() => setForm(null)}/>
      )}
      {ConfirmUI}
    </div>
  );
}

function BudgetsView({ month, cats, last3, budgets, avgInc, target, level, onSetBudget, isCurrent, today, dim }) {
  const [draft, setDraft] = useState({});
  const all = [...new Set([...EXPENSE_CATS, ...Object.keys(cats), ...budgets.map(b => b.category)])];
  const limitOf = c => Number(budgets.find(b => b.category === c)?.limit) || 0;
  const avgOf = c => last3.reduce((s, m) => s + (m.cats[c] || 0), 0) / 3;
  const totalLimit = all.reduce((s, c) => s + limitOf(c), 0);
  const spent = Object.values(cats).reduce((s, v) => s + v, 0);
  const allowed = Math.max(0, avgInc - target);        // what you can spend and still hit the minimum
  const commit = c => {
    if (draft[c] === undefined) return;
    const v = Math.max(0, Math.round(Number(draft[c]) || 0));
    onSetBudget(c, v);
    setDraft(d => { const n = { ...d }; delete n[c]; return n; });
  };
  return (<>
    <div className="card span-8">
      <div className="card-label">Monthly budgets · {monthName(month)}</div>
      <div className="fin-budgets">
        <div className="fin-budget head"><span>Category</span><span>Spent</span><span>3-mo avg</span><span>Budget</span><span/></div>
        {all.map(c => {
          const s = cats[c] || 0, limit = limitOf(c);
          const pace = isCurrent ? (limit * today) / dim : limit;
          const status = !limit ? (s > 0 ? 'none' : '') : s > limit ? 'over' : s > pace * 1.15 ? 'ahead' : 'ok';
          return (
            <div key={c} className={`fin-budget ${status}`}>
              <span className="name">{c}</span>
              <span>{J(s)}</span>
              <span className="muted">{J(avgOf(c))}</span>
              <span>
                <input className="input" type="number" min="0" placeholder="No limit"
                  value={draft[c] !== undefined ? draft[c] : (limit || '')}
                  onChange={e => setDraft(d => ({ ...d, [c]: e.target.value }))}
                  onBlur={() => commit(c)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}/>
              </span>
              <span className="state">{{ over:'Over', ahead:'Too fast', ok:'On track', none:'No budget', '':'' }[status]}</span>
              {limit > 0 && <div className="fin-cat-bar"><div className={`fill ${status === 'over' ? 'over' : ''}`} style={{ width: `${Math.min(100, (s / limit) * 100)}%` }}/></div>}
            </div>
          );
        })}
      </div>
    </div>
    <div className="card span-4">
      <div className="card-label">Can you afford your budgets?</div>
      <dl className="fin-kv">
        <div><dt>Average monthly income</dt><dd>{J(avgInc)}</dd></div>
        <div><dt>Level {level} minimum profit</dt><dd>{J(target)}</dd></div>
        <div><dt>Most you can spend</dt><dd className={allowed <= 0 ? 'bad' : 'good'}>{J(allowed)}</dd></div>
        <div><dt>Budgets total</dt><dd className={totalLimit > allowed ? 'bad' : ''}>{J(totalLimit)}</dd></div>
        <div><dt>Spent this month</dt><dd className={spent > allowed ? 'bad' : ''}>{J(spent)}</dd></div>
      </dl>
      <ul className="fin-findings">
        {allowed <= 0 && <li className="danger">Your average income doesn't cover the Level {level} minimum. Every dollar you spend makes it worse.</li>}
        {allowed > 0 && totalLimit > allowed && <li className="danger">Your budgets allow {J(totalLimit - allowed)} more spending than you can afford.</li>}
        {allowed > 0 && totalLimit === 0 && <li className="warn">No budgets set. Start with the categories you spent on last month.</li>}
        {allowed > 0 && totalLimit > 0 && totalLimit <= allowed && <li className="ok">Budgets fit inside what you can afford. Now stick to them.</li>}
      </ul>
    </div>
  </>);
}

function InvestAdvisor({cash,avgExp,avgNet,runway,mrr,target,advice,loading,onFetch}) {
  const reserve = avgExp * 3;                         // 3 months of spending stays untouched
  const investable = Math.max(0, cash - reserve);
  return (<>
    <div className="card span-8">
      <div className="card-label">Before you invest a dollar</div>
      <div className="fin-kv fin-kv-grid">
        <div><dt>Cash on hand</dt><dd>{J(cash)}</dd></div>
        <div><dt>Emergency reserve (3 mo)</dt><dd>{J(reserve)}</dd></div>
        <div><dt>Free to invest</dt><dd className={investable > 0 ? 'good' : 'bad'}>{J(investable)}</dd></div>
        <div><dt>Runway</dt><dd className={runway < 3 ? 'bad' : ''}>{runway === Infinity ? 'No burn' : `${runway.toFixed(1)} mo`}</dd></div>
      </div>
      <ul className="fin-findings">
        {investable <= 0 && <li className="danger">Nothing to invest. Build three months of spending in cash first.</li>}
        {investable > 0 && avgNet < target && <li className="warn">You have spare cash but the business isn't hitting its minimum. Invest in getting clients before anything else.</li>}
        {investable > 0 && avgNet >= target && <li className="ok">Reserve covered and profit on target. Up to {J(investable)} can work for you.</li>}
      </ul>
      <button className="btn-primary" style={{ marginTop:'1rem', opacity: loading ? 0.7 : 1 }} onClick={onFetch} disabled={loading}>
        {loading ? 'JAXON is analysing…' : '⚡ Ask JAXON for reinvestment advice'}
      </button>
    </div>
    <div className="card span-4">
      <div className="card-label">Recurring revenue</div>
      <div className="fin-net pos" style={{ fontSize:32 }}>{J(mrr)}<span className="fin-net-sub"> /mo</span></div>
      <div className="fin-net-sub" style={{ marginTop:'0.5rem' }}>{mrr >= target ? 'Retainers alone cover your minimum.' : `Retainers cover ${Math.round((mrr / target) * 100)}% of your minimum.`}</div>
    </div>
    {advice && (<>
      <div className="card"><div className="card-label">JAXON's assessment</div><p className="fin-advice">{advice.summary}</p></div>
      {advice.opportunities?.map((o, i) => (
        <div key={i} className="card span-6">
          <div className="row-between"><b className="fin-opp">{o.name}</b><span className={`badge ${o.risk === 'Low' ? 'badge-ai' : 'badge-danger'}`}>{o.risk} risk</span></div>
          <p className="fin-advice" style={{ marginTop:'0.5rem' }}>{o.description}</p>
          {o.firstStep && <div className="fin-step">→ {o.firstStep}</div>}
        </div>
      ))}
      {advice.warning && <ul className="fin-findings"><li className="danger">{advice.warning}</li></ul>}
    </>)}
  </>);
}

function FinanceModal({data,leads,onSave,onDelete,onClose}) {
  const [f, setF] = useState({ type:'expense', description:'', amount:'', category:'', date:localDateStr(), pipelineLeadId:'', ...data });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const cats = f.type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const category = cats.includes(f.category) ? f.category : (f.category || cats[0]);
  const valid = f.description.trim() && Number(f.amount) > 0 && f.date;
  const setType = t => setF(p => ({ ...p, type: t, category: (t === 'income' ? INCOME_CATS : EXPENSE_CATS)[0], ...(t === 'expense' ? { pipelineLeadId: '' } : {}) }));
  const save = () => {
    if (!valid) return;
    const out = { ...f, category, amount: Number(f.amount), description: f.description.trim() };
    if (!out.pipelineLeadId) delete out.pipelineLeadId;
    // Client payments carry their stage so retainers and balances owed update
    else if (out.type === 'income' && PAYMENT_STAGES.includes(category)) out.paymentStage = category;
    onSave(out);
  };
  return (
    <Modal title={data.id ? 'Edit Transaction' : 'New Transaction'} onClose={onClose}>
      <div className="seg seg-full">
        <button className={f.type === 'expense' ? 'on' : ''} onClick={() => setType('expense')}>Money out</button>
        <button className={f.type === 'income' ? 'on' : ''} onClick={() => setType('income')}>Money in</button>
      </div>
      <div className={`fin-amount ${f.type}`}>
        <span>J$</span>
        <input type="number" min="0" autoFocus value={f.amount} onChange={e => s('amount', e.target.value)} placeholder="0"/>
      </div>
      <Field label="What was it for?">
        <input className="input" value={f.description} onChange={e => s('description', e.target.value)} placeholder={f.type === 'income' ? 'e.g. Island Pharmacy deposit' : 'e.g. Render hosting'}
          onKeyDown={e => e.key === 'Enter' && save()}/>
      </Field>
      <Field label="Category">
        <div className="sched-cals">
          {cats.map(c => <button key={c} type="button" className={`sched-cal ${category === c ? 'on' : ''}`} style={{ '--c': f.type === 'income' ? '#e63946' : '#ff6a45' }} onClick={() => s('category', c)}><span className="dot"/>{c}</button>)}
        </div>
      </Field>
      <div className="grid-2">
        <Field label="Date"><input className="input" type="date" value={f.date} onChange={e => s('date', e.target.value)}/></Field>
        {f.type === 'income' && (
          <Field label="From client (optional)">
            <select className="input" value={f.pipelineLeadId || ''} onChange={e => s('pipelineLeadId', e.target.value)}>
              <option value="">None</option>
              {leads.filter(l => l.status === 'Paid' || l.id === f.pipelineLeadId).map(l => <option key={l.id} value={l.id}>{l.businessName}</option>)}
            </select>
          </Field>
        )}
      </div>
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={onDelete}><Icons.trash size={13}/> Delete transaction</button>}
    </Modal>
  );
}

// ─── GOALS (page) ───────────────────────────────────────────────────────────────
function Goals({ goals, finances, leads, timers, todayStr, onAdd, onUpdate, onDelete }) {
  const { confirm, ConfirmUI } = useConfirm();
  const [filter, setFilter] = useState('active');
  const [area, setArea] = useState('All');
  const [form, setForm] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const [logVal, setLogVal] = useState('');
  const [stepDraft, setStepDraft] = useState({});
  const ctx = { finances, leads, timers };

  const rows = goals.map(g => {
    const st = goalStatus(g, todayStr), cur = goalProgress(g, ctx), target = goalTarget(g);
    const pct = st === 'done' ? 1 : target > 0 ? Math.min(1, Math.max(0, cur / target)) : 0;
    const daysLeft = g.deadline ? Math.round((parseLocal(g.deadline) - parseLocal(todayStr)) / 864e5) : null;
    const start = g.startDate || (g.createdAt?.toDate ? localDateStr(g.createdAt.toDate()) : todayStr);
    const span = g.deadline ? Math.max(1, Math.round((parseLocal(g.deadline) - parseLocal(start)) / 864e5)) : null;
    const elapsed = g.deadline ? Math.min(1, Math.max(0, Math.round((parseLocal(todayStr) - parseLocal(start)) / 864e5) / span)) : null;
    const behind = st === 'active' && g.kind !== 'milestone' && elapsed !== null && pct + 0.05 < elapsed;
    const perWeek = st === 'active' && goalKind(g).shape === 'number' && daysLeft !== null && daysLeft >= 0 ? Math.max(0, target - cur) / Math.max(1, (daysLeft + 1) / 7) : null;
    return { g, st, cur, target, pct, daysLeft, elapsed, behind, perWeek };
  });
  const counts = { active: 0, done: 0, failed: 0 };
  rows.forEach(r => { counts[r.st]++; });
  const shown = rows
    .filter(r => (filter === 'all' || r.st === filter) && (area === 'All' || goalArea(r.g) === area))
    .sort((a, b) => filter === 'done'
      ? (b.g.completedAt || '').localeCompare(a.g.completedAt || '')
      : (a.g.deadline || '9999').localeCompare(b.g.deadline || '9999'));
  const nextDue = rows.filter(r => r.st === 'active' && r.daysLeft !== null).sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const earned = goals.reduce((s, g) => s + goalXP(g, todayStr), 0);

  const createdMs = g => (g.createdAt?.toDate ? g.createdAt.toDate().getTime() : Date.now());
  const complete = async g => {
    if (await confirm({ message: `Mark "${g.title}" as done? This is final. +100 XP.`, label: "It's done", danger: false }))
      onUpdate(g.id, { status: 'done', completedAt: new Date().toISOString() });
  };
  const giveUp = async g => {
    if (await confirm({ message: `Give up on "${g.title}"? It counts as missed: −50 XP.`, label: 'Give up', danger: true })) {
      onUpdate(g.id, { status: 'failed', failedAt: new Date().toISOString() }); setForm(null);
    }
  };
  const remove = async g => {
    if (await confirm({ message: `Delete "${g.title}"?`, label: 'Delete', danger: true })) { onDelete(g.id); setForm(null); }
  };
  const logManual = () => {
    const v = Number(logVal);
    if (!logFor || logVal === '' || Number.isNaN(v)) return;
    onUpdate(logFor.id, { current: v }); setLogFor(null); setLogVal('');
  };
  const toggleStep = (g, id) => onUpdate(g.id, { steps: (g.steps || []).map(s => (s.id === id ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : null } : s)) });
  const addStep = g => {
    const text = (stepDraft[g.id] || '').trim();
    if (!text) return;
    onUpdate(g.id, { steps: [...(g.steps || []), { id: Date.now().toString(36), text, done: false }] });
    setStepDraft(d => ({ ...d, [g.id]: '' }));
  };

  return (
    <div className="section goals">
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Goals</div></div>
        <div className="seg">
          {[['active', `Active ${counts.active}`], ['done', `Reached ${counts.done}`], ['failed', `Missed ${counts.failed}`], ['all', 'All']].map(([id, label]) => (
            <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setForm({})}><Icons.plus size={14}/> Goal</button>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Active</span><b>{counts.active}</b><span className="fin-delta">{rows.filter(r => r.behind).length} behind pace</span></div>
        <div className="fin-tile"><span>Reached</span><b className="good">{counts.done}</b><span className="fin-delta">{goals.filter(g => g.logged).length} logged after the fact</span></div>
        <div className="fin-tile"><span>XP from goals</span><b className={earned < 0 ? 'bad' : 'good'}>{earned >= 0 ? '+' : ''}{earned}</b><span className="fin-delta">{counts.failed} missed</span></div>
        <div className="fin-tile"><span>Next deadline</span><b>{nextDue ? (nextDue.daysLeft === 0 ? 'Today' : `${nextDue.daysLeft}d`) : '—'}</b><span className="fin-delta">{nextDue ? nextDue.g.title : 'nothing dated'}</span></div>
      </div>

      <div className="sched-cals">
        {['All', ...GOAL_AREAS.map(a => a.id)].map(a => {
          const n = rows.filter(r => (filter === 'all' || r.st === filter) && (a === 'All' || goalArea(r.g) === a)).length;
          return <button key={a} className={`sched-cal ${area === a ? 'on' : ''}`} style={{ '--c': GOAL_AREA_HEX[a] || '#e6c47c' }} onClick={() => setArea(a)}><span className="dot"/>{a}<span className="hrs">{n}</span></button>;
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card agenda-empty">
          {filter === 'active' ? 'No active goals here. A goal can be a number, a list of steps, or one thing you get done.' : filter === 'done' ? 'Nothing reached yet. Already done something big? Log it.' : 'Nothing here.'}
          {' '}<button className="link-btn" onClick={() => setForm(filter === 'done' ? { already: true } : {})}>{filter === 'done' ? 'Log a win' : 'Set a goal'}</button>
        </div>
      ) : (
        <div className="goal-grid">
          {shown.map(({ g, st, cur, target, pct, daysLeft, elapsed, behind, perWeek }) => {
            const k = goalKind(g), a = goalArea(g), hex = GOAL_AREA_HEX[a];
            return (
              <div key={g.id} className={`card goal-card ${st} ${behind ? 'behind' : ''} kind-${k.shape}`} style={{ '--c': hex }}>
                <div className="focus-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="goal-area"><i/>{a} · {k.label}{k.auto ? ' · tracks itself' : ''}</div>
                    <div className="focus-title">{g.title}</div>
                    {g.why && <div className="goal-why">{g.why}</div>}
                  </div>
                  <button className="icon-btn" title="Edit" onClick={() => setForm(g)}><Icons.edit size={12}/></button>
                </div>

                {g.kind === 'milestone' && st === 'active' && (
                  <button className="btn-primary goal-done-btn" onClick={() => complete(g)}><Icons.check size={16}/> Mark as done</button>
                )}

                {g.kind === 'steps' && (
                  <div className="goal-steps">
                    {(g.steps || []).map(s => (
                      <button key={s.id} className={`goal-step ${s.done ? 'done' : ''}`} disabled={st !== 'active'} onClick={() => toggleStep(g, s.id)}>
                        <span className="goal-step-box">{s.done ? '✓' : ''}</span><span>{s.text}</span>
                      </button>
                    ))}
                    {st === 'active' && (
                      <input className="input goal-step-add" value={stepDraft[g.id] || ''} placeholder="Add a step…"
                        onChange={e => setStepDraft(d => ({ ...d, [g.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addStep(g)}/>
                    )}
                  </div>
                )}

                {g.kind !== 'milestone' && (<>
                  <div className="goal-nums">
                    <span className="goal-cur">{g.kind === 'steps' ? `${cur}/${target}` : fmtGoal(g, cur)}</span>
                    {g.kind !== 'steps' && <span className="goal-target">of {fmtGoal(g, target)}</span>}
                    {g.kind === 'steps' && <span className="goal-target">steps done</span>}
                    <span className="goal-pct">{Math.floor(pct * 100)}%</span>
                  </div>
                  <div className="goal-bar">
                    <div className="goal-fill" style={{ width: `${pct * 100}%` }}/>
                    {elapsed !== null && st === 'active' && <div className="goal-time" style={{ left: `${elapsed * 100}%` }} title="Where you should be by now"/>}
                  </div>
                </>)}

                <div className="goal-foot">
                  {st === 'done' && <span className="good">{g.logged ? 'Logged win' : 'Reached'}{g.completedAt ? ` · ${fmtDate(localDateStr(new Date(g.completedAt)), { month:'short', day:'numeric', year:'numeric' })}` : ''}{g.logged ? '' : ' · +100 XP'}</span>}
                  {st === 'failed' && <span className="bad">Missed · −50 XP</span>}
                  {st === 'active' && (<>
                    <span className={daysLeft !== null && daysLeft <= 3 ? 'bad' : ''}>
                      {g.deadline ? `Due ${fmtDate(g.deadline, { month:'short', day:'numeric' })} · ${daysLeft === 0 ? 'today' : `${daysLeft}d left`}` : 'No deadline'}
                    </span>
                    {perWeek !== null && perWeek > 0 && <span className={behind ? 'bad' : ''}>{fmtGoal(g, perWeek)}/week needed</span>}
                  </>)}
                </div>
                {behind && <div className="goal-warn">Behind pace. {Math.round(elapsed * 100)}% of the time is gone and you're {Math.floor(pct * 100)}% there.</div>}
                {st === 'active' && k.shape === 'number' && !k.auto && (
                  <button className="btn-ghost goal-log" onClick={() => { setLogFor(g); setLogVal(String(Number(g.current) || 0)); }}>Update progress</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {logFor && (
        <Modal title={`Update: ${logFor.title}`} onClose={() => setLogFor(null)}>
          <Field label={`Where are you now? (${goalUnit(logFor) || 'number'})`}>
            <input className="input" type="number" autoFocus value={logVal} onChange={e => setLogVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && logManual()}/>
          </Field>
          <div className="focus-preview"><div>Target: <b>{fmtGoal(logFor, goalTarget(logFor))}</b>. Be honest. Nobody else is checking.</div></div>
          <ModalFoot onClose={() => setLogFor(null)} onSave={logManual}/>
        </Modal>
      )}
      {form !== null && (
        <GoalModal data={form} todayStr={todayStr}
          onSave={d => { form.id ? onUpdate(form.id, d) : onAdd(d); setForm(null); }}
          onGiveUp={form.id && goalStatus(form, todayStr) === 'active' ? () => giveUp(form) : null}
          onDelete={form.id && (form.logged || Date.now() - createdMs(form) < DELETE_GRACE_MS) ? () => remove(form) : null}
          onClose={() => setForm(null)}/>
      )}
      {ConfirmUI}
    </div>
  );
}

function GoalModal({ data, todayStr, onSave, onGiveUp, onDelete, onClose }) {
  const editing = !!data.id;
  const locked = editing && goalStatus(data, todayStr) !== 'active';
  const [title, setTitle] = useState(data.title || '');
  const [why, setWhy] = useState(data.why || '');
  const [area, setArea] = useState(editing ? goalArea(data) : 'Business');
  const [kind, setKind] = useState(data.kind || (editing ? 'custom' : 'milestone'));
  const [unit, setUnit] = useState(data.unit || (editing && !data.kind ? 'J$' : ''));
  const [target, setTarget] = useState(data.target ?? '');
  const [startDate, setStartDate] = useState(data.startDate || todayStr);
  const [deadline, setDeadline] = useState(data.deadline || '');
  const [steps, setSteps] = useState(data.steps?.length ? data.steps : [{ id: 's1', text: '', done: false }, { id: 's2', text: '', done: false }]);
  const [already, setAlready] = useState(!!data.already);
  const [doneOn, setDoneOn] = useState(todayStr);
  const k = GOAL_KINDS.find(x => x.id === kind);
  const minTarget = editing ? Number(data.target) || 0 : 0;
  const cleanSteps = steps.filter(s => s.text.trim()).map(s => ({ ...s, text: s.text.trim() }));
  const canLog = !editing && k.shape === 'do';

  const problems = [];
  if (!title.trim()) problems.push('Name the goal.');
  if (kind === 'steps' && cleanSteps.length < 2) problems.push('Add at least two steps, or make it a milestone.');
  if (editing && kind === 'steps' && cleanSteps.length < (data.steps || []).length) problems.push("Steps can be added, not removed.");
  if (k.shape === 'number' && !(Number(target) > 0)) problems.push('Set a target above zero.');
  if (k.shape === 'number' && editing && Number(target) < minTarget) problems.push(`The target can't go below ${minTarget.toLocaleString()}.`);
  if (!(already && canLog)) {
    if (deadline && deadline < todayStr && !editing) problems.push('The deadline must be today or later.');
    if (editing && data.deadline && (!deadline || deadline > data.deadline)) problems.push("You can't push the deadline back.");
  } else if (!doneOn || doneOn > todayStr) problems.push("Pick the date you did it. It can't be in the future.");

  const save = () => {
    if (problems.length) return;
    const base = { title: title.trim(), why: why.trim(), area, kind, unit: kind === 'custom' ? unit.trim() : '' };
    if (k.shape === 'number') Object.assign(base, { target: Number(target), startDate });
    if (kind === 'steps') base.steps = already && canLog ? cleanSteps.map(s => ({ ...s, done: true })) : cleanSteps;
    if (already && canLog) return onSave({ ...base, status: 'done', logged: true, completedAt: new Date(`${doneOn}T12:00:00`).toISOString(), deadline: '' });
    onSave({ ...base, deadline: deadline || '', ...(editing ? {} : { current: 0, status: 'active' }) });
  };
  const setStep = (i, text) => setSteps(list => list.map((s, j) => (j === i ? { ...s, text } : s)));

  return (
    <Modal title={editing ? 'Edit Goal' : already ? 'Log a Win' : 'New Goal'} onClose={onClose}>
      <Field label="Goal"><input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Register the business" disabled={locked}/></Field>
      <Field label="Why it matters (optional)"><input className="input" value={why} onChange={e => setWhy(e.target.value)} placeholder="One line you'll read when you want to quit" disabled={locked}/></Field>
      <Field label="Area of life">
        <div className="sched-cals">
          {GOAL_AREAS.map(a => <button key={a.id} type="button" className={`sched-cal ${area === a.id ? 'on' : ''}`} style={{ '--c': a.hex }} onClick={() => !locked && setArea(a.id)}><span className="dot"/>{a.id}</button>)}
        </div>
      </Field>
      <Field label="What kind of goal?">
        <div className="sched-cals">
          {GOAL_KINDS.map(x => (
            <button key={x.id} type="button" className={`sched-cal ${kind === x.id ? 'on' : ''}`} style={{ '--c': x.shape === 'do' ? '#e63946' : x.auto ? '#e6c47c' : '#ff9a4a' }}
              onClick={() => !editing && setKind(x.id)} disabled={editing && kind !== x.id}><span className="dot"/>{x.label}</button>
          ))}
        </div>
        <div className="goal-hint">{k.hint}{editing ? ' The kind is fixed once created.' : ''}</div>
      </Field>

      {kind === 'steps' && (
        <Field label={editing ? 'Steps (you can add more)' : 'Steps'}>
          <div className="goal-step-edit">
            {steps.map((s, i) => (
              <div key={s.id} className="row-gap">
                <input className="input" value={s.text} onChange={e => setStep(i, e.target.value)} placeholder={`Step ${i + 1}`} disabled={locked || (editing && i < (data.steps || []).length)}/>
                {!editing && steps.length > 2 && <button type="button" className="icon-btn danger-btn" onClick={() => setSteps(l => l.filter((_, j) => j !== i))}><Icons.close size={12}/></button>}
              </div>
            ))}
            {!locked && <button type="button" className="btn-ghost" style={{ justifyContent: 'center' }} onClick={() => setSteps(l => [...l, { id: `s${Date.now().toString(36)}`, text: '', done: false }])}><Icons.plus size={13}/> Add step</button>}
          </div>
        </Field>
      )}

      {k.shape === 'number' && (
        <div className="grid-2">
          <Field label={`Target${k.unit ? ` (${k.unit})` : ''}`}><input className="input" type="number" min={minTarget} value={target} onChange={e => setTarget(e.target.value)} disabled={locked}/></Field>
          {kind === 'custom' && <Field label="Unit"><input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="books, kg, apps…" disabled={locked}/></Field>}
          {k.auto && <Field label="Count from"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={editing}/></Field>}
        </div>
      )}

      {canLog && (
        <label className="goal-already">
          <input type="checkbox" checked={already} onChange={e => setAlready(e.target.checked)}/>
          <span>I've already done this. Put it on my record.</span>
        </label>
      )}

      {already && canLog
        ? <Field label="When did you do it?"><input className="input" type="date" value={doneOn} max={todayStr} onChange={e => setDoneOn(e.target.value)}/></Field>
        : <Field label="Deadline"><input className="input" type="date" value={deadline} min={todayStr} max={editing && data.deadline ? data.deadline : undefined} onChange={e => setDeadline(e.target.value)} disabled={locked}/></Field>}

      {!locked && (
        <div className="focus-preview">
          {already && canLog ? (<>
            <div>This goes on your record as a win.</div>
            <div className="muted">No XP: XP is for things you commit to first and then do. The win still counts for you.</div>
          </>) : (<>
            <div><b className="good">+100 XP</b> when you reach it.</div>
            <div>{deadline ? <><b className="bad">−50 XP</b> if it isn't done by {fmtDate(deadline, { weekday:'short', month:'short', day:'numeric' })}.</> : 'No deadline means no pressure, and goals without pressure rarely happen.'}</div>
            {!editing && <div className="muted">Once set: the deadline can't move later{k.shape === 'number' ? ", the target can't go down" : kind === 'steps' ? ', steps can be added but not removed' : ''}.</div>}
          </>)}
        </div>
      )}
      {problems.length > 0 && !locked && <div className="form-warn">{problems[0]}</div>}
      {!locked ? <ModalFoot onClose={onClose} onSave={save}/> : <ModalFoot onClose={onClose}/>}
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={onDelete}><Icons.trash size={13}/> {data.logged ? 'Remove from record' : 'Delete (created by mistake)'}</button>}
      {!onDelete && onGiveUp && <button className="btn-ghost danger-text" style={{ justifyContent:'center' }} onClick={onGiveUp}>Give up (counts as missed)</button>}
    </Modal>
  );
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
// A client is a lead with status "Paid". clientStatus (Active / Paused /
// Churned) controls whether their retainer is counted and chased.
const CLIENT_STATES = [
  { id:'Active',  hex:'#e6c47c' },
  { id:'Paused',  hex:'#b89f8b' },
  { id:'Churned', hex:'#ff5a36' },
];
const CLIENT_HEX = Object.fromEntries(CLIENT_STATES.map(c => [c.id, c.hex]));
const clientState = l => l.clientStatus || 'Active';
const BIZ_TYPES = ['Restaurant','Retail','Pharmacy','School','Salon','Mechanic','Wholesale','Real Estate','Bakery','Church','Hotel','Other'];

function ClientManagement({ leads, finances, todayStr, onAdd, onUpdate, onRemove }) {
  const { confirm, ConfirmUI } = useConfirm();
  const clients = leads.filter(l => l.status === 'Paid');
  const [sel, setSel]         = useState(null);
  const [filter, setFilter]   = useState('Active');
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState('overview');
  const [clientForm, setClientForm] = useState(null);   // {} new · client edit
  const [payForm, setPayForm] = useState(null);
  const [editProduct, setEditProduct] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNote, setEditingNote] = useState(null);

  const thisMonth = todayStr.slice(0, 7);
  const today = Number(todayStr.slice(8));
  const paymentsOf = id => finances.filter(f => f.pipelineLeadId === id && f.type === 'income').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const projectPaid = id => paymentsOf(id).filter(f => f.paymentStage !== 'Monthly Retainer').reduce((s, f) => s + amountOf(f), 0);
  const retainerGot = (l, mk) => retainerCollected(l, mk, finances);
  const owedBy = l => {
    const project = Math.max(0, (Number(l.value) || 0) - projectPaid(l.id));
    const arrears = retainerArrears(l, finances, todayStr);
    const ret = arrears.length * (Number(l.retainerAmount) || 0);
    return { project, ret, arrears, total: project + ret };
  };

  const q = search.trim().toLowerCase();
  const list = clients
    .filter(l => filter === 'All' || clientState(l) === filter)
    .filter(l => !q || [l.businessName, l.contactName, l.phone, l.location].some(v => (v || '').toLowerCase().includes(q)))
    .sort((a, b) => owedBy(b).total - owedBy(a).total || (a.businessName || '').localeCompare(b.businessName || ''));
  const client = clients.find(c => c.id === sel) || list[0] || null;

  const active = clients.filter(l => clientState(l) === 'Active');
  const mrr = active.reduce((s, l) => s + (Number(l.retainerAmount) || 0), 0);
  const owedAll = clients.reduce((s, l) => s + owedBy(l).total, 0);
  const lifetime = finances.filter(f => f.type === 'income' && clients.some(c => c.id === f.pipelineLeadId)).reduce((s, f) => s + amountOf(f), 0);

  // ── Actions ────────────────────────────────────────────────────────────────
  const saveClient = async d => {
    const { fromLeadId, ...data } = d;
    if (fromLeadId) { await onUpdate('leads', fromLeadId, { ...data, status: 'Paid' }); setSel(fromLeadId); }
    else if (d.id) await onUpdate('leads', d.id, data);
    else { const ref = await onAdd('leads', { ...data, status: 'Paid', source: 'Manual' }); if (ref?.id) setSel(ref.id); }
    setClientForm(null); setFilter(f => (f === 'All' ? f : data.clientStatus || 'Active'));
  };

  const setRetainerMonth = async (l, mk, collected) => {
    const logged = paymentsOf(l.id).find(f => f.paymentStage === 'Monthly Retainer' && monthOf(f.date) === mk);
    if (!collected && logged) {
      const ok = await confirm({ message: `Unmark ${monthName(mk)}? This also deletes the ${J(amountOf(logged))} retainer payment from Finance.`, label: 'Unmark', danger: true });
      if (!ok) return;
      await onRemove('finances', logged.id);
    }
    await onUpdate('leads', l.id, { retainerLog: { ...(l.retainerLog || {}), [mk]: collected } });
    if (collected && !logged && Number(l.retainerAmount) > 0) {
      const day = String(Math.min(daysInMonth(mk), Number(l.retainerDueDay) || 1)).padStart(2, '0');
      await onAdd('finances', {
        type: 'income', description: `${l.businessName} — Monthly Retainer ${mk}`, amount: Number(l.retainerAmount),
        category: 'Monthly Retainer', date: mk === thisMonth ? todayStr : `${mk}-${day}`, pipelineLeadId: l.id, paymentStage: 'Monthly Retainer',
      });
    }
  };

  const savePayment = d => { d.id ? onUpdate('finances', d.id, d) : onAdd('finances', d); setPayForm(null); };
  const deletePayment = async () => {
    if (await confirm({ message: `Delete this ${J(amountOf(payForm))} payment? It's removed from Finance too.`, label: 'Delete', danger: true })) { onRemove('finances', payForm.id); setPayForm(null); }
  };

  const notes = (client?.clientNotes || []).slice().sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const saveNote = () => {
    const text = noteDraft.trim();
    if (!text || !client) return;
    const all = client.clientNotes || [];
    const next = editingNote
      ? all.map(n => (n.id === editingNote ? { ...n, text, edited: new Date().toISOString() } : n))
      : [...all, { id: Date.now().toString(36), text, at: new Date().toISOString() }];
    onUpdate('leads', client.id, { clientNotes: next });
    setNoteDraft(''); setEditingNote(null);
  };
  const deleteNote = async n => {
    if (await confirm({ message: 'Delete this note?', label: 'Delete', danger: true }))
      onUpdate('leads', client.id, { clientNotes: (client.clientNotes || []).filter(x => x.id !== n.id) });
  };

  const removeClient = async mode => {
    const l = deleting;
    if (mode === 'pipeline') await onUpdate('leads', l.id, { status: 'Lost', clientStatus: null });
    else {
      // Keep the money in Finance, just unlink it from the deleted client
      await Promise.all(finances.filter(f => f.pipelineLeadId === l.id).map(f => onUpdate('finances', f.id, { pipelineLeadId: null })));
      await onRemove('leads', l.id);
    }
    setDeleting(null); setSel(null);
  };

  const waNumber = p => (p || '').replace(/\D/g, '');
  const counts = Object.fromEntries(CLIENT_STATES.map(s => [s.id, clients.filter(l => clientState(l) === s.id).length]));

  return (
    <div className="section clients">
      <SectionGhost src={uchihaArt}/>
      <div className="sched-bar">
        <div className="sched-range"><div className="sched-title" style={{ marginLeft: 0 }}>Clients</div></div>
        <div className="seg">
          {[...CLIENT_STATES.map(s => [s.id, `${s.id} ${counts[s.id]}`]), ['All', `All ${clients.length}`]].map(([id, label]) => (
            <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setClientForm({})}><Icons.plus size={14}/> Client</button>
      </div>

      <div className="grid-2">
        <div className="fin-tile"><span>Active clients</span><b>{active.length}</b><span className="fin-delta">{counts.Paused} paused · {counts.Churned} churned</span></div>
        <div className="fin-tile"><span>Retainers (MRR)</span><b className="good">{J(mrr)}</b><span className="fin-delta">active clients only</span></div>
        <div className="fin-tile"><span>Owed to you</span><b className={owedAll ? 'bad' : ''}>{J(owedAll)}</b><span className="fin-delta">{owedAll ? 'chase it' : 'all settled'}</span></div>
        <div className="fin-tile"><span>Lifetime revenue</span><b>{J(lifetime)}</b><span className="fin-delta">from these clients</span></div>
      </div>

      {/* List */}
      <div className="card cl-list span-4">
        <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"/>
        {list.length === 0
          ? <div className="agenda-empty small">{clients.length ? 'No clients match.' : 'No clients yet.'} <button className="link-btn" onClick={() => setClientForm({})}>Add one</button></div>
          : list.map(l => {
            const o = owedBy(l);
            return (
              <button key={l.id} className={`cl-row ${client?.id === l.id ? 'on' : ''}`} onClick={() => { setSel(l.id); setTab('overview'); setNoteDraft(''); setEditingNote(null); }} style={{ '--c': CLIENT_HEX[clientState(l)] }}>
                <span className="cl-avatar">{(l.businessName || '?')[0]}</span>
                <span className="cl-row-main">
                  <span className="cl-row-name">{l.businessName}</span>
                  <span className="cl-row-meta">{clientState(l)}{Number(l.retainerAmount) > 0 ? ` · ${J(l.retainerAmount)}/mo` : ''}</span>
                </span>
                {o.total > 0 && <span className="cl-owed">{J(o.total)}</span>}
              </button>
            );
          })}
      </div>

      {/* Detail */}
      {!client ? (
        <div className="card span-8 agenda-empty">Close a deal in the Pipeline, or add a client directly.</div>
      ) : (() => {
        const o = owedBy(client), pays = paymentsOf(client.id);
        const paidTotal = pays.reduce((s, f) => s + amountOf(f), 0);
        const since = clientSinceOf(client);
        return (
          <div className="cl-detail span-8">
            <div className="card cl-head" style={{ '--c': CLIENT_HEX[clientState(client)] }}>
              <div className="cl-head-top">
                <span className="cl-avatar big">{(client.businessName || '?')[0]}</span>
                <div className="cl-head-main">
                  <div className="cl-name">{client.businessName}</div>
                  <div className="cl-sub">
                    <span className="cl-state">{clientState(client)}</span>
                    {client.businessType && <span>{client.businessType}</span>}
                    {client.location && <span>{client.location}{client.country ? `, ${client.country}` : ''}</span>}
                    {since && <span>client since {fmtDate(since, { month:'short', year:'numeric' })}</span>}
                  </div>
                </div>
                <div className="cl-head-actions">
                  <button className="icon-btn" title="Edit client" onClick={() => setClientForm(client)}><Icons.edit size={13}/></button>
                  <button className="icon-btn danger-btn" title="Delete client" onClick={() => setDeleting(client)}><Icons.trash size={13}/></button>
                </div>
              </div>
              <div className="cl-contact">
                {client.contactName && <span>👤 {client.contactName}</span>}
                {client.phone && <a className="wa-btn" href={`https://wa.me/${waNumber(client.phone)}`} target="_blank" rel="noopener noreferrer"><Icons.whatsapp size={13}/> WhatsApp</a>}
                {client.phone && <a className="wa-btn cl-btn" href={`tel:${client.phone}`}><Icons.phone size={13}/> {client.phone}</a>}
                {client.email && <a className="wa-btn cl-btn" href={`mailto:${client.email}`}>✉ {client.email}</a>}
                {client.websiteUrl && <a className="wa-btn cl-btn" href={client.websiteUrl} target="_blank" rel="noopener noreferrer">↗ Website</a>}
              </div>
            </div>

            <div className="grid-2">
              <div className="fin-tile"><span>Paid to date</span><b className="good">{J(paidTotal)}</b><span className="fin-delta">{pays.length} payment{pays.length === 1 ? '' : 's'}</span></div>
              <div className="fin-tile"><span>Project balance</span><b className={o.project ? 'bad' : ''}>{J(o.project)}</b><span className="fin-delta">of {J(client.value || 0)}</span></div>
              <div className="fin-tile"><span>Retainer</span><b>{Number(client.retainerAmount) > 0 ? `${J(client.retainerAmount)}` : '—'}</b><span className="fin-delta">{Number(client.retainerAmount) > 0 ? `due day ${client.retainerDueDay || 1}` : 'none set'}</span></div>
              <div className="fin-tile"><span>This month</span><b className={o.ret ? 'bad' : Number(client.retainerAmount) > 0 && retainerGot(client, thisMonth) ? 'good' : ''}>{Number(client.retainerAmount) > 0 ? (retainerGot(client, thisMonth) ? 'Collected' : o.ret ? 'Overdue' : 'Due') : '—'}</b><span className="fin-delta">{o.arrears.length ? `${o.arrears.length} unpaid · ${J(o.ret)}` : `${monthName(thisMonth, { month:'long' })} retainer`}</span></div>
            </div>

            <div className="seg seg-full">
              {[['overview','Overview'],['payments',`Payments ${pays.length}`],['retainers','Retainers'],['notes',`Notes ${notes.length}`]].map(([id, label]) => (
                <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="cl-cols">
                <div className="card">
                  <div className="card-label">Profile</div>
                  <dl className="fin-kv">
                    {[['Contact', client.contactName], ['Phone', client.phone], ['Email', client.email], ['Business type', client.businessType], ['Size', client.businessSize],
                      ['Location', [client.location, client.country].filter(Boolean).join(', ')], ['Project fee', client.value ? J(client.value) : ''],
                      ['Retainer', Number(client.retainerAmount) > 0 ? `${J(client.retainerAmount)}/mo · day ${client.retainerDueDay || 1}` : ''], ['Client since', since]]
                      .map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v ? '' : 'muted'}>{v || '—'}</dd></div>)}
                  </dl>
                  {client.notes && <div className="notes-box" style={{ marginTop:'0.75rem' }}>{client.notes}</div>}
                </div>
                <div className="card">
                  <div className="row-between" style={{ marginBottom:'0.75rem' }}>
                    <span className="card-label" style={{ margin:0 }}>Product & tech</span>
                    <button className="icon-btn" title="Edit product" onClick={() => setEditProduct(true)}><Icons.edit size={12}/></button>
                  </div>
                  {!client.product ? <div className="agenda-empty small">No product details. <button className="link-btn" onClick={() => setEditProduct(true)}>Add them</button></div> : (<>
                    <dl className="fin-kv">
                      {client.product.type && <div><dt>Product</dt><dd>{client.product.type}</dd></div>}
                      {Object.entries(client.product.techStack || {}).map(([k, v]) => {
                        const label = (TECH_FIELDS.find(f => f[0] === k) || [k, k])[1];
                        return <div key={k}><dt>{label}</dt><dd>{/^https?:/.test(v) ? <a href={v} target="_blank" rel="noopener noreferrer" className="cl-link">{v.replace(/^https?:\/\//, '')}</a> : v}</dd></div>;
                      })}
                    </dl>
                    {(client.product.platforms || []).length > 0 && <>
                      <div className="card-label" style={{ margin:'1rem 0 0.4rem' }}>Platforms</div>
                      {client.product.platforms.map((p, i) => <div key={i} className="row-between cl-line"><span>{p.name} <em>{p.role}</em></span>{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="cl-link">Open ↗</a>}</div>)}
                    </>}
                    {(client.product.monthlyCosts || []).length > 0 && <>
                      <div className="card-label" style={{ margin:'1rem 0 0.4rem' }}>Monthly running costs</div>
                      {client.product.monthlyCosts.map((c, i) => <div key={i} className="row-between cl-line"><span>{c.name}</span><span className="bad">{c.currency === 'USD' ? 'US$' : 'J$'}{Number(c.amount).toLocaleString()}</span></div>)}
                    </>}
                    {(client.product.credentials || []).length > 0 && <>
                      <div className="card-label" style={{ margin:'1rem 0 0.4rem' }}>Credentials</div>
                      {client.product.credentials.map((c, i) => <div key={i} className="cl-cred"><b>{c.service}</b><span>{c.details}</span></div>)}
                    </>}
                  </>)}
                </div>
              </div>
            )}

            {tab === 'payments' && (
              <div className="card">
                <div className="row-between" style={{ marginBottom:'0.5rem' }}>
                  <span className="card-label" style={{ margin:0 }}>Payments · also in Finance</span>
                  <button className="btn-primary" onClick={() => setPayForm({ type:'income', pipelineLeadId: client.id, category:'First Deposit', description: `${client.businessName} payment` })}><Icons.plus size={13}/> Payment</button>
                </div>
                {pays.length === 0 ? <div className="agenda-empty small">No payments logged for {client.businessName}.</div>
                  : pays.map(f => (
                    <button key={f.id} className="fin-tx income" onClick={() => setPayForm(f)}>
                      <span className="fin-tx-dot"/>
                      <span className="fin-tx-main">
                        <span className="fin-tx-desc">{f.paymentStage || f.category}</span>
                        <span className="fin-tx-meta">{f.date ? fmtDate(f.date, { month:'short', day:'numeric', year:'numeric' }) : 'No date'} · {f.description}</span>
                      </span>
                      <span className="fin-tx-amt">+{J(amountOf(f))}</span>
                    </button>
                  ))}
              </div>
            )}

            {tab === 'retainers' && (
              <div className="card">
                <div className="card-label">Retainer · last 12 months · click to mark</div>
                {!(Number(client.retainerAmount) > 0) ? (
                  <div className="agenda-empty small">No retainer set. <button className="link-btn" onClick={() => setClientForm(client)}>Set one</button></div>
                ) : (<>
                  <div className="cl-months">
                    {Array.from({ length: 12 }, (_, i) => addMonths(thisMonth, -i)).map(mk => {
                      const got = retainerGot(client, mk);
                      const before = !got && since && retainerDueDate(client, mk) < since;
                      const late = !got && !before && retainerDueDate(client, mk) < todayStr;
                      return (
                        <button key={mk} disabled={before} className={`cl-month ${got ? 'got' : late ? 'late' : ''} ${before ? 'before' : ''}`}
                          onClick={() => setRetainerMonth(client, mk, !got)} title={got ? 'Collected. Click to unmark.' : 'Mark as collected (logs the payment)'}>
                          <span>{monthName(mk, { month:'short' })}</span>
                          <b>{got ? '✓' : before ? '·' : late ? '!' : '○'}</b>
                          <em>{mk.slice(0, 4)}</em>
                        </button>
                      );
                    })}
                  </div>
                  <div className="fin-bar-legend" style={{ marginTop:'0.75rem' }}>Marking a month collected logs {J(client.retainerAmount)} in Finance. Unmarking removes it.</div>
                </>)}
              </div>
            )}

            {tab === 'notes' && (
              <div className="card">
                <div className="card-label">Notes</div>
                <div className="cl-note-new">
                  <textarea className="input" rows={2} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Calls, decisions, what they asked for…"
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); }}/>
                  <div className="row-gap" style={{ justifyContent:'flex-end' }}>
                    {editingNote && <button className="btn-ghost" onClick={() => { setEditingNote(null); setNoteDraft(''); }}>Cancel</button>}
                    <button className="btn-primary" onClick={saveNote} disabled={!noteDraft.trim()}>{editingNote ? 'Save note' : 'Add note'}</button>
                  </div>
                </div>
                {notes.length === 0 ? <div className="agenda-empty small">No notes yet.</div> : notes.map(n => (
                  <div key={n.id} className="cl-note">
                    <div className="cl-note-meta">
                      <span>{new Date(n.at).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })}{n.edited ? ' · edited' : ''}</span>
                      <span className="row-gap">
                        <button className="icon-btn" title="Edit" onClick={() => { setEditingNote(n.id); setNoteDraft(n.text); }}><Icons.edit size={11}/></button>
                        <button className="icon-btn danger-btn" title="Delete" onClick={() => deleteNote(n)}><Icons.trash size={11}/></button>
                      </span>
                    </div>
                    <div className="cl-note-text">{n.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {clientForm !== null && <ClientModal data={clientForm} leads={leads} onSave={saveClient} onClose={() => setClientForm(null)}/>}
      {payForm !== null && (
        <FinanceModal data={payForm} leads={leads} onSave={savePayment} onDelete={payForm.id ? deletePayment : null} onClose={() => setPayForm(null)}/>
      )}
      {editProduct && client && (
        <ProductModal client={client} onSave={d => { onUpdate('leads', client.id, { product: d }); setEditProduct(false); }} onClose={() => setEditProduct(false)}/>
      )}
      {deleting && (
        <Modal title={`Remove ${deleting.businessName}?`} onClose={() => setDeleting(null)}>
          <p className="cl-del-text">Choose what happens. Either way, the {J(paymentsOf(deleting.id).reduce((s, f) => s + amountOf(f), 0))} they've paid stays in Finance.</p>
          <button className="btn-ghost cl-del-opt" onClick={() => removeClient('pipeline')}>
            <b>Move back to the Pipeline</b><span>Marks them Lost. Their details, notes and history stay.</span>
          </button>
          <button className="btn-ghost cl-del-opt danger-text" onClick={() => removeClient('delete')}>
            <b>Delete for good</b><span>Removes the client, their notes and product details. This can't be undone.</span>
          </button>
          <ModalFoot onClose={() => setDeleting(null)}/>
        </Modal>
      )}
      {ConfirmUI}
    </div>
  );
}

function ClientModal({ data, leads, onSave, onClose }) {
  const editing = !!data.id;
  const [f, setF] = useState({
    businessName:'', contactName:'', phone:'', email:'', websiteUrl:'', location:'', country:'Jamaica',
    businessType:'Other', businessSize:'Small', value:'', retainerAmount:'', retainerDueDay:'1',
    clientStatus:'Active', clientSince: localDateStr(), notes:'', ...data,
  });
  const [fromLead, setFromLead] = useState('');
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const prospects = leads.filter(l => l.status !== 'Paid');
  const pickLead = id => {
    setFromLead(id);
    const l = leads.find(x => x.id === id);
    if (l) setF(p => ({ ...p, ...Object.fromEntries(Object.entries(l).filter(([k, v]) => v !== '' && v != null && !['id','createdAt','status','source'].includes(k))) }));
  };
  const due = Number(f.retainerDueDay);
  const problems = [];
  if (!f.businessName.trim()) problems.push('Business name is required.');
  if (Number(f.retainerAmount) > 0 && !(due >= 1 && due <= 28)) problems.push('Retainer due day must be 1 to 28.');
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) problems.push('That email looks wrong.');
  if (f.websiteUrl && !/^https?:\/\//.test(f.websiteUrl)) problems.push('Website should start with https://');

  const save = () => {
    if (problems.length) return;
    const { id, createdAt, ...rest } = f;
    const out = { ...rest, businessName: f.businessName.trim(), value: f.value === '' ? '' : Number(f.value), retainerAmount: f.retainerAmount === '' ? '' : Number(f.retainerAmount), retainerDueDay: String(due || 1) };
    onSave(editing ? { id, ...out } : fromLead ? { ...out, fromLeadId: fromLead } : out);
  };

  return (
    <Modal title={editing ? `Edit ${data.businessName}` : 'New Client'} onClose={onClose}>
      {!editing && prospects.length > 0 && (
        <Field label="Convert a Pipeline lead (optional)">
          <select className="input" value={fromLead} onChange={e => pickLead(e.target.value)}>
            <option value="">Start from scratch</option>
            {prospects.map(l => <option key={l.id} value={l.id}>{l.businessName} · {l.status}</option>)}
          </select>
        </Field>
      )}
      <Field label="Business name"><input className="input" autoFocus value={f.businessName} onChange={e => s('businessName', e.target.value)}/></Field>
      <Field label="Status">
        <div className="sched-cals">
          {CLIENT_STATES.map(c => <button key={c.id} type="button" className={`sched-cal ${f.clientStatus === c.id ? 'on' : ''}`} style={{ '--c': c.hex }} onClick={() => s('clientStatus', c.id)}><span className="dot"/>{c.id}</button>)}
        </div>
      </Field>
      <div className="grid-2">
        <Field label="Contact person"><input className="input" value={f.contactName} onChange={e => s('contactName', e.target.value)}/></Field>
        <Field label="Phone / WhatsApp"><input className="input" value={f.phone} onChange={e => s('phone', e.target.value)} placeholder="+1876…"/></Field>
        <Field label="Email"><input className="input" type="email" value={f.email || ''} onChange={e => s('email', e.target.value)}/></Field>
        <Field label="Website"><input className="input" value={f.websiteUrl || ''} onChange={e => s('websiteUrl', e.target.value)} placeholder="https://"/></Field>
        <Field label="Location"><input className="input" value={f.location} onChange={e => s('location', e.target.value)}/></Field>
        <Field label="Country"><input className="input" value={f.country} onChange={e => s('country', e.target.value)}/></Field>
        <Field label="Business type">
          <select className="input" value={f.businessType} onChange={e => s('businessType', e.target.value)}>{BIZ_TYPES.map(t => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Client since"><input className="input" type="date" value={f.clientSince || ''} onChange={e => s('clientSince', e.target.value)}/></Field>
      </div>
      <div className="card-label" style={{ margin:'0.25rem 0 0' }}>Money</div>
      <div className="grid-2">
        <Field label="Project fee (J$)"><input className="input" type="number" min="0" value={f.value} onChange={e => s('value', e.target.value)}/></Field>
        <Field label="Retainer per month (J$)"><input className="input" type="number" min="0" value={f.retainerAmount} onChange={e => s('retainerAmount', e.target.value)} placeholder="0 = none"/></Field>
        {Number(f.retainerAmount) > 0 && <Field label="Retainer due on day"><input className="input" type="number" min="1" max="28" value={f.retainerDueDay} onChange={e => s('retainerDueDay', e.target.value)}/></Field>}
      </div>
      <Field label="Notes"><textarea className="input" style={{ minHeight:56, resize:'vertical' }} value={f.notes || ''} onChange={e => s('notes', e.target.value)}/></Field>
      {problems.length > 0 && <div className="form-warn">{problems[0]}</div>}
      <ModalFoot onClose={onClose} onSave={save}/>
    </Modal>
  );
}

// ─── PRODUCT MODAL ────────────────────────────────────────────────────────────
// Edits client.product: { type, techStack:{...}, platforms[], monthlyCosts[], credentials[] }
const TECH_FIELDS = [
  ['framework','Framework','React, Next.js…'], ['hosting','Hosting','Render, Vercel…'],
  ['renderService','Render Service',''],       ['database','Database','Firebase, Supabase…'],
  ['domain','Domain','example.com'],           ['domainCost','Domain Cost','US$12/yr'],
  ['apis','APIs Used','WhatsApp, Stripe…'],    ['liveUrl','Live URL','https://'],
  ['repoUrl','GitHub Repo','https://github.com/…'], ['adminUrl','Admin Panel','https://'],
];

function ProductModal({ client, onSave, onClose }) {
  const p = client.product || {};
  const [type, setType]           = useState(p.type || '');
  const [tech, setTech]           = useState({ ...(p.techStack || {}) });
  const [platforms, setPlatforms] = useState(p.platforms || []);
  const [costs, setCosts]         = useState(p.monthlyCosts || []);
  const [creds, setCreds]         = useState(p.credentials || []);

  const editRow = (setter, i, k, v) => setter(rows => rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const dropRow = (setter, i) => setter(rows => rows.filter((_, j) => j !== i));
  const rowBox  = { display:'flex', gap:'0.5rem', alignItems:'flex-start', marginBottom:'0.5rem' };

  const save = () => {
    const clean = rows => rows.filter(r => Object.values(r).some(v => String(v ?? '').trim()));
    onSave({
      type: type.trim(),
      techStack: Object.fromEntries(Object.entries(tech).filter(([, v]) => String(v ?? '').trim())),
      platforms: clean(platforms),
      monthlyCosts: clean(costs).map(c => ({ ...c, amount: Number(c.amount) || 0 })),
      credentials: clean(creds),
    });
  };

  return (
    <Modal title={`Product — ${client.businessName}`} onClose={onClose}>
      <Field label="Product Type"><input className="input" value={type} onChange={e=>setType(e.target.value)} placeholder="Website, ordering app, WhatsApp bot…"/></Field>

      <div className="card-label" style={{margin:'0.25rem 0 0'}}>Tech Stack & Links</div>
      <div className="grid-2">
        {TECH_FIELDS.map(([k, label, ph]) => (
          <Field key={k} label={label}>
            <input className="input" value={tech[k] || ''} onChange={e=>setTech(t=>({...t,[k]:e.target.value}))} placeholder={ph}/>
          </Field>
        ))}
      </div>

      <div className="card-label" style={{margin:'0.25rem 0 0'}}>Online Platforms</div>
      {platforms.map((r, i) => (
        <div key={i} style={rowBox}>
          <input className="input" style={{flex:1}} value={r.name||''} onChange={e=>editRow(setPlatforms,i,'name',e.target.value)} placeholder="Name"/>
          <input className="input" style={{flex:1}} value={r.role||''} onChange={e=>editRow(setPlatforms,i,'role',e.target.value)} placeholder="Role"/>
          <input className="input" style={{flex:1.4}} value={r.url||''} onChange={e=>editRow(setPlatforms,i,'url',e.target.value)} placeholder="https://"/>
          <button className="icon-btn danger-btn" style={{marginTop:6}} onClick={()=>dropRow(setPlatforms,i)}><Icons.close size={12}/></button>
        </div>
      ))}
      <button className="btn-ghost" style={{justifyContent:'center'}} onClick={()=>setPlatforms(r=>[...r,{name:'',role:'',url:''}])}><Icons.plus size={13}/> Add Platform</button>

      <div className="card-label" style={{margin:'0.25rem 0 0'}}>Monthly Running Costs</div>
      {costs.map((r, i) => (
        <div key={i} style={rowBox}>
          <input className="input" style={{flex:2}} value={r.name||''} onChange={e=>editRow(setCosts,i,'name',e.target.value)} placeholder="Service"/>
          <input className="input" style={{flex:1}} type="number" value={r.amount??''} onChange={e=>editRow(setCosts,i,'amount',e.target.value)} placeholder="Amount"/>
          <select className="input" style={{flex:0.8}} value={r.currency||'JMD'} onChange={e=>editRow(setCosts,i,'currency',e.target.value)}>
            <option value="JMD">JMD</option><option value="USD">USD</option>
          </select>
          <button className="icon-btn danger-btn" style={{marginTop:6}} onClick={()=>dropRow(setCosts,i)}><Icons.close size={12}/></button>
        </div>
      ))}
      <button className="btn-ghost" style={{justifyContent:'center'}} onClick={()=>setCosts(r=>[...r,{name:'',amount:'',currency:'JMD'}])}><Icons.plus size={13}/> Add Cost</button>

      <div className="card-label" style={{margin:'0.25rem 0 0'}}>Credentials & Access</div>
      {creds.map((r, i) => (
        <div key={i} style={rowBox}>
          <input className="input" style={{flex:1}} value={r.service||''} onChange={e=>editRow(setCreds,i,'service',e.target.value)} placeholder="Service"/>
          <textarea className="input" style={{flex:2,minHeight:44,resize:'vertical'}} value={r.details||''} onChange={e=>editRow(setCreds,i,'details',e.target.value)} placeholder="Login / notes"/>
          <button className="icon-btn danger-btn" style={{marginTop:6}} onClick={()=>dropRow(setCreds,i)}><Icons.close size={12}/></button>
        </div>
      ))}
      <button className="btn-ghost" style={{justifyContent:'center'}} onClick={()=>setCreds(r=>[...r,{service:'',details:''}])}><Icons.plus size={13}/> Add Credential</button>

      <ModalFoot onClose={onClose} onSave={save}/>
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
  const PS={high:{color:'#ff5a36',border:'rgba(255,90,54,0.3)',bg:'rgba(255,90,54,0.07)'},medium:{color:'#f0c060',border:'rgba(240,192,96,0.3)',bg:'rgba(240,192,96,0.07)'},low:{color:'#3a4860',border:'rgba(92,62,58,0.3)',bg:'rgba(92,62,58,0.07)'}};
  return (
    <div className="section">
      <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(160deg,rgba(var(--b2),0.95),rgba(var(--b3),0.3),rgba(var(--b3),0.4) 100%)',border:'1px solid rgba(var(--p3),0.15)',borderRadius:14,padding:'1.5rem 1.25rem'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(var(--p4),0.5),rgba(var(--p3),0.8),rgba(var(--p2),0.4),transparent)'}}/>
        <div style={{fontFamily:'var(--fm)',fontSize:'8px',color:'var(--bolt)',letterSpacing:'0.3em',textTransform:'uppercase',marginBottom:'0.5rem',opacity:0.7}}>JAXON Intelligence</div>
        <div style={{fontFamily:'var(--fe)',fontSize:'32px',fontWeight:600,letterSpacing:'-0.01em',lineHeight:1.05,marginBottom:'0.5rem',color:'var(--bolt-white)',textShadow:'0 0 30px rgba(var(--p3),0.3)'}}>Second Brain</div>
        <div style={{display:'flex',gap:'1.25rem',flexWrap:'wrap'}}>
          {[{label:'Pending',value:pending.length,color:'var(--bolt)',glow:'rgba(var(--p3),0.5)'},{label:'Approved',value:approved.length,color:'var(--valley)',glow:'rgba(26,219,138,0.4)'},{label:'Executed',value:executed.length,color:'var(--steel)',glow:'rgba(var(--p4),0.4)'}].map(s=>(<div key={s.label}><div style={{fontFamily:'var(--fe)',fontSize:'26px',fontWeight:700,color:s.color,lineHeight:1,textShadow:`0 0 16px ${s.glow}`}}>{s.value}</div><div style={{fontFamily:'var(--fm)',fontSize:'8px',letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--mist-3)',marginTop:2}}>{s.label}</div></div>))}
        </div>
      </div>
      {todayBriefing&&(<div className="fade-in" style={{position:'relative',overflow:'hidden',background:'linear-gradient(135deg,rgba(var(--p6),0.12),rgba(var(--b2),0.8))',border:'1px solid rgba(var(--p3),0.2)',borderLeft:'3px solid var(--bolt)',borderRadius:10,padding:'1.125rem'}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.625rem'}}><div style={{width:6,height:6,borderRadius:'50%',background:'var(--bolt)',boxShadow:'0 0 8px rgba(var(--p3),0.8)',animation:'blink 1.5s ease-in-out infinite'}}/><span style={{fontFamily:'var(--fm)',fontSize:'8px',letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--bolt-lt)',opacity:0.8}}>Morning Briefing — {todayStr}</span></div><div style={{fontSize:'13px',lineHeight:'1.75',color:'var(--mist-1)',whiteSpace:'pre-line',fontWeight:300}}>{todayBriefing.content}</div></div>)}
      <div style={{display:'flex',gap:'2px',background:'rgba(var(--b2),0.6)',border:'1px solid rgba(var(--p3),0.08)',borderRadius:8,padding:3}}>
        {[{id:'queue',label:'Queue',count:pending.length},{id:'approved',label:'Approved',count:approved.length},{id:'log',label:'Log',count:null},{id:'research',label:'Research',count:null}].map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'0.4rem 0.5rem',border:'none',background:tab===t.id?'rgba(var(--p4),0.15)':'none',borderRadius:5,cursor:'pointer',fontFamily:'var(--fs)',fontSize:'11.5px',fontWeight:400,color:tab===t.id?'var(--bolt-lt)':'var(--mist-3)',transition:'all 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.375rem'}}>{t.label}{t.count!==null&&<span style={{fontFamily:'var(--fm)',fontSize:'9px',background:t.count>0&&tab===t.id?'rgba(var(--p3),0.2)':'rgba(255,255,255,0.06)',color:t.count>0&&tab===t.id?'var(--bolt)':'var(--mist-3)',borderRadius:99,padding:'0.1rem 0.45rem',border:t.count>0&&tab===t.id?'1px solid rgba(var(--p3),0.3)':'1px solid transparent'}}>{t.count}</span>}</button>))}
      </div>
      {tab==='queue'&&(pending.length===0?(<div style={{textAlign:'center',padding:'3rem 1.5rem',background:'rgba(var(--b2),0.5)',border:'1px solid rgba(var(--p3),0.06)',borderRadius:14}}><div style={{fontSize:'32px',marginBottom:'0.75rem',filter:'drop-shadow(0 0 12px rgba(var(--p3),0.4))'}}>⚡</div><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:'var(--bolt-lt)',marginBottom:'0.375rem'}}>Clear horizon</div><div style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:300,color:'var(--mist-3)',letterSpacing:'0.06em'}}>JAXON is scanning for opportunities</div></div>):(
        <div className="list">{pending.map(item=>{const ps=PS[item.priority]||PS.low;return(<div key={item.id} className="fade-in" style={{background:'rgba(var(--b1),0.85)',border:'1px solid rgba(var(--p3),0.08)',borderLeft:`3px solid ${ps.color}`,borderRadius:12,padding:'1rem',backdropFilter:'blur(8px)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.625rem'}}><div style={{fontFamily:'var(--fm)',fontSize:'9.5px',fontWeight:500,color:'var(--bolt-lt)',letterSpacing:'0.08em'}}>{AL[item.action]||item.action}</div><div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,color:ps.color,background:ps.bg,border:`1px solid ${ps.border}`,borderRadius:99,padding:'0.15rem 0.5rem',textTransform:'uppercase',letterSpacing:'0.08em'}}>{item.priority}</div></div>{item.data?.businessName&&<div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,letterSpacing:'0.01em',marginBottom:'0.375rem',color:'var(--mist-0)'}}>{item.data.businessName}</div>}<div style={{fontSize:'12.5px',fontWeight:300,color:'var(--mist-2)',lineHeight:1.65,marginBottom:'0.75rem'}}><span style={{fontFamily:'var(--fm)',fontSize:'8.5px',color:'var(--bolt)',opacity:0.7,letterSpacing:'0.1em',marginRight:'0.5rem'}}>JAXON</span>{item.reasoning}</div>{item.data?.outreachDraft&&<div style={{background:'rgba(var(--p6),0.1)',borderLeft:'2px solid rgba(var(--p4),0.4)',borderRadius:'0 6px 6px 0',padding:'0.625rem 0.75rem',marginBottom:'0.75rem'}}><div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,color:'var(--bolt-4)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:6,opacity:0.8}}>Draft Message</div><div style={{fontSize:'12px',fontWeight:300,color:'var(--mist-1)',lineHeight:1.6}}>{item.data.outreachDraft}</div></div>}<div style={{display:'flex',gap:'0.5rem'}}><button style={{flex:1,padding:'0.55rem',border:'1.5px solid var(--bolt-3)',background:'rgba(var(--p6),0.15)',borderRadius:6,cursor:'pointer',fontFamily:'var(--fs)',fontSize:'12.5px',fontWeight:600,color:'var(--bolt-lt)'}} onClick={()=>onApprove(item.id)}>✓ Approve</button><button style={{flex:1,padding:'0.55rem',border:'1px solid rgba(255,90,54,0.2)',background:'rgba(255,90,54,0.05)',borderRadius:6,cursor:'pointer',fontFamily:'var(--fs)',fontSize:'12.5px',fontWeight:400,color:'#ff5a36'}} onClick={()=>onReject(item.id)}>✕ Reject</button></div></div>);})}</div>
      ))}
      {tab==='approved'&&(<div className="list">{approved.length===0?<div style={{textAlign:'center',padding:'2.5rem 1rem'}}><div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:400,color:'var(--mist-3)',fontStyle:'italic'}}>Nothing approved yet</div></div>:approved.map(item=>(<div key={item.id} className="fade-in" style={{background:'rgba(var(--p6),0.07)',border:'1px solid rgba(var(--p4),0.15)',borderRadius:10,padding:'0.875rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}><div style={{width:8,height:8,borderRadius:'50%',background:'#1adb8a',boxShadow:'0 0 8px rgba(26,219,138,0.6)',flexShrink:0}}/><div><div style={{fontFamily:'var(--fm)',fontSize:'8.5px',fontWeight:300,color:'#1adb8a',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>Approved — executes next run</div><div style={{fontSize:'13.5px',fontWeight:400,color:'var(--mist-1)'}}>{AL[item.action]} — {item.data?.businessName||item.action}</div></div></div>))}</div>)}
      {tab==='log'&&(!latestLog?<div style={{textAlign:'center',padding:'3rem 1rem'}}><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:400,fontStyle:'italic',color:'var(--mist-3)'}}>First log at midnight</div></div>:(<div className="fade-in" style={{background:'rgba(var(--b2),0.7)',border:'1px solid rgba(var(--p4),0.15)',borderTop:'2px solid var(--bolt-3)',borderRadius:12,padding:'1.125rem'}}><div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:600,color:'var(--bolt-lt)',marginBottom:'0.875rem'}}>Daily Log — {latestLog.date}</div>{latestLog.stats&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',marginBottom:'1rem'}}>{[{l:'Queued',v:latestLog.stats.actionsQueued,c:'var(--bolt)',g:'rgba(var(--p3),0.5)'},{l:'Approved',v:latestLog.stats.approved,c:'#1adb8a',g:'rgba(26,219,138,0.5)'},{l:'Rejected',v:latestLog.stats.rejected,c:'#ff5a36',g:'rgba(255,90,54,0.5)'}].map(s=>(<div key={s.l} style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'0.625rem',textAlign:'center',border:'1px solid rgba(var(--p3),0.06)'}}><div style={{fontFamily:'var(--fe)',fontSize:'24px',fontWeight:700,color:s.c,lineHeight:1,textShadow:`0 0 14px ${s.g}`}}>{s.v}</div><div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,color:'var(--mist-3)',letterSpacing:'0.15em',textTransform:'uppercase',marginTop:3}}>{s.l}</div></div>))}</div>}<div style={{fontSize:'13px',fontWeight:300,lineHeight:1.8,color:'var(--mist-1)',whiteSpace:'pre-line'}}>{latestLog.content}</div></div>))}
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
  if(launched)return(<div style={{textAlign:'center',padding:'1rem'}}><div style={{fontSize:'24px',marginBottom:'0.5rem',filter:'drop-shadow(0 0 10px rgba(var(--p3),0.6))'}}>⚡</div><div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,color:'var(--bolt-lt)',marginBottom:'0.375rem'}}>Research Active</div><div style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-3)',letterSpacing:'0.08em'}}>JAXON hunting every hour for {hours}h</div></div>);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:'0.875rem',background:'linear-gradient(135deg,rgba(var(--b2),0.95),rgba(var(--b3),0.4))',border:'1px solid rgba(var(--p3),0.15)',borderRadius:14,padding:'1.125rem'}}>
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
          <textarea className="chat-input" rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask JAXON… (Shift+Enter for a new line)" disabled={loading}/>
          <button className="chat-send" onClick={()=>send()} disabled={loading||!input.trim()}><Icons.send size={14}/></button>
        </div>
      </div>
    )}
  </>);
}




function InvoiceGenerator({leads,finances,onClose,initialData=null}) {
  // Invoices aren't stored in Firestore, so remember the last number issued
  // on this machine; otherwise every invoice would be JC-YYYY-001
  const INV_KEY='jc_last_invoice_number';
  const lastIssued=()=>{try{return localStorage.getItem(INV_KEY)||'';}catch{return '';}};
  const nextNum=()=>{const yr=new Date().getFullYear();const ex=[...finances.map(f=>f.invoiceNumber),lastIssued()].filter(n=>n&&n.startsWith(`JC-${yr}-`)).map(n=>parseInt(n.split('-').pop())||0);const mx=ex.length>0?Math.max(...ex):0;return `JC-${yr}-${String(mx+1).padStart(3,'0')}`;};
  const [inv,setInv]=useState({
    invoiceNumber: nextNum(),
    date: localDateStr(),
    dueDate: '',
    status: 'PAYMENT DUE',
    currency: 'JMD',
    // Provider (your details — pre-filled)
    providerName:     'Jadan Spencer',
    providerCompany:  'JCommerce & Tech',
    providerLocation: 'Mandeville, Jamaica',
    providerPhone:    '(876) 817-0095',
    providerEmail:    'jcommerceandtech@gmail.com',
    // Client
    clientName:     initialData?.clientName     || '',
    clientCompany:  '',
    clientLocation: initialData?.clientLocation || 'Kingston, Jamaica',
    clientPhone:    '',
    clientEmail:    '',
    // Services
    services: initialData?.services || [{desc:'',qty:1,unit:'',amount:''}],
    // Adjustments
    discount:       '',
    discountLabel:  'Discount',
    taxRate:        '',
    taxLabel:       'GCT (15%)',
    depositPaid:    '',
    depositLabel:   'Deposit Paid',
    showDepositLine: false,
    // Retainer
    retainerDay:    '',
    retainerPeriod: '',
    // Notes & payment
    notes: '',
    paymentMethod: 'Bank Transfer\nName: Jadan Spencer\nAcc#: 504813584\nBank: NCB Perth Mandeville',
    // Reference
    referenceInvoice: '',
    poNumber: '',
    type: 'standard',
    ...initialData,
  });
  const s=(k,v)=>setInv(p=>({...p,[k]:v}));
  const total=inv.services.reduce((sum,sv)=>sum+(Number(sv.amount)||0),0);
  const setService=(i,k,v)=>setInv(p=>{const svs=[...p.services];svs[i]={...svs[i],[k]:v};return{...p,services:svs};});

  // Financial calculations (used in PDF generation)
  const subtotal    = inv.services.reduce((s,sv) => s + (Number(sv.amount)||0) * (Number(sv.qty)||1), 0);
  const discountAmt = Number(inv.discount) || 0;
  const afterDisc   = subtotal - discountAmt;
  const taxAmt      = inv.taxRate ? Math.round((afterDisc * Number(inv.taxRate)) / 100) : 0;
  const grandTotal  = afterDisc + taxAmt;
  const displayTotal= inv.showDepositLine ? grandTotal - (Number(inv.depositPaid)||0) : grandTotal;
  const cur         = (inv.currency === 'USD') ? 'USD $' : 'J$';
  const fmt         = n => `${cur}${Number(n).toLocaleString()}`;

  const generatePDF = async () => {
    const statusColor = {
      'PAYMENT DUE':'#1a7f5a','DEPOSIT DUE':'#b45309','BALANCE DUE':'#7c3aed',
      'PAID IN FULL':'#166534','QUOTE':'#1e40af','RETAINER DUE':'#0f766e',
    }[inv.status] || '#1a7f5a';

    const serviceRows = inv.services.map(sv => {
      const qty = Number(sv.qty)||1;
      const amt = Number(sv.amount)||0;
      return `<tr>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:13.5px;">${sv.desc||'—'}${sv.unit?`<br><span style="font-size:11px;color:#78716c;">${sv.unit}</span>`:''}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:center;color:#57534e;">${qty>1?qty:'—'}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(amt)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(qty*amt)}</td>
      </tr>`;
    }).join('');

    const totalRows = `
      <tr><td colspan="3" style="padding:8px 14px;text-align:right;color:#57534e;">Subtotal</td><td style="padding:8px 14px;text-align:right;">${fmt(subtotal)}</td></tr>
      ${discountAmt>0?`<tr><td colspan="3" style="padding:8px 14px;text-align:right;color:#57534e;">${inv.discountLabel}</td><td style="padding:8px 14px;text-align:right;color:#dc2626;">-${fmt(discountAmt)}</td></tr>`:''}
      ${taxAmt>0?`<tr><td colspan="3" style="padding:8px 14px;text-align:right;color:#57534e;">${inv.taxLabel}</td><td style="padding:8px 14px;text-align:right;">${fmt(taxAmt)}</td></tr>`:''}
      ${inv.showDepositLine&&inv.depositPaid?`<tr><td colspan="3" style="padding:8px 14px;text-align:right;color:#57534e;">${inv.depositLabel}</td><td style="padding:8px 14px;text-align:right;color:#16a34a;">-${fmt(inv.depositPaid)}</td></tr>`:''}
      <tr style="background:#f8fafc;">
        <td colspan="3" style="padding:14px;text-align:right;font-weight:800;font-size:15px;border-top:2px solid #e2e8f0;">${inv.showDepositLine?'Balance Due':'Total Due'}</td>
        <td style="padding:14px;text-align:right;font-weight:900;font-size:16px;color:${statusColor};border-top:2px solid #e2e8f0;">${fmt(displayTotal)}</td>
      </tr>`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${inv.invoiceNumber} — ${inv.clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',Helvetica,Arial,sans-serif;color:#1C1917;background:#fff;padding:48px 56px;max-width:860px;margin:0 auto;}
  @media print{body{padding:32px 40px;}}
  .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;padding-bottom:28px;border-bottom:1px solid #e2e8f0;}
  .brand-block{display:flex;align-items:center;gap:16px;}
  .brand-logo{width:72px;height:72px;object-fit:contain;border-radius:8px;}
  .brand-name{font-size:20px;font-weight:800;color:#0F1F3D;}
  .brand-sub{font-size:11px;color:#78716c;margin-top:3px;line-height:1.5;}
  .inv-title{font-size:36px;font-weight:900;color:#0F1F3D;letter-spacing:-0.04em;text-align:right;}
  .badge{display:inline-block;padding:5px 14px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border:1px solid;margin-top:8px;}
  .gold-line{height:3px;background:linear-gradient(90deg,#1a6b5a,#C89B3C,#1a6b5a);margin:0 0 32px;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:28px 0;}
  .meta-block h4{font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:#a8a29e;font-weight:600;margin-bottom:8px;}
  .meta-block p{font-size:13.5px;line-height:1.7;}
  .meta-block .strong{font-weight:700;font-size:15px;}
  table{width:100%;border-collapse:collapse;margin:28px 0;}
  thead{background:#0F1F3D;}
  th{padding:11px 14px;text-align:left;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#fff;font-weight:600;}
  th:last-child,th:nth-child(3){text-align:right;}th:nth-child(2){text-align:center;}
  .payment-box{background:#f8fafc;border-radius:10px;padding:18px 20px;margin:24px 0;border:1px solid #e2e8f0;}
  .payment-box h4{font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:#a8a29e;font-weight:600;margin-bottom:8px;}
  .payment-box p{font-size:13px;line-height:1.7;white-space:pre-line;}
  .footer{margin-top:40px;padding-top:24px;border-top:1px solid #f1f5f9;text-align:center;font-size:12px;color:#a8a29e;}
  .notes{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:13px;color:#78350f;line-height:1.7;}
</style>
</head><body>

<div class="header">
  <div class="brand-block">
    <img class="brand-logo" src="${LOGO_B64}" alt="JCommerce Logo"/>
    <div>
      <div class="brand-name">${inv.providerCompany}</div>
      <div class="brand-sub">${inv.providerName}<br>${inv.providerLocation}<br>${inv.providerPhone} · ${inv.providerEmail}</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div class="inv-title">${inv.type==='quote'?'QUOTE':inv.type==='receipt'?'RECEIPT':'INVOICE'}</div>
    <span class="badge" style="color:${statusColor};border-color:${statusColor}20;background:${statusColor}10;">${inv.status}</span>
  </div>
</div>

<div class="gold-line"></div>

<div class="meta">
  <div class="meta-block">
    <h4>Billed To</h4>
    <p class="strong">${inv.clientName}${inv.clientCompany?`<br><span style="font-weight:400;font-size:13px;">${inv.clientCompany}</span>`:''}</p>
    <p>${inv.clientLocation}${inv.clientEmail?`<br>${inv.clientEmail}`:''}${inv.clientPhone?`<br>${inv.clientPhone}`:''}</p>
  </div>
  <div class="meta-block" style="text-align:right;">
    <h4>Invoice Details</h4>
    <p><strong>${inv.invoiceNumber}</strong><br>
    Date: ${inv.date}<br>
    ${inv.dueDate?`Due: ${inv.dueDate}`:'Due: Upon Receipt'}
    ${inv.poNumber?`<br>PO#: ${inv.poNumber}`:''}
    ${inv.type==='retainer'&&inv.retainerPeriod?`<br>Period: ${inv.retainerPeriod}`:''}
    </p>
  </div>
</div>

<table>
  <thead><tr><th style="width:50%;">Description</th><th style="width:10%;text-align:center;">Qty</th><th style="width:20%;text-align:right;">Unit Price</th><th style="width:20%;text-align:right;">Total</th></tr></thead>
  <tbody>${serviceRows}</tbody>
  <tfoot>${totalRows}</tfoot>
</table>

${inv.notes?`<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>`:''}

<div class="payment-box">
  <h4>Payment Methods</h4>
  <p>${inv.paymentMethod}</p>
</div>

<div class="footer">Thank you for your business · JCommerce & Tech · ${inv.providerPhone}</div>

</body></html>`;

    const baseName = `${inv.invoiceNumber}-${(inv.clientName||'invoice').replace(/\s+/g,'-')}`;
    const markIssued = () => { try { localStorage.setItem(INV_KEY, inv.invoiceNumber); } catch {} };

    // Desktop app: render a real PDF and ask where to save it
    if (DESKTOP?.saveInvoicePdf) {
      const r = await DESKTOP.saveInvoicePdf(html, `${baseName}.pdf`);
      if (r?.ok) markIssued();
      return;
    }
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.html`;
    a.click();
    URL.revokeObjectURL(url);
    markIssued();
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
      <div style={{background:'rgba(var(--p3),0.06)',border:'1px solid rgba(var(--p3),0.15)',borderRadius:'var(--r2)',padding:'0.75rem',display:'flex',justifyContent:'space-between'}}><span style={{fontFamily:'var(--fm)',fontSize:'12px',fontWeight:700}}>TOTAL</span><span style={{fontFamily:'var(--fm)',fontSize:'14px',fontWeight:800,color:'var(--bolt)'}}>J${total.toLocaleString()}</span></div>
      <Field label="Notes"><textarea className="input" style={{minHeight:'56px',resize:'vertical'}} value={inv.notes} onChange={e=>s('notes',e.target.value)}/></Field>
      <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={generatePDF}>📄 {DESKTOP ? 'Save Invoice PDF' : 'Download Invoice'}</button>
      <ModalFoot onClose={onClose}/>
      </>
    </Modal>
  );
}

// ─── VENTURES ─────────────────────────────────────────────────────────────────
// A control room for another project on this Mac (Dorm Dash). Read-only:
// the console looks at the repo, the keys and the live money, and runs
// safe checks. It never changes the other project or its data.
const VENTURE_DEFAULT = { name: 'Dorm Dash', dir: '/Users/account/Documents/Jcommerce/dorm-dash-web' };
const ventureConfig = () => { try { return { ...VENTURE_DEFAULT, ...(JSON.parse(localStorage.getItem('jc_venture')) || {}) }; } catch { return VENTURE_DEFAULT; } };
const KEY_NOTES = [
  [/FIREBASE_API_KEY/, 'Firebase web key. Public by design; protected by rules and App Check.'],
  [/FIREBASE_VAPID/, 'Web push key. Lets browsers receive notifications.'],
  [/FIREBASE_/, 'Firebase project setting. Public.'],
  [/GOOGLE_MAPS/, 'Google Maps key. Restrict it to your app in Google Cloud or others can run up your bill.'],
  [/FYGARO/, 'Fygaro card payments.'],
  [/WIPAY/, 'WiPay. No longer used since 1 Oct 2026; safe to remove.'],
];
const keyNote = k => (KEY_NOTES.find(([re]) => re.test(k)) || [null, ''])[1];
const looksPlaceholder = s => /not_|placeholder|changeme|your[_-]|xxx|todo|example|emul|1234/i.test(s.masked) || /^(not_|todo|xxx)/i.test(s.masked);
const dayKey = ms => localDateStr(new Date(ms));
const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

function ventureServices(o) {
  if (!o?.ok) return [];
  const p = o.firebaseProject;
  const list = [];
  if (p) list.push(
    { id: 'firebase', name: 'Firebase', does: 'Database, logins, server functions, hosting, file storage', url: `https://console.firebase.google.com/project/${p}/overview` },
    { id: 'firebase-usage', name: 'Firebase usage & billing', does: 'What the project is costing this month', url: `https://console.firebase.google.com/project/${p}/usage` },
    { id: 'functions-logs', name: 'Server logs', does: 'Errors from payments, pushes and order handling', url: `https://console.cloud.google.com/logs/query?project=${p}` },
    { id: 'gcp-keys', name: 'Google Cloud API keys', does: 'Where the Maps keys are restricted and rotated', url: `https://console.cloud.google.com/apis/credentials?project=${p}` },
  );
  if (o.secrets.some(s => /FYGARO/.test(s.key)) || o.docs.includes('PAYMENTS_SETUP.md')) list.push({ id: 'fygaro', name: 'Fygaro', does: 'Card payments, payouts and refunds', url: 'https://app.fygaro.com/' });
  if (o.git?.remote) list.push({ id: 'github', name: 'GitHub', does: 'Code and automatic checks (CI)', url: o.git.remote }, ...(o.has.ci ? [{ id: 'github-ci', name: 'GitHub Actions', does: 'Did the last push pass its checks?', url: `${o.git.remote}/actions` }] : []));
  if (o.has.vercel) list.push({ id: 'vercel', name: 'Vercel', does: 'Second web host and payment return pages', url: 'https://vercel.com/dashboard' });
  if (o.has.expo) list.push({ id: 'expo', name: 'Expo (EAS)', does: 'Android and iOS app builds', url: 'https://expo.dev/' });
  return list;
}

// Turn raw orders/payments into the numbers that matter for a window of days
function ventureStats(m, fromMs) {
  const orders = m.orders.filter(o => o.createdAt >= fromMs);
  const delivered = orders.filter(o => o.status === 'delivered');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const sum = (list, f) => list.reduce((s, x) => s + (Number(x[f]) || 0), 0);
  const pays = m.payments.filter(p => p.createdAt >= fromMs);
  const tx = m.walletTx.filter(t => t.createdAt >= fromMs);
  const reasons = {};
  cancelled.forEach(o => { const r = o.cancelReason || 'student_cancelled'; reasons[r] = (reasons[r] || 0) + 1; });
  return {
    placed: orders.length, delivered: delivered.length, cancelled: cancelled.length,
    active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
    gmv: sum(delivered, 'totalAmount'), fees: sum(delivered, 'deliveryFee'),
    platform: sum(delivered, 'platformFeeJmd'), payouts: sum(delivered, 'dasherPayoutJmd'),
    cardPaid: pays.filter(p => p.status === 'paid' || p.status === 'credited' || p.status === 'verified'),
    cardPending: pays.filter(p => p.status === 'pending'),
    topups: tx.filter(t => t.type === 'topup_card').reduce((s, t) => s + (Number(t.amountJmd) || 0), 0),
    refundsCoins: tx.filter(t => t.type === 'order_refund').length,
    refundsCard: tx.filter(t => t.type === 'order_refund_card').length,
    lateCredits: tx.filter(t => t.type === 'late_payment_credit').length,
    reasons,
  };
}

function Ventures({ services, checks, todayStr, onSaveService, onDeleteService, onSaveCheck }) {
  const api = DESKTOP?.venture;
  const { confirm, ConfirmUI } = useConfirm();
  const [cfg, setCfg] = useState(ventureConfig);
  const [view, setView] = useState('overview');
  const [o, setO] = useState(null);
  const [money, setMoney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState(7);
  const [term, setTerm] = useState({ text: '', running: null, last: {} });
  const [doc, setDoc] = useState(null);
  const [svcForm, setSvcForm] = useState(null);
  const termRef = useRef(null);

  const load = async () => {
    if (!api) return;
    setLoading(true);
    const ov = await api.overview(cfg.dir);
    setO(ov);
    setMoney(ov.ok && ov.firebaseProject ? await api.money(ov.firebaseProject, 30) : { ok: false, error: ov.ok ? 'No Firebase project in this folder' : ov.error });
    setLoading(false);
  };
  useEffect(() => { load(); }, [cfg.dir]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!api) return;
    return api.onOutput(p => setTerm(t => ({
      text: (t.text + (p.chunk || '')).slice(-60000),
      running: p.done ? null : t.running,
      last: p.done ? { ...t.last, [p.id]: { code: p.code, at: Date.now() } } : t.last,
    })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [term.text]);

  if (!api) return (
    <div className="section venture"><div className="card agenda-empty">Ventures only works in the Mac app, because it reads project folders on this computer.</div></div>
  );

  const pickFolder = async () => {
    const dir = await api.pick();
    if (!dir) return;
    const next = { name: dir.split('/').pop(), dir };
    localStorage.setItem('jc_venture', JSON.stringify(next));
    setCfg(next); setMoney(null); setO(null);
  };
  const run = async id => {
    setView('terminal');
    setTerm(t => ({ ...t, text: t.text + (t.text ? '\n' : ''), running: id }));
    const r = await api.run(cfg.dir, id);
    if (!r.ok) setTerm(t => ({ ...t, text: t.text + `${r.error}\n`, running: null }));
  };
  const openDoc = async file => { const r = await api.doc(cfg.dir, file); setDoc({ file, text: r.ok ? r.text : r.error }); };

  // ── Daily check: findings come from the real state, not a tick-box ───────
  const now = Date.now();
  const startOfToday = parseLocal(todayStr).getTime();
  const findings = [];
  const add = (lv, t) => findings.push({ lv, t });
  if (o?.ok) {
    const missing = o.secrets.filter(s => !s.set);
    if (missing.length) add('danger', `${missing.length} key${missing.length === 1 ? ' is' : 's are'} empty: ${missing.map(s => s.key).join(', ')}.`);
    const fake = o.secrets.filter(s => s.set && /FYGARO|STRIPE|SECRET|KEY_ID/.test(s.key) && !/WIPAY/.test(s.key) && looksPlaceholder(s) && !/demo|emul/.test(s.file));
    if (fake.length) add('danger', `${fake.map(s => `${s.key} (${s.file})`).join(', ')} still looks like a placeholder. Card payments can't work with a fake key.`);
    const trackedSecrets = o.files.filter(f => f.tracked && (f.kind === 'credential' || f.file === '.env'));
    if (trackedSecrets.length) add('danger', `${trackedSecrets.map(f => f.file).join(', ')} is committed to git. Anyone with the repo has it.`);
    if (o.secrets.some(s => /WIPAY/.test(s.key))) add('warn', 'WiPay settings are still in the project, but WiPay was replaced by Fygaro. Remove them.');
    if (o.git) {
      if (o.git.dirty.length) add('warn', `${o.git.dirty.length} file${o.git.dirty.length === 1 ? '' : 's'} changed but not committed.`);
      if (o.git.ahead) add('warn', `${o.git.ahead} commit${o.git.ahead === 1 ? '' : 's'} not pushed to GitHub.`);
      if (o.git.behind) add('warn', `${o.git.behind} commit${o.git.behind === 1 ? '' : 's'} on GitHub you don't have here.`);
    }
  }
  let today = null, win = null;
  if (money?.ok) {
    today = ventureStats(money, startOfToday);
    win = ventureStats(money, now - range * 86400000);
    const stuck = money.payments.filter(p => p.status === 'pending' && now - p.createdAt > 20 * 60000 && now - p.createdAt < 3 * 86400000);
    if (stuck.length) add('warn', `${stuck.length} card payment${stuck.length === 1 ? '' : 's'} started in the last 3 days never completed (${J(stuck.reduce((s, p) => s + (Number(p.amountJmd) || 0), 0))}). Abandoned, or a webhook problem?`);
    const week = ventureStats(money, now - 7 * 86400000);
    if (week.refundsCoins) add('warn', `${week.refundsCoins} refund${week.refundsCoins === 1 ? '' : 's'} this week went back as coins, not to the card. Check each one.`);
    if (week.lateCredits) add('warn', `${week.lateCredits} payment${week.lateCredits === 1 ? '' : 's'} this week landed after the order was cancelled.`);
    const noDasher = week.reasons.no_dasher || 0;
    if (noDasher) add(noDasher >= 3 ? 'danger' : 'warn', `${noDasher} order${noDasher === 1 ? '' : 's'} this week cancelled because no runner took ${noDasher === 1 ? 'it' : 'them'}. That's lost money and a lost customer.`);
    const timeouts = week.reasons.payment_timeout || 0;
    if (timeouts) add('warn', `${timeouts} order${timeouts === 1 ? '' : 's'} this week timed out waiting for payment.`);
    if (week.placed === 0) add('warn', 'No orders in the last 7 days.');
    if (!findings.some(f => f.lv !== 'ok')) add('ok', 'Money, keys and code all look clean.');
  } else if (money && !money.ok) add('danger', `Couldn't read live data: ${money.error}`);
  const order = { danger: 0, warn: 1, ok: 2 };
  findings.sort((a, b) => order[a.lv] - order[b.lv]);

  const checkedToday = checks.some(c => c.date === todayStr);
  const streak = (() => { const days = new Set(checks.map(c => c.date)); let n = 0, d = days.has(todayStr) ? todayStr : addDays(todayStr, -1); while (days.has(d)) { n++; d = addDays(d, -1); } return n; })();
  const markChecked = () => onSaveCheck({ date: todayStr, venture: cfg.name, issues: findings.filter(f => f.lv !== 'ok').length, orders: today?.placed ?? null, platform: today?.platform ?? null });

  // 14-day chart
  const chart = money?.ok ? Array.from({ length: 14 }, (_, i) => {
    const d = addDays(todayStr, i - 13);
    const dayOrders = money.orders.filter(x => dayKey(x.createdAt) === d);
    const del = dayOrders.filter(x => x.status === 'delivered');
    return { d, label: fmtDate(d, { month: 'numeric', day: 'numeric' }), delivered: del.length, cancelled: dayOrders.filter(x => x.status === 'cancelled').length, platform: del.reduce((s, x) => s + (Number(x.platformFeeJmd) || 0), 0) };
  }) : [];

  const svcMeta = id => services.find(s => s.serviceId === id) || {};
  const autoServices = ventureServices(o);
  const customServices = services.filter(s => s.custom);
  const monthly = services.reduce((s, x) => s + (Number(x.monthlyCost) || 0), 0);
  const tt = { background:'rgba(var(--b1),0.96)', border:'1px solid rgba(212,166,74,0.3)', borderRadius:'10px', color:'#e8d6c3', fontSize:'12px' };
  const axis = { fill:'#7f6758', fontSize:10 };

  return (
    <div className="section venture">
      <div className="sched-bar">
        <div className="sched-range">
          <div className="sched-title" style={{ marginLeft: 0 }}>{cfg.name}</div>
          <button className="vt-path" onClick={pickFolder} title="Change folder">{cfg.dir.replace(/^\/Users\/[^/]+/, '~')}</button>
        </div>
        <div className="seg">
          {[['overview','Overview'],['money','Money'],['keys','Keys'],['services','Services'],['terminal','Terminal'],['docs','Docs']].map(([id, label]) => (
            <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <button className="btn-ghost" onClick={load} disabled={loading}>{loading ? 'Reading…' : '↻ Refresh'}</button>
      </div>

      {o && !o.ok && <div className="card agenda-empty">{o.error}. <button className="link-btn" onClick={pickFolder}>Choose the folder</button></div>}

      {view === 'overview' && o?.ok && (<>
        <div className="grid-2">
          <div className="fin-tile"><span>Orders today</span><b>{today ? today.placed : '…'}</b><span className="fin-delta">{today ? `${today.delivered} delivered · ${today.active} live` : ''}</span></div>
          <div className="fin-tile"><span>Your cut today</span><b className="good">{today ? J(today.platform) : '…'}</b><span className="fin-delta">{today ? `of ${J(today.fees)} in fees` : ''}</span></div>
          <div className="fin-tile"><span>Card payments today</span><b>{today ? J(today.cardPaid.reduce((s, p) => s + (Number(p.amountJmd) || 0), 0)) : '…'}</b><span className="fin-delta">{today ? `${today.cardPaid.length} paid · ${today.cardPending.length} pending` : ''}</span></div>
          <div className="fin-tile"><span>Needs attention</span><b className={findings.some(f => f.lv === 'danger') ? 'bad' : findings.some(f => f.lv === 'warn') ? 'warn' : 'good'}>{findings.filter(f => f.lv !== 'ok').length}</b><span className="fin-delta">{money?.fetchedAt ? `read ${ago(money.fetchedAt)}` : ''}</span></div>
        </div>

        <div className="card span-8">
          <div className="row-between" style={{ marginBottom: '0.25rem' }}>
            <span className="card-label" style={{ margin: 0 }}>Daily check · {fmtDate(todayStr, { weekday:'long', month:'short', day:'numeric' })}</span>
            <span className="fin-delta">{streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'} in a row` : 'no streak yet'}</span>
          </div>
          <ul className="fin-findings" style={{ borderTop: 'none', marginTop: 0 }}>
            {loading && !findings.length && <li className="ok">Reading the project…</li>}
            {findings.map((f, i) => <li key={i} className={f.lv}>{f.t}</li>)}
          </ul>
          <div className="vt-check-foot">
            {checkedToday
              ? <span className="good">✓ Checked today · +10 XP</span>
              : <button className="btn-primary" onClick={markChecked} disabled={loading || !money}>I've read today's check</button>}
            <span className="fin-delta">Findings are worked out from the live project, not typed in. +10 XP a day for looking.</span>
          </div>
        </div>

        <div className="card span-4">
          <div className="card-label">Code</div>
          {!o.git ? <div className="agenda-empty small">Not a git repository.</div> : (<>
            <dl className="fin-kv">
              <div><dt>Branch</dt><dd>{o.git.branch}</dd></div>
              <div><dt>Uncommitted</dt><dd className={o.git.dirty.length ? 'warn' : 'good'}>{o.git.dirty.length || 'Clean'}</dd></div>
              <div><dt>Not pushed</dt><dd className={o.git.ahead ? 'warn' : 'good'}>{o.git.ahead || 'None'}</dd></div>
            </dl>
            <div className="card-label" style={{ margin: '0.9rem 0 0.4rem' }}>Latest commits</div>
            {o.git.commits.slice(0, 5).map(c => (
              <div key={c.hash} className="vt-commit"><span>{c.subject}</span><em>{ago(c.at)}</em></div>
            ))}
          </>)}
        </div>
      </>)}

      {view === 'money' && (
        !money ? <div className="card agenda-empty">Reading live data…</div>
        : !money.ok ? <div className="card agenda-empty">{money.error}</div> : (<>
          <div className="row-between">
            <span className="fin-delta">Read-only, straight from Dorm Dash's database · {ago(money.fetchedAt)}</span>
            <div className="seg">{[[1,'Today'],[7,'7 days'],[30,'30 days']].map(([d, l]) => <button key={d} className={range === d ? 'on' : ''} onClick={() => setRange(d)}>{l}</button>)}</div>
          </div>
          {(() => { const s = range === 1 ? today : win; return (<>
            <div className="grid-2">
              <div className="fin-tile"><span>Orders</span><b>{s.placed}</b><span className="fin-delta">{s.delivered} delivered · {s.cancelled} cancelled</span></div>
              <div className="fin-tile"><span>Your cut</span><b className="good">{J(s.platform)}</b><span className="fin-delta">runners earned {J(s.payouts)}</span></div>
              <div className="fin-tile"><span>Food sold</span><b>{J(s.gmv)}</b><span className="fin-delta">delivered orders</span></div>
              <div className="fin-tile"><span>Completion</span><b className={s.placed && s.delivered / s.placed < 0.7 ? 'bad' : 'good'}>{s.placed ? `${Math.round((s.delivered / s.placed) * 100)}%` : '—'}</b><span className="fin-delta">of orders delivered</span></div>
            </div>
            <div className="card span-8">
              <div className="row-between" style={{ marginBottom: '0.75rem' }}>
                <span className="card-label" style={{ margin: 0 }}>Last 14 days</span>
                <span className="fin-legend"><i className="l-inc"/>Delivered<i className="l-exp"/>Cancelled<i className="l-net"/>Your cut</span>
              </div>
              <ResponsiveContainer width="100%" height={CHART_H(160)}>
                <ComposedChart data={chart} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,166,74,0.08)"/>
                  <XAxis dataKey="label" tick={axis}/>
                  <YAxis yAxisId="n" tick={axis} width={28} allowDecimals={false}/>
                  <YAxis yAxisId="j" orientation="right" tick={axis} width={40} tickFormatter={Jk}/>
                  <Tooltip contentStyle={tt} formatter={(v, n) => (n === 'Your cut' ? J(v) : v)}/>
                  <Bar yAxisId="n" dataKey="delivered" name="Delivered" stackId="o" fill="#e6c47c" maxBarSize={22} radius={[0,0,0,0]}/>
                  <Bar yAxisId="n" dataKey="cancelled" name="Cancelled" stackId="o" fill="#ff6a45" maxBarSize={22} radius={[3,3,0,0]}/>
                  <Line yAxisId="j" type="monotone" dataKey="platform" name="Your cut" stroke="#f2ddab" strokeWidth={2} dot={{ r: 2 }}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="card span-4">
              <div className="card-label">Payments</div>
              <dl className="fin-kv">
                <div><dt>Card payments received</dt><dd>{J(s.cardPaid.reduce((a, p) => a + (Number(p.amountJmd) || 0), 0))} · {s.cardPaid.length}</dd></div>
                <div><dt>Started, never finished</dt><dd className={s.cardPending.length ? 'warn' : ''}>{s.cardPending.length}</dd></div>
                <div><dt>Coin top-ups</dt><dd>{J(s.topups)}</dd></div>
                <div><dt>Refunds to card</dt><dd>{s.refundsCard}</dd></div>
                <div><dt>Refunds as coins</dt><dd className={s.refundsCoins ? 'warn' : ''}>{s.refundsCoins}</dd></div>
                <div><dt>Paid after cancel</dt><dd className={s.lateCredits ? 'warn' : ''}>{s.lateCredits}</dd></div>
              </dl>
              {Object.keys(s.reasons).length > 0 && (<>
                <div className="card-label" style={{ margin: '0.9rem 0 0.4rem' }}>Why orders were cancelled</div>
                {Object.entries(s.reasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => <div key={r} className="row-between cl-line"><span>{r.replace(/_/g, ' ')}</span><span>{n}</span></div>)}
              </>)}
            </div>
          </>); })()}
          <div className="card">
            <div className="card-label">Latest orders</div>
            <div className="vt-table">
              <div className="vt-row head"><span>When</span><span>Store</span><span>Status</span><span>Payment</span><span>Total</span><span>Your cut</span></div>
              {money.orders.slice(0, 15).map(x => (
                <div key={x.id} className="vt-row">
                  <span>{ago(x.createdAt)}</span><span className="name">{x.storeName || '—'}</span>
                  <span className={x.status === 'delivered' ? 'good' : x.status === 'cancelled' ? 'bad' : 'warn'}>{(x.status || '').replace(/_/g, ' ')}{x.cancelReason ? ` · ${x.cancelReason.replace(/_/g, ' ')}` : ''}</span>
                  <span>{x.paymentMethod ? `${x.paymentMethod === 'tokens' ? 'coins' : 'card'} · ${(x.paymentStatus || '').replace(/_/g, ' ')}` : '—'}</span>
                  <span>{J(x.totalAmount || 0)}</span><span>{x.status === 'delivered' ? J(x.platformFeeJmd || 0) : '—'}</span>
                </div>
              ))}
              {money.orders.length === 0 && <div className="agenda-empty small">No orders in the last 30 days.</div>}
            </div>
          </div>
        </>)
      )}

      {view === 'keys' && o?.ok && (<>
        <div className="card span-8">
          <div className="card-label">Keys and settings · values never leave this Mac</div>
          <div className="vt-table keys">
            <div className="vt-row head"><span>Key</span><span>File</span><span>Value</span><span>Status</span></div>
            {o.secrets.map((s, i) => {
              const bad = !s.set ? 'Empty' : /WIPAY/.test(s.key) ? 'Unused' : looksPlaceholder(s) && !/demo|emul/.test(s.file) && !s.public ? 'Placeholder?' : '';
              return (
                <div key={i} className="vt-row" title={keyNote(s.key)}>
                  <span className="name">{s.key}</span><span>{s.file}</span><span className="mono">{s.masked || '—'}</span>
                  <span className={bad ? 'bad' : s.public ? '' : 'good'}>{bad || (s.public ? 'Public' : 'Set')}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card span-4">
          <div className="card-label">Secret files</div>
          {o.files.map(f => (
            <div key={f.file} className="row-between cl-line">
              <span>{f.file}</span>
              <span className={f.tracked && (f.kind === 'credential' || f.file === '.env') ? 'bad' : f.tracked ? 'warn' : 'good'}>{f.tracked ? 'in git' : 'not in git'}</span>
            </div>
          ))}
          <ul className="fin-assume">
            <li>"Public" keys ship inside the app anyway; rules and App Check protect them.</li>
            <li>Anything marked "in git" is visible to everyone with the repository.</li>
            <li>Hover a key to see what it's for.</li>
          </ul>
        </div>
      </>)}

      {view === 'services' && o?.ok && (<>
        <div className="row-between">
          <span className="fin-delta">Everything Dorm Dash depends on. Monthly cost: <b className={monthly ? 'warn' : ''}>{J(monthly)}</b></span>
          <button className="btn-primary" onClick={() => setSvcForm({ custom: true })}><Icons.plus size={13}/> Service</button>
        </div>
        <div className="goal-grid">
          {[...autoServices, ...customServices.map(s => ({ id: s.serviceId, name: s.name, does: s.does, url: s.url, custom: true }))].map(s => {
            const meta = svcMeta(s.id);
            const days = meta.renewsOn ? Math.round((parseLocal(meta.renewsOn) - parseLocal(todayStr)) / 864e5) : null;
            return (
              <div key={s.id} className="card vt-svc">
                <div className="focus-head">
                  <div><div className="focus-title">{s.name}</div><div className="focus-meta">{s.does}</div></div>
                  <button className="icon-btn" title="Cost, renewal, notes" onClick={() => setSvcForm({ ...meta, serviceId: s.id, name: s.name, does: s.does, url: s.url, custom: !!s.custom })}><Icons.edit size={12}/></button>
                </div>
                <div className="goal-foot">
                  <span>{Number(meta.monthlyCost) > 0 ? `${J(meta.monthlyCost)}/mo` : 'Free or not set'}</span>
                  {days !== null && <span className={days <= 7 ? 'bad' : ''}>{days < 0 ? `Renewal ${-days}d overdue` : days === 0 ? 'Renews today' : `Renews in ${days}d`}</span>}
                </div>
                {meta.note && <div className="tk-note" style={{ whiteSpace: 'pre-wrap' }}>{meta.note}</div>}
                {s.url && <a className="btn-ghost goal-log" href={s.url} target="_blank" rel="noopener noreferrer">Open ↗</a>}
              </div>
            );
          })}
        </div>
      </>)}

      {view === 'terminal' && o?.ok && (<>
        <div className="card span-4">
          <div className="card-label">Safe checks</div>
          <div className="vt-checks">
            {o.checks.map(c => {
              const last = term.last[c.id];
              return (
                <button key={c.id} className="btn-ghost vt-run" disabled={!!term.running} onClick={() => run(c.id)} title={c.cmd}>
                  <span>{term.running === c.id ? '● ' : '▶ '}{c.label}</span>
                  {last && <em className={last.code === 0 ? 'good' : 'bad'}>{last.code === 0 ? 'passed' : `failed (${last.code})`}</em>}
                </button>
              );
            })}
          </div>
          <ul className="fin-assume">
            <li>These only read and test. Nothing here deploys or changes the live app.</li>
            <li>Deploys stay in your own terminal, on purpose.</li>
          </ul>
        </div>
        <div className="card span-8 vt-term-card">
          <div className="row-between" style={{ marginBottom: '0.5rem' }}>
            <span className="card-label" style={{ margin: 0 }}>{term.running ? 'Running…' : 'Output'}</span>
            <span className="row-gap">
              {term.running && <button className="btn-ghost tk-carry" onClick={() => api.stop()}>Stop</button>}
              <button className="btn-ghost tk-carry" onClick={() => setTerm(t => ({ ...t, text: '' }))}>Clear</button>
            </span>
          </div>
          <pre className="vt-term" ref={termRef}>{term.text || 'Pick a check on the left. Its output shows up here.'}</pre>
        </div>
      </>)}

      {view === 'docs' && o?.ok && (<>
        <div className="card span-4">
          <div className="card-label">Project notes</div>
          {o.docs.length === 0 ? <div className="agenda-empty small">No .md files at the top of the project.</div>
            : o.docs.map(f => <button key={f} className={`cl-row ${doc?.file === f ? 'on' : ''}`} style={{ gridTemplateColumns: '1fr' }} onClick={() => openDoc(f)}><span className="cl-row-name">{f.replace(/\.md$/i, '').replace(/_/g, ' ')}</span></button>)}
        </div>
        <div className="card span-8">
          <div className="card-label">{doc ? doc.file : 'Pick a note'}</div>
          <pre className="vt-doc">{doc ? doc.text : 'Your own setup notes for payments, pricing and deployment live in the project. Read them here without opening the code.'}</pre>
        </div>
      </>)}

      {svcForm && (
        <ServiceModal data={svcForm}
          onSave={d => { onSaveService(d); setSvcForm(null); }}
          onDelete={svcForm.id && svcForm.custom ? async () => { if (await confirm({ message: `Remove ${svcForm.name}?`, label: 'Remove', danger: true })) { onDeleteService(svcForm.id); setSvcForm(null); } } : null}
          onClose={() => setSvcForm(null)}/>
      )}
      {ConfirmUI}
    </div>
  );
}

function ServiceModal({ data, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ name: '', does: '', url: '', monthlyCost: '', renewsOn: '', note: '', ...data });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name.trim()) return;
    onSave({ ...f, name: f.name.trim(), serviceId: f.serviceId || `custom-${Date.now().toString(36)}`, monthlyCost: f.monthlyCost === '' ? '' : Number(f.monthlyCost) });
  };
  return (
    <Modal title={data.serviceId ? f.name : 'New Service'} onClose={onClose}>
      {data.custom && (<>
        <Field label="Service"><input className="input" autoFocus value={f.name} onChange={e => s('name', e.target.value)} placeholder="e.g. Twilio, domain registrar"/></Field>
        <Field label="What it does for the business"><input className="input" value={f.does} onChange={e => s('does', e.target.value)}/></Field>
        <Field label="Dashboard link"><input className="input" value={f.url} onChange={e => s('url', e.target.value)} placeholder="https://"/></Field>
      </>)}
      <div className="grid-2">
        <Field label="Monthly cost (J$)"><input className="input" type="number" min="0" value={f.monthlyCost} onChange={e => s('monthlyCost', e.target.value)} placeholder="0"/></Field>
        <Field label="Renews / bills on"><input className="input" type="date" value={f.renewsOn || ''} onChange={e => s('renewsOn', e.target.value)}/></Field>
      </div>
      <Field label="Notes"><textarea className="input" style={{ minHeight: 64, resize: 'vertical' }} value={f.note || ''} onChange={e => s('note', e.target.value)} placeholder="Which account it's under, plan, limits. Not passwords."/></Field>
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent: 'center' }} onClick={onDelete}><Icons.trash size={13}/> Remove service</button>}
    </Modal>
  );
}

// ─── COMMAND BAR (⌘K) ─────────────────────────────────────────────────────────
// Type what you did in plain words and it's logged; or jump anywhere.
//   "spent 1500 on lunch"         → expense, category guessed
//   "got 20000 from Kicks"        → income, linked to the client
//   "task call Donna"             → task for today
//   "did gym" / "habit gym"       → tick a habit
//   "start exam prep"             → start a focus timer
//   "lead Bob's Bakery"           → new lead with a first-contact step
const EXPENSE_WORDS = {
  Food: ['food','lunch','dinner','breakfast','groceries','grocery','snack','kfc','juici','patty','drink','coffee','chicken'],
  Transport: ['taxi','bus','gas','fuel','transport','uber','route','fare','car'],
  Hosting: ['hosting','render','domain','server','vercel','netlify'],
  'AI API': ['claude','openai','api','anthropic','gpt','tokens'],
  Tools: ['canva','figma','tool','tools','software','subscription','adobe','notion','app'],
  Education: ['book','books','course','tuition','school','fees','udemy','exam'],
};
const parseAmount = text => {
  const m = text.match(/(?:j?\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
  return n > 0 ? { n, raw: m[0] } : null;
};
const tidy = s => { const t = s.replace(/\s+/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : ''; };

function CommandPalette({ sections, leads, habits, timers, todos, todayStr, run, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const text = q.trim(), lower = text.toLowerCase();
  const results = [];
  const add = (group, title, sub, act, icon = '›') => results.push({ group, title, sub, act, icon });
  const findLead = () => leads.filter(l => l.businessName).sort((a, b) => b.businessName.length - a.businessName.length)
    .find(l => lower.includes(l.businessName.toLowerCase()) || l.businessName.toLowerCase().split(/\s+/).some(w => w.length > 3 && lower.split(/\s+/).includes(w)));

  if (text) {
    // ── Natural-language actions ──
    let m;
    if ((m = lower.match(/^(spent|spend|paid|pay|bought|buy|expense|cost)\b/))) {
      const amt = parseAmount(text);
      if (amt) {
        const words = lower.split(/[^a-z]+/);
        const category = Object.keys(EXPENSE_WORDS).find(c => EXPENSE_WORDS[c].some(w => words.includes(w))) || 'Other';
        const desc = tidy(text.slice(m[0].length).replace(amt.raw, '').replace(/\b(on|for|at|j\$)\b/gi, '')) || category;
        add('Log', `Expense ${J(amt.n)} · ${category}`, desc, () => run.addFinance({ type: 'expense', amount: amt.n, category, description: desc, date: todayStr }), '−');
      } else add('Log', 'How much?', 'e.g. "spent 1500 on lunch"', null, '?');
    } else if ((m = lower.match(/^(earned|earn|got|received|income|sold|made)\b/))) {
      const amt = parseAmount(text);
      if (amt) {
        const client = findLead();
        const category = /retainer/.test(lower) ? 'Monthly Retainer' : /deposit/.test(lower) ? 'First Deposit' : /freelance/.test(lower) ? 'Freelance' : 'Other';
        const desc = tidy(text.slice(m[0].length).replace(amt.raw, '').replace(/\b(from|for|j\$)\b/gi, '')) || (client ? `${client.businessName} payment` : 'Income');
        add('Log', `Income ${J(amt.n)}${client ? ` · ${client.businessName}` : ''}`, `${category} · ${desc}`, () => run.addFinance({
          type: 'income', amount: amt.n, category, description: desc, date: todayStr,
          ...(client ? { pipelineLeadId: client.id, ...(PAYMENT_STAGES.includes(category) ? { paymentStage: category } : {}) } : {}),
        }), '+');
      } else add('Log', 'How much?', 'e.g. "got 20000 from Kicks"', null, '?');
    } else if ((m = text.match(/^(task|todo|to do)\s+(.+)/i))) {
      add('Do', `Add task: ${tidy(m[2])}`, 'For today', () => run.addTodo(tidy(m[2])), '✓');
    } else if ((m = text.match(/^lead\s+(.+)/i))) {
      add('Do', `New lead: ${tidy(m[1])}`, 'First contact today', () => run.addLead(tidy(m[1])), '+');
    } else if ((m = lower.match(/^(did|habit|done)\s+(.+)/))) {
      habits.filter(h => !h.archivedAt && h.name.toLowerCase().includes(m[2])).forEach(h =>
        add('Do', `${h.completions?.[todayStr] ? 'Undo' : 'Tick'} habit: ${h.name}`, h.completions?.[todayStr] ? 'Done today' : '+10 XP', () => run.toggleHabit(h), '♥'));
    } else if ((m = lower.match(/^(start|focus|study|pause|stop)\s+(.+)/))) {
      timers.filter(t => timerStatus(t, todayStr) === 'active' && t.title.toLowerCase().includes(m[2])).forEach(t =>
        add('Do', `${t.runningSince ? 'Pause' : 'Start'} timer: ${t.title}`, `${fmtHM(timerTargetSec(t) - timerElapsed(t, Date.now()))} to go`, () => (t.runningSince ? run.pauseTimer(t) : run.startTimer(t)), '⧗'));
    }

    // ── Search ──
    sections.filter(s => s.label.toLowerCase().includes(lower)).forEach(s => add('Go to', s.label, 'Section', () => run.nav(s.id)));
    leads.filter(l => (l.businessName || '').toLowerCase().includes(lower) || (l.contactName || '').toLowerCase().includes(lower)).slice(0, 5).forEach(l =>
      add(l.status === 'Paid' ? 'Clients' : 'Leads', l.businessName, `${l.status}${l.contactName ? ` · ${l.contactName}` : ''}`, () => run.nav(l.status === 'Paid' ? 'clients' : 'pipeline')));
    habits.filter(h => !h.archivedAt && h.name.toLowerCase().includes(lower) && !/^(did|habit|done)\s/.test(lower)).forEach(h =>
      add('Habits', `${h.completions?.[todayStr] ? 'Undo' : 'Tick'}: ${h.name}`, h.completions?.[todayStr] ? 'Done today' : '+10 XP', () => run.toggleHabit(h), '♥'));
    timers.filter(t => timerStatus(t, todayStr) === 'active' && t.title.toLowerCase().includes(lower) && !/^(start|focus|study|pause|stop)\s/.test(lower)).forEach(t =>
      add('Focus', `${t.runningSince ? 'Pause' : 'Start'}: ${t.title}`, `${fmtHM(timerTargetSec(t) - timerElapsed(t, Date.now()))} to go`, () => (t.runningSince ? run.pauseTimer(t) : run.startTimer(t)), '⧗'));
    todos.filter(t => t.addedDate === todayStr && t.title.toLowerCase().includes(lower) && !/^(task|todo)\s/.test(lower)).forEach(t =>
      add('Tasks', `${t.doneOn?.[todayStr] ? 'Undo' : 'Done'}: ${t.title}`, t.doneOn?.[todayStr] ? 'Completed' : '+5 XP', () => run.toggleTodo(t), '✓'));
    if (!results.some(r => r.act)) add('Tip', 'Try "spent 800 on lunch", "task call Donna", "did gym" or "start exam prep"', '', null, '?');
  } else {
    sections.forEach((s, i) => add('Go to', s.label, `⌘${(i + 1) % 10}`, () => run.nav(s.id)));
  }

  const actionable = results.filter(r => r.act);
  const safeSel = Math.min(sel, Math.max(0, actionable.length - 1));
  const exec = r => { if (!r?.act) return; const msg = r.act(); onClose(); if (typeof msg === 'string') run.toast(msg); };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(i => Math.min(actionable.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); exec(actionable[safeSel]); }
  };

  let lastGroup = null;
  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk" onMouseDown={e => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Icons.search size={16}/>
          <input ref={inputRef} className="cmdk-input" value={q} onChange={e => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey}
            placeholder="Type what you did, or where to go…" spellCheck={false}/>
          <kbd>esc</kbd>
        </div>
        <div className="cmdk-list">
          {results.map((r, i) => {
            const idx = actionable.indexOf(r);
            const head = r.group !== lastGroup ? <div className="cmdk-group" key={`g${i}`}>{r.group}</div> : null;
            lastGroup = r.group;
            return (
              <React.Fragment key={i}>
                {head}
                <button className={`cmdk-item ${idx === safeSel && r.act ? 'on' : ''} ${r.act ? '' : 'muted'}`} disabled={!r.act}
                  onMouseEnter={() => idx >= 0 && setSel(idx)} onClick={() => exec(r)}>
                  <span className="cmdk-icon">{r.icon}</span>
                  <span className="cmdk-title">{r.title}</span>
                  {r.sub && <span className="cmdk-sub">{r.sub}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-foot"><span>↑↓ choose</span><span>↵ do it</span><span>⌘K open anywhere</span></div>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

// Inline confirm hook — returns { confirm, ConfirmUI }
// Usage: const { confirm, ConfirmUI } = useConfirm();
//        await confirm({ message:'Delete this?', label:'Delete' }) → true/false
function useConfirm() {
  const [state, setState] = useState(null); // { message, label, resolve }

  const confirm = (opts) => new Promise(resolve => {
    setState({ message: opts.message || 'Are you sure?', label: opts.label || 'Confirm', danger: opts.danger !== false, resolve });
  });

  const handleYes = () => { const r = state.resolve; setState(null); r(true); };
  const handleNo  = () => { const r = state.resolve; setState(null); r(false); };

  const ConfirmUI = state ? (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:9999,backdropFilter:'blur(4px)',padding:'1rem',
    }}>
      <div style={{
        background:'rgba(var(--b1),0.98)',
        border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:14,padding:'1.5rem',maxWidth:320,width:'100%',
        boxShadow:'0 20px 60px rgba(0,0,0,0.8)',
      }}>
        <div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:600,
          color:'var(--mist-0)',marginBottom:'0.5rem',lineHeight:1.3}}>
          Are you sure?
        </div>
        <div style={{fontSize:'13px',color:'var(--mist-2)',lineHeight:1.6,marginBottom:'1.25rem'}}>
          {state.message}
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <button onClick={handleNo} style={{
            flex:1,padding:'0.6rem',borderRadius:8,cursor:'pointer',
            fontFamily:'var(--fm)',fontSize:'12px',fontWeight:600,
            background:'rgba(255,255,255,0.06)',
            border:'1px solid rgba(255,255,255,0.1)',
            color:'var(--mist-1)',
          }}>Cancel</button>
          <button onClick={handleYes} style={{
            flex:1,padding:'0.6rem',borderRadius:8,cursor:'pointer',
            fontFamily:'var(--fm)',fontSize:'12px',fontWeight:700,
            background: state.danger ? 'rgba(255,90,54,0.15)' : 'rgba(var(--p3),0.12)',
            border: `1px solid ${state.danger ? 'rgba(255,90,54,0.4)' : 'rgba(var(--p3),0.35)'}`,
            color: state.danger ? '#ff5a36' : 'var(--bolt)',
          }}>{state.label}</button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmUI };
}

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