import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Plus, Trash2, Pencil, X, CheckCircle2, Circle,
  TrendingUp, Users, Target, DollarSign, Flame,
  LayoutDashboard, Briefcase, Heart, Calendar,
  PiggyBank, Flag, AlertCircle, Zap, BookOpen, Dumbbell
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ['New', 'Contacted', 'Demo Sent', 'Negotiating', 'Paid', 'Flaked', 'Lost'];
const STATUS_COLOR = {
  New: '#8B97AC', Contacted: '#00aaff', 'Demo Sent': '#f5c84c',
  Negotiating: '#f5c84c', Paid: '#00f5c4', Flaked: '#ff4d6d', Lost: '#ff4d6d'
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EXPENSE_CATS = ['Hosting', 'AI API', 'Tools', 'Transport', 'Food', 'Education', 'Other'];
const INCOME_CATS = ['Setup Fee', 'Monthly Retainer', 'Freelance', 'Other'];
const GOAL_CATS = ['Revenue', 'Clients', 'Skills', 'Health', 'Personal'];
const BLOCK_COLORS = {
  Work: '#00aaff', Coding: '#f5c84c', Outreach: '#00f5c4',
  University: '#a78bfa', Rest: '#4a6080', Personal: '#ff9f43', Other: '#ff4d6d'
};

const HABIT_ICONS = { default: Flame, code: Zap, study: BookOpen, fitness: Dumbbell };

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

// XP calculation — each habit completion = 10 XP, each paid client = 200 XP
function calcXP(habits, leads) {
  let xp = 0;
  habits.forEach(h => {
    const completions = Object.values(h.completions || {}).filter(Boolean).length;
    xp += completions * 10;
  });
  leads.filter(l => l.status === 'Paid').forEach(() => { xp += 200; });
  return xp;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const unsubs = [];
    let loaded = 0;
    const cols = [
      ['leads', setLeads],
      ['habits', setHabits],
      ['schedule', setSchedule],
      ['finances', setFinances],
      ['goals', setGoals],
    ];
    cols.forEach(([col, setter]) => {
      try {
        const q = query(collection(db, col), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
          setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          loaded++;
          if (loaded >= cols.length) setLoading(false);
        }, err => {
          console.error(err);
          setError('Firebase connection issue — check src/firebase.js');
          setLoading(false);
        });
        unsubs.push(unsub);
      } catch (e) {
        setError('Firebase not configured. Fill in your config in src/firebase.js');
        setLoading(false);
      }
    });
    return () => unsubs.forEach(u => u());
  }, []);

  const add = async (col, data) => {
    try { await addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() }); }
    catch (e) { setError('Failed to save. Check Firebase.'); }
  };
  const update = async (col, id, data) => {
    try { await updateDoc(doc(db, col, id), data); }
    catch (e) { setError('Failed to update.'); }
  };
  const remove = async (col, id) => {
    try { await deleteDoc(doc(db, col, id)); }
    catch (e) { setError('Failed to delete.'); }
  };
  const toggleHabit = async (habit, date) => {
    const completions = { ...(habit.completions || {}), [date]: !habit.completions?.[date] };
    await update('habits', habit.id, { completions });
  };

  const totalIncome = finances.filter(f => f.type === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;
  const paidLeads = leads.filter(l => l.status === 'Paid');
  const openLeads = leads.filter(l => !['Paid', 'Flaked', 'Lost'].includes(l.status));
  const habitsToday = habits.length
    ? Math.round(habits.filter(h => h.completions?.[todayStr]).length / habits.length * 100)
    : 0;
  const xp = calcXP(habits, leads);
  const { level, progress, xpInLevel } = xpToLevel(xp);

  const navItems = [
    { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
    { id: 'pipeline',  label: 'Pipeline', icon: Briefcase       },
    { id: 'habits',    label: 'Habits',   icon: Heart           },
    { id: 'schedule',  label: 'Schedule', icon: Calendar        },
    { id: 'finance',   label: 'Finance',  icon: PiggyBank       },
    { id: 'goals',     label: 'Goals',    icon: Flag            },
  ];

  return (
    <div className="app">
      {/* Header */}
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

      {/* Error */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading your console…</p>
        </div>
      ) : (
        <main className="main">
          {tab === 'dashboard' && (
            <Dashboard
              leads={leads} habits={habits} finances={finances} goals={goals}
              habitsToday={habitsToday} totalIncome={totalIncome}
              totalExpenses={totalExpenses} profit={profit}
              paidLeads={paidLeads} openLeads={openLeads}
              todayStr={todayStr} xp={xp} level={level} progress={progress} xpInLevel={xpInLevel}
              onToggleHabit={toggleHabit}
            />
          )}
          {tab === 'pipeline' && (
            <Pipeline leads={leads}
              onAdd={d => add('leads', d)}
              onUpdate={(id, d) => update('leads', id, d)}
              onDelete={id => remove('leads', id)} />
          )}
          {tab === 'habits' && (
            <Habits habits={habits} weekDates={weekDates} todayStr={todayStr}
              onAdd={d => add('habits', { ...d, completions: {} })}
              onUpdate={(id, d) => update('habits', id, d)}
              onDelete={id => remove('habits', id)}
              onToggle={toggleHabit} />
          )}
          {tab === 'schedule' && (
            <Schedule schedule={schedule}
              onAdd={d => add('schedule', d)}
              onUpdate={(id, d) => update('schedule', id, d)}
              onDelete={id => remove('schedule', id)} />
          )}
          {tab === 'finance' && (
            <Finance finances={finances} totalIncome={totalIncome}
              totalExpenses={totalExpenses} profit={profit}
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

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {navItems.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}>
            <n.icon size={20} />
            <div className="nav-dot" />
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ leads, habits, habitsToday, totalIncome, totalExpenses, profit,
  paidLeads, openLeads, todayStr, xp, level, progress, xpInLevel, onToggleHabit }) {

  const weeks = getLast20Weeks();
  const allDates = weeks.flat();

  const habitHeatmap = allDates.map(date => {
    const done = habits.filter(h => h.completions?.[date]).length;
    const total = habits.length;
    const lvl = total === 0 ? 0 : Math.ceil((done / total) * 4);
    return { date, level: lvl };
  });

  const todayHabits = habits.filter(h => !h.completions?.[todayStr]);
  const todayDone   = habits.filter(h => h.completions?.[todayStr]);

  return (
    <div className="section">
      {/* XP Banner */}
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

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Net Profit"    value={`J$${profit.toLocaleString()}`}   icon={TrendingUp} color={profit >= 0 ? '#00f5c4' : '#ff4d6d'} />
        <StatCard label="Paid Clients"  value={paidLeads.length}                  icon={Users}      color="#00aaff" />
        <StatCard label="Open Pipeline" value={openLeads.length}                  icon={Target}     color="#f5c84c" />
        <StatCard label="Habits Today"  value={`${habitsToday}%`}                 icon={Flame}      color="#ff9f43" />
      </div>

      {/* Today's habits quick-check */}
      {habits.length > 0 && (
        <div className="card">
          <div className="card-title">Today's Habits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {habits.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button className="check-btn" onClick={() => onToggleHabit(h, todayStr)}
                  style={{ color: h.completions?.[todayStr] ? '#00f5c4' : '#283449' }}>
                  {h.completions?.[todayStr] ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <span style={{
                  fontSize: '14px',
                  color: h.completions?.[todayStr] ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: h.completions?.[todayStr] ? 'line-through' : 'none',
                  flex: 1
                }}>{h.name}</span>
                {h.completions?.[todayStr] && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#00f5c4' }}>+10 XP</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="card">
        <div className="card-title">Consistency — Last 20 Weeks</div>
        <div className="heatmap">
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map(date => {
                  const entry = habitHeatmap.find(h => h.date === date);
                  const lvl = entry?.level || 0;
                  return (
                    <div key={date}
                      className={`heatmap-cell level-${lvl} ${date === todayStr ? 'today' : ''}`}
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

      {/* Pipeline chart */}
      {leads.length > 0 && (
        <div className="card">
          <div className="card-title">Pipeline by Stage</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={
              LEAD_STATUSES.map(s => ({ name: s, count: leads.filter(l => l.status === s).length }))
                .filter(d => d.count > 0)
            }>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" />
              <XAxis dataKey="name" tick={{ fill: '#4a6080', fontSize: 9 }} />
              <YAxis tick={{ fill: '#4a6080', fontSize: 9 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0d1425', border: '1px solid #1e2f52', borderRadius: '0.75rem', color: '#e8f0ff', fontFamily: 'Space Grotesk' }} />
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
function Pipeline({ leads, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? leads : leads.filter(l => l.status === filter);
  const totalPipelineValue = leads
    .filter(l => !['Flaked','Lost'].includes(l.status))
    .reduce((s, l) => s + (Number(l.value) || 0), 0);

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Sales Pipeline</div>
        <div className="page-hero-title">J${totalPipelineValue.toLocaleString()}</div>
        <div className="page-hero-sub">{leads.filter(l => l.status === 'Paid').length} paid · {leads.filter(l => !['Paid','Flaked','Lost'].includes(l.status)).length} open</div>
      </div>

      <div className="row-between">
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div className="tab-group" style={{ minWidth: 'max-content' }}>
            <button className={`tab-btn ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>All</button>
            {LEAD_STATUSES.map(s => (
              <button key={s} className={`tab-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})} style={{ flexShrink: 0 }}>
          <Plus size={14} />
        </button>
      </div>

      {filtered.length === 0 ? <Empty text="No leads here yet." /> : (
        <div className="list">
          {filtered.map(l => (
            <div key={l.id} className="card lead-card">
              <div className="lead-info">
                <div className="lead-name">
                  {l.businessName}
                  <span className="badge" style={{ background: `${STATUS_COLOR[l.status]}22`, color: STATUS_COLOR[l.status] }}>
                    {l.status}
                  </span>
                </div>
                <div className="muted small">{l.contactName}{l.phone ? ` · ${l.phone}` : ''}</div>
                {l.notes && <div className="muted small" style={{ marginTop: '0.25rem' }}>{l.notes}</div>}
                {l.nextActionDate && (
                  <div className="mono small" style={{ color: '#f5c84c', marginTop: '0.25rem' }}>
                    ↳ {l.nextAction} — {l.nextActionDate}
                  </div>
                )}
              </div>
              <div className="lead-actions">
                <div className="mono" style={{ fontWeight: 700, color: STATUS_COLOR[l.status] }}>
                  {l.value ? `J$${Number(l.value).toLocaleString()}` : '—'}
                </div>
                <div className="row-gap">
                  <button className="icon-btn" onClick={() => setForm(l)}><Pencil size={13} /></button>
                  <button className="icon-btn danger" onClick={() => onDelete(l.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form !== null && (
        <LeadModal data={form}
          onSave={d => { d.id ? onUpdate(d.id, d) : onAdd(d); setForm(null); }}
          onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function LeadModal({ data, onSave, onClose }) {
  const [f, setF] = useState({
    businessName: '', contactName: '', phone: '',
    status: 'New', value: '', notes: '', nextAction: '', nextActionDate: '', ...data
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={data.id ? 'Edit Lead' : 'New Lead'} onClose={onClose}>
      <Field label="Business Name">
        <input className="input" value={f.businessName} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Kicks Jamaica" />
      </Field>
      <Field label="Contact Name">
        <input className="input" value={f.contactName} onChange={e => set('contactName', e.target.value)} />
      </Field>
      <Field label="Phone">
        <input className="input" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 876..." />
      </Field>
      <div className="grid-2">
        <Field label="Status">
          <select className="input" value={f.status} onChange={e => set('status', e.target.value)}>
            {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Value (JMD)">
          <input className="input" type="number" value={f.value} onChange={e => set('value', e.target.value)} placeholder="45000" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className="input textarea" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Next Action">
          <input className="input" value={f.nextAction} onChange={e => set('nextAction', e.target.value)} placeholder="Follow up call" />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={f.nextActionDate} onChange={e => set('nextActionDate', e.target.value)} />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={() => f.businessName.trim() && onSave(f)} />
    </Modal>
  );
}

// ─── HABITS ───────────────────────────────────────────────────────────────────
function Habits({ habits, weekDates, todayStr, onAdd, onUpdate, onDelete, onToggle }) {
  const [form, setForm] = useState(null);
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
        <span className="section-title" style={{ fontSize: '16px' }}>Your Habits</span>
        <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={14} /> Add</button>
      </div>

      {habits.length === 0 ? <Empty text="No habits tracked yet. Add your first one." /> : (
        <>
          <div className="list">
            {habits.map(h => {
              const streak = streakFor(h);
              const total = Object.values(h.completions || {}).filter(Boolean).length;
              return (
                <div key={h.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="check-btn" onClick={() => onToggle(h, todayStr)}
                      style={{ color: h.completions?.[todayStr] ? '#00f5c4' : '#1e2f52' }}>
                      {h.completions?.[todayStr] ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '15px',
                        color: h.completions?.[todayStr] ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: h.completions?.[todayStr] ? 'line-through' : 'none'
                      }}>{h.name}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                        <span className="mono small" style={{ color: '#f5c84c' }}>🔥 {streak} streak</span>
                        <span className="mono small muted">{total} total</span>
                      </div>
                    </div>
                    <div className="row-gap">
                      <button className="icon-btn" onClick={() => setForm(h)}><Pencil size={12} /></button>
                      <button className="icon-btn danger" onClick={() => onDelete(h.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="card-title">20-Week Heatmap (tap to toggle past days)</div>
            <div className="habit-heatmap-wrap">
              {habits.map(h => {
                const allDates = weeks.flat();
                return (
                  <div key={h.id} className="habit-row">
                    <div className="habit-name">{h.name}</div>
                    <div className="habit-cells">
                      {allDates.map(date => (
                        <div key={date}
                          className={`heatmap-cell small ${h.completions?.[date] ? 'level-4' : 'level-0'} ${date === todayStr ? 'today' : ''}`}
                          title={date}
                          onClick={() => date <= todayStr && onToggle(h, date)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title">This Week</div>
            <div className="week-grid">
              <div className="week-header">
                <span>Habit</span>
                {weekDates.map((d, i) => (
                  <span key={d} className={d === todayStr ? 'today-label' : ''}>{DAYS[i]}</span>
                ))}
              </div>
              {habits.map(h => (
                <div key={h.id} className="week-row">
                  <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.name}
                  </span>
                  {weekDates.map(date => (
                    <button key={date} className="check-btn" onClick={() => onToggle(h, date)}
                      style={{ color: h.completions?.[date] ? '#00f5c4' : '#1e2f52' }}>
                      {h.completions?.[date] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {form !== null && (
        <Modal title={form.id ? 'Edit Habit' : 'New Habit'} onClose={() => setForm(null)}>
          <Field label="Habit Name">
            <input className="input" defaultValue={form.name || ''} id="hname"
              placeholder="e.g. Send 10 cold messages, Code for 1hr, Read 20 pages" />
          </Field>
          <ModalFooter onClose={() => setForm(null)} onSave={() => {
            const name = document.getElementById('hname').value.trim();
            if (name) { form.id ? onUpdate(form.id, { name }) : onAdd({ name }); setForm(null); }
          }} />
        </Modal>
      )}
    </div>
  );
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
function Schedule({ schedule, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(null);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  const dayBlocks = schedule.filter(s => s.day === selectedDay).sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Weekly Schedule</div>
        <div className="page-hero-title">Plan Your Time</div>
        <div className="page-hero-sub">Structure is the discipline that creates freedom.</div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {DAYS.map(d => (
          <button key={d}
            onClick={() => setSelectedDay(d)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: selectedDay === d ? 'var(--cerulean)' : 'var(--border)',
              background: selectedDay === d ? 'var(--cerulean-glow)' : 'var(--bg-raised)',
              color: selectedDay === d ? 'var(--cerulean)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}>
            {d}
          </button>
        ))}
      </div>

      <div className="row-between">
        <span className="section-title" style={{ fontSize: '16px' }}>{selectedDay}</span>
        <button className="btn btn-primary" onClick={() => setForm({ day: selectedDay })}><Plus size={14} /> Block</button>
      </div>

      {dayBlocks.length === 0 ? <Empty text={`Nothing scheduled for ${selectedDay} yet.`} /> : (
        <div className="list">
          {dayBlocks.map(b => (
            <div key={b.id} className="card" style={{
              borderLeft: `3px solid ${BLOCK_COLORS[b.type] || '#4a6080'}`,
              background: `linear-gradient(135deg, ${BLOCK_COLORS[b.type] || '#4a6080'}10, var(--bg-surface))`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{b.title}</div>
                  <div className="mono small" style={{ color: BLOCK_COLORS[b.type], marginTop: '2px' }}>
                    {b.start} – {b.end} · {b.type}
                  </div>
                </div>
                <div className="row-gap">
                  <button className="icon-btn" onClick={() => setForm(b)}><Pencil size={12} /></button>
                  <button className="icon-btn danger" onClick={() => onDelete(b.id)}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form !== null && (
        <SchedModal data={form}
          onSave={d => { d.id ? onUpdate(d.id, d) : onAdd(d); setForm(null); }}
          onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function SchedModal({ data, onSave, onClose }) {
  const [f, setF] = useState({ day: 'Mon', start: '09:00', end: '10:00', title: '', type: 'Work', ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={data.id ? 'Edit Block' : 'New Block'} onClose={onClose}>
      <Field label="Title">
        <input className="input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Client work, Study Java, Gym" />
      </Field>
      <div className="grid-2">
        <Field label="Day">
          <select className="input" value={f.day} onChange={e => set('day', e.target.value)}>
            {DAYS.map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="input" value={f.type} onChange={e => set('type', e.target.value)}>
            {Object.keys(BLOCK_COLORS).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Start"><input className="input" type="time" value={f.start} onChange={e => set('start', e.target.value)} /></Field>
        <Field label="End"><input className="input" type="time" value={f.end} onChange={e => set('end', e.target.value)} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={() => f.title.trim() && onSave(f)} />
    </Modal>
  );
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────
function Finance({ finances, totalIncome, totalExpenses, profit, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? finances : finances.filter(f => f.type === filter);

  const monthlyData = (() => {
    const map = {};
    finances.forEach(f => {
      const d = f.date ? f.date.slice(0, 7) : new Date().toISOString().slice(0, 7);
      if (!map[d]) map[d] = { month: d, income: 0, expenses: 0 };
      if (f.type === 'income') map[d].income += Number(f.amount) || 0;
      else map[d].expenses += Number(f.amount) || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  })();

  return (
    <div className="section">
      <div className="page-hero">
        <div className="page-hero-eyebrow">Finance Tracker</div>
        <div className="page-hero-title" style={{ color: profit >= 0 ? '#00f5c4' : '#ff4d6d' }}>
          J${profit.toLocaleString()}
        </div>
        <div className="page-hero-sub">Net profit · J${totalIncome.toLocaleString()} in, J${totalExpenses.toLocaleString()} out</div>
      </div>

      <div className="stats-grid">
        <StatCard label="Income"   value={`J$${totalIncome.toLocaleString()}`}   icon={DollarSign} color="#00f5c4" />
        <StatCard label="Expenses" value={`J$${totalExpenses.toLocaleString()}`} icon={DollarSign} color="#ff4d6d" />
      </div>

      {monthlyData.length > 0 && (
        <div className="card">
          <div className="card-title">Monthly Overview</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" />
              <XAxis dataKey="month" tick={{ fill: '#4a6080', fontSize: 9 }} />
              <YAxis tick={{ fill: '#4a6080', fontSize: 9 }} />
              <Tooltip contentStyle={{ background: '#0d1425', border: '1px solid #1e2f52', borderRadius: '0.75rem', color: '#e8f0ff' }} />
              <Bar dataKey="income"   fill="#00f5c4" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#ff4d6d" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="row-between">
        <div className="tab-group">
          {['all','income','expense'].map(t => (
            <button key={t} className={`tab-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={14} /></button>
      </div>

      {filtered.length === 0 ? <Empty text="No transactions yet." /> : (
        <div className="list">
          {filtered.map(f => (
            <div key={f.id} className="card lead-card">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{f.description}</div>
                <div className="muted small">{f.category} · {f.date}</div>
              </div>
              <div className="lead-actions">
                <div className="mono" style={{ fontWeight: 700, color: f.type === 'income' ? '#00f5c4' : '#ff4d6d' }}>
                  {f.type === 'income' ? '+' : '-'}J${Number(f.amount).toLocaleString()}
                </div>
                <div className="row-gap">
                  <button className="icon-btn" onClick={() => setForm(f)}><Pencil size={12} /></button>
                  <button className="icon-btn danger" onClick={() => onDelete(f.id)}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form !== null && (
        <FinanceModal data={form}
          onSave={d => { d.id ? onUpdate(d.id, d) : onAdd(d); setForm(null); }}
          onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function FinanceModal({ data, onSave, onClose }) {
  const [f, setF] = useState({
    type: 'income', description: '', amount: '',
    category: INCOME_CATS[0], date: new Date().toISOString().slice(0, 10), ...data
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const cats = f.type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  return (
    <Modal title={data.id ? 'Edit Transaction' : 'New Transaction'} onClose={onClose}>
      <div className="tab-group" style={{ marginBottom: '0.5rem' }}>
        <button className={`tab-btn ${f.type === 'income' ? 'active' : ''}`} onClick={() => set('type', 'income')}>Income</button>
        <button className={`tab-btn ${f.type === 'expense' ? 'active' : ''}`} onClick={() => set('type', 'expense')}>Expense</button>
      </div>
      <Field label="Description">
        <input className="input" value={f.description} onChange={e => set('description', e.target.value)} placeholder="e.g. D&D Wholesale setup fee" />
      </Field>
      <div className="grid-2">
        <Field label="Amount (JMD)">
          <input className="input" type="number" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="45000" />
        </Field>
        <Field label="Category">
          <select className="input" value={f.category} onChange={e => set('category', e.target.value)}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Date">
        <input className="input" type="date" value={f.date} onChange={e => set('date', e.target.value)} />
      </Field>
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
        <span className="section-title" style={{ fontSize: '16px' }}>{goals.length} Goals</span>
        <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={14} /> New</button>
      </div>

      {goals.length === 0 ? <Empty text="No goals set. What do you want to become?" /> : (
        <div className="list">
          {goals.map(g => {
            const progress = Math.min(100, Math.round(((Number(g.current) || 0) / (Number(g.target) || 1)) * 100));
            const level = Math.floor(progress / 5);
            return (
              <div key={g.id} className="card">
                <div className="goal-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{g.title}</div>
                    <div className="muted small" style={{ marginTop: '2px' }}>
                      {g.category}{g.dueDate ? ` · Due ${g.dueDate}` : ''}
                    </div>
                  </div>
                  <div className="row-gap">
                    <button className="icon-btn" onClick={() => setForm(g)}><Pencil size={12} /></button>
                    <button className="icon-btn danger" onClick={() => onDelete(g.id)}><Trash2 size={12} /></button>
                  </div>
                </div>

                <div className="goal-level-label">
                  <span className="mono small" style={{ color: 'var(--cerulean)', fontWeight: 700 }}>Level {level}/20</span>
                  <span className="mono small muted">{g.current || 0} / {g.target || 0} {g.unit || ''}</span>
                </div>

                <div className="level-blocks">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className={`level-block ${i < level ? 'filled' : ''} ${i === level - 1 && level > 0 ? 'current' : ''}`} />
                  ))}
                </div>

                <div className="progress-bar-wrap" style={{ marginTop: '0.5rem' }}>
                  <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="mono small muted" style={{ marginTop: '4px' }}>{progress}% complete</div>

                {g.notes && <div className="muted small" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>{g.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {form !== null && (
        <GoalModal data={form}
          onSave={d => { d.id ? onUpdate(d.id, d) : onAdd(d); setForm(null); }}
          onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function GoalModal({ data, onSave, onClose }) {
  const [f, setF] = useState({
    title: '', category: GOAL_CATS[0], target: '', current: '',
    unit: '', dueDate: '', notes: '', ...data
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={data.id ? 'Edit Goal' : 'New Goal'} onClose={onClose}>
      <Field label="Goal Title">
        <input className="input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Get to 10 retainer clients" />
      </Field>
      <div className="grid-2">
        <Field label="Category">
          <select className="input" value={f.category} onChange={e => set('category', e.target.value)}>
            {GOAL_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Unit">
          <input className="input" value={f.unit} onChange={e => set('unit', e.target.value)} placeholder="clients, JMD, pages..." />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Target">
          <input className="input" type="number" value={f.target} onChange={e => set('target', e.target.value)} placeholder="10" />
        </Field>
        <Field label="Current">
          <input className="input" type="number" value={f.current} onChange={e => set('current', e.target.value)} placeholder="1" />
        </Field>
      </div>
      <Field label="Due Date">
        <input className="input" type="date" value={f.dueDate} onChange={e => set('dueDate', e.target.value)} />
      </Field>
      <Field label="Notes / Why this matters">
        <textarea className="input textarea" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
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
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
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
