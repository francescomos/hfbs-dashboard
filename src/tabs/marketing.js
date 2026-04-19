import { state } from '../state.js';
import { fE } from '../utils/format.js';
import { nP } from '../utils/normalize.js';
import { $ } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';
import { buildDailyChart } from '../charts/dailyChart.js';

export function renderMarketing() {
  const DL = state.DL;
  if (!DL) return;
  const ct = $('marketing-content');

  const mc = DL.Meta_Campaigns || [];
  const gc = DL.GAds_Campaigns || [];
  const ga4p = DL.GA4_Pages || [];
  const mcd = DL.Meta_Campaign_Daily || [];
  const brevoContacts = DL.Brevo_Contacts || [];
  const corsi = buildCorsi();

  let metaSpend = 0, metaLeads = 0, metaClicks = 0, metaImpr = 0;
  mc.forEach((c) => {
    metaSpend += parseFloat(c.spend) || 0;
    metaLeads += parseInt(c.leads) || 0;
    metaClicks += parseInt(c.clicks) || 0;
    metaImpr += parseInt(c.impressions) || 0;
  });
  let gadsSpend = 0, gadsClicks = 0, gadsConv = 0;
  gc.forEach((c) => {
    gadsSpend += parseFloat(c.cost) || 0;
    gadsClicks += parseInt(c.clicks) || 0;
    gadsConv += parseFloat(c.conversions) || 0;
  });
  const totalSpend = metaSpend + gadsSpend;
  let ga4Sessions = 0;
  ga4p.forEach((p) => { ga4Sessions += parseInt(p.sessions) || 0; });
  const metaCPL = metaLeads > 0 ? Math.round(metaSpend / metaLeads) : 0;
  const metaActive = mc.filter((c) => c.status === 'ACTIVE').length;
  const gadsActive = gc.filter((c) => c.status === 'ENABLED').length;

  let h = '<div class="kpi-row" style="margin-bottom:20px">'
    + `<div class="kpi"><div class="kpi-label">Spend totale</div><div class="kpi-value">${fE(totalSpend)}</div><div class="kpi-sub">Meta+GAds campaigns</div></div>`
    + `<div class="kpi"><div class="kpi-label">Lead Meta</div><div class="kpi-value" style="color:var(--blue)">${metaLeads}</div><div class="kpi-sub">CPL medio ${fE(metaCPL)}</div></div>`
    + `<div class="kpi"><div class="kpi-label">Campagne attive</div><div class="kpi-value" style="color:var(--green)">${metaActive + gadsActive}</div><div class="kpi-sub">Meta ${metaActive}  |  Google ${gadsActive}</div></div>`
    + `<div class="kpi"><div class="kpi-label">Click totali</div><div class="kpi-value">${(metaClicks + gadsClicks).toLocaleString('it-IT')}</div><div class="kpi-sub">Meta ${metaClicks.toLocaleString('it-IT')}  |  Google ${gadsClicks.toLocaleString('it-IT')}</div></div>`
    + `<div class="kpi"><div class="kpi-label">Sessioni sito</div><div class="kpi-value" style="color:var(--purple)">${ga4Sessions.toLocaleString('it-IT')}</div><div class="kpi-sub">${ga4p.length} pagine tracciate</div></div></div>`;

  // 3 card
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">';
  const metaCPC = metaClicks > 0 ? Math.round((metaSpend / metaClicks) * 100) / 100 : 0;
  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div class="prod-section-title">Meta Ads</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"><div><div style="font-size:12px;color:var(--text3)">Speso</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${fE(metaSpend)}</div></div><div><div style="font-size:12px;color:var(--text3)">Click</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${metaClicks.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Impressions</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${metaImpr.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">CPC medio</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${fE(metaCPC)}</div></div></div></div>`;
  const gadsCPC = gadsClicks > 0 ? Math.round((gadsSpend / gadsClicks) * 100) / 100 : 0;
  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div class="prod-section-title">Google Ads</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"><div><div style="font-size:12px;color:var(--text3)">Speso</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${fE(gadsSpend)}</div></div><div><div style="font-size:12px;color:var(--text3)">Click</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${gadsClicks.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Conversioni</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${Math.round(gadsConv)}</div></div><div><div style="font-size:12px;color:var(--text3)">CPC medio</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${fE(gadsCPC)}</div></div></div></div>`;
  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div class="prod-section-title">GA4 Sito Web</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"><div><div style="font-size:12px;color:var(--text3)">Sessioni</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${ga4Sessions.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Pagine corso</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${ga4p.filter((p) => p.sigla).length}</div></div><div><div style="font-size:12px;color:var(--text3)">Utenti totali</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${ga4p.reduce((s, p) => s + (parseInt(p.users) || 0), 0).toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Pageviews</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${ga4p.reduce((s, p) => s + (parseInt(p.pageViews) || 0), 0).toLocaleString('it-IT')}</div></div></div></div>`;
  h += '</div>';

  // Ranking + Top pages
  const ranked = mc.filter((c) => (parseInt(c.leads) || 0) > 0).sort((a, b) => (parseFloat(a.cpl) || 999) - (parseFloat(b.cpl) || 999));
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
  h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">Ranking campagne Meta per CPL</div>';
  if (ranked.length) {
    h += '<table class="mtable"><thead><tr><th>Campagna</th><th>Corso</th><th class="num">Stato</th><th class="num">Spend</th><th class="num">Lead</th><th class="num">CPL</th></tr></thead><tbody>';
    ranked.forEach((c) => {
      const cpl = parseFloat(c.cpl);
      const col = cpl < 20 ? 'var(--green)' : cpl < 40 ? 'var(--amber)' : 'var(--red)';
      const stBadge = c.status === 'ACTIVE'
        ? '<span style="background:var(--green-l);color:var(--green);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">ATTIVA</span>'
        : '<span style="background:var(--bg);color:var(--text3);padding:2px 6px;border-radius:4px;font-size:10px">PAUSA</span>';
      h += `<tr><td style="font-size:12px">${c.campaignName.substring(0, 35)}</td><td style="font-family:var(--mono);font-size:11px">${c.sigle || '—'}</td><td>${stBadge}</td><td class="num">${fE(parseFloat(c.spend))}</td><td class="num">${c.leads}</td><td class="num" style="color:${col};font-weight:700">${fE(cpl)}</td></tr>`;
    });
    h += '</tbody></table>';
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessuna campagna con lead</div>';
  }
  h += '</div>';

  const coursePages = ga4p.filter((p) => p.sigla).sort((a, b) => (parseInt(b.sessions) || 0) - (parseInt(a.sessions) || 0));
  h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">Top pagine corso (GA4)</div>';
  if (coursePages.length) {
    h += '<table class="mtable"><thead><tr><th>Pagina</th><th>Corso</th><th class="num">Sessioni</th><th class="num">Utenti</th><th class="num">Engagement</th><th class="num">Bounce</th></tr></thead><tbody>';
    coursePages.slice(0, 15).forEach((p) => {
      const eng = Math.round((parseFloat(p.engagementRate) || 0) * 100);
      const bounce = Math.round((parseFloat(p.bounceRate) || 0) * 100);
      h += `<tr><td style="font-size:11px">${p.pagePath.substring(0, 40)}</td><td style="font-family:var(--mono);font-size:11px;font-weight:600">${p.sigla}</td><td class="num">${parseInt(p.sessions)}</td><td class="num">${parseInt(p.users)}</td><td class="num" style="color:var(--green)">${eng}%</td><td class="num" style="color:${bounce > 5 ? 'var(--red)' : 'var(--green)'}">${bounce}%</td></tr>`;
    });
    h += '</tbody></table>';
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessuna pagina corso</div>';
  }
  h += '</div></div>';

  // Meta vs Google
  h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px"><div class="prod-section-title">Meta vs Google — dove conviene spendere?</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
    + `<div style="text-align:center;padding:16px;background:var(--blue-l);border-radius:var(--radius)"><div style="font-size:14px;font-weight:700;color:var(--blue)">Meta Ads</div><div style="font-family:var(--mono);font-size:28px;font-weight:700;margin:8px 0">${fE(metaSpend)}</div><div style="font-size:13px;color:var(--text2)">${metaLeads} lead  |  CPL ${fE(metaCPL)}</div><div style="font-size:13px;color:var(--text2)">${metaClicks.toLocaleString('it-IT')} click  |  ${metaActive} attive</div></div>`;
  const gadsCPL = gadsConv > 0 ? Math.round(gadsSpend / gadsConv) : 0;
  h += `<div style="text-align:center;padding:16px;background:var(--bg);border-radius:var(--radius)"><div style="font-size:14px;font-weight:700;color:var(--text1)">Google Ads</div><div style="font-family:var(--mono);font-size:28px;font-weight:700;margin:8px 0">${fE(gadsSpend)}</div><div style="font-size:13px;color:var(--text2)">${Math.round(gadsConv)} conversioni  |  CPC ${fE(gadsCPL)}</div><div style="font-size:13px;color:var(--text2)">${gadsClicks.toLocaleString('it-IT')} click  |  ${gadsActive} attive</div></div></div></div>`;

  // Daily trend
  if (mcd.length > 0) {
    h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px"><div class="prod-section-title">Trend giornaliero campagne Meta (ultimi 30gg)</div>';
    h += buildDailyChart(mcd, null, null);
    h += '</div>';
  }

  // Attribution
  if (brevoContacts.length > 0) {
    h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px"><div class="prod-section-title">Attribution — Provenienza contatti Brevo</div>';
    const provCount = {};
    brevoContacts.forEach((c) => {
      const prov = (c.provenienza || '').split(',').map((s) => s.trim()).filter(Boolean);
      prov.forEach((p) => { provCount[p] = (provCount[p] || 0) + 1; });
    });
    const provSorted = Object.entries(provCount).sort((a, b) => b[1] - a[1]);
    const provMax = provSorted.length > 0 ? provSorted[0][1] : 1;
    provSorted.forEach((e) => {
      const w = Math.round((e[1] / provMax) * 100);
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:13px;min-width:150px;color:var(--text2)">${e[0]}</span><div style="flex:1;height:8px;background:var(--border-l);border-radius:4px"><div style="height:100%;width:${w}%;background:var(--hfarm);border-radius:4px"></div></div><span style="font-family:var(--mono);font-size:12px;font-weight:700;min-width:40px;text-align:right">${e[1]}</span></div>`;
    });
    h += '</div>';
  }

  // Brochure
  const gf = DL.Gravity_Forms || [];
  const brochureByProd = {};
  gf.forEach((g) => {
    if (g.formTipo !== 'brochure') return;
    const cc = (g.codicecorso || '').toUpperCase().split('-');
    const prod = cc[0] ? nP(cc[0]) : '';
    if (!prod) return;
    if (!brochureByProd[prod]) brochureByProd[prod] = { downloads: 0, emails: new Set() };
    brochureByProd[prod].downloads++;
    if (g.email) brochureByProd[prod].emails.add(g.email.toLowerCase());
  });
  if (Object.keys(brochureByProd).length > 0) {
    h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px"><div class="prod-section-title">Download brochure per prodotto</div>';
    h += '<table class="mtable"><thead><tr><th>Corso</th><th>Sigla</th><th class="num">Download</th><th class="num">Email uniche</th><th class="num">Diventati deal</th><th class="num">% Diventati deal</th><th class="num">Won</th><th class="num">% Won su Download</th></tr></thead><tbody>';
    const deals = DL.Brevo_Deals || [];
    const siglaToName = {};
    corsi.forEach((c) => { if (!siglaToName[c.prod]) siglaToName[c.prod] = c.nome; });
    for (const prod in brochureByProd) {
      const b = brochureByProd[prod];
      let converted = 0, won = 0;
      deals.forEach((d) => {
        if (!d.contactEmail) return;
        const dp = (d.sigla || '').split('-')[0] || '';
        if (nP(dp) === prod && b.emails.has(d.contactEmail.toLowerCase())) {
          converted++;
          if (d.stage === 'Closed Won') won++;
        }
      });
      const dealPct = b.emails.size > 0 ? Math.round((converted / b.emails.size) * 100) : 0;
      const wonPct = b.downloads > 0 ? Math.round((won / b.downloads) * 100) : 0;
      const fullName = siglaToName[prod] || prod;
      h += `<tr><td style="font-size:12px">${fullName}</td><td style="font-family:var(--mono);font-weight:600;font-size:11px">${prod}</td><td class="num">${b.downloads}</td><td class="num">${b.emails.size}</td><td class="num">${converted}</td><td class="num" style="color:${dealPct > 10 ? 'var(--green)' : 'var(--amber)'}">${dealPct}%</td><td class="num" style="color:var(--green);font-weight:700">${won}</td><td class="num" style="color:${wonPct > 5 ? 'var(--green)' : 'var(--amber)'}">${wonPct}%</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  ct.innerHTML = h;
}
