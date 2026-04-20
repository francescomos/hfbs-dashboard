import { state } from '../state.js';
import { IF, TL, SC } from '../constants.js';
import { fE, fEk, fD, fDshort } from '../utils/format.js';
import { cSt, bC, dTS } from '../utils/normalize.js';
import { $, escapeAttr } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';
import {
  getSpendForProd,
  getCampaignsForCorso,
  getGA4ForCorso,
  getBrochureStats,
  calcRitardo,
  calcOverlapDetail,
} from '../data/helpers.js';
import {
  getLastEdition,
  avgConversionDays,
  dropoutPct,
  noShowPct,
  countAlumniReturning,
} from '../data/insights.js';
import { buildDailyChart } from '../charts/dailyChart.js';
import { drawFunnelChart, drawChannelsDonut, drawRevPerEdition } from '../charts/chartjs.js';

export function populateProdSelect() {
  const corsi = buildCorsi();
  const p = {};
  for (const x of corsi) {
    if (!p[x.nome]) p[x.nome] = [];
    p[x.nome].push(x);
  }
  const s = $('prod-select');
  const pv = s.value;
  s.innerHTML = '<option value="">— seleziona prodotto —</option>'
    + Object.keys(p).sort().map((n) => `<option value="${encodeURIComponent(n)}">${n}</option>`).join('');
  if (pv) s.value = pv;
}

