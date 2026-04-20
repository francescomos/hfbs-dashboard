import { state } from '../state.js';
import { IF } from '../constants.js';
import { cSt } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';

export function renderMonitor() {
  const DL = state.DL;
  if (!DL) return;
  const meta = DL._metadata || [];

  let h = '';
  h += '<div class="section"><div class="section-title"><span class="tt-left">Fonti dati</span>';
  if (DL._lastRefresh) h += `<span class="tt-right">${DL._lastRefresh}</span>`;
  h += '</div>';
  h += '<div class="mon-grid">';
  h += meta.map((m) => {
    const st = m.status === 'ok' ? 'ok' : m.status === 'vuoto' ? 'warn' : 'bad';
    const dotCls = st === 'ok' ? 'dot-ok' : st === 'warn' ? 'dot-warn' : 'dot-bad';
    return `<div class="mon-row"><span class="dot ${dotCls}"></span><span class="monitor-label">${m.tab}</span><span class="monitor-val">${m.records} righe</span></div>`;
  }).join('');
  h += '</div></div>';

  $('monitor-global').innerHTML = h;

  const corsi = buildCorsi();
  const byN = {};
  for (const c of corsi) {
    if (!byN[c.nome]) byN[c.nome] = [];
    byN[c.nome].push(c);
  }
  const grid = $('monitor-per-prod');
  grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(300px,1fr))';
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
        return `<div style="margin-bottom:10px"><div style="font-size:13px;font-weight:800;margin-bottom:5px">${il}</div><div style="display:flex;gap:5px;flex-wrap:wrap"><span class="badge ${hO ? 'badge-ok' : 'badge-bad'}">O&A ${hO ? c.iscrittiOA : '✗'}</span><span class="badge ${hB ? 'badge-ok' : 'badge-warn'}">Brevo ${hB ? c.brevoDeals.length : '✗'}</span><span class="badge ${hG ? 'badge-ok' : 'badge-warn'}">GF ${hG ? c.gfCount : '✗'}</span><span class="badge ${hC ? 'badge-ok' : 'badge-warn'}">Cal ${hC ? c.calAll : '✗'}</span><span class="badge ${hK ? 'badge-ok' : 'badge-warn'}">Costi ${hK ? '✓' : '✗'}</span></div></div>`;
      }).join('')
      + '</div>';
  }).join('');
}
