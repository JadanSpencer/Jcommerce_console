import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
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


const EMOTION_LEVELS = [
  { emoji:'😎', label:'Thriving',   color:'#3b82f6', bg:'rgba(201,168,76,0.08)',  desc:'Ahead of target' },
  { emoji:'😊', label:'Good',       color:'#1adb8a', bg:'rgba(16,185,129,0.08)',  desc:'On track' },
  { emoji:'😐', label:'Watch Out',  color:'#f0c060', bg:'rgba(240,192,96,0.08)',  desc:'Needs attention' },
  { emoji:'😟', label:'Struggling', color:'#f97316', bg:'rgba(249,115,22,0.08)',  desc:'Pull up your socks' },
  { emoji:'🚨', label:'Danger',     color:'#ff6040', bg:'rgba(255,96,64,0.08)',   desc:'Critical — act now' },
];

function calcEmotionLevel(finances, leads, xp, level) {
  // Recalculates live from raw data every render — any money change updates immediately
  const totalIncome   = finances.filter(f => f.type==='income').reduce((s,f) => s+(Number(f.amount)||0), 0);
  const totalExpenses = finances.filter(f => f.type==='expense').reduce((s,f) => s+(Number(f.amount)||0), 0);
  const profit        = totalIncome - totalExpenses;
  const mrr           = leads.filter(l => l.status==='Paid' && l.retainerAmount).reduce((s,l) => s+(Number(l.retainerAmount)||0), 0);
  const paidClients   = leads.filter(l => l.status==='Paid').length;
  const openLeads     = leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status)).length;
  const hasData       = finances.length > 0;

  // No data yet → neutral
  if (!hasData && paidClients === 0) return 2;

  // Score built purely from real financial signals — no arbitrary base
  let score = 50; // true neutral

  // ── PROFIT (biggest signal — most direct money indicator)
  if (profit > 100000)      score += 30;
  else if (profit > 50000)  score += 22;
  else if (profit > 20000)  score += 15;
  else if (profit > 5000)   score += 8;
  else if (profit > 0)      score += 3;
  else if (profit < -50000) score -= 30;
  else if (profit < -20000) score -= 20;
  else if (profit < -5000)  score -= 12;
  else if (profit < 0)      score -= 6;

  // ── MRR (recurring revenue = stability)
  if (mrr > 100000)      score += 20;
  else if (mrr > 50000)  score += 15;
  else if (mrr > 20000)  score += 10;
  else if (mrr > 10000)  score += 6;
  else if (mrr > 5000)   score += 3;
  else if (mrr === 0 && paidClients > 0) score -= 3; // clients with no retainer setup

  // ── PAID CLIENTS (proof of market)
  if (paidClients >= 10)     score += 15;
  else if (paidClients >= 5) score += 10;
  else if (paidClients >= 3) score += 6;
  else if (paidClients >= 1) score += 3;
  else                       score -= 5; // no clients at all

  // ── PIPELINE (future revenue signal)
  if (openLeads >= 10)     score += 8;
  else if (openLeads >= 5) score += 5;
  else if (openLeads >= 2) score += 2;
  else if (openLeads === 0) score -= 5; // dry pipeline = danger

  // ── EXPENSE RATIO (burn rate warning)
  if (hasData && totalIncome > 0) {
    const er = totalExpenses / totalIncome;
    if (er < 0.2)      score += 8;
    else if (er < 0.4) score += 4;
    else if (er > 0.8) score -= 10;
    else if (er > 0.6) score -= 5;
  }

  // ── XP MOMENTUM (active = healthy)
  if (xp > 2000)      score += 5;
  else if (xp > 500)  score += 2;

  score = Math.max(0, Math.min(100, score));

  // Proportional bands — each 20 points = one emoji step
  if (score >= 80) return 0; // 😎 Thriving
  if (score >= 60) return 1; // 😊 Good
  if (score >= 40) return 2; // 😐 Watch Out
  if (score >= 20) return 3; // 😟 Struggling
  return 4;                  // 🚨 Danger
}

function calcTodoXP(todos, todayStr) {
  const yesterday = new Date(new Date(todayStr) - 86400000).toISOString().slice(0,10);
  let xp = 0;
  todos.forEach(t => { xp += Object.entries(t.doneOn||{}).filter(([,v])=>v).length * 5; });
  todos.forEach(t => { if (t.addedDate && t.addedDate <= yesterday && !t.doneOn?.[yesterday]) xp -= 10; });
  const yt = todos.filter(t => t.addedDate === yesterday);
  if (yt.length > 0 && yt.length < 5) xp -= 10;
  return xp;
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d.toISOString().slice(0,10); });
}

function getLast20Weeks() {
  const weeks = []; const today = new Date();
  for (let w = 19; w >= 0; w--) {
    const days = []; const monday = new Date(today); const dow = today.getDay();
    monday.setDate(today.getDate() - (dow===0?6:dow-1) - w*7);
    for (let d = 0; d < 7; d++) { const day = new Date(monday); day.setDate(monday.getDate()+d); days.push(day.toISOString().slice(0,10)); }
    weeks.push(days);
  }
  return weeks;
}

