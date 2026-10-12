import { PA } from '../constants.js?v=20260727';

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

// Color by enrollment milestones:
// < breakeven → red, >= breakeven → amber/orange,
// >= 12 → light green, >= 15 → green, >= 20 → dark green, >= 25 → gold
export const bC = (pctOrCorso) => {
  // Legacy: if called with just a number (pctTarget), use old logic
  if (typeof pctOrCorso === 'number') {
    return pctOrCorso >= 100 ? '#b8860b'
      : pctOrCorso >= 80 ? '#0d6e3e'
      : pctOrCorso >= 60 ? 'var(--green)'
      : pctOrCorso >= 48 ? '#86efac'
      : pctOrCorso >= 30 ? 'var(--amber)'
      : 'var(--red)';
  }
  // New: receives full corso object
  const c = pctOrCorso;
  const iscritti = c.iscrittiOA || 0;
  const pricing = c.pricing || 0;
  const costiFissi = c.costiFissi || 0;
  const costoPerStudente = c.costoPerStudente || 0;
  const bePrice = pricing - costoPerStudente;
  const breakeven = bePrice > 0 && costiFissi > 0 ? Math.ceil(costiFissi / bePrice) : 0;

  if (iscritti >= 25) return '#b8860b';       // gold
  if (iscritti >= 20) return '#0a5c34';       // very dark green
  if (iscritti >= 15) return '#0d6e3e';       // dark green
  if (iscritti >= 12) return '#86efac';       // light green
  if (breakeven > 0 && iscritti >= breakeven) return 'var(--amber)';  // orange - past breakeven
  return 'var(--red)';                        // red - below breakeven
};
