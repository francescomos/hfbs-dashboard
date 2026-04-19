import { state } from '../state.js';
import { IF } from '../constants.js';
import { cSt } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';

export function renderMonitor() {
  const DL = state.DL;
  if (!DL) return;
  const meta = DL._metadata || [];

  $('monitor-global').innerHTML =
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:14px">Stato fonti globale</h3>'
    + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:24px">'
    + meta.map((m) =>
      `<div class="monitor-row" style="background:var(--card);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border)"><div class="monitor-dot ${m.status === 'ok' ? 'dot-ok' : m.status === 'vuoto' ? 'dot-warn' : 'dot-miss'}"></div><div class="monitor-label" style="font-weight:600;color:var(--text1)">${m.tab}</div><div class="monitor-val">${m.records} righe</div></div>`,
    ).join('')
    + '</div>';

  const corsi = buildCorsi();
  const byN = {};
  for (const c of corsi) {
    if (!byN[c.nome]) byN[c.nome] = [];
    byN[c.nome].push(c);
  }
  const grid = $('monitor-per-prod');
  grid.style.gridTemplateColumns = 'repeat(3,1fr)';
  grid.innerHTML = Object.entries(byN).sort((a, b) => a[0].localeCompare(b[0])).map(([nome, eds]) => {
    const allSt = eds.map((c) => cSt(c));
    const pSt = allSt.includes('active') ? 'In corso' : allSt.includes('selling') ? 'In vendita' : 'Concluso';
    const pStC = pSt === 'In vendita' ? 'ed-status-selling' : pSt === 'In corso' ? 'ed-status-active' : 'ed-status-done';
    return `<div class="monitor-card"><div class="monitor-card-title">${nome} <span class="ed-status ${pStC}" style="margin-left:6px">${pSt}</span></div>`
      + eds.map((c) => {
        const il = IF[c.intake] || c.intake;
        const hO = c.iscrittiOA > 0;
        const hB = c.brevoDeals.length > 0;
        const hG = c.gfCount > 0;
        const hC = c.calAll > 0;
        const hK = c.costiFissi > 0;
        return `<div style="margin-bottom:8px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">${il}</div><div style="display:flex;gap:4px;flex-wrap:wrap"><span class="badge ${hO ? 'badge-ok' : 'badge-bad'}">O&A ${hO ? c.iscrittiOA : '✗'}</span><span class="badge ${hB ? 'badge-ok' : 'badge-warn'}">Brevo ${hB ? c.brevoDeals.length : '✗'}</span><span class="badge ${hG ? 'badge-ok' : 'badge-warn'}">GF ${hG ? c.gfCount : '✗'}</span><span class="badge ${hC ? 'badge-ok' : 'badge-warn'}">Cal ${hC ? c.calAll : '✗'}</span><span class="badge ${hK ? 'badge-ok' : 'badge-warn'}">Costi ${hK ? '✓' : '✗'}</span></div></div>`;
      }).join('')
      + '</div>';
  }).join('');
}
