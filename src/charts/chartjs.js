import { IF } from '../constants.js';
import { fEk } from '../utils/format.js';

const INSTANCES = {};

export function destroyChart(id) {
  if (INSTANCES[id]) {
    try { INSTANCES[id].destroy(); } catch {}
    delete INSTANCES[id];
  }
}

export function destroyAllCharts() {
  for (const id of Object.keys(INSTANCES)) destroyChart(id);
}

const getChart = () => window.Chart;

function applyGlobalDefaults() {
  const C = getChart();
  if (!C) return;
  C.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
  C.defaults.color = '#64748b';
  C.defaults.borderColor = '#ecebf2';
}

const P = {
  brand: '#2d6965', brand2: '#134e48', brandL: '#d7ebe7',
  mint: '#7dd3c0', mint2: '#5dbfa8', mintL: '#d4f1ea',
  peach: '#fdba9d', peach2: '#fb9d7b',
  amber: '#fcd34d', amber2: '#f5bc2a',
  sky: '#93c5fd',
  pink: '#f9a8d4',
  alert: '#ef4444',
  ink: '#1f2937', ink2: '#475569', ink3: '#64748b', ink4: '#94a3b8',
  line: '#ecebf2',
};

const CHART_COLORS = [P.brand, P.mint2, P.peach2, P.sky, P.pink, P.amber2];

/**
 * Revenue reale vs target per intake.
 * Dato: aggregato diretto da corsi.revenueOA e corsi.revTarget per intake.
 * Zero fallback: se un intake ha target=0 o revenue=0, lo mostra a 0.
 */
export function drawRevenuePerIntake(canvasId, corsi, intakes) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const labels = intakes.map((i) => IF[i] || i);
  const real = intakes.map((i) => corsi.filter((c) => c.intake === i).reduce((s, c) => s + c.revenueOA, 0));
  const target = intakes.map((i) => corsi.filter((c) => c.intake === i).reduce((s, c) => s + c.revTarget, 0));

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Target', data: target, backgroundColor: P.brandL, borderRadius: 8, barPercentage: .7, categoryPercentage: .65 },
        { label: 'Reale', data: real, backgroundColor: P.brand, borderRadius: 8, barPercentage: .7, categoryPercentage: .65 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: P.ink2, padding: 14 } },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fEk(ctx.parsed.y || 0) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: P.ink3, font: { size: 11, weight: '600' } } },
        y: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 }, callback: (v) => fEk(v) } },
      },
    },
  });
}

/** Donut iscritti per intake (dato reale: somma iscrittiOA per intake). */
export function drawIntakeDonut(canvasId, corsi, intakes) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const data = intakes.map((i) => corsi.filter((c) => c.intake === i).reduce((s, c) => s + c.iscrittiOA, 0));

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: intakes.map((i) => IF[i] || i),
      datasets: [{ data, backgroundColor: CHART_COLORS.slice(0, intakes.length), borderColor: '#fff', borderWidth: 4, hoverOffset: 10 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: P.ink2, padding: 14 } },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.label + ': ' + ctx.parsed + ' iscritti' } },
      },
    },
  });
}

/**
 * Funnel orizzontale attesi vs reali.
 * "Attesi" letti SOLO da Mktg_ExEd (c.leadAttesi, c.colloquiAttesi, c.iscrittiAttesi).
 * Se nessuna edizione ha obiettivi impostati → hasExpected=false: il caller decide
 * se mostrare il chart (solo reali) o un messaggio.
 */
