// src/BackupPanel.js
// Backups: set the password, back up now, and send a backup somewhere online.
// Every backup is one encrypted file; see electron/backup.js.
import React, { useState, useEffect } from 'react';

const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
const size = n => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export default function BackupPanel({ api, onMake, onClose, toast }) {
  const [st, setSt] = useState(null);
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [cur, setCur] = useState('');
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => api.status().then(setSt).catch(() => setSt({ ok: false }));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const savePw = async () => {
    if (pw !== pw2) { setMsg('The two passwords are different.'); return; }
    setBusy('pw');
    const r = await api.setPassword(pw, cur);
    setBusy('');
    if (!r.ok) { setMsg(r.error); return; }
    setPw(''); setPw2(''); setCur(''); setChanging(false);
    setMsg('Password saved in this Mac\'s Keychain. Write it down somewhere safe away from this Mac: without it no backup can be opened.');
    load();
  };
  const now = async () => {
    setBusy('make'); setMsg('');
    const r = await onMake(false);
    setBusy('');
    if (r?.ok) { setMsg(`Backed up and checked. ${r.online ? 'It is in iCloud Drive, so it\'s online.' : 'Saved in Documents (iCloud Drive is off).'}`); load(); }
    else setMsg(r?.error || 'The backup failed.');
  };
  const act = async (kind, file) => {
    setBusy(kind + file);
    const r = await api[kind](file);
    setBusy('');
    if (kind === 'verify') setMsg(r.ok ? `Opens fine: ${r.records.toLocaleString('en-US')} records, taken ${new Date(r.exportedAt).toLocaleString()}.` : r.error);
    else if (kind === 'email') setMsg(r.ok ? 'A new email to jcommerceandtech@gmail.com is open in Mail with the backup attached. Press Send.' : r.error);
    else if (kind === 'saveCopy' && r.ok) toast('Copy saved');
  };

  const setting = st && (!st.hasPassword || changing);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-tall" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-handle"/>
        <div className="modal-head"><h3>Backups</h3><button className="btn-ghost" onClick={onClose}>Close</button></div>
        <div style={{ display: 'grid', gap: 12, padding: '4px 2px 8px' }}>
          <p className="muted" style={{ margin: 0 }}>Each backup is one encrypted file holding everything in the console: a readable Jcommerce document and the raw data. It opens in any web browser on a computer, and only with the backup password. A backup also runs by itself once a day while the console is open.</p>
          {!st ? <p>Checking…</p> : !st.ok ? <p>Backups need the Mac app.</p> : (<>
            {!st.canEncrypt && <p style={{ color: 'var(--red-500, #c33)' }}>This Mac can't keep the password in its Keychain right now, so backups are off.</p>}
            {setting ? (
              <div className="card" style={{ display: 'grid', gap: 8, padding: 12 }}>
                <b>{st.hasPassword ? 'Change the backup password' : 'Set a backup password'}</b>
                <span className="muted">At least {st.minPassword} characters. It is kept in this Mac's Keychain so daily backups can run. Write it down somewhere safe away from this Mac: if it's lost, no backup can be opened, and nobody can recover it. Changing it doesn't change older backups; they still need the old password.</span>
                {st.hasPassword && <input className="input" type="password" placeholder="Current password" value={cur} onChange={e => setCur(e.target.value)}/>}
                <input className="input" type="password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)}/>
                <input className="input" type="password" placeholder="New password again" value={pw2} onChange={e => setPw2(e.target.value)}/>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" disabled={busy === 'pw' || !pw} onClick={savePw}>{busy === 'pw' ? 'Saving…' : 'Save password'}</button>
                  {st.hasPassword && <button className="btn-ghost" onClick={() => setChanging(false)}>Cancel</button>}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-primary" disabled={!!busy} onClick={now}>{busy === 'make' ? 'Backing up…' : 'Back up now'}</button>
                <button className="btn-ghost" onClick={() => setChanging(true)}>Change password</button>
                <span className="muted">{st.last ? `Last: ${ago(st.last.at)}` : 'No backup yet'} · daily {st.lastAuto ? ago(st.lastAuto) : 'not run yet'}</span>
              </div>
            )}
            {msg && <p style={{ margin: 0 }}><b>{msg}</b></p>}
            <p className="muted" style={{ margin: 0 }}>Saved in {st.online ? 'iCloud Drive (online)' : 'Documents'}: {st.dir.replace(/^\/Users\/[^/]+/, '~')} · {st.count} backups</p>
            {st.files.map(f => (
              <div key={f.path} className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px' }}>
                <span style={{ flex: 1, minWidth: 200 }}>{f.name.replace(/\.html$/, '')} <span className="muted">· {size(f.size)}</span></span>
                <button className="btn-ghost" disabled={!!busy} onClick={() => act('email', f.path)}>Email it</button>
                <button className="btn-ghost" disabled={!!busy} onClick={() => act('saveCopy', f.path)}>Save a copy</button>
                <button className="btn-ghost" disabled={!!busy} onClick={() => act('verify', f.path)}>Check it opens</button>
                <button className="btn-ghost" onClick={() => act('reveal', f.path)}>Show</button>
              </div>
            ))}
          </>)}
        </div>
      </div>
    </div>
  );
}
