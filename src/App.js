import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend
} from 'recharts';
import {
  Plus, Trash2, Pencil, X, CheckCircle2, Circle,
  TrendingUp, Users, Target, DollarSign, Flame,
  LayoutDashboard, Briefcase, Heart, Calendar,
  PiggyBank, Flag, AlertCircle, ChevronDown, ChevronUp,
  Zap, BookOpen, Dumbbell, Bell, ListTodo, BarChart2
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ['New','Contacted','Demo Sent','Negotiating','Paid','Flaked','Lost'];
const STATUS_COLOR = {
  New:'#8B97AC', Contacted:'#00aaff', 'Demo Sent':'#f5c84c',
  Negotiating:'#f5c84c', Paid:'#00f5c4', Flaked:'#ff4d6d', Lost:'#ff4d6d'
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const EXPENSE_CATS = ['Hosting','AI API','Tools','Transport','Food','Education','Other'];
const INCOME_CATS = ['Setup Fee','First Deposit','Second Deposit','Monthly Retainer','Completion Fee','Freelance','Other'];
const GOAL_CATS = ['Revenue','Clients','Skills','Health','Personal'];
const BLOCK_COLORS = {
  Work:'#00aaff', Coding:'#f5c84c', Outreach:'#00f5c4',
  University:'#a78bfa', Rest:'#4a6080', Personal:'#ff9f43', Other:'#ff4d6d'
};
const PAYMENT_STAGES = ['First Deposit','Second Deposit','Completion Fee','Monthly Retainer'];

// ─── EMOTION METER ────────────────────────────────────────────────────────────
// Levels: 0=blue (great), 1=green (good), 2=yellow (ok), 3=orange (bad), 4=red (danger)
const EMOTION_LEVELS = [
  { emoji:'😎', label:'Thriving',  color:'#00aaff', bg:'#00aaff18', desc:'Ahead of target' },
  { emoji:'😊', label:'Good',      color:'#00f5c4', bg:'#00f5c418', desc:'On track' },
  { emoji:'😐', label:'Watch Out', color:'#f5c84c', bg:'#f5c84c18', desc:'Needs attention' },
  { emoji:'😟', label:'Struggling',color:'#ff9f43', bg:'#ff9f4318', desc:'Pull up your socks' },
  { emoji:'🚨', label:'Danger',    color:'#ff4d6d', bg:'#ff4d6d18', desc:'Critical — act now' },
];

function calcEmotionLevel(finances, leads, xp, level) {
  const totalIncome = finances.filter(f => f.type === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;
  const mrr = leads.filter(l => l.status === 'Paid' && l.retainerAmount).reduce((s, l) => s + (Number(l.retainerAmount) || 0), 0);
  const paidClients = leads.filter(l => l.status === 'Paid').length;
  const hasRetainerSetup = leads.some(l => l.retainerAmount);
  const hasFinanceData = finances.length > 0;
  const minMonthlyTarget = level * 5000;

  // Start optimistic — penalize only on real negative signals
  let score = 65;

  // ── Profit: only penalize if there's actual finance data
  if (hasFinanceData) {
    if (profit > 0) score += 12;
    else if (profit < 0) score -= 10; // lighter penalty — early stage is normal
  }

  // ── MRR: only factor in if retainers are actually configured
  if (hasRetainerSetup && minMonthlyTarget > 0) {
    const mrrRatio = mrr / minMonthlyTarget;
    if (mrrRatio >= 1.5) score += 18;
    else if (mrrRatio >= 1) score += 10;
    else if (mrrRatio >= 0.5) score -= 5;
    else score -= 8; // not hitting target yet, but don't tank the score
  }

  // ── Paid clients — biggest positive signal
  if (paidClients >= 5) score += 18;
  else if (paidClients >= 3) score += 12;
  else if (paidClients >= 1) score += 6;
  // no clients yet → no penalty (just neutral — they may be new)

  // ── Expense ratio — only penalize if clearly burning cash
  if (hasFinanceData && totalIncome > 0) {
    const expRatio = totalExpenses / totalIncome;
    if (expRatio < 0.3) score += 8;
    else if (expRatio > 0.9) score -= 12; // only flag if near total burn
  }

  // ── XP momentum bonus — actively using the app = doing well
  if (xp > 1000) score += 5;
  else if (xp > 300) score += 3;

  score = Math.max(0, Math.min(100, score));

  // Wider bands so the dial sits more naturally in the middle
  if (score >= 78) return 0; // blue — thriving
  if (score >= 62) return 1; // green — good
  if (score >= 45) return 2; // yellow — watch out
  if (score >= 28) return 3; // orange — struggling
  return 4;                  // red — danger
}

// ─── TODO XP ─────────────────────────────────────────────────────────────────
// +5 XP per completed task today
// -10 XP per incomplete task from yesterday (missed)
// -10 XP if < 5 tasks added today
function calcTodoXP(todos, todayStr) {
  const yesterday = new Date(new Date(todayStr) - 86400000).toISOString().slice(0, 10);
  let xp = 0;

  // +5 per completed task (ever)
  todos.forEach(t => {
    const completedDays = Object.entries(t.doneOn || {}).filter(([, v]) => v).length;
    xp += completedDays * 5;
  });

  // -10 per task not completed yesterday
  todos.forEach(t => {
    const addedBefore = t.addedDate && t.addedDate <= yesterday;
    if (addedBefore && !t.doneOn?.[yesterday]) {
      xp -= 10;
    }
  });

  // -10 if today's added count < 5 (but only if day has passed — checked client-side)
  // We track this via todayTaskCount vs 5 minimum
  return xp;
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getLast20Weeks() {
  const weeks = [];
  const today = new Date();
  for (let w = 19; w >= 0; w--) {
    const days = [];
    const monday = new Date(today);
    const dow = today.getDay();
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - w * 7);
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      days.push(day.toISOString().slice(0, 10));
    }
    weeks.push(days);
  }
  return weeks;
}

function calcXP(habits, leads, todos, todayStr) {
  let xp = 0;
  habits.forEach(h => {
    xp += Object.values(h.completions || {}).filter(Boolean).length * 10;
  });
  leads.filter(l => l.status === 'Paid').forEach(() => { xp += 200; });
  xp += calcTodoXP(todos, todayStr);
  return Math.max(0, xp);
}

function xpToLevel(xp) {
  const level = Math.floor(xp / 500) + 1;
  const progress = (xp % 500) / 500;
  const xpInLevel = xp % 500;
  return { level, progress, xpInLevel };
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [habits, setHabits] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [finances, setFinances] = useState([]);
  const [goals, setGoals] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const unsubs = [];
    let loaded = 0;
    const cols = [
      ['leads', setLeads], ['habits', setHabits], ['schedule', setSchedule],
      ['finances', setFinances], ['goals', setGoals], ['todos', setTodos],
    ];
    cols.forEach(([col, setter]) => {
      try {
        const q = query(collection(db, col), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
          setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          loaded++;
          if (loaded >= cols.length) setLoading(false);
        }, () => { setError('Firebase connection issue'); setLoading(false); });
        unsubs.push(unsub);
      } catch { setError('Firebase not configured'); setLoading(false); }
    });
    return () => unsubs.forEach(u => u());
  }, []);

  const add = async (col, data) => {
    try { await addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() }); }
    catch { setError('Failed to save.'); }
  };
  const update = async (col, id, data) => {
    try { await updateDoc(doc(db, col, id), data); }
    catch { setError('Failed to update.'); }
  };
  const remove = async (col, id) => {
    try { await deleteDoc(doc(db, col, id)); }
    catch { setError('Failed to delete.'); }
  };
  const toggleHabit = async (habit, date) => {
    const completions = { ...(habit.completions || {}), [date]: !habit.completions?.[date] };
    await update('habits', habit.id, { completions });
  };
  const toggleTodo = async (todo) => {
    const doneOn = { ...(todo.doneOn || {}), [todayStr]: !todo.doneOn?.[todayStr] };
    await update('todos', todo.id, { doneOn });
  };

  // Pipeline → Finance
  const logPayment = async (lead, stage, amount, date) => {
    const exists = finances.some(f => f.pipelineLeadId === lead.id && f.paymentStage === stage);
    if (exists) return;
    await add('finances', {
      type: 'income',
      description: `${lead.businessName} — ${stage}`,
      amount: Number(amount),
      category: stage.includes('Retainer') ? 'Monthly Retainer' : 'Setup Fee',
      date: date || todayStr,
      pipelineLeadId: lead.id,
      paymentStage: stage,
    });
  };
  const updateLinkedPayment = async (lead, stage, amount, date) => {
    const entry = finances.find(f => f.pipelineLeadId === lead.id && f.paymentStage === stage);
    if (entry) {
      await update('finances', entry.id, {
        amount: Number(amount), date: date || todayStr,
        description: `${lead.businessName} — ${stage}`,
      });
    } else {
      await logPayment(lead, stage, amount, date);
    }
  };

  const totalIncome = finances.filter(f => f.type === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;
  const paidLeads = leads.filter(l => l.status === 'Paid');
  const openLeads = leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status));
  const habitsToday = habits.length
    ? Math.round(habits.filter(h => h.completions?.[todayStr]).length / habits.length * 100) : 0;
  const xp = calcXP(habits, leads, todos, todayStr);
  const { level, progress, xpInLevel } = xpToLevel(xp);

  // Todo stats
  const todayTodos = todos.filter(t => t.addedDate === todayStr);
  const todayDone = todayTodos.filter(t => t.doneOn?.[todayStr]);
  const todayPending = todayTodos.filter(t => !t.doneOn?.[todayStr]);
  const underMinimum = todayTodos.length < 5;

  const navItems = [
    { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
    { id: 'pipeline',  label: 'Pipeline', icon: Briefcase },
    { id: 'habits',    label: 'Habits',   icon: Heart },
    { id: 'todos',     label: 'Tasks',    icon: ListTodo },
    { id: 'schedule',  label: 'Schedule', icon: Calendar },
    { id: 'finance',   label: 'Finance',  icon: PiggyBank },
    { id: 'goals',     label: 'Goals',    icon: Flag },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">J</div>
          <div>
            <div className="brand-name">JCommerce</div>
            <div className="brand-sub">Founder Console</div>
          </div>
        </div>
        <div className="header-xp">
          <span className="header-xp-label">LVL</span>
          <span className="header-xp-val">{level}</span>
          <span className="header-xp-label">·</span>
          <span className="header-xp-val">{xp} XP</span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}

      {loading ? (
        <div className="splash">
          <div className="splash-logo">
            <div className="splash-logo-j">J</div>
            <div className="splash-logo-c">C</div>
          </div>
          <div className="splash-name">JCommerce</div>
          <div className="splash-tag">Founder Console</div>
          <div className="splash-bar-wrap"><div className="splash-bar" /></div>
        </div>
      ) : (
        <main className="main">
          {tab === 'dashboard' && (
            <Dashboard
              leads={leads} habits={habits} finances={finances} todos={todos}
              habitsToday={habitsToday} totalIncome={totalIncome}
              totalExpenses={totalExpenses} profit={profit}
              paidLeads={paidLeads} openLeads={openLeads}
              todayStr={todayStr} xp={xp} level={level} progress={progress} xpInLevel={xpInLevel}
              onToggleHabit={toggleHabit} onToggleTodo={toggleTodo}
              todayTodos={todayTodos} todayDone={todayDone}
            />
          )}
          {tab === 'pipeline' && (
            <Pipeline leads={leads} finances={finances}
              onAdd={d => add('leads', d)}
              onUpdate={(id, d) => update('leads', id, d)}
              onDelete={id => remove('leads', id)}
              onLogPayment={logPayment}
              onUpdatePayment={updateLinkedPayment}
            />
          )}
          {tab === 'habits' && (
            <Habits habits={habits} weekDates={weekDates} todayStr={todayStr}
              onAdd={d => add('habits', { ...d, completions: {} })}
              onUpdate={(id, d) => update('habits', id, d)}
              onDelete={id => remove('habits', id)}
              onToggle={toggleHabit} />
          )}
          {tab === 'todos' && (
            <Todos todos={todos} todayStr={todayStr}
              onAdd={d => add('todos', { ...d, doneOn: {}, addedDate: todayStr })}
              onUpdate={(id, d) => update('todos', id, d)}
              onDelete={id => remove('todos', id)}
              onToggle={toggleTodo} />
          )}
          {tab === 'schedule' && (
            <Schedule schedule={schedule}
              onAdd={d => add('schedule', d)}
              onUpdate={(id, d) => update('schedule', id, d)}
              onDelete={id => remove('schedule', id)} />
          )}
          {tab === 'finance' && (
            <Finance finances={finances} leads={leads}
              totalIncome={totalIncome} totalExpenses={totalExpenses} profit={profit}
              xp={xp} level={level}
              onAdd={d => add('finances', d)}
              onUpdate={(id, d) => update('finances', id, d)}
              onDelete={id => remove('finances', id)} />
          )}
          {tab === 'goals' && (
            <Goals goals={goals}
              onAdd={d => add('goals', d)}
              onUpdate={(id, d) => update('goals', id, d)}
              onDelete={id => remove('goals', id)} />
          )}
        </main>
      )}

      <nav className="bottom-nav">
        {navItems.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            <n.icon size={18} />
            <div className="nav-dot" />
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ leads, habits, finances, todos, habitsToday, totalIncome, totalExpenses, profit,
  paidLeads, openLeads, todayStr, xp, level, progress, xpInLevel, onToggleHabit, onToggleTodo,
  todayTodos, todayDone }) {
  const weeks = getLast20Weeks();
  const allDates = weeks.flat();
  const habitHeatmap = allDates.map(date => {
    const done = habits.filter(h => h.completions?.[date]).length;
    const total = habits.length;
    return { date, level: total === 0 ? 0 : Math.ceil((done / total) * 4) };
  });

  return (
    <div className="section">
      <div className="xp-banner">
        <div className="xp-avatar">J</div>
        <div className="xp-info">
          <div className="xp-name">Jadan Spencer</div>
          <div className="xp-level">Level {level} Founder</div>
          <div className="xp-bar-wrap">
            <div className="xp-bar" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="xp-pts">{xpInLevel} / 500 XP to Level {level + 1}</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Net Profit"    value={`J$${profit.toLocaleString()}`}  icon={TrendingUp} color={profit >= 0 ? '#00f5c4' : '#ff4d6d'} />
        <StatCard label="Paid Clients"  value={paidLeads.length}                 icon={Users}      color="#00aaff" />
        <StatCard label="Open Pipeline" value={openLeads.length}                 icon={Target}     color="#f5c84c" />
        <StatCard label="Habits Today"  value={`${habitsToday}%`}                icon={Flame}      color="#ff9f43" />
      </div>

      {habits.length > 0 && (
        <div className="card">
          <div className="card-title">Today's Habits</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {habits.map(h => (
              <div key={h.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <button className="check-btn" onClick={() => onToggleHabit(h, todayStr)}
                  style={{ color: h.completions?.[todayStr] ? '#00f5c4' : '#283449', flexShrink:0 }}>
                  {h.completions?.[todayStr] ? <CheckCircle2 size={22}/> : <Circle size={22}/>}
                </button>
                <span style={{
                  fontSize:'14px', flex:1, minWidth:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  color: h.completions?.[todayStr] ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: h.completions?.[todayStr] ? 'line-through' : 'none',
                }}>{h.name}</span>
                {h.completions?.[todayStr] && (
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'#00f5c4', flexShrink:0 }}>+10 XP</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {todayTodos.length > 0 && (
        <div className="card">
          <div className="card-title">Today's Tasks · {todayDone.length}/{todayTodos.length}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {todayTodos.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <button className="check-btn" onClick={() => onToggleTodo(t)}
                  style={{ color: t.doneOn?.[todayStr] ? '#a78bfa' : '#283449', flexShrink:0 }}>
                  {t.doneOn?.[todayStr] ? <CheckCircle2 size={22}/> : <Circle size={22}/>}
                </button>
                <span style={{
                  fontSize:'14px', flex:1, minWidth:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  color: t.doneOn?.[todayStr] ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: t.doneOn?.[todayStr] ? 'line-through' : 'none',
                }}>{t.title}</span>
                {t.doneOn?.[todayStr] && (
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'#a78bfa', flexShrink:0 }}>+5 XP</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Consistency — Last 20 Weeks</div>
        <div className="heatmap">
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map(date => {
                  const entry = habitHeatmap.find(h => h.date === date);
                  return (
                    <div key={date}
                      className={`heatmap-cell level-${entry?.level || 0} ${date === todayStr ? 'today' : ''}`}
                      title={date} />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            {[0,1,2,3,4].map(l => <div key={l} className={`heatmap-cell level-${l}`} />)}
            <span>More</span>
          </div>
        </div>
      </div>

      {leads.length > 0 && (
        <div className="card">
          <div className="card-title">Pipeline by Stage</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={LEAD_STATUSES.map(s => ({ name:s, count: leads.filter(l => l.status===s).length })).filter(d => d.count > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" />
              <XAxis dataKey="name" tick={{ fill:'#4a6080', fontSize:9 }} />
              <YAxis tick={{ fill:'#4a6080', fontSize:9 }} allowDecimals={false} width={25} />
              <Tooltip contentStyle={{ background:'#0d1425', border:'1px solid #1e2f52', borderRadius:'0.75rem', color:'#e8f0ff' }} />
              <Bar dataKey="count" fill="#00aaff" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline({ leads, finances, onAdd, onUpdate, onDelete, onLogPayment, onUpdatePayment }) {
  const [form, setForm] = useState(null);
  const [payForm, setPayForm] = useState(null);
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? leads : leads.filter(l => l.status === filter);
  const totalPipelineValue = leads.filter(l => !['Flaked','Lost'].includes(l.status)).reduce((s,l) => s + (Number(l.value)||0), 0);
  const getPayments = (lid) => finances.filter(f => f.pipelineLeadId === lid);
  const totalReceived = (lid) => getPayments(lid).reduce((s,f) => s + (Number(f.amount)||0), 0);
  const getRetainerAlert = (lead) => {
    if (!lead.retainerAmount || !lead.retainerDueDay) return null;
    const today = new Date();
    const dueDay = parseInt(lead.retainerDueDay);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    const daysThis = Math.ceil((thisMonth - today) / 86400000);
    const daysNext = Math.ceil((nextMonth - today) / 86400000);
    const isOverdue = daysThis < 0 && Math.abs(daysThis) <= 5;
    return { daysUntil: isOverdue ? daysThis : (daysThis >= 0 ? daysThis : daysNext), isOverdue };
  };

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Sales Pipeline</div>
        <div className="page-hero-title">J${totalPipelineValue.toLocaleString()}</div>
        <div className="page-hero-sub">
          {leads.filter(l=>l.status==='Paid').length} paid · {leads.filter(l=>!['Paid','Flaked','Lost'].includes(l.status)).length} open
        </div>
      </div>

      <div className="filter-strip-wrap">
        <div className="filter-strip">
          {['All',...LEAD_STATUSES].map(s => (
            <button key={s} className={`pill-btn ${filter===s?'active':''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={14}/></button>
      </div>

      {filtered.length === 0 ? <Empty text="No leads here yet." /> : (
        <div className="list">
          {filtered.map(l => {
            const payments = getPayments(l.id);
            const received = totalReceived(l.id);
            const contractTotal = Number(l.value) || 0;
            const remaining = contractTotal - received;
            const alert = getRetainerAlert(l);
            return (
              <div key={l.id} className="card">
                <div className="lead-card-body">
                  <div className="lead-card-left">
                    <div className="lead-name">
                      {l.businessName}
                      <span className="badge" style={{ background:`${STATUS_COLOR[l.status]}22`, color:STATUS_COLOR[l.status] }}>{l.status}</span>
                    </div>
                    <div className="muted small">{l.contactName}{l.phone ? ` · ${l.phone}` : ''}</div>
                    {l.notes && <div className="muted small" style={{ marginTop:'0.25rem' }}>{l.notes}</div>}
                    {l.nextActionDate && (
                      <div className="mono small" style={{ color:'var(--gold)', marginTop:'0.25rem' }}>↳ {l.nextAction} — {l.nextActionDate}</div>
                    )}
                    {contractTotal > 0 && (
                      <div style={{ marginTop:'0.5rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <span className="mono small" style={{ color:'var(--text-muted)' }}>J${received.toLocaleString()} / J${contractTotal.toLocaleString()}</span>
                          <span className="mono small" style={{ color: remaining>0 ? 'var(--gold)' : 'var(--mint)' }}>
                            {remaining > 0 ? `J$${remaining.toLocaleString()} due` : '✓ Paid'}
                          </span>
                        </div>
                        <div style={{ height:'3px', background:'var(--bg-raised)', borderRadius:'99px', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:'99px', background: remaining>0 ? 'var(--gold)' : 'var(--mint)', width:`${Math.min(100, contractTotal>0?(received/contractTotal)*100:0)}%`, transition:'width 0.6s ease' }} />
                        </div>
                      </div>
                    )}
                    {payments.length > 0 && (
                      <div style={{ marginTop:'0.5rem', display:'flex', flexDirection:'column', gap:'2px' }}>
                        {payments.map(p => (
                          <div key={p.id} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--mint)', flexShrink:0, display:'inline-block' }} />
                            <span className="mono small" style={{ color:'var(--text-muted)' }}>{p.paymentStage} · J${Number(p.amount).toLocaleString()} · {p.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {alert && (
                      <div className={`retainer-alert ${alert.isOverdue?'retainer-alert-overdue':''}`} style={{ marginTop:'0.5rem' }}>
                        <Bell size={12}/>
                        {alert.isOverdue ? `Retainer overdue ${Math.abs(alert.daysUntil)}d — J$${Number(l.retainerAmount).toLocaleString()}`
                          : alert.daysUntil===0 ? `Retainer due TODAY — J$${Number(l.retainerAmount).toLocaleString()}`
                          : `Retainer in ${alert.daysUntil}d — J$${Number(l.retainerAmount).toLocaleString()}`}
                      </div>
                    )}
                  </div>
                  <div className="lead-card-right">
                    <div className="mono" style={{ fontWeight:700, color:STATUS_COLOR[l.status], fontSize:'13px', whiteSpace:'nowrap' }}>
                      {l.value ? `J$${Number(l.value).toLocaleString()}` : '—'}
                    </div>
                    <div className="row-gap">
                      <button className="icon-btn" style={{ color:'var(--mint)', borderColor:'#0a3d2e' }} onClick={() => setPayForm(l)} title="Log payment"><DollarSign size={13}/></button>
                      <button className="icon-btn" onClick={() => setForm(l)}><Pencil size={13}/></button>
                      <button className="icon-btn danger" onClick={() => onDelete(l.id)}><Trash2 size={13}/></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form !== null && (
        <LeadModal data={form} onSave={d => { d.id ? onUpdate(d.id,d) : onAdd(d); setForm(null); }} onClose={() => setForm(null)} />
      )}
      {payForm !== null && (
        <PaymentModal lead={payForm} existing={getPayments(payForm.id)}
          onLog={(stage,amount,date) => onLogPayment(payForm,stage,amount,date)}
          onUpdateEntry={(stage,amount,date) => onUpdatePayment(payForm,stage,amount,date)}
          onClose={() => setPayForm(null)} />
      )}
    </div>
  );
}

function PaymentModal({ lead, existing, onLog, onUpdateEntry, onClose }) {
  const [stage, setStage] = useState(PAYMENT_STAGES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const alreadyLogged = existing.find(e => e.paymentStage === stage);
  const handleSave = () => {
    if (!amount) return;
    alreadyLogged ? onUpdateEntry(stage,amount,date) : onLog(stage,amount,date);
    onClose();
  };
  return (
    <Modal title={`Payment — ${lead.businessName}`} onClose={onClose}>
      <div style={{ background:'var(--bg-raised)', borderRadius:'var(--radius-md)', padding:'0.75rem', marginBottom:'0.25rem' }}>
        <div className="card-title" style={{ marginBottom:'0.5rem' }}>Payments Logged</div>
        {existing.length === 0 ? <div className="muted small">No payments yet.</div> : existing.map(e => (
          <div key={e.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.25rem 0', borderBottom:'1px solid var(--border)' }}>
            <span className="small">{e.paymentStage}</span>
            <span className="mono small" style={{ color:'var(--mint)' }}>+J${Number(e.amount).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid var(--border)' }}>
          <span className="mono small" style={{ fontWeight:700 }}>Total</span>
          <span className="mono small" style={{ color:'var(--mint)', fontWeight:700 }}>J${existing.reduce((s,e) => s+(Number(e.amount)||0),0).toLocaleString()}</span>
        </div>
      </div>
      <Field label="Payment Stage">
        <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
          {PAYMENT_STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      {alreadyLogged && <div style={{ fontSize:'11px', color:'var(--gold)', fontFamily:'var(--font-mono)' }}>Already logged J${Number(alreadyLogged.amount).toLocaleString()} — will update.</div>}
      <div className="grid-2">
        <Field label="Amount (JMD)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={alreadyLogged ? String(alreadyLogged.amount) : '25000'} /></Field>
        <Field label="Date"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} />
    </Modal>
  );
}

function LeadModal({ data, onSave, onClose }) {
  const [f, setF] = useState({ businessName:'', contactName:'', phone:'', status:'New', value:'', notes:'', nextAction:'', nextActionDate:'', retainerAmount:'', retainerDueDay:'', ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={data.id ? 'Edit Lead' : 'New Lead'} onClose={onClose}>
      <Field label="Business Name"><input className="input" value={f.businessName} onChange={e => set('businessName',e.target.value)} placeholder="e.g. Kicks Jamaica" /></Field>
      <Field label="Contact Name"><input className="input" value={f.contactName} onChange={e => set('contactName',e.target.value)} /></Field>
      <Field label="Phone"><input className="input" value={f.phone} onChange={e => set('phone',e.target.value)} placeholder="+1 876..." /></Field>
      <div className="grid-2">
        <Field label="Status"><select className="input" value={f.status} onChange={e => set('status',e.target.value)}>{LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Contract Value (JMD)"><input className="input" type="number" value={f.value} onChange={e => set('value',e.target.value)} placeholder="45000" /></Field>
      </div>
      <div className="grid-2">
        <Field label="Monthly Retainer (JMD)"><input className="input" type="number" value={f.retainerAmount} onChange={e => set('retainerAmount',e.target.value)} placeholder="15000" /></Field>
        <Field label="Retainer Due Day"><input className="input" type="number" value={f.retainerDueDay} onChange={e => set('retainerDueDay',e.target.value)} placeholder="1–28" min="1" max="28" /></Field>
      </div>
      <Field label="Notes"><textarea className="input textarea" rows={2} value={f.notes} onChange={e => set('notes',e.target.value)} /></Field>
      <div className="grid-2">
        <Field label="Next Action"><input className="input" value={f.nextAction} onChange={e => set('nextAction',e.target.value)} placeholder="Follow up call" /></Field>
        <Field label="Date"><input className="input" type="date" value={f.nextActionDate} onChange={e => set('nextActionDate',e.target.value)} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={() => f.businessName.trim() && onSave(f)} />
    </Modal>
  );
}

// ─── HABITS ───────────────────────────────────────────────────────────────────
function Habits({ habits, weekDates, todayStr, onAdd, onUpdate, onDelete, onToggle }) {
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const weeks = getLast20Weeks();
  const streakFor = (habit) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (habit.completions?.[key]) streak++;
      else if (i > 0) break;
    }
    return streak;
  };

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Daily Habits</div>
        <div className="page-hero-title">{habits.filter(h => h.completions?.[todayStr]).length}/{habits.length}</div>
        <div className="page-hero-sub">Completed today · Each habit = +10 XP</div>
      </div>
      <div className="row-between">
        <span className="section-title" style={{ fontSize:'16px' }}>Your Habits</span>
        <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={14}/> Add</button>
      </div>
      {habits.length === 0 ? <Empty text="No habits tracked yet." /> : (
        <div className="list">
          {habits.map(h => {
            const streak = streakFor(h);
            const total = Object.values(h.completions || {}).filter(Boolean).length;
            const isOpen = expanded === h.id;
            return (
              <div key={h.id} className="card habit-drawer">
                <div className="habit-drawer-header" onClick={() => setExpanded(isOpen ? null : h.id)}>
                  <button className="check-btn" onClick={e => { e.stopPropagation(); onToggle(h, todayStr); }}
                    style={{ color: h.completions?.[todayStr] ? '#00f5c4' : '#1e2f52', flexShrink:0 }}>
                    {h.completions?.[todayStr] ? <CheckCircle2 size={24}/> : <Circle size={24}/>}
                  </button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'15px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: h.completions?.[todayStr] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: h.completions?.[todayStr] ? 'line-through' : 'none' }}>{h.name}</div>
                    <div style={{ display:'flex', gap:'0.75rem', marginTop:'2px' }}>
                      <span className="mono small" style={{ color:'var(--gold)' }}>🔥 {streak}</span>
                      <span className="mono small muted">{total} done</span>
                    </div>
                  </div>
                  <div className="row-gap" style={{ flexShrink:0 }}>
                    <button className="icon-btn" onClick={e => { e.stopPropagation(); setForm(h); }}><Pencil size={12}/></button>
                    <button className="icon-btn danger" onClick={e => { e.stopPropagation(); onDelete(h.id); }}><Trash2 size={12}/></button>
                    {isOpen ? <ChevronUp size={15} style={{ color:'var(--text-muted)' }}/> : <ChevronDown size={15} style={{ color:'var(--text-muted)' }}/>}
                  </div>
                </div>
                {isOpen && (
                  <div className="habit-drawer-body">
                    <div className="card-title" style={{ marginBottom:'0.5rem' }}>20-Week History</div>
                    <div style={{ overflowX:'auto' }}>
                      <div style={{ display:'flex', gap:'3px', minWidth:'max-content' }}>
                        {weeks.map((week, wi) => (
                          <div key={wi} style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                            {week.map(date => (
                              <div key={date} className={`heatmap-cell small ${h.completions?.[date]?'level-4':'level-0'} ${date===todayStr?'today':''}`} onClick={() => date<=todayStr && onToggle(h,date)} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card-title" style={{ marginTop:'1rem', marginBottom:'0.5rem' }}>This Week</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'0.25rem' }}>
                      {weekDates.map((date, i) => (
                        <div key={date} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', fontWeight:700, color: date===todayStr?'var(--cerulean)':'var(--text-muted)' }}>{DAYS[i]}</span>
                          <button className="check-btn" onClick={() => onToggle(h,date)} style={{ color: h.completions?.[date]?'#00f5c4':'#1e2f52' }}>
                            {h.completions?.[date] ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
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
      {form !== null && (
        <Modal title={form.id ? 'Edit Habit' : 'New Habit'} onClose={() => setForm(null)}>
          <Field label="Habit Name"><input className="input" defaultValue={form.name || ''} id="hname" placeholder="e.g. Send 10 cold messages, Code 1hr" /></Field>
          <ModalFooter onClose={() => setForm(null)} onSave={() => {
            const name = document.getElementById('hname').value.trim();
            if (name) { form.id ? onUpdate(form.id,{name}) : onAdd({name}); setForm(null); }
          }} />
        </Modal>
      )}
    </div>
  );
}

// ─── TODOS ────────────────────────────────────────────────────────────────────
function Todos({ todos, todayStr, onAdd, onUpdate, onDelete, onToggle }) {
  const [form, setForm] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const todayTasks = todos.filter(t => t.addedDate === todayStr);
  const olderTasks = todos.filter(t => t.addedDate !== todayStr);
  const doneTodayCount = todayTasks.filter(t => t.doneOn?.[todayStr]).length;
  const taskCount = todayTasks.length;
  const underMin = taskCount < 5;
  const xpEarned = doneTodayCount * 5;

  const yesterday = new Date(new Date(todayStr) - 86400000).toISOString().slice(0, 10);
  const missedYesterday = todos.filter(t => t.addedDate === yesterday && !t.doneOn?.[yesterday]).length;

  const quickAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({ title: newTitle.trim(), note: '' });
    setNewTitle('');
  };

  const sorted = [
    ...todayTasks.filter(t => !t.doneOn?.[todayStr]),
    ...todayTasks.filter(t => t.doneOn?.[todayStr]),
  ];

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Daily Tasks</div>
        <div className="page-hero-title">{doneTodayCount}/{taskCount}</div>
        <div className="page-hero-sub" style={{ color: underMin ? 'var(--rose)' : 'var(--text-secondary)' }}>
          {underMin
            ? `Add ${5 - taskCount} more to avoid -10 XP penalty`
            : `${xpEarned} XP earned today · ${taskCount}/10 tasks added`}
        </div>
      </div>

      {/* XP rules card */}
      <div className="card" style={{ background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
          {[
            { label:'+5 XP', desc:'Per task completed', color:'#00f5c4' },
            { label:'-10 XP', desc:'Per task missed next day', color:'#ff4d6d' },
            { label:'Goal: 10', desc:'Tasks per day', color:'#a78bfa' },
            { label:'Min: 5', desc:'Or lose 10 XP', color:'#f5c84c' },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <span className="mono" style={{ fontSize:'11px', fontWeight:700, color:r.color, flexShrink:0 }}>{r.label}</span>
              <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{r.desc}</span>
            </div>
          ))}
        </div>
        {missedYesterday > 0 && (
          <div style={{ marginTop:'0.75rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border)', color:'var(--rose)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>
            ⚠ {missedYesterday} task{missedYesterday!==1?'s':''} missed yesterday = -{missedYesterday*10} XP
          </div>
        )}
      </div>

      {/* Quick add */}
      <div style={{ display:'flex', gap:'0.5rem' }}>
        <input
          className="input"
          style={{ flex:1 }}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && quickAdd()}
          placeholder="Add a task for today..."
        />
        <button className="btn btn-primary" onClick={quickAdd} style={{ flexShrink:0 }}><Plus size={14}/></button>
      </div>

      {/* Progress bar */}
      {taskCount > 0 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
            <span className="mono small" style={{ color:'var(--text-muted)' }}>Today's progress</span>
            <span className="mono small" style={{ color:'var(--lavender)' }}>{taskCount}/10 added · {doneTodayCount} done</span>
          </div>
          <div style={{ height:'6px', background:'var(--bg-raised)', borderRadius:'99px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(100, (taskCount/10)*100)}%`, background:'linear-gradient(90deg, var(--cerulean-dim), var(--lavender))', borderRadius:'99px', transition:'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Today's tasks */}
      {sorted.length === 0 ? (
        <Empty text="No tasks yet today. Add at least 5 to avoid XP penalty." />
      ) : (
        <div className="list">
          {sorted.map(t => (
            <div key={t.id} className="card" style={{ padding:'0.875rem 1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <button className="check-btn" onClick={() => onToggle(t)}
                  style={{ color: t.doneOn?.[todayStr] ? '#a78bfa' : '#1e2f52', flexShrink:0 }}>
                  {t.doneOn?.[todayStr] ? <CheckCircle2 size={24}/> : <Circle size={24}/>}
                </button>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'14.5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: t.doneOn?.[todayStr] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.doneOn?.[todayStr] ? 'line-through' : 'none' }}>{t.title}</div>
                  {t.note && <div className="muted small">{t.note}</div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexShrink:0 }}>
                  {t.doneOn?.[todayStr] && <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'#a78bfa' }}>+5</span>}
                  <button className="icon-btn" onClick={() => setForm(t)}><Pencil size={12}/></button>
                  <button className="icon-btn danger" onClick={() => onDelete(t.id)}><Trash2 size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Older tasks (recurring) */}
      {olderTasks.length > 0 && (
        <>
          <div className="card-title" style={{ marginTop:'0.5rem' }}>Recurring / Older Tasks</div>
          <div className="list">
            {olderTasks.map(t => (
              <div key={t.id} className="card" style={{ padding:'0.875rem 1rem', opacity: 0.75 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <button className="check-btn" onClick={() => onToggle(t)}
                    style={{ color: t.doneOn?.[todayStr] ? '#a78bfa' : '#1e2f52', flexShrink:0 }}>
                    {t.doneOn?.[todayStr] ? <CheckCircle2 size={22}/> : <Circle size={22}/>}
                  </button>
                  <span style={{ flex:1, minWidth:0, fontSize:'14px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: t.doneOn?.[todayStr] ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: t.doneOn?.[todayStr] ? 'line-through' : 'none' }}>{t.title}</span>
                  <button className="icon-btn danger" onClick={() => onDelete(t.id)} style={{ flexShrink:0 }}><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {form !== null && (
        <Modal title="Edit Task" onClose={() => setForm(null)}>
          <Field label="Task"><input className="input" defaultValue={form.title||''} id="ttitle" /></Field>
          <Field label="Note (optional)"><input className="input" defaultValue={form.note||''} id="tnote" /></Field>
          <ModalFooter onClose={() => setForm(null)} onSave={() => {
            const title = document.getElementById('ttitle').value.trim();
            const note = document.getElementById('tnote').value.trim();
            if (title) { onUpdate(form.id, { title, note }); setForm(null); }
          }} />
        </Modal>
      )}
    </div>
  );
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
function Schedule({ schedule, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(null);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()===0?6:new Date().getDay()-1]);
  const dayBlocks = schedule.filter(s => s.day===selectedDay).sort((a,b) => (a.start||'').localeCompare(b.start||''));

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Weekly Schedule</div>
        <div className="page-hero-title">Plan Your Time</div>
        <div className="page-hero-sub">Structure is the discipline that creates freedom.</div>
      </div>
      <div className="day-strip">
        {DAYS.map(d => <button key={d} onClick={() => setSelectedDay(d)} className={`day-pill ${selectedDay===d?'active':''}`}>{d}</button>)}
      </div>
      <div className="row-between">
        <span className="section-title" style={{ fontSize:'16px' }}>{selectedDay}</span>
        <button className="btn btn-primary" onClick={() => setForm({ day:selectedDay })}><Plus size={14}/> Block</button>
      </div>
      {dayBlocks.length === 0 ? <Empty text={`Nothing scheduled for ${selectedDay} yet.`} /> : (
        <div className="list">
          {dayBlocks.map(b => (
            <div key={b.id} className="card" style={{ borderLeft:`3px solid ${BLOCK_COLORS[b.type]||'#4a6080'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'15px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.title}</div>
                  <div className="mono small" style={{ color:BLOCK_COLORS[b.type], marginTop:'2px' }}>{b.start} – {b.end} · {b.type}</div>
                </div>
                <div className="row-gap" style={{ flexShrink:0 }}>
                  <button className="icon-btn" onClick={() => setForm(b)}><Pencil size={12}/></button>
                  <button className="icon-btn danger" onClick={() => onDelete(b.id)}><Trash2 size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {form !== null && (
        <SchedModal data={form} onSave={d => { d.id ? onUpdate(d.id,d) : onAdd(d); setForm(null); }} onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function SchedModal({ data, onSave, onClose }) {
  const [f, setF] = useState({ day:'Mon', start:'09:00', end:'10:00', title:'', type:'Work', ...data });
  const set = (k,v) => setF(p => ({ ...p, [k]:v }));
  return (
    <Modal title={data.id ? 'Edit Block' : 'New Block'} onClose={onClose}>
      <Field label="Title"><input className="input" value={f.title} onChange={e => set('title',e.target.value)} placeholder="e.g. Client work, Study, Gym" /></Field>
      <div className="grid-2">
        <Field label="Day"><select className="input" value={f.day} onChange={e => set('day',e.target.value)}>{DAYS.map(d => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Type"><select className="input" value={f.type} onChange={e => set('type',e.target.value)}>{Object.keys(BLOCK_COLORS).map(t => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <div className="grid-2">
        <Field label="Start"><input className="input" type="time" value={f.start} onChange={e => set('start',e.target.value)} /></Field>
        <Field label="End"><input className="input" type="time" value={f.end} onChange={e => set('end',e.target.value)} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={() => f.title.trim() && onSave(f)} />
    </Modal>
  );
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────
function Finance({ finances, leads, totalIncome, totalExpenses, profit, xp, level, onAdd, onUpdate, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [reportTab, setReportTab] = useState('overview');
  const [form, setForm] = useState(null);
  const [meterExpanded, setMeterExpanded] = useState(false);
  const filtered = filter === 'all' ? finances : finances.filter(f => f.type === filter);

  const mrr = leads.filter(l => l.status==='Paid' && l.retainerAmount).reduce((s,l) => s+(Number(l.retainerAmount)||0), 0);

  // Emotion calculation
  const emotionIdx = calcEmotionLevel(finances, leads, xp, level);
  const emotion = EMOTION_LEVELS[emotionIdx];

  // Minimum bar — grows with level (every 500 XP)
  const minMonthlyTarget = level * 5000; // J$5k per level

  // Monthly data
  const monthlyData = useMemo(() => {
    const map = {};
    finances.forEach(f => {
      const d = f.date ? f.date.slice(0,7) : new Date().toISOString().slice(0,7);
      if (!map[d]) map[d] = { month:d, income:0, expenses:0, profit:0 };
      if (f.type==='income') map[d].income += Number(f.amount)||0;
      else map[d].expenses += Number(f.amount)||0;
    });
    Object.values(map).forEach(m => { m.profit = m.income - m.expenses; });
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
  }, [finances]);

  // 6-month projection
  const projectionData = useMemo(() => {
    const today = new Date();
    const recent = monthlyData.slice(-3);
    const avgIncome = recent.length > 0 ? recent.reduce((s,m) => s+m.income,0)/recent.length : 0;
    const avgExpenses = recent.length > 0 ? recent.reduce((s,m) => s+m.expenses,0)/recent.length : 0;
    return Array.from({ length:6 }, (_,i) => {
      const d = new Date(today.getFullYear(), today.getMonth()+i+1, 1);
      const proj = avgIncome + mrr;
      return { month: d.toISOString().slice(0,7), projected: Math.round(proj), expenses: Math.round(avgExpenses), profit: Math.round(proj-avgExpenses), minimum: minMonthlyTarget };
    });
  }, [monthlyData, mrr, minMonthlyTarget]);

  // Category breakdown
  const catData = useMemo(() => {
    const map = {};
    finances.filter(f => f.type==='income').forEach(f => { const c=f.category||'Other'; map[c]=(map[c]||0)+(Number(f.amount)||0); });
    return Object.entries(map).map(([name,value]) => ({ name,value })).sort((a,b) => b.value-a.value);
  }, [finances]);

  const tt = { background:'#0d1425', border:'1px solid #1e2f52', borderRadius:'0.75rem', color:'#e8f0ff', fontSize:'11px' };

  return (
    <div className="section">
      {/* Emotion Meter Bot */}
      <div className="emotion-meter" style={{ background: emotion.bg, borderColor: emotion.color }}>
        <div className="emotion-meter-top" onClick={() => setMeterExpanded(!meterExpanded)}>
          <div className="emotion-emoji">{emotion.emoji}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'15px', color: emotion.color }}>{emotion.label}</div>
            <div className="muted small">{emotion.desc}</div>
          </div>
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div className="emotion-level-dots">
              {EMOTION_LEVELS.map((e,i) => (
                <div key={i} className="emotion-dot" style={{ background: i <= emotionIdx ? e.color : 'var(--bg-raised)', opacity: i === emotionIdx ? 1 : 0.4 }} />
              ))}
            </div>
            {meterExpanded ? <ChevronUp size={14} style={{ color:'var(--text-muted)' }}/> : <ChevronDown size={14} style={{ color:'var(--text-muted)' }}/>}
          </div>
        </div>
        {meterExpanded && (
          <div className="emotion-meter-body">
            <div className="card-title" style={{ marginBottom:'0.5rem', color: emotion.color }}>Finance Health Score</div>
            {/* Color spectrum bar */}
            <div style={{ height:'8px', borderRadius:'99px', background:'linear-gradient(90deg, #00aaff, #00f5c4, #f5c84c, #ff9f43, #ff4d6d)', marginBottom:'0.5rem', position:'relative' }}>
              <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:`${Math.max(2, Math.min(96, (emotionIdx/4*100)))}%`, width:'12px', height:'12px', borderRadius:'50%', background:'white', border:`2px solid ${emotion.color}`, boxShadow:`0 0 8px ${emotion.color}` }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
              <span className="mono small" style={{ color:'#00aaff' }}>Thriving</span>
              <span className="mono small" style={{ color:'#ff4d6d' }}>Danger</span>
            </div>
            {/* Minimum bar */}
            <div style={{ marginBottom:'0.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span className="mono small" style={{ color:'var(--text-muted)' }}>Level {level} minimum target</span>
                <span className="mono small" style={{ color: emotion.color }}>J${minMonthlyTarget.toLocaleString()}/mo</span>
              </div>
              <div style={{ height:'4px', background:'var(--bg-raised)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(100, minMonthlyTarget>0?(mrr/minMonthlyTarget)*100:0)}%`, background: emotion.color, borderRadius:'99px', transition:'width 0.6s ease' }} />
              </div>
              <div className="muted small" style={{ marginTop:'4px' }}>MRR J${mrr.toLocaleString()} vs target J${minMonthlyTarget.toLocaleString()}/mo</div>
            </div>
            <div className="muted small">Bar target raises every 500 XP (Level up). Currently Level {level} → J${(level*5000).toLocaleString()}/mo minimum.</div>
          </div>
        )}
      </div>

      <div className="page-hero">
        <div className="page-hero-eyebrow">Finance Tracker</div>
        <div className="page-hero-title" style={{ color: profit >= 0 ? '#00f5c4' : '#ff4d6d' }}>J${profit.toLocaleString()}</div>
        <div className="page-hero-sub">
          Net profit · J${totalIncome.toLocaleString()} in · J${totalExpenses.toLocaleString()} out
          {mrr > 0 && <span style={{ color:'var(--lavender)' }}> · MRR J${mrr.toLocaleString()}</span>}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Income"   value={`J$${totalIncome.toLocaleString()}`}   icon={DollarSign} color="#00f5c4" />
        <StatCard label="Expenses" value={`J$${totalExpenses.toLocaleString()}`} icon={DollarSign} color="#ff4d6d" />
        <StatCard label="MRR"      value={`J$${mrr.toLocaleString()}`}           icon={TrendingUp} color="#a78bfa" />
        <StatCard label="6M Proj." value={`J$${projectionData.reduce((s,p)=>s+p.profit,0).toLocaleString()}`} icon={BarChart2} color="#f5c84c" />
      </div>

      {/* Report tabs */}
      <div className="tab-group">
        {['overview','projection','breakdown'].map(t => (
          <button key={t} className={`tab-btn ${reportTab===t?'active':''}`} onClick={() => setReportTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {reportTab === 'overview' && monthlyData.length > 0 && (
        <div className="card">
          <div className="card-title">Monthly Income vs Expenses</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData.slice(-6)} margin={{ left:0, right:4, top:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" />
              <XAxis dataKey="month" tick={{ fill:'#4a6080', fontSize:9 }} />
              <YAxis tick={{ fill:'#4a6080', fontSize:9 }} width={48} />
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize:'10px', color:'#8ba3cc' }} />
              <Bar dataKey="income" fill="#00f5c4" radius={[3,3,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#ff4d6d" radius={[3,3,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {reportTab === 'projection' && (
        <div className="card">
          <div className="card-title">6-Month Projection + Minimum Bar</div>
          <div className="muted small" style={{ marginBottom:'0.75rem' }}>Based on avg of last 3 months + MRR. Dashed line = your Level {level} minimum target.</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={projectionData} margin={{ left:0, right:4, top:4, bottom:0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5c4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f5c4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" />
              <XAxis dataKey="month" tick={{ fill:'#4a6080', fontSize:9 }} />
              <YAxis tick={{ fill:'#4a6080', fontSize:9 }} width={48} />
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize:'10px', color:'#8ba3cc' }} />
              <Area type="monotone" dataKey="projected" stroke="#00f5c4" fill="url(#projGrad)" name="Projected Income" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" stroke="#a78bfa" fill="url(#profGrad)" name="Projected Profit" strokeWidth={2} />
              <Area type="monotone" dataKey="minimum" stroke="#f5c84c" fill="none" name="Min Target" strokeWidth={1} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
            {projectionData.map(p => (
              <div key={p.month} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span className="mono small" style={{ color:'var(--text-muted)' }}>{p.month}</span>
                <div style={{ display:'flex', gap:'0.875rem' }}>
                  <span className="mono small" style={{ color:'#00f5c4' }}>+J${p.projected.toLocaleString()}</span>
                  <span className="mono small" style={{ color:'#a78bfa' }}>J${p.profit.toLocaleString()} profit</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportTab === 'breakdown' && (
        <div className="card">
          <div className="card-title">Income by Category</div>
          {catData.length === 0 ? <Empty text="No income data yet." /> : catData.map(c => {
            const pct = totalIncome > 0 ? (c.value/totalIncome)*100 : 0;
            return (
              <div key={c.name} style={{ marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span className="small" style={{ fontWeight:600 }}>{c.name}</span>
                  <span className="mono small" style={{ color:'var(--mint)' }}>J${c.value.toLocaleString()} ({Math.round(pct)}%)</span>
                </div>
                <div style={{ height:'4px', background:'var(--bg-raised)', borderRadius:'99px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:'var(--mint)', borderRadius:'99px' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transactions */}
      <div className="row-between">
        <div className="tab-group" style={{ flex:1 }}>
          {['all','income','expense'].map(t => (
            <button key={t} className={`tab-btn ${filter===t?'active':''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})} style={{ flexShrink:0 }}><Plus size={14}/></button>
      </div>

      {filtered.length === 0 ? <Empty text="No transactions yet." /> : (
        <div className="list">
          {filtered.map(f => (
            <div key={f.id} className="card finance-row">
              <div className="finance-row-accent" style={{ background: f.type==='income' ? '#00f5c4' : '#ff4d6d' }} />
              <div className="finance-row-info">
                <div className="finance-row-desc">{f.description}</div>
                <div className="muted small">
                  {f.category}{f.paymentStage ? ` · ${f.paymentStage}` : ''} · {f.date}
                  {f.pipelineLeadId && <span style={{ color:'var(--lavender)', marginLeft:'0.25rem' }}>· linked</span>}
                </div>
              </div>
              <div className="finance-row-right">
                <div className="mono" style={{ fontWeight:700, fontSize:'13px', color: f.type==='income'?'#00f5c4':'#ff4d6d', whiteSpace:'nowrap' }}>
                  {f.type==='income'?'+':'-'}J${Number(f.amount).toLocaleString()}
                </div>
                <button className="icon-btn" onClick={() => setForm(f)}><Pencil size={12}/></button>
                <button className="icon-btn danger" onClick={() => onDelete(f.id)}><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form !== null && (
        <FinanceModal data={form} onSave={d => { d.id ? onUpdate(d.id,d) : onAdd(d); setForm(null); }} onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function FinanceModal({ data, onSave, onClose }) {
  const [f, setF] = useState({ type:'income', description:'', amount:'', category:INCOME_CATS[0], date:new Date().toISOString().slice(0,10), ...data });
  const set = (k,v) => setF(p => ({ ...p, [k]:v }));
  const cats = f.type==='income' ? INCOME_CATS : EXPENSE_CATS;
  return (
    <Modal title={data.id ? 'Edit Transaction' : 'New Transaction'} onClose={onClose}>
      <div className="tab-group" style={{ marginBottom:'0.5rem' }}>
        <button className={`tab-btn ${f.type==='income'?'active':''}`} onClick={() => set('type','income')}>Income</button>
        <button className={`tab-btn ${f.type==='expense'?'active':''}`} onClick={() => set('type','expense')}>Expense</button>
      </div>
      <Field label="Description"><input className="input" value={f.description} onChange={e => set('description',e.target.value)} placeholder="e.g. D&D Wholesale setup fee" /></Field>
      <div className="grid-2">
        <Field label="Amount (JMD)"><input className="input" type="number" value={f.amount} onChange={e => set('amount',e.target.value)} placeholder="45000" /></Field>
        <Field label="Category"><select className="input" value={f.category} onChange={e => set('category',e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Date"><input className="input" type="date" value={f.date} onChange={e => set('date',e.target.value)} /></Field>
      <ModalFooter onClose={onClose} onSave={() => f.description.trim() && f.amount && onSave(f)} />
    </Modal>
  );
}

// ─── GOALS ────────────────────────────────────────────────────────────────────
function Goals({ goals, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(null);
  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Goals</div>
        <div className="page-hero-title">Level Up</div>
        <div className="page-hero-sub">20 blocks. Fill them. Become him.</div>
      </div>
      <div className="row-between">
        <span className="section-title" style={{ fontSize:'16px' }}>{goals.length} Goals</span>
        <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={14}/> New</button>
      </div>
      {goals.length === 0 ? <Empty text="No goals set. What do you want to become?" /> : (
        <div className="list">
          {goals.map(g => {
            const progress = Math.min(100, Math.round(((Number(g.current)||0)/(Number(g.target)||1))*100));
            const level = Math.floor(progress/5);
            return (
              <div key={g.id} className="card">
                <div className="goal-header">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'15px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.title}</div>
                    <div className="muted small" style={{ marginTop:'2px' }}>{g.category}{g.dueDate ? ` · Due ${g.dueDate}` : ''}</div>
                  </div>
                  <div className="row-gap" style={{ flexShrink:0 }}>
                    <button className="icon-btn" onClick={() => setForm(g)}><Pencil size={12}/></button>
                    <button className="icon-btn danger" onClick={() => onDelete(g.id)}><Trash2 size={12}/></button>
                  </div>
                </div>
                <div className="goal-level-label">
                  <span className="mono small" style={{ color:'var(--cerulean)', fontWeight:700 }}>Level {level}/20</span>
                  <span className="mono small muted">{g.current||0} / {g.target||0} {g.unit||''}</span>
                </div>
                <div className="level-blocks">
                  {Array.from({ length:20 }, (_,i) => (
                    <div key={i} className={`level-block ${i<level?'filled':''} ${i===level-1&&level>0?'current':''}`} />
                  ))}
                </div>
                <div className="progress-bar-wrap" style={{ marginTop:'0.5rem' }}>
                  <div className="progress-bar" style={{ width:`${progress}%` }} />
                </div>
                <div className="mono small muted" style={{ marginTop:'4px' }}>{progress}% complete</div>
                {g.notes && <div className="muted small" style={{ marginTop:'0.5rem', fontStyle:'italic' }}>{g.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
      {form !== null && (
        <GoalModal data={form} onSave={d => { d.id ? onUpdate(d.id,d) : onAdd(d); setForm(null); }} onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function GoalModal({ data, onSave, onClose }) {
  const [f, setF] = useState({ title:'', category:GOAL_CATS[0], target:'', current:'', unit:'', dueDate:'', notes:'', ...data });
  const set = (k,v) => setF(p => ({ ...p, [k]:v }));
  return (
    <Modal title={data.id ? 'Edit Goal' : 'New Goal'} onClose={onClose}>
      <Field label="Goal Title"><input className="input" value={f.title} onChange={e => set('title',e.target.value)} placeholder="e.g. Get to 10 retainer clients" /></Field>
      <div className="grid-2">
        <Field label="Category"><select className="input" value={f.category} onChange={e => set('category',e.target.value)}>{GOAL_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Unit"><input className="input" value={f.unit} onChange={e => set('unit',e.target.value)} placeholder="clients, JMD, pages..." /></Field>
      </div>
      <div className="grid-2">
        <Field label="Target"><input className="input" type="number" value={f.target} onChange={e => set('target',e.target.value)} placeholder="10" /></Field>
        <Field label="Current"><input className="input" type="number" value={f.current} onChange={e => set('current',e.target.value)} placeholder="1" /></Field>
      </div>
      <Field label="Due Date"><input className="input" type="date" value={f.dueDate} onChange={e => set('dueDate',e.target.value)} /></Field>
      <Field label="Notes / Why this matters"><textarea className="input textarea" rows={2} value={f.notes} onChange={e => set('notes',e.target.value)} /></Field>
      <ModalFooter onClose={onClose} onSave={() => f.title.trim() && onSave(f)} />
    </Modal>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="icon-btn" onClick={onClose}><X size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, onSave }) {
  return (
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={onSave}>Save</button>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}