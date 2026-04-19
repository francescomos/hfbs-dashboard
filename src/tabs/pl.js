import { state } from '../state.js';
import { IF, INTAKE_ORDER_PL, INTAKE_LABEL_PL, BRAND_SIGLE } from '../constants.js';
import { fE, fDshort } from '../utils/format.js';
import { nP, dTS } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';

export function plStatus(c) {
  const days = dTS(c);
  if (!c.startDate || days > 0) return 'future';
  if (c.iscrittiOA < 5) return 'not_started';
  if ((c.tipo || '').toUpperCase() === 'RE') return 'done';
  return 'active';
}

export function computeOrphanMktg(corsi) {
  const DL = state.DL;
  const mktg = DL.Mktg_ExEd || [];
  const cfgFks = new Set(corsi.map((c) => c.fk));
  const corsiProds = new Set(corsi.map((c) => c.prod));
  const orphanMktg = {};

  for (const m of mktg) {
    const s = (m.sigla || '').toUpperCase().split('-');
    const fk = s.length >= 3 ? nP(s[0]) + '-' + s[2] : (m.sigla || '').toUpperCase();
    if (!cfgFks.has(fk)) {
      if (!orphanMktg[m.sigla]) orphanMktg[m.sigla] = 0;
      orphanMktg[m.sigla] += parseFloat(m.budgetSpeso) || 0;
    }
  }

  let brandSpend = 0;
  const processCampaigns = (list, spendKey) => {
    list.forEach((c) => {
      const s = (c.sigle || '').split(',').filter(Boolean).map((x) => nP(x.trim()));
      const spend = parseFloat(c[spendKey]) || 0;
      if (spend <= 0) return;
      if (s.some((sig) => corsiProds.has(sig))) return;
      if (s.some((sig) => BRAND_SIGLE[sig])) { brandSpend += spend; return; }
      if (s.length > 0) {
        const key = s.join(',') + ' (' + c.campaignName.substring(0, 30) + ')';
        orphanMktg[key] = (orphanMktg[key] || 0) + spend;
      } else if (spend > 50) {
        orphanMktg[c.campaignName.substring(0, 40)] = (orphanMktg[c.campaignName.substring(0, 40)] || 0) + spend;
      }
    });
  };
  processCampaigns(DL.Meta_Campaigns || [], 'spend');
  processCampaigns(DL.GAds_Campaigns || [], 'cost');

  for (const k in orphanMktg) if (orphanMktg[k] < 50) delete orphanMktg[k];

  return { orphanMktg, brandSpend, orphanTotal: Object.values(orphanMktg).reduce((s, v) => s + v, 0) + brandSpend };
}

