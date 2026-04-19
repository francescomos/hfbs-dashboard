import { state } from '../state.js';
import { IF, IS, INTAKE_ORDER_PANORAMICA } from '../constants.js';
import { fE, fEk, fD } from '../utils/format.js';
import { dTS, cSt, bC } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';
import { getRealSpend, getActiveCampaignCount } from '../data/helpers.js';

export function renderFilters(corsi) {
  const ii = [...new Set(corsi.map((x) => x.edizione).filter(Boolean))];
  ii.sort((a, b) => {
    const ia = INTAKE_ORDER_PANORAMICA.indexOf(a);
    const ib = INTAKE_ORDER_PANORAMICA.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  $('filters').innerHTML =
    '<div class="filter-pill active" data-filter="all">Tutti</div>'
    + ii.map((i) => `<div class="filter-pill" data-filter="${i}">${IF[IS[i]] || i}</div>`).join('');
}

export function setFilter(filter, el) {
  state.filter = filter;
  document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderPanoramica(buildCorsi());
}

export function setSort(key) {
  state.sortBy = state.sortBy === key ? null : key;
  document.querySelectorAll('.kpi').forEach((x) => x.classList.toggle('active-sort', x.dataset.sort === state.sortBy));
  renderPanoramica(buildCorsi());
}

export function renderPanoramica(corsi) {
  const f = state.filter;
  const v = f === 'all' ? corsi : corsi.filter((c) => c.edizione === f);

  const ti = v.reduce((s, c) => s + c.iscrittiOA, 0);
  const tt = v.reduce((s, c) => s + c.target, 0);
  const tr = v.reduce((s, c) => s + c.revenueOA, 0);
  const trt = v.reduce((s, c) => s + c.revTarget, 0);
  const tgf = v.reduce((s, c) => s + c.gfCount, 0);
  const tbr = v.reduce((s, c) => s + c.brevoDeals.length, 0);
  const tc = v.reduce((s, c) => s + c.calAll, 0);
  const tcp = v.reduce((s, c) => s + c.calPast, 0);
  const tcf = v.reduce((s, c) => s + c.calFuture, 0);
  const pt = tt > 0 ? Math.round((ti / tt) * 100) : 0;
  const rp = trt > 0 ? Math.round((tr / trt) * 100) : 0;
  const realMktgCost = getRealSpend();
  const zr = v.filter((c) => c.pctTarget < 70 && dTS(c) > 0 && dTS(c) <= 45);

  $('kpi-row').innerHTML =
    `<div class="kpi" data-sort="iscritti"><div class="kpi-label">Iscritti (O&A)</div><div class="kpi-value" style="color:var(--green)">${ti}</div><div class="kpi-sub">Target: ${tt} — ${pt}%</div></div>`
    + `<div class="kpi" data-sort="revenue"><div class="kpi-label">Revenue (O&A)</div><div class="kpi-value">${fE(tr)}</div><div class="kpi-sub">${fEk(trt)} tgt — ${rp}%</div></div>`
    + `<div class="kpi" data-sort="candidature"><div class="kpi-label">Candidature (GF+BR)</div><div class="kpi-value">${tgf + tbr}</div><div class="kpi-sub">Form: ${tgf} — Brevo: ${tbr}</div></div>`
    + `<div class="kpi" data-sort="colloqui"><div class="kpi-label">Colloqui (Calendly)</div><div class="kpi-value" style="color:var(--purple)">${tc}</div><div class="kpi-sub">Passati: ${tcp} — Futuri: ${tcf}</div></div>`
    + `<div class="kpi" data-sort="mktg"><div class="kpi-label">Speso Marketing</div><div class="kpi-value">${fEk(realMktgCost)}</div><div class="kpi-sub">Meta+GAds campaigns</div></div>`
    + `<div class="kpi" data-sort="zonarossa"><div class="kpi-label">Zona rossa</div><div class="kpi-value" style="color:${zr.length > 0 ? 'var(--red)' : 'var(--green)'}">${zr.length}</div><div class="kpi-sub">&lt;45gg e &lt;70% target</div></div>`;

  // Reflect active-sort
  document.querySelectorAll('.kpi').forEach((x) => x.classList.toggle('active-sort', x.dataset.sort === state.sortBy));

  let sorted = [...v];
  if (state.sortBy === 'iscritti') sorted.sort((a, b) => b.iscrittiOA - a.iscrittiOA);
  else if (state.sortBy === 'revenue') sorted.sort((a, b) => b.revenueOA - a.revenueOA);
  else if (state.sortBy === 'candidature') sorted.sort((a, b) => (b.gfCount + b.brevoDeals.length) - (a.gfCount + a.brevoDeals.length));
  else if (state.sortBy === 'colloqui') sorted.sort((a, b) => b.calAll - a.calAll);
  else if (state.sortBy === 'attivi') sorted = sorted.filter((c) => { const s = cSt(c); return s === 'selling' || s === 'active'; });
  else if (state.sortBy === 'zonarossa') sorted = sorted.filter((c) => c.pctTarget < 70 && dTS(c) > 0 && dTS(c) <= 45);
  else sorted.sort((a, b) => {
    const az = a.pctTarget < 70 && dTS(a) > 0 && dTS(a) <= 45;
    const bz = b.pctTarget < 70 && dTS(b) > 0 && dTS(b) <= 45;
    if (az !== bz) return az ? -1 : 1;
    return a.pctTarget - b.pctTarget;
  });

  const grid = $('corso-grid');
  if (!sorted.length) {
    grid.innerHTML = '<div class="empty-state"><h3>Nessun corso</h3></div>';
    return;
  }
  grid.innerHTML = sorted.map((c) => {
    const days = dTS(c);
    const isZR = c.pctTarget < 70 && days > 0 && days <= 45;
    const color = bC(c.pctTarget);
    const il = IF[c.intake] || c.edizione || c.intake;
    const sd = c.startDate ? fD(c.startDate) : '';
    const dOk = c.iscrittiOA > 0 || c.target > 0;

    const bePrice = c.pricing > 0 ? c.pricing - (c.costoPerStudente || 0) : 0;
    const beStudents = bePrice > 0 && c.costiFissi > 0 ? Math.ceil(c.costiFissi / bePrice) : 0;
    const bePct = c.target > 0 && beStudents > 0 ? Math.round((beStudents / c.target) * 100) : -1;

    const fs = [
      { l: 'Candidature', v: c.gfCount + c.brevoDeals.length, c: 'var(--blue)' },
      { l: 'Colloqui', v: c.calAll, c: 'var(--purple)' },
      { l: 'Won', v: c.brevoWon, c: 'var(--hfarm)' },
      { l: 'Iscritti', v: c.iscrittiOA, c: 'var(--green)' },
    ];
    const fm = Math.max(...fs.map((s) => s.v), 1);
    const hasFunnel = fs.some((s) => s.v > 0);

    const rl = c.revenueOA > 0 || c.revTarget > 0
      ? `<div class="rev-line"><b>${fE(c.revenueOA)}</b> / ${fEk(c.revTarget)}${c.revTarget > 0 ? ' — ' + Math.round((c.revenueOA / c.revTarget) * 100) + '%' : ''}</div>`
      : '';

    const stInfo = cSt(c);
    const stL = stInfo === 'selling' ? 'In vendita' : stInfo === 'active' ? 'In corso' : 'Concluso';
    const stC = stInfo === 'selling' ? 'ed-status-selling' : stInfo === 'active' ? 'ed-status-active' : 'ed-status-done';

    const ac = getActiveCampaignCount(c.prod);
    const campBadge = ac > 0 ? `<span class="corso-tag" style="background:#dbeafe;color:#1d4ed8">${ac} mktg</span>` : '';
    const dataBadge = dOk ? '<span class="corso-tag tag-ok">Dati OK</span>' : '<span class="corso-tag tag-warn">Dati mancanti</span>';

    return `<div class="corso-card ${isZR ? 'zona-rossa' : ''}" style="border-left-color:${color}">`
      + `<div class="corso-name">${c.nome}</div>`
      + (isZR ? `<div class="corso-zr">⚑ ZONA ROSSA — ${days}gg al via - ${c.pctTarget}% target</div>` : '')
      + `<div class="corso-meta"><span class="corso-tag tag-intake">${il}</span><span class="corso-tag tag-tipo">${c.tipo || ''}</span><span class="corso-tag ${stC}">${stL}</span>${campBadge}${dataBadge}</div>`
      + `<div class="corso-date">${sd ? sd + ' — ' : ''}${days > 0 ? `<b>${days}gg al via</b>` : days === 0 ? '<b>Oggi</b>' : '<b>In corso</b>'}${c.pricing > 0 ? `  |  <span style="font-family:var(--mono);font-weight:600">${fE(c.pricing)}/persona</span>` : ''}</div>`
      + `<div class="prog"><div class="prog-top"><span class="prog-label">Iscritti (O&A)</span><div class="prog-nums"><span class="prog-iscritti" style="color:${color}">${c.iscrittiOA}</span><span class="prog-target">/ ${c.target}</span><span class="prog-pct" style="color:${color}">${c.pctTarget}%</span></div></div>`
      + `<div class="prog-bar"><div class="prog-fill" style="width:${Math.min(c.pctTarget, 100)}%;background:${color}"></div>${bePct > 0 && bePct <= 100 ? `<div class="prog-marker" style="left:${bePct}%" title="Breakeven: ${beStudents} studenti"></div>` : ''}</div></div>`
      + rl
      + (hasFunnel ? '<div class="funnel" style="height:48px;margin:8px 0 4px">'
        + fs.map((s, i) => {
          const h = Math.max(3, Math.round((s.v / fm) * 36));
          const p = i > 0 && fs[i - 1].v > 0 ? Math.round((s.v / fs[i - 1].v) * 100) + '%' : '';
          return `<div class="funnel-step"><div class="funnel-bar" style="height:${h}px;background:${s.c}"></div><div class="funnel-info"><span class="funnel-num" style="font-size:13px">${s.v}${p ? ' — ' + p : ''}</span></div><div class="funnel-lbl" style="font-size:9px">${s.l}</div></div>`;
        }).join('')
        + '</div>' : '')
      + '</div>';
  }).join('');
}

export function attachPanoramicaHandlers() {
  const filtersEl = $('filters');
  if (filtersEl) {
    filtersEl.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      setFilter(pill.dataset.filter, pill);
    });
  }
  const kpiRow = $('kpi-row');
  if (kpiRow) {
    kpiRow.addEventListener('click', (e) => {
      const kpi = e.target.closest('.kpi');
      if (!kpi || !kpi.dataset.sort) return;
      setSort(kpi.dataset.sort);
    });
  }
}
