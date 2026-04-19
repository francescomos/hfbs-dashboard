import { nP } from '../utils/normalize.js';

export function buildDailyChart(mcd, prodFilter, courseStartDate) {
  const byDate = {};
  mcd.forEach((r) => {
    const d = (r.date || '').substring(0, 10);
    if (!d || d.length < 10) return;
    if (prodFilter) {
      const s = (r.sigle || '').split(',');
      if (!s.some((x) => nP(x.trim()) === prodFilter)) return;
    }
    if (!byDate[d]) byDate[d] = { spend: 0, leads: 0, clicks: 0 };
    byDate[d].spend += parseFloat(r.spend) || 0;
    byDate[d].leads += parseInt(r.leads) || 0;
    byDate[d].clicks += parseInt(r.clicks) || 0;
  });

  const dates = Object.keys(byDate).sort();
  if (!dates.length) return '';

  const maxSpend = Math.max(...dates.map((d) => byDate[d].spend)) || 1;
  const courseStartD = courseStartDate ? new Date(courseStartDate) : null;
  const campaignEndStr = courseStartD
    ? new Date(courseStartD.getTime() - 86400000).toISOString().split('T')[0]
    : '';

  const barH = 50, topPad = 18, dateH = 30, totalH = barH + topPad + dateH;
  let h = `<div style="position:relative;display:flex;gap:1px;height:${totalH}px;align-items:flex-end">`;

  dates.forEach((d) => {
    const s = byDate[d].spend, l = byDate[d].leads;
    const ht = Math.max(2, Math.round((s / maxSpend) * barH));
    const dd = new Date(d + 'T12:00:00Z');
    const isMonday = dd.getUTCDay() === 1;
    const isFirst = dd.getUTCDate() === 1;
    const isEnd = d === campaignEndStr;

    let sepStyle = '';
    if (isFirst) sepStyle = 'border-left:2px solid var(--text1);';
    else if (isMonday) sepStyle = 'border-left:1px solid var(--border);';
    if (isEnd) sepStyle = 'border-left:2px dashed var(--amber);';

    h += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;${sepStyle}height:100%">`;
    h += `<div style="height:${topPad}px;display:flex;align-items:flex-end;justify-content:center">`;
    if (l > 0) h += `<span style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green)">${l}</span>`;
    h += '</div>';
    h += `<div style="width:100%;height:${ht}px;background:${l > 0 ? 'var(--green)' : 'var(--blue)'};border-radius:2px 2px 0 0"></div>`;

    const dayStr = String(dd.getUTCDate()).padStart(2, '0');
    const monStr = String(dd.getUTCMonth() + 1).padStart(2, '0');
    const dateLabel = dayStr + '/' + monStr;
    const isBold = isFirst ? ';font-weight:700;color:var(--text1)' : '';
    h += `<div style="height:${dateH}px;font-size:7px;color:var(--text3);writing-mode:vertical-lr;transform:rotate(180deg);overflow:hidden;white-space:nowrap${isBold}">${dateLabel}</div>`;
    h += '</div>';
  });

  h += '</div>';
  h += '<div style="display:flex;gap:16px;font-size:11px;color:var(--text3);margin-top:4px">';
  h += '<span>■ <span style="color:var(--blue)">Spend</span></span>';
  h += '<span>■ <span style="color:var(--green)">Giorni con lead</span></span>';
  if (campaignEndStr) h += '<span>┆ <span style="color:var(--amber)">Fine prevista</span></span>';
  h += '</div>';

  return h;
}
