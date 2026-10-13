import { state } from '../state.js?v=20261013d';
import { fE } from '../utils/format.js?v=20261013d';
import { nP } from '../utils/normalize.js?v=20261013d';
import { $ } from '../utils/dom.js?v=20261013d';
import { corsiForYear } from '../data/corsiForYear.js?v=20261013d';
import { getRealSpend, attributeCampaignToYear } from '../data/helpers.js?v=20261013d';
import { buildDailyChart } from '../charts/dailyChart.js?v=20261013d';

export function renderMarketing() {
  const DL = state.DL;
  if (!DL) return;
  const ct = $('marketing-content');

  const allMc = DL.Meta_Campaigns || [];
  const allGc = DL.GAds_Campaigns || [];
  const ga4p = DL.GA4_Pages || [];
  const mcd = DL.Meta_Campaign_Daily || [];
  const brevoContacts = DL.Brevo_Contacts || [];
  const corsi = corsiForYear();

  // Build set of product codes for current year
  const yearProds = new Set();
  (DL.Config_Corsi || []).forEach((c) => {
    if ((c.anno || '') === state.year && c.siglaProdotto) yearProds.add(nP(c.siglaProdotto));
  });

  // Filter campaigns: name must contain a current-year intake code
  const yearIntakes = state.year === '26/27'
    ? /FA26|FALL.?26|WI27|WINTER.?27|W27|SP27|SPRING.?27|SU27|SUMMER.?27/i
    : /FA25|FALL.?25|WI26|WINTER.?26|W26|SP26|SPRING.?26|SU26|SUMMER.?26/i;
  const campaignMatchesYear = (c) => yearIntakes.test(c.campaignName || '');
  const mc = allMc.filter(campaignMatchesYear);
  const gc = allGc.filter(campaignMatchesYear);

  // Direct spend from filtered campaigns (name already guarantees year match)
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
  const ga4year = ga4p.filter((p) => p.sigla && yearProds.has(nP(p.sigla)));
  let ga4Sessions = 0;
  ga4year.forEach((p) => { ga4Sessions += parseInt(p.sessions) || 0; });
  const metaCPL = metaLeads > 0 ? Math.round(metaSpend / metaLeads) : 0;
  const metaActive = mc.filter((c) => c.status === 'ACTIVE').length;
  const gadsActive = gc.filter((c) => c.status === 'ENABLED').length;

  let h = '<div class="kpi-row" style="margin-bottom:20px">'
    + `<div class="kpi"><div class="kpi-label">Spend totale</div><div class="kpi-value">${fE(totalSpend)}</div><div class="kpi-sub">Meta+GAds campaigns</div></div>`
    + `<div class="kpi"><div class="kpi-label">Lead Meta</div><div class="kpi-value" style="color:var(--blue)">${metaLeads}</div><div class="kpi-sub">CPL medio ${fE(metaCPL)}</div></div>`
    + `<div class="kpi"><div class="kpi-label">Campagne attive</div><div class="kpi-value" style="color:var(--green)">${metaActive + gadsActive}</div><div class="kpi-sub">Meta ${metaActive}  |  Google ${gadsActive}</div></div>`
    + `<div class="kpi"><div class="kpi-label">Click totali</div><div class="kpi-value">${(metaClicks + gadsClicks).toLocaleString('it-IT')}</div><div class="kpi-sub">Meta ${metaClicks.toLocaleString('it-IT')}  |  Google ${gadsClicks.toLocaleString('it-IT')}</div></div>`
    + `<div class="kpi"><div class="kpi-label">Sessioni sito</div><div class="kpi-value" style="color:var(--purple)">${ga4Sessions.toLocaleString('it-IT')}</div><div class="kpi-sub">${ga4year.length} pagine corso</div></div></div>`;

  // 3 card
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">';
  const metaCPC = metaClicks > 0 ? Math.round((metaSpend / metaClicks) * 100) / 100 : 0;
  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div class="prod-section-title">Meta Ads</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"><div><div style="font-size:12px;color:var(--text3)">Speso</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${fE(metaSpend)}</div></div><div><div style="font-size:12px;color:var(--text3)">Click</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${metaClicks.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Impressions</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${metaImpr.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">CPC medio</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${fE(metaCPC)}</div></div></div></div>`;
  const gadsCPC = gadsClicks > 0 ? Math.round((gadsSpend / gadsClicks) * 100) / 100 : 0;
  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div class="prod-section-title">Google Ads</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"><div><div style="font-size:12px;color:var(--text3)">Speso</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${fE(gadsSpend)}</div></div><div><div style="font-size:12px;color:var(--text3)">Click</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${gadsClicks.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Conversioni</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${Math.round(gadsConv)}</div></div><div><div style="font-size:12px;color:var(--text3)">CPC medio</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${fE(gadsCPC)}</div></div></div></div>`;
  h += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div class="prod-section-title">GA4 Sito Web</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"><div><div style="font-size:12px;color:var(--text3)">Sessioni</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${ga4Sessions.toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Pagine corso</div><div style="font-family:var(--mono);font-size:20px;font-weight:700">${ga4year.length}</div></div><div><div style="font-size:12px;color:var(--text3)">Utenti totali</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${ga4year.reduce((s, p) => s + (parseInt(p.users) || 0), 0).toLocaleString('it-IT')}</div></div><div><div style="font-size:12px;color:var(--text3)">Pageviews</div><div style="font-family:var(--mono);font-size:14px;font-weight:600">${ga4year.reduce((s, p) => s + (parseInt(p.pageViews) || 0), 0).toLocaleString('it-IT')}</div></div></div></div>`;
  h += '</div>';

  // Ranking + Top pages
  const ranked = [...mc, ...gc.map((g) => ({...g, spend: g.cost, campaignName: g.campaignName, sigle: g.sigle, leads: g.conversions, status: g.status === 'ENABLED' ? 'ACTIVE' : g.status, platform: 'Google'}))].sort((a, b) => (parseFloat(b.spend) || 0) - (parseFloat(a.spend) || 0));
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
  h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px"><div class="prod-section-title">Campagne ' + state.year + '</div>';
  if (ranked.length) {
    h += '<table class="mtable"><thead><tr><th>Campagna</th><th>Piattaforma</th><th>Corso</th><th class="num">Stato</th><th class="num">Spend</th><th class="num">Lead</th><th class="num">CPL</th></tr></thead><tbody>';
    ranked.forEach((c) => {
      const spend = parseFloat(c.spend) || 0;
      const leads = parseInt(c.leads) || 0;
      const cpl = leads > 0 ? Math.round(spend / leads) : 0;
      const col = leads === 0 ? 'var(--text3)' : cpl < 20 ? 'var(--green)' : cpl < 40 ? 'var(--amber)' : 'var(--red)';
      const stBadge = c.status === 'ACTIVE'
        ? '<span style="background:var(--green-l);color:var(--green);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">ATTIVA</span>'
        : '<span style="background:var(--bg);color:var(--text3);padding:2px 6px;border-radius:4px;font-size:10px">PAUSA</span>';
      const platform = c.platform || 'Meta';
      h += `<tr><td style="font-size:12px">${(c.campaignName || '').substring(0, 40)}</td><td style="font-size:11px;color:var(--text3)">${platform}</td><td style="font-family:var(--mono);font-size:11px">${c.sigle || '—'}</td><td>${stBadge}</td><td class="num">${fE(spend)}</td><td class="num">${leads || '—'}</td><td class="num" style="color:${col};font-weight:700">${leads > 0 ? fE(cpl) : '—'}</td></tr>`;
    });
    h += '</tbody></table>';
  } else {
    h += '<div style="font-size:13px;color:var(--text3)">Nessuna campagna per questo anno</div>';
  }
  h += '</div>';

  const coursePages = ga4p.filter((p) => p.sigla && yearProds.has(nP(p.sigla))).sort((a, b) => (parseInt(b.sessions) || 0) - (parseInt(a.sessions) || 0));
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
    // Filter daily data: only campaigns matching year products with year intake in name
    const mcdYear = mcd.filter((r) => {
      const s = (r.sigle || '').split(',').map((x) => nP(x.trim())).filter(Boolean);
      return s.some((sig) => yearProds.has(sig));
    });
    h += buildDailyChart(mcdYear, null, null);
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
    if (!prod || !yearProds.has(prod)) return;
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
