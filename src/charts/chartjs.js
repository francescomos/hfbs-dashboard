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

function getChart() {
  return window.Chart;
}

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
  amber: '#fcd34d', amber2: '#f5bc2a', amberDeep: '#a07502',
  sky: '#93c5fd', skyDeep: '#2563eb',
  pink: '#f9a8d4',
  alert: '#ef4444', alert2: '#dc2626',
  ink: '#1f2937', ink2: '#475569', ink3: '#64748b', ink4: '#94a3b8',
  line: '#ecebf2',
};

const CHART_COLORS = [P.brand, P.mint2, P.peach2, P.sky, P.pink, P.amber2];

/**
 * Trend revenue cumulata settimanale (costruita dai Brevo_Deals Closed Won per data di chiusura,
 * oppure stima dai Config_Corsi+OA_Summary quando non disponibile).
 */
export function drawRevenueTrend(canvasId, corsi, DL) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  // Costruisci curve mensili fino ad oggi
  const deals = (DL.Brevo_Deals || []).filter((d) => d.stage === 'Closed Won' && (d.modifiedAt || d.closeDate));
  const now = new Date();
  const year = now.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i); // 0..11
  const monthLabels = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const byMonth = months.map(() => 0);

  for (const d of deals) {
    const dt = new Date(d.modifiedAt || d.closeDate);
    if (isNaN(dt) || dt.getFullYear() !== year) continue;
    const m = dt.getMonth();
    const amount = parseFloat(d.amount || d.value || 0) || 0;
    byMonth[m] += amount;
  }

  const curMonth = now.getMonth();
  // Se non c'è amount nei deal, fallback: distribuiamo revenueOA in modo cumulativo fino a oggi
  const hasAmount = byMonth.reduce((s, v) => s + v, 0) > 0;
  const totalRev = corsi.reduce((s, c) => s + c.revenueOA, 0);
  const totalTarget = corsi.reduce((s, c) => s + c.revTarget, 0);

  // Curva cumulata
  let real = [];
  let cumul = 0;
  for (let i = 0; i <= curMonth; i++) {
    cumul += hasAmount ? byMonth[i] : (totalRev * (i + 1) / (curMonth + 1) - cumul);
    real.push(Math.round(cumul));
  }
  for (let i = curMonth + 1; i < 12; i++) real.push(null);

  // Target cumulato lineare (stagionalità approssimata)
  const curve = [0.03, 0.07, 0.12, 0.18, 0.26, 0.34, 0.42, 0.51, 0.62, 0.73, 0.86, 1.0];
  const target = curve.map((p) => Math.round(totalTarget * p));

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [
        { label: 'Target', data: target, borderColor: P.ink4, backgroundColor: 'transparent', borderDash: [6, 4], borderWidth: 1.5, tension: .4, pointRadius: 0, pointHoverRadius: 0 },
        {
          label: 'Revenue reale', data: real, borderColor: P.brand,
          backgroundColor: (c) => {
            const { ctx, chartArea } = c.chart;
            if (!chartArea) return null;
            const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, 'rgba(45,105,101,.35)');
            g.addColorStop(1, 'rgba(45,105,101,0)');
            return g;
          },
          borderWidth: 3, tension: .42, fill: true,
          pointRadius: (c) => (c.dataIndex === curMonth ? 5 : 0),
          pointBackgroundColor: P.brand, pointBorderColor: '#fff', pointBorderWidth: 2,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: P.ink3 } },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fEk(ctx.parsed.y || 0) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 } } },
        y: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 }, callback: (v) => fEk(v) } },
      },
    },
  });
}

/** Donut iscritti per intake */
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

/** Funnel orizzontale attesi vs reali */
export function drawFunnelChart(canvasId, corsi) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const a = corsi.reduce((acc, c) => ({
    lead: acc.lead + Math.round(c.leadAttesi || c.target * 6),
    coll: acc.coll + Math.round(c.colloquiAttesi || c.target * 2.2),
    contr: acc.contr + Math.round(c.colloquiAttesi * 0.5 || c.target * 1.1),
    iscr: acc.iscr + Math.round(parseFloat(c.iscrittiAttesi) || c.target),
  }), { lead: 0, coll: 0, contr: 0, iscr: 0 });
  const r = corsi.reduce((acc, c) => ({
    lead: acc.lead + c.gfCount + c.brevoDeals.length,
    coll: acc.coll + c.calAll,
    contr: acc.contr + (c.brevoStages?.['Contract pending'] || 0) + c.brevoWon,
    iscr: acc.iscr + c.iscrittiOA,
  }), { lead: 0, coll: 0, contr: 0, iscr: 0 });

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Lead', 'Colloqui', 'Contratti', 'Iscritti'],
      datasets: [
        { label: 'Attesi', data: [a.lead, a.coll, a.contr, a.iscr], backgroundColor: P.brandL, borderColor: P.brand, borderWidth: 1.5, borderRadius: 10, barPercentage: .7, categoryPercentage: .75 },
        { label: 'Reali', data: [r.lead, r.coll, r.contr, r.iscr], backgroundColor: P.brand, borderRadius: 10, barPercentage: .7, categoryPercentage: .75 },
      ],
    },
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
}

/** Donut canali */
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

/** Bar revenue per edizione (reale vs target) */
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

/** Performance estreme (top 3 vs bottom 3 pctTarget) */
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

/** Bar tempo conversione per prodotto */
export function drawConvChart(canvasId, entries) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  const rows = entries.slice(0, 12);
  const colors = rows.map(([, v]) => (v <= 14 ? P.mint2 : v <= 30 ? P.amber2 : P.alert));

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: rows.map((r) => r[0]),
      datasets: [{ data: rows.map((r) => r[1]), backgroundColor: colors, borderRadius: 8, barPercentage: .8 }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10, callbacks: { label: (ctx) => ctx.parsed.x + ' gg' } },
      },
      scales: {
        x: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 }, callback: (v) => v + 'gg' } },
        y: { grid: { display: false }, ticks: { color: P.ink2, font: { family: "'JetBrains Mono'", size: 11, weight: '600' } } },
      },
    },
  });
}

/** Bar motivi perdita deal */
export function drawLostChart(canvasId, lostReasons) {
  const C = getChart();
  if (!C) return;
  applyGlobalDefaults();
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;

  INSTANCES[canvasId] = new C(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: lostReasons.map((r) => r[0]),
      datasets: [{
        data: lostReasons.map((r) => r[1]),
        backgroundColor: ['#fca5a5', '#fdba74', '#fcd34d', '#a7f3d0', '#bfdbfe', '#c4b5fd', '#f9a8d4'].slice(0, lostReasons.length),
        borderRadius: 8, barPercentage: .75,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: P.ink, padding: 10, cornerRadius: 10 } },
      scales: {
        x: { grid: { color: P.line }, ticks: { color: P.ink4, font: { family: "'JetBrains Mono'", size: 10 } } },
        y: { grid: { display: false }, ticks: { color: P.ink2, font: { size: 11, weight: '600' } } },
      },
    },
  });
}