export function renderPL() {
  const DL = state.DL;
  if (!DL) return;
  const ct = $('pl-content');
  const corsi = buildCorsi();
  const { orphanMktg, brandSpend, orphanTotal } = computeOrphanMktg(corsi);

  const filtered = state.plFilter === 'all' ? corsi : corsi.filter((c) => c.intake === state.plFilter);

  const enriched = filtered.map((c) => {
    const st = plStatus(c);
    const partito = st === 'done' || st === 'active';
    const costiProd = partito ? c.costiTotali : 0;
    const costiMktg = c.mktgPaid || 0;
    const revenue = c.revenueOA || 0;
    const margine = revenue - costiProd - costiMktg;
    const margPct = revenue > 0 ? Math.round((margine / revenue) * 100) : null;
    return { ...c, st, partito, costiProd, costiMktg, margine, margPct };
  });

  const totRev = enriched.reduce((s, c) => s + c.revenueOA, 0);
  const totProd = enriched.reduce((s, c) => s + c.costiProd, 0);
  const totMktgA = enriched.reduce((s, c) => s + c.costiMktg, 0) + (state.plFilter === 'all' ? orphanTotal : 0);
  const totNetto = totRev - totProd - totMktgA;

  const stLabel = { done: 'Concluso', active: 'In corso', future: 'Futuro', not_started: 'Non partito' };
  const stColor = { done: 'var(--text3)', active: 'var(--green)', future: 'var(--blue)', not_started: 'var(--red)' };
  const stBg = { done: '#e8e6e0', active: 'var(--green-l)', future: 'var(--blue-l)', not_started: 'var(--red-l)' };
  const tipoColors = { RE: '#f59e0b', PM: '#3b82f6', IC: '#7c3aed', MB: '#22c55e', ME: '#10b981', SC: '#6366f1', SP: '#ec4899' };

  let h = '';
  // Filtri intake
  h += '<div class="filters" style="margin-bottom:16px">';
  h += `<div class="filter-pill ${state.plFilter === 'all' ? 'active' : ''}" data-pl-filter="all">Tutti</div>`;
  for (const intk of INTAKE_ORDER_PL)
    h += `<div class="filter-pill ${state.plFilter === intk ? 'active' : ''}" data-pl-filter="${intk}">${INTAKE_LABEL_PL[intk] || intk}</div>`;
  h += '</div>';

  // Summary cards
  const margCol = totNetto >= 0 ? 'var(--green)' : 'var(--red)';
  h += '<div class="kpi-row" style="margin-bottom:24px">';
  h += `<div class="kpi"><div class="kpi-label">Revenue totale</div><div class="kpi-value" style="color:var(--green)">${fE(totRev)}</div><div class="kpi-sub">Incasso O&A ufficiale</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Costi produzione</div><div class="kpi-value">${fE(totProd)}</div><div class="kpi-sub">Solo corsi partiti/in corso</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Costi marketing</div><div class="kpi-value">${fE(totMktgA)}</div><div class="kpi-sub">${state.plFilter === 'all' && orphanTotal > 0 ? 'Incl. ' + fE(orphanTotal) + ' non allocati' : 'Meta+GAds campaigns'}</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Margine netto</div><div class="kpi-value" style="color:${margCol}">${fE(totNetto)}</div><div class="kpi-sub">${totRev > 0 ? Math.round((totNetto / totRev) * 100) + '% su revenue' : '—'}</div></div>`;
  h += '</div>';

  h += '<div style="overflow-x:auto"><table class="mtable" style="min-width:900px"><tbody>';
  const byIntake = {};
  for (const c of enriched) {
    const intk = c.intake || 'OTHER';
    if (!byIntake[intk]) byIntake[intk] = [];
    byIntake[intk].push(c);
  }
  const orderedIntakes = INTAKE_ORDER_PL.filter((i) => byIntake[i]).concat(Object.keys(byIntake).filter((i) => !INTAKE_ORDER_PL.includes(i)));

  const plHeaders = (intk) =>
    `<tr style="background:#ddd8d0"><td colspan="2" style="font-weight:700;color:var(--text1);font-size:13px">${INTAKE_LABEL_PL[intk] || intk || ''}</td><td style="font-size:11px;font-weight:700;color:var(--text1)">Tipo</td><td style="font-size:11px;font-weight:700;color:var(--text1)">Stato</td><td style="font-size:11px;font-weight:700;color:var(--text1)">Start</td><td class="num" style="font-size:11px;font-weight:700;color:var(--text1)">Iscritti</td><td class="num" style="font-size:11px;font-weight:700;color:var(--text1)">Revenue</td><td class="num" style="font-size:11px;font-weight:700;color:var(--text1)">Produzione</td><td class="num" style="font-size:11px;font-weight:700;color:var(--text1)">Marketing</td><td class="num" style="font-size:11px;font-weight:700;color:var(--text1)">Margine</td><td class="num" style="font-size:11px;font-weight:700;color:var(--text1)">Marg %</td></tr>`;

  for (const intk of orderedIntakes) {
    const rows = byIntake[intk].sort((a, b) => b.margine - a.margine);
    const sR = rows.reduce((s, c) => s + c.revenueOA, 0);
    const sP = rows.reduce((s, c) => s + c.costiProd, 0);
    const sM = rows.reduce((s, c) => s + c.costiMktg, 0);
    const sN = sR - sP - sM;

    h += plHeaders(intk);
    for (const c of rows) {
      const mc = c.margine >= 0 ? 'var(--green)' : 'var(--red)';
      const tipo = (c.tipo || '').toUpperCase().substring(0, 2);
      const days = dTS(c);
      const startStr = c.startDate ? fDshort(c.startDate) : '—';
      const futureNote = (c.st === 'future' && days > 0 && days < 999) ? ` <span style="font-size:11px;color:var(--text3)">(tra ${days}gg)</span>` : '';
      const prodNote = !c.partito ? `<span style="font-size:10px;color:var(--text3);margin-left:4px">${c.st === 'future' ? 'proiettati' : 'non sost.'}</span>` : '';

      h += '<tr>';
      h += `<td style="font-family:var(--mono);font-size:12px;color:var(--text3)">${c.sig}</td>`;
      h += `<td style="font-weight:600;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${c.nome}">${c.nome}</td>`;
      h += `<td><span style="background:${(tipoColors[tipo] || '#9ca3af')}22;color:${tipoColors[tipo] || '#9ca3af'};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700">${tipo}</span></td>`;
      h += `<td><span style="background:${stBg[c.st]};color:${stColor[c.st]};border-radius:12px;padding:3px 10px;font-size:11px;font-weight:700">${stLabel[c.st]}</span></td>`;
      h += `<td style="font-size:13px;white-space:nowrap">${startStr}${futureNote}</td>`;
      h += `<td class="num">${c.iscrittiOA} <span style="color:var(--text3);font-size:11px">/ ${c.target}</span></td>`;
      h += `<td class="num" style="color:var(--green)">${fE(c.revenueOA)}</td>`;
      h += `<td class="num">${c.costiProd > 0 ? fE(c.costiProd) : '<span style="color:var(--text3)">€0</span>'}${prodNote}</td>`;
      h += `<td class="num">${c.costiMktg > 0 ? fE(c.costiMktg) : '<span style="color:var(--text3)">€0</span>'}</td>`;
      h += `<td class="num" style="color:${mc};font-weight:700">${fE(c.margine)}</td>`;
      h += `<td class="num" style="color:${mc};font-weight:700">${c.margPct !== null ? c.margPct + '%' : '—'}</td>`;
      h += '</tr>';
    }
    const snC = sN >= 0 ? 'var(--green)' : 'var(--red)';
    h += `<tr class="row-sub"><td colspan="5" style="font-size:12px">Subtotale ${INTAKE_LABEL_PL[intk] || intk}</td><td class="num">${rows.reduce((s, c) => s + c.iscrittiOA, 0)}</td><td class="num" style="color:var(--green)">${fE(sR)}</td><td class="num">${fE(sP)}</td><td class="num">${fE(sM)}</td><td class="num" style="color:${snC}">${fE(sN)}</td><td class="num" style="color:${snC}">${sR > 0 ? Math.round((sN / sR) * 100) + '%' : '—'}</td></tr>`;
  }

  h += plHeaders('TOTALE GENERALE');
  const tNC = totNetto >= 0 ? 'var(--green)' : 'var(--red)';
  h += `<tr class="row-tot"><td colspan="5">TOTALE GENERALE</td><td class="num">${enriched.reduce((s, c) => s + c.iscrittiOA, 0)}</td><td class="num" style="color:var(--green)">${fE(totRev)}</td><td class="num">${fE(totProd)}</td><td class="num">${fE(totMktgA)}</td><td class="num" style="color:${tNC}">${fE(totNetto)}</td><td class="num" style="color:${tNC}">${totRev > 0 ? Math.round((totNetto / totRev) * 100) + '%' : '—'}</td></tr>`;

  if (orphanTotal > 0 && state.plFilter === 'all') {
    const orphanEntries = Object.entries(orphanMktg).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
    if (orphanEntries.length > 0) {
      const orphanDetail = orphanEntries.map((e) => e[0] + ' ' + fE(e[1])).join('  |  ');
      h += `<tr style="background:var(--amber-l)"><td colspan="8" style="font-size:11px;color:var(--amber)">⚠ Mktg non allocato: <span style="color:var(--text3)">${orphanDetail}</span></td><td class="num" style="color:var(--amber);font-weight:700">${fE(Object.values(orphanMktg).reduce((s, v) => s + v, 0))}</td><td colspan="2"></td></tr>`;
    }
    if (brandSpend > 0) {
      h += `<tr style="background:var(--blue-l)"><td colspan="8" style="font-size:11px;color:var(--blue)">ℹ Brand/awareness spend (non allocabile a singolo corso)</td><td class="num" style="color:var(--blue);font-weight:700">${fE(brandSpend)}</td><td colspan="2"></td></tr>`;
    }
  }
  h += '</tbody></table></div>';

  // Corsi futuri — scenari
  const futuri = enriched.filter((c) => c.st === 'future');
  if (futuri.length > 0) {
    const totFProd = futuri.reduce((s, c) => s + c.costiTotali, 0);
    const totFMktg = futuri.reduce((s, c) => s + c.costiMktg, 0);
    h += '<div style="margin-top:28px"><h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Corsi futuri — scenari</h3>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:16px">';
    for (const c of futuri.sort((a, b) => dTS(a) - dTS(b))) {
      const days = dTS(c);
      const scenarioParte = c.revenueOA - c.costiTotali - c.costiMktg;
      const scenarioNoParte = 0 - c.costiMktg;
      h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div style="font-size:14px;font-weight:700;margin-bottom:4px">${c.nome}</div><div style="font-size:12px;color:var(--text3);margin-bottom:10px">${IF[c.intake] || c.intake}  |  ${days > 0 && days < 999 ? 'tra ' + days + ' gg' : 'data da definire'}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div style="background:var(--green-l);border-radius:var(--radius-sm);padding:10px"><div style="font-size:10px;font-weight:700;color:var(--green);margin-bottom:4px">✓ SE PARTE</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:${scenarioParte >= 0 ? 'var(--green)' : 'var(--red)'}">${fE(scenarioParte)}</div><div style="font-size:11px;color:var(--text3)">${c.iscrittiOA} iscritti att.</div></div><div style="background:var(--red-l);border-radius:var(--radius-sm);padding:10px"><div style="font-size:10px;font-weight:700;color:var(--red);margin-bottom:4px">✗ SE NON PARTE</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--red)">${fE(scenarioNoParte)}</div><div style="font-size:11px;color:var(--text3)">Solo mktg perso</div></div></div></div>`;
    }
    h += '</div>';

    // scenario al 50% del target
    h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px"><div class="prod-section-title">Scenario — tutti i corsi futuri partono al 50% del target</div>';
    h += '<table class="mtable"><thead><tr><th>Corso</th><th class="num">50% target</th><th class="num">Revenue stimata</th><th class="num">Produzione</th><th class="num">Marketing</th><th class="num">Margine</th><th class="num">%</th></tr></thead><tbody>';
    let s50Rev = 0, s50Prod = 0, s50Mktg = 0;
    for (const c of futuri.sort((a, b) => dTS(a) - dTS(b))) {
      const pax50 = Math.ceil(c.target * 0.5);
      const rev50 = pax50 * c.pricing;
      const prod50 = c.costiFissi + c.costoPerStudente * pax50;
      const mktg50 = c.costiMktg;
      const marg50 = rev50 - prod50 - mktg50;
      const margPct50 = rev50 > 0 ? Math.round((marg50 / rev50) * 100) : 0;
      s50Rev += rev50; s50Prod += prod50; s50Mktg += mktg50;
      h += `<tr><td style="font-size:12px">${c.nome.substring(0, 30)}</td><td class="num">${pax50} / ${c.target}</td><td class="num" style="color:var(--green)">${fE(rev50)}</td><td class="num">${fE(prod50)}</td><td class="num">${fE(mktg50)}</td><td class="num" style="color:${marg50 >= 0 ? 'var(--green)' : 'var(--red)'}">${fE(marg50)}</td><td class="num" style="color:${margPct50 >= 0 ? 'var(--green)' : 'var(--red)'}">${margPct50}%</td></tr>`;
    }
    const s50N = s50Rev - s50Prod - s50Mktg;
    const s50P = s50Rev > 0 ? Math.round((s50N / s50Rev) * 100) : 0;
    h += `<tr class="row-tot"><td>TOTALE @50%</td><td class="num"></td><td class="num" style="color:var(--green)">${fE(s50Rev)}</td><td class="num">${fE(s50Prod)}</td><td class="num">${fE(s50Mktg)}</td><td class="num" style="color:${s50N >= 0 ? 'var(--green)' : 'var(--red)'}">${fE(s50N)}</td><td class="num" style="color:${s50P >= 0 ? 'var(--green)' : 'var(--red)'}">${s50P}%</td></tr>`;
    h += '</tbody></table></div>';

    h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    h += `<div><div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px">COSTI EVITABILI SE NESSUN CORSO FUTURO PARTE</div><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--green)">${fE(totFProd)}</div><div style="font-size:12px;color:var(--text2)">Costi produzione non ancora sostenuti</div></div>`;
    h += `<div><div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px">MKTG GIÀ SPESO SUI FUTURI (NON RECUPERABILE)</div><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--red)">${fE(totFMktg)}</div><div style="font-size:12px;color:var(--text2)">Sunk cost indipendente dalla partenza</div></div>`;
    h += '</div></div>';
  }
  ct.innerHTML = h;
}

export function attachPLHandlers() {
  const ct = $('pl-content');
  if (!ct) return;
  ct.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill[data-pl-filter]');
    if (!pill) return;
    state.plFilter = pill.dataset.plFilter;
    renderPL();
  });
}
