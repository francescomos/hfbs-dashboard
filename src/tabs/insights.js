import { state } from '../state.js';
import { SC, IF } from '../constants.js';
import { fE } from '../utils/format.js';
import { nP } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { getRealSpend } from '../data/helpers.js';

export function renderInsights(corsi) {
  const DL = state.DL;
  if (!DL) return;
  const allDeals = DL.Brevo_Deals || [];
  const ct = $('insights-content');

  const wonDeals = allDeals.filter((d) => d.stage === 'Closed Won');

  const convByProd = {};
  for (const d of wonDeals) {
    const s = (d.sigla || '').toUpperCase().split('-');
    if (s.length < 3) continue;
    const prod = nP(s[0]);
    const cr = new Date(d.createdAt);
    const cl = new Date(d.modifiedAt || d.closeDate);
    if (isNaN(cr) || isNaN(cl)) continue;
    const days = Math.max(0, Math.floor((cl - cr) / 864e5));
    if (!convByProd[prod]) convByProd[prod] = [];
    convByProd[prod].push(days);
  }

  const globalConvDays = wonDeals.length > 0
    ? wonDeals.reduce((s, d) => {
      const c = new Date(d.createdAt);
      const cl = new Date(d.modifiedAt || d.closeDate);
      if (isNaN(c) || isNaN(cl)) return s;
      return s + Math.max(0, Math.floor((cl - c) / 864e5));
    }, 0) / wonDeals.length
    : 0;

  const openStages = ['Booked', 'Interviewed', 'Negotiation', 'Contract pending', 'Rescheduled'];
  const openDeals = allDeals.filter((d) => openStages.includes(d.stage));
  const now = new Date();
  const ag = { u7: 0, d7: 0, d14: 0, o30: 0 };
  const staleDeals = [];
  for (const d of openDeals) {
    const cr = new Date(d.createdAt);
    if (isNaN(cr)) continue;
    const days = Math.floor((now - cr) / 864e5);
    if (days <= 7) ag.u7++;
    else if (days <= 14) ag.d7++;
    else if (days <= 30) ag.d14++;
    else ag.o30++;
    if (days > 14) staleDeals.push({ name: d.dealName || d.candidato || '', stage: d.stage, days, sigla: d.sigla });
  }
  staleDeals.sort((a, b) => b.days - a.days);

  const lostDeals = allDeals.filter((d) => d.stage === 'Closed Lost');
  const lostReasons = {};
  lostDeals.forEach((d) => {
    const r = d.lostReason || 'Non specificato';
    lostReasons[r] = (lostReasons[r] || 0) + 1;
  });
  const lrSorted = Object.entries(lostReasons).sort((a, b) => b[1] - a[1]);
  const lrMax = lrSorted.length > 0 ? lrSorted[0][1] : 1;

  const noShowDeals = allDeals.filter((d) => d.stage === 'No Show');
  const nsByCourse = {};
  noShowDeals.forEach((d) => {
    const s = (d.sigla || '').toUpperCase().split('-');
    if (s.length >= 3) {
      const k = s[0] + '-' + s[2];
      nsByCourse[k] = (nsByCourse[k] || 0) + 1;
    }
  });
  const nsSorted = Object.entries(nsByCourse).sort((a, b) => b[1] - a[1]);
  const nsMax = nsSorted.length > 0 ? nsSorted[0][1] : 1;

  const totRev = corsi.reduce((s, c) => s + c.revenueOA, 0);
  const totCost = corsi.filter((c) => c.iscrittiOA > 0).reduce((s, c) => s + c.costiTotali, 0);
  const realMktgInsights = getRealSpend();
  const marginPct = totRev > 0 ? Math.round(((totRev - totCost - realMktgInsights) / totRev) * 100) : 0;
  const totCol = corsi.reduce((s, c) => s + c.calAll, 0);
  const costPerCol = totCol > 0 ? Math.round(realMktgInsights / totCol) : 0;

  let h = '<div class="kpi-row" style="margin-bottom:24px">'
    + `<div class="kpi"><div class="kpi-label">Tempo medio conv.</div><div class="kpi-value" style="color:var(--blue)">${Math.round(globalConvDays)}<span style="font-size:14px;color:var(--text3)"> gg</span></div><div class="kpi-sub">${wonDeals.length} deal Closed Won</div></div>`
    + `<div class="kpi"><div class="kpi-label">Deal fermi &gt;30gg</div><div class="kpi-value" style="color:${ag.o30 > 5 ? 'var(--red)' : 'var(--amber)'}">${ag.o30}</div><div class="kpi-sub">Si raffreddano senza follow-up</div></div>`
    + `<div class="kpi"><div class="kpi-label">Closed Lost</div><div class="kpi-value" style="color:var(--red)">${lostDeals.length}</div><div class="kpi-sub">Deal persi totali</div></div>`
    + `<div class="kpi"><div class="kpi-label">No Show</div><div class="kpi-value" style="color:var(--amber)">${noShowDeals.length}</div><div class="kpi-sub">Colloqui mancati</div></div>`
    + `<div class="kpi"><div class="kpi-label">Costo per Colloquio</div><div class="kpi-value" style="color:var(--purple)">${fE(costPerCol)}</div><div class="kpi-sub">Budget speso ÷ colloqui</div></div>`
    + `<div class="kpi"><div class="kpi-label">Margine medio</div><div class="kpi-value" style="color:${marginPct >= 0 ? 'var(--green)' : 'var(--red)'}">${marginPct}%</div><div class="kpi-sub">${fE(totRev)} rev — ${fE(totCost)} costi</div></div>`
    + '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';

  const convEntries = Object.entries(convByProd).map(([p, days]) => [p, Math.round(days.reduce((a, b) => a + b, 0) / days.length), days.length]).sort((a, b) => a[1] - b[1]);
  const convMax = convEntries.length > 0 ? Math.max(...convEntries.map((e) => e[1]), 1) : 1;

  h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">Tempo conversione per prodotto</div>';
  if (convEntries.length > 0) {
    convEntries.forEach(([p, avg]) => {
      const col = avg <= 14 ? 'var(--green)' : avg <= 30 ? 'var(--amber)' : 'var(--red)';
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-family:var(--mono);font-size:12px;font-weight:600;min-width:50px">${p}</span><div style="flex:1;height:8px;background:var(--border-l);border-radius:4px"><div style="height:100%;width:${Math.round((avg / convMax) * 100)}%;background:${col};border-radius:4px"></div></div><span style="font-family:var(--mono);font-size:12px;font-weight:700;min-width:40px;text-align:right">${avg}gg</span></div>`;
    });
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessun deal Closed Won</div>';
  }
  h += '</div>';

  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">Aging deal aperti</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px"><div style="text-align:center;padding:12px;background:var(--bg);border-radius:var(--radius-sm)"><div style="font-family:var(--mono);font-size:24px;font-weight:700;color:var(--green)">${ag.u7}</div><div style="font-size:11px;color:var(--text3)">0-7 gg</div></div><div style="text-align:center;padding:12px;background:var(--bg);border-radius:var(--radius-sm)"><div style="font-family:var(--mono);font-size:24px;font-weight:700;color:var(--amber)">${ag.d7}</div><div style="font-size:11px;color:var(--text3)">8-14 gg</div></div><div style="text-align:center;padding:12px;background:var(--bg);border-radius:var(--radius-sm)"><div style="font-family:var(--mono);font-size:24px;font-weight:700;color:var(--amber)">${ag.d14}</div><div style="font-size:11px;color:var(--text3)">15-30 gg</div></div><div style="text-align:center;padding:12px;background:var(--bg);border-radius:var(--radius-sm)"><div style="font-family:var(--mono);font-size:24px;font-weight:700;color:var(--red)">${ag.o30}</div><div style="font-size:11px;color:var(--text3)">&gt;30 gg</div></div></div>`;
  if (staleDeals.length > 0) {
    h += '<div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px">DEAL FERMI &gt;14 GIORNI</div>';
    staleDeals.slice(0, 10).forEach((d) => {
      h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px"><span style="font-family:var(--mono);font-weight:700;min-width:36px;text-align:right;color:${d.days > 30 ? 'var(--red)' : 'var(--amber)'}">${d.days}gg</span><span class="stage-badge" style="background:${SC[d.stage] || '#9ca3af'};font-size:10px">${d.stage}</span><span style="flex:1;color:var(--text2)">${d.name}</span></div>`;
    });
  }
  h += '</div>';

  h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">Motivi di perdita deal</div>';
  if (lrSorted.length > 0) {
    lrSorted.forEach(([r, c]) => {
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-size:12px;min-width:120px;color:var(--text2)">${r}</span><div style="flex:1;height:8px;background:var(--border-l);border-radius:4px"><div style="height:100%;width:${Math.round((c / lrMax) * 100)}%;background:var(--red);border-radius:4px"></div></div><span style="font-family:var(--mono);font-size:12px;font-weight:700;min-width:24px;text-align:right">${c}</span></div>`;
    });
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessun dato lost reason</div>';
  }
  h += '</div>';

  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">No Show per corso</div><div style="font-size:13px;color:var(--text2);margin-bottom:10px">${noShowDeals.length} no show totali</div>`;
  if (nsSorted.length > 0) {
    nsSorted.forEach(([k, c]) => {
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-family:var(--mono);font-size:12px;font-weight:600;min-width:80px">${k}</span><div style="flex:1;height:8px;background:var(--border-l);border-radius:4px"><div style="height:100%;width:${Math.round((c / nsMax) * 100)}%;background:var(--amber);border-radius:4px"></div></div><span style="font-family:var(--mono);font-size:12px;font-weight:700;min-width:24px;text-align:right">${c}</span></div>`;
    });
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessun No Show</div>';
  }
  h += '</div></div>';

  // Marginalità per corso
  const margCorsi = corsi.filter((c) => c.costiTotali > 0 || c.revenueOA > 0 || c.mktgPaid > 0);
  if (margCorsi.length > 0) {
    const byNome = {};
    for (const c of margCorsi) {
      if (!byNome[c.nome]) byNome[c.nome] = [];
      byNome[c.nome].push(c);
    }
    const colDel = (pct) => (pct > 50 ? 'cell-bad' : pct < 30 ? 'cell-good' : '');
    const colM = (n) => (n >= 0 ? 'cell-good' : 'cell-bad');
    h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px"><div class="prod-section-title">Marginalità per corso</div><table class="mtable"><thead><tr><th>Corso</th><th>Ed.</th><th class="num">Revenue</th><th class="num">Delivery</th><th class="num">% Del</th><th class="num">Mktg</th><th class="num">% Mktg</th><th class="num">Netto</th><th class="num">% Netto</th></tr></thead><tbody>';
    let gR = 0, gD = 0, gM = 0;
    for (const [nomeCor, eds] of Object.entries(byNome).sort()) {
      let cR = 0, cD = 0, cM = 0;
      for (const c of eds.sort((a, b) => (a.intake || '').localeCompare(b.intake || ''))) {
        const del = c.costiTotali;
        const mktg = c.mktgPaid || 0;
        const dP = c.revenueOA > 0 ? Math.round((del / c.revenueOA) * 100) : 0;
        const mP = c.revenueOA > 0 ? Math.round((mktg / c.revenueOA) * 100) : 0;
        const netto = c.revenueOA - del - mktg;
        const nP2 = c.revenueOA > 0 ? Math.round((netto / c.revenueOA) * 100) : 0;
        cR += c.revenueOA; cD += del; cM += mktg;
        h += `<tr><td style="font-size:12px">${nomeCor.substring(0, 25)}</td><td style="font-family:var(--mono);font-size:11px">${IF[c.intake] || c.intake}</td><td class="num" style="color:var(--green)">${fE(c.revenueOA)}</td><td class="num">${fE(del)}</td><td class="num ${colDel(dP)}">${dP}%</td><td class="num">${fE(mktg)}</td><td class="num">${mP}%</td><td class="num ${colM(netto)}">${fE(netto)}</td><td class="num ${colM(netto)}">${nP2}%</td></tr>`;
      }
      gR += cR; gD += cD; gM += cM;
      if (eds.length > 1) {
        const cn = cR - cD;
        const cnM = cn - cM;
        const cDP = cR > 0 ? Math.round((cD / cR) * 100) : 0;
        h += `<tr class="row-sub"><td colspan="2" style="font-size:11px">Sub. ${nomeCor.substring(0, 15)}</td><td class="num" style="color:var(--green)">${fE(cR)}</td><td class="num">${fE(cD)}</td><td class="num ${colDel(cDP)}">${cDP}%</td><td class="num">${fE(cM)}</td><td class="num">—</td><td class="num ${colM(cnM)}">${fE(cnM)}</td><td class="num ${colM(cnM)}">${cR > 0 ? Math.round((cnM / cR) * 100) : 0}%</td></tr>`;
      }
    }
    // campagne generiche
    let unmatchedMktg = 0;
    (DL.Meta_Campaigns || []).forEach((mc) => {
      const s = (mc.sigle || '').split(',').filter(Boolean);
      let matched = false;
      for (const sig of s) if (corsi.some((c) => c.prod === nP(sig))) { matched = true; break; }
      if (!matched && (parseFloat(mc.spend) || 0) > 0) unmatchedMktg += parseFloat(mc.spend) || 0;
    });
    (DL.GAds_Campaigns || []).forEach((gc) => {
      const s = (gc.sigle || '').split(',').filter(Boolean);
      let matched = false;
      for (const sig of s) if (corsi.some((c) => c.prod === nP(sig))) { matched = true; break; }
      if (!matched && (parseFloat(gc.cost) || 0) > 0) unmatchedMktg += parseFloat(gc.cost) || 0;
    });
    if (unmatchedMktg > 0) {
      gM += unmatchedMktg;
      h += `<tr style="background:var(--amber-l)"><td colspan="2" style="font-size:12px;font-style:italic">⚠ Campagne generiche</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num" style="font-weight:700">${fE(unmatchedMktg)}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`;
    }
    const gN = gR - gD - gM;
    const gDP = gR > 0 ? Math.round((gD / gR) * 100) : 0;
    const gNP = gR > 0 ? Math.round((gN / gR) * 100) : 0;
    h += `<tr class="row-tot"><td colspan="2">TOTALE</td><td class="num" style="color:var(--green)">${fE(gR)}</td><td class="num">${fE(gD)}</td><td class="num ${colDel(gDP)}">${gDP}%</td><td class="num">${fE(gM)}</td><td class="num">—</td><td class="num ${colM(gN)}">${fE(gN)}</td><td class="num ${colM(gN)}">${gNP}%</td></tr>`;
    h += '</tbody></table></div>';
  }
  ct.innerHTML = h;
}
