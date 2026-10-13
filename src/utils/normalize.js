import { PA } from '../constants.js?v=20261013c';

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

// Color by enrollment milestones — coherent green gradient:
// < breakeven → red, >= breakeven → amber,
// >= 12 → sage, >= 15 → green, >= 20 → forest, >= 25 → gold
export const bC = (pctOrCorso) => {
  // Legacy: if called with just a number (pctTarget), map roughly
  if (typeof pctOrCorso === 'number') {
    const p = pctOrCorso;
    if (p >= 100) return '#a67c00';
    if (p >= 80) return '#1a6b42';
    if (p >= 60) return '#2d8659';
    if (p >= 48) return '#4a9e6e';
    if (p >= 30) return 'var(--amber)';
    return 'var(--red)';
  }
  const c = pctOrCorso;
  const iscritti = c.iscrittiOA || 0;
  const pricing = c.pricing || 0;
  const costiFissi = c.costiFissi || 0;
  const costoPerStudente = c.costoPerStudente || 0;
  const bePrice = pricing - costoPerStudente;
  const breakeven = bePrice > 0 && costiFissi > 0 ? Math.ceil(costiFissi / bePrice) : 0;

  if (iscritti >= 25) return '#a67c00';       // gold — target pieno
  if (iscritti >= 20) return '#14532d';       // forest — quasi al target
  if (iscritti >= 15) return '#1a6b42';       // deep green
  if (iscritti >= 12) return '#2d8659';       // green — soglia minima OK
  if (breakeven > 0 && iscritti >= breakeven) return 'var(--amber)';  // amber — copri i costi
  return 'var(--red)';                        // red — sotto breakeven
};
