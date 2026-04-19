import { STORAGE_KEY, DEFAULT_DATALAKE_URL } from '../config.js';
import { setDL } from '../state.js';
import { validateDatalake } from './schema.js';
import { $ } from '../utils/dom.js';

export function getDatalakeUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_DATALAKE_URL;
}

export function saveDatalakeUrl(url) {
  localStorage.setItem(STORAGE_KEY, url);
}

async function fetchJson(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = '_hf' + Date.now();
    const s = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout.'));
    }, 30000);
    const cleanup = () => {
      clearTimeout(timer);
      delete window[cb];
      s.remove();
    };
    window[cb] = (x) => { cleanup(); resolve(x); };
    s.onerror = () => { cleanup(); reject(new Error('Errore JSONP.')); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(s);
  });
}

export async function fetchDatalake(url) {
  let data;
  try {
    data = await fetchJson(url);
  } catch {
    data = await fetchJsonp(url);
  }
  const { ok, warnings } = validateDatalake(data);
  if (!ok) throw new Error(warnings.join('\n'));
  setDL(data);
  return data;
}

export function updateLastRefreshLabel(data) {
  const lr = data._lastRefresh || '';
  const el = $('last-update');
  if (!el) return;
  if (!lr) { el.textContent = ''; return; }
  try {
    const iso = lr.replace('Ultimo refresh: ', '');
    el.textContent = 'Agg. ' + new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    el.textContent = '';
  }
}