function calcXP(habits, leads, todos, todayStr) {
  let xp = 0;
  const yesterday = new Date(new Date(todayStr) - 86400000).toISOString().slice(0,10);
  habits.forEach(h => {
    xp += Object.values(h.completions||{}).filter(Boolean).length * 10;
    const created = h.createdAt?.toDate ? h.createdAt.toDate().toISOString().slice(0,10) : null;
    if (created && yesterday < created) return;
    if (!h.completions?.[yesterday]) xp -= 10;
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


// ─── VIVID LIGHTNING PARTICLES ────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Full lightning blue spectrum
    const SHADES = [
      { r:0,   g:61,  b:92  },  // bolt-1 deep
      { r:0,   g:95,  b:138 },  // bolt-2
      { r:0,   g:136, b:200 },  // bolt-3
      { r:0,   g:170, b:238 },  // bolt-4
      { r:0,   g:212, b:255 },  // bolt — pure lightning
      { r:64,  g:232, b:255 },  // bolt-lt
      { r:158, g:244, b:255 },  // bolt-pale
      { r:224, g:250, b:255 },  // bolt-white
      { r:68,  g:136, b:204 },  // steel
      { r:136, g:221, b:255 },  // ice
      { r:68,  g:85,  b:255 },  // indigo
      { r:136, g:85,  b:255 },  // violet-blue
      { r:240, g:192, b:96  },  // horizon gold — rare
    ];

    class Particle {
      constructor(initial=false) { this.spawn(initial); }
      spawn(initial=false) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height : canvas.height + 12;
        this.size = Math.random() * 2.5 + 0.4;
        this.vy   = Math.random() * 1.1 + 0.4;
        this.vx   = (Math.random() - 0.5) * 0.5;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 80;
        this.wobble  = Math.random() * Math.PI * 2;
        this.ws      = Math.random() * 0.035 + 0.008;
        // Weighted random — more bright bolts, fewer gold
        const roll = Math.random();
        if (roll < 0.12)       this.shade = SHADES[12]; // gold — rare
        else if (roll < 0.22)  this.shade = SHADES[10]; // indigo
        else if (roll < 0.32)  this.shade = SHADES[11]; // violet
        else {
          // Pick from blue spectrum, weighted toward bright
          const i = Math.floor(Math.pow(Math.random(), 0.6) * 10);
          this.shade = SHADES[Math.min(i, 9)];
        }
        this.bright = roll > 0.75; // 25% are extra bright
      }
      update() {
        this.life++;
        this.wobble += this.ws;
        this.x += this.vx + Math.sin(this.wobble) * 0.5;
        this.y -= this.vy;
        if (this.y < -12 || this.life > this.maxLife) this.spawn();
      }
      draw() {
        const t = this.life / this.maxLife;
        const alpha = t < 0.15 ? t/0.15 : t > 0.72 ? 1-(t-0.72)/0.28 : 1;
        const sz = this.size * (1 - t * 0.45);
        const { r, g, b } = this.shade;
        const radius = sz * (this.bright ? 5 : 3.5);

        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        grad.addColorStop(0,   `rgba(255,255,255,${alpha * (this.bright ? 1 : 0.85)})`);
        grad.addColorStop(0.15,`rgba(${r},${g},${b},${alpha * 0.95})`);
        grad.addColorStop(0.45,`rgba(${r},${g},${b},${alpha * 0.5})`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright particles get a streak upward
        if (this.bright && alpha > 0.4) {
          const streak = ctx.createLinearGradient(this.x, this.y, this.x, this.y + sz * 8);
          streak.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.6})`);
          streak.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.moveTo(this.x - sz * 0.4, this.y);
          ctx.lineTo(this.x + sz * 0.4, this.y);
          ctx.lineTo(this.x + sz * 0.2, this.y + sz * 8);
          ctx.lineTo(this.x - sz * 0.2, this.y + sz * 8);
          ctx.fillStyle = streak;
          ctx.fill();
        }
      }
    }

    const particles = Array.from({ length: 160 }, (_, i) => new Particle(i < 80));

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed', inset:0, width:'100%', height:'100%',
      pointerEvents:'none', zIndex:0, opacity:0.6,
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
  const [todos, setTodos]       = useState([]);
  const [queue, setQueue]       = useState([]);
  const [logs, setLogs]         = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const weekDates = getWeekDates();
  // Allow pipeline to trigger invoice from lead
  useEffect(() => { window._openInvoice = (data) => { setInvoiceData(data); setInvoiceOpen(true); }; return () => { delete window._openInvoice; }; }, []);
  const todayStr  = new Date().toISOString().slice(0,10);

  useEffect(() => {
    const unsubs = []; let loaded = 0;
    const cols = [
      ['leads',setLeads],['habits',setHabits],['schedule',setSchedule],
      ['finances',setFinances],['goals',setGoals],['todos',setTodos],
      ['jaxon_queue',setQueue],['jaxon_logs',setLogs],['briefings',setBriefings],
    ];
    cols.forEach(([col,setter]) => {
      try {
        const q = query(collection(db,col), orderBy('createdAt','desc'));
        const unsub = onSnapshot(q, snap => {
          setter(snap.docs.map(d => ({id:d.id,...d.data()})));
          loaded++;
          if (loaded >= cols.length) setLoading(false);
        }, () => { setError('Firebase connection issue'); setLoading(false); });
        unsubs.push(unsub);
      } catch { setError('Firebase not configured'); setLoading(false); }
    });
    return () => unsubs.forEach(u => u());
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
  const paidLeads  = leads.filter(l=>l.status==='Paid');
  const openLeads  = leads.filter(l=>!['Paid','Flaked','Lost'].includes(l.status));
  const habitsToday = habits.length ? Math.round(habits.filter(h=>h.completions?.[todayStr]).length/habits.length*100) : 0;
  const xp = calcXP(habits, leads, todos, todayStr);
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
          <button className="icon-btn" title="Create Invoice" onClick={()=>setInvoiceOpen(true)} style={{width:28,height:28,borderColor:'rgba(201,168,76,0.2)',color:'#1adb8a'}}>📄</button>
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
        {tab==='goals'    && <Goals goals={goals} onAdd={d=>add('goals',d)} onUpdate={(id,d)=>update('goals',id,d)} onDelete={id=>remove('goals',id)}/>}
        {tab==='jaxon'    && <JaxonDashboard queue={queue} logs={logs} briefings={briefings} todayStr={todayStr} onApprove={id=>update('jaxon_queue',id,{status:'approved'})} onReject={id=>update('jaxon_queue',id,{status:'rejected'})}/>}
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

  const activeFilters = [fStatus,fLocation,fSource,fWhatsApp,fPriority].filter(f=>f!=='All').length + (search?1:0);

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
                onClick={()=>{setFStatus('All');setFLocation('All');setFSource('All');setFWhatsApp('All');setFPriority('All');setSearch('');setPage(0);}}>
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
  const [form,setForm] = useState(null);
  const today = new Date();
  const [sel,setSel] = useState(DAYS[today.getDay()===0?6:today.getDay()-1]);
  const blocks = schedule.filter(s=>s.day===sel).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Weekly Schedule</div>
        <div className="hero-big">Plan Your Time</div>
        <div className="hero-sub">Structure creates freedom</div>
      </div>
      <div className="pill-row">
        {DAYS.map(d => <button key={d} className={`pill ${sel===d?'active':''}`} onClick={()=>setSel(d)}>{d}</button>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:700,fontSize:'15px'}}>{sel}</span>
        <button className="btn-primary" onClick={()=>setForm({day:sel})}><Icons.plus size={14}/> Block</button>
      </div>
      {blocks.length===0 ? <Empty text={`Nothing on ${sel}.`}/> : (
        <div className="list">
          {blocks.map(b => (
            <div key={b.id} className="card fade-in" style={{borderLeft:`3px solid ${BLOCK_COLORS[b.type]||'#475569'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'14.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</div>
                  <div style={{fontFamily:'var(--fm)',fontSize:'11px',color:BLOCK_COLORS[b.type],marginTop:'2px'}}>{b.start} – {b.end} · {b.type}</div>
                </div>
                <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                  <button className="icon-btn" onClick={()=>setForm(b)}><Icons.edit size={12}/></button>
                  <button className="icon-btn danger-btn" onClick={()=>onDelete(b.id)}><Icons.trash size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const filtered = filter==='all' ? finances : finances.filter(f=>f.type===filter);
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
    return Array.from({length:6},(_,i)=>{const d=new Date(today.getFullYear(),today.getMonth()+i+1,1);const p=ai+mrr;return{month:d.toISOString().slice(0,7),projected:Math.round(p),expenses:Math.round(ae),profit:Math.round(p-ae),minimum:minTarget};});
  },[monthly,mrr,minTarget]);

  const cats = useMemo(()=>{
    const map={};finances.filter(f=>f.type==='income').forEach(f=>{const c=f.category||'Other';map[c]=(map[c]||0)+(Number(f.amount)||0);});
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[finances]);

  const tt={background:'#0f172a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',color:'#e2e8f0',fontSize:'11px'};

  return (
    <div className="section">
      {/* Emotion Meter */}
      <div className="emotion-card" style={{background:emotion.bg,border:`1px solid ${emotion.color}30`}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.875rem',padding:'1rem',cursor:'pointer'}} onClick={()=>setMeterOpen(!meterOpen)}>
          <span style={{fontSize:'30px',animation:'float 3s ease-in-out infinite'}}>{emotion.emoji}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:'15px',color:emotion.color}}>{emotion.label}</div>
            <div style={{fontSize:'12px',color:'var(--mist-1)'}}>{emotion.desc}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
            {EMOTION_LEVELS.map((e,i)=>(
              <div key={i} style={{width:7,height:7,borderRadius:'50%',background:i<=emotionIdx?e.color:'rgba(255,255,255,0.1)',opacity:i===emotionIdx?1:0.4,transition:'all 0.3s'}}/>
            ))}
            <span style={{color:'var(--mist-2)',marginLeft:'0.25rem'}}>{meterOpen?<Icons.chevUp size={13}/>:<Icons.chevDown size={13}/>}</span>
          </div>
        </div>
        {meterOpen && (
          <div style={{padding:'0 1rem 1rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{height:'7px',borderRadius:'99px',background:'linear-gradient(90deg,#3b82f6,#10b981,#f59e0b,#f97316,#ef4444)',marginBottom:'0.5rem',marginTop:'0.75rem',position:'relative'}}>
              <div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:`${Math.max(2,Math.min(96,(emotionIdx/4)*100))}%`,width:'11px',height:'11px',borderRadius:'50%',background:'white',border:`2px solid ${emotion.color}`,boxShadow:`0 0 6px ${emotion.color}`,transition:'left 0.5s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.75rem'}}>
              <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'#3b82f6'}}>Thriving</span>
              <span style={{fontFamily:'var(--fm)',fontSize:'9px',color:'#ff6040'}}>Danger</span>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)'}}>Level {level} target</span>
                <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:emotion.color}}>J${minTarget.toLocaleString()}/mo</span>
              </div>
              <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,minTarget>0?(mrr/minTarget)*100:0)}%`,background:emotion.color,borderRadius:'99px',transition:'width 0.6s'}}/>
              </div>
              <div style={{fontSize:'11px',color:'var(--mist-2)',marginTop:'4px'}}>MRR J${mrr.toLocaleString()} vs J${minTarget.toLocaleString()}/mo target</div>
            </div>
          </div>
        )}
      </div>

      <div className="hero">
        <div className="hero-eye">Finance</div>
        <div className="hero-big" style={{color:profit>=0?'#1adb8a':'#ff6040'}}>J${profit.toLocaleString()}</div>
        <div className="hero-sub">Net profit · J${totalIncome.toLocaleString()} in · J${totalExpenses.toLocaleString()} out{mrr>0?` · MRR J${mrr.toLocaleString()}`:''}</div>
      </div>

      <div className="grid-2">
        <StatCard label="Income"   value={`J$${totalIncome.toLocaleString()}`}   icon={Icons.dollar}   color="var(--horizon)"/>
        <StatCard label="Expenses" value={`J$${totalExpenses.toLocaleString()}`} icon={Icons.dollar}   color="var(--fire)"/>
        <StatCard label="MRR"      value={`J$${mrr.toLocaleString()}`}           icon={Icons.trend}    color="var(--mist-2)"/>
        <StatCard label="6M Proj." value={`J$${proj.reduce((s,p)=>s+p.profit,0).toLocaleString()}`} icon={Icons.barChart} color="var(--horizon)"/>
      </div>

      <div className="tab-row">
        {['overview','projection','breakdown'].map(t=>(
          <button key={t} className={`tab-btn ${report===t?'active':''}`} onClick={()=>setReport(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {report==='overview' && monthly.length>0 && (
        <div className="card fade-in">
          <div className="card-label">Monthly</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly.slice(-6)} margin={{left:0,right:4,top:4,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="month" tick={{fill:'#4a5568',fontSize:9}}/>
              <YAxis tick={{fill:'#4a5568',fontSize:9}} width={46}/>
              <Tooltip contentStyle={tt}/>
              <Legend wrapperStyle={{fontSize:'10px',color:'#64748b'}}/>
              <Bar dataKey="income" fill="#10b981" radius={[3,3,0,0]} name="Income"/>
              <Bar dataKey="expenses" fill="#ef4444" radius={[3,3,0,0]} name="Expenses"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {report==='projection' && (
        <div className="card fade-in">
          <div className="card-label">6-Month Projection</div>
          <div style={{fontSize:'11px',color:'var(--mist-2)',marginBottom:'0.75rem'}}>Based on last 3 months avg + MRR. Dashed = min target.</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={proj} margin={{left:0,right:4,top:4,bottom:0}}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="month" tick={{fill:'#4a5568',fontSize:9}}/>
              <YAxis tick={{fill:'#4a5568',fontSize:9}} width={46}/>
              <Tooltip contentStyle={tt}/>
              <Legend wrapperStyle={{fontSize:'10px',color:'#64748b'}}/>
              <Area type="monotone" dataKey="projected" stroke="#10b981" fill="url(#g1)" name="Income" strokeWidth={2}/>
              <Area type="monotone" dataKey="profit"    stroke="#8b5cf6" fill="url(#g2)" name="Profit" strokeWidth={2}/>
              <Area type="monotone" dataKey="minimum"   stroke="#f59e0b" fill="none" name="Min Target" strokeWidth={1} strokeDasharray="4 3"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {report==='breakdown' && (
        <div className="card fade-in">
          <div className="card-label">Income by Category</div>
          {cats.length===0 ? <Empty text="No income yet."/> : cats.map(c=>{
            const pct=totalIncome>0?(c.value/totalIncome)*100:0;
            return (
              <div key={c.name} style={{marginBottom:'0.75rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontWeight:600,fontSize:'13px'}}>{c.name}</span>
                  <span style={{fontFamily:'var(--fm)',fontSize:'11px',color:'#1adb8a'}}>J${c.value.toLocaleString()} ({Math.round(pct)}%)</span>
                </div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'#1adb8a',borderRadius:'99px'}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
        <div className="tab-row" style={{flex:1}}>
          {['all','income','expense'].map(t=>(
            <button key={t} className={`tab-btn ${filter===t?'active':''}`} onClick={()=>setFilter(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <button className="btn-primary icon-only" onClick={()=>setForm({})}><Icons.plus size={16}/></button>
      </div>

      {filtered.length===0 ? <Empty text="No transactions yet."/> : (
        <div className="list">
          {filtered.map(f=>(
            <div key={f.id} className="card fade-in" style={{display:'flex',alignItems:'center',gap:'0.625rem',padding:'0.875rem 1rem'}}>
              <div style={{width:'3px',alignSelf:'stretch',borderRadius:'2px',flexShrink:0,minHeight:'28px',background:f.type==='income'?'#1adb8a':'#ff6040'}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:'13.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.description}</div>
                <div style={{fontSize:'11px',color:'var(--mist-2)',fontFamily:'var(--fm)'}}>{f.category}{f.paymentStage?` · ${f.paymentStage}`:''} · {f.date}{f.pipelineLeadId?<span style={{color:'#7b6cf5'}}> · linked</span>:''}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexShrink:0}}>
                <div style={{fontFamily:'var(--fm)',fontWeight:700,fontSize:'13px',color:f.type==='income'?'#1adb8a':'#ff6040',whiteSpace:'nowrap'}}><span style={{color:f.type==='income'?'#1adb8a':'#ff6040'}}>{f.type==='income'?'+':'-'}J${Number(f.amount).toLocaleString()}</span></div>
                <button className="icon-btn" onClick={()=>setForm(f)}><Icons.edit size={12}/></button>
                <button className="icon-btn danger-btn" onClick={()=>onDelete(f.id)}><Icons.trash size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form!==null && <FinanceModal data={form} onSave={d=>{d.id?onUpdate(d.id,d):onAdd(d);setForm(null);}} onClose={()=>setForm(null)}/>}
    </div>
  );
}

function FinanceModal({data,onSave,onClose}) {
  const [f,setF]=useState({type:'income',description:'',amount:'',category:INCOME_CATS[0],date:new Date().toISOString().slice(0,10),...data});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const cats=f.type==='income'?INCOME_CATS:EXPENSE_CATS;
  return (
    <Modal title={data.id?'Edit Transaction':'New Transaction'} onClose={onClose}>
      <div className="tab-row" style={{marginBottom:'0.25rem'}}>
        <button className={`tab-btn ${f.type==='income'?'active':''}`} onClick={()=>s('type','income')}>Income</button>
        <button className={`tab-btn ${f.type==='expense'?'active':''}`} onClick={()=>s('type','expense')}>Expense</button>
      </div>
      <Field label="Description"><input className="input" value={f.description} onChange={e=>s('description',e.target.value)} placeholder="e.g. D&D Wholesale"/></Field>
      <div className="grid-2">
        <Field label="Amount (JMD)"><input className="input" type="number" value={f.amount} onChange={e=>s('amount',e.target.value)} placeholder="45000"/></Field>
        <Field label="Category"><select className="input" value={f.category} onChange={e=>s('category',e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Date"><input className="input" type="date" value={f.date} onChange={e=>s('date',e.target.value)}/></Field>
      <ModalFoot onClose={onClose} onSave={()=>f.description.trim()&&f.amount&&onSave(f)}/>
    </Modal>
  );
}

// ─── GOALS ────────────────────────────────────────────────────────────────────
function Goals({goals,onAdd,onUpdate,onDelete}) {
  const [form,setForm]=useState(null);
  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Goals</div>
        <div className="hero-big">Level Up</div>
        <div className="hero-sub">20 blocks. Fill them. Become him.</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:700,fontSize:'15px'}}>{goals.length} Goals</span>
        <button className="btn-primary" onClick={()=>setForm({})}><Icons.plus size={14}/> New</button>
      </div>
      {goals.length===0 ? <Empty text="No goals set. What do you want to become?"/> : (
        <div className="list">
          {goals.map(g=>{
            const pct=Math.min(100,Math.round(((Number(g.current)||0)/(Number(g.target)||1))*100));
            const lv=Math.floor(pct/5);
            return (
              <div key={g.id} className="card fade-in">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.625rem',gap:'0.75rem'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'14.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.title}</div>
                    <div style={{fontSize:'11px',color:'var(--mist-2)',marginTop:'2px'}}>{g.category}{g.dueDate?` · Due ${g.dueDate}`:''}</div>
                  </div>
                  <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                    <button className="icon-btn" onClick={()=>setForm(g)}><Icons.edit size={12}/></button>
                    <button className="icon-btn danger-btn" onClick={()=>onDelete(g.id)}><Icons.trash size={12}/></button>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.25rem'}}>
                  <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'#1adb8a',fontWeight:700}}>Level {lv}/20</span>
                  <span style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)'}}>{g.current||0}/{g.target||0} {g.unit||''}</span>
                </div>
                <div style={{display:'flex',gap:'3px',marginBottom:'0.5rem'}}>
                  {Array.from({length:20},(_,i)=>(
                    <div key={i} style={{flex:1,height:'5px',borderRadius:'2px',background:i<lv?(i===lv-1?'#1adb8a':'rgba(201,168,76,0.3)'):'rgba(255,255,255,0.06)',boxShadow:i===lv-1?'0 0 4px var(--horizon)':'none',transition:'all 0.3s'}}/>
                  ))}
                </div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,rgba(201,168,76,0.6),var(--horizon))',borderRadius:'99px',boxShadow:'0 0 4px rgba(201,168,76,0.4)',transition:'width 0.6s'}}/>
                </div>
                <div style={{fontFamily:'var(--fm)',fontSize:'10px',color:'var(--mist-2)',marginTop:'4px'}}>{pct}% complete</div>
                {g.notes && <div style={{fontSize:'12px',color:'var(--mist-2)',marginTop:'0.5rem',fontStyle:'italic'}}>{g.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
      {form!==null && <GoalModal data={form} onSave={d=>{d.id?onUpdate(d.id,d):onAdd(d);setForm(null);}} onClose={()=>setForm(null)}/>}
    </div>
  );
}

function GoalModal({data,onSave,onClose}) {
  const [f,setF]=useState({title:'',category:GOAL_CATS[0],target:'',current:'',unit:'',dueDate:'',notes:'',...data});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <Modal title={data.id?'Edit Goal':'New Goal'} onClose={onClose}>
      <Field label="Goal Title"><input className="input" value={f.title} onChange={e=>s('title',e.target.value)} placeholder="e.g. 10 retainer clients"/></Field>
      <div className="grid-2">
        <Field label="Category"><select className="input" value={f.category} onChange={e=>s('category',e.target.value)}>{GOAL_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Unit"><input className="input" value={f.unit} onChange={e=>s('unit',e.target.value)} placeholder="clients, JMD…"/></Field>
      </div>
      <div className="grid-2">
        <Field label="Target"><input className="input" type="number" value={f.target} onChange={e=>s('target',e.target.value)} placeholder="10"/></Field>
        <Field label="Current"><input className="input" type="number" value={f.current} onChange={e=>s('current',e.target.value)} placeholder="1"/></Field>
      </div>
      <Field label="Due Date"><input className="input" type="date" value={f.dueDate} onChange={e=>s('dueDate',e.target.value)}/></Field>
      <Field label="Notes"><textarea className="input" style={{resize:'vertical',minHeight:'64px'}} value={f.notes} onChange={e=>s('notes',e.target.value)}/></Field>
      <ModalFoot onClose={onClose} onSave={()=>f.title.trim()&&onSave(f)}/>
    </Modal>
  );
}

// ─── JAXON DASHBOARD ──────────────────────────────────────────────────────────
function JaxonDashboard({queue,logs,briefings,todayStr,onApprove,onReject}) {
  const [tab,setTab] = useState('queue');
  const pending  = queue.filter(q=>q.status==='pending').sort((a,b)=>({high:0,medium:1,low:2}[a.priority]||1)-({high:0,medium:1,low:2}[b.priority]||1));
  const approved = queue.filter(q=>q.status==='approved');
  const executed = queue.filter(q=>q.status==='executed');
  const todayBriefing = briefings.find(b=>b.date===todayStr);
  const latestLog = logs[0];

  const AL = {
    ADD_LEAD:'Add Lead', UPDATE_LEAD:'Update Lead',
    MARK_LEAD_DEAD:'Mark Dead', ADD_FINANCE_ENTRY:'Log Transaction', ADD_TODO:'Add Task'
  };

  const PRIORITY_STYLE = {
    high:   { color:'#ff6040', border:'rgba(255,96,64,0.3)',  bg:'rgba(255,96,64,0.07)'  },
    medium: { color:'#f0c060', border:'rgba(240,192,96,0.3)', bg:'rgba(240,192,96,0.07)' },
    low:    { color:'#3a4860', border:'rgba(58,72,96,0.3)',   bg:'rgba(58,72,96,0.07)'   },
  };

  return (
    <div className="section">

      {/* COMMAND HEADER */}
      <div style={{
        position:'relative', overflow:'hidden',
        background:'linear-gradient(160deg, rgba(0,24,36,0.95) 0%, rgba(0,61,92,0.3) 50%, rgba(26,16,53,0.4) 100%)',
        border:'1px solid rgba(0,212,255,0.15)',
        borderRadius:14, padding:'1.5rem 1.25rem',
      }}>
        {/* Corner lightning */}
        <div style={{position:'absolute',top:0,right:0,width:120,height:120,
          background:'radial-gradient(circle at 100% 0%, rgba(0,212,255,0.12) 0%, transparent 70%)',
          pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:0,left:0,width:80,height:80,
          background:'radial-gradient(circle at 0% 100%, rgba(68,85,255,0.1) 0%, transparent 70%)',
          pointerEvents:'none'}}/>
        {/* Top line */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,
          background:'linear-gradient(90deg, transparent, rgba(0,136,200,0.5), rgba(0,212,255,0.8), rgba(64,232,255,0.4), transparent)'}}/>

        <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,letterSpacing:'0.3em',
          textTransform:'uppercase',color:'var(--bolt)',opacity:0.6,marginBottom:'0.5rem',
          textShadow:'0 0 8px rgba(0,212,255,0.5)'}}>
          JAXON Intelligence
        </div>
        <div style={{fontFamily:'var(--fe)',fontSize:'32px',fontWeight:600,
          letterSpacing:'-0.01em',lineHeight:1.05,marginBottom:'0.5rem',
          color:'var(--bolt-white)',
          textShadow:'0 0 30px rgba(0,212,255,0.3), 0 0 60px rgba(0,212,255,0.1)'}}>
          Second Brain
        </div>
        <div style={{display:'flex',gap:'1.25rem',flexWrap:'wrap'}}>
          {[
            {label:'Pending',  value:pending.length,  color:'var(--bolt)',    glow:'rgba(0,212,255,0.5)'},
            {label:'Approved', value:approved.length, color:'var(--valley)',  glow:'rgba(26,219,138,0.4)'},
            {label:'Executed', value:executed.length, color:'var(--steel)',   glow:'rgba(68,136,204,0.4)'},
          ].map(s => (
            <div key={s.label}>
              <div style={{fontFamily:'var(--fe)',fontSize:'26px',fontWeight:700,
                color:s.color,lineHeight:1,
                textShadow:`0 0 16px ${s.glow}, 0 0 32px ${s.glow}`}}>
                {s.value}
              </div>
              <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,
                letterSpacing:'0.15em',textTransform:'uppercase',
                color:'var(--mist-3)',marginTop:2}}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BRIEFING — if today */}
      {todayBriefing && (
        <div className="fade-in" style={{
          position:'relative',overflow:'hidden',
          background:'linear-gradient(135deg, rgba(0,95,138,0.12), rgba(0,24,36,0.8))',
          border:'1px solid rgba(0,170,238,0.2)',
          borderLeft:'3px solid var(--bolt)',
          borderRadius:10, padding:'1.125rem',
        }}>
          <div style={{position:'absolute',top:0,right:0,width:100,height:100,
            background:'radial-gradient(circle at 100% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)',
            pointerEvents:'none'}}/>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.625rem'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'var(--bolt)',
              boxShadow:'0 0 8px rgba(0,212,255,0.8)',animation:'blink 1.5s ease-in-out infinite'}}/>
            <span style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,
              letterSpacing:'0.25em',textTransform:'uppercase',
              color:'var(--bolt-lt)',opacity:0.8}}>
              Morning Briefing — {todayStr}
            </span>
          </div>
          <div style={{fontSize:'13px',lineHeight:'1.75',color:'var(--mist-1)',
            whiteSpace:'pre-line',fontWeight:300}}>
            {todayBriefing.content}
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{display:'flex',gap:'2px',background:'rgba(0,24,36,0.6)',
        border:'1px solid rgba(0,212,255,0.08)',borderRadius:8,padding:3}}>
        {[
          {id:'queue',    label:`Queue`,    count:pending.length},
          {id:'approved', label:`Approved`, count:approved.length},
          {id:'log',      label:'Log',      count:null},
        ].map(t => (
          <button key={t.id}
            onClick={()=>setTab(t.id)}
            style={{
              flex:1, padding:'0.4rem 0.5rem', border:'none',
              background: tab===t.id ? 'rgba(0,136,200,0.15)' : 'none',
              borderRadius:5, cursor:'pointer',
              fontFamily:'var(--fs)', fontSize:'11.5px', fontWeight:400,
              color: tab===t.id ? 'var(--bolt-lt)' : 'var(--mist-3)',
              transition:'all 0.2s',
              boxShadow: tab===t.id ? '0 0 10px rgba(0,212,255,0.1)' : 'none',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'0.375rem',
            }}>
            {t.label}
            {t.count !== null && (
              <span style={{
                fontFamily:'var(--fm)',fontSize:'9px',
                background: t.count > 0 && tab===t.id ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)',
                color: t.count > 0 && tab===t.id ? 'var(--bolt)' : 'var(--mist-3)',
                borderRadius:99, padding:'0.1rem 0.45rem',
                border: t.count > 0 && tab===t.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                boxShadow: t.count > 0 && tab===t.id ? '0 0 6px rgba(0,212,255,0.2)' : 'none',
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* QUEUE TAB */}
      {tab==='queue' && (
        pending.length===0 ? (
          <div style={{
            textAlign:'center', padding:'3rem 1.5rem',
            background:'rgba(0,24,36,0.5)', border:'1px solid rgba(0,212,255,0.06)',
            borderRadius:14,
          }}>
            <div style={{fontSize:'32px',marginBottom:'0.75rem',
              filter:'drop-shadow(0 0 12px rgba(0,212,255,0.4))'}}>⚡</div>
            <div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,
              color:'var(--bolt-lt)',marginBottom:'0.375rem'}}>Clear horizon</div>
            <div style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:300,
              color:'var(--mist-3)',letterSpacing:'0.06em'}}>
              JAXON is scanning for opportunities
            </div>
          </div>
        ) : (
          <div className="list">
            {pending.map(item => {
              const ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.low;
              return (
                <div key={item.id} className="fade-in" style={{
                  background:'rgba(7,13,24,0.85)',
                  border:`1px solid rgba(0,212,255,0.08)`,
                  borderLeft:`3px solid ${ps.color}`,
                  borderRadius:12, padding:'1rem',
                  backdropFilter:'blur(8px)',
                  boxShadow:`0 0 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(0,212,255,0.06)`,
                }}>
                  {/* Header row */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.625rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                      <div style={{fontFamily:'var(--fm)',fontSize:'9.5px',fontWeight:500,
                        color:'var(--bolt-lt)',letterSpacing:'0.08em',
                        textShadow:'0 0 8px rgba(64,232,255,0.4)'}}>
                        {AL[item.action]||item.action}
                      </div>
                    </div>
                    <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,
                      color:ps.color, background:ps.bg,
                      border:`1px solid ${ps.border}`,
                      borderRadius:99, padding:'0.15rem 0.5rem',
                      textTransform:'uppercase',letterSpacing:'0.08em',
                      boxShadow:`0 0 6px ${ps.bg}`}}>
                      {item.priority}
                    </div>
                  </div>

                  {/* Business name */}
                  {item.data?.businessName && (
                    <div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:600,
                      letterSpacing:'0.01em',marginBottom:'0.375rem',
                      color:'var(--mist-0)'}}>
                      {item.data.businessName}
                    </div>
                  )}

                  {/* JAXON reasoning */}
                  <div style={{fontSize:'12.5px',fontWeight:300,color:'var(--mist-2)',
                    lineHeight:1.65,marginBottom:'0.75rem'}}>
                    <span style={{fontFamily:'var(--fm)',fontSize:'8.5px',
                      color:'var(--bolt)',opacity:0.7,letterSpacing:'0.1em',
                      marginRight:'0.5rem'}}>JAXON</span>
                    {item.reasoning}
                  </div>

                  {/* Draft message */}
                  {item.data?.outreachDraft && (
                    <div style={{
                      background:'rgba(0,95,138,0.1)',
                      borderLeft:'2px solid rgba(0,136,200,0.4)',
                      borderRadius:'0 6px 6px 0',
                      padding:'0.625rem 0.75rem', marginBottom:'0.75rem',
                    }}>
                      <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:400,
                        color:'var(--bolt-4)',letterSpacing:'0.2em',
                        textTransform:'uppercase',marginBottom:'6px',opacity:0.8}}>
                        Draft Message
                      </div>
                      <div style={{fontSize:'12px',fontWeight:300,color:'var(--mist-1)',lineHeight:1.6}}>
                        {item.data.outreachDraft}
                      </div>
                    </div>
                  )}

                  {/* Value */}
                  {item.data?.value && (
                    <div style={{display:'flex',gap:'1rem',marginBottom:'0.75rem',
                      flexWrap:'wrap'}}>
                      <div style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:500,
                        color:'var(--valley)',
                        textShadow:'0 0 8px rgba(26,219,138,0.4)'}}>
                        J${Number(item.data.value).toLocaleString()}
                      </div>
                      {item.data.retainerAmount && (
                        <div style={{fontFamily:'var(--fm)',fontSize:'11px',fontWeight:400,
                          color:'var(--horizon)',opacity:0.8}}>
                          +J${Number(item.data.retainerAmount).toLocaleString()}/mo
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{display:'flex',gap:'0.5rem'}}>
                    <button style={{
                      flex:1, padding:'0.55rem', border:'1.5px solid var(--bolt-3)',
                      background:'rgba(0,95,138,0.15)', borderRadius:6, cursor:'pointer',
                      fontFamily:'var(--fs)', fontSize:'12.5px', fontWeight:600,
                      color:'var(--bolt-lt)',
                      boxShadow:'0 0 12px rgba(0,136,200,0.15)',
                      transition:'all 0.2s',
                    }} onClick={()=>onApprove(item.id)}>
                      ✓ Approve
                    </button>
                    <button style={{
                      flex:1, padding:'0.55rem', border:'1px solid rgba(255,96,64,0.2)',
                      background:'rgba(255,96,64,0.05)', borderRadius:6, cursor:'pointer',
                      fontFamily:'var(--fs)', fontSize:'12.5px', fontWeight:400,
                      color:'var(--fire)', transition:'all 0.2s',
                    }} onClick={()=>onReject(item.id)}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* APPROVED TAB */}
      {tab==='approved' && (
        <div className="list">
          {approved.length===0 ? (
            <div style={{textAlign:'center',padding:'2.5rem 1rem'}}>
              <div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:400,
                color:'var(--mist-3)',fontStyle:'italic'}}>Nothing approved yet</div>
            </div>
          ) : approved.map(item => (
            <div key={item.id} className="fade-in" style={{
              background:'rgba(0,95,138,0.07)',
              border:'1px solid rgba(0,136,200,0.15)',
              borderRadius:10, padding:'0.875rem 1rem',
              display:'flex',alignItems:'center',gap:'0.75rem',
            }}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--valley)',
                boxShadow:'0 0 8px rgba(26,219,138,0.6)',flexShrink:0}}/>
              <div>
                <div style={{fontFamily:'var(--fm)',fontSize:'8.5px',fontWeight:300,
                  color:'var(--valley)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>
                  Approved — executes next run
                </div>
                <div style={{fontSize:'13.5px',fontWeight:400,color:'var(--mist-1)'}}>
                  {AL[item.action]} — {item.data?.businessName||item.action}
                </div>
              </div>
            </div>
          ))}
          {executed.length > 0 && (
            <>
              <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,
                letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--mist-4)',
                padding:'0.25rem 0'}}>
                Executed
              </div>
              {executed.map(item => (
                <div key={item.id} className="fade-in" style={{
                  background:'rgba(0,24,36,0.5)',
                  border:'1px solid rgba(255,255,255,0.04)',
                  borderRadius:10, padding:'0.875rem 1rem',
                  display:'flex',alignItems:'center',gap:'0.75rem', opacity:0.5,
                }}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'var(--mist-3)',flexShrink:0}}/>
                  <div style={{fontSize:'13.5px',fontWeight:400,color:'var(--mist-2)'}}>
                    {AL[item.action]} — {item.data?.businessName||item.action}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* LOG TAB */}
      {tab==='log' && (
        !latestLog ? (
          <div style={{textAlign:'center',padding:'3rem 1rem'}}>
            <div style={{fontFamily:'var(--fe)',fontSize:'18px',fontWeight:400,
              fontStyle:'italic',color:'var(--mist-3)'}}>
              First log at midnight
            </div>
          </div>
        ) : (
          <div className="fade-in" style={{
            background:'rgba(0,24,36,0.7)',
            border:'1px solid rgba(0,136,200,0.15)',
            borderTop:'2px solid var(--bolt-3)',
            borderRadius:12, padding:'1.125rem',
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.875rem'}}>
              <div style={{fontFamily:'var(--fe)',fontSize:'16px',fontWeight:600,
                color:'var(--bolt-lt)'}}>
                Daily Log — {latestLog.date}
              </div>
            </div>
            {latestLog.stats && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',
                gap:'0.5rem',marginBottom:'1rem'}}>
                {[
                  {l:'Queued',   v:latestLog.stats.actionsQueued, c:'var(--bolt)',   g:'rgba(0,212,255,0.5)'},
                  {l:'Approved', v:latestLog.stats.approved,      c:'var(--valley)', g:'rgba(26,219,138,0.5)'},
                  {l:'Rejected', v:latestLog.stats.rejected,      c:'var(--fire)',   g:'rgba(255,96,64,0.5)'},
                ].map(s => (
                  <div key={s.l} style={{
                    background:'rgba(0,0,0,0.3)', borderRadius:8, padding:'0.625rem',
                    textAlign:'center', border:'1px solid rgba(0,212,255,0.06)',
                  }}>
                    <div style={{fontFamily:'var(--fe)',fontSize:'24px',fontWeight:700,
                      color:s.c, lineHeight:1, textShadow:`0 0 14px ${s.g}`}}>
                      {s.v}
                    </div>
                    <div style={{fontFamily:'var(--fm)',fontSize:'8px',fontWeight:300,
                      color:'var(--mist-3)',letterSpacing:'0.15em',
                      textTransform:'uppercase',marginTop:3}}>
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{fontSize:'13px',fontWeight:300,lineHeight:1.8,
              color:'var(--mist-1)',whiteSpace:'pre-line'}}>
              {latestLog.content}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ─── JAXON FLOATING ───────────────────────────────────────────────────────────
function JaxonFloat({leads,habits,finances,goals,todos,schedule,totalIncome,totalExpenses,profit,xp,level,todayStr,paidLeads,openLeads}) {
  const [open,setOpen]           = useState(false);
  const [messages,setMessages]   = useState([]);
  const [input,setInput]         = useState('');
  const [loading,setLoading]     = useState(false);
  const [initialized,setInit]    = useState(false);
  const bottomRef = useRef(null);

  const send = async (msg) => {
    if (!msg.trim()||loading) return;
    const um={role:'user',content:msg.trim()};
    const nm=[...messages,um];
    setMessages(nm); setInput(''); setLoading(true);
    try {
      const r=await fetch('https://jaxon-rctv.onrender.com/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:nm.map(m=>({role:m.role,content:m.content}))})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||'Failed');
      setMessages(p=>[...p,{role:'assistant',content:d.reply}]);
    } catch { setMessages(p=>[...p,{role:'assistant',content:'Connection error. Try again.'}]); }
    finally { setLoading(false); }
  };

  useEffect(()=>{
    if(!open||initialized) return; setInit(true);
    const today=new Date(); const h=today.getHours();
    const g=h<12?'Morning':h<17?'Afternoon':'Evening';
    const habitsLeft=habits.filter(hb=>!hb.completions?.[todayStr]).length;
    const tTasks=todos.filter(t=>t.addedDate===todayStr);
    const done=tTasks.filter(t=>t.doneOn?.[todayStr]).length;
    const overdue=leads.filter(l=>{if(!l.retainerDueDay)return false;const tm=new Date(today.getFullYear(),today.getMonth(),parseInt(l.retainerDueDay));return Math.ceil((tm-today)/86400000)<0;});
    const parts=[`${g}, Jadan. JAXON online.\n`];
    if(profit<0) parts.push(`⚠️ Profit negative at J$${profit.toLocaleString()}.`);
    else if(profit>0) parts.push(`📈 J$${profit.toLocaleString()} profit. Keep going.`);
    if(overdue.length>0) parts.push(`🚨 ${overdue.map(l=>l.businessName).join(', ')} — retainer overdue.`);
    if(openLeads.length>0) parts.push(`${openLeads.length} leads need closing.`);
    if(habitsLeft>0) parts.push(`${habitsLeft} habits undone.`);
    if(tTasks.length===0) parts.push(`No tasks added yet.`);
    else if(done<tTasks.length) parts.push(`${done}/${tTasks.length} tasks done.`);
    parts.push(`\nWhat do you need?`);
    setMessages([{role:'assistant',content:parts.join(' ')}]);
  },[open]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages,loading]);

  const quick=["What should I focus on?","How's my business doing?","Help me close open leads","Daily action plan"];

  return (
    <>
      <button className={`fab ${open?'fab-open':''}`} onClick={()=>setOpen(o=>!o)}>
        {open ? <Icons.close size={22}/> : <Icons.bot size={22}/>}
        {!open&&messages.length===0 && <span className="fab-pip"/>}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <div className="chat-avatar"><Icons.bot size={15}/></div>
            <div>
              <div className="chat-name">JAXON</div>
              <div className="chat-status"><span className="chat-dot"/>Always on</div>
            </div>
            <button className="icon-btn" style={{marginLeft:'auto'}} onClick={()=>setOpen(false)}><Icons.close size={14}/></button>
          </div>
          <div className="chat-msgs">
            {messages.map((m,i)=>(
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role==='assistant'&&<div className="chat-msg-av"><Icons.bot size={11}/></div>}
                <div className={`chat-bubble ${m.role}`}>
                  {m.content.split('\n').map((line,j,arr)=><React.Fragment key={j}>{line}{j<arr.length-1&&<br/>}</React.Fragment>)}
                </div>
              </div>
            ))}
            {loading&&(
              <div className="chat-msg assistant">
                <div className="chat-msg-av"><Icons.bot size={11}/></div>
                <div className="chat-bubble assistant chat-typing"><span/><span/><span/></div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          {messages.length<=1&&!loading&&(
            <div className="chat-quick">
              {quick.map((p,i)=><button key={i} className="quick-btn" onClick={()=>send(p)}>{p}</button>)}
            </div>
          )}
          <div className="chat-input-row">
            <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(input)} placeholder="Ask JAXON…" disabled={loading}/>
            <button className="chat-send" onClick={()=>send(input)} disabled={loading||!input.trim()}>
              {loading?<span style={{display:'inline-block',animation:'spin 0.8s linear infinite'}}><Icons.loader size={14}/></span>:<Icons.send size={14}/>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}


// ─── INVOICE GENERATOR ───────────────────────────────────────────────────────
function InvoiceGenerator({leads,finances,onClose,initialData=null}) {
  const nextNum = () => {
    const existing = finances.filter(f=>f.invoiceNumber).map(f=>parseInt(f.invoiceNumber?.replace(/\D/g,'')||0));
    const max = existing.length>0 ? Math.max(...existing) : 1;
    return `INV-2026-${String(max+1).padStart(3,'0')}`;
  };

  const [inv,setInv] = useState({
    invoiceNumber: nextNum(),
    date: new Date().toISOString().slice(0,10),
    dueDate: '',
    status: 'PAYMENT DUE',
    clientName: initialData?.clientName||'',
    clientLocation: initialData?.clientLocation||'Kingston, Jamaica',
    services: initialData?.services||[{desc:'',amount:''}],
    notes: '',
    paymentMethod: 'Bank Transfer: Name: Jadan Spencer, Acc#: 504813584, Bank: NCB Perth Mandeville',
    ...initialData
  });

  const s = (k,v) => setInv(p=>({...p,[k]:v}));
  const total = inv.services.reduce((sum,sv)=>sum+(Number(sv.amount)||0),0);

  const addService = () => setInv(p=>({...p,services:[...p.services,{desc:'',amount:''}]}));
  const removeService = i => setInv(p=>({...p,services:p.services.filter((_,idx)=>idx!==i)}));
  const setService = (i,k,v) => setInv(p=>{
    const svs=[...p.services]; svs[i]={...svs[i],[k]:v}; return {...p,services:svs};
  });

  const generatePDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:24px; border-bottom:3px solid #0d9488; }
  .logo { width:80px; height:80px; object-fit:contain; }
  .company { text-align:right; }
  .company h1 { font-size:28px; font-weight:900; color:#0d9488; letter-spacing:-0.03em; }
  .company p { font-size:12px; color:#666; margin-top:4px; }
  .invoice-title { font-size:36px; font-weight:900; color:#1a1a2e; letter-spacing:-0.04em; margin-bottom:8px; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px; }
  .meta-block h3 { font-size:10px; text-transform:uppercase; letter-spacing:0.12em; color:#999; margin-bottom:8px; }
  .meta-block p { font-size:14px; font-weight:600; color:#1a1a2e; }
  .meta-block .sub { font-size:12px; color:#666; font-weight:400; }
  .badge { display:inline-block; padding:4px 12px; border-radius:99px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
  .badge-due { background:#fef3c7; color:#d97706; }
  .badge-paid { background:#d1fae5; color:#065f46; }
  table { width:100%; border-collapse:collapse; margin-bottom:32px; }
  th { background:#f8fafc; padding:12px 16px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#999; font-weight:700; }
  td { padding:14px 16px; border-bottom:1px solid #f1f5f9; font-size:14px; }
  td:last-child, th:last-child { text-align:right; }
  .total-row td { font-weight:800; font-size:16px; border-top:2px solid #0d9488; border-bottom:none; color:#0d9488; }
  .footer { margin-top:40px; padding-top:24px; border-top:1px solid #f1f5f9; }
  .payment { background:#f8fafc; border-radius:12px; padding:20px; margin-bottom:20px; }
  .payment h3 { font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#999; margin-bottom:8px; }
  .payment p { font-size:13px; color:#1a1a2e; }
  .thank-you { text-align:center; font-size:13px; color:#666; margin-top:24px; }
  .accent { color:#0d9488; font-weight:700; }
</style>
</head><body>
<div class="header">
  <div>
    <img src="${LOGO_B64}" class="logo" alt="JCommerce Logo"/>
  </div>
  <div class="company">
    <h1>JCommerce & Tech</h1>
    <p>Mandeville, Jamaica</p>
    <p>WhatsApp: (876) 817-0095</p>
  </div>
</div>

<div style="margin-bottom:32px;">
  <div class="invoice-title">INVOICE</div>
  <span class="badge ${inv.status==='PAID'?'badge-paid':'badge-due'}">${inv.status}</span>
</div>

<div class="meta-grid">
  <div>
    <div class="meta-block">
      <h3>Invoice Details</h3>
      <p>${inv.invoiceNumber}</p>
      <p class="sub">Date: ${inv.date}</p>
      ${inv.dueDate?`<p class="sub">Due: ${inv.dueDate}</p>`:'<p class="sub">Due: Upon Receipt</p>'}
    </div>
    <div class="meta-block" style="margin-top:20px;">
      <h3>Billed By</h3>
      <p>Jadan Spencer</p>
      <p class="sub">JCommerce & Tech</p>
      <p class="sub">Mandeville, Jamaica</p>
    </div>
  </div>
  <div>
    <div class="meta-block">
      <h3>Billed To</h3>
      <p>${inv.clientName||'Client Name'}</p>
      <p class="sub">${inv.clientLocation}</p>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr><th>Description</th><th>Amount</th></tr>
  </thead>
  <tbody>
    ${inv.services.map(sv=>`<tr><td>${sv.desc||'Service'}</td><td>JMD ${Number(sv.amount||0).toLocaleString()}.00</td></tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="total-row"><td>TOTAL DUE</td><td>JMD ${total.toLocaleString()}.00</td></tr>
  </tfoot>
