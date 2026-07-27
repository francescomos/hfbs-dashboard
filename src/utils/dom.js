export const $ = (id) => document.getElementById(id);

export const escapeAttr = (s) => String(s ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

export function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}
