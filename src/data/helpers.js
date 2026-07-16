import { state } from '../state.js?v=20260716';
import { nP } from '../utils/normalize.js?v=20260716';
import { buildCorsi } from './buildCorsi.js?v=20260716';

// Build set of product codes for the currently selected year
function prodsForCurrentYear() {
  const cfg = state.DL?.Config_Corsi || [];
  const prods = new Set();
  cfg.forEach((c) => {
    if ((c.anno || '') === state.year && c.siglaProdotto) {
      prods.add(nP(c.siglaProdotto));
    }
  });
  return prods;
}

// How many distinct academic years does this product code appear in?
function yearCountForProd(prod) {
  const cfg = state.DL?.Config_Corsi || [];
  const years = new Set();
  cfg.forEach((c) => {
    if (nP(c.siglaProdotto) === prod && c.anno) years.add(c.anno);
  });
  return years.size || 1;
}

// All product codes across ALL years
function allProds() {
  const cfg = state.DL?.Config_Corsi || [];
  const prods = new Set();
  cfg.forEach((c) => { if (c.siglaProdotto) prods.add(nP(c.siglaProdotto)); });
  return prods;
}

function numAcademicYears() {
  const cfg = state.DL?.Config_Corsi || [];
  const years = new Set();
  cfg.forEach((c) => { if (c.anno) years.add(c.anno); });
  return years.size || 1;
}

// Single source of truth for year-aware campaign spend attribution
export function attributeCampaignToYear(sigle, spend) {
  if (!spend) return 0;
  const yearProds = prodsForCurrentYear();
  const ap = allProds();
  const ny = numAcademicYears();

  if (!sigle.length) {
    // No sigla at all → split across all years
    return spend / ny;
  }

  let share = 0;
  let anyMatchedAnyYear = false;
  sigle.forEach((sig) => {
    if (ap.has(sig)) anyMatchedAnyYear = true;
    if (yearProds.has(sig)) {
      share += (spend / sigle.length) / yearCountForProd(sig);
    }
  });

  if (share > 0) return share;
  // Matched products but none in current year → 0
  if (anyMatchedAnyYear) return 0;
  // No product match at all (brand/orphan) → split across years
  return spend / ny;
}

export function getRealSpend() {
  const DL = state.DL;
  if (!DL) return 0;
  let total = 0;
  (DL.Meta_Campaigns || []).forEach((c) => {
    const s = (c.sigle || '').split(',').map((x) => nP(x.trim())).filter(Boolean);
    total += attributeCampaignToYear(s, parseFloat(c.spend) || 0);
  });
  (DL.GAds_Campaigns || []).forEach((c) => {
    const s = (c.sigle || '').split(',').map((x) => nP(x.trim())).filter(Boolean);
    total += attributeCampaignToYear(s, parseFloat(c.cost) || 0);
  });
  return total;
}

export function getSpendForProd(prod) {
  const DL = state.DL;
  if (!DL) return 0;
  const yearProds = prodsForCurrentYear();
  if (!yearProds.has(prod)) return 0;
  const yc = yearCountForProd(prod);
  let total = 0;
  (DL.Meta_Campaigns || []).forEach((c) => {
    const s = (c.sigle || '').split(',').map((x) => nP(x.trim())).filter(Boolean);
    if (s.indexOf(prod) >= 0) total += (parseFloat(c.spend) || 0) / s.length / yc;
  });
  (DL.GAds_Campaigns || []).forEach((c) => {
    const s = (c.sigle || '').split(',').map((x) => nP(x.trim())).filter(Boolean);
    if (s.indexOf(prod) >= 0) total += (parseFloat(c.cost) || 0) / s.length / yc;
  });
  return total;
}

export function getCampaignsForCorso(prod) {
  const DL = state.DL;
  if (!DL) return { meta: [], google: [] };
  const mc = DL.Meta_Campaigns || [];
  const gc = DL.GAds_Campaigns || [];
  const metaC = mc.filter((c) => (c.sigle || '').split(',').some((x) => nP(x.trim()) === prod));
  const googleC = gc.filter((c) => (c.sigle || '').split(',').some((x) => nP(x.trim()) === prod));
  return { meta: metaC, google: googleC };
}