export function renderProdotto() {
  const sel = $('prod-select');
  const nome = sel ? decodeURIComponent(sel.value) : '';
  const ct = $('prod-detail');
  if (!nome || !state.DL) {
    ct.innerHTML = '<div class="empty-state"><h3>Seleziona un prodotto</h3></div>';
    return;
  }
  const corsi = buildCorsi().filter((c) => c.nome === nome);
  if (!corsi.length) {
    ct.innerHTML = '<div class="empty-state"><h3>Non trovato</h3></div>';
    return;
  }

  const tipo = TL[corsi[0].tipo] || corsi[0].tipo || '';
  const ti = corsi.reduce((s, c) => s + c.iscrittiOA, 0);
  const tr = corsi.reduce((s, c) => s + c.revenueOA, 0);
  const allStatuses = corsi.map((c) => cSt(c));
  const prodStatus = allStatuses.includes('active') ? 'In corso' : allStatuses.includes('selling') ? 'In vendita' : 'Concluso';
  const prodStC = prodStatus === 'In vendita' ? 'ed-status-selling' : prodStatus === 'In corso' ? 'ed-status-active' : 'ed-status-done';

  const totCostiProd = corsi.reduce((s, c) => s + c.costiTotali, 0);
  const totMktgProd = getSpendForProd(corsi[0].prod);
  const margineProd = tr > 0 ? Math.round(((tr - totCostiProd - totMktgProd) / tr) * 100) : 0;

  // Ultima edizione = max(startDate)
  const lastEd = getLastEdition(corsi);
  const leStatus = lastEd ? cSt(lastEd) : 'selling';
  const leStatusL = leStatus === 'selling' ? 'IN VENDITA' : leStatus === 'active' ? 'IN CORSO' : 'CONCLUSA';
  const leIsZR = lastEd && lastEd.pctTarget < 70 && dTS(lastEd) > 0 && dTS(lastEd) <= 45;
  const leBadge = leIsZR ? 'ALLARME' : leStatusL;
  const leBadgeBg = leIsZR ? 'rgba(239,68,68,.85)' : leStatus === 'selling' ? 'rgba(147,197,253,.3)' : leStatus === 'active' ? 'rgba(125,211,192,.3)' : 'rgba(255,255,255,.15)';
  const leMargine = lastEd ? (lastEd.revenueOA - lastEd.costiTotali - (lastEd.mktgPaid || 0)) : 0;
  const leMargPct = lastEd && lastEd.revenueOA > 0 ? Math.round((leMargine / lastEd.revenueOA) * 100) : 0;
  const leCandidature = lastEd ? (lastEd.gfCount + lastEd.brevoDeals.length) : 0;

  let h = '';

  // HERO: sempre sull'ultima edizione
  if (lastEd) {
    h += `<div class="prod-hero">`
      + `<h2>${nome}<span class="status-inline" style="background:${leBadgeBg}${leIsZR ? ';color:#fff' : ''}">${leBadge}</span></h2>`
      + `<div class="sub">${tipo} · edizione ${IF[lastEd.intake] || lastEd.intake} · sigla ${lastEd.sig} · ${corsi.length} edizion${corsi.length > 1 ? 'i' : 'e'} totali</div>`
      + `<div class="prod-hero-stats">`
      + `<div class="prod-hero-stat"><div class="lbl">Iscritti</div><div class="val">${lastEd.iscrittiOA}<span class="unit">/ ${lastEd.target}</span></div><div class="sub">${lastEd.pctTarget}% del target</div></div>`
      + `<div class="prod-hero-stat"><div class="lbl">Revenue</div><div class="val">${fEk(lastEd.revenueOA)}</div><div class="sub">${lastEd.revTarget > 0 ? Math.round(lastEd.revenueOA / lastEd.revTarget * 100) + '% di ' + fEk(lastEd.revTarget) : '—'}</div></div>`
      + `<div class="prod-hero-stat"><div class="lbl">Margine netto</div><div class="val ${leMargine < 0 ? 'alert' : ''}">${fEk(leMargine)}</div><div class="sub">${leMargPct}% su revenue</div></div>`
      + `<div class="prod-hero-stat"><div class="lbl">Candidature</div><div class="val">${leCandidature}</div><div class="sub">${lastEd.calAll} colloqui · ${lastEd.brevoWon} won</div></div>`
      + `</div></div>`;
  } else {
    h += `<div class="prod-header"><div style="display:flex;align-items:center;gap:10px"><div class="prod-title">${nome}</div><span class="ed-status ${prodStC}">${prodStatus}</span></div><div class="prod-subtitle">${tipo}  |  ${corsi.length} edizion${corsi.length > 1 ? 'i' : 'e'}  |  ${ti} iscritti  |  ${fE(tr)} revenue  |  <span style="color:${margineProd >= 0 ? 'var(--mint-deep)' : 'var(--alert-2)'}">${margineProd}% margine</span></div></div>`;
  }

  // Edizioni
  h += '<div class="prod-section"><div class="prod-section-title">Edizioni</div><div class="ed-row">';
  const chKeys2 = ['b2b', 'b2c', 'jakala', 'referral', 'partner', 'free'];
  const chColors2 = ['#2563eb', '#7c3aed', '#f59e0b', '#22c55e', '#60a5fa', '#9ca3af'];
  const chLab2 = ['B2B', 'B2C', 'JAK', 'REF', 'PAR', 'FREE'];

  for (const c of corsi) {
    const il = IF[c.intake] || c.edizione || c.intake;
    const color = bC(c.pctTarget);
    const st = cSt(c);
    const stL = st === 'selling' ? 'In vendita' : st === 'active' ? 'In corso' : 'Concluso';
    const stC = st === 'selling' ? 'ed-status-selling' : st === 'active' ? 'ed-status-active' : 'ed-status-done';
    const cv = c.leadRicevuti > 0 ? ((c.iscrittiOA / c.leadRicevuti) * 100).toFixed(1) + '%' : '—';
    const isSel = state.selectedEdition === c.intake;
    const rit = calcRitardo(c.fk);
    const ritBadge = (label, inRitardo) =>
      inRitardo ? `<span style="background:var(--red-l);color:var(--red);border-radius:4px;font-size:10px;font-weight:700;padding:2px 6px">↓ ${label}</span> ` : '';
    const totChI2 = chKeys2.reduce((s, k) => s + (c.channels[k]?.i || 0), 0);

    let chBarHTML = '';
    if (totChI2 > 0) {
      chBarHTML = '<div style="margin-top:6px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">Canali</div><div style="display:flex;height:10px;border-radius:4px;overflow:hidden;gap:1px">';
      chKeys2.forEach((k, i) => {
        const v = c.channels[k]?.i || 0;
        if (v > 0) {
          const pct = Math.round((v / totChI2) * 100);
          chBarHTML += `<div style="width:${pct}%;background:${chColors2[i]}" title="${chLab2[i]}: ${v}"></div>`;
        }
      });
      chBarHTML += '</div><div style="display:flex;margin-top:2px">';
      chKeys2.forEach((k, i) => {
        const v = c.channels[k]?.i || 0;
        if (v > 0) {
          const pct = Math.round((v / totChI2) * 100);
          chBarHTML += `<div style="width:${pct}%;text-align:center;font-size:9px;color:${chColors2[i]};font-weight:700;overflow:hidden;white-space:nowrap">${chLab2[i]} ${v}</div>`;
        }
      });
      chBarHTML += '</div></div>';
    }

    h += `<div class="ed-card" data-edition="${escapeAttr(c.intake)}" style="cursor:pointer;border:2px solid ${isSel ? 'var(--hfarm)' : 'transparent'}"><div class="ed-label">${il}</div><span class="ed-status ${stC}">${stL}</span><div class="ed-big" style="color:${color}">${c.iscrittiOA}<span style="font-size:13px;color:var(--text3);font-weight:400"> / ${c.target}</span></div><div class="prog-bar" style="margin:6px 0"><div class="prog-fill" style="width:${Math.min(c.pctTarget, 100)}%;background:${color}"></div></div><div style="font-size:12px;font-family:var(--mono);color:${color};font-weight:600">${c.pctTarget}%</div><div class="ed-stat">Revenue: ${fE(c.revenueOA)}</div><div class="ed-stat">Lead→Iscritto: ${cv}</div><div class="ed-stat">${c.gfCount} GF  |  ${c.calAll} colloqui  |  ${c.brevoWon} won</div><div class="ed-stat">${c.brochureCount} brochure</div>${c.mktgPaid > 0 ? `<div class="ed-mktg">CPL ${fE(c.cpl)}  |  CPA ${fE(c.cpa)}  |  Speso ${fE(c.mktgPaid)}</div>` : ''}${chBarHTML}${rit && rit.hasData ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${ritBadge('Lead', rit.leadRitardo)}${ritBadge('Colloqui', rit.colloquiRitardo)}${ritBadge('Iscritti', rit.iscrittiRitardo)}${!rit.leadRitardo && !rit.colloquiRitardo && !rit.iscrittiRitardo ? '<span style="background:var(--green-l);color:var(--green);border-radius:4px;font-size:10px;font-weight:700;padding:2px 6px">✓ In linea</span>' : ''}</div>` : ''}</div>`;
  }
  h += '</div></div>';

  const filteredCorsi = state.selectedEdition ? corsi.filter((c) => c.intake === state.selectedEdition) : corsi;

  // Funnel attesi vs reali (Chart.js, aggregato su filteredCorsi).
  // Se Mktg_ExEd non ha obiettivi per nessuna edizione → il chart mostra solo "Reali"
  // e il caller aggiunge una nota.
  const hasExpectedObj = filteredCorsi.some((c) => (parseFloat(c.leadAttesi) || 0) + (parseFloat(c.colloquiAttesi) || 0) + (parseFloat(c.iscrittiAttesi) || 0) > 0);
  h += `<div class="section"><div class="section-title"><span class="tt-left">Funnel ${hasExpectedObj ? 'attesi vs reali' : '(solo reali)'}</span><span class="tt-right">${state.selectedEdition ? (IF[state.selectedEdition] || state.selectedEdition) : 'tutte le edizioni'}</span></div>`;
  if (!hasExpectedObj) {
    h += `<div style="font-size:11.5px;color:var(--ink-3);margin-bottom:10px;font-family:var(--mono)">⚠ Obiettivi (lead/colloqui/iscritti attesi) non impostati in Mktg_ExEd per questo prodotto</div>`;
  }
  h += `<div class="chart-wrap h-340"><canvas id="chartFunnel"></canvas></div></div>`;

  // Revenue per edizione + donut canali affiancati
  const chKeysChart = ['b2b', 'b2c', 'jakala', 'referral', 'partner', 'free'];
  const chTotObj = {};
  chKeysChart.forEach((k) => { chTotObj[k.toUpperCase()] = filteredCorsi.reduce((s, c) => s + (c.channels?.[k]?.i || 0), 0); });
  const chKeysUp = ['B2B', 'B2C', 'JAKALA', 'REFERRAL', 'PARTNER', 'FREE'];
  const totChIChart = chKeysUp.reduce((s, k) => s + chTotObj[k], 0);
  if (totChIChart > 0 || filteredCorsi.length > 1) {
    h += `<div class="grid-2" style="margin-bottom:14px">`;
    if (totChIChart > 0) {
      h += `<div class="section" style="margin-bottom:0"><div class="section-title"><span class="tt-left">Canali di acquisizione</span><span class="tt-right">${totChIChart} iscritti</span></div><div class="chart-wrap h-260"><canvas id="chartChannels"></canvas></div></div>`;
    }
    if (filteredCorsi.length > 1) {
      h += `<div class="section" style="margin-bottom:0"><div class="section-title"><span class="tt-left">Revenue per edizione</span><span class="tt-right">€ reali vs target</span></div><div class="chart-wrap h-260"><canvas id="chartRevEd"></canvas></div></div>`;
    }
    h += `</div>`;
  }

  // Funnel per edizione (legacy, dettaglio)
  h += `<div class="prod-section"><div class="prod-section-title">Funnel per edizione${state.selectedEdition ? ' — ' + (IF[state.selectedEdition] || state.selectedEdition) : ''}</div>`;
  const mkFunnel = (steps, mx) =>
    '<div class="funnel" style="height:100px">'
    + steps.map((s, i) => {
      const ht = Math.max(4, Math.round((s.v / mx) * 88));
      const p = i > 0 && steps[i - 1].v > 0 ? Math.round((s.v / steps[i - 1].v) * 100) + '%' : '';
      return `<div class="funnel-step"><div class="funnel-bar" style="height:${ht}px;background:${s.c}"></div><div class="funnel-info"><span class="funnel-num">${s.v}${p ? ' — ' + p : ''}</span></div><div class="funnel-lbl">${s.l}</div></div>`;
    }).join('')
    + '</div>';

  for (const c of filteredCorsi) {
    const il = IF[c.intake] || c.intake;
    const stepsA = [
      { l: 'Lead att.', v: Math.round(c.leadAttesi), c: 'var(--blue)' },
      { l: 'Coll. att.', v: Math.round(c.colloquiAttesi), c: 'var(--purple)' },
      { l: 'Contr. att.', v: Math.round(c.colloquiAttesi * 0.5), c: 'var(--amber)' },
      { l: 'Iscr. att.', v: Math.round(parseFloat(c.iscrittiAttesi) || c.target), c: 'var(--green)' },
    ];
    const stepsR = [
      { l: 'Lead reali', v: c.gfCount + c.brevoDeals.length, c: 'var(--blue)' },
      { l: 'Colloqui', v: c.calAll, c: 'var(--purple)' },
      { l: 'Contr. inv.', v: c.brevoStages['Contract pending'] || 0, c: 'var(--amber)' },
      { l: 'Iscritti', v: c.iscrittiOA, c: 'var(--green)' },
    ];
    const mxAll = Math.max(...stepsA.map((s) => s.v), ...stepsR.map((s) => s.v), 1);
    h += `<div style="margin-bottom:20px"><div style="font-size:14px;font-weight:700;margin-bottom:10px">${il}</div><div style="display:grid;grid-template-columns:1fr 1px 1fr;gap:16px"><div><div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Attesi</div>${mkFunnel(stepsA, mxAll)}</div><div style="background:var(--border);"></div><div><div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Reali</div>${mkFunnel(stepsR, mxAll)}</div></div></div>`;
  }
  h += '</div>';

  // Campagne digitali
  const allCampsForProd = getCampaignsForCorso(corsi[0].prod);
  if (allCampsForProd.meta.length > 0 || allCampsForProd.google.length > 0) {
    h += `<div class="prod-section"><div class="prod-section-title">Campagne digitali — ${allCampsForProd.meta.length + allCampsForProd.google.length} campagne</div>`;
    const allProdCamps = allCampsForProd.meta.concat(
      allCampsForProd.google.map((g) => ({
        campaignName: g.campaignName,
        status: g.status === 'ENABLED' ? 'ACTIVE' : 'PAUSED',
        startTime: g.startTime || '',
        spend: g.cost,
        clicks: g.clicks,
        impressions: g.impressions,
        leads: g.conversions,
        cpl: g.conversions > 0 ? Math.round(parseFloat(g.cost) / parseFloat(g.conversions)) : 0,
        platform: 'Google',
      })),
    );
    allProdCamps.forEach((c) => { if (!c.platform) c.platform = 'Meta'; });
    const activeCamps = allProdCamps.filter((c) => c.status === 'ACTIVE');
    const pausedCamps = allProdCamps.filter((c) => c.status !== 'ACTIVE');

    if (activeCamps.length) {
      h += `<div style="font-size:12px;font-weight:700;color:var(--green);margin-bottom:8px">ATTIVE (${activeCamps.length})</div><table class="mtable"><thead><tr><th>Campagna</th><th>Platform</th><th class="num">Inizio</th><th class="num">Spend</th><th class="num">Click</th><th class="num">Lead</th><th class="num">CPL</th></tr></thead><tbody>`;
      activeCamps.forEach((c) => {
        const cpl = parseFloat(c.cpl) || 0;
        const cplCol = cpl < 20 ? 'var(--green)' : cpl < 40 ? 'var(--amber)' : 'var(--red)';
        h += `<tr><td style="font-size:12px">${c.campaignName.substring(0, 40)}</td><td style="font-size:11px">${c.platform}</td><td class="num" style="font-size:11px">${fDshort(c.startTime)}</td><td class="num">${fE(parseFloat(c.spend))}</td><td class="num">${parseInt(c.clicks || 0)}</td><td class="num" style="font-weight:700">${parseInt(c.leads || 0)}</td><td class="num" style="color:${cplCol};font-weight:700">${parseInt(c.leads || 0) > 0 ? fE(cpl) : '—'}</td></tr>`;
      });
      h += '</tbody></table>';
    }

    const mcd = state.DL.Meta_Campaign_Daily || [];
    if (mcd.length > 0) {
      let courseStartDate = '';
      for (const fc of filteredCorsi) {
        if (fc.startDate) { courseStartDate = fc.startDate; break; }
      }
      h += `<div style="margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px">TREND GIORNALIERO</div>${buildDailyChart(mcd, corsi[0].prod, courseStartDate)}</div>`;
    }

    if (pausedCamps.length) {
      let tPS = 0, tPL = 0;
      pausedCamps.forEach((c) => {
        tPS += parseFloat(c.spend) || 0;
        tPL += parseInt(c.leads || 0);
      });
      h += `<div style="margin-top:12px;font-size:12px;color:var(--text3)"><b>${pausedCamps.length} campagne in pausa</b> — ${fE(tPS)} spesi, ${tPL} lead storici</div>`;
    }
    h += '</div>';
  }

  // GA4
  const ga4Data = getGA4ForCorso(corsi[0].prod);
  if (ga4Data.pages.length > 0) {
    const totalSess = ga4Data.pages.reduce((s, p) => s + (parseInt(p.sessions) || 0), 0);
    h += `<div class="prod-section"><div class="prod-section-title">Traffico sito — ${totalSess} sessioni</div>`;
    ga4Data.pages.forEach((p) => {
      h += `<div style="font-size:13px;margin-bottom:4px"><span style="font-family:var(--mono);font-size:12px;color:var(--text3)">${p.pagePath}</span> — <b>${parseInt(p.sessions)}</b> sessioni, ${parseInt(p.users)} utenti, engagement ${Math.round((parseFloat(p.engagementRate) || 0) * 100)}%</div>`;
    });
    if (ga4Data.sourcePage.length > 0) {
      const srcMax = Math.max(...ga4Data.sourcePage.map((s) => parseInt(s.sessions) || 0)) || 1;
      h += '<div style="margin-top:10px;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px">PER CANALE</div>';
      ga4Data.sourcePage
        .sort((a, b) => (parseInt(b.sessions) || 0) - (parseInt(a.sessions) || 0))
        .slice(0, 8)
        .forEach((s) => {
          const w = Math.round(((parseInt(s.sessions) || 0) / srcMax) * 100);
          h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><span style="font-size:12px;min-width:140px;color:var(--text2)">${s.source}/${s.medium}</span><div style="flex:1;height:6px;background:var(--border-l);border-radius:3px"><div style="height:100%;width:${w}%;background:var(--blue);border-radius:3px"></div></div><span style="font-family:var(--mono);font-size:11px;min-width:30px;text-align:right">${parseInt(s.sessions)}</span></div>`;
        });
    }
    h += '</div>';
  }

  // Brochure
  const brStats = getBrochureStats(corsi[0].prod);
  if (brStats.downloaded > 0) {
    const convPct = brStats.downloaded > 0 ? Math.round((brStats.converted / brStats.downloaded) * 100) : 0;
    h += `<div class="prod-section"><div class="prod-section-title">Download brochure</div><div style="display:flex;gap:24px;align-items:center"><div><span style="font-family:var(--mono);font-size:28px;font-weight:700;color:var(--blue)">${brStats.downloaded}</span><div style="font-size:12px;color:var(--text3)">download</div></div><div><span style="font-family:var(--mono);font-size:28px;font-weight:700;color:${convPct > 10 ? 'var(--green)' : 'var(--amber)'}">${convPct}%</span><div style="font-size:12px;color:var(--text3)">diventati deal (${brStats.converted})</div></div></div></div>`;
  }

  // Pipeline Brevo
  const ad = filteredCorsi.flatMap((c) => c.brevoDeals);
  if (ad.length > 0) {
    const ss = {};
    ad.forEach((d) => { ss[d.stage] = (ss[d.stage] || 0) + 1; });
    h += `<div class="prod-section"><div class="prod-section-title">Pipeline Brevo — ${ad.length} deal</div><div class="stage-row">${Object.entries(ss).map(([s, n]) => `<span class="stage-badge" style="background:${SC[s] || '#9ca3af'}">${s} ${n}</span>`).join('')}</div></div>`;
  }

  // Marginalità
  const wc = filteredCorsi.filter((c) => c.costiTotali > 0 || c.revenueOA > 0 || c.mktgPaid > 0);
  if (wc.length) {
    const colDel = (pct) => (pct > 50 ? 'cell-bad' : pct < 30 ? 'cell-good' : '');
    const colM = (n) => (n >= 0 ? 'cell-good' : 'cell-bad');
    h += '<div class="prod-section"><div class="prod-section-title">Marginalità</div><table class="mtable"><thead><tr><th>Edizione</th><th class="num">Revenue</th><th class="num">Fissi</th><th class="num">Var×pax</th><th class="num">Delivery</th><th class="num">% Del</th><th class="num">Margine</th><th class="num">Mktg</th><th class="num">% Mktg</th><th class="num">Netto</th><th class="num">% Netto</th></tr></thead><tbody>';
    let totR = 0, totD = 0, totM = 0;
    for (const c of wc) {
      const del = c.costiTotali;
      const mktg = c.mktgPaid || 0;
      const delPct = c.revenueOA > 0 ? Math.round((del / c.revenueOA) * 100) : 0;
      const mktgPct = c.revenueOA > 0 ? Math.round((mktg / c.revenueOA) * 100) : 0;
      const marg = c.revenueOA - del;
      const margPct = c.revenueOA > 0 ? Math.round((marg / c.revenueOA) * 100) : 0;
      const netto = marg - mktg;
      const nettoPct = c.revenueOA > 0 ? Math.round((netto / c.revenueOA) * 100) : 0;
      totR += c.revenueOA; totD += del; totM += mktg;
      h += `<tr><td>${IF[c.intake] || c.intake}</td><td class="num" style="color:var(--green)">${fE(c.revenueOA)}</td><td class="num">${fE(c.costiFissi)}</td><td class="num">${fE(c.costoPerStudente)}×${c.iscrittiOA}</td><td class="num">${fE(del)}</td><td class="num ${colDel(delPct)}">${delPct}%</td><td class="num ${colM(marg)}">${margPct}%</td><td class="num">${fE(mktg)}</td><td class="num">${mktgPct}%</td><td class="num ${colM(netto)}">${fE(netto)}</td><td class="num ${colM(netto)}">${nettoPct}%</td></tr>`;
    }
    if (wc.length > 1) {
      const totMarg = totR - totD;
      const tDP = totR > 0 ? Math.round((totD / totR) * 100) : 0;
      const tMP = totR > 0 ? Math.round((totM / totR) * 100) : 0;
      const tN = totMarg - totM;
      const tNP = totR > 0 ? Math.round((tN / totR) * 100) : 0;
      h += `<tr class="row-tot"><td colspan="4">Totale</td><td class="num">${fE(totD)}</td><td class="num ${colDel(tDP)}">${tDP}%</td><td class="num ${colM(totMarg)}">${totR > 0 ? Math.round((totMarg / totR) * 100) : 0}%</td><td class="num">${fE(totM)}</td><td class="num">${tMP}%</td><td class="num ${colM(tN)}">${fE(tN)}</td><td class="num ${colM(tN)}">${tNP}%</td></tr>`;
    }
    h += '</tbody></table></div>';
  }

  // Valutazioni
  const fb = state.DL.Feedback || [];
  const cn = nome.toLowerCase();
  const cfb = fb.filter((f) => (parseFloat(f.media) || 0) > 0 && ((f.courseName || '').toLowerCase().includes(cn.substring(0, 10)) || (f.prodotto || '').toLowerCase().includes(cn.substring(0, 10))));
  if (cfb.length) {
    const avg = cfb.reduce((s, f) => s + (parseFloat(f.media) || 0), 0) / cfb.length;
    const scF = (v) => (v >= 4.5 ? 'var(--green)' : v >= 3.5 ? 'var(--amber)' : 'var(--red)');
    const barF = (lbl, val) => val > 0
      ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:12px;min-width:80px;color:var(--text2)">${lbl}</span><div style="flex:1;height:5px;background:var(--border-l);border-radius:3px"><div style="height:100%;width:${(val / 5) * 100}%;background:${scF(val)};border-radius:3px"></div></div><span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${scF(val)}">${val.toFixed(1)}</span></div>`
      : '';
    h += `<div class="prod-section"><div class="prod-section-title">Valutazioni — media ${avg.toFixed(1)}/5</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">`;
    for (const f of cfb.sort((a, b) => (parseFloat(b.media) || 0) - (parseFloat(a.media) || 0))) {
      const m = parseFloat(f.media) || 0;
      const col = scF(m);
      let docs = '';
      if (f.docente1Nome && (parseFloat(f.docente1Voto) || 0) > 0)
        docs += `<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text2)">${f.docente1Nome}</span><span style="font-family:var(--mono);font-weight:700;color:${scF(parseFloat(f.docente1Voto))}">${parseFloat(f.docente1Voto).toFixed(1)}</span></div>`;
      if (f.docente2Nome && (parseFloat(f.docente2Voto) || 0) > 0)
        docs += `<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text2)">${f.docente2Nome}</span><span style="font-family:var(--mono);font-weight:700;color:${scF(parseFloat(f.docente2Voto))}">${parseFloat(f.docente2Voto).toFixed(1)}</span></div>`;
      h += `<div style="background:var(--bg);border-radius:var(--radius-sm);padding:12px;border-left:3px solid ${col}"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;font-weight:600">${f.prodotto || f.nome}</span><span style="font-family:var(--mono);font-size:18px;font-weight:700;color:${col}">${m.toFixed(1)}</span></div><div style="font-size:11px;color:var(--text3);margin-bottom:6px">${fD(f.dataEvento || '')}  |  ${f.numRisposte || 0} risposte</div>${barF('Contenuti', parseFloat(f.contenuti) || 0)}${barF('Docenti', parseFloat(f.docenti) || 0)}${barF('Logistica', parseFloat(f.logistica) || 0)}${docs ? `<div style="margin-top:6px;padding-top:4px;border-top:1px solid var(--border-l)"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Docenti</div>${docs}</div>` : ''}</div>`;
    }
    h += '</div></div>';
  }

  // Canali acquisizione
  h += '<div class="prod-section"><div class="prod-section-title">Diagnostica — Canale di acquisizione</div>';
  const chKeys = ['b2b', 'b2c', 'jakala', 'referral', 'partner', 'free'];
  const chColors = ['#2563eb', '#7c3aed', '#f59e0b', '#22c55e', '#60a5fa', '#9ca3af'];
  const chLabels = ['B2B', 'B2C', 'JAKALA', 'REFERRAL', 'PARTNER', 'FREE'];
  const chTotI = {}, chTotR = {};
  chKeys.forEach((k) => { chTotI[k] = 0; chTotR[k] = 0; });
  for (const c of corsi) {
    chKeys.forEach((k) => { chTotI[k] += c.channels[k].i; chTotR[k] += c.channels[k].r; });
  }
  const totChI = chKeys.reduce((s, k) => s + chTotI[k], 0);
  if (totChI > 0) {
    h += '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:8px">ISCRITTI PER CANALE</div><div style="display:flex;height:24px;border-radius:6px;overflow:hidden;margin-bottom:4px">';
    chKeys.forEach((k, i) => {
      const v = chTotI[k];
      if (v > 0) {
        const pct = Math.round((v / totChI) * 100);
        h += `<div style="width:${pct}%;background:${chColors[i]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;min-width:20px" title="${chLabels[i]}: ${v} (${pct}%)">${pct}%</div>`;
      }
    });
    h += '</div><div style="display:flex">';
    chKeys.forEach((k, i) => {
      const v = chTotI[k];
      if (v > 0) {
        const pct = Math.round((v / totChI) * 100);
        h += `<div style="width:${pct}%;text-align:center;font-size:10px;color:${chColors[i]};font-weight:700">${chLabels[i]} ${v}</div>`;
      }
    });
    h += '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">';
    chKeys.forEach((k, i) => {
      const vi = chTotI[k], vr = chTotR[k];
      if (vi > 0 || vr > 0)
        h += `<div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;border-radius:3px;background:${chColors[i]};flex-shrink:0"></div><div><div style="font-size:13px;font-weight:600">${chLabels[i]}</div><div style="font-size:12px;color:var(--text2)">${vi} iscritti  |  ${fE(vr)}</div></div></div>`;
    });
    h += '</div></div>';
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessun dato canale disponibile.</div>';
  }
  h += '</div>';

  // Overlap candidati
  const overlapData = calcOverlapDetail(nome);
  if (overlapData.total > 0) {
    h += `<div class="prod-section"><div style="display:flex;align-items:center;gap:12px"><div style="font-family:var(--mono);font-size:28px;font-weight:700;color:var(--blue)">${overlapData.total}</div><div><div style="font-size:14px;font-weight:600">Candidati in comune con ${overlapData.courses.map((c) => c.name + ' (' + c.count + ')').join('  |  ')}</div></div></div></div>`;
  }

  // Analytics avanzate — 6 mini card
  const allDealsP = filteredCorsi.flatMap((c) => c.brevoDeals);
  const totOA = filteredCorsi.reduce((s, c) => s + c.iscrittiOA, 0);
  const totRevA = filteredCorsi.reduce((s, c) => s + c.revenueOA, 0);
  const totCalA = filteredCorsi.reduce((s, c) => s + c.calAll, 0);
  const totBrochureA = filteredCorsi.reduce((s, c) => s + c.brochureCount, 0);
  const totCandA = filteredCorsi.reduce((s, c) => s + c.gfCount + c.brevoDeals.length, 0);

  const convGg = avgConversionDays(allDealsP);
  const dropP = dropoutPct(allDealsP);
  const nsP = noShowPct(allDealsP, totCalA);
  const avgRPS = totOA > 0 ? Math.round(totRevA / totOA) : 0;
  const avgList = filteredCorsi.length > 0
    ? Math.round(filteredCorsi.reduce((s, c) => s + c.pricing, 0) / filteredCorsi.length)
    : 0;
  const sconto = avgList > 0 ? Math.round((1 - avgRPS / avgList) * 100) : 0;
  const broPct = totCandA > 0 && totBrochureA > 0 ? Math.round((totCandA / totBrochureA) * 100) : 0;
  const alumni = countAlumniReturning(nome);
  const alumniPct = totOA > 0 ? Math.round((alumni / totOA) * 100) : 0;

  h += '<div class="prod-section"><div class="prod-section-title">Analytics avanzate</div><div class="mini-grid">';
  h += `<div class="mini" data-tip="Giorni medi tra creazione deal Brevo e Closed Won."><div class="lbl">Tempo conversione</div><div class="val" style="color:var(--sky-deep)">${convGg}<span class="unit">gg</span></div><div class="sub">da lead a iscritto</div></div>`;
  h += `<div class="mini" data-tip="Ticket medio effettivamente pagato."><div class="lbl">Revenue / studente</div><div class="val">${fEk(avgRPS)}</div><div class="sub">listino ${fEk(avgList)}${avgList > 0 ? ' · -' + sconto + '%' : ''}</div></div>`;
  h += `<div class="mini" data-tip="Deal Brevo con stage 'No Show' / colloqui totali Calendly. >15% = alert."><div class="lbl">No-show colloqui</div><div class="val" style="color:${nsP > 15 ? 'var(--alert-2)' : 'var(--ink)'}">${nsP}<span class="unit">%</span></div><div class="sub">${totCalA} colloqui prenotati</div></div>`;
  h += `<div class="mini" data-tip="Closed Lost / (Won + Lost). >40% = rivedere qualifica."><div class="lbl">Dropout pipeline</div><div class="val" style="color:${dropP > 40 ? 'var(--alert-2)' : 'var(--amber-deep)'}">${dropP}<span class="unit">%</span></div><div class="sub">${allDealsP.filter((d) => d.stage === 'Closed Won').length} won · ${allDealsP.filter((d) => d.stage === 'Closed Lost').length} lost</div></div>`;
  h += `<div class="mini" data-tip="Candidature ricevute / brochure scaricate. Mostra quanto la brochure converte in lead."><div class="lbl">Brochure → Lead</div><div class="val">${broPct}<span class="unit">%</span></div><div class="sub">${totBrochureA} download</div></div>`;
  h += `<div class="mini" data-tip="Studenti di OA_Studenti (questo prodotto) presenti in ≥2 corsi HFBS."><div class="lbl">Alumni returning</div><div class="val" style="color:var(--mint-deep)">${alumni}</div><div class="sub">${alumniPct}% su iscritti</div></div>`;
  h += '</div></div>';

  // Monitor fonti per edizione
  h += `<div class="prod-section"><div class="prod-section-title">Monitor fonti</div><div style="display:grid;grid-template-columns:repeat(${Math.min(corsi.length, 4)},1fr);gap:16px">`;
  for (let ci = 0; ci < corsi.length; ci++) {
    const c = corsi[ci];
    const il = IF[c.intake] || c.intake;
    const ck = [
      { l: 'File O&A', ok: c.iscrittiOA > 0, v: c.iscrittiOA + ' studenti' },
      { l: 'Deal Brevo', ok: c.brevoDeals.length > 0, v: c.brevoDeals.length + ' deal' },
      { l: 'Candidature GF', ok: c.gfCount > 0, v: c.gfCount + ' form' },
      { l: 'Colloqui', ok: c.calAll > 0, v: c.calAll + ' prenotati' },
      { l: 'Costi', ok: c.costiFissi > 0, v: c.costiFissi > 0 ? fE(c.costiTotali) : 'mancante' },
    ];
    h += `<div style="padding:8px 16px${ci > 0 ? ';border-left:1px solid var(--border)' : ''}"><div style="font-size:14px;font-weight:700;margin-bottom:8px">${il}</div>${ck.map((ch) => `<div class="monitor-row"><div class="monitor-dot ${ch.ok ? 'dot-ok' : 'dot-miss'}"></div><div class="monitor-label">${ch.l}</div><div class="monitor-val">${ch.v}</div></div>`).join('')}</div>`;
  }
  h += '</div></div>';

  ct.innerHTML = h;

  // Disegna chart dopo il render
  drawFunnelChart('chartFunnel', filteredCorsi);
  if (totChIChart > 0) drawChannelsDonut('chartChannels', chKeysUp, chTotObj);
  if (filteredCorsi.length > 1) drawRevPerEdition('chartRevEd', filteredCorsi);
}

export function attachProdottoHandlers() {
  const sel = $('prod-select');
  if (sel) sel.addEventListener('change', renderProdotto);

  const ct = $('prod-detail');
  if (ct) {
    ct.addEventListener('click', (e) => {
      const card = e.target.closest('.ed-card[data-edition]');
      if (!card) return;
      const ed = card.dataset.edition;
      state.selectedEdition = state.selectedEdition === ed ? null : ed;
      renderProdotto();
    });
  }
}
