import { state } from '../state.js';
import { fE } from '../utils/format.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';
import { plStatus, computeOrphanMktg } from './pl.js';

export function renderPLOP() {
  const DL = state.DL;
  if (!DL) return;
  const ct = $('plop-content');
  const corsi = buildCorsi();

  // Prodotti B2C (coerente con P&L Prodotti)
  const { orphanTotal } = computeOrphanMktg(corsi);

  const enriched = corsi.map((c) => {
    const st = plStatus(c);
    const partito = st === 'done' || st === 'active';
    return {
      ...c,
      st,
      partito,
      costiProd: partito ? c.costiTotali : 0,
      costiMktg: c.mktgPaid || 0,
    };
  });
  const b2cRevenue = enriched.reduce((s, c) => s + c.revenueOA, 0);
  const b2cProd = enriched.reduce((s, c) => s + c.costiProd, 0);
  const b2cMktg = enriched.reduce((s, c) => s + c.costiMktg, 0) + orphanTotal;
  const b2cIscritti = enriched.reduce((s, c) => s + c.iscrittiOA, 0);
  const b2cMargine = b2cRevenue - b2cProd - b2cMktg;
  const b2cMargPct = b2cRevenue > 0 ? Math.round((b2cMargine / b2cRevenue) * 100) : 0;

  // Jakala + B2G da OP_Revenue
  const opData = DL.OP_Revenue || [];
  const jkRow = opData.find((r) => r.canale === 'Jakala') || { numero: 0, revenue: 0, pctProduzione: 0.4, pctMarketing: 0 };
  const b2gRow = opData.find((r) => r.canale === 'B2G') || { numero: 0, revenue: 0, pctProduzione: 0.5, pctMarketing: 0 };

  const jkNumero = parseFloat(jkRow.numero) || 0;
  const jkRevenue = parseFloat(jkRow.revenue) || 0;
  const jkProd = jkRevenue * (parseFloat(jkRow.pctProduzione) || 0.4);
  const jkMktg = jkRevenue * (parseFloat(jkRow.pctMarketing) || 0);
  const jkMargine = jkRevenue - jkProd - jkMktg;
  const jkMargPct = jkRevenue > 0 ? Math.round((jkMargine / jkRevenue) * 100) : 0;

  const b2gNumero = parseFloat(b2gRow.numero) || 0;
  const b2gRevenue = parseFloat(b2gRow.revenue) || 0;
  const b2gProd = b2gRevenue * (parseFloat(b2gRow.pctProduzione) || 0.5);
  const b2gMktg = b2gRevenue * (parseFloat(b2gRow.pctMarketing) || 0);
  const b2gMargine = b2gRevenue - b2gProd - b2gMktg;
  const b2gMargPct = b2gRevenue > 0 ? Math.round((b2gMargine / b2gRevenue) * 100) : 0;

  const totNumero = b2cIscritti + jkNumero + b2gNumero;
  const totRevenue = b2cRevenue + jkRevenue + b2gRevenue;
  const totProd = b2cProd + jkProd + b2gProd;
  const totMktg = b2cMktg + jkMktg + b2gMktg;
  const totMargine = totRevenue - totProd - totMktg;
  const totMargPct = totRevenue > 0 ? Math.round((totMargine / totRevenue) * 100) : 0;

  let h = '';
  h += '<div class="kpi-row" style="margin-bottom:24px">';
  h += `<div class="kpi"><div class="kpi-label">Prodotti B2C</div><div class="kpi-value" style="color:var(--green)">${fE(b2cRevenue)}</div><div class="kpi-sub">${b2cIscritti} iscritti</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Jakala</div><div class="kpi-value" style="color:var(--blue)">${fE(jkRevenue)}</div><div class="kpi-sub">${jkNumero > 0 ? jkNumero + ' progetti' : 'Fonte: JAKALA/HFBS'}</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">B2G</div><div class="kpi-value" style="color:var(--purple)">${fE(b2gRevenue)}</div><div class="kpi-sub">Fonte: Dashboard ExEd</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Totale</div><div class="kpi-value" style="color:var(--hfarm)">${fE(totRevenue)}</div><div class="kpi-sub">Somma canali OP</div></div>`;
  h += '</div>';

  h += '<div style="overflow-x:auto"><table class="mtable" style="min-width:800px">';
  h += '<thead><tr style="background:#ddd8d0"><th style="color:var(--text1)">Canale</th><th class="num" style="color:var(--text1)">Numero</th><th class="num" style="color:var(--text1)">Revenue</th><th class="num" style="color:var(--text1)">Produzione</th><th class="num" style="color:var(--text1)">Marketing</th><th class="num" style="color:var(--text1)">Margine</th><th class="num" style="color:var(--text1)">Marg %</th></tr></thead><tbody>';

  const mkRow = (label, num, rev, prod, mktg, marg, margPct, color) => {
    const margCol = marg >= 0 ? 'var(--green)' : 'var(--red)';
    return `<tr><td style="font-weight:700;color:${color}">${label}</td>`
      + `<td class="num">${num}</td>`
      + `<td class="num" style="color:var(--green)">${fE(rev)}</td>`
      + `<td class="num">${fE(prod)}</td>`
      + `<td class="num">${fE(mktg)}</td>`
      + `<td class="num" style="color:${margCol};font-weight:700">${fE(marg)}</td>`
      + `<td class="num" style="color:${margCol};font-weight:700">${margPct}%</td></tr>`;
  };

  h += mkRow('Prodotti B2C', b2cIscritti, b2cRevenue, b2cProd, b2cMktg, b2cMargine, b2cMargPct, 'var(--green)');
  h += mkRow('Jakala', jkNumero, jkRevenue, jkProd, jkMktg, jkMargine, jkMargPct, 'var(--blue)');
  h += mkRow('B2G', b2gNumero, b2gRevenue, b2gProd, b2gMktg, b2gMargine, b2gMargPct, 'var(--purple)');

  const totMargCol = totMargine >= 0 ? 'var(--green)' : 'var(--red)';
  h += `<tr class="row-tot"><td>TOTALE</td>`
    + `<td class="num">${totNumero}</td>`
    + `<td class="num" style="color:var(--green)">${fE(totRevenue)}</td>`
    + `<td class="num">${fE(totProd)}</td>`
    + `<td class="num">${fE(totMktg)}</td>`
    + `<td class="num" style="color:${totMargCol}">${fE(totMargine)}</td>`
    + `<td class="num" style="color:${totMargCol}">${totMargPct}%</td></tr>`;

  h += '</tbody></table></div>';

  h += '<div style="margin-top:16px;padding:14px 18px;background:var(--bg);border-radius:var(--radius);font-size:12px;color:var(--text2);line-height:1.7">';
  h += '<b style="color:var(--text1)">Note sui calcoli:</b><br>';
  h += '• <b>Prodotti B2C</b>: dati aggregati della tab P&L Prodotti (revenue O&A, costi produzione Budget_Prodotti, marketing Meta+GAds)<br>';
  h += '• <b>Jakala</b>: numero e revenue da JAKALA/HFBS!TOTALI (B1 e B6) — produzione stimata al 40% della revenue, marketing 0<br>';
  h += '• <b>B2G</b>: revenue da 25/26 Dashboard ExEd!B2G!H16 — produzione stimata al 50% della revenue, marketing 0';
  h += '</div>';

  ct.innerHTML = h;
}
