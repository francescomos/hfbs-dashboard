import { state } from '../state.js';
import { fD } from '../utils/format.js';
import { $, escapeAttr } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';

const scoreColor = (v) => (v >= 4.5 ? 'var(--mint-deep)' : v >= 4 ? 'var(--mint-2)' : v >= 3.5 ? 'var(--amber-deep)' : 'var(--alert-2)');
const stars = (v) => '★★★★★'.substring(0, Math.round(v)) + '☆☆☆☆☆'.substring(0, 5 - Math.round(v));

export function renderQualita() {
  const DL = state.DL;
  if (!DL) return;
  const fb = DL.Feedback || [];
  const ct = $('qualita-content');
  const corsi = buildCorsi();
  const corsiNomi = new Set(corsi.map((c) => c.nome.toLowerCase()));

  const ws = fb.filter((f) => {
    const m = parseFloat(f.media) || 0;
    if (m <= 0) return false;
    const cn = (f.courseName || f.prodotto || f.nome || '').toLowerCase();
    for (const n of corsiNomi) {
      if (cn.includes(n.substring(0, 10)) || n.includes(cn.substring(0, 10))) return true;
    }
    return false;
  });

  if (!ws.length) {
    ct.innerHTML = '<div class="empty-state"><h3>Nessun feedback disponibile</h3></div>';
    return;
  }

  const avg = (arr, key) => {
    const v = arr.filter((f) => (parseFloat(f[key]) || 0) > 0);
    return v.length ? v.reduce((s, f) => s + (parseFloat(f[key]) || 0), 0) / v.length : 0;
  };

  const byCourse = {};
  for (const f of ws) {
    const cn = f.courseName || f.prodotto || f.nome || '';
    let matched = '';
    for (const n of corsiNomi) {
      if (cn.toLowerCase().includes(n.substring(0, 10)) || n.includes(cn.toLowerCase().substring(0, 10))) {
        matched = n;
        break;
      }
    }
    if (!matched) matched = cn;
    if (!byCourse[matched]) byCourse[matched] = [];
    byCourse[matched].push(f);
  }

  const aM = avg(ws, 'media');
  const aO = avg(ws, 'organizzazione');
  const aC = avg(ws, 'contenuti');
  const aD = avg(ws, 'docenti');
  const aL = avg(ws, 'logistica');

  const fv = (v) => (v > 0 ? v.toFixed(1) : '—');

  let h = '<div class="q-kpi-row">';
  for (const [lbl, val] of [['Media', aM], ['Organizzazione', aO], ['Contenuti', aC], ['Docenti', aD], ['Logistica', aL]]) {
    const col = scoreColor(val);
    h += `<div class="q-kpi"><div class="v" style="color:${col}">${fv(val)}</div>`
      + `<div class="stars" style="color:${col}">${val > 0 ? stars(val) : ''}</div>`
      + `<div class="l">${lbl}</div></div>`;
  }
  h += '</div>';

  h += '<div class="q-grid">';
  for (const [courseName, modules] of Object.entries(byCourse).sort((a, b) => avg(b[1], 'media') - avg(a[1], 'media'))) {
    const cAvg = avg(modules, 'media');
    const cO = avg(modules, 'organizzazione');
    const cC = avg(modules, 'contenuti');
    const cD2 = avg(modules, 'docenti');
    const cL = avg(modules, 'logistica');
    const col = scoreColor(cAvg);
    const totR = modules.reduce((s, f) => s + (parseFloat(f.numRisposte) || 0), 0);
    const isExp = state.qaExpanded === courseName;
    const dispN = courseName.charAt(0).toUpperCase() + courseName.slice(1);
    const acc = cAvg >= 4.5 ? 'mint' : cAvg >= 4 ? 'brand' : cAvg >= 3.5 ? 'peach' : 'alert';

    const bar = (lbl, val) => val > 0
      ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:11px;min-width:95px;color:var(--ink-2);font-weight:600">${lbl}</span><div style="flex:1;height:6px;background:var(--bg-2);border-radius:999px;overflow:hidden"><div style="height:100%;width:${(val / 5) * 100}%;background:${scoreColor(val)};border-radius:999px"></div></div><span style="font-family:var(--mono);font-size:11px;font-weight:800;color:${scoreColor(val)};min-width:30px;text-align:right">${val.toFixed(1)}</span></div>`
      : '';

    h += `<div class="q-card" data-course="${escapeAttr(courseName)}" data-acc="${acc}">`;
    h += `<div class="q-card-head" style="padding:20px 22px">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px"><div style="font-weight:800;font-size:15px;line-height:1.2;max-width:170px">${dispN}</div><div style="font-weight:800;font-size:30px;line-height:1;letter-spacing:-.025em;color:${col}">${cAvg.toFixed(1)}</div></div>`;
    h += `<div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);margin-bottom:14px;letter-spacing:.02em">${modules.length} moduli · ${totR} risposte · <span style="color:${col}">${stars(cAvg)}</span></div>`;
    h += bar('Organizzazione', cO);
    h += bar('Contenuti', cC);
    h += bar('Docenti', cD2);
    h += bar('Logistica', cL);
    h += `<div style="text-align:center;font-size:10px;color:var(--ink-4);margin-top:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700">${isExp ? '▲ chiudi' : '▼ dettaglio edizioni'}</div>`;
    h += `</div>`;

    if (isExp) {
      h += `<div style="border-top:1px solid var(--line-l);padding:16px 20px;background:var(--bg-3)">`;
      for (const f of modules.sort((a, b) => (parseFloat(b.media) || 0) - (parseFloat(a.media) || 0))) {
        const m = parseFloat(f.media) || 0;
        const mcol = scoreColor(m);
        const cleanC = (t) => (!t || t.includes('do not have enough') || t.length < 5) ? '' : t;
        const posC = cleanC(f.aspettiPositivi || '');
        const negC = cleanC(f.areeMiglioramento || '');
        h += `<div style="background:var(--card);border:1px solid var(--line-l);border-radius:var(--r);padding:14px;margin-bottom:10px">`;
        h += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span style="font-weight:700">${f.prodotto || f.nome}</span><span style="font-size:22px;font-weight:800;color:${mcol}">${m.toFixed(1)}</span></div>`;
        h += `<div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);margin-bottom:10px">${fD(f.dataEvento || '')} · ${f.numRisposte || 0} risposte</div>`;
        h += bar('Contenuti', parseFloat(f.contenuti) || 0);
        h += bar('Docenti', parseFloat(f.docenti) || 0);
        h += bar('Logistica', parseFloat(f.logistica) || 0);
        if (posC) h += `<div style="margin-top:6px;padding:8px 10px;background:var(--mint-ll);border-radius:var(--r-sm);font-size:12px;color:var(--ink-2);line-height:1.5"><b style="color:var(--mint-deep);font-size:10px;letter-spacing:.1em;text-transform:uppercase">✓ Forza</b><br>${posC.substring(0, 250)}</div>`;
        if (negC) h += `<div style="margin-top:4px;padding:8px 10px;background:var(--amber-l);border-radius:var(--r-sm);font-size:12px;color:var(--ink-2);line-height:1.5"><b style="color:var(--amber-deep);font-size:10px;letter-spacing:.1em;text-transform:uppercase">△ Miglioramento</b><br>${negC.substring(0, 250)}</div>`;
        h += `</div>`;
      }
      h += `</div>`;
    }
    h += '</div>';
  }
  h += '</div>';
  ct.innerHTML = h;
}

export function attachQualitaHandlers() {
  const ct = $('qualita-content');
  if (!ct) return;
  ct.addEventListener('click', (e) => {
    const card = e.target.closest('.q-card[data-course]');
    if (!card) return;
    const name = card.dataset.course;
    state.qaExpanded = state.qaExpanded === name ? null : name;
    renderQualita();
  });
}
