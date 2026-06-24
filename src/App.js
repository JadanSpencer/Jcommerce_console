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
  loader:    () => <Icon d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />,
  bot:       () => <Icon d="M12 2a2 2 0 012 2v1h3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2zM9 11a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 16h6" />,
  barChart:  () => <Icon d="M18 20V10M12 20V4M6 20v-6" />,
  alert:     () => <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />,
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ['New','Contacted','Demo Sent','Negotiating','Paid','Flaked','Lost'];
const STATUS_COLOR = {
  New:'#94a3b8', Contacted:'#60a5fa', 'Demo Sent':'#fbbf24',
  Negotiating:'#f59e0b', Paid:'#34d399', Flaked:'#f87171', Lost:'#f87171'
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const EXPENSE_CATS = ['Hosting','AI API','Tools','Transport','Food','Education','Other'];
const INCOME_CATS = ['Setup Fee','First Deposit','Second Deposit','Monthly Retainer','Completion Fee','Freelance','Other'];
const GOAL_CATS = ['Revenue','Clients','Skills','Health','Personal'];
const BLOCK_COLORS = {
  Work:'#3b82f6', Coding:'#f59e0b', Outreach:'#10b981',
  University:'#8b5cf6', Rest:'#475569', Personal:'#f97316', Other:'#ef4444'
};
const PAYMENT_STAGES = ['First Deposit','Second Deposit','Completion Fee','Monthly Retainer'];

const EMOTION_LEVELS = [
  { emoji:'😎', label:'Thriving',   color:'#3b82f6', bg:'rgba(59,130,246,0.08)',  desc:'Ahead of target' },
  { emoji:'😊', label:'Good',       color:'#10b981', bg:'rgba(16,185,129,0.08)',  desc:'On track' },
  { emoji:'😐', label:'Watch Out',  color:'#f59e0b', bg:'rgba(245,158,11,0.08)',  desc:'Needs attention' },
  { emoji:'😟', label:'Struggling', color:'#f97316', bg:'rgba(249,115,22,0.08)',  desc:'Pull up your socks' },
  { emoji:'🚨', label:'Danger',     color:'#ef4444', bg:'rgba(239,68,68,0.08)',   desc:'Critical — act now' },
];

function calcEmotionLevel(finances, leads, xp, level) {
  const totalIncome   = finances.filter(f => f.type==='income').reduce((s,f) => s+(Number(f.amount)||0), 0);
  const totalExpenses = finances.filter(f => f.type==='expense').reduce((s,f) => s+(Number(f.amount)||0), 0);
  const profit = totalIncome - totalExpenses;
  const mrr = leads.filter(l => l.status==='Paid' && l.retainerAmount).reduce((s,l) => s+(Number(l.retainerAmount)||0), 0);
  const paidClients = leads.filter(l => l.status==='Paid').length;
  const hasRetainerSetup = leads.some(l => l.retainerAmount);
  const hasFinanceData = finances.length > 0;
  const minMonthlyTarget = level * 5000;
  let score = 65;
  if (hasFinanceData) { if (profit > 0) score += 12; else if (profit < 0) score -= 10; }
  if (hasRetainerSetup && minMonthlyTarget > 0) {
    const r = mrr / minMonthlyTarget;
    if (r >= 1.5) score += 18; else if (r >= 1) score += 10; else if (r >= 0.5) score -= 5; else score -= 8;
  }
  if (paidClients >= 5) score += 18; else if (paidClients >= 3) score += 12; else if (paidClients >= 1) score += 6;
  if (hasFinanceData && totalIncome > 0) {
    const er = totalExpenses/totalIncome;
    if (er < 0.3) score += 8; else if (er > 0.9) score -= 12;
  }
  if (xp > 1000) score += 5; else if (xp > 300) score += 3;
  score = Math.max(0, Math.min(100, score));
  if (score >= 78) return 0; if (score >= 62) return 1; if (score >= 45) return 2; if (score >= 28) return 3; return 4;
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
  const weekDates = getWeekDates();
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

      <header className="header">
        <div className="brand">
          <div className="brand-gem">J</div>
          <div>
            <div className="brand-name">JCommerce</div>
            <div className="brand-sub">Founder Console</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
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
                <div style={{fontFamily:'var(--f-display)',fontWeight:800,fontSize:'16px'}}>Morning Briefing</div>
                <div style={{fontSize:'11px',color:'var(--c-muted)',fontFamily:'var(--f-mono)'}}>{todayBriefing.date}</div>
              </div>
              <button className="icon-btn" onClick={() => setBriefingOpen(false)}><Icons.close size={16}/></button>
            </div>
            <div style={{fontSize:'13.5px',lineHeight:'1.8',color:'var(--c-secondary)',whiteSpace:'pre-line',overflowY:'auto',flex:1}}>
              {todayBriefing.content}
            </div>
          </div>
        </div>
      )}

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
        <StatCard label="Net Profit"    value={`J$${profit.toLocaleString()}`}    icon={Icons.trend}   color={profit>=0?'var(--c-mint)':'var(--c-rose)'} />
        <StatCard label="Paid Clients"  value={paidLeads.length}                    icon={Icons.users}   color="var(--c-blue)" />
        <StatCard label="Open Pipeline" value={openLeads.length}                    icon={Icons.target}  color="var(--c-gold)" />
        <StatCard label="Habits Today"  value={`${habitsToday}%`}                   icon={Icons.flame}   color="var(--c-orange)" />
      </div>

      {/* Today habits quick */}
      {habits.length > 0 && (
        <div className="card fade-in">
          <div className="card-label">Today's Habits</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {habits.map(h => (
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggleHabit(h,todayStr)} style={{color:h.completions?.[todayStr]?'var(--c-mint)':'var(--c-dim)',flexShrink:0}}>
                  {h.completions?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                </button>
                <span style={{flex:1,minWidth:0,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:h.completions?.[todayStr]?'var(--c-muted)':'var(--c-primary)',textDecoration:h.completions?.[todayStr]?'line-through':'none'}}>{h.name}</span>
                {h.completions?.[todayStr] && <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-mint)',flexShrink:0}}>+10</span>}
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
                <button className="check-btn" onClick={()=>onToggleTodo(t)} style={{color:t.doneOn?.[todayStr]?'var(--c-lavender)':'var(--c-dim)',flexShrink:0}}>
                  {t.doneOn?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                </button>
                <span style={{flex:1,minWidth:0,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--c-muted)':'var(--c-primary)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}>{t.title}</span>
                {t.doneOn?.[todayStr] && <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-lavender)',flexShrink:0}}>+5</span>}
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
function Pipeline({leads,finances,onAdd,onUpdate,onDelete,onLogPayment,onUpdatePayment}) {
  const [form,setForm]         = useState(null);
  const [payForm,setPayForm]   = useState(null);
  const [filter,setFilter]     = useState('All');
  const [expanded,setExpanded] = useState(null);
  const filtered = filter==='All' ? leads : leads.filter(l=>l.status===filter);
  const totalVal = leads.filter(l=>!['Flaked','Lost'].includes(l.status)).reduce((s,l)=>s+(Number(l.value)||0),0);
  const getPayments = lid => finances.filter(f=>f.pipelineLeadId===lid);
  const getAlert = lead => {
    if (!lead.retainerAmount || !lead.retainerDueDay) return null;
    const today = new Date(); const dueDay = parseInt(lead.retainerDueDay);
    const thisMonth = new Date(today.getFullYear(),today.getMonth(),dueDay);
    const nextMonth = new Date(today.getFullYear(),today.getMonth()+1,dueDay);
    const dT = Math.ceil((thisMonth-today)/86400000);
    const dN = Math.ceil((nextMonth-today)/86400000);
    const isOverdue = dT < 0 && Math.abs(dT) <= 5;
    return {daysUntil: isOverdue?dT:(dT>=0?dT:dN), isOverdue};
  };

  return (
    <div className="section">
      <div className="hero">
        <div className="hero-eye">Sales Pipeline</div>
        <div className="hero-big">J${totalVal.toLocaleString()}</div>
        <div className="hero-sub">{leads.filter(l=>l.status==='Paid').length} paid · {leads.filter(l=>!['Paid','Flaked','Lost'].includes(l.status)).length} open</div>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
        <div className="pill-row">
          {['All',...LEAD_STATUSES].map(s => (
            <button key={s} className={`pill ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn-primary icon-only" onClick={()=>setForm({})}><Icons.plus size={16}/></button>
      </div>

      {filtered.length===0 ? <Empty text="No leads here yet."/> : (
        <div className="list">
          {filtered.map(l => {
            const payments = getPayments(l.id);
            const received = payments.reduce((s,p)=>s+(Number(p.amount)||0),0);
            const total    = Number(l.value)||0;
            const remaining = total - received;
            const pct = total > 0 ? Math.min(100,(received/total)*100) : 0;
            const alert = getAlert(l);
            const isOpen = expanded===l.id;
            return (
              <div key={l.id} className="card lead-card fade-in">
                {/* Header */}
                <div className="lead-header" onClick={()=>setExpanded(isOpen?null:l.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap',marginBottom:'2px'}}>
                      <span style={{fontWeight:700,fontSize:'14.5px',letterSpacing:'-0.02em'}}>{l.businessName}</span>
                      <span className="badge" style={{background:`${STATUS_COLOR[l.status]}18`,color:STATUS_COLOR[l.status],border:`1px solid ${STATUS_COLOR[l.status]}28`}}>{l.status}</span>
                      {l.source==='JAXON Agent' && <span className="badge badge-ai">🤖 AI</span>}
                      {alert?.isOverdue && <span className="badge badge-danger">⚠ Overdue</span>}
                    </div>
                    <div style={{fontSize:'11px',color:'var(--c-muted)',fontFamily:'var(--f-mono)'}}>
                      {l.contactName||'No contact'}{l.nextActionDate ? ` · ${l.nextActionDate}` : ''}
                    </div>
                    {total > 0 && (
                      <div style={{marginTop:'5px',height:'2px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:remaining>0?'var(--c-gold)':'var(--c-mint)',borderRadius:'99px',transition:'width 0.5s'}}/>
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'0.375rem',flexShrink:0}}>
                    <span style={{fontFamily:'var(--f-mono)',fontWeight:700,fontSize:'12px',color:STATUS_COLOR[l.status]}}>
                      {l.value ? `J$${Number(l.value).toLocaleString()}` : '—'}
                    </span>
                    <span style={{color:'var(--c-muted)',transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>
                      <Icons.chevDown size={14}/>
                    </span>
                  </div>
                </div>

                {/* Drawer */}
                {isOpen && (
                  <div className="lead-drawer">
                    {(l.contactName||l.phone) && (
                      <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
                        {l.contactName && <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-secondary)'}}>👤 {l.contactName}</span>}
                        {l.phone && (
                          <div style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
                            <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-secondary)'}}>📞 {l.phone}</span>
                            <a href={`https://wa.me/${l.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="wa-btn" onClick={e=>e.stopPropagation()}>
                              <Icons.whatsapp size={13}/> WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {l.notes && <div className="notes-box">{l.notes}</div>}
                    {total > 0 && (
                      <div>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                          <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-muted)'}}>J${received.toLocaleString()} received</span>
                          <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',fontWeight:700,color:remaining>0?'var(--c-gold)':'var(--c-mint)'}}>
                            {remaining>0?`J$${remaining.toLocaleString()} due`:'✓ Fully paid'}
                          </span>
                        </div>
                        <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:remaining>0?'var(--c-gold)':'var(--c-mint)',borderRadius:'99px'}}/>
                        </div>
                      </div>
                    )}
                    {payments.length > 0 && (
                      <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                        {payments.map(p => (
                          <div key={p.id} style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                            <span style={{width:5,height:5,borderRadius:'50%',background:'var(--c-mint)',flexShrink:0,display:'inline-block'}}/>
                            <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-muted)'}}>{p.paymentStage} · J${Number(p.amount).toLocaleString()} · {p.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {l.outreachDraft && (
                      <div className="draft-box">
                        <div style={{fontFamily:'var(--f-mono)',fontSize:'9.5px',color:'var(--c-blue)',marginBottom:'4px',letterSpacing:'0.08em'}}>🤖 DRAFT MESSAGE</div>
                        <div style={{fontSize:'12px',color:'var(--c-secondary)',lineHeight:'1.6'}}>{l.outreachDraft}</div>
                      </div>
                    )}
                    {alert && (
                      <div className={`retainer-tag ${alert.isOverdue?'overdue':''}`}>
                        <Icons.bell size={11}/>
                        {alert.isOverdue ? `Retainer overdue ${Math.abs(alert.daysUntil)}d — J$${Number(l.retainerAmount).toLocaleString()}`
                          : alert.daysUntil===0 ? `Retainer due TODAY — J$${Number(l.retainerAmount).toLocaleString()}`
                          : `Retainer in ${alert.daysUntil}d — J$${Number(l.retainerAmount).toLocaleString()}`}
                      </div>
                    )}
                    <div style={{display:'flex',gap:'0.4rem',justifyContent:'flex-end'}}>
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
      )}

      {form!==null && <LeadModal data={form} onSave={d=>{d.id?onUpdate(d.id,d):onAdd(d);setForm(null);}} onClose={()=>setForm(null)}/>}
      {payForm!==null && <PaymentModal lead={payForm} existing={getPayments(payForm.id)} onLog={(s,a,d)=>onLogPayment(payForm,s,a,d)} onUpdateEntry={(s,a,d)=>onUpdatePayment(payForm,s,a,d)} onClose={()=>setPayForm(null)}/>}
    </div>
  );
}

function PaymentModal({lead,existing,onLog,onUpdateEntry,onClose}) {
  const [stage,setStage] = useState(PAYMENT_STAGES[0]);
  const [amount,setAmount] = useState('');
  const [date,setDate] = useState(new Date().toISOString().slice(0,10));
  const already = existing.find(e=>e.paymentStage===stage);
  return (
    <Modal title={`Payment — ${lead.businessName}`} onClose={onClose}>
      <div className="payment-log">
        <div className="card-label" style={{marginBottom:'0.5rem'}}>Logged</div>
        {existing.length===0 ? <div style={{fontSize:'12px',color:'var(--c-muted)'}}>No payments yet.</div>
          : existing.map(e => (
            <div key={e.id} style={{display:'flex',justifyContent:'space-between',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{fontSize:'12px'}}>{e.paymentStage}</span>
              <span style={{fontFamily:'var(--f-mono)',fontSize:'12px',color:'var(--c-mint)'}}>+J${Number(e.amount).toLocaleString()}</span>
            </div>
          ))}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.5rem',paddingTop:'0.5rem',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <span style={{fontFamily:'var(--f-mono)',fontSize:'12px',fontWeight:700}}>Total</span>
          <span style={{fontFamily:'var(--f-mono)',fontSize:'12px',color:'var(--c-mint)',fontWeight:700}}>J${existing.reduce((s,e)=>s+(Number(e.amount)||0),0).toLocaleString()}</span>
        </div>
      </div>
      <Field label="Stage"><select className="input" value={stage} onChange={e=>setStage(e.target.value)}>{PAYMENT_STAGES.map(s=><option key={s}>{s}</option>)}</select></Field>
      {already && <div style={{fontSize:'11px',color:'var(--c-gold)',fontFamily:'var(--f-mono)'}}>Already logged J${Number(already.amount).toLocaleString()} — will update.</div>}
      <div className="grid-2">
        <Field label="Amount (JMD)"><input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={already?String(already.amount):'25000'}/></Field>
        <Field label="Date"><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      </div>
      <ModalFoot onClose={onClose} onSave={()=>{if(!amount)return; already?onUpdateEntry(stage,amount,date):onLog(stage,amount,date); onClose();}}/>
    </Modal>
  );
}

function LeadModal({data,onSave,onClose}) {
  const [f,setF] = useState({businessName:'',contactName:'',phone:'',status:'New',value:'',notes:'',nextAction:'',nextActionDate:'',retainerAmount:'',retainerDueDay:'',...data});
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <Modal title={data.id?'Edit Lead':'New Lead'} onClose={onClose}>
      <Field label="Business Name"><input className="input" value={f.businessName} onChange={e=>s('businessName',e.target.value)} placeholder="e.g. Kicks Jamaica"/></Field>
      <Field label="Contact Name"><input className="input" value={f.contactName} onChange={e=>s('contactName',e.target.value)}/></Field>
      <Field label="Phone (for WhatsApp)"><input className="input" value={f.phone} onChange={e=>s('phone',e.target.value)} placeholder="+1876..."/></Field>
      <div className="grid-2">
        <Field label="Status"><select className="input" value={f.status} onChange={e=>s('status',e.target.value)}>{LEAD_STATUSES.map(st=><option key={st}>{st}</option>)}</select></Field>
        <Field label="Contract (JMD)"><input className="input" type="number" value={f.value} onChange={e=>s('value',e.target.value)} placeholder="45000"/></Field>
      </div>
      <div className="grid-2">
        <Field label="Retainer (JMD/mo)"><input className="input" type="number" value={f.retainerAmount} onChange={e=>s('retainerAmount',e.target.value)} placeholder="15000"/></Field>
        <Field label="Due Day"><input className="input" type="number" value={f.retainerDueDay} onChange={e=>s('retainerDueDay',e.target.value)} placeholder="1–28" min="1" max="28"/></Field>
      </div>
      <Field label="Notes"><textarea className="input" style={{resize:'vertical',minHeight:'64px'}} value={f.notes} onChange={e=>s('notes',e.target.value)}/></Field>
      <div className="grid-2">
        <Field label="Next Action"><input className="input" value={f.nextAction} onChange={e=>s('nextAction',e.target.value)} placeholder="Follow up"/></Field>
        <Field label="Date"><input className="input" type="date" value={f.nextActionDate} onChange={e=>s('nextActionDate',e.target.value)}/></Field>
      </div>
      <ModalFoot onClose={onClose} onSave={()=>f.businessName.trim()&&onSave(f)}/>
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
        <div className="hero-big">{habits.filter(h=>h.completions?.[todayStr]).length}/{habits.length}</div>
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
                  <button className="check-btn" onClick={e=>{e.stopPropagation();onToggle(h,todayStr);}} style={{color:h.completions?.[todayStr]?'var(--c-mint)':'var(--c-dim)',flexShrink:0}}>
                    {h.completions?.[todayStr] ? <Icons.check size={24}/> : <Icons.circle size={24}/>}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:'14.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:h.completions?.[todayStr]?'var(--c-muted)':'var(--c-primary)',textDecoration:h.completions?.[todayStr]?'line-through':'none'}}>{h.name}</div>
                    <div style={{display:'flex',gap:'0.75rem',marginTop:'2px'}}>
                      <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-gold)'}}>🔥 {streak}</span>
                      <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-muted)'}}>{total} done</span>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexShrink:0}}>
                    <button className="icon-btn" onClick={e=>{e.stopPropagation();setForm(h);}}><Icons.edit size={12}/></button>
                    <button className="icon-btn danger-btn" onClick={e=>{e.stopPropagation();onDelete(h.id);}}><Icons.trash size={12}/></button>
                    <span style={{color:'var(--c-muted)',transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}><Icons.chevDown size={14}/></span>
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
                          <span style={{fontFamily:'var(--f-mono)',fontSize:'8px',fontWeight:700,color:date===todayStr?'var(--c-blue)':'var(--c-muted)'}}>{DAYS[i]}</span>
                          <button className="check-btn" onClick={()=>onToggle(h,date)} style={{color:h.completions?.[date]?'var(--c-mint)':'var(--c-dim)'}}>
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
        <div className="hero-sub" style={{color:underMin?'var(--c-rose)':'var(--c-secondary)'}}>
          {underMin ? `Add ${5-taskCount} more — minimum 5 daily` : `${doneCount*5} XP earned · ${taskCount}/10 tasks`}
        </div>
      </div>

      <div className="xp-rules">
        {[{l:'+5 XP',d:'Per task done',c:'var(--c-mint)'},{l:'-10 XP',d:'Per missed task',c:'var(--c-rose)'},{l:'Goal 10',d:'Tasks/day',c:'var(--c-lavender)'},{l:'Min 5',d:'Or -10 XP',c:'var(--c-gold)'}].map(r => (
          <div key={r.l} style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
            <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',fontWeight:700,color:r.c,flexShrink:0}}>{r.l}</span>
            <span style={{fontSize:'11px',color:'var(--c-muted)'}}>{r.d}</span>
          </div>
        ))}
        {missedYest > 0 && <div style={{gridColumn:'1/-1',color:'var(--c-rose)',fontFamily:'var(--f-mono)',fontSize:'11px'}}>⚠ {missedYest} missed yesterday = -{missedYest*10} XP</div>}
      </div>

      <div style={{display:'flex',gap:'0.5rem'}}>
        <input className="input" style={{flex:1}} value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&quickAdd()} placeholder="Add a task for today…"/>
        <button className="btn-primary icon-only" onClick={quickAdd}><Icons.plus size={16}/></button>
      </div>

      {taskCount > 0 && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
            <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-muted)'}}>Today's progress</span>
            <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-lavender)'}}>{taskCount}/10 · {doneCount} done</span>
          </div>
          <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${Math.min(100,(taskCount/10)*100)}%`,background:'linear-gradient(90deg,var(--c-blue),var(--c-lavender))',borderRadius:'99px',transition:'width 0.4s'}}/>
          </div>
        </div>
      )}

      {sorted.length===0 ? <Empty text="No tasks yet. Add at least 5 to avoid XP penalty."/> : (
        <div className="list">
          {sorted.map(t => (
            <div key={t.id} className="card fade-in" style={{padding:'0.8rem 1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button className="check-btn" onClick={()=>onToggle(t)} style={{color:t.doneOn?.[todayStr]?'var(--c-lavender)':'var(--c-dim)',flexShrink:0}}>
                  {t.doneOn?.[todayStr] ? <Icons.check size={24}/> : <Icons.circle size={24}/>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--c-muted)':'var(--c-primary)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}>{t.title}</div>
                  {t.note && <div style={{fontSize:'11.5px',color:'var(--c-muted)',marginTop:'1px'}}>{t.note}</div>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexShrink:0}}>
                  {t.doneOn?.[todayStr] && <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-lavender)'}}>+5</span>}
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
                  <button className="check-btn" onClick={()=>onToggle(t)} style={{color:t.doneOn?.[todayStr]?'var(--c-lavender)':'var(--c-dim)',flexShrink:0}}>
                    {t.doneOn?.[todayStr] ? <Icons.check size={22}/> : <Icons.circle size={22}/>}
                  </button>
                  <span style={{flex:1,minWidth:0,fontSize:'13.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.doneOn?.[todayStr]?'var(--c-muted)':'var(--c-secondary)',textDecoration:t.doneOn?.[todayStr]?'line-through':'none'}}>{t.title}</span>
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
                  <div style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:BLOCK_COLORS[b.type],marginTop:'2px'}}>{b.start} – {b.end} · {b.type}</div>
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
            <div style={{fontSize:'12px',color:'var(--c-secondary)'}}>{emotion.desc}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
            {EMOTION_LEVELS.map((e,i)=>(
              <div key={i} style={{width:7,height:7,borderRadius:'50%',background:i<=emotionIdx?e.color:'rgba(255,255,255,0.1)',opacity:i===emotionIdx?1:0.4,transition:'all 0.3s'}}/>
            ))}
            <span style={{color:'var(--c-muted)',marginLeft:'0.25rem'}}>{meterOpen?<Icons.chevUp size={13}/>:<Icons.chevDown size={13}/>}</span>
          </div>
        </div>
        {meterOpen && (
          <div style={{padding:'0 1rem 1rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{height:'7px',borderRadius:'99px',background:'linear-gradient(90deg,#3b82f6,#10b981,#f59e0b,#f97316,#ef4444)',marginBottom:'0.5rem',marginTop:'0.75rem',position:'relative'}}>
              <div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:`${Math.max(2,Math.min(96,(emotionIdx/4)*100))}%`,width:'11px',height:'11px',borderRadius:'50%',background:'white',border:`2px solid ${emotion.color}`,boxShadow:`0 0 6px ${emotion.color}`,transition:'left 0.5s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.75rem'}}>
              <span style={{fontFamily:'var(--f-mono)',fontSize:'9px',color:'#3b82f6'}}>Thriving</span>
              <span style={{fontFamily:'var(--f-mono)',fontSize:'9px',color:'#ef4444'}}>Danger</span>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-muted)'}}>Level {level} target</span>
                <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:emotion.color}}>J${minTarget.toLocaleString()}/mo</span>
              </div>
              <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,minTarget>0?(mrr/minTarget)*100:0)}%`,background:emotion.color,borderRadius:'99px',transition:'width 0.6s'}}/>
              </div>
              <div style={{fontSize:'11px',color:'var(--c-muted)',marginTop:'4px'}}>MRR J${mrr.toLocaleString()} vs J${minTarget.toLocaleString()}/mo target</div>
            </div>
          </div>
        )}
      </div>

      <div className="hero">
        <div className="hero-eye">Finance</div>
        <div className="hero-big" style={{color:profit>=0?'var(--c-mint)':'var(--c-rose)'}}>J${profit.toLocaleString()}</div>
        <div className="hero-sub">Net profit · J${totalIncome.toLocaleString()} in · J${totalExpenses.toLocaleString()} out{mrr>0?` · MRR J${mrr.toLocaleString()}`:''}</div>
      </div>

      <div className="grid-2">
        <StatCard label="Income"   value={`J$${totalIncome.toLocaleString()}`}   icon={Icons.dollar}   color="var(--c-mint)"/>
        <StatCard label="Expenses" value={`J$${totalExpenses.toLocaleString()}`} icon={Icons.dollar}   color="var(--c-rose)"/>
        <StatCard label="MRR"      value={`J$${mrr.toLocaleString()}`}           icon={Icons.trend}    color="var(--c-lavender)"/>
        <StatCard label="6M Proj." value={`J$${proj.reduce((s,p)=>s+p.profit,0).toLocaleString()}`} icon={Icons.barChart} color="var(--c-gold)"/>
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
          <div style={{fontSize:'11px',color:'var(--c-muted)',marginBottom:'0.75rem'}}>Based on last 3 months avg + MRR. Dashed = min target.</div>
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
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-mint)'}}>J${c.value.toLocaleString()} ({Math.round(pct)}%)</span>
                </div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'var(--c-mint)',borderRadius:'99px'}}/>
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
              <div style={{width:'3px',alignSelf:'stretch',borderRadius:'2px',flexShrink:0,minHeight:'28px',background:f.type==='income'?'var(--c-mint)':'var(--c-rose)'}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:'13.5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.description}</div>
                <div style={{fontSize:'11px',color:'var(--c-muted)',fontFamily:'var(--f-mono)'}}>{f.category}{f.paymentStage?` · ${f.paymentStage}`:''} · {f.date}{f.pipelineLeadId?<span style={{color:'var(--c-lavender)'}}> · linked</span>:''}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexShrink:0}}>
                <div style={{fontFamily:'var(--f-mono)',fontWeight:700,fontSize:'13px',color:f.type==='income'?'var(--c-mint)':'var(--c-rose)',whiteSpace:'nowrap'}}>{f.type==='income'?'+':'-'}J${Number(f.amount).toLocaleString()}</div>
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
                    <div style={{fontSize:'11px',color:'var(--c-muted)',marginTop:'2px'}}>{g.category}{g.dueDate?` · Due ${g.dueDate}`:''}</div>
                  </div>
                  <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                    <button className="icon-btn" onClick={()=>setForm(g)}><Icons.edit size={12}/></button>
                    <button className="icon-btn danger-btn" onClick={()=>onDelete(g.id)}><Icons.trash size={12}/></button>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.25rem'}}>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-blue)',fontWeight:700}}>Level {lv}/20</span>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-muted)'}}>{g.current||0}/{g.target||0} {g.unit||''}</span>
                </div>
                <div style={{display:'flex',gap:'3px',marginBottom:'0.5rem'}}>
                  {Array.from({length:20},(_,i)=>(
                    <div key={i} style={{flex:1,height:'5px',borderRadius:'2px',background:i<lv?(i===lv-1?'var(--c-blue)':'rgba(59,130,246,0.3)'):'rgba(255,255,255,0.06)',boxShadow:i===lv-1?'0 0 4px var(--c-blue)':'none',transition:'all 0.3s'}}/>
                  ))}
                </div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,rgba(59,130,246,0.6),var(--c-blue))',borderRadius:'99px',boxShadow:'0 0 4px rgba(59,130,246,0.4)',transition:'width 0.6s'}}/>
                </div>
                <div style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-muted)',marginTop:'4px'}}>{pct}% complete</div>
                {g.notes && <div style={{fontSize:'12px',color:'var(--c-muted)',marginTop:'0.5rem',fontStyle:'italic'}}>{g.notes}</div>}
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
  const [tab,setTab]=useState('queue');
  const pending  = queue.filter(q=>q.status==='pending').sort((a,b)=>({high:0,medium:1,low:2}[a.priority]||1)-({high:0,medium:1,low:2}[b.priority]||1));
  const approved = queue.filter(q=>q.status==='approved');
  const executed = queue.filter(q=>q.status==='executed');
  const todayBriefing = briefings.find(b=>b.date===todayStr);
  const latestLog = logs[0];
  const AL={ADD_LEAD:'➕ Add Lead',UPDATE_LEAD:'✏️ Update Lead',MARK_LEAD_DEAD:'💀 Mark Dead',ADD_FINANCE_ENTRY:'💰 Add Transaction',ADD_TODO:'✅ Add Task'};
  const PC={high:'var(--c-rose)',medium:'var(--c-gold)',low:'var(--c-muted)'};

  return (
    <div className="section">
      <div className="hero" style={{background:'linear-gradient(135deg,#0a0f2e,#060b1a)',borderColor:'rgba(59,130,246,0.2)'}}>
        <div className="hero-eye" style={{color:'var(--c-blue)'}}>JAXON Intelligence</div>
        <div className="hero-big">Second Brain</div>
        <div className="hero-sub">{pending.length} pending · {approved.length} approved · {executed.length} executed</div>
      </div>

      {todayBriefing && (
        <div className="card fade-in" style={{borderLeft:'3px solid var(--c-blue)'}}>
          <div className="card-label" style={{color:'var(--c-blue)'}}>🤖 Morning Briefing — {todayStr}</div>
          <div style={{fontSize:'13px',lineHeight:'1.75',color:'var(--c-secondary)',whiteSpace:'pre-line'}}>{todayBriefing.content}</div>
        </div>
      )}

      <div className="tab-row">
        {[{id:'queue',label:`Queue (${pending.length})`},{id:'approved',label:`Approved (${approved.length})`},{id:'log',label:'Learning Log'}].map(t=>(
          <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab==='queue' && (
        pending.length===0 ? (
          <div className="card fade-in" style={{textAlign:'center',padding:'2rem'}}>
            <div style={{fontSize:'32px',marginBottom:'0.5rem'}}>✅</div>
            <div style={{color:'var(--c-muted)',fontSize:'14px'}}>Queue clear — JAXON is working</div>
          </div>
        ) : (
          <div className="list">
            {pending.map(item=>(
              <div key={item.id} className="card fade-in" style={{borderLeft:`3px solid ${PC[item.priority]||'var(--c-muted)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',fontWeight:700,color:'var(--c-blue)'}}>{AL[item.action]||item.action}</span>
                  <span className="badge" style={{background:`${PC[item.priority]}20`,color:PC[item.priority],border:`1px solid ${PC[item.priority]}30`}}>{item.priority}</span>
                </div>
                {item.data?.businessName && <div style={{fontWeight:700,fontSize:'15px',marginBottom:'0.25rem'}}>{item.data.businessName}</div>}
                <div style={{fontSize:'13px',color:'var(--c-secondary)',lineHeight:'1.6',marginBottom:'0.75rem'}}>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-blue)'}}>JAXON: </span>
                  {item.reasoning}
                </div>
                {item.data?.outreachDraft && (
                  <div className="draft-box" style={{marginBottom:'0.75rem'}}>
                    <div style={{fontFamily:'var(--f-mono)',fontSize:'9.5px',color:'var(--c-blue)',marginBottom:'4px',letterSpacing:'0.08em'}}>DRAFT MESSAGE</div>
                    <div style={{fontSize:'12.5px',color:'var(--c-secondary)',lineHeight:'1.6'}}>{item.data.outreachDraft}</div>
                  </div>
                )}
                {item.data?.value && (
                  <div style={{display:'flex',gap:'1rem',marginBottom:'0.75rem'}}>
                    <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-mint)'}}>J${Number(item.data.value).toLocaleString()} contract</span>
                    {item.data.retainerAmount && <span style={{fontFamily:'var(--f-mono)',fontSize:'11px',color:'var(--c-lavender)'}}>+J${Number(item.data.retainerAmount).toLocaleString()}/mo</span>}
                  </div>
                )}
                <div style={{display:'flex',gap:'0.5rem'}}>
                  <button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>onApprove(item.id)}>✓ Approve</button>
                  <button className="btn-ghost" style={{flex:1,justifyContent:'center',color:'var(--c-rose)',borderColor:'rgba(239,68,68,0.2)'}} onClick={()=>onReject(item.id)}>✕ Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab==='approved' && (
        <div className="list">
          {approved.length===0 ? <Empty text="Nothing approved yet."/> : approved.map(item=>(
            <div key={item.id} className="card fade-in" style={{opacity:0.8}}>
              <div style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-mint)',marginBottom:'2px'}}>✓ Approved — executes next run</div>
              <div style={{fontWeight:600,fontSize:'14px'}}>{AL[item.action]} — {item.data?.businessName||item.action}</div>
            </div>
          ))}
          {executed.length>0 && <>
            <div className="card-label" style={{marginTop:'0.25rem'}}>Executed</div>
            {executed.map(item=>(
              <div key={item.id} className="card fade-in" style={{opacity:0.45}}>
                <div style={{fontFamily:'var(--f-mono)',fontSize:'10px',color:'var(--c-muted)',marginBottom:'2px'}}>⚡ Executed</div>
                <div style={{fontWeight:600,fontSize:'14px'}}>{AL[item.action]} — {item.data?.businessName||item.action}</div>
              </div>
            ))}
          </>}
        </div>
      )}

      {tab==='log' && (
        !latestLog ? <Empty text="First log generates at midnight."/> : (
          <div className="card fade-in" style={{borderLeft:'3px solid var(--c-lavender)'}}>
            <div className="card-label" style={{color:'var(--c-lavender)'}}>📚 Learning Log — {latestLog.date}</div>
            {latestLog.stats && (
              <div className="grid-3" style={{marginBottom:'0.875rem'}}>
                {[{l:'Queued',v:latestLog.stats.actionsQueued,c:'var(--c-blue)'},{l:'Approved',v:latestLog.stats.approved,c:'var(--c-mint)'},{l:'Rejected',v:latestLog.stats.rejected,c:'var(--c-rose)'}].map(s=>(
                  <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}>
                    <div style={{fontFamily:'var(--f-mono)',fontSize:'18px',fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:'9.5px',color:'var(--c-muted)',fontFamily:'var(--f-mono)'}}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{fontSize:'13px',lineHeight:'1.75',color:'var(--c-secondary)',whiteSpace:'pre-line'}}>{latestLog.content}</div>
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

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({title,onClose,children}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-head">
          <span style={{fontFamily:'var(--f-display)',fontWeight:800,fontSize:'15px'}}>{title}</span>
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
      <label style={{fontFamily:'var(--f-mono)',fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--c-muted)'}}>{label}</label>
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
  return <div style={{textAlign:'center',padding:'2.5rem 1rem',color:'var(--c-muted)',fontSize:'13px',fontStyle:'italic'}}>{text}</div>;
}