export function drawFunnelChart(canvasId, corsi) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const a = corsi.reduce((acc, c) => ({
    lead: acc.lead + (parseFloat(c.leadAttesi) || 0),
    coll: acc.coll + (parseFloat(c.colloquiAttesi) || 0),
    iscr: acc.iscr + (parseFloat(c.iscrittiAttesi) || 0),
  }), { lead: 0, coll: 0, iscr: 0 });
  const hasExpected = a.lead > 0 || a.coll > 0 || a.iscr > 0;

  const r = corsi.reduce((acc, c) => ({
    lead: acc.lead + c.gfCount + c.brevoDeals.length,
    coll: acc.coll + c.calAll,
    contr: acc.contr + (c.brevoStages?.['Contract pending'] || 0) + c.brevoWon,
    iscr: acc.iscr + c.iscrittiOA,
  }), { lead: 0, coll: 0, contr: 0, iscr: 0 });

  const labels = hasExpected ? ['Lead', 'Colloqui', 'Iscritti'] : ['Lead', 'Colloqui', 'Contratti', 'Iscritti'];
  const datasets = hasExpected
    ? [
      { label: 'Attesi (Mktg_ExEd)', data: [a.lead, a.coll, a.iscr], backgroundColor: P.brandL, borderColor: P.brand, borderWidth: 1.5, borderRadius: 10, barPercentage: .7, categoryPercentage: .75 },
      { label: 'Reali', data: [r.lead, r.coll, r.iscr], backgroundColor: P.brand, borderRadius: 10, barPercentage: .7, categoryPercentage: .75 },
    ]
    : [
      { label: 'Reali', data: [r.lead, r.coll, r.contr, r.iscr], backgroundColor: P.brand, borderRadius: 10, barPercentage: .7, categoryPercentage: .75 },
    ];

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: P.ink2, padding: 14 } },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10 },
      },
      scales: {
        x: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 } } },
        y: { grid: { display: false }, ticks: { color: P.ink2, font: { size: 12, weight: '600' } } },
      },
    },
  });

  return hasExpected;
}

export function drawChannelsDonut(canvasId, chKeys, chTot) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const activeKeys = chKeys.filter((k) => chTot[k] > 0);
  const COLS = { B2B: P.brand, B2C: P.mint, JAKALA: P.peach, REFERRAL: P.pink, PARTNER: P.sky, FREE: P.amber };

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: activeKeys,
      datasets: [{ data: activeKeys.map((k) => chTot[k]), backgroundColor: activeKeys.map((k) => COLS[k] || P.ink3), borderColor: '#fff', borderWidth: 4, hoverOffset: 10 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: P.ink2, padding: 10 } },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.label + ': ' + ctx.parsed + ' iscritti' } },
      },
    },
  });
}

export function drawRevPerEdition(canvasId, corsi) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: corsi.map((c) => IF[c.intake] || c.intake),
      datasets: [
        { label: 'Target', data: corsi.map((c) => c.revTarget), backgroundColor: P.brandL, borderRadius: 8, barPercentage: .7, categoryPercentage: .65 },
        { label: 'Reale', data: corsi.map((c) => c.revenueOA), backgroundColor: P.mint2, borderRadius: 8, barPercentage: .7, categoryPercentage: .65 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: P.ink2, padding: 14 } },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fEk(ctx.parsed.y || 0) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: P.ink3, font: { size: 11, weight: '600' } } },
        y: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 }, callback: (v) => fEk(v) } },
      },
    },
  });
}

export function drawPerfChart(canvasId, corsi) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const byPct = [...corsi]
    .filter((c) => c.iscrittiOA > 0 || c.target > 0)
    .sort((a, b) => b.pctTarget - a.pctTarget);
  const top3 = byPct.slice(0, 3);
  const bot3 = byPct.slice(-3).reverse();
  const items = [...top3.map((x) => ({ ...x, grp: 'top' })), ...bot3.map((x) => ({ ...x, grp: 'bot' }))];

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: items.map((x) => (x.nome.substring(0, 24) + (x.nome.length > 24 ? '…' : '')) + ' · ' + (IF[x.intake] || x.intake)),
      datasets: [{
        data: items.map((x) => x.pctTarget),
        backgroundColor: items.map((x) => (x.grp === 'top' ? P.mint2 : P.alert)),
        borderRadius: 8, barPercentage: .7,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.parsed.x + '% del target' } },
      },
      scales: {
        x: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 }, callback: (v) => v + '%' }, max: 140 },
        y: { grid: { display: false }, ticks: { color: P.ink2, font: { size: 10, weight: '600' }, autoSkip: false } },
      },
    },
  });
}
