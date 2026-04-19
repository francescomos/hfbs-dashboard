import { PA } from '../constants.js';

export const nI = (c) => {
  if (!c) return '';
  c = c.toUpperCase();
  if (/^(FA|WI|SP|SU)\d{2}$/.test(c)) return c;
  const m = c.match(/^([A-Z])(\d{2})$/);
  if (m) {
    const p = { W: 'WI', F: 'FA', S: 'SP' };
    if (p[m[1]]) return p[m[1]] + m[2];
  }
  return c;
};

export const nP = (p) => {
  p = (p || '').toUpperCase();
  return PA[p] || p;
};

export const dTS = (c) => {
  const s = c.startDate || '';
  if (!s) return -999;
  try {
    const d = new Date(s);
    if (isNaN(d)) return -999;
    return Math.floor((d - Date.now()) / 864e5);
  } catch {
    return -999;
  }
};

export const cSt = (c) => {
  const d = dTS(c);
  if (d > 0) return 'selling';
  const e = c.endDate || '';
  if (!e) return d > -999 ? 'active' : 'selling';
  try {
    const ed = new Date(e);
    if (!isNaN(ed) && Date.now() > ed) return 'done';
  } catch {}
  return 'active';
};

export const bC = (p) =>
  p >= 90 ? 'var(--green)'
    : p >= 80 ? '#86efac'
    : p >= 70 ? 'var(--yellow)'
    : p >= 60 ? 'var(--amber)'
    : 'var(--red)';
