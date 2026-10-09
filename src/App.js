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
const EXPENSE_CATS = ['Hosting','AI API','Tools','Transport','Food','Education','Bills','Personal','Other'];
const INCOME_CATS = ['Setup Fee','First Deposit','Second Deposit','Monthly Retainer','Completion Fee','Freelance','Wages','Allowance','Gift','Other'];
// The size of a transaction, always positive: the direction comes from its
// type, never from the sign. Tolerates text like "1,500" from older entries.
const amountOf = f => {
  const raw = f?.amount;
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) / 100 : 0;
};
const isIncome = f => f.type === 'income';
const signedAmount = f => (isIncome(f) ? amountOf(f) : -amountOf(f));
// Work money or personal money. An explicit choice wins; otherwise anything
// tied to a client or venture is work, and everyday categories are personal.
const PERSONAL_CATS = new Set(['Transport','Food','Education','Bills','Personal','Wages','Allowance','Gift']);
const scopeOf = f => (f.scope === 'work' || f.scope === 'personal') ? f.scope
  : (f.ventureId || f.pipelineLeadId) ? 'work' : PERSONAL_CATS.has(f.category) ? 'personal' : 'work';
const SCOPES = [['all', 'All money'], ['work', 'Work'], ['personal', 'Personal']];
// Debts: money you owe ('owe') and money owed to you ('owed'). Each keeps its
// own list of repayments. `cash` says whether cash changed hands when it began
// (a loan did; an unpaid bill or a job done on credit did not).
const debtPaid = d => (d.payments || []).reduce((t, x) => t + amountOf(x), 0);
const debtLeft = d => Math.max(0, Math.round((amountOf(d) - debtPaid(d)) * 100) / 100);
const debtScope = d => (d.scope === 'work' ? 'work' : 'personal');
// What debts have done to the cash in your hand. Borrowed cash came in and your
// repayments went out; lent cash went out and their repayments came in. None of
// it is income or spending, so profit is never touched.
const debtCash = debts => debts.reduce((t, d) => { const sign = d.direction === 'owe' ? 1 : -1; return t + (d.cash ? sign * amountOf(d) : 0) - sign * debtPaid(d); }, 0);
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
const LOGO_B64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAH0AfQDASIAAhEBAxEB/8QAHgABAAEFAQEBAQAAAAAAAAAAAAgEBQYHCQMCAQr/xABdEAABAwMCBAIHAgcHDgkNAAAAAQIDBAURBgcIEiExQVEJEyIyYXGBkaEUFSNCUmLBU3KCorGy0xYXGCQlM0NlkpWztMPwJkRWZHN2g5TSNDU2N0VGVWZ0hKOkwv/EABwBAQACAwEBAQAAAAAAAAAAAAAFBgMEBwIIAf/EAEMRAQABAgMEBggCBgoCAwAAAAABAgMEBREGITFxEkFRYYGRBxMiMqGxwdEzQhQVI1Ji0hYXJDQ1Q3Ky4fBEglOSwv/aAAwDAQACEQMRAD8A6egAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADE9z6LcGv0nNT7ZXWlt989bG5ktS1qtWNF9tqczXIiqniqKR11LeeMrSFO6qutXU1FM1es9DR0dUiJnurWR8zU+adET7M9qx62N1URPZKEzTO6cqq0rsXK4016VFOsRz3pbAgX/AGS297Hujl1pK17Fw5rrfSIrV8lRY+h+P4l97V93W6p8qCm/ozY/Vt6exWZ9JOURumi55U/zJ6ggS3iX3tX/AN93/wCb6b+jPT+yW3qxn+rd3/cKb+jH6tvdx/WTlH7lflT/ADJ5AgYnEvvV/wAtn/5vpv6M9E4ld6v+Wrv83039GP1be7n7/WRlH7lflT/MneCCX9kpvUq/+mrvrb6X+jLrY97eIvU1R+C6fu1fcZlcictNa4HYRe2VSJUT6icuuxvmY83u16Q8tv19C3auTPZFMT/+k2AaA0PbuLOqv9tqtV32ipLSyoY+shnZSOfJCi+01EiYqoqpnHtJhV+Bv8066OhOmsTyW7L8dOPtzcm1Xb7q40mfDWQAHhvgBS1NzoqVeWSZFd19lvVTBiMVYwlHrL9cU09szpHxeqKKq50pjWVUDH6jU8nVKenY1PBXOyv1ToifaWue/XV//G1Rv6qIn3omSoY3b/J8JPRoma5/hjd8dPhqkLWVYi7x0jmzTKJ3Ph08LPemYnzchr+asmkXMs0j1+KqUyvfJ7LGcy/BFUr1fpPpmejZwsz2a1cfCKW5TkVX5q4hsZa2jb71VCn8NAlbRr0SrhX+GhrZ1Dc35cy31K/9ip4SUVzRPat1Un/YvMM+kjMI3/oM6c6v5WaMjsz/AJ0fD7tptnhf7kzHfJyKfZpqodLCvLK17F+KKh4pdq+k9qlrpokTsscitT7DHT6Wrduvo4jCTHKr6TTHzZP6M1VRrbuRPg3WDTsOv9T00ictx9ajeqtlY1yL88Iq/eXuh3bVHI25WlFb2V8Miov+S5ML9HftJ/A+k7IMXV0bldVuf4qd3nTr8dGpe2dx1uNaYiqO6fvo2OCwWnXWmLy9Iaa5NjlXtHMnIq/JV6O+iqX9FRUyil4wmOw2Pt+twtymuntpmJj4Ia7ZuWKujcpmJ79wADaYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGsN3thdJ7nUFRVxUkNv1AjVdDXxNRqyOROjJui8zV6Iq45kTt5LBC/2i5aZvVbYLxAsFbb5nU8zFX3XIvf4oq9UXxRUU6fEKONOxR2vce2Xynp2xtu9uT1r0b78sTlYuV7+46NOip5r4Eplt+qK/VTwly/0h5DYnC/rS1T0a6ZjpaR70Tu39+um/snk0W2U9EdzFvbNg9mTkz0XG9VbnH5x9sd0KRJW+YWpaz4+J5eZlvLh+2PdubWyX2/8ArYdP0MiNcjejquTCL6trkTCNTplUwvZPEmXZLBZdNW+O02C101BRxe7DBGjWp8endfipjezWm00ntfpyzK1GytoY55+mPysqesf9jnKn0MzK7ib9V+uZmd3U+kNlsisZLgaIin9pVETVM8dZ4xyjh8eIAfjnNY1XOVEREyqr2RDWWZ+lDX3eloUVvMkkqJ0Yi9vmvgWi76jc/mgt7la1Mo6Ts5V+Hwx4/YY++ocqqvNlV6rk5ptHt/awVU4bLtKq+urjEcu3nO7mmsHlNV327u6Ozr8exda69VdYisdLyMXpyM6IvTGFXxLetRy/nFK+fB5I6apmbBDE6WR/RrE6qq+RybGZpjM1uxVeqqrqq3RE755RH2T9rDW7FO6NIVL5/BC4UGnrlcMPe1IIv0pE6/Rvj1+ReLFpiGhjbPXtbNU+9herWeWPNfiX46Vs/wCjyKqYxGbzOs/kif8AdP0jzQuLzbSehh/P7LRR6XtVK38rEtQ7vzSefyToXSGCGnYkcELI2p4NaiIfYOm4TLcHgKejhbVNPKI+fGULcvXL063KpkABusTzqKWmq41iqqeOZi92vajk+8x+6aA0/cWfkYFo3p1R0K4T6tXpj5YMkBH47KsDmdE0Yy1TXHfET8eMeDPZxN7DT0rVUxylpnUegL7ZEfVQMWupWr78KLztb5qzv81yv0MNnnVuUVOVU7oSYMD11tlSX1klzsjI6a4o1VVmESOdc59ryVV8ftOQbVeiynoVYrJJnWP8uZ/2zx8J49q0ZZtHM1RbxnD977x9ml5J8KvtF3smv9S6edG2guLnwMX/AMnmw9iovhhccvXyVMGO1sVTQ1MlLVRPimic5kjJPZVF8UUpnTYOOYTH43KMR08PXVbrjdOk6TymPpK4XcPZxVvo3KYqplvrS279hvSspLvi21blVuXuzC74o9e2fj9qmetc17UexyOaqZRUXKKhD+SoQlFt+5XaJsjlVVzRRdV/en0D6PNs8btHVcwmNpiZojWKo3a79NJjhr3xpyUXPsotZfFN6zO6qdNOzxX8AHUVaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAi1x20bFsmk7ny+3FVVUCuz2a9jF//AJ8c48skpSMXHe1f6iNOPz0bc3p9sZtYKdL9Ks7ZUxXkeIieyP8AdCHCTdT1ZNgtaS5/OPRs+PzixvnHRdFqOnvHzSzLLXwUyp0kmazHzciFufU4/OKvTz0n1LaadUykldTt6fGRp5r4MlmjpXaI7Zh1fpYW09NFAxMNjjaxPkiYPQAqj6w4Px72xsV73I1rUyqquERDDr3qB1a9YKdVbTtXov6XxXyT+Tup96qvvrnuttM78mx2JV/TXwT96i9F+PQxt8nM33jjO3e2VVVyrK8DVpTG6urtn92O6Ovt5cbJlWW6RF+7HHh3d6ofMeD5+vc8Xyng+T9Y5HXcWWm291dJM9Iokc571RrGN7uVTP8ATlgjtMCTTtR1XKntu6ewi9eVPh5+alq0TY+Vv46qo/acmIEcnVE8X/BV/wB+5lx3PYDZWnBWKc0xka3Ko9mJ/LE9fOfhHNU83x83K5w9ufZjj3yAA6eggAAAAAAAAAAYBupoFNR2914tUCLdKVueVqdZ2Jj2f3yY6efbyxHqZXNc5rsorVwqL4KTENA746KbY69up7bFy0de9UnYxuGxTdOvTwdhVx+knxOLek/ZCm7bnO8HTpVH4kR1x1Vc44T2xpPVK4bNZrNFX6HdndPu8+zxarqJsIpK3bVVdoGwKvdaCL+aRFmmauepLnbP/wBX+n//AKCL+aQ3od/xDE/6I/3N3a3+72+f0ZMAD6CUIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACMnHovLtzYXeV3T/RuJNkXfSAO5NtbCv8Ajj/YvNrBf3ilXdrY1yTER/D9YQgbP+sfTagtjZz1bLksdT5z0Vzps+JedASo/cPS8T25a69UKKnmizsb1Qxh0uPEve3c+NyNKOVFVG3uh6J3/v7PAw3p9iW1gKP7Xb17Y+brkWvUd1/Fdvc+N7Unk9mNF+9cf79VQuhrfVV4/GF0kbHIjoYPybMJ0ynf59fL4HLNs88/UeV1XLc6XK/Zp7pnjPhHx0fWuV4P9MvxTPCN8ra+Rc5VcqvVVU8XznlJKU7pz5juXZmdZX+mh7vnwe9mpJbxdILczPK9yK/GVRGJ7yrj4dl81QtMk2V94zzbG24gqrw9Osrkhj+SdVX70T6L5k/sflU55m9rD1+571XKnfp47o8WnmWI/RMLVcjjwjmzeKNkMbIYmo1jGo1qJ4InY+gD6oiIiNIc7AAfoAAAAAAAAAAAWvVFgpdUWCtsNZlI6uJWcyd2u7tcnyVEUugMd6zRiLdVq7GtNUTEx2xO6YeqapoqiqnjCCd3ZPbq2e3VKOZPSyPie1ye69q4UmHtavNt1p1fO3xfyEeeJTT7rJrv8axsa2nvUKTtVP3ViIx6fPoxfjkkDtE7n2z027/mEZxz0e5VVku0OOwVX5I0jvjpRpPjGkrjtBiYxmXWL8dc/HTey4AHZ1MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAi16QVUbtlYVX/4yn+ieSlIrekLXG2NgXP8A7Y/2LzZwf49Kv7VRrk2I/wBP1hAr1p6Nl6FDzn22XPiWR89dBVOmyXzbmo9XuRpSRUV3LfKBVRO/SpZ9pjD5C87eVKQ7jaVmXLkjvdvd0+FQzp95gv7rdTcwFvXF2574+bsBe678W2qprE95jF5fmvRDUMsqMVVRepn24tasNvpqRF/v8iud8Uanb7VT7DWs8p8telTMZv5lRg6Z9m3TGvOrfPw0fZezmH6Nmq7P5p08n1JPkpnz/E85JfiUks36xyqalniFRJUY6ZN5aYo20Gn6Cma3lxC1zun5zvaX71NCW5i190o6FydKidka/JzkahI5ERqI1EwidEOz+iHBxVOJxtUb9KaY8dZn5Qqu1FyaYt2ec/8AfiAA7aqAAAAAAAAAAAAAAAADV+/e2l43EsVAunkhfcLdUOckcsnIkkT0RHoju2UVGrhei4VDM9C2Gp0vo60afrJGST0NIyGVzFy1XInXC+PXx8S+gjrWVYazjq8xoj9pXEUzv3aRw3dvDybVWMvV4enCzPsUzMxzkABItUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKfpEHcu2Gn1/xz/snErCJ/pFncu12n1/xz/snGzg/wAelA7TxrlF+P4frDn6sn6x9MkKP1h9tkLDq4H6tUukLvoV+NwdMr/jmh/08Zj6y9C66ElX+uDppE7reaHH/eGGDE1fsqm3l9v+1W+cOru6FY1LhS0uerIVf37ZVf2NX/fqmv56jPiZFubWPdqueJV9mKKNiJ/BV2e3xXrnHUwmep6+8fGu3WInE5/iZ7J0/wDrEUvtXJLfQwVvX/u9USVP6xRzVJTSVPxKSao6dynSmYhkuhVWs1raIUT/AIyki/Jqc3wzjBI4jhtG/wBbuFbU/RbOv/41JHn0P6JrdNOTXLkcZuT8KaVF2pqmcXTTPVTHzkAB1FWgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKPpGfVJtHYXuVEkS/sRvXryrBLn+RCVxEn0jyo3azTrl7fjvH19S82ML+NTzQu0f+FX+X1c81kPxJDwc/qfCP6lgcKi2qXyqXfQT0/rhaYXv/AHaof9YYY+55edvXK/cbSje6LfLf/rMZq4j8Kpu5fb/tNvnDp5uhK5NZVyYX3YkTPZfYQwmefqZhu/zw62qs5RskUL2/FOXHT6ovzwa/nlz4nxftdExnmLpnrrq+b7SyiIqwNuY7I+T9lqFyU0k+UPN8uclNJLjxK50UqzXaCqSPci0ovaRZY+v/AETyTxETb2tWl13YpUdhfw+KNVz2a5eX7+qdSXZ9Ceie5E5RctdcV6+dNP2ULauiacXRX20/WQAHUVXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIl+kjVrdn7A5XKjv6oGIiZ6Y/B5s9PsJaER/SUsj/rO6fmVuXt1FGxq+SLTzKv8iGbDfi080Rn8a5bejuc5XSHyknX3inc8/EkJ9xPoql0nQv+12Jd1dGRPTma/UNtR3XHepYYu95kW1D1/rt6J/6yWxf/ANuIwYj8Kpu5dRpiaOcOp+/dKkN3t1xwv5amdEvfqrHZT+cnbK9fLKpqCol69zfHEBan1GnaG8R9fwKodFImcexImM/HDmtI8VM+PE+R/SPhJw20N2rTSK4pqjyiJ+MS+vtnLkXMBTHXEzH1+r9knKSWp/WPCSp69yjmqOvco+if0XGhusltr6e4xe/Syslb/Bci/sJwUNXDcKKnr6d3NFUxMlYvm1yIqfcpAV9R+sTB2L1KzUu3Fueq/l7fzUMydusfROn71WnYPRLjotYi/gap31UxVHOndPwmPJUdrbHStW70dUzHhO9n4AO5KMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARG9Ja7l2XsC/wDzJD/q85Lkhp6TqVI9rtKt5lRXXt2E8FX1Dv8Af6mbD/i080Tns6Zdd5fVzndJk+UkyUrpD6ZKTmrj3q1UrkVDKtnmrPvDoSBOqv1PbE+2pYYY6Uzrh7Z+G8QG3MGOb/hRbHL8UbUMd+wxXZ9iW3l9rXEUR3x83ZXXNiXUuk7nZmLiSaBViXykb7TPvRCGNXO7PRfHCp8SdZEDfLSy6Q1xVNgg9XQ3H+2qbHuoj19tETCp0dzYb5KmDgvpWyiq/Ys5lbj3PZq5TvjynXzfTeyeLim5Xhap97fHOOPw+TAJZuvvFDNUORfePieo6lvqKnqvtHEaKF5VElXjxNz8LGvW2zVlVpGuqmsp7xGj6dHdE/CGZ6J4JzN5u3fCeJoGWp/WFtvtZZLnS3i2zLDVUUzZ4ZE8HMXLV+RPbPY6vJswtY2n8s7+U7qo8YaeYYSnG4auzPXG7nHB0uBjG2uurduNo636ot8rFdPGjamNv+BqERPWMVF6phfuVDJz6osXreJt03rU601RrE90uS10VW6porjSYAAZXkAAAAAAAAAAAAAADSHFfxS6W4YNCNvtfTx3TUFyVYrPaPW8i1DkxzyPXqrY2ZRVXuqqjU6rlP2ImZ0h5qqiiOlVwbvBprhM33vPEZs9Sbk3zSP4gqZqyopPVxyK+CoSJyJ62FV68mVVvXs5jjcomNJ0kpqiuIqjhIAD8egAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGlNQcZXDppjVc+jbvuFEy4UtQ6lqHR0s0kEMrVVHNdK1qtTCpheuEN0QTw1UEdTTytkilYj43tXKOaqZRUXxRUP2aZp4wxW79q9MxbqidOOk66PsAH4ygAAAAAQj9KTUsj0DoinV2Fku9Q/GfBsKZ/nITcIA+lZvDYqTbuzdMvkuNT9E9Q39pnw34tKJzzfl9yO6PnCAnrW+YSUt6VGV949WSoS+rl02tFb63KG4uDe3Ou/E5oGnbHz+puS1PLjPSKKR6r5pjlz1zjHyQ0ksmCRno96CW4cU2m5Yo1clDR3GqkXHZn4O+Pm/y3onbx+zDfn2Jlv5VZ6WLtx/FHzddjW2/G36630bJUW+mSW7WnNRSYXCvb09ZH5dWplM+LUNkgreYYGzmWFrwl+Naa40n7844x3uvYe/XhrtN63O+J1c3qmpRFTlXOO5bKiq/WN2cT21E2jr0usbLTr+JLtKqzNY3DaSoXu3v2euVb0xn2e2CP8sq4U+YczyW9k2LqwmI40zuntjqnlP/AA6xgsZbx9iL9qePHul6y1HfrgoZqrC9HHzI9yqUsjjBRbhsTVo3Bw671v2u1X+B3mZ66eu7mRViKrsU71VMToiIuVRFVHJ1VU+KIhPmnqIKyniq6WZk0MzGyRyMdlr2qmUVFTuiocoFd1JJcNXEpFo9sOgteVSpZnuVKKvdlVo165Y/p/e84TKZwuc4RUx1PYnaaMJpl2MnSifdnsnsnunt6p7uFQ2gymb2uKsx7XXHbHbz7U0QfMM0VREyeCVkkcjUcx7Fy1yL2VFTuh9HXlIAAAAAAAAAAAANVcQfEjt1w6aTff8AWNe2a4TtclttEEifhVdImOjUX3WplMvXomfNURXB+TMRGsrrvlvfojYDQFbr7XFcjIYWrHR0jF/LV1RyqrIYk8XLjv2RMqvRDi5rTWO6vGdv3Tula+qvWpaxlHbLfE5yw0NNnKMYi4w1jOZzl6L0cruq9KHiI4htf8RWtJNWa2rOSCFVZbbbEuKehhyq8jGquVdj3nKi8y4VVREREnj6MDhdk0tY38QmtbejbpeoVg09FIio6no16Pnx0RPW9m9Mo1FX8490VREdKERcuVY67Fqn3Y4pr7W7d2Labbywbc6aiVlvsNEyljVy5dI5Or5HL4uc9XOX4uUykA8JeIiI0gAAfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGq+J3deHZzZfUOrWVqU1zkp3UFpXGXLWytVI1RP1er/kxTahz49KFuJM+76S2tgTlgp6eS+1Tv03vV0UTe35qNlVUz2enkhlsUesuRSjs2xU4PB13Y46buc7kFquqmqpZqqpldJLM9Xve5cq5yrlVVfNVO3mydUlbs1oSr51d63TVscrlXKqv4NHk4eSK5Uwdg+CHUcmpeGPRlTOuZaKGe3u6/uE8kbf4rWm7jo9mJVPZC5peuUT1xr5T/wAt6AAjV9AAAAAA5h+lUuss27+krTzL6qj06sqNXtzSVEmV8v8ABt+w6eHIz0jWo4NQ8Td0oKeTnZYbfRW9+MKnOsfrXp9PXInTsuTZwn4sShc/uRRg5ieuYhFtJHeZ9tlcihYv1T89WpKKBul6+vcqk5/RV6cjrdwdaavfCiut1ohoI3491Z5UevhjqkCeS9yCKt6HVf0Y23iaY2KrdbVDE/CtX3SSZjv+bU/5Fid/3RJ1/hGriqtLcwmshw/rMbTV+7Ez9PqmAACMX9Q3yyWvUdpqrHeaRlTRVsSxTRPTorV8vJU7ovdFRFQgLvZs3edpb8sUiSVVkrHKtBW4XDkVc+rfhERr07rhcORObHgnQgtmpNNWTV1mqdP6ht8VZQ1bFZJG9Psc1e7XJ3RU6opW9pNnLG0Fjoz7Nyn3avpPdPwS+UZtXld3XTWieMfWO9y7e4p5HYX4G6d8uHHUe180t7saTXbTbncyVCMRZaTqqtbK1O6InT1iIidkwaNlk+JwvG5XicrvzYxVOlUeUx2xLoFnGWsXbi7YnWJfr3oeTpsHk+Q8HyHmi0x13G7dluKTVW1Hq7Jc4XXrTmVxSSScs0GVVeaF69sqvVjuny7rODb/AHR0PudbEuej77BV4TMtOqo2eBfJ8a9W/wAnxOVT5PM+7bqC8aeuEN2sN1qqCsp3c0U9NKsb2r8HJ/IX3I9qcTl1MWb3t0dWvGOU/SfDRXMwyq1iJ6dHs1fCXX0HP/QXHfuRpmBKLWNrpNUwtVEbM534LUImF7ua3Dk6dcsyhvvTHHNsdeqdjr3WXOwTqmXR1VE+VufJrokdn6oi9ex0PCbQZfjI1puaT2Tu/wCPirV3A37M76fJIUGv7LxA7Kahax1r3NsLlk7Nmqkgf8lbJyqi/BUL+3cbb5zeduutPK1eufxnD/4iVpv2q41pqifGGtNFUcYZCDB7vvns5Yo1luu52m4GomV/ujG5fsaqqa51Fxz8ONhjlWDWFVd5Y8/kqC3TO5vk+RrWLnHg4814qxb96uI8YIoqnhDfxS3O62yy0M1zvNxpaGjp2q+WoqZmxRxtTurnOVERPmQM3C9JtcpIqmj2228hpXORWwV92qfWOTKL7XqI0Ttj9JyfPssQN1d9N094altRuFrGtujIs+qpcpHTQ+athjwzKoqpnlXOFRehpXM2w9O63PSkmmY4pu8RvpItLaXpajTexbI79d3Mcx15mYqUVKucZjavWZ2UXqqIzqi5cmUOaev9cas3D1BWar1rfqu73WtfzzVNQ9XOXHuonRMI1OiNRERPBERD8qV5kUlJwk8BOo956yh15ubTVFn0M1yTRxL+TqLsjXKnIxM80cfRcyKiKqLhnTqY7N67i69/Bo3oqu+zTxWHgW4MLjv1qWHcPXdBJBt/Z50yj0Vq3eoYuUij8eRFX23p0X3UTvjsFTU8FHTxUlLCyKGFjY442JhrGomERE8ERCksFgsulrLRac07bKe32y3QMp6Wlp2IyOKNqYRqIhXkvTHRjRmsWKbFOlIAD9Zg/HPaxURy4Vy4T4qU9xuVJa6Zamrk5W5RrUTqrnL2RE8zzt7KiZEr66NGTSJ7Mf7k1fzc+K+amvViKfW+po31cZ7o7Z59XbyiXvoT0enPBWgA2HgAAAAAAAAAAAAAAAAAAAAAAAAAAA5B8cer/wCq3iU1Y5j1WC0SRWmJFx09TG1H48er+fv8MZwdfDiJxHVCrv1uGmVymprinfOP7YcbuB09ZMyq21ldUYWiiOur5Q19JJleY6O+i+3GbdNFao2xqV/LWOsZc6ZVdnmhqG8r2on6r48r8ZDmwsmVwbh4UN6WbGb2WbVdxq5obHUq6gvLY2c6uppW4yqZRV5HpHJ078vRPA28RR6yiYhWckxEYPGU11Tu4T4u0oPmKWKeJk0MjZI5Go5j2rlHIvVFRfFD6Id08AAAAAfMkkcMbpZXtYxiK5znLhGondVU4Xb06pp9ebr6v1tSuV9PerzVVcDl7+qdIvJ/FwdXeNTdmk2p2GvsjXNddNRxOsdui5sKr5mqkkmEXOGR87s9s8qLhFOOkjuZvL5G/gqZiJq8FM2pxUdKjDx1b5+UKVWZHIiIfYXsbyo6vW0WS5aivFFYbRSyVVbcJ46Wnhjblz5HuRrURPmp3d2y0La9stvtP6Bs0bW0tjoIqNqomOdzW+29fi53M5fiqnOT0bmxdRrDcmXd2800zbRpFESgV0S+rqa6RjmphXJhfVtVXqidWq6P5HUEjcXX0qop7F92bwk2rE36uNXDlAADUWQAAH45rXtVj2o5rkwqKmUVPIjjvDwc6a1a6e+7e1Edhuior3UatVaSd+c9PGFVz+b7P6viSPBo4/LcLmdr1WKoiqPjHKepnw+Ju4Wvp2p0lyv1/tlr3baufb9X6bqaPC+zUIxXQSp4csjctd265XKdFXCmFyTtQ693K2W680M9ru1DBWUdSxY5oJ40fHI1e6OavRUNCbgcEm0esJFrLAtbpaqwvSgVskDlVc5WKTOP4DmlCx2wldE9PB16x2Tunz4fCFgs5/TXGl+nSe2N8eTnpJPlTwfKSV1ZwF7sWmeV+lrpZb7Soq+rRZnUs7kXzY9FYn+Wv7DTWotjt5dMzPgu+2Oo05MqssFulqIkTz9ZGisXw/O6fNCAvZJj8JP7W1OndGvybf6dYuR7FerBpJCmklKm4W28W5yx3C2VlM5O6TwPjVPtQtrpU7KqHmixVTumGG5XEkkmU94pZJF/SPt7kxnJ8x0VdWuRlFSTVDl/co3PX7kN61ameDTruSopZsZy4t88rlVfaM3tOze72p5WxWDbLVNaj1wj47VN6v6vVvKn1X+U25pP0fHEDqX1U94prLp2nkVFctdWq6VrVRVVfVwo/r29lVTx7ZUl8Nl9+77lEyj7l2EW6l5ftvdotyN3ryyx7f6TrbrO5/LJKxipTwp0w6SVyIxiL4qq4RVwiKdFNt/RxbSaYqILnru7XDVtVGmXUz0Smo1d8Wt/KO+r8L4oSh0zpXTWjLPDp/SdiobRbadMR0tHA2KNvTGcNTqvRMqvVSyYTJq6fxZ0ju4tKurpIkcOno6tG6FdTar3jWm1NfGsa+O2JlaCjenZfD1zkTp7ScvwXuTLa1rGoxjUa1qYRETCIh+gn7dum1T0aIY4iI4ABRXG8221t5qyqY13gxFy5fofl+/aw1ubt6qKaY4zM6RHjL3RRVXPRpjWVaWe96mobQixNVJqlfdjavb5r4d+3cxm762rq17qe2tWCLOOZP749Mfd9MlfpjSSsc253ePMmUdHE7rhf0nIvZ3hjJSbu1N7OcROAyCnpT+a7MexTHbHbPZ8phK05fThaPXY3d2U9cqyzWqsuNU2+372pE600KomI2r1Rcef2+fyyMAtuX4CjL7Xq6Zmqqd9VU8ap7Z/7ujdCOv3qr9Ws7o6o6ojsgABvMIAAAAAAAAAAAAAAAAAAAAAAAAAABxB4oqGqtPENuJRVbHMk/qirJcO9lVbJJztd4JhWuRc/JVO3xyn9J9oCo01vjR63p6FzKHVVric6oRuGLVQ/k3tz19pI2xL2zhyeWTawlXRr0QG0NibuGiuPyz89yIiVGAs2Sg9bhcn165SR6SlepdL+ALjEpL3baHYvc67NiutIiU+n7jUSL/bsfVUppHKuEe3LWs80w3uic08T+eCOpkikSSNzmvY5HNc1cK1U7Kik0eHv0lWvNAU9Lpjd23TavssKcjLi2RG3KFuenMrl5ZkRP0lRy597phdG/h516VC25XnEU0RZxPVwn7upwI8aM4++F3WUDHu3B/EVQ73qa8UctO5nzeiLEv0epltVxZ8NdHAtTNvRpfkT9CsR7v8luVX7DU6FUdSwU4qxXGtNcecNtFq1TqrT2ibBW6o1Vdqa22u3xOmqKmd6Na1qJnHXuq9kROqr0Qi9uB6S7YHTVPUw6Mbd9W1zGL6laeldTUqydkR0s3K5EVfFrHdOxAziC4r9z+Ietji1PVRW+yUz/WUtloVc2nY5M4e/PtSPwuMr0TwRvVDNaw1Vc+1uhG43O8PhqZ9XPSq7I4eMrnxYcRVbxD7lPvFMyWn03aGvpLJSyKrVSLmy6aRqqqJK/CKqJ+a1ieGTR6uyp5pUIvQc2OvMSdMU26ejS57ib9zFXZu3eMvRXoi5Mv2o2q1bvRrm36D0ZS+sra1VdJM9jlhpYk96WVzUXkYnmqd1TuqohTbbba613a1VS6N0NZJrjcqpzfcaqRwMy1FlldhUYxOZMucuMqn165cM/Ddo/hn0M9jp4J79WQtmvl4lVGtXCcyxsVfchYucZ79VXwRMN+9TbjSPeSmUZRXjrnSqjSiOM9vdDO9q9t9L7J7cWzQtgVIbbZqdzpaiZyI6WRculmevmrlcq+SdOyEQd2/ShWzT99rrDtZoOK8w0c6wtu1xqnMhm5eiuZCxOZW57Kr0VUTt1MA42+O2HWsVbtDszcnpYXc0F5vUaq1a9M4WGFVwqQ56Of+f7qeznmgt+E+amCzh4q9q71p3Ms2qsTFjB6RFPGfpCWOrfSNcSOqUWK23Sy6bhd05bVb058L5vndIuenduO/x6a+q+KfiHuTldVbz6sbzZz6m5ywInh2jVvh2x8++DSLKjlX3ipjql/SNqm1bjhCs4jGY27O+5V5zDbScQW+DvadvRrhV/6xVn/jKyl4ht8oFzFvNrhPnf6pf5XmtdPaf1Tq2q/AtM6eud2qGplY6KkkmcieaoxFwbS07wpcSuopmQ2/ZzUUXPheatgSkYiKvfnmViKiJ4Kuevnk/Zrt0+9ENSLGPvb7U1zPdNS40fFPxCUmGxbxamX/AKWtWX+fn9vTOTL7Dx0cSVjWNjtcw3ONq55LhQQSI7r2VzWo7wXx8ftrrF6O7iSuaNfcaCw2hHYVUqro2RyZ80hR3b5mYUPoyt3JJcV+vdK07F7ujWokx9ORucfTseZuYaeMQ27WE2giYmia/GfvL7tfpLt2qZUbd9F6UrUTCKsTKiFV816yKiL9MfM2Rpb0nGj6hjY9Z7bXaikwmZLZVR1LHL1yvLJ6tUTp5qWO3ei9mcrHXredMY9tlLZPHCZw503nnHs+PYySk9GLt5GiLW7lahnVO6spoGZ+5TBXODnhqmcPb2lo4zHjNMtkaZ49eHHUM6U1VqS4WR7sIi3Oge1mVXHvx87UT4quPibUsu9W0Gokb+JNz9LVivVEayO7QcyqvZOVXZ+4jzT+jR2UZG1tVqvWEr07ubU07EX6epX+U9V9GjsOuObUOsl/+9p/6A164sflmU3h7ucRH7a3RPKZj7pV1NFbbpCiVdJTVcSplEkjbI1ftyhYava7bOvVHV23emKhUzhZbRTvXr37sNKaa4FdBaNXOld1d0bQmcqlDqBsCKuMdmRJ4GwLPsZcLHIklJvnudMrUxisu1PUpj4pLA5Pr3Neu3bq47/BK2rt6Y9ujTlOv2ZPDtJtVTyetp9s9KRP7czLNTIv3ML7b7BYrQnLabLQUSJ0xT0zI/5qIeVhtFdZ6d0FdqW5XlyqmJa5lOj2/BPUxxov1RSprLra7ema+5UtMi9vXTNZ/Kpj0t2o13RHk2I6VW5VAx+p3B0RSNV02qLeqJ+hMj1/i5LFU72aJidy0ktXV/GOBWovy58Kv2eJH4nO8twka3r9Ef8AtHybNvBYm7uotzPhLPQaurd62vXltVnwnX8pUSeX6qY+fctFVuXqS5YalWymYvhAzH0znP1RStY30iZHhNYorm5P8NM/OdEjZ2fxt2dKoinnP21bjqKulpGesqqiOFvm9yNT7yw1+u7JSK5lO6Sren7mmG5/fL+zJqp1zqKt/rqqokmf5yOVy/eerJmqUjMvSni7sTTl9mKO+rfP0jz1S+H2at0771U1ct0ebLLhrm8VqLHToylYvizKuVPivRUX5FoijrK+oSOFklRNIvN0RXK5fNVKqxaYud7VJGM9TTZ6yv7fHlT877uy9TYtoslBZofV0keXqntyu6vd81/YnQwZTs/nu2NynFZrcqizx1nr7qaeEc9NOZicdhMqj1WHpiau76z9Fr09pCntvJV1zWy1SdWt7tjX4ea/EyMA7RluV4XKLEYbB0RTTHxntmeuVTv4i5ia5uXZ1kABvsIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGkeL7YGLiE2frtOUTGpqC1OW5WSRXI1FqmMVPVOX9GRqq1e3XlXwN3A/YmaZ1h4uW6btE0V8Jfzw3i2XTT92q7HeaGahuFBPJS1VNOxWyRSxqqPY5F91yKmCgWVfE7GcWfA1o/iGZJqzTM9PpzXEUXK2s5FSlr0TOG1LWpnm6qiSty7HRUeiIics93Ngd4NlK51NuLom4WyBJHQw1/q+ejqVRcZjmb7C5TGOqORMZROxJ279NyO9TcXlleGq4a09rAElPpJepSc/wP1rvzuYyI6bauSQ+2ylEkoWb9Y/d7H6tcEnx+cfaVGPEpKGnrrpVRUNso56qpmcjI4YY1e97l7IjU6qpIzangD4lNzamNavSa6Rtzmo9azUHNT5auOjYkRZVXC+LUT4oY5riN8yy2sDcvzpbp1aBSby6G/eHjg73Z3/AKyGtpKCSw6ZRUdLeq+FzY5GcyIqQNxmV3fthvRcuQnJs36PTY3Z6kh1ZuRUs1VdLfGtRUTXTkZbKflb1ckLkwqNTPWVzk+CFDu96QzbvSMzdt+HbTku4WqpYvwa3xWmnV9ugk91rUSP25uXovLEnKqfnoYZxEzutwlrGRW7eleMq8I4/wDeTa+ktE7AcFO2stfVXGhs1I1F/DLvcHtWsuEqN5uRF956+yqtib0TrhO6nO3i5489Ub8VFRozQslXYNDsVWvhV3JUXNOqZncmWoxeitZ1b4qqrgziq4RuNni7vy6x3xv0OlaNr0WnpLq9zUp2r3SnoolckfTxerVXHtZXqSP2s9GZw67epS3XV1Lc9bXOna18n4yk/tNZERM8tNGiZblPderzBFVNE9KrfKXqtXsRRFqzHQtuVOj9Fa03AuX4o0NpO73+txlYbdRyTuanxRiLhPivQkttr6NriQ1vTtr7/S2rR9K7sl3qXLUKnwiiRyp/CVp0yom3DSlJJaNqNjqO2Q+7G6WSktdIuOy8kPPJhOvRY0X7TCr5YeNDUUT4oNWbd6ejkymKBKl8iNz255InYXHTLceODWxOZVW41ooqq5R99IZMLs5Yqn9rXHjOny3tM6E9FVtfaqVk+4uv77e6tG5kZQNjo6Zvw9pJHuRPNVT6dUNrae2e4HdomLSxWrQKVUacskl2rIq+pVe/X1znqi/BET5Gu7/wk8S+p1ct/wB3rdcUdzexU3ate1M+SLEqfcmPAxGs4D96IGOfDddL1SoqYbFWzNcv1dEiInTP++StYvPM2j8HB1Tzn6R91lwuQZXb01u0x4fWUkZeKHhv0TRstlkvtKlNFlGU9otr0jb36IjWo1OpjtXx4bSxZbSWLUs69MK6nhY1c9uvrVVPPt2Iz3PhF3+tL1/4F/hjUXPNR1sL0X+Mi/xTF7rsnvBZGvkum22ooo2Jl72UMr2o1OuVc3KL2Vei9FQrWL2kz+3Gv6P0f/Wr7p+zlGVVaRF3Xxj6JT1nH7pJnSg0DdJ1x/hKpkeF8PzV+We2Sx1PHtdZl/uZoCijTCf3+te9c/RqEQaiCekkWCqjdDK3oscjFaqfRT5a9zVyilfvbXZzV/mdHlTH1hKWtn8vjjTr4ylo7jh3AmwsOl9PRovgqTO+nvp1+aeB6R8Z25Eqf+Z9PN+UEq/7UirT1zmoiPUulNX9va6EVd2pzyP/ACJ8o+zZpyTAf/F8/ukw7i23NnTETLTEvXq2myn8ZT5Xic3WqURqXeliVVTKx0UX7UX/AH8fOP8AT3BqY6lzprgnngj7u02dVxpOJrjlOjLGU4GN8W6fJudd+N0qrpLq+pRHfucMTP5Gnk3dHXVSq+u1ddnouMp+FORPqiqauiuHb2itguPVOVxH3c6zO77+IrnnVL3RgMLT7tumPBsJ+r9QVaK2ov1e/PfmqHL+0pm1CvkVz3K5V7q5cqYxT3DOPaLlBWZ8SMv4m/f/ABa5nnLYos26fdhkUU6YQroKnC9zHoqpv6RVw1Kq5ERVVV6ImMqpqTTNW576OjKYKxq49ouMFb8T00ztjrfUKsfDaX0tO/C+uq1WJuOvVEwqr38Gr06dENr6Z2Rs1tRlRfqyS4ToufVs9iFOue3devjlPkhZcq2KzjNpiaLfQo/eq9mPjvnwiURi84weE41az2Rvnz4MC0/bLxqCZIbVRSTJnDno1ORn75ezeyqbV09tzRW/kqLxIlZOi8yR4/JtX69V+vQy2lpKWhgbTUVNFBE33WRsRrU+iHqdcyD0f5dlExexH7W52z7sco++vgqWPz7EYv2LfsU93Hz+z8a1rGoxjUa1qYRETCIh+gF9QYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFPcLbbrtSSW+60FNW0syYkgqImyRvTyVrkVFKgAaF11wL8Lm4FY64XXayhoKl3d9olkoEVfNWQq1i/VvxNd1votuGKqmWWnl1hRtXP5OC7MVv8eJy/eS+B7i5XHCWCrC2a/eojyRDo/Rc8MVNIklQ7V1Yid2zXZiNd8+SJplmnPR5cKGm6ttbHtzJcZGLlqXG5VFQxOmPcc/l6+PTqSQB+zdrnreacHh6OFEeTAaPTe3O3ED00NtNTw1EHuQWWxRU7nr2TEitjj8ETKv8vAp7nc98dSWl7NK6bsGkKiVFRlRfqpa+WLp3WmpsRqvb/D+C9FNjA86s3Q6o3R3I73XhAg3OkZW8Q26mqNcSphUt1JULabSzxwlLAuXfNz3LjxNvaH2q2221oY7foPQ1lscUTUYi0dGyORyfrPROZy/FyqplQE1TPF+U2qKZ1iN/xAAeWQAAAAAAABb7lp3T95Y6O72K31zXJhyVNKyVF+fMimAaj4ZdjdUK59ft9QU8jse3QK+kVPkkStT7jZ4MF7C2MRGl6iKo74ifmy2712zOtuqY5TojXqHgR2uuETl09fr5aJ8qrOaRlTGmfBWuajlRFRO7vtNfXDgG1fTZ/Em4lpqk8EqqOWBfta5+PLt4k1QQ2I2WynE+9ZiOWsfKUhazvH2uFyZ57/m5+3Pg931tTnNo7Xbbo1q4a6lr42ZTp1xJyr1x1/apbHcOm/FGqtm27rlxhcx1EEnz916nRUENd9H+VXJ9ma48Y+sS3qNp8ZTGlUUzzifu52x7Hb1MXDtvLwmF8GNX7PghdKLYrembCN0BcW5/TfGxf470J/A1/wCrfK5411+cfyvf9KcX+5T5T90JbRw4b0Vb2tqNOQ0Lcrl1RWw9Pj7D3Ozjx+vzzq08KGr5Go67artlIqp2hikmVPLPViLjw+RKAG1Y9H2S2p1rpqr51fbRr3NpMfc4TEco++rTtg4ZdIW9jXXy619zlTujFSCNfhhuXfxjYth0NpHTMbWWXT9HTub/AIX1fPIvze7Ll+0voLFgsjy3LtJw1mmmY69NZ851n4ozEY/FYr8W5M+O7y4AAJVqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//9k=';


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

