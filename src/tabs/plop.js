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

  // Jakala + B2G da OP_Revenue. pctProduzione/pctMarketing sono letti ESATTAMENTE:
  // se il datalake non li fornisce, i costi corrispondenti restano null (mostrati come "—").
  const opData = DL.OP_Revenue || [];
  const jkRow = opData.find((r) => r.canale === 'Jakala') || {};
  const b2gRow = opData.find((r) => r.canale === 'B2G') || {};

  const parseOrNull = (v) => (v === undefined || v === null || v === '' ? null : (parseFloat(v) || 0));

  const jkNumero = parseFloat(jkRow.numero) || 0;
  const jkRevenue = parseFloat(jkRow.revenue) || 0;
  const jkPctProd = parseOrNull(jkRow.pctProduzione);
  const jkPctMktg = parseOrNull(jkRow.pctMarketing);
  const jkProd = jkPctProd !== null ? jkRevenue * jkPctProd : null;
  const jkMktg = jkPctMktg !== null ? jkRevenue * jkPctMktg : null;
  const jkMargine = (jkProd !== null && jkMktg !== null) ? jkRevenue - jkProd - jkMktg : null;
  const jkMargPct = jkMargine !== null && jkRevenue > 0 ? Math.round((jkMargine / jkRevenue) * 100) : null;

  const b2gNumero = parseFloat(b2gRow.numero) || 0;
  const b2gRevenue = parseFloat(b2gRow.revenue) || 0;
  const b2gPctProd = parseOrNull(b2gRow.pctProduzione);
  const b2gPctMktg = parseOrNull(b2gRow.pctMarketing);
  const b2gProd = b2gPctProd !== null ? b2gRevenue * b2gPctProd : null;
  const b2gMktg = b2gPctMktg !== null ? b2gRevenue * b2gPctMktg : null;
  const b2gMargine = (b2gProd !== null && b2gMktg !== null) ? b2gRevenue - b2gProd - b2gMktg : null;
  const b2gMargPct = b2gMargine !== null && b2gRevenue > 0 ? Math.round((b2gMargine / b2gRevenue) * 100) : null;

  // Totali: si sommano solo le celle effettivamente disponibili.
  const sumOpt = (...xs) => xs.every((x) => x === null) ? null : xs.reduce((s, x) => s + (x || 0), 0);
  const totNumero = b2cIscritti + jkNumero + b2gNumero;
  const totRevenue = b2cRevenue + jkRevenue + b2gRevenue;
  const totProd = sumOpt(b2cProd, jkProd, b2gProd);
  const totMktg = sumOpt(b2cMktg, jkMktg, b2gMktg);
  const totMargine = (totProd !== null && totMktg !== null) ? totRevenue - totProd - totMktg : null;
  const totMargPct = totMargine !== null && totRevenue > 0 ? Math.round((totMargine / totRevenue) * 100) : null;

  let h = '';
  h += '<div class="kpi-row" style="margin-bottom:24px">';
  h += `<div class="kpi"><div class="kpi-label">Prodotti B2C</div><div class="kpi-value" style="color:var(--green)">${fE(b2cRevenue)}</div><div class="kpi-sub">${b2cIscritti} iscritti</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Jakala</div><div class="kpi-value" style="color:var(--blue)">${fE(jkRevenue)}</div><div class="kpi-sub">${jkNumero > 0 ? jkNumero + ' progetti' : 'Fonte: JAKALA/HFBS'}</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">B2G</div><div class="kpi-value" style="color:var(--purple)">${fE(b2gRevenue)}</div><div class="kpi-sub">Fonte: Dashboard ExEd</div></div>`;
  h += `<div class="kpi"><div class="kpi-label">Totale</div><div class="kpi-value" style="color:var(--hfarm)">${fE(totRevenue)}</div><div class="kpi-sub">Somma canali OP</div></div>`;
  h += '</div>';

  h += '<div style="overflow-x:auto"><table class="mtable" style="min-width:800px">';
  h += '<thead><tr style="background:#ddd8d0"><th style="color:var(--text1)">Canale</th><th class="num" style="color:var(--text1)">Numero</th><th class="num" style="color:var(--text1)">Revenue</th><th class="num" style="color:var(--text1)">Produzione</th><th class="num" style="color:var(--text1)">Marketing</th><th class="num" style="color:var(--text1)">Margine</th><th class="num" style="color:var(--text1)">Marg %</th></tr></thead><tbody>';

  const fCell = (v) => (v === null ? '<span style="color:var(--ink-4)">—</span>' : fE(v));
  const mkRow = (label, num, rev, prod, mktg, marg, margPct, color) => {
    const margCol = marg === null ? 'var(--ink-4)' : marg >= 0 ? 'var(--green)' : 'var(--red)';
    return `<tr><td style="font-weight:700;color:${color}">${label}</td>`
      + `<td class="num">${num}</td>`
      + `<td class="num" style="color:var(--green)">${fE(rev)}</td>`
      + `<td class="num">${fCell(prod)}</td>`
      + `<td class="num">${fCell(mktg)}</td>`
      + `<td class="num" style="color:${margCol};font-weight:700">${fCell(marg)}</td>`
      + `<td class="num" style="color:${margCol};font-weight:700">${margPct === null ? '—' : margPct + '%'}</td></tr>`;
  };

  h += mkRow('Prodotti B2C', b2cIscritti, b2cRevenue, b2cProd, b2cMktg, b2cMargine, b2cMargPct, 'var(--green)');
  h += mkRow('Jakala', jkNumero, jkRevenue, jkProd, jkMktg, jkMargine, jkMargPct, 'var(--blue)');
  h += mkRow('B2G', b2gNumero, b2gRevenue, b2gProd, b2gMktg, b2gMargine, b2gMargPct, 'var(--purple)');

  const totMargCol = totMargine === null ? 'var(--ink-4)' : totMargine >= 0 ? 'var(--green)' : 'var(--red)';
  h += `<tr class="row-tot"><td>TOTALE</td>`
    + `<td class="num">${totNumero}</td>`
    + `<td class="num" style="color:var(--green)">${fE(totRevenue)}</td>`
    + `<td class="num">${fCell(totProd)}</td>`
    + `<td class="num">${fCell(totMktg)}</td>`
    + `<td class="num" style="color:${totMargCol}">${fCell(totMargine)}</td>`
    + `<td class="num" style="color:${totMargCol}">${totMargPct === null ? '—' : totMargPct + '%'}</td></tr>`;

  h += '</tbody></table></div>';

  const jkMissing = jkPctProd === null && jkPctMktg === null;
  const b2gMissing = b2gPctProd === null && b2gPctMktg === null;

  h += '<div style="margin-top:16px;padding:14px 18px;background:var(--bg-3);border-radius:var(--r);font-size:12px;color:var(--ink-2);line-height:1.7;border:1px solid var(--line-l)">';
  h += '<b style="color:var(--ink)">Note sui calcoli:</b><br>';
  h += '• <b>Prodotti B2C</b>: aggregato della tab P&L Prodotti (revenue O&A, costi Budget_Prodotti, marketing Meta+GAds).<br>';
  h += `• <b>Jakala</b>: revenue e numero da <code>OP_Revenue[Jakala]</code>. Produzione/Marketing calcolati con <code>pctProduzione</code>/<code>pctMarketing</code> della riga${jkMissing ? ' <span style="color:var(--amber-deep)">⚠ non impostati → celle vuote</span>' : ''}.<br>`;
  h += `• <b>B2G</b>: revenue e numero da <code>OP_Revenue[B2G]</code>. Stesso criterio${b2gMissing ? ' <span style="color:var(--amber-deep)">⚠ non impostati → celle vuote</span>' : ''}.`;
  h += '</div>';

  ct.innerHTML = h;
}