</table>

<div class="footer">
  <div class="payment">
    <h3>Payment Methods</h3>
    <p>${inv.paymentMethod}</p>
  </div>
  ${inv.notes?`<div class="payment"><h3>Notes</h3><p>${inv.notes}</p></div>`:''}
  <div class="thank-you">
    Thank you for your business! Questions? Contact <span class="accent">Jadan Spencer</span> via WhatsApp <span class="accent">(876) 817-0095</span>
  </div>
</div>
</body></html>`;

    const blob = new Blob([html], {type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `JCommerce-${inv.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title="Invoice Generator" onClose={onClose}>
      <div className="grid-2">
        <Field label="Invoice #"><input className="input" value={inv.invoiceNumber} onChange={e=>s('invoiceNumber',e.target.value)}/></Field>
        <Field label="Status">
          <select className="input" value={inv.status} onChange={e=>s('status',e.target.value)}>
            <option>PAYMENT DUE</option><option>DEPOSIT DUE</option><option>PAID</option>
          </select>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Date"><input className="input" type="date" value={inv.date} onChange={e=>s('date',e.target.value)}/></Field>
        <Field label="Due Date"><input className="input" type="date" value={inv.dueDate} onChange={e=>s('dueDate',e.target.value)}/></Field>
      </div>
      <Field label="Client Name"><input className="input" value={inv.clientName} onChange={e=>s('clientName',e.target.value)} placeholder="e.g. D&D Wholesale"/></Field>
      <Field label="Client Location"><input className="input" value={inv.clientLocation} onChange={e=>s('clientLocation',e.target.value)} placeholder="Kingston, Jamaica"/></Field>

      <div>
        <div className="card-label">Services</div>
        {inv.services.map((sv,i)=>(
          <div key={i} style={{display:'flex',gap:'0.5rem',alignItems:'center',marginBottom:'0.5rem'}}>
            <input className="input" style={{flex:2}} value={sv.desc} onChange={e=>setService(i,'desc',e.target.value)} placeholder="Description"/>
            <input className="input" style={{flex:1}} type="number" value={sv.amount} onChange={e=>setService(i,'amount',e.target.value)} placeholder="Amount"/>
            {inv.services.length>1 && <button className="icon-btn danger-btn" onClick={()=>removeService(i)}><Icons.close size={12}/></button>}
          </div>
        ))}
        <button className="btn-ghost" style={{width:'100%',justifyContent:'center',marginTop:'0.25rem'}} onClick={addService}>
          <Icons.plus size={13}/> Add Line
        </button>
      </div>

      <div style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.15)',borderRadius:'var(--r2)',padding:'0.75rem',display:'flex',justifyContent:'space-between'}}>
        <span style={{fontFamily:'var(--fm)',fontSize:'12px',fontWeight:700}}>TOTAL</span>
        <span style={{fontFamily:'var(--fm)',fontSize:'14px',fontWeight:800,color:'#1adb8a'}}>J${total.toLocaleString()}</span>
      </div>

      <Field label="Notes (optional)"><textarea className="input" style={{minHeight:'56px',resize:'vertical'}} value={inv.notes} onChange={e=>s('notes',e.target.value)} placeholder="e.g. Balance due on delivery"/></Field>

      <button className="btn-primary" style={{width:'100%',justifyContent:'center',gap:'0.5rem'}} onClick={generatePDF}>
        📄 Download Invoice (HTML → print to PDF)
      </button>
      <div style={{fontSize:'11px',color:'var(--mist-2)',textAlign:'center'}}>
        Opens as HTML file — open in browser and Print → Save as PDF
      </div>
    </Modal>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({title,onClose,children}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-head">
          <span style={{fontFamily:'var(--fe)',fontWeight:800,fontSize:'15px'}}>{title}</span>
          <button className="icon-btn" onClick={onClose}><Icons.close size={15}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>{children}</div>
      </div>
    </div>
  );
}

function Field({label,children}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
      <label style={{fontFamily:'var(--fm)',fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--mist-2)'}}>{label}</label>
      {children}
    </div>
  );
}

function ModalFoot({onClose,onSave}) {
  return (
    <div style={{display:'flex',gap:'0.5rem',paddingTop:'0.25rem'}}>
      <button className="btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancel</button>
      <button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={onSave}>Save</button>
    </div>
  );
}

function Empty({text}) {
  return <div style={{textAlign:'center',padding:'2.5rem 1rem',color:'var(--mist-2)',fontSize:'13px',fontStyle:'italic'}}>{text}</div>;
}