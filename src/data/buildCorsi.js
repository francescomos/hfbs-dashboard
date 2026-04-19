import { state } from '../state.js';
import { nI, nP } from '../utils/normalize.js';
import { getSpendForProd } from './helpers.js';

const emptyChannels = () => ({
  b2b: { i: 0, r: 0 },
  b2c: { i: 0, r: 0 },
  jakala: { i: 0, r: 0 },
  referral: { i: 0, r: 0 },
  partner: { i: 0, r: 0 },
  free: { i: 0, r: 0 },
});

export function buildCorsi() {
  if (state.corsiCache) return state.corsiCache;
  const DL = state.DL;
  if (!DL) return [];

  const cfg = DL.Config_Corsi || [];
  const oaS = DL.OA_Summary || [];
  const oaR = DL.OA_Studenti || [];
  const dls = DL.Brevo_Deals || [];
  const gf = DL.Gravity_Forms || [];
  const cal = DL.Calendly || [];
  const mktg = DL.Mktg_ExEd || [];
  const budgets = DL.Budget_Prodotti || [];

  // OA_Summary indexed by fk
  const sFk = {};
  for (const s of oaS) {
    const k = nP(s.prodotto) + '-' + nI(s.intake || '');
    if (k === '-') continue;
    if (!sFk[k]) sFk[k] = { i: 0, r: 0, ch: emptyChannels() };
    sFk[k].i += parseFloat(s.iscrittiUfficiali) || 0;
    sFk[k].r += parseFloat(s.incassoUfficiale) || 0;
    for (const ch of ['b2b', 'b2c', 'jakala', 'referral', 'partner', 'free']) {
      sFk[k].ch[ch].i += parseFloat(s[ch + '_iscritti']) || 0;
      sFk[k].ch[ch].r += parseFloat(s[ch + '_incasso']) || 0;
    }
  }

  // OA_Studenti indexed by fk
  const oFk = {};
  for (const r of oaR) {
    const k = nP(r.prodotto) + '-' + nI(r.intake || '');
    if (k === '-') continue;
    if (!oFk[k]) oFk[k] = [];
    oFk[k].push(r);
  }

  // Brevo_Deals indexed by fk
  const dFk = {};
  for (const d of dls) {
    const s = (d.sigla || '').toUpperCase().split('-');
    if (s.length >= 3) {
      const k = nP(s[0]) + '-' + s[2];
      if (!dFk[k]) dFk[k] = [];
      dFk[k].push(d);
    }
  }

  // Gravity_Forms (candidatura) indexed by fk
  const gFk = {};
  for (const g of gf) {
    if (g.formTipo !== 'candidatura') continue;
    const s = (g.codicecorso || '').toUpperCase().split('-');
    if (s.length >= 3) {
      const k = nP(s[0]) + '-' + s[2];
      if (!gFk[k]) gFk[k] = [];
      gFk[k].push(g);
    }
  }

  // email -> fk (cross-ref Calendly by email)
  const eFk = {};
  for (const g of gf) {
    if (!g.email) continue;
    const s = (g.codicecorso || '').toUpperCase().split('-');
    if (s.length >= 3) eFk[g.email.toLowerCase()] = nP(s[0]) + '-' + s[2];
  }
  for (const d of dls) {
    if (!d.contactEmail) continue;
    const s = (d.sigla || '').toUpperCase().split('-');
    if (s.length >= 3) eFk[d.contactEmail.toLowerCase()] = nP(s[0]) + '-' + s[2];
  }

  // Calendly indexed by fk
  const now = new Date();
  const cFk = {};
  for (const c of cal) {
    let fk = '';
    const cc = (c.utmContent || '').toUpperCase();
    if (cc) {
      const p = cc.split('-');
      if (p.length >= 3) fk = nP(p[0]) + '-' + p[2];
    }
    if (!fk && c.email) fk = eFk[c.email.toLowerCase()] || '';
    if (!fk) continue;
    if (!cFk[fk]) cFk[fk] = { a: [], p: [], f: [] };
    cFk[fk].a.push(c);
    const ed = c.evtStart ? new Date(c.evtStart) : null;
    if (ed && ed < now) cFk[fk].p.push(c);
    else cFk[fk].f.push(c);
  }

  // Mktg_ExEd indexed by fk (accumulates when same fk appears multiple times)
  const mFk = {};
  for (const m of mktg) {
    const s = (m.sigla || '').toUpperCase().split('-');
    const fk = s.length >= 3 ? nP(s[0]) + '-' + s[2] : (m.sigla || '').toUpperCase();
    if (!mFk[fk]) {
      mFk[fk] = { ...m };
    } else {
      const keys = [
        'budgetSpeso', 'budgetPianificato', 'leadAttesi', 'leadRicevuti',
        'colloquiAttesi', 'colloquiFissati', 'iscrittiAttesi', 'iscrittiRicevuti',
      ];
      for (const k of keys) {
        mFk[fk][k] = (parseFloat(mFk[fk][k]) || 0) + (parseFloat(m[k]) || 0);
      }
    }
  }

  // Budget_Prodotti indexed by fk or sigla
  const bFk = {};
  for (const b of budgets) {
    const s = (b.sigla || '').toUpperCase().split('-');
    if (s.length >= 3) bFk[nP(s[0]) + '-' + s[2]] = b;
    else if (b.sigla) bFk[b.sigla.toUpperCase()] = b;
  }

  state.corsiCache = cfg.filter((c) => c.nome).map((c) => {
    const sig = (c.sigla || '').toUpperCase();
    const prod = nP(c.siglaProdotto);
    const intake = (c.intake || '').toUpperCase();
    const fk = prod + '-' + intake;

    const sm = sFk[fk];
    const oa = oFk[fk] || [];
    const bd = dFk[fk] || [];
    const ge = gFk[fk] || [];
    const cl = cFk[fk] || { a: [], p: [], f: [] };

    const iOA = sm ? sm.i : oa.length;
    const rOA = sm ? Math.round(sm.r) : oa.reduce((s, r) => s + (parseFloat(r.prezzoPagato) || 0), 0);

    const st = {};
    bd.forEach((d) => { st[d.stage] = (st[d.stage] || 0) + 1; });

    const tgt = parseFloat(c.target) || 0;
    const pct = tgt > 0 ? Math.round((iOA / tgt) * 100) : 0;

    const mk = mFk[sig] || mFk[fk] || {};
    const bg = bFk[sig] || bFk[fk] || {};
    const cf = parseFloat(bg.costiFissi) || 0;
    const cps = parseFloat(bg.costoPerStudente) || 0;
    const ct_ = cf > 0 ? cf + cps * iOA : 0;

    // spend reale da Meta+GAds diviso tra edizioni dello stesso prodotto
    const mktgSpend = getSpendForProd(prod);
    const edCountForProd = cfg.filter((cc) => nP(cc.siglaProdotto) === prod).length || 1;
    const mktgSpendPerEd = Math.round(mktgSpend / edCountForProd);

    const brochureCount = (DL.Gravity_Forms || []).filter(
      (g) => g.formTipo === 'brochure' && (g.codicecorso || '').toUpperCase().includes(prod),
    ).length;

    return {
      ...c,
      sig, prod, intake, fk,
      iscrittiOA: iOA, revenueOA: rOA,
      target: tgt, pctTarget: pct,
      pricing: parseFloat(c.pricing) || 0,
      revTarget: parseFloat(c.revenueTarget) || 0,
      brevoDeals: bd, brevoStages: st,
      brevoWon: st['Closed Won'] || 0,
      gfEntries: ge, gfCount: ge.length,
      calAll: cl.a.length, calPast: cl.p.length, calFuture: cl.f.length,
      oaStudenti: oa,
      brochureCount,
      leads: parseFloat(c.leads) || 0,
      interviewsDone: parseFloat(c.interviewsDone) || 0,
      mktgBudget: parseFloat(mk.budgetPianificato || c.mktgBudget) || 0,
      mktgPaid: mktgSpendPerEd,
      leadAttesi: parseFloat(mk.leadAttesi) || 0,
      leadRicevuti: parseFloat(mk.leadRicevuti) || parseFloat(c.leads) || 0,
      colloquiAttesi: parseFloat(mk.colloquiAttesi) || 0,
      colloquiFissati: parseFloat(mk.colloquiFissati) || parseFloat(c.interviewsDone) || 0,
      iscrittiAttesi: parseFloat(mk.iscrittiAttesi) || 0,
      cpl: parseFloat(mk.cpl) || 0,
      cpa: parseFloat(mk.cpa) || 0,
      costiFissi: cf,
      costoPerStudente: cps,
      costiTotali: ct_,
      commissione: parseFloat(c.commissione) || 0,
      channels: sm ? sm.ch : emptyChannels(),
    };
  });

  return state.corsiCache;
}