const XP_PER_MOVE = 10;
// Every section both earns and costs XP. The rules added on XP_STRICT_FROM
// never reach back before that day, and nothing is ever taken for today:
// penalties only land once a day, week or month is over.
const XP_STRICT_FROM = '2026-10-09';
function xpLedger({ habits, leads, todos, todayStr, goals = [], journal = [], timers = [], ventureChecks = [], courses = [], ventureItems = [], ventures = [], finances = [], budgets = [], debts = [] }) {
  const rows = [];
  const row = (k, tab, plus, minus, how) => rows.push({ k, tab, plus: Math.round(plus), minus: Math.round(minus), net: Math.round(plus - minus), how });
  const net = (k, tab, n, how) => row(k, tab, Math.max(0, n), Math.max(0, -n), how);
  const yesterday = addDays(todayStr, -1);
  const strictDays = [];
  for (let d = XP_STRICT_FROM; d <= yesterday && strictDays.length < 120; d = addDays(d, 1)) strictDays.push(d);
  const fromMonth = XP_STRICT_FROM.slice(0, 7), thisMonth = todayStr.slice(0, 7);

  // Habits: +10 a day done, −10 a day missed (since the habit was made, up to 90 days back)
  let hp = 0, hm = 0;
  habits.forEach(h => {
    hp += Object.values(h.completions || {}).filter(Boolean).length * 10;
    const createdRaw = h.createdAt?.toDate ? h.createdAt.toDate() : null;
    const createdStr = createdRaw ? localDateStr(createdRaw) : todayStr;
    const daysBack = Math.min(90, Math.round((parseLocal(todayStr) - parseLocal(createdStr)) / 86400000));
    for (let i = 1; i <= daysBack; i++) {
      const d = addDays(todayStr, -i);
      if (d < createdStr) break;
      if (h.archivedAt && d >= h.archivedAt) continue;
      if (!h.completions?.[d]) hm += 10;
    }
  });
  row('Habits', 'habits', hp, hm, '+10 a day done, −10 a day missed');
  net('Tasks', 'todos', calcTodoXP(todos, todayStr), '+5 a task done; −10 each one missed, −10 for a day under five');
  net('Focus', 'focus', focusXP(timers, todayStr), '+1 per 10 minutes, a bonus for finishing, the same taken for failing');
  net('Goals', 'goals', goals.reduce((t, g) => t + goalXP(g, todayStr), 0), '+100 reached, −50 missed or given up');

  // Tide Log: +15 an entry, −5 for a day with none
  row('Tide Log', 'dashboard', journal.length * 15, strictDays.filter(d => !journal.some(j => j.date === d)).length * 5, '+15 an entry, −5 for a day with none');

  // Studies: +5 a topic backed by study time, −20 for a full week under two hours of study
  let sm = 0;
  if (courses.length) {
    let m = mondayOf(XP_STRICT_FROM); if (m < XP_STRICT_FROM) m = addDays(m, 7);
    for (; addDays(m, 6) < todayStr; m = addDays(m, 7)) {
      const end = addDays(m, 6);
      const sec = timers.filter(t => t.category === 'Study').reduce((t, x) => t + (x.sessions || []).reduce((u, ss) => { const d = localDateStr(new Date(ss.end)); return u + (d >= m && d <= end ? Number(ss.sec) || 0 : 0); }, 0), 0);
      if (sec < 7200) sm += 20;
    }
  }
  row('Studies', 'studies', studyXP(courses, timers, todayStr), sm, '+5 a topic backed by study time, −20 for a week under two hours of study');

  // Pipeline: +200 a client won, −5 for each follow-up left past its date
  const liveLead = l => !['Flaked', 'Lost'].includes(l.status);
  row('Pipeline', 'pipeline', leads.filter(l => l.status === 'Paid').length * 200,
    leads.filter(l => liveLead(l) && l.nextAction && l.nextActionDate && l.nextActionDate >= XP_STRICT_FROM && l.nextActionDate < todayStr).length * 5,
    '+200 a client won, −5 for each next action left past its date');

  // Clients: +20 a retainer collected, −20 for each month a retainer is unpaid
  row('Clients', 'clients', finances.filter(f => f.paymentStage === 'Monthly Retainer' && (f.date || '') >= XP_STRICT_FROM).length * 20,
    leads.filter(l => l.status === 'Paid').reduce((t, l) => t + retainerArrears(l, finances, todayStr).filter(mk => mk >= fromMonth).length, 0) * 20,
    '+20 a retainer collected, −20 for each month one is unpaid');

  // Finance: +2 a transaction logged (5 a day at most); −15 for a month that ends in the red, −10 for each budget broken
  const perDay = {};
  finances.forEach(f => { if ((f.date || '') >= XP_STRICT_FROM) perDay[f.date] = (perDay[f.date] || 0) + 1; });
  let fm = 0;
  for (let mk = fromMonth; mk < thisMonth; mk = addMonths(mk, 1)) {
    const month = finances.filter(f => (f.date || '').startsWith(mk));
    if (month.reduce((t, f) => t + signedAmount(f), 0) < 0) fm += 15;
    budgets.forEach(bd => { const lim = Number(bd.limit) || 0; if (lim && month.filter(f => !isIncome(f) && f.category === bd.category).reduce((t, f) => t + amountOf(f), 0) > lim) fm += 10; });
  }
  const mine = debts.filter(d => d.direction === 'owe');
  const cleared = mine.filter(d => debtLeft(d) === 0 && (d.settledAt || '') >= XP_STRICT_FROM).length;
  fm += mine.filter(d => debtLeft(d) > 0 && d.dueDate && d.dueDate >= XP_STRICT_FROM && d.dueDate < todayStr).length * 10;
  row('Finance', 'finance', Object.values(perDay).reduce((t, n) => t + Math.min(5, n) * 2, 0) + cleared * 10, fm, '+2 a transaction logged (5 a day), +10 a debt cleared; −15 a month in the red, −10 a broken budget, −10 a debt past its date');

  // Ventures: +10 a daily check and a move finished; −10 a check missed or a move past its date, −5 a move finished late
  const firstVenture = [...ventures].sort((x, y) => (x.createdAt?.seconds ?? Infinity) - (y.createdAt?.seconds ?? Infinity))[0]?.id;
  const checkKey = c => `${c.date}|${c.ventureId || firstVenture || ''}`;
  const checked = new Set(ventureChecks.map(checkKey));
  let vm = 0;
  ventures.filter(v => v.stage !== 'Paused').forEach(v => {
    const made = v.createdAt?.toDate ? localDateStr(v.createdAt.toDate()) : XP_STRICT_FROM;
    strictDays.forEach(d => { if (d >= made && !checked.has(`${d}|${v.id}`)) vm += 10; });
  });
  const moves = ventureItems.filter(i => i.kind === 'move');
  moves.forEach(m => {
    if (!m.due || m.due < XP_STRICT_FROM) return;
    if (!m.done && m.due < todayStr) vm += 10;
    else if (m.done && m.doneAt && m.doneAt > m.due) vm += 5;
  });
  row('Ventures', 'ventures', checked.size * 10 + moves.filter(m => m.done).length * XP_PER_MOVE, vm, '+10 a daily check, +10 a move finished; −10 a check missed or a move past its date, −5 a move finished late');
  return rows;
}
const calcXP = data => Math.max(0, xpLedger(data).reduce((t, r) => t + r.net, 0));

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
    case 'revenue': return finances.filter(f => f.type === 'income' && inRange(f.date)).reduce((s, f) => s + amountOf(f), 0);
    case 'profit':  return finances.filter(f => inRange(f.date)).reduce((s, f) => s + signedAmount(f), 0);
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
const CHART_H = h => (window.innerWidth >= 760 ? Math.round(h * 1.6) : h);

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

  const rev7  = last7.filter(f=>f.type==='income').reduce((s,f)=>s+amountOf(f),0);
  const rev14 = prev7.filter(f=>f.type==='income').reduce((s,f)=>s+amountOf(f),0);
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
        Business velocity
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

// ─── RANKS, PROVERBS, SKY ─────────────────────────────────────────────────────
// A rank for every stretch of levels, a hanging scroll with a proverb for the
// day, and a sun that crosses the Home page with the clock (a moon at night).
const RANKS = [
  { from: 1,  jp: '見習い', en: 'Apprentice' },
  { from: 2,  jp: '下忍',   en: 'Genin' },
  { from: 4,  jp: '中忍',   en: 'Chūnin' },
  { from: 7,  jp: '上忍',   en: 'Jōnin' },
  { from: 10, jp: '暗部',   en: 'Anbu' },
  { from: 15, jp: '影',     en: 'Kage' },
];
const rankOf = level => {
  const i = RANKS.reduce((at, r, k) => (level >= r.from ? k : at), 0);
  return { ...RANKS[i], next: RANKS[i + 1] || null };
};
const PROVERBS = [
  ['七転び八起き', 'Fall seven times, stand up eight.'],
  ['継続は力なり', 'Keeping at it is power.'],
  ['千里の道も一歩から', 'A journey of a thousand miles starts with one step.'],
  ['塵も積もれば山となる', 'Even dust, piled up, becomes a mountain.'],
  ['石の上にも三年', 'Three years on a cold stone will warm it.'],
  ['急がば回れ', 'When in a hurry, take the long way round.'],
  ['雨垂れ石を穿つ', 'Dripping water wears through stone.'],
  ['初心忘るべからず', "Never forget the beginner's mind."],
  ['為せば成る', 'If you do it, it gets done.'],
  ['猿も木から落ちる', 'Even monkeys fall from trees.'],
  ['案ずるより産むが易し', 'Doing it is easier than worrying about it.'],
  ['明日は明日の風が吹く', "Tomorrow's wind will blow tomorrow."],
  ['一期一会', 'One chance, one meeting.'],
  ['失敗は成功のもと', 'Failure is the root of success.'],
];
function HangingScroll({ todayStr }) {
  const [jp, en] = PROVERBS[Math.floor(parseLocal(todayStr).getTime() / 864e5) % PROVERBS.length];
  return (
    <figure className="kakejiku" title={en}>
      <div className="kk-rod"/>
      <div className="kk-paper"><span lang="ja">{jp}</span><b>J</b></div>
      <div className="kk-rod low"/>
      <figcaption>{en}</figcaption>
    </figure>
  );
}
function HomeSky() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(iv); }, []);
  const h = now.getHours() + now.getMinutes() / 60;
  const day = h >= 6 && h < 18;
  const t = day ? (h - 6) / 12 : ((h + 6) % 24) / 12;         // 0 at rise, 1 at set
  return (
    <div className="sky" aria-hidden="true">
      <i className={day ? 'sun' : 'moon'} style={{ left: `${6 + t * 88}%`, top: `${78 - Math.sin(Math.PI * t) * 62}%` }}/>
    </div>
  );
}
// Manga sound effects for XP: ドドン a heavy hit, ドン a hit, キラッ a glint, ガーン dismay
const sfxFor = d => (d < 0 ? 'ガーン' : d >= 15 ? 'ドドン！' : d >= 10 ? 'ドン！' : 'キラッ');

