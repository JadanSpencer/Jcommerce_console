// src/runnerCost.js
// Runner's Google bill and AI bill, worked out from measured usage. These are
// estimates: Google's real figure is only in Billing → Reports without a billing
// export. Prices are Google's US rates for Runner's regions, checked 1 Nov 2026.
// The compute free tier matches the US$5.22 saving on Runner's October bill.
const P = {
  cpuIdle: 0.0000025, cpuActive: 0.000024, memory: 0.0000025, computeFree: 5.22,
  reads: 0.06 / 1e5, writes: 0.18 / 1e5, deletes: 0.02 / 1e5,
  readsFreeDay: 50000, writesFreeDay: 20000, deletesFreeDay: 20000,
  hostingGb: 0.15, hostingFreeGb: 10, storageGb: 0.026, storageFreeGb: 5,
  imagesGb: 0.1, imagesFreeGb: 0.5, schedulerJob: 0.1, schedulerFree: 3,
};
export const WORST_MULTIPLIER = 3;
export const SPIKE_MULTIPLIER = 3;
export const WARM_SECONDS_DAY = 40000; // a function up this long in a day is being kept awake
const DAY = 86400000;
const GB = 1e9;

const over = (n, free) => Math.max(0, n - free);
// What one day of use costs, before the monthly free allowances
const dayParts = d => ({
  compute: (d.computeUsd || 0) + (d.warmUsd || 0),
  database: over(d.reads || 0, P.readsFreeDay) * P.reads + over(d.writes || 0, P.writesFreeDay) * P.writes + over(d.deletes || 0, P.deletesFreeDay) * P.deletes,
  hostingGb: (d.hostingBytes || 0) / GB,
});
const sum = (rows, f) => rows.reduce((t, r) => t + f(r), 0);
const googleBill = (rows, fixedUsd) => {
  const compute = sum(rows, d => dayParts(d).compute);
  return Math.max(0, compute - P.computeFree) + sum(rows, d => dayParts(d).database)
    + over(sum(rows, d => dayParts(d).hostingGb), P.hostingFreeGb) * P.hostingGb + fixedUsd;
};
const dayWeight = d => (d.computeUsd || 0) + dayParts(d).database + dayParts(d).hostingGb * P.hostingGb;

// One function's use on one day, at the rate it is really charged
export const computeUsd = (seconds, fn) => {
  const warm = !!fn?.warm || seconds >= WARM_SECONDS_DAY, cpu = fn?.cpu ?? 1, gib = fn?.gib ?? 0.25;
  return seconds * (cpu * (warm ? P.cpuIdle : P.cpuActive) + gib * P.memory);
};

export function costForecast(usage, botDays, now) {
  const d = new Date(now), y = d.getUTCFullYear(), m = d.getUTCMonth();
  const month = `${y}-${String(m + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const left = daysInMonth - d.getUTCDate() + 1; // usage.days stops at last midnight, so today is still to come
  const aiDay = Object.fromEntries((botDays || []).map(b => [b.id, (Number(b.inputTokens) * 4 + Number(b.outputTokens) * 20 + Number(b.cacheReadTokens) * 0.2 + Number(b.cacheWriteTokens) * 8 || 0) / 1e6]));
  const fns = usage.functions || {};
  const complete = usage.days.map(x => {
    const names = Object.keys(x.seconds || {});
    const cost = list => sum(list, n => computeUsd(x.seconds[n], fns[n]));
    return { ...x, warmUsd: cost(names.filter(n => fns[n]?.warm)), computeUsd: cost(names.filter(n => !fns[n]?.warm)), ai: aiDay[x.d] || 0 };
  });
  const thisMonth = complete.filter(x => x.d.startsWith(month));
  const recent = complete.slice(-14);
  const fixedUsd = over(usage.storageBytes / GB, P.storageFreeGb) * P.storageGb + over(usage.imagesBytes / GB, P.imagesFreeGb) * P.imagesGb + over(usage.schedulerJobs, P.schedulerFree) * P.schedulerJob;

  const spare = { d: '', warmUsd: 0, computeUsd: 0, reads: 0, writes: 0, deletes: 0, hostingBytes: 0, ai: 0 };
  const byWeight = [...complete].sort((a, b) => dayWeight(a) - dayWeight(b));
  const quiet = byWeight[0] || spare, busy = byWeight[byWeight.length - 1] || spare;
  const average = Object.fromEntries(Object.keys(spare).filter(k => k !== 'd').map(k => [k, recent.length ? sum(recent, r => r[k] || 0) / recent.length : 0]));
  const aiPeak = complete.reduce((t, r) => Math.max(t, r.ai), 0);
  const case_ = (name, assumes, restDay, aiPerDay) => {
    const rest = Array.from({ length: left }, () => restDay);
    const google = googleBill([...thisMonth, ...rest], fixedUsd);
    const ai = sum(thisMonth, r => r.ai) + aiPerDay * left;
    return { name, assumes, google, ai, total: google + ai };
  };
  const scaled = k => Object.fromEntries(Object.entries(busy).map(([f, v]) => [f, typeof v === 'number' && f !== 'warmUsd' ? v * k : v]));
  const cases = [
    case_('Best', 'Every day left is as quiet as your quietest day in the last 30.', quiet, quiet.ai),
    case_('Likely', 'Every day left matches your average over the last 14 days.', average, average.ai),
    case_('Worst', `Every day left is ${WORST_MULTIPLIER} times your busiest day in the last 30.`, scaled(WORST_MULTIPLIER), aiPeak * WORST_MULTIPLIER),
  ];
  const last = complete[complete.length - 1];
  const before = complete.slice(-15, -1);
  const lastSeconds = last?.seconds || {};
  const normalReads = before.length ? sum(before, r => r.reads) / before.length : 0;
  const spike = !!last && last.reads > P.readsFreeDay && last.reads > normalReads * SPIKE_MULTIPLIER;
  return {
    cases, soFar: { google: googleBill(thisMonth, fixedUsd), ai: sum(thisMonth, r => r.ai) }, daysLeft: left,
    spike: spike ? { day: last.d, reads: last.reads, normal: Math.round(normalReads) } : null,
    averageReads: Math.round(average.reads), awake: Object.keys(fns).filter(n => fns[n].warm),
    strays: Object.keys(lastSeconds).filter(n => !fns[n]?.warm && lastSeconds[n] >= WARM_SECONDS_DAY),
  };
}

// Deploys as Google saw them, whichever Mac or command ran them. Hosting and
// functions in the same half hour are one deploy, as in Runner's deploy-guard.mjs.
export function deployCounts(times, now) {
  const sorted = [...times].filter(Boolean).sort((a, b) => a - b);
  const starts = sorted.filter((t, i) => !i || t - sorted[i - 1] >= 30 * 60000);
  return { day: starts.filter(t => now - t < DAY).length, month: starts.filter(t => now - t < 30 * DAY).length };
}
