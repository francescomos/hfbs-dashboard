import { state } from '../state.js';
import { IF } from '../constants.js';
import { fE } from '../utils/format.js';
import { nP, dTS, cSt } from '../utils/normalize.js';
import { buildCorsi } from './buildCorsi.js';

/**
 * Suggerimenti automatici basati sullo stato dei corsi.
 * Fonte dei dati:
 *  - Zona rossa: c.pctTarget < 70 && daysToStart ∈ (0, 45]
 *  - Margine negativo: revenueOA - costiTotali - mktgPaid < 0 per corsi partiti
 *  - No-show alti: Brevo_Deals stage='No Show' / calAll > 15%
 *  - Best performer: pctTarget >= 100 tra i done
 *  - CPA alto: c.cpa > 1000
 */
export function buildSuggestions() {
  const corsi = buildCorsi();
  const out = [];

  const zr = corsi.filter((c) => {
    const d = dTS(c);
    return c.pctTarget < 70 && d > 0 && d <= 45;
  });
  if (zr.length > 0) {
    out.push({
      level: 'crit',
      title: `${zr.length} cors${zr.length > 1 ? 'i' : 'o'} in zona rossa`,
      text: `<b>${zr.map((c) => c.nome + ' (' + (IF[c.intake] || c.intake) + ')').join(', ')}</b>: meno di 45 giorni al via e sotto il 70% del target. Priorità massima: accelerare outbound, valutare early-bird o rinvio.`,
    });
  }

  const neg = corsi.filter((c) => {
    const st = cSt(c);
    if (st === 'selling') return false;
    const marg = (c.revenueOA || 0) - (c.costiTotali || 0) - (c.mktgPaid || 0);
    return marg < 0 && c.revenueOA > 0;
  });
  if (neg.length > 0) {
    out.push({
      level: 'warn',
      title: 'Marginalità sotto zero',
      text: `${neg.slice(0, 3).map((c) => c.nome + ' ' + (IF[c.intake] || c.intake)).join(', ')}${neg.length > 3 ? ` e altre ${neg.length - 3}` : ''}: costi totali superiori al revenue incassato. Rivedere costi delivery o pricing.`,
    });
  }

  // No-show tasso alto (stage 'No Show' nei deal Brevo vs colloqui)
  const hNS = corsi.filter((c) => {
    const ns = c.brevoStages?.['No Show'] || 0;
    return c.calAll > 0 && ns / c.calAll > 0.15;
  });
  if (hNS.length > 0) {
    out.push({
      level: 'warn',
      title: 'No-show elevati',
      text: `${hNS.length} edizion${hNS.length > 1 ? 'i' : 'e'} con tasso no-show &gt;15%. Considera SMS reminder 24h prima del colloquio.`,
    });
  }

  const top = corsi
    .filter((c) => cSt(c) === 'done' && c.pctTarget >= 100)
    .sort((a, b) => b.pctTarget - a.pctTarget)[0];
  if (top) {
    out.push({
      level: 'ok',
      title: 'Best performer',
      text: `<b>${top.nome} (${IF[top.intake] || top.intake})</b> ha chiuso al ${top.pctTarget}% del target con ${top.iscrittiOA} iscritti. Replicare mix canali e pricing.`,
    });
  }

  const hiCPA = corsi.filter((c) => c.cpa > 0).sort((a, b) => b.cpa - a.cpa)[0];
  if (hiCPA && hiCPA.cpa > 1000) {
    out.push({
      level: 'info',
      title: 'CPA più alto del benchmark',
      text: `<b>${hiCPA.nome}</b>: CPA ${fE(hiCPA.cpa)} su ${IF[hiCPA.intake] || hiCPA.intake}. Valutare shift budget Google → Meta/referral.`,
    });
  }

  return out.slice(0, 3);
}

export function suggestCardHTML(s) {
  const icon = s.level === 'crit' ? '!' : s.level === 'warn' ? '⚠' : s.level === 'ok' ? '✓' : 'i';
  return `<div class="suggest-card ${s.level}">`
    + `<div class="sc-icon">${icon}</div>`
    + `<div class="sc-body"><div class="sc-title">${s.title}</div><div class="sc-text">${s.text}</div></div>`
    + '</div>';
}

/**
 * Ultima edizione di un prodotto = max(startDate) tra i corsi con stesso nome.
 */
export function getLastEdition(corsi) {
  if (!corsi.length) return null;
  return [...corsi].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return db - da;
  })[0];
}

/**
 * Tempo medio di conversione (createdAt -> closeDate/modifiedAt) su deal Closed Won.
 */
export function avgConversionDays(deals) {
  const won = deals.filter((d) => d.stage === 'Closed Won');
  if (!won.length) return 0;
  const tot = won.reduce((s, d) => {
    const cr = new Date(d.createdAt);
    const cl = new Date(d.modifiedAt || d.closeDate);
    if (isNaN(cr) || isNaN(cl)) return s;
    return s + Math.max(0, Math.floor((cl - cr) / 864e5));
  }, 0);
  return Math.round(tot / won.length);
}

/**
 * % dropout pipeline = Closed Lost / (Won + Lost).
 */
export function dropoutPct(deals) {
  const won = deals.filter((d) => d.stage === 'Closed Won').length;
  const lost = deals.filter((d) => d.stage === 'Closed Lost').length;
  if (won + lost === 0) return 0;
  return Math.round((lost / (won + lost)) * 100);
}

/**
 * % no-show = deal con stage 'No Show' / colloqui totali.
 */
export function noShowPct(deals, calAll) {
  if (!calAll) return 0;
  const ns = deals.filter((d) => d.stage === 'No Show').length;
  return Math.round((ns / calAll) * 100);
}

/**
 * Alumni returning: studenti (per email) che compaiono in ≥2 corsi di questo prodotto
 * oppure in altri prodotti HFBS.
 * Ritorna il numero di email distinte che hanno più iscrizioni, tra le email del prodotto.
 */
export function countAlumniReturning(prodName) {
  const DL = state.DL;
  if (!DL) return 0;
  const oaR = DL.OA_Studenti || [];
  const cfg = DL.Config_Corsi || [];
  const prodSigla = cfg.find((c) => c.nome === prodName)?.siglaProdotto;
  if (!prodSigla) return 0;
  const prod = nP(prodSigla);

  // Email del prodotto corrente
  const myEmails = new Set();
  for (const r of oaR) {
    if (nP(r.prodotto) === prod && r.email) myEmails.add(r.email.toLowerCase());
  }
  if (myEmails.size === 0) return 0;

  // Conta quante di queste email appaiono anche altrove
  const allOccurrences = {};
  for (const r of oaR) {
    if (!r.email) continue;
    const em = r.email.toLowerCase();
    if (!myEmails.has(em)) continue;
    allOccurrences[em] = (allOccurrences[em] || 0) + 1;
  }
  return Object.values(allOccurrences).filter((n) => n >= 2).length;
}
