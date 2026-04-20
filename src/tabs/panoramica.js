import { state } from '../state.js';
import { IF, IS, INTAKE_ORDER_PANORAMICA } from '../constants.js';
import { fE, fEk, fD } from '../utils/format.js';
import { dTS, cSt, bC } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';
import { getRealSpend, getActiveCampaignCount } from '../data/helpers.js';
import { buildSuggestions, suggestCardHTML } from '../data/insights.js';
import { drawRevenuePerIntake, drawIntakeDonut } from '../charts/chartjs.js';
import { ZR_PCT_TARGET, ZR_MAX_DAYS } from '../data/thresholds.js';

export function renderFilters(corsi) {
  const ii = [...new Set(corsi.map((x) => x.edizione).filter(Boolean))];
  ii.sort((a, b) => {
    const ia = INTAKE_ORDER_PANORAMICA.indexOf(a);
    const ib = INTAKE_ORDER_PANORAMICA.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const counts = {};
  corsi.forEach((c) => { counts[c.edizione] = (counts[c.edizione] || 0) + 1; });
  $('filters').innerHTML =
    `<span class="filter-label">Intake</span>`
    + `<button class="chip active" data-filter="all">Tutti <span class="cnt">${corsi.length}</span></button>`
    + ii.map((i) => `<button class="chip" data-filter="${i}">${IF[IS[i]] || i} <span class="cnt">${counts[i] || 0}</span></button>`).join('');
}

export function setSearch(q) {
  state.search = q || '';
  if (state.DL) renderPanoramica(buildCorsi());
}

export function setFilter(filter, el) {
  state.filter = filter;
  document.querySelectorAll('#filters .chip, #filters .filter-pill').forEach((p) => p.classList.remove('active'));
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
  const zr = v.filter((c) => c.pctTarget < ZR_PCT_TARGET && dTS(c) > 0 && dTS(c) <= ZR_MAX_DAYS);

  const kpis = [
    { k: 'iscritti', hero: 'hero-brand', lbl: 'Iscritti (O&A)', val: ti.toLocaleString('it-IT'), sub: `target ${tt} · ${pt}%`, tip: 'Iscritti ufficiali O&A (somma aggregata del file O&A).' },
    { k: 'revenue', hero: 'hero-mint', lbl: 'Revenue (O&A)', val: fEk(tr), sub: `${fEk(trt)} tgt · ${rp}%`, tip: 'Incasso reale aggregato (O&A Summary).' },
    { k: 'candidature', lbl: 'Candidature', val: (tgf + tbr).toLocaleString('it-IT'), sub: `${tgf} form · ${tbr} Brevo`, tip: 'Gravity Forms (candidatura) + deal Brevo totali.' },
    { k: 'colloqui', lbl: 'Colloqui', val: tc.toLocaleString('it-IT'), sub: `${tcp} fatti · ${tcf} futuri`, tip: 'Eventi Calendly totali. Include no-show e cancellati.' },
    { k: 'mktg', lbl: 'Speso Marketing', val: fEk(realMktgCost), sub: 'Meta+GAds campaigns', tip: 'Spend reale aggregato da Meta_Campaigns + GAds_Campaigns.' },
    { k: 'zonarossa', lbl: 'Zona rossa', val: zr.length, sub: zr.length > 0 ? 'richiedono azione' : 'nessuna', tip: 'Corsi <45gg al via e <70% target. Azione urgente.' },
  ];

  $('kpi-row').innerHTML = kpis.map((k) => {
    const hero = k.hero || '';
    return `<div class="kpi ${hero}" data-sort="${k.k}" data-tip="${k.tip}">`
      + `<div class="kpi-label">${k.lbl}<span class="info">i</span></div>`
      + `<div class="kpi-value">${k.val}</div>`
      + `<div class="kpi-sub">${k.sub}</div>`
      + '</div>';
  }).join('');

  document.querySelectorAll('.kpi').forEach((x) => x.classList.toggle('active-sort', x.dataset.sort === state.sortBy));

  // Suggerimenti automatici
  const suggestions = buildSuggestions();
  const sugWrap = $('suggestions-wrap');
  if (sugWrap) {
    let sugHtml = '';
    if (suggestions.length > 0) {
      sugHtml += `<div class="section"><div class="section-title"><span class="tt-left">Suggerimenti automatici</span><span class="tt-right">generati sui dati correnti</span></div>${suggestions.map(suggestCardHTML).join('')}</div>`;
    }
    // Chart grid: revenue per intake (reale vs target) + donut iscritti per intake
    const intakesForDonut = [...new Set(v.map((c) => c.intake).filter(Boolean))];
    if (v.length > 0) {
      sugHtml += `<div class="grid-2-1" style="margin-bottom:14px">`
        + `<div class="section" style="margin-bottom:0"><div class="section-title"><span class="tt-left">Revenue per intake</span><span class="tt-right">reale vs target · fonte O&A Summary</span></div><div class="chart-wrap h-260"><canvas id="chartRevIntake"></canvas></div></div>`
        + `<div class="section" style="margin-bottom:0"><div class="section-title"><span class="tt-left">Iscritti per intake</span><span class="tt-right">${ti} totali</span></div><div class="chart-wrap h-260"><canvas id="chartIntake"></canvas></div></div>`
        + `</div>`;
    }
    sugWrap.innerHTML = sugHtml;

    if (v.length > 0) {
      drawRevenuePerIntake('chartRevIntake', v, intakesForDonut);
      drawIntakeDonut('chartIntake', v, intakesForDonut);
    }
  }

  let sorted = [...v];
  if (state.sortBy === 'iscritti') sorted.sort((a, b) => b.iscrittiOA - a.iscrittiOA);
  else if (state.sortBy === 'revenue') sorted.sort((a, b) => b.revenueOA - a.revenueOA);
  else if (state.sortBy === 'candidature') sorted.sort((a, b) => (b.gfCount + b.brevoDeals.length) - (a.gfCount + a.brevoDeals.length));
  else if (state.sortBy === 'colloqui') sorted.sort((a, b) => b.calAll - a.calAll);
  else if (state.sortBy === 'attivi') sorted = sorted.filter((c) => { const s = cSt(c); return s === 'selling' || s === 'active'; });
  else if (state.sortBy === 'zonarossa') sorted = sorted.filter((c) => c.pctTarget < ZR_PCT_TARGET && dTS(c) > 0 && dTS(c) <= ZR_MAX_DAYS);
  else sorted.sort((a, b) => {
    const az = a.pctTarget < ZR_PCT_TARGET && dTS(a) > 0 && dTS(a) <= ZR_MAX_DAYS;
    const bz = b.pctTarget < ZR_PCT_TARGET && dTS(b) > 0 && dTS(b) <= ZR_MAX_DAYS;
    if (az !== bz) return az ? -1 : 1;
    return a.pctTarget - b.pctTarget;
  });

  // Search filter (apply on name and sigla)
  if (state.search) {
    const q = state.search.toLowerCase();
    sorted = sorted.filter((c) =>
      (c.nome || '').toLowerCase().includes(q)
      || (c.sig || '').toLowerCase().includes(q)
      || (c.prod || '').toLowerCase().includes(q));
  }

  const grid = $('corso-grid');
  if (!sorted.length) {
    grid.innerHTML = `<div class="empty-state"><h3>${state.search ? 'Nessun match per “' + state.search + '”' : 'Nessun corso'}</h3></div>`;
    return;
  }
  grid.innerHTML = sorted.map((c) => {
    const days = dTS(c);
    const isZR = c.pctTarget < ZR_PCT_TARGET && days > 0 && days <= ZR_MAX_DAYS;
    const color = bC(c.pctTarget);
    const il = IF[c.intake] || c.edizione || c.intake;
    const sd = c.startDate ? fD(c.startDate) : '';
    const dOk = c.iscrittiOA > 0 || c.target > 0;

    const bePrice = c.pricing > 0 ? c.pricing - (c.costoPerStudente || 0) : 0;
    const beStudents = bePrice > 0 && c.costiFissi > 0 ? Math.ceil(c.costiFissi / bePrice) : 0;
    const bePct = c.target > 0 && beStudents > 0 ? Math.round((beStudents / c.target) * 100) : -1;

    const fs = [
      { l: 'Candidature', v: c.gfCount + c.brevoDeals.length, c: 'var(--sky-2)' },
      { l: 'Colloqui', v: c.calAll, c: 'var(--brand)' },
      { l: 'Won', v: c.brevoWon, c: 'var(--mint-2)' },
      { l: 'Iscritti', v: c.iscrittiOA, c: 'var(--ink)' },
    ];
    const fm = Math.max(...fs.map((s) => s.v), 1);
    const hasFunnel = fs.some((s) => s.v > 0);

    const rl = c.revenueOA > 0 || c.revTarget > 0
      ? `<div class="rev-line">Revenue: <b>${fE(c.revenueOA)}</b> / ${fEk(c.revTarget)}${c.revTarget > 0 ? ' — ' + Math.round((c.revenueOA / c.revTarget) * 100) + '%' : ''}</div>`
      : '';

    const stInfo = cSt(c);
    const stL = stInfo === 'selling' ? 'In vendita' : stInfo === 'active' ? 'In corso' : 'Concluso';
    const stC = stInfo === 'selling' ? 'ed-status-selling' : stInfo === 'active' ? 'ed-status-active' : 'ed-status-done';

    const ac = getActiveCampaignCount(c.prod);
    const campBadge = ac > 0 ? `<span class="corso-tag" style="background:var(--sky-l);color:var(--sky-deep)">${ac} mktg</span>` : '';
    const dataBadge = dOk ? '<span class="corso-tag tag-ok">Dati OK</span>' : '<span class="corso-tag tag-warn">Dati mancanti</span>';

    return `<div class="corso-card ${isZR ? 'zona-rossa' : ''}" style="border-left-color:${color}">`
      + `<div class="corso-name">${c.nome}</div>`
      + (isZR ? `<div class="corso-zr">⚑ ZONA ROSSA — ${days}gg al via · ${c.pctTarget}% target</div>` : '')
      + `<div class="corso-meta"><span class="corso-tag tag-intake">${il}</span><span class="corso-tag tag-tipo">${c.tipo || ''}</span><span class="corso-tag ${stC}">${stL}</span>${campBadge}${dataBadge}</div>`
      + `<div class="corso-date">${sd ? sd + ' — ' : ''}${days > 0 ? `<b>${days}gg al via</b>` : days === 0 ? '<b>Oggi</b>' : '<b>In corso</b>'}${c.pricing > 0 ? `  |  <span style="font-family:var(--mono);font-weight:700;color:var(--ink)">${fE(c.pricing)}/persona</span>` : ''}</div>`
      + `<div class="prog"><div class="prog-top"><span class="prog-label">Iscritti (O&A)</span><div class="prog-nums"><span class="prog-iscritti" style="color:${color}">${c.iscrittiOA}</span><span class="prog-target">/ ${c.target}</span><span class="prog-pct" style="background:${color}">${c.pctTarget}%</span></div></div>`
      + `<div class="prog-bar"><div class="prog-fill" style="width:${Math.min(c.pctTarget, 100)}%;background:${color}"></div>${bePct > 0 && bePct <= 100 ? `<div class="prog-marker" style="left:${bePct}%" title="Breakeven: ${beStudents} studenti"></div>` : ''}</div></div>`
      + rl
      + (hasFunnel ? '<div class="funnel" style="height:48px;margin:8px 0 4px">'
        + fs.map((s, i) => {
          const h = Math.max(3, Math.round((s.v / fm) * 36));
          const p = i > 0 && fs[i - 1].v > 0 ? Math.round((s.v / fs[i - 1].v) * 100) + '%' : '';
          return `<div class="funnel-step"><div class="funnel-bar" style="height:${h}px;background:${s.c}"></div><div class="funnel-info"><span class="funnel-num" style="font-size:12px">${s.v}${p ? ' · ' + p : ''}</span></div><div class="funnel-lbl" style="font-size:9px">${s.l}</div></div>`;
        }).join('')
        + '</div>' : '')
      + '</div>';
  }).join('');
}

export function attachPanoramicaHandlers() {
  const filtersEl = $('filters');
  if (filtersEl) {
    filtersEl.addEventListener('click', (e) => {
      const pill = e.target.closest('.chip, .filter-pill');
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