export function getActiveCampaignCount(prod) {
  const c = getCampaignsForCorso(prod);
  return (
    c.meta.filter((x) => x.status === 'ACTIVE').length
    + c.google.filter((x) => x.status === 'ENABLED').length
  );
}

export function getGA4ForCorso(prod) {
  const DL = state.DL;
  if (!DL) return { pages: [], sourcePage: [] };
  return {
    pages: (DL.GA4_Pages || []).filter((p) => p.sigla === prod),
    sourcePage: (DL.GA4_SourcePage || []).filter((p) => p.sigla === prod),
  };
}

export function getBrochureStats(prod) {
  const DL = state.DL;
  if (!DL) return { downloaded: 0, converted: 0 };
  const gf = DL.Gravity_Forms || [];
  const brochureEmails = new Set();
  gf.forEach((g) => {
    if (g.formTipo !== 'brochure' || !g.email) return;
    if ((g.codicecorso || '').toUpperCase().includes(prod)) {
      brochureEmails.add(g.email.toLowerCase());
    }
  });
  const deals = DL.Brevo_Deals || [];
  let converted = 0;
  deals.forEach((d) => {
    if (!d.contactEmail) return;
    const dp = (d.sigla || '').split('-')[0] || '';
    if (nP(dp) === prod && brochureEmails.has(d.contactEmail.toLowerCase())) converted++;
  });
  return { downloaded: brochureEmails.size, converted };
}

export function calcRitardo(fk) {
  const DL = state.DL;
  if (!DL || !DL.Mktg_ExEd_Weekly) return null;
  const today = new Date();
  const rows = DL.Mktg_ExEd_Weekly.filter((r) => r.fk === fk);
  if (!rows.length) return null;
  const cumul = (m) =>
    rows
      .filter((r) => r.metrica === m && new Date(r.data) <= today)
      .reduce((s, r) => s + (parseFloat(r.valore) || 0), 0);
  const lA = cumul('LEAD ATTESI'), lR = cumul('LEAD RICEVUTI');
  const cA = cumul('COLLOQUI ATTESI'), cR = cumul('COLLOQUI FISSATI');
  const iA = cumul('ISCRITTI ATTESI'), iR = cumul('ISCRITTI RICEVUTI');
  return {
    leadRitardo: lA > 0 && lR < lA,
    colloquiRitardo: cA > 0 && cR < cA,
    iscrittiRitardo: iA > 0 && iR < iA,
    lA, lR, cA, cR, iA, iR,
    hasData: lA > 0 || cA > 0 || iA > 0,
  };
}

export function calcOverlapDetail(nome) {
  const DL = state.DL;
  if (!DL) return { total: 0, courses: [] };
  const corsi = buildCorsi();
  const thisFks = new Set(corsi.filter((c) => c.nome === nome).map((c) => c.fk));
  const emailsOf = (fks) => {
    const s = new Set();
    for (const g of (DL.Gravity_Forms || [])) {
      if (!g.email || g.formTipo !== 'candidatura') continue;
      const p = (g.codicecorso || '').toUpperCase().split('-');
      if (p.length >= 3 && fks.has(nP(p[0]) + '-' + p[2])) s.add(g.email.toLowerCase());
    }
    for (const d of (DL.Brevo_Deals || [])) {
      if (!d.contactEmail) continue;
      const p = (d.sigla || '').toUpperCase().split('-');
      if (p.length >= 3 && fks.has(nP(p[0]) + '-' + p[2])) s.add(d.contactEmail.toLowerCase());
    }
    return s;
  };
  const thisE = emailsOf(thisFks);
  const overlapCourses = [];
  for (const c2 of corsi) {
    if (c2.nome === nome) continue;
    const emails2 = emailsOf(new Set([c2.fk]));
    let cnt = 0;
    for (const e of thisE) if (emails2.has(e)) cnt++;
    if (cnt > 0) overlapCourses.push({ name: c2.nome, count: cnt });
  }
  overlapCourses.sort((a, b) => b.count - a.count);
  const seen = {}, deduped = [];
  for (const oc of overlapCourses) {
    if (!seen[oc.name]) {
      seen[oc.name] = true;
      deduped.push(oc);
    } else {
      const existing = deduped.find((x) => x.name === oc.name);
      if (existing) existing.count += oc.count;
    }
  }
  let total = 0;
  for (const d of deduped) total += d.count;
  return { total, courses: deduped };
}