// ─── LIVE LAYER ───────────────────────────────────────────────────────────────
// Things that keep moving while the console is open: a clock that shows how
// much of the day is left, a ticker of what matters right now, petals in the
// section's colour, and a countdown that ticks by the second. One switch in
// the header turns all of it off.
const two = n => String(n).padStart(2, '0');

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv); }, []);
  const h = now.getHours();
  const gone = ((h * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400) * 100;
  const part = h < 5 ? '夜' : h < 11 ? '朝' : h < 17 ? '昼' : h < 20 ? '夕' : '夜';   // night, morning, day, evening, night
  const left = 24 * 60 - (h * 60 + now.getMinutes());
  return (
    <div className="live-clock" title={`${Math.floor(left / 60)}h ${left % 60}m of today left`}>
      <b lang="ja" aria-hidden="true">{part}</b>
      <span>{two(h)}:{two(now.getMinutes())}<i>:{two(now.getSeconds())}</i></span>
      <u><em style={{ width: `${gone}%` }}/></u>
    </div>
  );
}

// Days, hours, minutes and seconds until the start of a date
function LiveCountdown({ to }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const ms = parseLocal(to).getTime() - now;
  if (ms <= 0) return null;
  const sec = Math.floor(ms / 1000), d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return <div className="lp-live"><b>{d}</b>d <b>{two(h)}</b>h <b>{two(m)}</b>m <b key={sec % 60} className="tick">{two(sec % 60)}</b>s</div>;
}

// A strip of what matters right now. Click an item to go there; hover to pause.
function Ticker({ items, onNav }) {
  if (!items.length) return null;
  // Repeat a short list so the tape is always longer than the window
  const tape = items.length < 12 ? Array.from({ length: Math.ceil(12 / items.length) }, () => items).flat() : items;
  const row = hidden => (
    <div className="ticker-row" aria-hidden={hidden || undefined}>
      {tape.map((it, i) => <button key={i} className={it.lv || ''} tabIndex={hidden ? -1 : 0} onClick={() => onNav(it.tab)}><i>◆</i>{it.t}</button>)}
    </div>
  );
  return <div className="ticker" style={{ '--dur': `${Math.max(40, tape.length * 7)}s` }}><div className="ticker-track">{row(false)}{row(true)}</div></div>;
}

