import { state } from '../state.js';
import { fD } from '../utils/format.js';
import { $, escapeAttr } from '../utils/dom.js';
import { buildCorsi } from '../data/buildCorsi.js';

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

  const sc = (v) => (v >= 4.5 ? 'var(--green)' : v >= 3.5 ? 'var(--amber)' : 'var(--red)');
  const fv = (v) => (v > 0 ? v.toFixed(1) : '—');
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

  let h = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">';
  for (const [lbl, val] of [['Media', aM], ['Organizzazione', aO], ['Contenuti', aC], ['Docenti', aD], ['Logistica', aL]]) {
    h += `<div style="text-align:center;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px"><div style="font-family:var(--mono);font-size:36px;font-weight:700;color:${sc(val)}">${fv(val)}</div><div style="font-size:12px;color:var(--text3);font-weight:600;text-transform:uppercase;margin-top:4px">${lbl}</div></div>`;
  }
  h += '</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';

  for (const [courseName, modules] of Object.entries(byCourse).sort((a, b) => avg(b[1], 'media') - avg(a[1], 'media'))) {
    const cAvg = avg(modules, 'media');
    const cC = avg(modules, 'contenuti');
    const cD2 = avg(modules, 'docenti');
    const cL = avg(modules, 'logistica');
    const col = sc(cAvg);
    const totR = modules.reduce((s, f) => s + (parseFloat(f.numRisposte) || 0), 0);
    const isExp = state.qaExpanded === courseName;
    const dispN = courseName.charAt(0).toUpperCase() + courseName.slice(1);
    const bar = (lbl, val) => (val > 0
      ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:12px;min-width:90px;color:var(--text2)">${lbl}</span><div style="flex:1;height:5px;background:var(--border-l);border-radius:3px"><div style="height:100%;width:${(val / 5) * 100}%;background:${sc(val)};border-radius:3px"></div></div><span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${sc(val)}">${val.toFixed(1)}</span></div>`
      : '');

    h += `<div class="qa-card" data-course="${escapeAttr(courseName)}" style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);border-top:3px solid ${col};cursor:pointer">`;
    h += `<div style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px"><div style="font-size:14px;font-weight:700">${dispN}</div><div style="font-family:var(--mono);font-size:24px;font-weight:700;color:${col}">${cAvg.toFixed(1)}</div></div><div style="font-size:12px;color:var(--text3);margin-bottom:8px">${modules.length} moduli  |  ${totR} risposte</div>${bar('Contenuti', cC)}${bar('Docenti', cD2)}${bar('Logistica', cL)}<div style="text-align:center;font-size:11px;color:var(--text3);margin-top:8px">${isExp ? '▲ Chiudi' : '▼ Espandi moduli'}</div></div>`;

    if (isExp) {
      h += '<div style="border-top:1px solid var(--border);padding:12px 16px;background:var(--bg)">';
      for (const f of modules.sort((a, b) => (parseFloat(b.media) || 0) - (parseFloat(a.media) || 0))) {
        const m = parseFloat(f.media) || 0;
        const mcol = sc(m);
        const cleanC = (t) => (!t || t.includes('do not have enough') || t.length < 5) ? '' : t;
        const posC = cleanC(f.aspettiPositivi || '');
        const negC = cleanC(f.areeMiglioramento || '');
        h += `<div style="background:var(--card);border:1px solid var(--border-l);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:13px;font-weight:600">${f.prodotto || f.nome}</span><span style="font-family:var(--mono);font-size:18px;font-weight:700;color:${mcol}">${m.toFixed(1)}</span></div><div style="font-size:11px;color:var(--text3);margin-bottom:6px">${fD(f.dataEvento || '')}  |  ${f.numRisposte || 0} risposte</div>${bar('Contenuti', parseFloat(f.contenuti) || 0)}${bar('Docenti', parseFloat(f.docenti) || 0)}${bar('Logistica', parseFloat(f.logistica) || 0)}${posC ? `<div style="margin-top:6px;padding:6px 8px;background:var(--bg);border-radius:var(--radius-sm);font-size:12px"><b style="color:var(--green);font-size:10px">✓ FORZA</b><br>${posC.substring(0, 250)}</div>` : ''}${negC ? `<div style="margin-top:4px;padding:6px 8px;background:var(--bg);border-radius:var(--radius-sm);font-size:12px"><b style="color:var(--amber);font-size:10px">△ MIGL.</b><br>${negC.substring(0, 250)}</div>` : ''}</div>`;
      }
      h += '</div>';
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
    const card = e.target.closest('.qa-card[data-course]');
    if (!card) return;
    const name = card.dataset.course;
    state.qaExpanded = state.qaExpanded === name ? null : name;
    renderQualita();
  });
}