function Petals() {
  const petals = useMemo(() => Array.from({ length: 14 }, () => ({
    left: Math.random() * 100, dur: 16 + Math.random() * 16, delay: -Math.random() * 32,
    size: 7 + Math.random() * 8, sway: 40 + Math.random() * 90, spin: 200 + Math.random() * 400,
  })), []);
  return (
    <div className="petals" aria-hidden="true">
      {petals.map((x, i) => <i key={i} style={{ left: `${x.left}%`, width: x.size, height: x.size * 1.25, '--dur': `${x.dur}s`, '--delay': `${x.delay}s`, '--sway': `${x.sway}px`, '--spin': `${x.spin}deg` }}/>)}
    </div>
  );
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
  // Sidebar: can be minimised to icons (⌘B). It minimises itself when the
  // window gets narrow, so the content keeps its room.
  const [winW, setWinW] = useState(window.innerWidth);
  const [navPref, setNavPref] = useState(() => { try { return localStorage.getItem('jc_nav_min') === '1'; } catch { return false; } });
  useEffect(() => { const f = () => setWinW(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const navForced = winW >= 760 && winW < 1100;
  const navMin = winW >= 760 && (navPref || navForced);
  // Live layer on or off (off by default if the Mac asks for less motion)
  const [live, setLive] = useState(() => { try { const v = localStorage.getItem('jc_live'); return v ? v === '1' : !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } });
  const toggleLive = () => setLive(v => { try { localStorage.setItem('jc_live', v ? '0' : '1'); } catch {} return !v; });
  useEffect(() => { document.documentElement.classList.toggle('live-on', live); }, [live]);
  // The engraving and the tall mark lean a little away from the pointer; a click leaves an ink ring
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const move = e => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const r = document.documentElement.style; r.setProperty('--mx', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3)); r.setProperty('--my', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3)); }); };
    const down = e => { const el = document.createElement('i'); el.className = 'ink-ring'; el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY}px`; el.addEventListener('animationend', () => el.remove()); document.body.appendChild(el); };
    window.addEventListener('mousemove', move); window.addEventListener('pointerdown', down);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', move); window.removeEventListener('pointerdown', down); };
  }, [live]);
  // Headline numbers count up when a section opens. Only plain text nodes are
  // touched, and it stops at once if React writes a newer value.
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const start = setTimeout(() => {
      const jobs = [...document.querySelectorAll('.fin-tile b, .home-stats b, .fin-net, .fin-split-col b, .fin-target-num')].map(el => {
        const node = el.childNodes.length === 1 && el.firstChild.nodeType === 3 ? el.firstChild : null;
        const m = node && node.nodeValue.match(/^(\D*?)(\d[\d,]*)(\D*)$/);
        const n = m ? Number(m[2].replace(/,/g, '')) : 0;
        return n >= 3 ? { node, pre: m[1], n, post: m[3], last: node.nodeValue, final: node.nodeValue } : null;
      }).filter(Boolean);
      const t0 = performance.now();
      const step = t => {
        const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 3);
        jobs.forEach(j => {
          if (j.dead || j.node.nodeValue !== j.last) { j.dead = true; return; }
          j.last = k === 1 ? j.final : `${j.pre}${Math.round(j.n * e).toLocaleString()}${j.post}`;
          j.node.nodeValue = j.last;
        });
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 260);
    return () => { clearTimeout(start); cancelAnimationFrame(raf); };
  }, [tab, live]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleNav = () => setNavPref(v => { try { localStorage.setItem('jc_nav_min', v ? '0' : '1'); } catch {} return !v; });
  useEffect(() => { document.documentElement.classList.toggle('nav-min', navMin); }, [navMin]);
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
  const [debts, setDebts]       = useState([]);
  const [timers, setTimers]     = useState([]);
  const [ventureServices_, setVentureServices] = useState([]);
  const [ventureChecks, setVentureChecks] = useState([]);
  const [ventures, setVentures] = useState([]);
  const [ventureItems, setVentureItems] = useState([]);
  const [serviceRounds, setServiceRounds] = useState([]);
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
      ['journal',setJournal],['budgets',setBudgets],['debts',setDebts],['timers',setTimers],['venture_services',setVentureServices],['venture_checks',setVentureChecks],['ventures',setVentures],['venture_items',setVentureItems],['service_rounds',setServiceRounds],['courses',setCourses],['settings',setSettings],
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

  const totalIncome   = finances.filter(isIncome).reduce((s,f)=>s+amountOf(f),0);
  const totalExpenses = finances.filter(f=>!isIncome(f)).reduce((s,f)=>s+amountOf(f),0);
  const profit     = totalIncome - totalExpenses;
  // paidLeads and openLeads passed as props from App useMemo
  const habitsToday = habits.length ? Math.round(habits.filter(h=>h.completions?.[todayStr]).length/habits.length*100) : 0;
  const xpData = { habits, leads, todos, todayStr, goals, journal, timers, ventureChecks, courses, ventureItems, ventures, finances, budgets, debts };
  const ledger = xpLedger(xpData);
  const xp = calcXP(xpData);
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
    {id:'dashboard', label:'Home',     icon:Icons.home, jp:'本部'},
    {id:'pipeline',  label:'Pipeline', icon:Icons.pipeline, jp:'営業'},
    {id:'habits',    label:'Habits',   icon:Icons.habits, jp:'習慣'},
    {id:'todos',     label:'Tasks',    icon:Icons.tasks, jp:'任務'},
    {id:'focus',     label:'Focus',    icon:Icons.hourglass, jp:'集中'},
    {id:'studies',   label:'Studies',  icon:Icons.book, jp:'学業'},
    {id:'schedule',  label:'Schedule', icon:Icons.schedule, jp:'予定'},
    {id:'finance',   label:'Finance',  icon:Icons.finance, jp:'財務'},
    {id:'goals',     label:'Goals',    icon:Icons.goals, jp:'目標'},
    {id:'jaxon',     label:'JAXON',    icon:Icons.jaxon, jp:'参謀'},
    {id:'clients',   label:'Clients',  icon:Icons.briefcase, jp:'顧客'},
    {id:'ventures',  label:'Ventures', icon:Icons.rocket, jp:'事業'},
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
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); toggleNav(); return; }
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

      <header className="header">
        <div className="brand">
          <div className="brand-gem">J</div>
          <div>
            <div className="brand-name">JCommerce</div>
            <div className="brand-sub">Founder Console</div>
          </div>
        </div>
        <div className="page-title" key={tab}>
          <span className="page-seal" lang="ja" aria-hidden="true">{currentNav.jp}</span>
          <span>{currentNav.label}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <button className="icon-btn" title="Create Invoice" onClick={()=>setInvoiceOpen(true)} style={{width:28,height:28,borderColor:'rgba(var(--p3),0.2)',color:'var(--ink-2)'}}><Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5" /></button>
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
          <LiveClock/>
          <button className={`icon-btn live-btn ${live ? 'on' : ''}`} title={live ? 'Live motion is on. Click to switch it off.' : 'Live motion is off. Click to switch it on.'} onClick={toggleLive} style={{ width: 28, height: 28 }}><i/></button>
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
          <div className="xp-chip" key={xp}>
            <span className="xp-chip-lv">L{level}</span>
            <span className="xp-chip-sep">·</span>
            <span className="xp-chip-xp">{xp} XP</span>
          </div>
        </div>
      </header>
      {live && <Petals/>}
      <Ticker onNav={setTab} items={(() => {
        const out = [], days = d => Math.round((parseLocal(d) - parseLocal(todayStr)) / 864e5), pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
        ventures.filter(v => v.launchDate && v.stage !== 'Paused').forEach(v => {
          const n = days(v.launchDate);
          if (n >= 0) out.push({ t: n === 0 ? `${v.name} opens today` : `${v.name} opens in ${pl(n, 'day')}`, tab: 'ventures', lv: n <= 3 ? 'hot' : '' });
          const steps = ventureItems.filter(i => i.ventureId === v.id && i.kind === 'move' && i.phase === 'launch' && i.due && !i.done);
          const today = steps.filter(x => x.due === todayStr).length, late = steps.filter(x => x.due < todayStr).length;
          if (late) out.push({ t: `${pl(late, 'launch step')} behind`, tab: 'ventures', lv: 'hot' });
          if (today) out.push({ t: `${pl(today, 'launch step')} for today`, tab: 'ventures' });
        });
        if (todayTodos.length) out.push({ t: `${todayDone.length} of ${todayTodos.length} tasks done`, tab: 'todos', lv: todayDone.length >= Math.min(5, todayTodos.length) ? 'good' : '' });
        else out.push({ t: 'No tasks planned today', tab: 'todos', lv: 'hot' });
        todos.filter(t => t.addedDate > todayStr && !t.doneOn?.[t.addedDate]).sort((a, b) => a.addedDate.localeCompare(b.addedDate)).slice(0, 3)
          .forEach(t => { const n = days(t.addedDate); out.push({ t: `${t.title} · ${n === 1 ? 'tomorrow' : `in ${n} days`}`, tab: 'todos', lv: n <= 2 ? 'hot' : '' }); });
        const live_ = habits.filter(h => !h.archivedAt);
        if (live_.length) out.push({ t: `${live_.filter(h => h.completions?.[todayStr]).length} of ${live_.length} habits today`, tab: 'habits' });
        const running = timers.find(t => t.runningSince);
        if (running) out.push({ t: `Focusing on ${running.title}`, tab: 'focus', lv: 'good' });
        const mk = todayStr.slice(0, 7), net = finances.filter(f => (f.date || '').startsWith(mk)).reduce((t, f) => t + signedAmount(f), 0);
        out.push({ t: `This month ${J(net)} net`, tab: 'finance', lv: net < 0 ? 'hot' : '' });
        courses.filter(c => c.examDate && days(c.examDate) >= 0).sort((a, b) => a.examDate.localeCompare(b.examDate)).slice(0, 2)
          .forEach(c => out.push({ t: `${c.code} exam in ${pl(days(c.examDate), 'day')}`, tab: 'studies', lv: days(c.examDate) <= 14 ? 'hot' : '' }));
        out.push({ t: `${500 - xpInLevel} XP to Level ${level + 1}`, tab: 'dashboard' });
        return out;
      })()}/>

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
        <div className="jp-mark" lang="ja" aria-hidden="true" key={tab}>{currentNav.jp}</div>
        {tab==='dashboard' && <Dashboard debts={debts} ledger={ledger} leads={leads} habits={habits} finances={finances} todos={todos} schedule={schedule} goals={goals} timers={timers} journal={journal} todayStr={todayStr} xp={xp} level={level} progress={progress} xpInLevel={xpInLevel} onToggleHabit={toggleHabit} onToggleTodo={toggleTodo} onAddTodo={d=>add('todos',{...d,doneOn:{},addedDate:todayStr})} onSaveJournal={saveJournal} onNav={setTab} onStartTimer={startTimer} launchToday={ventures.filter(v => v.launchDate && v.stage !== 'Paused').map(v => {
          const steps = ventureItems.filter(i => i.ventureId === v.id && i.kind === 'move' && i.phase === 'launch' && i.due && !i.done);
          return { name: v.name, daysLeft: Math.round((parseLocal(v.launchDate) - parseLocal(todayStr)) / 864e5), today: steps.filter(x => x.due === todayStr).length, late: steps.filter(x => x.due < todayStr).length };
        })} venturesUnchecked={ventures.filter(v => v.stage !== 'Paused' && !ventureChecks.some(c => c.date === todayStr && (!c.ventureId || c.ventureId === v.id))).map(v => v.name)} courses={courses} balance={balanceDoc?.targets} onSetBalance={setBalance}/>}
        {tab==='pipeline' && <Pipeline leads={leads} finances={finances} onAdd={d=>add('leads',d)} onUpdate={(id,d)=>update('leads',id,d)} onDelete={id=>remove('leads',id)} onLogPayment={logPayment} onUpdatePayment={updateLinkedPayment}/>}
        {tab==='habits'   && <Habits habits={habits} weekDates={weekDates} todayStr={todayStr} onAdd={d=>add('habits',{...d,completions:{}})} onUpdate={(id,d)=>update('habits',id,d)} onDelete={id=>remove('habits',id)} onToggle={toggleHabit}/>}
        {tab==='focus'    && <Focus timers={timers} todayStr={todayStr} onAdd={d=>add('timers',d)} onUpdate={(id,d)=>update('timers',id,d)} onDelete={id=>remove('timers',id)} onStart={startTimer} onPause={pauseTimer} courses={courses}/>}
        {tab==='studies'  && <Studies courses={courses} timers={timers} schedule={schedule} todayStr={todayStr} balance={balanceDoc?.targets} onSetBalance={setBalance}
          onAdd={d=>add('courses',d)} onUpdate={(id,d)=>update('courses',id,d)} onDelete={id=>remove('courses',id)}
          onAddTimer={d=>add('timers',d)} onStartTimer={startTimer} onPauseTimer={pauseTimer}/>}
        {tab==='todos'    && <Todos todos={todos} todayStr={todayStr} onAdd={d=>add('todos',{...d,doneOn:{},addedDate:todayStr})} onUpdate={(id,d)=>update('todos',id,d)} onDelete={id=>remove('todos',id)} onToggle={toggleTodo}/>}
        {tab==='schedule' && <Schedule schedule={schedule} onAdd={d=>add('schedule',d)} onUpdate={(id,d)=>update('schedule',id,d)} onDelete={id=>remove('schedule',id)}/>}
        {tab==='finance'  && <Finance debts={debts} onSaveDebt={d => { const { id, createdAt, ...data } = d; return id ? update('debts', id, data) : add('debts', data); }} onDeleteDebt={id => remove('debts', id)} finances={finances} leads={leads} budgets={budgets} level={level} onAdd={d=>add('finances',d)} onUpdate={(id,d)=>update('finances',id,d)} onDelete={id=>remove('finances',id)} onSetBudget={setBudget}/>}
        {tab==='goals'    && <Goals goals={goals} finances={finances} leads={leads} timers={timers} todayStr={todayStr} onAdd={d=>add('goals',d)} onUpdate={(id,d)=>update('goals',id,d)} onDelete={id=>remove('goals',id)}/>}
        {tab==='jaxon'    && <JaxonDashboard queue={queue} logs={logs} briefings={briefings} todayStr={todayStr} onApprove={id=>update('jaxon_queue',id,{status:'approved'})} onReject={id=>update('jaxon_queue',id,{status:'rejected'})}/>}
        {tab==='ventures' && <Ventures rounds={serviceRounds.filter(r => r.date === todayStr)}
          onToggleRound={(ventureId, serviceId) => {
            const doc = serviceRounds.find(r => r.date === todayStr && r.ventureId === ventureId);
            if (doc) update('service_rounds', doc.id, { done: { ...(doc.done || {}), [serviceId]: !doc.done?.[serviceId] } });
            else add('service_rounds', { ventureId, date: todayStr, done: { [serviceId]: true } });
          }}
          ventures={ventures} finances={finances} onAddFinance={d => add('finances', d)} services={ventureServices_} checks={ventureChecks} items={ventureItems} todayStr={todayStr}
          onSaveVenture={d => { const { id, ...data } = d; id ? update('ventures', id, data) : add('ventures', data); }}
          onDeleteVenture={v => {
            const firstId = [...ventures].sort((x, y) => (x.createdAt?.seconds ?? Infinity) - (y.createdAt?.seconds ?? Infinity))[0]?.id;
            ventureItems.filter(i => (i.ventureId || firstId) === v.id).forEach(i => remove('venture_items', i.id));
            ventureServices_.filter(x => (x.ventureId || firstId) === v.id).forEach(x => remove('venture_services', x.id));
            remove('ventures', v.id);
          }}
          onSaveService={(d, mine) => { const { id, createdAt, ...data } = d; const existing = id ? { id } : mine.find(x => x.serviceId === d.serviceId); existing ? update('venture_services', existing.id, data) : add('venture_services', data); }}
          onDeleteService={id => remove('venture_services', id)}
          onSaveCheck={d => { if (!ventureChecks.some(c => c.date === d.date && c.ventureId === d.ventureId)) add('venture_checks', d); }}
          onSaveItem={d => { const { id, createdAt, ...data } = d; id ? update('venture_items', id, data) : add('venture_items', data); }}
          onDeleteItem={id => remove('venture_items', id)}
          onAddTodo={d => add('todos', { ...d, doneOn: {}, addedDate: todayStr })}/>}
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
            <span className="nav-jp" lang="ja" aria-hidden="true">{n.jp}</span>
            {i < 10 && <span className="nav-key">⌘{(i+1)%10}</span>}
          </button>
        ))}
        {!navForced && (
          <button className="nav-toggle" onClick={toggleNav} title={navMin ? 'Show the sidebar (⌘B)' : 'Minimise the sidebar (⌘B)'}>
            <span className="nav-icon"><Icon d={navMin ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}/></span>
            <span className="nav-lbl">Minimise</span>
            <span className="nav-key">⌘B</span>
          </button>
        )}
        <div className="nav-foot" title={`Level ${level} · ${xpInLevel} / 500 XP`}>
          <div className="nav-foot-lv">{navMin ? `L${level}` : `Level ${level}`}</div>
          <div className="nav-rank"><b lang="ja">{rankOf(level).jp}</b>{rankOf(level).en}</div>
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
        {xpPops.map((p, i) => <span key={p.id} className={`xp-pop ${p.d > 0 ? 'up' : 'down'}`} style={{ '--tilt': `${[-7, 5, -3, 8][i % 4]}deg` }}><i lang="ja">{sfxFor(p.d)}</i><b>{p.d > 0 ? '+' : ''}{p.d} XP</b></span>)}
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
function Dashboard({ leads, habits, finances, todos, schedule, goals, timers, journal, courses = [], balance, onSetBalance, venturesUnchecked = [], launchToday = [], ledger = [], debts = [], todayStr, xp, level, progress, xpInLevel,
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
  const cash = finances.reduce((s, f) => s + signedAmount(f), 0) + debtCash(debts);
  const youOwe = debts.filter(d => d.direction === 'owe').reduce((t, d) => t + debtLeft(d), 0);
  const owedDebts = debts.filter(d => d.direction === 'owed').reduce((t, d) => t + debtLeft(d), 0);
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
  launchToday.forEach(l => {
    if (l.daysLeft < 0 || !(l.today + l.late)) return;
    push(l.late ? 'danger' : 'warn', `${l.name} launch${l.daysLeft === 0 ? ' is today' : ` in ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'}`}: ${l.today} step${l.today === 1 ? '' : 's'} for today${l.late ? `, ${l.late} behind` : ''}.`, 'Launch plan', go('ventures'));
  });
  if (DESKTOP?.venture && venturesUnchecked.length) push(hour >= 12 ? 'warn' : 'info', `Daily check not read today: ${venturesUnchecked.join(', ')}.`, 'Ventures', go('ventures'));
  if (hour >= 18 && !wroteTide) push('info', "Write tonight's Tide Log before bed. +15 XP.", null, null);
  const order = { danger: 0, warn: 1, info: 2 };
  moves.sort((a, b) => order[a.lv] - order[b.lv]);
  const dangerCount = moves.filter(m => m.lv === 'danger').length;

  const verdict = dangerCount >= 3 ? 'A lot needs you today. Start at the top.'
    : dangerCount ? 'Handle the red items first. Everything else can wait.'
    : moves.length ? 'On track. Keep the streak going.' : 'All clear. Use the time to find new clients.';

  const weekCount = window.innerWidth >= 760 ? 26 : 16;
  const weeks = getLast20Weeks(weekCount);

  return (
    <div className="section home">
      <div className="card home-hero span-8">
        <HomeSky/>
        <HangingScroll todayStr={todayStr}/>
        <div className="home-jp" lang="ja" aria-hidden="true">{hour < 12 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'こんばんは'}</div>
        <div className="home-greet">{greet}, Jadan.</div>
        <div className="home-date">{fmtDate(todayStr, { weekday:'long', month:'long', day:'numeric' })} <span lang="ja" aria-hidden="true">· {'日月火水木金土'[parseLocal(todayStr).getDay()]}曜日</span></div>
        <div className="home-verdict">{verdict}</div>
        <div className="home-stats">
          <div><b className={habitsLeft.length ? '' : 'good'}>{activeHabits.length - habitsLeft.length}/{activeHabits.length}</b><span>habits</span></div>
          <div><b className={tasksDone >= 5 ? 'good' : ''}>{tasksDone}/{Math.max(5, todayTasks.length)}</b><span>tasks</span></div>
          <div><b>{fmtHM((focusByDay(timers)[todayStr] || 0) + timers.filter(t => t.runningSince).reduce((s2, t) => s2 + timerRunSec(t, Date.now()), 0))}</b><span>focused</span></div>
          <div><b className={dangerCount ? 'bad' : 'good'}>{dangerCount}</b><span>urgent</span></div>
        </div>
        <div className="home-level">
          <span className="home-lv">Level {level}</span>
          <span className="home-rank" title={rankOf(level).next ? `${rankOf(level).next.en} at Level ${rankOf(level).next.from}` : 'Top rank'}><b lang="ja">{rankOf(level).jp}</b>{rankOf(level).en}</span>
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
          <div><dt>Owed to you</dt><dd className={owedRet ? 'bad' : ''}>{J(owedRet + owedDebts)}</dd></div>
          {youOwe > 0 && <div><dt>You owe</dt><dd className="bad">{J(youOwe)}</dd></div>}
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
                {s > 0 && <span className="home-streak">{s}d</span>}
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
                <div key={t.id} className="dash-focus" style={{ '--liq': liquidOf(t).glow }}>
                  <div className="row-between"><span>{t.runningSince ? '● ' : ''}{t.title}</span><span className={d <= 1 ? 'bad' : ''}>{d === 0 ? 'today' : d === 1 ? 'tomorrow' : `${d}d`}</span></div>
                  <div className="dash-focus-bar"><div style={{ width: `${pct * 100}%` }}/></div>
                </div>
              );
            })}
        </div>

        <TideLog journal={journal} todayStr={todayStr} onSave={onSaveJournal}/>
      </div>

      <div className="card xp-ledger">
        <div className="row-between" style={{ marginBottom: '0.5rem' }}>
          <span className="card-label" style={{ margin: 0 }}>XP ledger · every section pays in and takes out</span>
          <span className="fin-delta">{ledger.reduce((t, r) => t + r.plus, 0).toLocaleString()} earned · {ledger.reduce((t, r) => t + r.minus, 0).toLocaleString()} lost</span>
        </div>
        <div className="xp-ledger-grid">
          {ledger.map(r => (
            <button key={r.k} className="xp-ledger-row" onClick={() => onNav(r.tab)} title={r.how}>
              <em>{r.k}</em>
              <span className="good">+{r.plus.toLocaleString()}</span>
              <span className={r.minus ? 'bad' : 'dim'}>−{r.minus.toLocaleString()}</span>
              <b className={r.net < 0 ? 'bad' : ''}>{r.net < 0 ? '−' : ''}{Math.abs(r.net).toLocaleString()}</b>
              <i>{r.how}</i>
            </button>
          ))}
        </div>
        <div className="goal-hint" style={{ marginTop: '0.6rem' }}>Nothing is taken for today. A missed day, week or month costs you once it is over. The newer rules count from {fmtDate(XP_STRICT_FROM, { month: 'long', day: 'numeric' })}.</div>
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
                        {l.priority==='high' && <span className="badge" style={{background:'rgba(239,68,68,0.1)',color:'#ff5a36',border:'1px solid rgba(239,68,68,0.2)'}}>High</span>}
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
                          Invoice
                        </button>
                        <button className="btn-ghost" style={{fontSize:'11px',padding:'0.3rem 0.6rem',borderColor:'rgba(var(--p3),0.25)',color:'var(--bolt)',background:'rgba(var(--p3),0.05)'}}
                          onClick={async ()=>{
                            const prompt = `LEAD ANALYSIS REQUEST\n\nBusiness: ${l.businessName}\nStatus: ${l.status}\nLocation: ${l.location||'Jamaica'}\nValue: J$${Number(l.value||0).toLocaleString()}\nPhone: ${l.phone||'Not found'}\nNotes: ${l.notes||'None'}\nLast action: ${l.nextAction||'None'} on ${l.nextActionDate||'N/A'}\nOutreach draft: ${l.outreachDraft||'None'}\n\nAs my business AI, analyse this lead and tell me:\n1. What is the best next move right now?\n2. What should I say to them?\n3. What is the probability of closing?\n4. Any red flags?`;
                            window._openJaxonChat && window._openJaxonChat(prompt);
                          }}>
                          Ask JAXON
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

          <Pager pg={{ page, pages: Math.max(1, pageCount), size: PER_PAGE, total: filtered.length, from: page * PER_PAGE, to: Math.min(filtered.length, (page + 1) * PER_PAGE), setPage }} noun="leads"/>
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
                      <span className={streak ? 'hb-fire' : ''}>{streak}d streak</span>
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
  const upPager = usePager(6), oldPager = usePager(6);
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

  const upPg = upPager(upcoming.length), oldPg = oldPager(unfinished.length);
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
        {unfinished.length === 0 ? <div className="agenda-empty small">Nothing left behind.</div> : pageOf(unfinished, oldPg).map(t => (
          <div key={t.id} className="tk-row old">
            <div className="tk-main">
              <div className="tk-title">{t.title}</div>
              <div className="tk-note">{fmtDate(t.addedDate, { weekday:'short', month:'short', day:'numeric' })} · cost −10 XP</div>
            </div>
            <button className="btn-ghost tk-carry" onClick={() => carry(t)}>Carry to today</button>
          </div>
        ))}
        <Pager pg={oldPg} noun="tasks"/>
        <div className="goal-hint" style={{ marginTop:'0.75rem' }}>A task only counts on the day it's planned. Carrying it forward gives you another shot; the missed day still counts.</div>
      </div>

      {upcoming.length > 0 && (
        <div className="card tk-list">
          <div className="card-label">Coming up · {upcoming.length}</div>
          {pageOf(upcoming, upPg).map(t => {
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
          <Pager pg={upPg} noun="tasks"/>
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
// ── Hourglass brews ──────────────────────────────────────────────────────────
// Each timer runs on its own brew: a blend of colours with its own behaviour.
// `stops` colour the liquid from the surface down; `glow` tints the card;
// `deco` is what moves inside it.
const LIQUIDS = [
  { id: 'septic',   name: 'Septic',     jp: '毒', stops: ['#e6ff5a', '#7dff2a', '#1f8f12', '#0a3a0c'], glow: '#8dff3a', froth: '#eaffb0', deco: 'bubbling', speed: 1.4 },
  { id: 'magma',    name: 'Magma',      jp: '炎', stops: ['#fff07a', '#ff9a1f', '#e2320f', '#5a0d05'], glow: '#ff7a1f', froth: '#ffe08a', deco: 'crust',    speed: 4.2 },
  { id: 'blood',    name: 'Blood Moon', jp: '血', stops: ['#ff6a6a', '#d1122a', '#7a0718', '#22030a'], glow: '#e0263a', froth: '#ffb3b3', deco: 'drips',    speed: 5.5 },
  { id: 'gold',     name: 'Liquid Gold',jp: '金', stops: ['#fff6c9', '#f2c84b', '#b9862a', '#5c3d0f'], glow: '#f2c84b', froth: '#fffbe0', deco: 'sparks',   speed: 3.4 },
  { id: 'abyss',    name: 'Abyss',      jp: '海', stops: ['#a8f4ff', '#22b8e8', '#12509e', '#07173f'], glow: '#35c4f0', froth: '#e2fbff', deco: 'currents', speed: 2.8 },
  { id: 'hex',      name: 'Hex',        jp: '呪', stops: ['#ff9bf2', '#c13bff', '#5b1aa8', '#1c0736'], glow: '#c44dff', froth: '#f6c8ff', deco: 'smoke',    speed: 3.2 },
  { id: 'sakura',   name: 'Sakura',     jp: '桜', stops: ['#fff0f4', '#ffb3c9', '#e8698f', '#7a2a48'], glow: '#ff9dbb', froth: '#ffffff', deco: 'petals',   speed: 3.8 },
  { id: 'mercury',  name: 'Mercury',    jp: '銀', stops: ['#ffffff', '#c9d2da', '#7c8792', '#2c333b'], glow: '#c9d2da', froth: '#ffffff', deco: 'bands',    speed: 6.5 },
];
const LIQUID = Object.fromEntries(LIQUIDS.map(l => [l.id, l]));
// A timer keeps the brew you picked; otherwise its id picks one, so no two look alike by default
const liquidOf = t => LIQUID[t?.liquid] || LIQUIDS[[...String(t?.id || t?.title || '')].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % LIQUIDS.length];

// Hourglass that drains as the hours are put in: the top bulb is the time
// still owed, the bottom bulb the time done.
function Hourglass({ id, pct, liquid, running, done, failed }) {
  const L = liquid, k = Math.max(0, Math.min(1, pct));
  const TOP = 'M24 24 H96 C96 62 66 82 63.5 100 H56.5 C54 82 24 62 24 24 Z';
  const BOT = 'M56.5 100 H63.5 C66 118 96 138 96 176 H24 C24 138 54 118 56.5 100 Z';
  // surface heights: the top empties from 24 down to the neck, the bottom fills from 176 up
  const yTop = 100 - 74 * Math.pow(1 - k, 0.75), yBot = 176 - 74 * Math.pow(k, 0.75);
  const wave = bend => `M0 4 Q15 ${4 - bend} 30 4 T60 4 T90 4 T120 4 T150 4 T180 4 T210 4 T240 4 V240 H0Z`;
  const g = `hg-${id}`;
  const deco = (surface, floor) => {
    const h = Math.max(0, floor - surface);
    if (h < 6) return null;
    const at = (i, n) => 30 + ((i * 53) % 60);
    switch (L.deco) {
      case 'bubbling': return (<>
        {Array.from({ length: 9 }, (_, i) => <circle key={i} className="hg-bubble" cx={at(i)} cy={floor - 3} r={1.4 + (i % 3) * 0.9} style={{ animationDelay: `${(i * 0.37) % 2.6}s`, animationDuration: `${1.5 + (i % 4) * 0.35}s`, '--rise': `${-h}px` }} fill={L.froth}/>)}
        {[36, 58, 80].map((x, i) => <circle key={`p${i}`} className="hg-pop" cx={x} cy={surface + 1} r="3.2" stroke={L.froth} style={{ animationDelay: `${i * 0.8}s` }}/>)}
      </>);
      case 'crust': return [0, 1, 2, 3].map(i => <ellipse key={i} className="hg-drift" cx={34 + i * 17} cy={surface + 6 + ((i * 11) % Math.max(4, h - 8))} rx={7 - (i % 2) * 2} ry="2.6" fill="#3a0a04" opacity="0.6" style={{ animationDelay: `${-i * 1.3}s` }}/>);
      case 'drips': return [34, 52, 71, 88].map((x, i) => <rect key={i} className="hg-drip" x={x} y={surface + 2} width="2.4" height={8 + (i % 3) * 5} rx="1.2" fill={L.stops[3]} opacity="0.55" style={{ animationDelay: `${-i * 1.1}s` }}/>);
      case 'sparks': return Array.from({ length: 7 }, (_, i) => <path key={i} className="hg-spark" d="M0 -3 L0.8 -0.8 L3 0 L0.8 0.8 L0 3 L-0.8 0.8 L-3 0 L-0.8 -0.8Z" transform={`translate(${at(i)} ${surface + 5 + ((i * 17) % Math.max(4, h - 6))})`} fill="#fffbe0" style={{ animationDelay: `${(i * 0.43) % 2.4}s` }}/>);
      case 'currents': return [0, 1, 2].map(i => <path key={i} className="hg-current" d={`M10 ${surface + 8 + i * 11} q14 -5 28 0 t28 0 t28 0 t28 0`} stroke={L.froth} opacity={0.35 - i * 0.08} style={{ animationDelay: `${-i * 1.7}s` }}/>).filter((_, i) => surface + 8 + i * 11 < floor - 2);
      case 'smoke': return [38, 60, 82].map((x, i) => <path key={i} className="hg-smoke" d={`M${x} ${floor - 2} c-8 -8 8 -14 0 -22 s8 -14 0 -22`} stroke={L.froth} style={{ animationDelay: `${-i * 1.2}s`, '--rise': `${-Math.min(40, h)}px` }}/>);
      case 'petals': return Array.from({ length: 6 }, (_, i) => <ellipse key={i} className="hg-petal" cx={at(i)} cy={surface + 3 + ((i * 13) % Math.max(4, h - 6))} rx="3.4" ry="1.7" fill="#fff6f9" opacity="0.85" style={{ animationDelay: `${-i * 0.9}s` }}/>);
      case 'bands': return [0, 1, 2].map(i => <rect key={i} className="hg-band" x="0" y={surface + 5 + i * 12} width="120" height="2.5" fill="#ffffff" opacity={0.4 - i * 0.1} style={{ animationDelay: `${-i * 2}s` }}/>).filter((_, i) => surface + 5 + i * 12 < floor - 2);
      default: return null;
    }
  };
  const body = (surface, floor) => (
    <g className="hg-liquid" style={{ transform: `translateY(${surface - 4}px)` }}>
      <path className="hg-wave back" d={wave(5)} fill={L.stops[1]} opacity="0.45"/>
      <path className="hg-wave front" d={wave(-5)} fill={`url(#${g}-fill)`}/>
    </g>
  );
  return (
    <svg className={`hourglass brew-${L.id} ${running ? 'running' : ''} ${done ? 'done' : ''} ${failed ? 'failed' : ''}`} viewBox="0 0 120 200" style={{ '--liq': L.glow, '--speed': `${L.speed}s` }}>
      <defs>
        <clipPath id={`${g}-top`}><path d={TOP}/></clipPath>
        <clipPath id={`${g}-bot`}><path d={BOT}/></clipPath>
        <linearGradient id={`${g}-fill`} x1="0" y1="0" x2="0" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={L.stops[0]}/><stop offset="0.18" stopColor={L.stops[1]}/><stop offset="0.6" stopColor={L.stops[2]}/><stop offset="1" stopColor={L.stops[3]}/>
        </linearGradient>
        <radialGradient id={`${g}-glass`} cx="0.35" cy="0.3" r="0.9"><stop offset="0" stopColor="rgba(255,255,255,0.10)"/><stop offset="1" stopColor="rgba(10,4,5,0.72)"/></radialGradient>
      </defs>
      {/* frame */}
      <line className="hg-post" x1="19" y1="20" x2="19" y2="180"/><line className="hg-post" x1="101" y1="20" x2="101" y2="180"/>
      <rect className="hg-cap" x="12" y="10" width="96" height="13" rx="2"/><rect className="hg-cap" x="12" y="177" width="96" height="13" rx="2"/>
      <rect className="hg-cap-line" x="12" y="14" width="96" height="2"/><rect className="hg-cap-line" x="12" y="184" width="96" height="2"/>
      {/* glass */}
      <path d={TOP} fill={`url(#${g}-glass)`}/><path d={BOT} fill={`url(#${g}-glass)`}/>
      <g clipPath={`url(#${g}-top)`}>{body(yTop, 100)}{deco(yTop, 100)}</g>
      <g clipPath={`url(#${g}-bot)`}>
        {running && k < 1 && <rect className="hg-stream" x="58.6" y="100" width="2.8" height={Math.max(0, yBot - 98)} fill={L.stops[1]}/>}
        {body(yBot, 176)}{deco(yBot, 176)}
      </g>
      <path d={TOP} className="hg-glass"/><path d={BOT} className="hg-glass"/>
      <path d="M31 34c2 16 9 27 17 36" className="hg-shine"/><path d="M34 166c1 -12 6 -22 13 -30" className="hg-shine"/>
      <text className="hg-mark" x="60" y="19.5" textAnchor="middle" lang="ja">{L.jp}</text>
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
    <button className="focus-pill" onClick={onOpen} style={{ '--liq': liquidOf(running).glow }} title={`${running.title}: ${fmtHM(target - el)} to go`}>
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
            const brew = liquidOf(t), color = brew.glow;
            const daysLeft = Math.round((parseLocal(t.deadline) - parseLocal(todayStr)) / 864e5);
            const perDay = st === 'active' ? left / Math.max(1, daysLeft + 1) : 0;
            const runningNow = !!t.runningSince && st === 'active';
            return (
              <div key={t.id} className={`card focus-card ${st} ${runningNow ? 'is-running' : ''}`} style={{ '--liq': color }}>
                <div className="focus-head">
                  <div>
                    <div className="focus-title">{t.title}</div>
                    <div className="focus-meta"><b className="brew-tag" style={{ '--liq': brew.glow }}>{brew.name}</b>{t.category}{t.courseId && courses.find(c => c.id === t.courseId) ? ` · ${courses.find(c => c.id === t.courseId).code}` : ''} · {fmtHM(target)} target</div>
                  </div>
                  <button className="icon-btn" title="Edit" onClick={() => setForm(t)}><Icons.edit size={12}/></button>
                </div>
                <div className="focus-body">
                  <Hourglass id={t.id} pct={el / target} liquid={brew} running={runningNow} done={st === 'done'} failed={st === 'failed'}/>
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
  const [liquid, setLiquid] = useState(data.liquid || liquidOf(data.id ? data : { id: String(Date.now()) }).id);
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
      <Field label="Brew in the hourglass">
        <div className="brew-pick">
          {LIQUIDS.map(l => (
            <button key={l.id} type="button" className={liquid === l.id ? 'on' : ''} onClick={() => setLiquid(l.id)} title={l.name}
              style={{ '--a': l.stops[0], '--b': l.stops[1], '--c': l.stops[2], '--d': l.stops[3] }}><i/><span>{l.name}</span></button>
          ))}
        </div>
      </Field>
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

      {!locked && <ModalFoot onClose={onClose} onSave={() => problems.length === 0 && onSave({ title: title.trim(), category, targetMinutes, deadline, liquid, courseId: category === 'Study' ? courseId : '', ...(editing ? {} : { elapsedSec: 0, runningSince: null, status: 'active', sessions: [] }) })}/>}
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
  const [view, setView]     = useState(window.innerWidth >= 760 ? 'week' : 'day');
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

function Finance({debts: allDebts = [], onSaveDebt, onDeleteDebt, finances: allFinances,leads,budgets,level,onAdd,onUpdate,onDelete,onSetBudget}) {
  // Work, personal, or both. `finances` below is always the chosen slice, so
  // every total, chart and list on the page agrees with the switch.
  const [scope, setScopeRaw] = useState(() => { try { return localStorage.getItem('jc_fin_scope') || 'all'; } catch { return 'all'; } });
  const setScope = v => { setScopeRaw(v); try { localStorage.setItem('jc_fin_scope', v); } catch {} };
  const finances = useMemo(() => (scope === 'all' ? allFinances : allFinances.filter(f => scopeOf(f) === scope)), [allFinances, scope]);
  const personalOnly = scope === 'personal';
  const { confirm, ConfirmUI } = useConfirm();
  const todayStr  = localDateStr();
  const thisMonth = monthOf(todayStr);
  const today     = Number(todayStr.slice(8));
  const [month, setMonth]   = useState(thisMonth);
  const [view, setView]     = useState('overview');
  const [form, setForm]     = useState(null);
  const [txType, setTxType] = useState('all');
  const [search, setSearch] = useState('');
  const dayPager = usePager(7, `${month}|${txType}|${search}|${scope}`);
  const [horizon, setHorizon] = useState(6);
  const [debtForm, setDebtForm] = useState(null);
  const [payDebt, setPayDebt] = useState(null);
  const owePager = usePager(6), owedPager = usePager(6), settledPager = usePager(5);
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
  const splitByMonth = useMemo(() => {
    const m = {};
    allFinances.forEach(f => {
      if (!f.date) return;
      const k = monthOf(f.date), w = scopeOf(f) === 'work';
      m[k] = m[k] || { wInc: 0, wExp: 0, pInc: 0, pExp: 0 };
      m[k][isIncome(f) ? (w ? 'wInc' : 'pInc') : (w ? 'wExp' : 'pExp')] += amountOf(f);
    });
    return m;
  }, [allFinances]);

  const cur = agg(month), prev = agg(addMonths(month, -1));
  const net = cur.inc - cur.exp;
  const target = personalOnly ? 0 : minProfitForLevel(level);   // the level minimum is a business target
  const isCurrent = month === thisMonth;
  const isFuture  = month > thisMonth;
  const dim = daysInMonth(month);
  const daysLeft = isCurrent ? dim - today : 0;

  // Last three COMPLETE months; months with nothing logged count as zero
  const last3 = [1, 2, 3].map(i => agg(addMonths(thisMonth, -i)));
  const avgInc = last3.reduce((s, m) => s + m.inc, 0) / 3;
  const avgExp = last3.reduce((s, m) => s + m.exp, 0) / 3;
  const avgNet = avgInc - avgExp;
  // Debts follow the same Work / Personal switch as everything else on the page
  const debts = scope === 'all' ? allDebts : allDebts.filter(d => debtScope(d) === scope);
  const byDue = (x, y) => (x.dueDate || '9999').localeCompare(y.dueDate || '9999');
  const oweList = debts.filter(d => d.direction === 'owe' && debtLeft(d) > 0).sort(byDue);
  const owedList = debts.filter(d => d.direction === 'owed' && debtLeft(d) > 0).sort(byDue);
  const settledList = debts.filter(d => debtLeft(d) === 0).sort((x, y) => (y.settledAt || '').localeCompare(x.settledAt || ''));
  const youOwe = oweList.reduce((t, d) => t + debtLeft(d), 0);
  const owedDebts = owedList.reduce((t, d) => t + debtLeft(d), 0);
  const lateOwe = oweList.filter(d => d.dueDate && d.dueDate < todayStr), lateOwed = owedList.filter(d => d.dueDate && d.dueDate < todayStr);
  const cash = finances.reduce((s, f) => s + signedAmount(f), 0) + debtCash(debts);
  const runway = avgExp > 0 ? Math.max(0, cash) / avgExp : Infinity;

  // ── Clients: retainers and money owed ──────────────────────────────────────
  const paidClients = personalOnly ? [] : leads.filter(l => l.status === 'Paid' && l.clientStatus !== 'Churned');
  const mrr = paidClients.filter(l => l.clientStatus !== 'Paused').reduce((s, l) => s + (Number(l.retainerAmount) || 0), 0);
  const retainerIn = (l, mk) => !!(l.retainerLog || {})[mk] ||
    allFinances.some(f => f.pipelineLeadId === l.id && f.paymentStage === 'Monthly Retainer' && monthOf(f.date) === mk);
  const retainers = paidClients.filter(l => Number(l.retainerAmount) > 0 && l.clientStatus !== 'Paused')
    .map(l => ({ l, amount: Number(l.retainerAmount), due: Number(l.retainerDueDay) || 1, got: retainerIn(l, thisMonth) }));
  const overdueRet = retainers.map(r => { const months = retainerArrears(r.l, allFinances, todayStr); return { ...r, months, amount: months.length * r.amount }; }).filter(r => r.months.length);
  const pendingRet = retainers.filter(r => !r.got && r.due >= today);
  const setupOwed = paidClients.map(l => {
    const paid = allFinances.filter(f => f.type === 'income' && f.pipelineLeadId === l.id && f.paymentStage !== 'Monthly Retainer').reduce((s, f) => s + amountOf(f), 0);
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

  if (!isFuture && personalOnly) {
    if (cur.inc + cur.exp > 0) add(net >= 0 ? 'ok' : 'danger', net >= 0 ? `Personal money is ${J(net)} up this month.` : `You spent ${J(-net)} more of your own money than came in this month.`);
  } else if (!isFuture) {
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
  if (lateOwe.length) add('danger', `You owe ${J(lateOwe.reduce((t, d) => t + debtLeft(d), 0))} that is past its date: ${lateOwe.map(d => d.person).join(', ')}. Pay it or agree a new date.`);
  else if (youOwe > 0 && cash < youOwe) add('warn', `You owe ${J(youOwe)} and have ${J(Math.max(0, cash))} on hand. You could not clear it today.`);
  if (lateOwed.length) add('warn', `${lateOwed.map(d => d.person).join(', ')} ${lateOwed.length === 1 ? 'owes' : 'owe'} you ${J(lateOwed.reduce((t, d) => t + debtLeft(d), 0))} past the agreed date. Ask for it.`);
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
      daily[d] = (daily[d] || 0) + signedAmount(f);
    });
    // Both kinds side by side, for the "All money" view
    const split = { work: {}, personal: {} };
    allFinances.filter(f => monthOf(f.date) === month).forEach(f => {
      const d = Number(f.date.slice(8)), k = scopeOf(f);
      split[k][d] = (split[k][d] || 0) + signedAmount(f);
    });
    let runW = 0, runP = 0;
    const lastActual = isCurrent ? today : isFuture ? 0 : dim;
    let run = 0;
    return Array.from({ length: dim }, (_, i) => {
      const d = i + 1;
      run += daily[d] || 0;
      const row = { day: d, pace: Math.round((target * d) / dim) };
      runW += split.work[d] || 0; runP += split.personal[d] || 0;
      if (d <= lastActual) { row.actual = run; row.work = runW; row.personal = runP; }
      if (isCurrent && d >= today) row.projected = Math.round(net + ((projNet - net) * (d - today)) / Math.max(1, dim - today));
      return row;
    });
  }, [finances, allFinances, month, isCurrent, isFuture, today, dim, target, net, projNet]);

  const trend = Array.from({ length: 12 }, (_, i) => {
    const mk = addMonths(thisMonth, i - 11), a = agg(mk);
    return { mk, label: monthName(mk, { month:'short' }), income: a.inc, expenses: a.exp, net: a.inc - a.exp, ...(splitByMonth[mk] || { wInc: 0, wExp: 0, pInc: 0, pExp: 0 }) };
  });
  // This month, each kind on its own and together
  const kinds = ['work', 'personal'].map(k => {
    const rows = allFinances.filter(f => monthOf(f.date) === month && scopeOf(f) === k);
    const inc = rows.filter(isIncome).reduce((t, f) => t + amountOf(f), 0), exp = rows.filter(f => !isIncome(f)).reduce((t, f) => t + amountOf(f), 0);
    return { k, label: k === 'work' ? 'Work' : 'Personal', inc, exp, net: inc - exp, n: rows.length };
  });
  const together = { inc: kinds[0].inc + kinds[1].inc, exp: kinds[0].exp + kinds[1].exp };

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


  const debtRow = d => {
    const left = debtLeft(d), total = amountOf(d), n = d.dueDate ? Math.round((parseLocal(d.dueDate) - parseLocal(todayStr)) / 864e5) : null;
    return (
      <div key={d.id} className={`debt ${d.direction} ${left === 0 ? 'settled' : ''}`}>
        <div className="row-between">
          <span className="debt-who">{d.person}<i className={`fin-kind ${debtScope(d)}`}>{debtScope(d)}</i></span>
          <b className="debt-left">{left === 0 ? 'Settled' : J(left)}</b>
        </div>
        <div className="debt-meta">{d.reason || (d.direction === 'owe' ? 'Money you owe' : 'Money owed to you')}{d.date ? ` · since ${fmtDate(d.date, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}{!d.cash ? ' · no cash changed hands' : ''}</div>
        <div className="xp-track"><div className="xp-fill" style={{ width: `${total ? Math.min(100, (debtPaid(d) / total) * 100) : 0}%` }}/></div>
        <div className="row-between debt-foot">
          <span className="fin-delta">{J(debtPaid(d))} of {J(total)} paid{(d.payments || []).length ? ` · ${(d.payments || []).length} payment${(d.payments || []).length === 1 ? '' : 's'}` : ''}</span>
          <span className="row-gap">
            {left > 0 && n !== null && <span className={`tk-due ${n <= 3 ? 'soon' : ''}`}>{n < 0 ? `${-n}d late` : n === 0 ? 'due today' : `${n}d left`}</span>}
            {left > 0 && <button className="btn-ghost tk-carry" onClick={() => setPayDebt(d)}>{d.direction === 'owe' ? 'I paid some' : 'They paid some'}</button>}
            <button className="icon-btn" onClick={() => setDebtForm(d)}><Icons.edit size={12}/></button>
          </span>
        </div>
      </div>
    );
  };

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
        <div className="seg" title="Which money every number and chart on this page counts">
          {SCOPES.map(([id, label]) => <button key={id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>{label}</button>)}
        </div>
        <div className="seg">
          {[['overview','Overview'],['debts',`Debts${oweList.length + owedList.length ? ` · ${oweList.length + owedList.length}` : ''}`],['budgets','Budgets'],['forecast','Forecast'],['invest','Invest']].map(([id, label]) => (
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
              <div className="fin-net-sub">{scope === 'work' ? 'work profit' : personalOnly ? 'personal money, in minus out' : 'net, work and personal together'} · {J(cur.inc)} in · {J(cur.exp)} out</div>
            </div>
            {!personalOnly && <div className="fin-target">
              <div className="fin-target-num">{J(target)}</div>
              <div className="fin-net-sub">Level {level} minimum</div>
            </div>}
          </div>
          {!personalOnly && <div className="fin-bar">
            <div className="fin-bar-fill" style={{ width: `${Math.max(0, Math.min(100, (net / target) * 100))}%` }}/>
            {isCurrent && <div className="fin-bar-proj" style={{ width: `${Math.max(0, Math.min(100, (projNet / target) * 100))}%` }}/>}
            {isCurrent && <div className="fin-bar-today" style={{ left: `${(today / dim) * 100}%` }} title="Where you should be today"/>}
          </div>}
          <div className="fin-bar-legend" style={personalOnly ? { display: 'none' } : undefined}>
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
            <div><dt>Owed to you</dt><dd className={owed + owedDebts > 0 ? 'warn' : ''}>{J(owed + owedDebts)}</dd></div>
            <div><dt>You owe</dt><dd className={youOwe > 0 ? 'bad' : 'good'}>{youOwe > 0 ? J(youOwe) : 'Nothing'}</dd></div>
            <div><dt>3-month avg net</dt><dd className={avgNet < target ? 'bad' : 'good'}>{J(avgNet)}</dd></div>
          </dl>
        </div>

        <div className="grid-2">
          <div className="fin-tile"><span>Income</span><b className="good">{J(cur.inc)}</b><Delta v={pctChange(cur.inc, prev.inc)}/></div>
          <div className="fin-tile"><span>Expenses</span><b className="bad">{J(cur.exp)}</b><Delta v={pctChange(cur.exp, prev.exp)} good="down"/></div>
          <div className="fin-tile"><span>Kept per J$1 earned</span><b>{cur.inc > 0 ? `${Math.round((net / cur.inc) * 100)}¢` : '—'}</b><span className="fin-delta">aim for 30¢+</span></div>
          <div className="fin-tile"><span>Transactions</span><b>{finances.filter(f => monthOf(f.date) === month).length}</b><span className="fin-delta">{sinceLog === null ? 'none yet' : sinceLog === 0 ? 'logged today' : `last ${sinceLog}d ago`}</span></div>
        </div>

        <div className="card fin-pos">
          <div className="row-between" style={{ marginBottom: '0.7rem' }}>
            <span className="card-label" style={{ margin: 0 }}>Where you really stand</span>
            <button className="link-btn" onClick={() => setView('debts')}>Debts ›</button>
          </div>
          <div className="fin-pos-row">
            <div><em>Cash on hand</em><b className={cash < 0 ? 'bad' : ''}>{J(cash)}</b></div>
            <i>+</i>
            <div><em>Owed to you</em><b className="good">{J(owed + owedDebts)}</b><u>{owedList.length + overdueRet.length + setupOwed.length} to collect</u></div>
            <i>−</i>
            <div><em>You owe</em><b className={youOwe ? 'bad' : ''}>{J(youOwe)}</b><u>{oweList.length} to pay</u></div>
            <i>=</i>
            <div className="sum"><em>If it all settled today</em><b className={cash + owed + owedDebts - youOwe < 0 ? 'bad' : ''}>{J(cash + owed + owedDebts - youOwe)}</b></div>
          </div>
        </div>

        <div className="card fin-split">
          <div className="card-label">Work and personal · {monthName(month, { month:'long' })}</div>
          <div className="fin-split-grid">
            {kinds.map(x => (
              <button key={x.k} className={`fin-split-col ${x.k} ${scope === x.k ? 'on' : ''}`} onClick={() => setScope(scope === x.k ? 'all' : x.k)} title={`Show only ${x.label.toLowerCase()} money`}>
                <em>{x.label}</em>
                <b className={x.net < 0 ? 'bad' : ''}>{J(x.net)}</b>
                <span><i className="good">+{J(x.inc)}</i><i className="bad">−{J(x.exp).replace('−', '')}</i></span>
                <u>{x.n} transaction{x.n === 1 ? '' : 's'}</u>
              </button>
            ))}
            <button className={`fin-split-col both ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')} title="Show all money">
              <em>Together</em>
              <b className={together.inc - together.exp < 0 ? 'bad' : ''}>{J(together.inc - together.exp)}</b>
              <span><i className="good">+{J(together.inc)}</i><i className="bad">−{J(together.exp).replace('−', '')}</i></span>
              <u>{kinds[0].n + kinds[1].n} transaction{kinds[0].n + kinds[1].n === 1 ? '' : 's'}</u>
            </button>
          </div>
          <div className="fin-split-bar" title="Share of this month's spending">
            {together.exp > 0 && <><i className="w" style={{ width: `${(kinds[0].exp / together.exp) * 100}%` }}/><i className="p" style={{ width: `${(kinds[1].exp / together.exp) * 100}%` }}/></>}
          </div>
          <div className="fin-delta">{together.exp > 0 ? `Of every J$100 spent this month, J$${Math.round((kinds[0].exp / together.exp) * 100)} was work and J$${Math.round((kinds[1].exp / together.exp) * 100)} was personal.` : 'Nothing spent yet this month.'}</div>
        </div>

        <div className="card span-8">
          <div className="row-between" style={{ marginBottom:'0.75rem' }}>
            <span className="card-label" style={{ margin:0 }}>{personalOnly ? 'Personal money this month' : 'Profit pace'}</span>
            <span className="fin-legend">{scope === 'all' ? <><i className="l-actual"/>Together<i className="l-work"/>Work<i className="l-pers"/>Personal</> : <><i className="l-actual"/>Actual</>}<i className="l-proj"/>Projected{!personalOnly && <><i className="l-pace"/>Required pace</>}</span>
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
              {!personalOnly && <ReferenceLine y={target} stroke="#d3a855" strokeDasharray="5 4" label={{ value:'Minimum', fill:'#d3a855', fontSize:10, position:'insideTopLeft' }}/>}
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)"/>
              {!personalOnly && <Line type="linear" dataKey="pace" name="Required pace" stroke="rgba(211,168,85,0.45)" strokeWidth={1.5} dot={false}/>}
              {scope === 'all' && <Line type="stepAfter" dataKey="work" name="Work" stroke="#ff9a4a" strokeWidth={1.6} dot={false} connectNulls={false}/>}
              {scope === 'all' && <Line type="stepAfter" dataKey="personal" name="Personal" stroke="#3ab88e" strokeWidth={1.6} dot={false} connectNulls={false}/>}
              <Area type="stepAfter" dataKey="actual" name={scope === 'all' ? 'Together' : 'Actual'} stroke="#e6c47c" fill="url(#finAct)" strokeWidth={2} connectNulls={false}/>
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
            <span className="fin-legend">{scope === 'all'
              ? <><i className="l-inc"/>Work in<i className="l-pinc"/>Personal in<i className="l-exp"/>Work out<i className="l-pexp"/>Personal out<i className="l-net"/>Net together</>
              : <><i className="l-inc"/>Income<i className="l-exp"/>Expenses<i className="l-net"/>Net</>}</span>
          </div>
          <ResponsiveContainer width="100%" height={CHART_H(150)}>
            <ComposedChart data={trend} margin={{ left:0, right:8, top:6, bottom:0 }} onClick={e => e?.activePayload?.[0] && setMonth(e.activePayload[0].payload.mk)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,166,74,0.08)"/>
              <XAxis dataKey="label" tick={axis}/>
              <YAxis tick={axis} width={40} tickFormatter={Jk}/>
              <Tooltip contentStyle={tt} formatter={v => J(v)} cursor={{ fill:'rgba(212,166,74,0.07)' }}/>
              {!personalOnly && <ReferenceLine y={target} stroke="#d3a855" strokeDasharray="5 4"/>}
              {scope === 'all' ? [
                <Bar key="wi" dataKey="wInc" name="Work in" stackId="in" fill="#e6c47c" maxBarSize={22}/>,
                <Bar key="pi" dataKey="pInc" name="Personal in" stackId="in" fill="#3ab88e" maxBarSize={22} radius={[3,3,0,0]}/>,
                <Bar key="we" dataKey="wExp" name="Work out" stackId="out" fill="#ff6a45" maxBarSize={22}/>,
                <Bar key="pe" dataKey="pExp" name="Personal out" stackId="out" fill="#a8483a" maxBarSize={22} radius={[3,3,0,0]}/>,
              ] : [
                <Bar key="i" dataKey="income" name="Income" maxBarSize={22} radius={[3,3,0,0]}>
                  {trend.map(t => <Cell key={t.mk} fill={t.mk === month ? '#f2ddab' : 'rgba(212,166,74,0.6)'}/>)}
                </Bar>,
                <Bar key="e" dataKey="expenses" name="Expenses" maxBarSize={22} radius={[3,3,0,0]}>
                  {trend.map(t => <Cell key={t.mk} fill={t.mk === month ? '#ff6a45' : 'rgba(255,106,69,0.5)'}/>)}
                </Bar>,
              ]}
              <Line type="monotone" dataKey="net" name={scope === 'all' ? 'Net together' : 'Net'} stroke="#f2ddab" strokeWidth={2} dot={{ r:2.5 }}/>
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
            : pageOf(txGroups, dayPager(txGroups.length)).map(g => (
              <div key={g.date} className="fin-day">
                <div className="fin-day-head">
                  <span>{g.date ? fmtDate(g.date, { weekday:'short', month:'short', day:'numeric', ...(q ? { year:'numeric' } : {}) }) : 'No date'}</span>
                  <span>{J(g.items.reduce((s, f) => s + signedAmount(f), 0))}</span>
                </div>
                {g.items.map(f => {
                  const client = leads.find(l => l.id === f.pipelineLeadId);
                  return (
                    <button key={f.id} className={`fin-tx ${f.type}`} onClick={() => setForm(f)}>
                      <span className="fin-tx-dot"/>
                      <span className="fin-tx-main">
                        <span className="fin-tx-desc">{f.description}</span>
                        <span className="fin-tx-meta"><i className={`fin-kind ${scopeOf(f)}`}>{scopeOf(f)}</i>{f.category}{client ? ` · ${client.businessName}` : ''}{f.paymentStage && f.paymentStage !== f.category ? ` · ${f.paymentStage}` : ''}</span>
                      </span>
                      <span className="fin-tx-amt">{f.type === 'income' ? '+' : '−'}{J(amountOf(f)).replace('−', '')}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          {txGroups.length > 0 && <Pager pg={dayPager(txGroups.length)} noun="days"/>}
        </div>
      </>)}

      {view === 'debts' && (() => {
        const clientRows = [...overdueRet.map(r => ({ id: `r${r.l.id}`, who: r.l.businessName, what: r.months.length > 1 ? `${r.months.length} retainers unpaid` : 'Retainer unpaid', amt: r.amount })),
          ...setupOwed.map(x => ({ id: `s${x.l.id}`, who: x.l.businessName, what: 'Balance on the project fee', amt: x.due }))];
        const split = dir => ['work', 'personal'].map(k => allDebts.filter(d => d.direction === dir && debtScope(d) === k).reduce((t, d) => t + debtLeft(d), 0));
        const [oweW, oweP] = split('owe'), [owedW, owedP] = split('owed');
        const owePg = owePager(oweList.length), owedPg = owedPager(owedList.length), setPg = settledPager(settledList.length);
        return (<>
          <div className="grid-2">
            <div className="fin-tile"><span>You owe</span><b className={youOwe ? 'bad' : 'good'}>{J(youOwe)}</b><span className="fin-delta">{oweList.length} open{lateOwe.length ? ` · ${lateOwe.length} past its date` : ''}</span></div>
            <div className="fin-tile"><span>Owed to you</span><b className="good">{J(owedDebts + owed)}</b><span className="fin-delta">{owedList.length} {owedList.length === 1 ? 'person' : 'people'}{owed ? ` · ${J(owed)} from clients` : ''}</span></div>
            <div className="fin-tile"><span>Net</span><b className={owedDebts + owed - youOwe < 0 ? 'bad' : ''}>{J(owedDebts + owed - youOwe)}</b><span className="fin-delta">{owedDebts + owed - youOwe < 0 ? 'you owe more than you are owed' : 'owed to you, less what you owe'}</span></div>
            <div className="fin-tile"><span>Cash on hand</span><b className={cash < youOwe ? 'warn' : ''}>{J(cash)}</b><span className="fin-delta">{youOwe ? (cash >= youOwe ? 'enough to clear what you owe' : `${J(youOwe - Math.max(0, cash))} short of clearing it`) : 'nothing to clear'}</span></div>
          </div>
          <div className="card fin-debt-split">
            <div className="card-label">Work and personal · everything still open</div>
            <div className="fin-debt-grid">
              <span/><em>Work</em><em>Personal</em><em>Together</em>
              <span>You owe</span><b className={oweW ? 'bad' : ''}>{J(oweW)}</b><b className={oweP ? 'bad' : ''}>{J(oweP)}</b><b className={oweW + oweP ? 'bad' : ''}>{J(oweW + oweP)}</b>
              <span>Owed to you</span><b>{J(owedW + (personalOnly ? 0 : owed))}</b><b>{J(owedP)}</b><b>{J(owedW + owedP + (personalOnly ? 0 : owed))}</b>
            </div>
          </div>
          <div className="card span-6">
            <div className="row-between" style={{ marginBottom: '0.6rem' }}>
              <span className="card-label" style={{ margin: 0 }}>You owe · {oweList.length}</span>
              <button className="btn-ghost tk-carry" onClick={() => setDebtForm({ direction: 'owe' })}><Icons.plus size={12}/> I owe someone</button>
            </div>
            {oweList.length === 0 ? <div className="agenda-empty small">You owe nobody. Keep it that way.</div> : pageOf(oweList, owePg).map(debtRow)}
            <Pager pg={owePg} noun="debts"/>
          </div>
          <div className="card span-6">
            <div className="row-between" style={{ marginBottom: '0.6rem' }}>
              <span className="card-label" style={{ margin: 0 }}>Owed to you · {owedList.length + clientRows.length}</span>
              <button className="btn-ghost tk-carry" onClick={() => setDebtForm({ direction: 'owed' })}><Icons.plus size={12}/> Someone owes me</button>
            </div>
            {owedList.length + clientRows.length === 0 && <div className="agenda-empty small">Nobody owes you anything.</div>}
            {pageOf(owedList, owedPg).map(debtRow)}
            <Pager pg={owedPg} noun="debts"/>
            {clientRows.map(c => (
              <div key={c.id} className="debt owed client">
                <div className="row-between"><span className="debt-who">{c.who}<i className="fin-kind work">client</i></span><b className="debt-left">{J(c.amt)}</b></div>
                <div className="debt-meta">{c.what} · tracked in Clients, shown here so nothing is missed</div>
              </div>
            ))}
          </div>
          {settledList.length > 0 && (
            <div className="card">
              <div className="card-label">Settled · {settledList.length}</div>
              {pageOf(settledList, setPg).map(debtRow)}
              <Pager pg={setPg} noun="settled"/>
            </div>
          )}
          <div className="goal-hint">A debt is not income and paying it back is not spending, so none of this changes your profit. It does change your cash on hand when cash moved. Clearing a debt you owe is +10 XP; letting one run past its date is −10.</div>
        </>);
      })()}

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

      {debtForm && (
        <DebtModal data={debtForm} todayStr={todayStr} defaultScope={scope === 'work' ? 'work' : 'personal'}
          onSave={d => { onSaveDebt(d); setDebtForm(null); }}
          onDelete={debtForm.id ? async () => { if (await confirm({ message: `Delete the record of ${J(amountOf(debtForm))} with ${debtForm.person}? Use this only if it was entered by mistake.`, label: 'Delete', danger: true })) { onDeleteDebt(debtForm.id); setDebtForm(null); } } : null}
          onClose={() => setDebtForm(null)}/>
      )}
      {payDebt && (
        <DebtPayModal debt={payDebt} todayStr={todayStr}
          onSave={pay => {
            const payments = [...(payDebt.payments || []), { id: Date.now().toString(36), ...pay }];
            const left = Math.max(0, amountOf(payDebt) - payments.reduce((t, x) => t + amountOf(x), 0));
            onSaveDebt({ id: payDebt.id, payments, settledAt: left === 0 ? pay.date : '' });
            setPayDebt(null);
          }}
          onClose={() => setPayDebt(null)}/>
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

function DebtModal({ data, todayStr, defaultScope, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ direction: 'owe', person: '', amount: '', scope: defaultScope, reason: '', date: todayStr, dueDate: '', cash: true, ...data });
  const s = (k, val) => setF(x => ({ ...x, [k]: val }));
  const owe = f.direction === 'owe';
  const paid = debtPaid(f), amt = Math.round(Math.abs(Number(f.amount)) * 100) / 100;
  const valid = f.person.trim() && amt > 0 && amt >= paid;
  const save = () => { if (!valid) return; const { createdAt, ...rest } = f; onSave({ ...rest, person: f.person.trim(), reason: (f.reason || '').trim(), amount: amt, payments: f.payments || [], settledAt: amt - paid <= 0 ? (f.settledAt || todayStr) : '' }); };
  return (
    <Modal title={data.id ? `Debt · ${data.person}` : owe ? 'Money You Owe' : 'Money Owed To You'} onClose={onClose}>
      <div className="seg seg-full">
        <button type="button" className={owe ? 'on' : ''} onClick={() => s('direction', 'owe')} disabled={!!data.id}>I owe them</button>
        <button type="button" className={!owe ? 'on' : ''} onClick={() => s('direction', 'owed')} disabled={!!data.id}>They owe me</button>
      </div>
      <div className={`fin-amount ${owe ? 'expense' : 'income'}`}><span>J$</span><input type="number" min="0" autoFocus value={f.amount} onChange={e => s('amount', e.target.value)} placeholder="0"/></div>
      {paid > 0 && <div className="fin-delta">{J(paid)} already paid back, so the amount can't go below that.</div>}
      <div className="grid-2">
        <Field label={owe ? 'Who do you owe?' : 'Who owes you?'}><input className="input" value={f.person} onChange={e => s('person', e.target.value)} placeholder="Name"/></Field>
        <Field label="What for?"><input className="input" value={f.reason} onChange={e => s('reason', e.target.value)} placeholder={owe ? 'e.g. borrowed for rent' : 'e.g. lent for lunch, website balance'}/></Field>
      </div>
      <Field label="Whose money is this?">
        <div className="seg seg-full">
          <button type="button" className={f.scope === 'work' ? 'on' : ''} onClick={() => s('scope', 'work')}>Work</button>
          <button type="button" className={f.scope !== 'work' ? 'on' : ''} onClick={() => s('scope', 'personal')}>Personal</button>
        </div>
      </Field>
      <div className="grid-2">
        <Field label="Started on"><input className="input" type="date" max={todayStr} value={f.date || ''} onChange={e => s('date', e.target.value)}/></Field>
        <Field label={owe ? 'Pay back by (optional)' : 'They pay by (optional)'}><input className="input" type="date" value={f.dueDate || ''} onChange={e => s('dueDate', e.target.value)}/></Field>
      </div>
      <label className="svc-skip"><input type="checkbox" checked={!!f.cash} onChange={e => s('cash', e.target.checked)}/> {owe ? 'I got this as cash (it went into my money on hand)' : 'I handed this over as cash (it left my money on hand)'}</label>
      <div className="focus-preview"><div>{owe ? 'Untick the box if it is a bill you have not paid, not a loan you received.' : 'Untick the box if it is work done or goods given that have not been paid for.'}</div></div>
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent: 'center' }} onClick={onDelete}><Icons.trash size={13}/> Delete (entered by mistake)</button>}
    </Modal>
  );
}

function DebtPayModal({ debt, todayStr, onSave, onClose }) {
  const left = debtLeft(debt), owe = debt.direction === 'owe';
  const [amount, setAmount] = useState(String(left));
  const [date, setDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const n = Math.round(Math.abs(Number(amount)) * 100) / 100;
  const valid = n > 0 && n <= left;
  return (
    <Modal title={owe ? `Paying ${debt.person}` : `${debt.person} paid you`} onClose={onClose}>
      <div className={`fin-amount ${owe ? 'expense' : 'income'}`}><span>J$</span><input type="number" min="0" max={left} autoFocus value={amount} onChange={e => setAmount(e.target.value)}/></div>
      <div className="fin-delta">{J(left)} still open{valid && n < left ? ` · ${J(left - n)} will be left` : valid ? ' · this settles it' : n > left ? ' · that is more than is owed' : ''}</div>
      <div className="grid-2">
        <Field label="Date"><input className="input" type="date" max={todayStr} value={date} onChange={e => setDate(e.target.value)}/></Field>
        <Field label="Note (optional)"><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. bank transfer"/></Field>
      </div>
      <div className="focus-preview"><div>{owe ? 'This comes off your cash on hand. It is not counted as spending.' : 'This goes onto your cash on hand. It is not counted as income.'}</div></div>
      <ModalFoot onClose={onClose} onSave={() => valid && onSave({ amount: n, date, note: note.trim() })}/>
    </Modal>
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
        {loading ? 'JAXON is analysing…' : 'Ask JAXON for reinvestment advice'}
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
  const amt = Math.round(Math.abs(Number(f.amount)) * 100) / 100;
  const valid = f.description.trim() && amt > 0 && f.date;
  // Work or personal: follows the category until you choose it yourself
  const kind = f.scope || scopeOf({ ...f, category });
  const setType = t => setF(p => ({ ...p, type: t, category: (t === 'income' ? INCOME_CATS : EXPENSE_CATS)[0], ...(t === 'expense' ? { pipelineLeadId: '' } : {}) }));
  const save = () => {
    if (!valid) return;
    const out = { ...f, category, amount: amt, scope: kind, description: f.description.trim() };
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
      <Field label="Whose money is this?">
        <div className="seg seg-full">
          <button type="button" className={kind === 'work' ? 'on' : ''} onClick={() => s('scope', 'work')}>Work</button>
          <button type="button" className={kind === 'personal' ? 'on' : ''} onClick={() => s('scope', 'personal')}>Personal</button>
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
      <button className="btn-primary" style={{justifyContent:'center',opacity:loading?0.7:1}} onClick={launch} disabled={loading||!topic.trim()}>{loading?'Launching...':'Launch research'}</button>
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
      <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={generatePDF}>{DESKTOP ? 'Save invoice PDF' : 'Download invoice'}</button>
      <ModalFoot onClose={onClose}/>
      </>
    </Modal>
  );
}

// ─── VENTURES ─────────────────────────────────────────────────────────────────
// Every business in one place. Each venture has its own plan, people, links,
// services and daily check. A venture with a project folder on this Mac also
// gets a read-only control room: the repo, the keys and the live money, plus
// safe checks. The console never changes the other project or its data.
const VENTURE_STAGES = ['Idea', 'Building', 'Live', 'Paused'];
// Shop-sign words: 構想 idea, 準備中 getting ready, 営業中 open for business, 休止 paused
const STAGE_JP = { Idea: '構想', Building: '準備中', Live: '営業中', Paused: '休止' };
const VENTURE_HEX = ['#e6c47c', '#ff7a3d', '#3ab88e', '#6aa8ff', '#c58cff', '#ff6a8a'];
const PERSON_ROLES = ['Partner', 'Investor', 'Team', 'Runner', 'Supplier', 'Customer', 'Advisor', 'Other'];
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
const createdSec = x => x.createdAt?.seconds ?? Infinity;
const byCreated = (a, b) => createdSec(a) - createdSec(b);
const fullUrl = u => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

// Every outside service a venture depends on, worked out from its code.
// `bills` says how the service charges; the amounts you actually pay come
// from the bills you log (they are real Finance entries), because none of
// these companies offers a way to read your spend with the logins on this Mac.
const SERVICE_GROUPS = ['Runs the app', 'Payments', 'Alerts and media', 'Build and ship', 'Dashboards', 'Added by you'];
function ventureServices(o) {
  if (!o?.ok) return [];
  const p = o.firebaseProject, u = o.uses || {};
  const list = [];
  const add = (group, id, name, does, bills, url, cat = 'Tools', logs = '') => list.push({ group, id, name, does, bills, url, cat, logs });
  if (p) {
    add('Runs the app', 'firebase', 'Firebase (Google Cloud)', `Database, sign-in, server functions${u.hosting ? ', web hosting' : ''}${u.storage ? ', photo storage' : ''}${u.scheduler ? ', scheduled jobs' : ''}${u.tasks ? ', task queue' : ''}`,
      `Pay as you go above the free quotas, on one Google Cloud bill.${u.warm ? ` ${u.warm} function${u.warm === 1 ? ' is' : 's are'} kept warm, which is a fixed charge every month even with no orders.` : ''}`,
      `https://console.firebase.google.com/project/${p}/usage`, 'Hosting', `https://console.cloud.google.com/logs/query?project=${p}`);
    add('Runs the app', 'gcp-bill', 'Google Cloud bill', 'The one place that shows what Google has really charged this month', 'This is the actual figure for Firebase, Maps and reCAPTCHA together. Read it here, then log it.', `https://console.cloud.google.com/billing/linkedaccount?project=${p}`, 'Hosting');
    if (u.maps) add('Runs the app', 'maps', 'Google Maps Platform', 'Maps in the Android and iPhone apps', 'Charged per map load above a monthly free allowance, on the Google Cloud bill. An unrestricted key can be run up by anyone.', `https://console.cloud.google.com/google/maps-apis/metrics?project=${p}`, 'Hosting');
    if (u.appCheck) add('Runs the app', 'recaptcha', 'reCAPTCHA Enterprise (App Check)', 'Proves requests come from the real web app', 'Free up to a monthly number of checks, then charged per check, on the Google Cloud bill.', `https://console.cloud.google.com/security/recaptcha?project=${p}`, 'Hosting');
    if (u.googleSignIn) add('Runs the app', 'google-signin', 'Google Sign-In', 'Signing in with a Google account', 'Free.', `https://console.cloud.google.com/apis/credentials?project=${p}`);
  }
  if (o.has.vercel) add('Runs the app', 'vercel', 'Vercel', 'Second web host and payment return pages', "Free on the Hobby plan, but check the terms: Vercel's free plan is meant for non-commercial sites. Pro is a monthly fee per member.", 'https://vercel.com/dashboard', 'Hosting', 'https://vercel.com/dashboard');
  if (o.secrets.some(x => /FYGARO/.test(x.key)) || o.docs.includes('PAYMENTS_SETUP.md')) add('Payments', 'fygaro', 'Fygaro', 'Card payments, payouts and refunds', 'A fee on every card payment, at the rate in your Fygaro agreement. No payments, no cost.', 'https://app.fygaro.com/', 'Tools', 'https://app.fygaro.com/');
  if (u.render) add('Runs the app', 'render', 'Render', 'Runs the server, all day, every day', 'A monthly fee for an always-on instance. A free instance sleeps when idle, which would miss messages.', 'https://dashboard.render.com/', 'Hosting', 'https://dashboard.render.com/');
  if (u.redis) add('Runs the app', 'redis', u.render ? 'Redis (Render Key Value)' : 'Redis', 'Carts, sessions and protection against handling a message twice', 'A monthly fee by size. Free instances are small and can lose data on restart.', u.render ? 'https://dashboard.render.com/' : '', 'Hosting');
  if (u.meta) add('Runs the app', 'meta', 'Meta WhatsApp Cloud API', 'Receives and sends every WhatsApp message', "Replies inside a customer's 24-hour window are free. Messages the business starts (templates) are charged by Meta to the WhatsApp Business account.", 'https://developers.facebook.com/apps/', 'Tools', 'https://business.facebook.com/wa/manage/home/');
  if (u.anthropic) add('Runs the app', 'anthropic', 'Anthropic (Claude API)', 'The AI that reads lists and answers customers', 'Prepaid credit, used up per message. When the credit or the spend limit runs out, the AI stops answering.', 'https://console.anthropic.com/settings/billing', 'AI API', 'https://console.anthropic.com/settings/logs');
  if (u.ecwid) add('Runs the app', 'ecwid', 'Ecwid store', 'The product list, prices and checkout the bot reads and sends people to', "Paid by the store's owner as their own subscription. API access depends on their plan.", 'https://my.ecwid.com/');
  if (u.groq) add('Runs the app', 'groq', 'Groq', u.groqCalled ? 'A second AI provider' : 'An AI provider with a key still set; the code no longer calls it', 'Free allowance, then per use.', 'https://console.groq.com/', 'AI API');
  if (u.ntfy) add('Alerts and media', 'ntfy', 'ntfy', 'Order alerts on each store phone', 'Free, with a shared daily message limit (your code notes say about 250 a day, and busy times can be refused). A paid account removes that.', 'https://ntfy.sh/account');
  if (u.photoroom) add('Alerts and media', 'photoroom', 'Photoroom API', 'Cuts the background out of store and menu photos', 'A small free image allowance, then charged per image.', 'https://app.photoroom.com/api-dashboard');
  if (u.push) add('Alerts and media', 'push', 'Push notifications', 'Expo push for the apps, Firebase Cloud Messaging for the web app', 'Free.', 'https://expo.dev/');
  if (o.git?.remote) {
    add('Build and ship', 'github', 'GitHub', 'Code, history and Dependabot updates', 'Free for this use.', o.git.remote);
    if (o.has.ci) add('Build and ship', 'github-ci', 'GitHub Actions', 'Automatic checks on every push', 'Free minutes each month for private repositories, then charged per minute.', `${o.git.remote}/actions`, 'Tools', `${o.git.remote}/actions`);
  }
  if (o.has.expo) add('Build and ship', 'expo', 'Expo (EAS Build)', 'Builds the Android and iPhone apps', 'Free plan has a limited number of builds a month and a slower queue. Paid plans are a monthly fee.', 'https://expo.dev/', 'Tools', 'https://expo.dev/');
  if (u.play) add('Build and ship', 'play', 'Google Play Console', 'Publishing the Android app', 'One-time US$25 registration. No monthly fee.', 'https://play.google.com/console');
  if (p) {
    add('Dashboards', 'functions-logs', 'Server logs', 'Errors from payments, pushes and order handling', 'No cost of its own.', `https://console.cloud.google.com/logs/query?project=${p}`);
    add('Dashboards', 'gcp-keys', 'Google Cloud API keys', 'Where the Maps keys are restricted and rotated', 'No cost of its own.', `https://console.cloud.google.com/apis/credentials?project=${p}`);
  }
  list.forEach(x => { x.est = estimateFor(x.id, u); });
  return list;
}
// ── What each service is likely to cost ──────────────────────────────────────
// US$ a month: a fixed part (min to max) plus a part per order. These are
// estimates from published list prices and from what the code is set up to
// use, not from your bills. `sure` marks where the price itself was confirmed
// on the provider's page (Oct 2026); the rest is from memory or an assumption
// that is spelled out in `basis`.
const USAGE_LEVELS = [0, 50, 100, 250, 500, 1000, 2500, 5000];
function estimateFor(id, u = {}) {
  const E = (min, max, unitMin, unitMax, basis, sure = false) => ({ min, max, unitMin, unitMax, basis, sure });
  switch (id) {
    case 'firebase': {
      const w = u.warm || 0;
      return E(w * 6.8, 2 + w * 9.75, 0.0005, 0.004,
        `${w ? `${w} function${w === 1 ? '' : 's'} kept warm (1 vCPU, 512 MB) cost about US$7 to US$10 each a month while idle. ` : ''}Database reads, writes and function time add a fraction of a cent per order once past Google's free quotas.`);
    }
    case 'gcp-bill': {   // the one bill the Google services arrive on: shown, never added twice
      const parts = ['firebase', ...(u.maps ? ['maps'] : []), ...(u.appCheck ? ['recaptcha'] : [])].map(k => estimateFor(k, u));
      return { ...E(parts.reduce((t, x) => t + x.min, 0), parts.reduce((t, x) => t + x.max, 0), parts.reduce((t, x) => t + x.unitMin, 0), parts.reduce((t, x) => t + x.unitMax, 0),
        'This is Firebase, Maps and reCAPTCHA added together, because Google sends them as one bill. It is not counted again in the totals.'), skipTotal: true };
    }
    case 'functions-logs': case 'gcp-keys': return { ...E(0, 0, 0, 0, 'A page you look at. It costs nothing.'), skipTotal: true };
    case 'maps': return E(0, 5, 0, 0, 'The map inside the Android and iPhone apps is free, and delivery distances are worked out without calling Google. Only a web map with a key would cost anything.');
    case 'recaptcha': return E(0, 8, 0, 0, 'Free for the first 10,000 checks a month; US$8 a month up to 100,000.');
    case 'google-signin': return E(0, 0, 0, 0, 'Free.');
    case 'vercel': return E(0, 20, 0, 0, 'US$0 on Hobby; US$20 a month per member on Pro, which a business site is meant to use.');
    case 'fygaro': return E(0, 0, 0, 0.47, 'Nothing when a student pays with coins bought in cash. Up to about 5% of the order when paid by card: US$0.47 on a J$1,500 order. The real rate is in your Fygaro agreement.');
    case 'ntfy': return E(0, 5, 0, 0, 'Free with a shared daily limit; US$5 a month for a supporter account that lifts it.');
    case 'photoroom': return E(0, 20, 0, 0, 'First 10 photos free, then US$0.02 a photo, sold in packs: US$20 for 1,000.', true);
    case 'push': return E(0, 0, 0, 0, 'Free.');
    case 'github': return E(0, 4, 0, 0, 'Free for this use; US$4 a month only if you move to GitHub Pro.');
    case 'github-ci': return E(0, 3, 0, 0, '2,000 free minutes a month on a private repository; a few dollars only if the checks run very often.');
    case 'expo': return E(0, 19, 0, 0, 'Free plan: 15 Android and 15 iPhone builds a month. Starter is US$19 a month plus usage.', true);
    case 'play': return E(0, 0, 0, 0, 'US$25 once to register. Nothing monthly.');
    case 'render': return E(7, 25, 0, 0, 'US$7 a month for the smallest always-on instance, US$25 for the next size. A free instance costs nothing but sleeps, which would miss messages.');
    case 'redis': return E(0, 10, 0, 0, 'Free at 25 MB with no saved data across restarts; US$10 a month for the 256 MB instance that keeps carts safe.');
    case 'meta': return E(0, 5, 0, 0, "Replies inside a customer's 24-hour window are free, and that is all the bot sends. Only messages the business starts are charged.");
    case 'anthropic': return E(0, 0, 0.03, 0.4, 'At the rates in your code (Haiku 4.5 US$1 in / US$5 out, Sonnet 5 US$2 in / US$10 out per million tokens), a short order is a few cents and a long pasted list up to about US$0.40. The bot logs the real cost per order once the 28 Sep work is live.');
    case 'ecwid': return E(0, 0, 0, 0, "The store's owner pays for Ecwid. Nothing lands on you.");
    case 'groq': return E(0, 0, 0, 0, 'Not called by the code, so nothing.');
    default: return null;
  }
}
const estAt = (e, n) => (e ? { min: e.min + e.unitMin * n, max: e.max + e.unitMax * n } : { min: 0, max: 0 });
const US = n => `US$${n >= 100 ? Math.round(n).toLocaleString() : n >= 10 ? n.toFixed(0) : n > 0 && n < 0.01 ? String(Number(n.toFixed(4))) : n.toFixed(n % 1 ? 2 : 0)}`;
const estText = (e, fx) => {
  if (!e) return '';
  const fixed = e.min === e.max ? (e.max ? `${US(e.max)} a month` : '') : `${US(e.min)} to ${US(e.max)} a month`;
  const unit = e.unitMax ? `${e.unitMin ? `${US(e.unitMin)} to ` : 'up to '}${US(e.unitMax)} an order` : '';
  return [fixed, unit].filter(Boolean).join(' + ') || 'US$0';
};

// The services you look at every day: everything except plain dashboards and
// anything you chose to leave out
const roundServices = (o, services) => [...ventureServices(o), ...services.filter(x => x.custom).map(x => ({ group: 'Added by you', id: x.serviceId, name: x.name }))]
  .filter(x => x.group !== 'Dashboards' && !services.find(m => m.serviceId === x.id)?.noRounds);
// What a service is planned to cost per month, from what you entered
const COST_TYPES = [['monthly', 'Every month'], ['yearly', 'Every year'], ['once', 'One-time'], ['usage', 'Depends on use'], ['free', 'Free']];
const svcMonthly = m => { const a = Number(m.monthlyCost) || 0, t = m.costType || 'monthly'; return t === 'monthly' || t === 'usage' ? a : t === 'yearly' ? a / 12 : 0; };
const svcPlanText = m => {
  const a = Number(m.monthlyCost) || 0, t = m.costType || (a ? 'monthly' : '');
  if (t === 'free') return 'Free';
  if (t === 'usage') return a ? `About ${J(a)} a month, by use` : 'Depends on use';
  if (!a) return 'Not set';
  return t === 'yearly' ? `${J(a)} a year` : t === 'once' ? `${J(a)} one-time` : `${J(a)} a month`;
};

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

// The state of one venture, worked out from what is really there: the folder,
// the live data, its services and its plan. Nothing here is typed in by hand.
function ventureHealth(v, d, { services, items, todayStr, rounds = {} }) {
  const o = d?.o, money = d?.money, now = Date.now();
  const findings = [];
  const add = (lv, t) => findings.push({ lv, t });
  const days = date => Math.round((parseLocal(date) - parseLocal(todayStr)) / 864e5);
  const s1 = n => (n === 1 ? '' : 's');

  if (v.dir && o && !o.ok) add('danger', `Project folder problem: ${o.error}.`);
  if (o?.ok) {
    const missing = o.secrets.filter(s => !s.set);
    if (missing.length) add('danger', `${missing.length} key${missing.length === 1 ? ' is' : 's are'} empty: ${missing.map(s => s.key).join(', ')}.`);
    const fake = o.secrets.filter(s => s.set && /FYGARO|STRIPE|SECRET|KEY_ID/.test(s.key) && !/WIPAY/.test(s.key) && looksPlaceholder(s) && !/demo|emul/.test(s.file));
    if (fake.length) add('danger', `${fake.map(s => `${s.key} (${s.file})`).join(', ')} still looks like a placeholder. Card payments can't work with a fake key.`);
    const trackedSecrets = o.files.filter(f => f.tracked && (f.kind === 'credential' || f.file === '.env'));
    if (trackedSecrets.length) add('danger', `${trackedSecrets.map(f => f.file).join(', ')} is committed to git. Anyone with the repo has it.`);
    if (o.secrets.some(s => /WIPAY/.test(s.key))) add('warn', 'WiPay settings are still in the project, but WiPay was replaced by Fygaro. Remove them.');
    if (o.git) {
      if (o.git.dirty.length) add('warn', `${o.git.dirty.length} file${s1(o.git.dirty.length)} changed but not committed.`);
      if (o.git.ahead) add('warn', `${o.git.ahead} commit${s1(o.git.ahead)} not pushed to GitHub.`);
      if (o.git.behind) add('warn', `${o.git.behind} commit${s1(o.git.behind)} on GitHub you don't have here.`);
      const idle = o.git.commits[0] ? Math.floor((now - o.git.commits[0].at) / 864e5) : 0;
      if (idle >= 7 && v.stage !== 'Paused') add('warn', `No commits in ${idle} days. Is this still moving?`);
    }
  }

  let today = null;
  const hasOrders = !!money?.ok && money.orders.length + money.payments.length > 0;
  // Before launch, whatever is in the database is test data: no alarms from it.
  if (hasOrders && v.stage === 'Live') {
    today = ventureStats(money, parseLocal(todayStr).getTime());
    const stuck = money.payments.filter(p => p.status === 'pending' && now - p.createdAt > 20 * 60000 && now - p.createdAt < 3 * 86400000);
    if (stuck.length) add('warn', `${stuck.length} card payment${s1(stuck.length)} started in the last 3 days never completed (${J(stuck.reduce((s, p) => s + (Number(p.amountJmd) || 0), 0))}). Abandoned, or a webhook problem?`);
    const week = ventureStats(money, now - 7 * 86400000);
    if (week.refundsCoins) add('warn', `${week.refundsCoins} refund${s1(week.refundsCoins)} this week went back as coins, not to the card. Check each one.`);
    if (week.lateCredits) add('warn', `${week.lateCredits} payment${s1(week.lateCredits)} this week landed after the order was cancelled.`);
    const noDasher = week.reasons.no_dasher || 0;
    if (noDasher) add(noDasher >= 3 ? 'danger' : 'warn', `${noDasher} order${s1(noDasher)} this week cancelled because no runner took ${noDasher === 1 ? 'it' : 'them'}. That's lost money and a lost customer.`);
    const timeouts = week.reasons.payment_timeout || 0;
    if (timeouts) add('warn', `${timeouts} order${s1(timeouts)} this week timed out waiting for payment.`);
    if (week.placed === 0) add('warn', 'No orders in the last 7 days.');
  } else if (money && !money.ok) add('danger', `Couldn't read live data: ${money.error}`);

  // The plan and the bills
  const moves = items.filter(i => i.kind === 'move' && !i.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || byCreated(a, b));
  const overdue = moves.filter(m => m.due && m.due < todayStr);
  if (overdue.length) add('danger', `${overdue.length} move${s1(overdue.length)} past ${overdue.length === 1 ? 'its' : 'their'} date: ${overdue.slice(0, 3).map(m => m.title).join(', ')}${overdue.length > 3 ? '…' : ''}.`);
  moves.filter(m => m.due === todayStr).forEach(m => add('warn', `Due today: ${m.title}.`));
  services.filter(s => s.renewsOn).forEach(s => {
    const n = days(s.renewsOn);
    if (n < 0) add('danger', `${s.name} was due to renew ${-n} day${s1(-n)} ago. Is it still running?`);
    else if (n <= 7) add('warn', `${s.name} renews ${n === 0 ? 'today' : `in ${n} day${s1(n)}`}${Number(s.monthlyCost) > 0 ? ` (${J(s.monthlyCost)})` : ''}.`);
  });
  const roundList = d && !d.loading ? roundServices(o, services) : [];
  const roundsLeft = roundList.filter(x => !rounds[x.id]);
  if (roundsLeft.length && v.stage !== 'Paused') add('warn', `${roundsLeft.length} of ${roundList.length} services not checked today: ${roundsLeft.slice(0, 4).map(x => x.name).join(', ')}${roundsLeft.length > 4 ? '…' : ''}.`);
  if (!moves.length && v.stage !== 'Paused') add('warn', 'No next move written down. A venture with no next step is standing still.');

  if (!findings.length) add('ok', today ? 'Money, keys, code and plan all look clean.' : 'Nothing needs you right now.');
  const order = { danger: 0, warn: 1, ok: 2 };
  findings.sort((a, b) => order[a.lv] - order[b.lv]);
  const issues = findings.filter(f => f.lv !== 'ok');
  return {
    findings, issues, worst: issues[0]?.lv || 'ok', today, hasOrders, moves, roundList, roundsLeft,
    monthly: Math.round(services.reduce((s, x) => s + svcMonthly(x), 0)),
  };
}

// ── Launch plan: a dated run-up to opening day, then the phases after it ────
// Steps are ordinary moves with a phase. Launch steps carry a date, so the
// daily check, Home and "Do today" all work on them without extra wiring.
const PHASES = [
  { id: 'launch',  label: 'Soft launch',                   jp: '開店' },  // opening the shop
  { id: 'gateway', label: 'Closed test and card payments', jp: '決済' },  // payments
  { id: 'app',     label: 'Public app launch',             jp: '公開' },  // going public
];
function launchPlan(v, items, todayStr) {
  if (!v.launchDate) return null;
  const diff = (a, b) => Math.round((parseLocal(a) - parseLocal(b)) / 864e5);
  const steps = items.filter(i => i.kind === 'move' && i.phase === 'launch' && i.due)
    .sort((a, b) => a.due.localeCompare(b.due) || byCreated(a, b));
  const start = v.planStart || steps[0]?.due || todayStr;
  const days = [];
  for (let d = start, n = 1; d <= v.launchDate && n < 120; d = addDays(d, 1), n++) {
    const mine = steps.filter(x => x.due === d);
    const open = mine.filter(x => !x.done).length;
    days.push({
      date: d, n, title: v.dayTitles?.[d] || '', steps: mine, open, isLaunch: d === v.launchDate,
      state: d === todayStr ? 'today' : mine.length && !open ? 'done' : d < todayStr && open ? 'late' : d < todayStr ? 'past' : 'ahead',
    });
  }
  const late = steps.filter(x => !x.done && x.due < todayStr);
  return {
    steps, days, late, start, daysLeft: diff(v.launchDate, todayStr),
    done: steps.filter(x => x.done).length,
    today: days.find(d => d.date === todayStr) || null,
    phases: PHASES.slice(1).map(ph => ({ ...ph, steps: items.filter(i => i.kind === 'move' && i.phase === ph.id).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || byCreated(a, b)) })),
  };
}

function Ventures({ rounds = [], onToggleRound, ventures, finances = [], onAddFinance, services, checks, items, todayStr, onSaveVenture, onDeleteVenture, onSaveService, onDeleteService, onSaveCheck, onSaveItem, onDeleteItem, onAddTodo }) {
  const api = DESKTOP?.venture;
  const { confirm, ConfirmUI } = useConfirm();
  const acrossPager = usePager(6), comingPager = usePager(6);
  const [sel, setSelRaw] = useState(() => { try { return localStorage.getItem('jc_venture_sel') || 'all'; } catch { return 'all'; } });
  const [data, setData] = useState({});
  const [form, setForm] = useState(null);
  const setSel = id => { setSelRaw(id); try { localStorage.setItem('jc_venture_sel', id); } catch {} };

  const list = [...ventures].sort(byCreated);
  const firstId = list[0]?.id;
  const of = (rows, v) => rows.filter(r => (r.ventureId || firstId) === v.id);   // older rows belong to the first venture

  const loadOne = async v => {
    if (!api) return;
    const dir = v.dir || '';
    if (!dir) { setData(d => ({ ...d, [v.id]: { o: null, money: null, loading: false, dir } })); return; }
    setData(d => ({ ...d, [v.id]: { ...d[v.id], loading: true, dir } }));
    const o = await api.overview(dir);
    const money = o.ok && o.firebaseProject ? await api.money(o.firebaseProject, 30) : null;
    setData(d => ({ ...d, [v.id]: { o, money, loading: false, dir } }));
  };
  const loadKey = list.map(v => `${v.id}:${v.dir || ''}`).join('|');
  useEffect(() => { list.forEach(v => { if (!data[v.id] || data[v.id].dir !== (v.dir || '')) loadOne(v); }); }, [loadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!api) return (
    <div className="section venture"><div className="card agenda-empty">Ventures only works in the Mac app, because it reads project folders on this computer.</div></div>
  );

  const health = Object.fromEntries(list.map(v => [v.id, ventureHealth(v, data[v.id], { services: of(services, v), items: of(items, v), todayStr, rounds: rounds.find(r => r.ventureId === v.id)?.done || {} })]));
  const checkedToday = v => checks.some(c => c.date === todayStr && (c.ventureId || firstId) === v.id);
  const current = list.find(v => v.id === sel);
  const hex = v => v.color || VENTURE_HEX[Math.max(0, list.indexOf(v)) % VENTURE_HEX.length];

  const removeVenture = async v => {
    if (!(await confirm({ message: `Remove ${v.name} from the console? Its plan, people, links and service notes go with it. The project folder itself is not touched.`, label: 'Remove', danger: true }))) return;
    onDeleteVenture(v); setForm(null); setSel('all');
  };

  const switcher = (
    <div className="vt-tabs">
      <button className={`hq-tab ${!current ? 'on' : ''}`} onClick={() => setSel('all')} title="The parent company and everything under it"><b lang="ja" aria-hidden="true">本社</b>JCommerce & Tech</button>
      {list.map(v => (
        <button key={v.id} className={current?.id === v.id ? 'on' : ''} onClick={() => setSel(v.id)}>
          <i className={`vt-dot ${health[v.id].worst}`} style={{ '--c': hex(v) }}/>{v.name}
          {health[v.id].issues.length > 0 && <em>{health[v.id].issues.length}</em>}
        </button>
      ))}
      <button className="add" onClick={() => setForm({})}><Icons.plus size={12}/> Venture</button>
    </div>
  );
  const modal = form && (
    <VentureModal data={form} todayStr={todayStr} onPick={api.pick}
      onSave={d => { onSaveVenture(d); setForm(null); }}
      onDelete={form.id ? () => removeVenture(form) : null}
      onClose={() => setForm(null)}/>
  );

  if (current) return (
    <div className="section venture">
      {switcher}
      <VentureRoom key={current.id} v={current} hex={hex(current)} d={data[current.id]} h={health[current.id]} reload={() => loadOne(current)}
        services={of(services, current)} items={of(items, current)} checks={of(checks, current)} checkedToday={checkedToday(current)} todayStr={todayStr}
        onEdit={() => setForm(current)}
        rounds={rounds.find(r => r.ventureId === current.id)?.done || {}} onToggleRound={id => onToggleRound(current.id, id)}
        bills={finances.filter(f => f.ventureId === current.id && f.type === 'expense')} onAddBill={d => onAddFinance({ ...d, scope: 'work', ventureId: current.id })}
        onSaveService={d => onSaveService({ ...d, ventureId: current.id }, of(services, current))} onDeleteService={onDeleteService}
        onSaveCheck={d => onSaveCheck({ ...d, ventureId: current.id, venture: current.name })}
        onSaveItem={d => onSaveItem({ ...d, ventureId: current.id })} onDeleteItem={onDeleteItem} onAddTodo={onAddTodo}/>
      {modal}{ConfirmUI}
    </div>
  );

  // ── Portfolio: every venture at a glance ─────────────────────────────────
  const totalIssues = list.reduce((s, v) => s + health[v.id].issues.length, 0);
  const totalMonthly = list.reduce((s, v) => s + health[v.id].monthly, 0);
  const cutToday = list.reduce((s, v) => s + (health[v.id].today?.platform || 0), 0);
  const anyOrders = list.some(v => health[v.id].today);
  const unchecked = list.filter(v => v.stage !== 'Paused' && !checkedToday(v));
  const across = list.flatMap(v => health[v.id].issues.map(f => ({ ...f, v }))).sort((a, b) => (a.lv === 'danger' ? 0 : 1) - (b.lv === 'danger' ? 0 : 1));
  const horizon = addDays(todayStr, 14);
  const coming = list.flatMap(v => [
    ...health[v.id].moves.filter(m => m.due && m.due <= horizon).map(m => ({ v, date: m.due, text: m.title, kind: 'Move' })),
    ...of(services, v).filter(s => s.renewsOn && s.renewsOn <= horizon).map(s => ({ v, date: s.renewsOn, text: `${s.name} renews${Number(s.monthlyCost) > 0 ? ` · ${J(s.monthlyCost)}` : ''}`, kind: 'Bill' })),
  ]).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="section venture">
      {switcher}
      {list.length === 0 ? (
        <div className="card agenda-empty">
          No ventures yet. Add each business you run or are building, with or without a project folder.
          <div style={{ marginTop: '0.9rem' }}><button className="btn-primary" onClick={() => setForm({})}><Icons.plus size={13}/> Add your first venture</button></div>
        </div>
      ) : (<>
        <div className="card hq">
          <b className="page-seal" lang="ja" aria-hidden="true">本社</b>
          <div className="hq-main">
            <div className="hq-role">Parent company · registered sole trader</div>
            <div className="hq-name">JCommerce & Tech</div>
            <div className="hq-line">The house every venture below belongs to. {list.length} under it, {list.filter(v => v.stage === 'Live').length} trading.</div>
          </div>
          <div className="hq-tree" aria-hidden="true">{list.map(v => <span key={v.id} style={{ '--c': hex(v) }}>{v.name}</span>)}</div>
        </div>
        <div className="grid-2">
          <div className="fin-tile"><span>Ventures</span><b>{list.length}</b><span className="fin-delta">{list.filter(v => v.stage === 'Live').length} live · {list.filter(v => v.stage === 'Building').length} building</span></div>
          <div className="fin-tile"><span>Needs attention</span><b className={across.some(f => f.lv === 'danger') ? 'bad' : totalIssues ? 'warn' : 'good'}>{totalIssues}</b><span className="fin-delta">across everything</span></div>
          <div className="fin-tile"><span>Running cost</span><b className={totalMonthly ? 'warn' : ''}>{J(totalMonthly)}</b><span className="fin-delta">a month, from the services you priced</span></div>
          <div className="fin-tile"><span>{anyOrders ? 'Your cut today' : 'Checked today'}</span><b className="good">{anyOrders ? J(cutToday) : `${list.length - unchecked.length}/${list.length}`}</b><span className="fin-delta">{unchecked.length ? `not read yet: ${unchecked.map(v => v.name).join(', ')}` : 'every daily check read'}</span></div>
        </div>

        <div className="vt-grid">
          {list.map(v => {
            const h = health[v.id], d = data[v.id], git = d?.o?.ok ? d.o.git : null;
            const next = h.moves[0];
            return (
              <button key={v.id} className="card vt-card" style={{ '--c': hex(v) }} onClick={() => setSel(v.id)}>
                <div className="focus-head">
                  <div>
                    <div className="focus-title">{v.name}</div>
                    <div className="focus-meta">{v.tagline || (v.dir ? v.dir.replace(/^\/Users\/[^/]+/, '~') : 'No project folder')}</div>
                  </div>
                  <span className={`vt-stage s-${(v.stage || 'Building').toLowerCase()}`}>{v.stage || 'Building'}<i lang="ja" aria-hidden="true">{STAGE_JP[v.stage || 'Building']}</i></span>
                </div>
                <div className={`vt-health ${h.worst}`}>
                  {d?.loading ? 'Reading the project…' : h.issues.length ? `${h.issues.length} thing${h.issues.length === 1 ? '' : 's'} need${h.issues.length === 1 ? 's' : ''} you · ${h.issues[0].t}` : h.findings[0].t}
                </div>
                <dl className="fin-kv">
                  {h.today && <div><dt>Today</dt><dd>{h.today.placed} orders · <span className="good">{J(h.today.platform)}</span></dd></div>}
                  {git && <div><dt>Code</dt><dd className={git.dirty.length || git.ahead ? 'warn' : ''}>{git.dirty.length ? `${git.dirty.length} uncommitted` : git.ahead ? `${git.ahead} not pushed` : 'clean'}{git.commits[0] ? ` · ${ago(git.commits[0].at)}` : ''}</dd></div>}
                  {v.launchDate && (() => { const lp = launchPlan(v, of(items, v), todayStr); return (
                    <div><dt>Launch</dt><dd className={lp.late.length ? 'bad' : lp.daysLeft <= 3 ? 'warn' : ''}>{lp.daysLeft > 0 ? `in ${lp.daysLeft} day${lp.daysLeft === 1 ? '' : 's'}` : lp.daysLeft === 0 ? 'today' : 'launched'} · {lp.done}/{lp.steps.length} steps</dd></div>
                  ); })()}
                  <div><dt>Next move</dt><dd className={next ? (next.due && next.due < todayStr ? 'bad' : '') : 'warn'}>{next ? `${next.title}${next.due ? ` · ${fmtDate(next.due, { month: 'short', day: 'numeric' })}` : ''}` : 'none written'}</dd></div>
                  <div><dt>Running cost</dt><dd>{h.monthly ? `${J(h.monthly)}/mo` : '—'}</dd></div>
                </dl>
                <div className="goal-foot">
                  <span className={checkedToday(v) ? 'good' : ''}>{checkedToday(v) ? '✓ checked today' : 'not checked today'}</span>
                  <span>Open ›</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="card span-8">
          <div className="card-label">Across everything</div>
          {across.length === 0 ? <div className="agenda-empty small">Nothing needs you in any venture.</div> : (
            <ul className="fin-findings" style={{ borderTop: 'none', marginTop: 0 }}>
              {pageOf(across, acrossPager(across.length)).map((f, i) => <li key={i} className={f.lv}><button className="link-btn" onClick={() => setSel(f.v.id)}>{f.v.name}</button> · {f.t}</li>)}
            </ul>
          )}
          <Pager pg={acrossPager(across.length)} noun="things"/>
        </div>
        <div className="card span-4">
          <div className="card-label">Next 14 days</div>
          {coming.length === 0 ? <div className="agenda-empty small">No dated moves or bills coming up.</div> : pageOf(coming, comingPager(coming.length)).map((c, i) => {
            const n = Math.round((parseLocal(c.date) - parseLocal(todayStr)) / 864e5);
            return (
              <div key={i} className="tk-row old">
                <div className="tk-main"><div className="tk-title">{c.text}</div><div className="tk-note">{c.v.name} · {c.kind} · {fmtDate(c.date, { weekday: 'short', month: 'short', day: 'numeric' })}</div></div>
                <span className={`tk-due ${n <= 3 ? 'soon' : ''}`}>{n < 0 ? `${-n}d late` : n === 0 ? 'today' : `${n}d`}</span>
              </div>
            );
          })}
          <Pager pg={comingPager(coming.length)} noun="dates"/>
        </div>
      </>)}
      {modal}{ConfirmUI}
    </div>
  );
}

function VentureRoom({ v, hex, d, h, reload, rounds = {}, onToggleRound, bills = [], onAddBill, services, items, checks, checkedToday, todayStr, onEdit, onSaveService, onDeleteService, onSaveCheck, onSaveItem, onDeleteItem, onAddTodo }) {
  const api = DESKTOP.venture;
  const { confirm, ConfirmUI } = useConfirm();
  const o = d?.o, money = d?.money, loading = !!d?.loading;
  const [view, setView] = useState(v.launchDate ? 'launch' : 'overview');
  const [openDay, setOpenDay] = useState(null);
  const [billForm, setBillForm] = useState(null);
  const [usage, setUsage] = useState(100);
  const [fx, setFxRaw] = useState(() => { try { return Number(localStorage.getItem('jc_fx')) || 160; } catch { return 160; } });
  const setFx = n => { const val = Math.max(1, Number(n) || 160); setFxRaw(val); try { localStorage.setItem('jc_fx', String(val)); } catch {} };
  const [gcpBilling, setGcpBilling] = useState(null);
  const billPager = usePager(6);
  const fbProject = d?.o?.ok ? d.o.firebaseProject : '';
  useEffect(() => { setGcpBilling(null); if (fbProject) api.billing(fbProject).then(setGcpBilling); }, [fbProject]); // eslint-disable-line react-hooks/exhaustive-deps
  const phasePagers = [usePager(5), usePager(5)];
  const roadPager = usePager(8), movePager = usePager(8), donePager = usePager(5), logPager = usePager(5);
  const orderPager = usePager(10), keyPager = usePager(12), peoplePager = usePager(8), linkPager = usePager(8);
  const [range, setRange] = useState(7);
  const [term, setTerm] = useState({ text: '', running: null, last: {} });
  const [doc, setDoc] = useState(null);
  const [svcForm, setSvcForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const [moveTitle, setMoveTitle] = useState('');
  const [moveDue, setMoveDue] = useState('');
  const [logText, setLogText] = useState('');
  const termRef = useRef(null);

  useEffect(() => api.onOutput(p => setTerm(t => ({
    text: (t.text + (p.chunk || '')).slice(-60000),
    running: p.done ? null : t.running,
    last: p.done ? { ...t.last, [p.id]: { code: p.code, at: Date.now() } } : t.last,
  }))), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [term.text]);

  const run = async id => {
    setView('terminal');
    setTerm(t => ({ ...t, text: t.text + (t.text ? '\n' : ''), running: id }));
    const r = await api.run(v.dir, id);
    if (!r.ok) setTerm(t => ({ ...t, text: t.text + `${r.error}\n`, running: null }));
  };
  const openDoc = async file => { const r = await api.doc(v.dir, file); setDoc({ file, text: r.ok ? r.text : r.error }); };

  const { findings, hasOrders, moves, monthly } = h;
  const live = !!h.today;
  const today = hasOrders ? ventureStats(money, parseLocal(todayStr).getTime()) : null;
  const now = Date.now();
  const win = hasOrders ? ventureStats(money, now - range * 86400000) : null;
  const streak = (() => { const days = new Set(checks.map(c => c.date)); let n = 0, day = days.has(todayStr) ? todayStr : addDays(todayStr, -1); while (days.has(day)) { n++; day = addDays(day, -1); } return n; })();
  const markChecked = () => onSaveCheck({ date: todayStr, issues: h.issues.length, orders: live ? today.placed : null, platform: live ? today.platform : null });

  const chart = hasOrders ? Array.from({ length: 14 }, (_, i) => {
    const day = addDays(todayStr, i - 13);
    const dayOrders = money.orders.filter(x => dayKey(x.createdAt) === day);
    const del = dayOrders.filter(x => x.status === 'delivered');
    return { d: day, label: fmtDate(day, { month: 'numeric', day: 'numeric' }), delivered: del.length, cancelled: dayOrders.filter(x => x.status === 'cancelled').length, platform: del.reduce((s, x) => s + (Number(x.platformFeeJmd) || 0), 0) };
  }) : [];

  const svcMeta = id => services.find(s => s.serviceId === id) || {};
  const autoServices = ventureServices(o);
  const customServices = services.filter(s => s.custom);
  const doneMoves = items.filter(i => i.kind === 'move' && i.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const people = items.filter(i => i.kind === 'person').sort(byCreated);
  const links = items.filter(i => i.kind === 'link').sort(byCreated);
  const log = items.filter(i => i.kind === 'log').sort((a, b) => (b.date || '').localeCompare(a.date || '') || createdSec(b) - createdSec(a));
  const tt = { background:'rgba(var(--b1),0.96)', border:'1px solid rgba(212,166,74,0.3)', borderRadius:'10px', color:'#e8d6c3', fontSize:'12px' };
  const axis = { fill:'#7f6758', fontSize:10 };
  const hasFolder = !!o?.ok;
  const plan = launchPlan(v, items, todayStr);
  const backlog = moves.filter(m => !m.phase);
  const tabs = [...(plan ? [['launch','Launch']] : []), ['overview','Overview'], ['plan',`Plan${backlog.length ? ` · ${backlog.length}` : ''}`], ...(hasOrders ? [['money','Money']] : []), ['services','Services'], ['people','People & links'],
    ...(hasFolder ? [['keys','Keys'], ['terminal','Terminal'], ['docs','Docs']] : [])];

  const addMove = () => {
    if (!moveTitle.trim()) return;
    onSaveItem({ kind: 'move', title: moveTitle.trim(), due: moveDue, done: false });
    setMoveTitle(''); setMoveDue('');
  };
  const toggleMove = m => onSaveItem({ id: m.id, done: !m.done, doneAt: m.done ? '' : todayStr });
  const toTasks = m => { onAddTodo({ title: `${v.name} · ${m.title}`, note: '', starred: false }); onSaveItem({ id: m.id, sentOn: todayStr }); };
  const addLog = () => { if (!logText.trim()) return; onSaveItem({ kind: 'log', text: logText.trim(), date: todayStr }); setLogText(''); };
  const removeItem = async (i, label) => { if (await confirm({ message: `Delete "${label}"?`, label: 'Delete', danger: true })) { onDeleteItem(i.id); setItemForm(null); } };
  const moveRow = m => {
    const n = m.due ? Math.round((parseLocal(m.due) - parseLocal(todayStr)) / 864e5) : null;
    return (
      <div key={m.id} className={`tk-row ${m.done ? 'done' : ''}`}>
        <button className="check-btn" onClick={() => toggleMove(m)} style={{ color: m.done ? '#ff9a4a' : 'var(--mist-3)' }}>{m.done ? <Icons.check size={22}/> : <Icons.circle size={22}/>}</button>
        <div className="tk-main">
          <div className="tk-title">{m.title}</div>
          {(m.note || m.sentOn === todayStr) && <div className="tk-note">{m.sentOn === todayStr ? 'In today\'s tasks' : ''}{m.note && m.sentOn === todayStr ? ' · ' : ''}{m.note}</div>}
        </div>
        {m.done && <span className="tk-xp">+{XP_PER_MOVE}</span>}
        {!m.done && n !== null && <span className={`tk-due ${n <= 3 ? 'soon' : ''}`}>{n < 0 ? `${-n}d late` : n === 0 ? 'today' : n === 1 ? 'tomorrow' : `${n} days`}</span>}
        {!m.done && m.sentOn !== todayStr && <button className="btn-ghost tk-carry" onClick={() => toTasks(m)}>Do today</button>}
        <button className="icon-btn" onClick={() => setItemForm({ ...m })}><Icons.edit size={12}/></button>
      </div>
    );
  };

  // A launch step: the whole instruction is readable, not cut short
  const stepRow = m => (
    <div key={m.id} className={`lp-step ${m.done ? 'done' : ''} ${!m.done && m.due && m.due < todayStr ? 'late' : ''}`}>
      <button className="check-btn" onClick={() => toggleMove(m)} style={{ color: m.done ? '#ff9a4a' : 'var(--mist-3)' }}>{m.done ? <Icons.check size={24}/> : <Icons.circle size={24}/>}</button>
      <div className="lp-step-main">
        <div className="lp-step-title">{m.title}</div>
        {m.note && <div className="lp-step-note">{m.note}</div>}
        {!m.done && m.due && m.due < todayStr && <div className="lp-step-late">Was for {fmtDate(m.due, { weekday: 'long', month: 'short', day: 'numeric' })}. Do it first.</div>}
      </div>
      <div className="lp-step-side">
        {m.done ? <span className="tk-xp">+{XP_PER_MOVE}</span>
          : m.sentOn === todayStr ? <span className="fin-delta">in today's tasks</span>
          : <button className="btn-ghost tk-carry" onClick={() => toTasks(m)}>Do today</button>}
        <button className="icon-btn" onClick={() => setItemForm({ ...m })}><Icons.edit size={12}/></button>
      </div>
    </div>
  );
  const shownDay = plan ? (plan.days.find(d => d.date === openDay) || plan.today || plan.days.find(d => d.open) || plan.days[plan.days.length - 1]) : null;
  const roadPg = roadPager(plan ? plan.days.length : 0);
  // The road opens on the page that holds the day being shown
  const shownIdx = plan && shownDay ? plan.days.findIndex(d => d.date === shownDay.date) : -1;
  useEffect(() => { if (shownIdx >= 0) roadPg.setPage(Math.floor(shownIdx / roadPg.size)); }, [shownIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const planPct = plan && plan.steps.length ? Math.round((plan.done / plan.steps.length) * 100) : 0;

  return (<>
      <div className="sched-bar">
        <div className="sched-range">
          <i className="vt-dot big" style={{ '--c': hex }}/>
          <div className="sched-title" style={{ marginLeft: 0 }}>{v.name}</div>
          <span className={`vt-stage s-${(v.stage || 'Building').toLowerCase()}`}>{v.stage || 'Building'}<i lang="ja" aria-hidden="true">{STAGE_JP[v.stage || 'Building']}</i></span>
        </div>
        <div className="seg">
          {tabs.map(([id, label]) => <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>)}
        </div>
        <span className="row-gap">
          {v.dir && <button className="btn-ghost" onClick={() => api.open(v.dir)} title={v.dir}>Open folder</button>}
          <button className="btn-ghost" onClick={onEdit}>Edit</button>
          {v.dir && <button className="btn-ghost" onClick={reload} disabled={loading}>{loading ? 'Reading…' : '↻ Refresh'}</button>}
        </span>
      </div>
      {v.tagline && <div className="fin-delta vt-tagline">{v.tagline}</div>}

      {view === 'launch' && plan && (<>
        <div className="card lp-hero">
          <div className="lp-count">
            <div className="lp-num" key={plan.daysLeft}>{plan.daysLeft > 0 ? plan.daysLeft : plan.daysLeft === 0 ? 'GO' : 'LIVE'}</div>
            <div>
              <div className="lp-cap">{plan.daysLeft > 1 ? 'days to soft launch' : plan.daysLeft === 1 ? 'day to soft launch' : plan.daysLeft === 0 ? 'Soft launch is today' : `Soft launched ${-plan.daysLeft} day${plan.daysLeft === -1 ? '' : 's'} ago`}</div>
              <LiveCountdown to={v.launchDate}/>
              <div className="lp-jp" lang="ja" aria-hidden="true">{plan.daysLeft > 0 ? `開店まであと${plan.daysLeft}日` : '開店'}</div>
              <div className="fin-delta">{fmtDate(v.launchDate, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div className="lp-right">
            <div className="row-between">
              <span className="card-label" style={{ margin: 0 }}>{plan.today ? (plan.today.isLaunch ? 'Launch day' : `Day ${plan.today.n} of ${plan.days.length - 1}`) : plan.daysLeft > 0 ? 'Not started yet' : 'After launch'}{plan.today?.title ? ` · ${plan.today.title}` : ''}</span>
              <span className="fin-delta">{plan.done}/{plan.steps.length} steps · {planPct}%</span>
            </div>
            <div className="lp-strip" style={{ '--n': plan.days.length }}>
              {plan.days.map(d => (
                <button key={d.date} className={`lp-day ${d.state} ${shownDay?.date === d.date ? 'sel' : ''} ${d.isLaunch ? 'launch' : ''}`} onClick={() => setOpenDay(d.date)}
                  title={`${fmtDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}${d.title ? ` · ${d.title}` : ''} · ${d.steps.length - d.open}/${d.steps.length} done`}>
                  <b lang={d.isLaunch ? 'ja' : undefined}>{d.isLaunch ? '開' : d.n}</b>
                  <i>{fmtDate(d.date, { weekday: 'short' }).slice(0, 2)}</i>
                </button>
              ))}
            </div>
            <div className="xp-track"><div className="xp-fill" style={{ width: `${planPct}%` }}/></div>
            {plan.late.length > 0 && <div className="lp-warn">{plan.late.length} step{plan.late.length === 1 ? '' : 's'} behind. The date doesn't move, so today's list just got longer.</div>}
          </div>
        </div>

        <div className="card span-8">
          <div className="row-between" style={{ marginBottom: '0.5rem' }}>
            <span className="card-label" style={{ margin: 0 }}>
              {shownDay.date === todayStr ? "Today's orders" : shownDay.isLaunch ? 'Launch day' : `Day ${shownDay.n}`} · {fmtDate(shownDay.date, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <span className="row-gap">
              {shownDay.date !== todayStr && plan.today && <button className="link-btn" onClick={() => setOpenDay(null)}>Back to today</button>}
              <button className="btn-ghost tk-carry" onClick={() => setItemForm({ kind: 'move', phase: 'launch', due: shownDay.date })}><Icons.plus size={12}/> Step</button>
            </span>
          </div>
          {shownDay.title && <div className="lp-day-title">{shownDay.title}</div>}
          {shownDay.date === todayStr && plan.late.map(stepRow)}
          {shownDay.steps.length === 0 && !(shownDay.date === todayStr && plan.late.length) ? <div className="agenda-empty small">Nothing set for this day.</div> : shownDay.steps.map(stepRow)}
          {shownDay.steps.length > 0 && !shownDay.open && !(shownDay.date === todayStr && plan.late.length) && (
            <div className="lp-cleared"><b className="jp-stamp" lang="ja" aria-hidden="true">済</b><span>Day cleared. {shownDay.date === todayStr ? 'Stop here or pull tomorrow forward.' : ''}</span></div>
          )}
        </div>

        <div className="card span-4">
          <div className="card-label">The road</div>
          <div className="lp-road">
            {pageOf(plan.days, roadPg).map(d => (
              <button key={d.date} className={`lp-road-row ${d.state} ${shownDay.date === d.date ? 'sel' : ''}`} onClick={() => setOpenDay(d.date)}>
                <b lang={d.isLaunch ? 'ja' : undefined}>{d.isLaunch ? '開' : d.n}</b>
                <span><em>{d.title || (d.isLaunch ? 'Soft launch' : '—')}</em><i>{fmtDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}</i></span>
                <u>{d.steps.length - d.open}/{d.steps.length}</u>
              </button>
            ))}
          </div>
          <Pager pg={roadPg} noun="days"/>
        </div>

        {plan.phases.map((ph, i) => (
          <div key={ph.id} className="card span-6 lp-phase">
            <div className="row-between" style={{ marginBottom: '0.5rem' }}>
              <span className="lp-phase-head"><b className="page-seal" lang="ja" aria-hidden="true">{ph.jp}</b><span><em>After launch · phase {i + 2}</em>{ph.label}</span></span>
              <span className="row-gap">
                <span className="fin-delta">{ph.steps.filter(x => x.done).length}/{ph.steps.length}</span>
                <button className="btn-ghost tk-carry" onClick={() => setItemForm({ kind: 'move', phase: ph.id })}><Icons.plus size={12}/> Step</button>
              </span>
            </div>
            {ph.steps.length === 0 ? <div className="agenda-empty small">No steps yet.</div> : pageOf(ph.steps, phasePagers[i](ph.steps.length)).map(stepRow)}
            <Pager pg={phasePagers[i](ph.steps.length)} noun="steps"/>
          </div>
        ))}
      </>)}

      {view === 'overview' && (<>
        <div className="grid-2">
          {live ? (<>
            <div className="fin-tile"><span>Orders today</span><b>{today.placed}</b><span className="fin-delta">{today.delivered} delivered · {today.active} live</span></div>
            <div className="fin-tile"><span>Your cut today</span><b className="good">{J(today.platform)}</b><span className="fin-delta">of {J(today.fees)} in fees</span></div>
            <div className="fin-tile"><span>Card payments today</span><b>{J(today.cardPaid.reduce((s, p) => s + (Number(p.amountJmd) || 0), 0))}</b><span className="fin-delta">{today.cardPaid.length} paid · {today.cardPending.length} pending</span></div>
          </>) : (<>
            <div className="fin-tile"><span>Open moves</span><b className={moves.length ? '' : 'warn'}>{moves.length}</b><span className="fin-delta">{doneMoves.length} done so far</span></div>
            <div className="fin-tile"><span>Running cost</span><b className={monthly ? 'warn' : ''}>{J(monthly)}</b><span className="fin-delta">a month</span></div>
            <div className="fin-tile"><span>{v.startedOn ? 'Days in' : 'People'}</span><b>{v.startedOn ? Math.max(0, Math.round((parseLocal(todayStr) - parseLocal(v.startedOn)) / 864e5)) : people.length}</b><span className="fin-delta">{v.startedOn ? `since ${fmtDate(v.startedOn, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'linked to this venture'}</span></div>
          </>)}
          <div className="fin-tile"><span>Needs attention</span><b className={h.worst === 'danger' ? 'bad' : h.worst === 'warn' ? 'warn' : 'good'}>{h.issues.length}</b><span className="fin-delta">{money?.fetchedAt ? `read ${ago(money.fetchedAt)}` : 'worked out live'}</span></div>
        </div>

        <div className="card span-8">
          <div className="row-between" style={{ marginBottom: '0.25rem' }}>
            <span className="card-label" style={{ margin: 0 }}>Daily check · {fmtDate(todayStr, { weekday:'long', month:'short', day:'numeric' })}</span>
            <span className="fin-delta">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} in a row` : 'no streak yet'}</span>
          </div>
          <ul className="fin-findings" style={{ borderTop: 'none', marginTop: 0 }}>
            {loading && <li className="ok">Reading the project…</li>}
            {!(loading && h.worst === 'ok') && findings.map((f, i) => <li key={i} className={f.lv}>{f.t}</li>)}
          </ul>
          <div className="vt-check-foot">
            {checkedToday
              ? <span className="good vt-done"><b className="jp-stamp" lang="ja" aria-hidden="true">済</b>Checked today</span>
              : h.roundsLeft.length ? <button className="btn-ghost" onClick={() => setView('services')}>Check {h.roundsLeft.length} more service{h.roundsLeft.length === 1 ? '' : 's'} first ›</button>
              : <button className="btn-primary" onClick={markChecked} disabled={loading}>I've read today's check</button>}
            <span className="fin-delta">Findings are worked out from the real project, plan and bills. +10 XP for reading it; −10 XP for every day you don't.</span>
          </div>
        </div>

        <div className="card span-4">
          <div className="row-between" style={{ marginBottom: '0.6rem' }}>
            <span className="card-label" style={{ margin: 0 }}>Next moves</span>
            <button className="link-btn" onClick={() => setView('plan')}>Plan ›</button>
          </div>
          {moves.length === 0 ? <div className="agenda-empty small">Nothing written down. What is the next step?</div> : moves.slice(0, 5).map(moveRow)}
        </div>

        {hasFolder && o.git && (
          <div className="card span-6">
            <div className="card-label">Code</div>
            <dl className="fin-kv">
              <div><dt>Branch</dt><dd>{o.git.branch}</dd></div>
              <div><dt>Uncommitted</dt><dd className={o.git.dirty.length ? 'warn' : 'good'}>{o.git.dirty.length || 'Clean'}</dd></div>
              <div><dt>Not pushed</dt><dd className={o.git.ahead ? 'warn' : 'good'}>{o.git.ahead || 'None'}</dd></div>
            </dl>
            <div className="card-label" style={{ margin: '0.9rem 0 0.4rem' }}>Latest commits</div>
            {o.git.commits.slice(0, 5).map(c => (
              <div key={c.hash} className="vt-commit"><span>{c.subject}</span><em>{ago(c.at)}</em></div>
            ))}
          </div>
        )}
        <div className={`card ${hasFolder && o.git ? 'span-6' : ''}`}>
          <div className="card-label">At a glance</div>
          <dl className="fin-kv">
            <div><dt>Stage</dt><dd>{v.stage || 'Building'}</dd></div>
            {v.startedOn && <div><dt>Started</dt><dd>{fmtDate(v.startedOn, { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>}
            <div><dt>Running cost</dt><dd className={monthly ? 'warn' : ''}>{monthly ? `${J(monthly)} a month` : 'Nothing priced yet'}</dd></div>
            <div><dt>Services it depends on</dt><dd>{autoServices.length + customServices.length}</dd></div>
            <div><dt>People</dt><dd>{people.length ? people.slice(0, 3).map(p => p.name).join(', ') + (people.length > 3 ? ` +${people.length - 3}` : '') : 'None added'}</dd></div>
            <div><dt>Project folder</dt><dd>{v.dir ? v.dir.replace(/^\/Users\/[^/]+/, '~') : 'None linked'}</dd></div>
            {hasFolder && o.firebaseProject && <div><dt>Firebase project</dt><dd className="mono">{o.firebaseProject}</dd></div>}
          </dl>
          {links.length > 0 && <div className="vt-links">{links.slice(0, 6).map(l => <a key={l.id} className="btn-ghost tk-carry" href={fullUrl(l.url)} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div>}
        </div>
      </>)}

      {view === 'plan' && (<>
        <div className="card span-7 tk-list">
          <div className="card-label">{plan ? 'Other moves · not tied to a launch phase' : 'Moves · what happens next'}</div>
          <div className="vt-add">
            <input className="input" value={moveTitle} onChange={e => setMoveTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMove()} placeholder="The next concrete step, e.g. sign up 3 more runners"/>
            <input className="input" type="date" value={moveDue} min={todayStr} onChange={e => setMoveDue(e.target.value)} title="By when (optional)"/>
            <button className="btn-primary icon-only" onClick={addMove}><Icons.plus size={16}/></button>
          </div>
          {backlog.length === 0 ? <div className="agenda-empty small">No open moves outside the launch plan. Write the next one.</div> : pageOf(backlog, movePager(backlog.length)).map(moveRow)}
          <Pager pg={movePager(backlog.length)} noun="moves"/>
          {doneMoves.some(m => !m.phase) && (<>
            <div className="card-label" style={{ margin: '1rem 0 0.4rem' }}>Done · {doneMoves.filter(m => !m.phase).length}</div>
            {pageOf(doneMoves.filter(m => !m.phase), donePager(doneMoves.filter(m => !m.phase).length)).map(moveRow)}
            <Pager pg={donePager(doneMoves.filter(m => !m.phase).length)} noun="done"/>
          </>)}
          <div className="goal-hint" style={{ marginTop: '0.75rem' }}>Finishing a move is worth +{XP_PER_MOVE} XP. "Do today" also copies it into today's Tasks, so it counts toward your five.</div>
        </div>
        <div className="card span-5">
          <div className="card-label">Log · decisions and what happened</div>
          <textarea className="input" style={{ minHeight: 70, resize: 'vertical' }} value={logText} onChange={e => setLogText(e.target.value)} placeholder="What did you decide or learn today? Future you will want the reason."/>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.5rem 0 0.75rem' }}><button className="btn-ghost" onClick={addLog} disabled={!logText.trim()}>Add to log</button></div>
          {log.length === 0 ? <div className="agenda-empty small">Nothing logged yet.</div> : pageOf(log, logPager(log.length)).map(l => (
            <div key={l.id} className="vt-log">
              <div className="row-between"><em>{fmtDate(l.date, { weekday: 'short', month: 'short', day: 'numeric' })}</em><button className="icon-btn danger-btn" onClick={() => removeItem(l, 'this log entry')}><Icons.trash size={11}/></button></div>
              <p>{l.text}</p>
            </div>
          ))}
          <Pager pg={logPager(log.length)} noun="entries"/>
        </div>
      </>)}

      {view === 'money' && hasOrders && (<>
          <div className="row-between">
            <span className="fin-delta">{live ? `Read-only, straight from ${v.name}'s database` : <b className="warn">Test data · {v.name} is not live yet, so none of this counts</b>} · {ago(money.fetchedAt)}</span>
            <div className="seg">{[[1,'Today'],[7,'7 days'],[30,'30 days']].map(([n, l]) => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>{l}</button>)}</div>
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
                  <Tooltip contentStyle={tt} formatter={(val, n) => (n === 'Your cut' ? J(val) : val)}/>
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
              {pageOf(money.orders, orderPager(money.orders.length)).map(x => (
                <div key={x.id} className="vt-row">
                  <span>{ago(x.createdAt)}</span><span className="name">{x.storeName || '—'}</span>
                  <span className={x.status === 'delivered' ? 'good' : x.status === 'cancelled' ? 'bad' : 'warn'}>{(x.status || '').replace(/_/g, ' ')}{x.cancelReason ? ` · ${x.cancelReason.replace(/_/g, ' ')}` : ''}</span>
                  <span>{x.paymentMethod ? `${x.paymentMethod === 'tokens' ? 'coins' : 'card'} · ${(x.paymentStatus || '').replace(/_/g, ' ')}` : '—'}</span>
                  <span>{J(x.totalAmount || 0)}</span><span>{x.status === 'delivered' ? J(x.platformFeeJmd || 0) : '—'}</span>
                </div>
              ))}
              {money.orders.length === 0 && <div className="agenda-empty small">No orders in the last 30 days.</div>}
            </div>
            <Pager pg={orderPager(money.orders.length)} noun="orders"/>
          </div>
      </>)}

      {view === 'keys' && hasFolder && (<>
        <div className="card span-8">
          <div className="card-label">Keys and settings · values never leave this Mac</div>
          {o.secrets.length === 0 ? <div className="agenda-empty small">No .env files found in this project.</div> : (
            <div className="vt-table keys">
              <div className="vt-row head"><span>Key</span><span>File</span><span>Value</span><span>Status</span></div>
              {pageOf(o.secrets, keyPager(o.secrets.length)).map((s, i) => {
                const bad = !s.set ? 'Empty' : /WIPAY/.test(s.key) ? 'Unused' : looksPlaceholder(s) && !/demo|emul/.test(s.file) && !s.public ? 'Placeholder?' : '';
                return (
                  <div key={i} className="vt-row" title={keyNote(s.key)}>
                    <span className="name">{s.key}</span><span>{s.file}</span><span className="mono">{s.masked || '—'}</span>
                    <span className={bad ? 'bad' : s.public ? '' : 'good'}>{bad || (s.public ? 'Public' : 'Set')}</span>
                  </div>
                );
              })}
            </div>
          )}
          {o.secrets.length > 0 && <Pager pg={keyPager(o.secrets.length)} noun="keys"/>}
        </div>
        <div className="card span-4">
          <div className="card-label">Secret files</div>
          {o.files.length === 0 && <div className="agenda-empty small">None found.</div>}
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

      {view === 'services' && (() => {
        const month = todayStr.slice(0, 7);
        const all = [...autoServices, ...customServices.map(x => { const m = svcMonthly(x) / fx; return { group: 'Added by you', id: x.serviceId, name: x.name, does: x.does, url: x.url, bills: '', cat: 'Tools', custom: true,
          est: { min: m, max: m, unitMin: 0, unitMax: 0, basis: m ? 'From the cost you entered for it.' : 'No cost entered yet. Edit the service to add one.', sure: !!m } }; })];
        const costed = all.filter(x => x.est && !x.est.skipTotal);
        const totalAt = n => costed.reduce((t, x) => { const e = estAt(x.est, n); return { min: t.min + e.min, max: t.max + e.max }; }, { min: 0, max: 0 });
        const now_ = totalAt(usage);
        const curve = USAGE_LEVELS.map(n => { const t = totalAt(n); return { n, label: n >= 1000 ? `${n / 1000}k` : String(n), min: Math.round(t.min * fx), band: Math.round((t.max - t.min) * fx), max: Math.round(t.max * fx), usdMin: t.min, usdMax: t.max }; });
        const drivers = costed.map(x => ({ x, e: estAt(x.est, usage) })).filter(r => r.e.max > 0).sort((a, b) => b.e.max - a.e.max);
        const paid = (id, from) => bills.filter(f => f.serviceId === id && (!from || (f.date || '') >= from)).reduce((t, f) => t + amountOf(f), 0);
        const paidMonth = bills.filter(f => (f.date || '').startsWith(month)).reduce((t, f) => t + amountOf(f), 0);
        const paidEver = bills.reduce((t, f) => t + amountOf(f), 0);
        const priced = all.filter(x => svcMeta(x.id).costType || Number(svcMeta(x.id).monthlyCost) > 0).length;
        const sortedBills = [...bills].sort((x, y) => (y.date || '').localeCompare(x.date || ''));
        const billPg = billPager(sortedBills.length);
        return (<>
          <div className="grid-2">
            <div className="fin-tile"><span>Services</span><b>{all.length}</b><span className="fin-delta">{priced} priced by you · found in the code</span></div>
            <div className="fin-tile"><span>Planned</span><b className={monthly ? 'warn' : ''}>{J(monthly)}</b><span className="fin-delta">a month, from what you entered</span></div>
            <div className="fin-tile"><span>Actually paid this month</span><b className={paidMonth > monthly && monthly ? 'bad' : ''}>{J(paidMonth)}</b><span className="fin-delta">from bills you logged</span></div>
            <div className="fin-tile"><span>Paid so far</span><b>{J(paidEver)}</b><span className="fin-delta">{bills.length} bill{bills.length === 1 ? '' : 's'} in Finance</span></div>
          </div>
          <div className="card svc-est span-8">
            <div className="row-between" style={{ marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <span className="card-label" style={{ margin: 0 }}>Expected monthly bill · by orders a month</span>
              <span className="fin-legend"><i className="l-band"/>Lowest to highest<i className="l-net"/>Lowest<i className="l-exp"/>Highest</span>
            </div>
            <ResponsiveContainer width="100%" height={CHART_H(150)}>
              <ComposedChart data={curve} margin={{ left: 0, right: 10, top: 8, bottom: 0 }} onClick={e => e?.activePayload?.[0] && setUsage(e.activePayload[0].payload.n)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,166,74,0.08)"/>
                <XAxis dataKey="label" tick={axis}/>
                <YAxis tick={axis} width={46} tickFormatter={Jk}/>
                <Tooltip contentStyle={tt} labelFormatter={l => `${l} orders a month`}
                  formatter={(val, name, item) => name === 'Lowest' ? [`${J(item.payload.min)} (${US(item.payload.usdMin)})`, 'Lowest'] : name === 'Highest' ? [`${J(item.payload.max)} (${US(item.payload.usdMax)})`, 'Highest'] : [null, null]}/>
                <Area type="monotone" dataKey="min" stackId="r" stroke="none" fill="transparent" name="base" legendType="none" isAnimationActive={false}/>
                <Area type="monotone" dataKey="band" stackId="r" stroke="none" fill="rgba(212,166,74,0.22)" name="band" legendType="none"/>
                <Line type="monotone" dataKey="min" name="Lowest" stroke="#f2ddab" strokeWidth={2} dot={{ r: 2.5 }}/>
                <Line type="monotone" dataKey="max" name="Highest" stroke="#ff6a45" strokeWidth={2} dot={{ r: 2.5 }}/>
                <ReferenceLine x={curve.find(c => c.n === usage)?.label} stroke="#d3a855" strokeDasharray="4 4"/>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="row-between" style={{ marginTop: '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div className="seg">{USAGE_LEVELS.map(n => <button key={n} className={usage === n ? 'on' : ''} onClick={() => setUsage(n)}>{n >= 1000 ? `${n / 1000}k` : n}</button>)}</div>
              <label className="svc-fx">J$ for US$1 <input className="input" type="number" min="1" value={fx} onChange={e => setFx(e.target.value)}/></label>
            </div>
            <div className="goal-hint" style={{ marginTop: '0.6rem' }}>Estimates from published prices and how the code is set up, not from your bills. Fixed costs are there even at zero orders; the rest grows with orders. Hover the $ on a service to see where its figure comes from.</div>
          </div>
          <div className="card svc-est-sum span-4">
            <div className="card-label">At {usage.toLocaleString()} order{usage === 1 ? '' : 's'} a month</div>
            <div className="svc-minmax">
              <div><span>Lowest you should expect</span><b>{J(now_.min * fx)}</b><em>{US(now_.min)} a month</em></div>
              <div><span>Highest you should expect</span><b className="bad">{J(now_.max * fx)}</b><em>{US(now_.max)} a month</em></div>
            </div>
            <div className="card-label" style={{ margin: '0.9rem 0 0.4rem' }}>What drives the high end</div>
            {drivers.length === 0 ? <div className="agenda-empty small">Nothing here is expected to cost you.</div> : drivers.slice(0, 6).map(r => (
              <div key={r.x.id} className="row-between cl-line"><span>{r.x.name}</span><span className="mono">{r.e.min === r.e.max ? J(r.e.max * fx) : `${J(r.e.min * fx)} to ${J(r.e.max * fx)}`}</span></div>
            ))}
          </div>
          <div className="card svc-rounds">
            <div className="row-between">
              <span className="card-label" style={{ margin: 0 }}>Today's rounds · every service, every day</span>
              <span className={h.roundsLeft.length ? 'warn' : 'good'}>{h.roundList.length - h.roundsLeft.length} of {h.roundList.length} checked</span>
            </div>
            <div className="xp-track"><div className="xp-fill" style={{ width: `${h.roundList.length ? ((h.roundList.length - h.roundsLeft.length) / h.roundList.length) * 100 : 0}%` }}/></div>
            <div className="goal-hint">For each one: open it, read its logs or activity, then stamp it. The venture's daily check only unlocks when every service is stamped. Edit a service to leave it out of the rounds.</div>
          </div>
          <div className="row-between">
            <span className="fin-delta">
              {fbProject && (gcpBilling === null ? 'Checking Google Cloud billing…' : !gcpBilling.ok ? `Could not check Google Cloud billing (${gcpBilling.error}).`
                : gcpBilling.enabled ? <b className="warn">Google Cloud billing is on: this project can run up a bill.</b> : <b className="good">Google Cloud billing is off: this project is on free limits only.</b>)}
            </span>
            <button className="btn-primary" onClick={() => setSvcForm({ custom: true })}><Icons.plus size={13}/> Service</button>
          </div>
          {all.length === 0 && <div className="card agenda-empty">No services yet. Add what this venture pays for or relies on: domain, hosting, phone plan, payment provider.</div>}
          {SERVICE_GROUPS.filter(g => all.some(x => x.group === g)).map(g => (
            <React.Fragment key={g}>
              <div className="svc-group">{g}</div>
              <div className="goal-grid">
                {all.filter(x => x.group === g).map(x => {
                  const meta = svcMeta(x.id);
                  const days = meta.renewsOn ? Math.round((parseLocal(meta.renewsOn) - parseLocal(todayStr)) / 864e5) : null;
                  const pm = paid(x.id, `${month}-01`), pe = paid(x.id);
                  return (
                    <div key={x.id} className="card vt-svc">
                      <div className="focus-head">
                        <div><div className="focus-title">{x.name}</div><div className="focus-meta">{x.does}</div></div>
                        <span className="row-gap">
                          {x.est && (
                            <span className="svc-cost" tabIndex={0} aria-label={`Expected cost: ${estText(x.est, fx)}`}>
                              <b>$</b>
                              <span className="svc-cost-tip">
                                <strong>{estText(x.est, fx)}</strong>
                                <em>About {J(estAt(x.est, usage).min * fx)} to {J(estAt(x.est, usage).max * fx)} a month at {usage.toLocaleString()} orders</em>
                                {x.est.basis}
                                <i>{x.est.sure ? 'Price confirmed on the provider page, Oct 2026.' : 'From list prices and stated assumptions; check your own plan.'}</i>
                              </span>
                            </span>
                          )}
                          <button className="icon-btn" title="Cost, renewal, notes" onClick={() => setSvcForm({ ...meta, serviceId: x.id, name: x.name, does: x.does, url: x.url, custom: !!x.custom })}><Icons.edit size={12}/></button>
                        </span>
                      </div>
                      {x.bills && <div className="svc-bills">{x.bills}</div>}
                      <dl className="fin-kv">
                        <div><dt>Planned</dt><dd className={svcPlanText(meta) === 'Not set' ? 'warn' : ''}>{svcPlanText(meta)}</dd></div>
                        <div><dt>Paid this month</dt><dd>{pm ? J(pm) : 'Nothing logged'}</dd></div>
                        {pe > pm && <div><dt>Paid so far</dt><dd>{J(pe)}</dd></div>}
                        {days !== null && <div><dt>Renews</dt><dd className={days <= 7 ? 'bad' : ''}>{days < 0 ? `${-days}d overdue` : days === 0 ? 'today' : `in ${days}d`}</dd></div>}
                      </dl>
                      {meta.note && <div className="tk-note" style={{ whiteSpace: 'pre-wrap' }}>{meta.note}</div>}
                      <div className="svc-foot">
                        {x.url && <a className="btn-ghost tk-carry" href={fullUrl(x.url)} target="_blank" rel="noopener noreferrer">Open ↗</a>}
                        {x.logs && <a className="btn-ghost tk-carry" href={fullUrl(x.logs)} target="_blank" rel="noopener noreferrer">Logs ↗</a>}
                        <button className="btn-ghost tk-carry" onClick={() => setBillForm({ serviceId: x.id, name: x.name, category: x.cat || 'Tools' })}>Log a bill</button>
                      </div>
                      {h.roundList.some(r => r.id === x.id) && (
                        <button className={`svc-round ${rounds[x.id] ? 'done' : ''}`} onClick={() => onToggleRound(x.id)}>
                          {rounds[x.id] ? <><b className="jp-stamp" lang="ja" aria-hidden="true">済</b>Checked today</> : 'Stamp as checked today'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
          <div className="card">
            <div className="card-label">Bills logged · these are real Finance expenses</div>
            {sortedBills.length === 0 ? <div className="agenda-empty small">Nothing logged yet. When a charge lands, press "Log a bill" on that service.</div> : pageOf(sortedBills, billPg).map(f => (
              <div key={f.id} className="tk-row old">
                <div className="tk-main"><div className="tk-title">{f.description}</div><div className="tk-note">{f.date ? fmtDate(f.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'} · {f.category}</div></div>
                <span className="mono">{J(f.amount)}</span>
              </div>
            ))}
            <Pager pg={billPg} noun="bills"/>
            <div className="goal-hint" style={{ marginTop: '0.75rem' }}>None of these companies lets the console read your spend with the logins on this Mac, and Google has no way to fetch the amount at all. So "actual" means what you logged from the real bill.</div>
          </div>
        </>);
      })()}

      {view === 'people' && (<>
        <div className="card span-7">
          <div className="row-between" style={{ marginBottom: '0.6rem' }}>
            <span className="card-label" style={{ margin: 0 }}>People · {people.length}</span>
            <button className="btn-ghost tk-carry" onClick={() => setItemForm({ kind: 'person' })}><Icons.plus size={12}/> Person</button>
          </div>
          {people.length === 0 ? <div className="agenda-empty small">Partners, investors, team, suppliers. Who is this venture tied to, and on what terms?</div> : pageOf(people, peoplePager(people.length)).map(p => (
            <div key={p.id} className="tk-row old">
              <div className="tk-main">
                <div className="tk-title">{p.name} <span className="vt-role">{p.role}</span></div>
                {(p.contact || p.terms) && <div className="tk-note">{[p.contact, p.terms].filter(Boolean).join(' · ')}</div>}
                {p.note && <div className="tk-note" style={{ whiteSpace: 'pre-wrap' }}>{p.note}</div>}
              </div>
              <button className="icon-btn" onClick={() => setItemForm({ ...p })}><Icons.edit size={12}/></button>
            </div>
          ))}
          <Pager pg={peoplePager(people.length)} noun="people"/>
        </div>
        <div className="card span-5">
          <div className="row-between" style={{ marginBottom: '0.6rem' }}>
            <span className="card-label" style={{ margin: 0 }}>Links · {links.length}</span>
            <button className="btn-ghost tk-carry" onClick={() => setItemForm({ kind: 'link' })}><Icons.plus size={12}/> Link</button>
          </div>
          {links.length === 0 ? <div className="agenda-empty small">The live site, admin panel, shared drive, social pages. One click from here.</div> : pageOf(links, linkPager(links.length)).map(l => (
            <div key={l.id} className="tk-row old">
              <div className="tk-main"><div className="tk-title">{l.label}</div><div className="tk-note">{l.url}</div></div>
              <a className="btn-ghost tk-carry" href={fullUrl(l.url)} target="_blank" rel="noopener noreferrer">Open ↗</a>
              <button className="icon-btn" onClick={() => setItemForm({ ...l })}><Icons.edit size={12}/></button>
            </div>
          ))}
          <Pager pg={linkPager(links.length)} noun="links"/>
        </div>
      </>)}

      {view === 'terminal' && hasFolder && (<>
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

      {view === 'docs' && hasFolder && (<>
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
      {billForm && (
        <BillModal data={billForm} todayStr={todayStr} ventureName={v.name}
          onSave={d => { onAddBill(d); setBillForm(null); }} onClose={() => setBillForm(null)}/>
      )}
      {itemForm && (
        <VentureItemModal data={itemForm} todayStr={todayStr}
          onSave={d => { onSaveItem(d); setItemForm(null); }}
          onDelete={itemForm.id ? () => removeItem(itemForm, itemForm.title || itemForm.name || itemForm.label) : null}
          onClose={() => setItemForm(null)}/>
      )}
      {ConfirmUI}
  </>);
}

function VentureModal({ data, todayStr, onPick, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ name: '', tagline: '', stage: 'Building', startedOn: '', dir: '', color: '', ...data });
  const s = (k, val) => setF(p => ({ ...p, [k]: val }));
  const pick = async () => { const dir = await onPick(); if (dir) setF(p => ({ ...p, dir, name: p.name || dir.split('/').pop() })); };
  const save = () => { if (!f.name.trim()) return; const { createdAt, ...rest } = f; onSave({ ...rest, name: f.name.trim(), tagline: (f.tagline || '').trim() }); };
  return (
    <Modal title={data.id ? `Edit ${data.name}` : 'New Venture'} onClose={onClose}>
      <Field label="Name"><input className="input" autoFocus value={f.name} onChange={e => s('name', e.target.value)} placeholder="e.g. Runner"/></Field>
      <Field label="What it is, in one line"><input className="input" value={f.tagline} onChange={e => s('tagline', e.target.value)} placeholder="Campus food delivery for UWI Mona"/></Field>
      <div className="grid-2">
        <Field label="Stage"><select className="input" value={f.stage} onChange={e => s('stage', e.target.value)}>{VENTURE_STAGES.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Started on (optional)"><input className="input" type="date" max={todayStr} value={f.startedOn || ''} onChange={e => s('startedOn', e.target.value)}/></Field>
      </div>
      <div className="grid-2">
        <Field label="Launch date (optional)"><input className="input" type="date" value={f.launchDate || ''} onChange={e => s('launchDate', e.target.value)}/></Field>
        <Field label="Run-up starts"><input className="input" type="date" value={f.planStart || ''} max={f.launchDate || undefined} onChange={e => s('planStart', e.target.value)}/></Field>
      </div>
      <Field label="Project folder on this Mac (optional)">
        <div className="row-gap">
          <button type="button" className="vt-path" style={{ marginLeft: 0 }} onClick={pick}>{f.dir ? f.dir.replace(/^\/Users\/[^/]+/, '~') : 'Choose a folder…'}</button>
          {f.dir && <button type="button" className="link-btn" onClick={() => s('dir', '')}>Unlink</button>}
        </div>
      </Field>
      <Field label="Colour">
        <div className="sched-cals">
          {VENTURE_HEX.map(c => <button key={c} type="button" className={`sched-cal ${f.color === c ? 'on' : ''}`} style={{ '--c': c }} onClick={() => s('color', c)}><span className="dot"/></button>)}
        </div>
      </Field>
      <div className="focus-preview"><div>With a folder, the console reads the code, keys and live data, and only ever looks. Without one you still get the plan, people, links, services and daily check.</div></div>
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent: 'center' }} onClick={onDelete}><Icons.trash size={13}/> Remove venture</button>}
    </Modal>
  );
}

function VentureItemModal({ data, todayStr, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ role: 'Partner', ...data });
  const s = (k, val) => setF(p => ({ ...p, [k]: val }));
  const kind = data.kind;
  const main = kind === 'move' ? 'title' : kind === 'person' ? 'name' : 'label';
  const save = () => {
    if (!(f[main] || '').trim() || (kind === 'link' && !(f.url || '').trim())) return;
    const { createdAt, ventureId, ...rest } = f;
    onSave({ ...rest, [main]: f[main].trim() });
  };
  return (
    <Modal title={kind === 'move' ? 'Move' : kind === 'person' ? (data.id ? f.name : 'New Person') : (data.id ? f.label : 'New Link')} onClose={onClose}>
      {kind === 'move' && (<>
        <Field label="Move"><input className="input" autoFocus value={f.title || ''} onChange={e => s('title', e.target.value)}/></Field>
        <div className="grid-2">
          <Field label="By when (optional)"><input className="input" type="date" value={f.due || ''} onChange={e => s('due', e.target.value)}/></Field>
          <Field label="Launch phase"><select className="input" value={f.phase || ''} onChange={e => s('phase', e.target.value)}><option value="">None</option>{PHASES.map(ph => <option key={ph.id} value={ph.id}>{ph.label}</option>)}</select></Field>
        </div>
        <Field label="Note"><textarea className="input" style={{ minHeight: 56, resize: 'vertical' }} value={f.note || ''} onChange={e => s('note', e.target.value)}/></Field>
      </>)}
      {kind === 'person' && (<>
        <div className="grid-2">
          <Field label="Name"><input className="input" autoFocus value={f.name || ''} onChange={e => s('name', e.target.value)}/></Field>
          <Field label="Role"><select className="input" value={f.role} onChange={e => s('role', e.target.value)}>{PERSON_ROLES.map(x => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="Phone or email"><input className="input" value={f.contact || ''} onChange={e => s('contact', e.target.value)}/></Field>
        <Field label="Terms (optional)"><input className="input" value={f.terms || ''} onChange={e => s('terms', e.target.value)} placeholder="e.g. put in J$50,000 for 10%, or paid J$300 a delivery"/></Field>
        <Field label="Notes"><textarea className="input" style={{ minHeight: 56, resize: 'vertical' }} value={f.note || ''} onChange={e => s('note', e.target.value)} placeholder="What was agreed, what they are waiting on from you"/></Field>
      </>)}
      {kind === 'link' && (<>
        <Field label="Name"><input className="input" autoFocus value={f.label || ''} onChange={e => s('label', e.target.value)} placeholder="e.g. Live site, Admin panel, Instagram"/></Field>
        <Field label="Link"><input className="input" value={f.url || ''} onChange={e => s('url', e.target.value)} placeholder="https://"/></Field>
      </>)}
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent: 'center' }} onClick={onDelete}><Icons.trash size={13}/> Delete</button>}
    </Modal>
  );
}

function ServiceModal({ data, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ name: '', does: '', url: '', monthlyCost: '', costType: '', renewsOn: '', note: '', ...data });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const type = f.costType || 'monthly';
  const save = () => {
    if (!f.name.trim()) return;
    onSave({ ...f, name: f.name.trim(), costType: type, serviceId: f.serviceId || `custom-${Date.now().toString(36)}`, monthlyCost: f.monthlyCost === '' || type === 'free' ? '' : Number(f.monthlyCost) });
  };
  return (
    <Modal title={data.serviceId ? f.name : 'New Service'} onClose={onClose}>
      {data.custom && (<>
        <Field label="Service"><input className="input" autoFocus value={f.name} onChange={e => s('name', e.target.value)} placeholder="e.g. Domain, phone plan, bank account"/></Field>
        <Field label="What it does for the business"><input className="input" value={f.does} onChange={e => s('does', e.target.value)}/></Field>
        <Field label="Dashboard link"><input className="input" value={f.url} onChange={e => s('url', e.target.value)} placeholder="https://"/></Field>
      </>)}
      <div className="grid-2">
        <Field label="How it charges"><select className="input" value={type} onChange={e => s('costType', e.target.value)}>{COST_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
        {type !== 'free' && <Field label={type === 'usage' ? 'Rough monthly amount (J$, optional)' : type === 'yearly' ? 'Amount a year (J$)' : type === 'once' ? 'One-time amount (J$)' : 'Amount a month (J$)'}><input className="input" type="number" min="0" value={f.monthlyCost} onChange={e => s('monthlyCost', e.target.value)} placeholder="0"/></Field>}
      </div>
      {(type === 'monthly' || type === 'yearly') && <Field label="Next bill / renewal"><input className="input" type="date" value={f.renewsOn || ''} onChange={e => s('renewsOn', e.target.value)}/></Field>}
      <Field label="Notes"><textarea className="input" style={{ minHeight: 64, resize: 'vertical' }} value={f.note || ''} onChange={e => s('note', e.target.value)} placeholder="Which account it's under, plan, limits. Not passwords."/></Field>
      <label className="svc-skip"><input type="checkbox" checked={!!f.noRounds} onChange={e => s('noRounds', e.target.checked)}/> Leave this one out of the daily rounds</label>
      <div className="focus-preview"><div>This is the plan. What you really pay is counted from the bills you log on the service.</div></div>
      <ModalFoot onClose={onClose} onSave={save}/>
      {onDelete && <button className="btn-ghost danger-text" style={{ justifyContent: 'center' }} onClick={onDelete}><Icons.trash size={13}/> Remove service</button>}
    </Modal>
  );
}

// A real charge from a service. Saved as a Finance expense tied to the venture.
function BillModal({ data, todayStr, ventureName, onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState(data.category || 'Tools');
  const [note, setNote] = useState('');
  const save = () => {
    const n = Number(amount);
    if (!(n > 0)) return;
    onSave({ type: 'expense', amount: n, category, date, serviceId: data.serviceId, description: `${ventureName} · ${data.name}${note.trim() ? ` · ${note.trim()}` : ''}` });
  };
  return (
    <Modal title={`Bill · ${data.name}`} onClose={onClose}>
      <div className="grid-2">
        <Field label="Amount charged (J$)"><input className="input" type="number" min="0" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"/></Field>
        <Field label="Date charged"><input className="input" type="date" max={todayStr} value={date} onChange={e => setDate(e.target.value)}/></Field>
      </div>
      <Field label="Finance category"><select className="input" value={category} onChange={e => setCategory(e.target.value)}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Note (optional)"><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. October invoice, converted from US$12"/></Field>
      <div className="focus-preview"><div>Goes into Finance as an expense, so it counts against this month's profit and budgets.</div></div>
      <ModalFoot onClose={onClose} onSave={save}/>
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

// ─── PAGINATION ───────────────────────────────────────────────────────────────
// usePager keeps the page; call what it returns with the list length to get the
// slice bounds. Long lists show a fixed number of rows and a Pager underneath.
function usePager(size, resetKey) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [resetKey]);
  return total => {
    const pages = Math.max(1, Math.ceil(total / size));
    const at = Math.min(page, pages - 1);
    return { page: at, pages, size, total, from: at * size, to: Math.min(total, at * size + size), setPage };
  };
}
const pageOf = (list, pg) => list.slice(pg.from, pg.to);
function Pager({ pg, noun = 'rows' }) {
  if (pg.pages <= 1) return null;
  // 1 … 4 5 6 … 12: first, last and the neighbours of the current page
  const nums = [...new Set([0, pg.page - 1, pg.page, pg.page + 1, pg.pages - 1].filter(n => n >= 0 && n < pg.pages))].sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label="Pages">
      <button className="pager-step" onClick={() => pg.setPage(pg.page - 1)} disabled={pg.page === 0} aria-label="Previous page">‹ Prev</button>
      <span className="pager-nums">
        {nums.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <i>…</i>}
            <button className={n === pg.page ? 'on' : ''} onClick={() => pg.setPage(n)} aria-current={n === pg.page ? 'page' : undefined}>{n + 1}</button>
          </React.Fragment>
        ))}
      </span>
      <button className="pager-step" onClick={() => pg.setPage(pg.page + 1)} disabled={pg.page === pg.pages - 1} aria-label="Next page">Next ›</button>
      <span className="pager-count">{pg.from + 1}–{pg.to} of {pg.total} {noun}</span>
    </nav>
  );
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