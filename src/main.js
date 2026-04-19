import { STORAGE_KEY, DEFAULT_DATALAKE_URL } from './config.js';
import { state } from './state.js';
import { $ } from './utils/dom.js';
import { fetchDatalake, getDatalakeUrl, saveDatalakeUrl, updateLastRefreshLabel } from './data/fetch.js';
import { buildCorsi } from './data/buildCorsi.js';
import {
  renderPanoramica, renderFilters, attachPanoramicaHandlers,
} from './tabs/panoramica.js';
import { populateProdSelect, renderProdotto, attachProdottoHandlers } from './tabs/prodotto.js';
import { renderMarketing } from './tabs/marketing.js';
import { renderInsights } from './tabs/insights.js';
import { renderQualita, attachQualitaHandlers } from './tabs/qualita.js';
import { renderPL, attachPLHandlers } from './tabs/pl.js';
import { renderPLOP } from './tabs/plop.js';
import { renderMonitor } from './tabs/monitor.js';

function renderAll() {
  const c = buildCorsi();
  renderFilters(c);
  renderPanoramica(c);
  renderInsights(c);
  renderQualita();
  renderMonitor();
}

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  el.classList.add('active');
  $('tab-' + name).classList.add('active');
  if (!state.DL) return;
  if (name === 'prodotto') populateProdSelect();
  if (name === 'pl') renderPL();
  if (name === 'plop') renderPLOP();
  if (name === 'marketing') renderMarketing();
}

async function refreshData() {
  const url = getDatalakeUrl();
  if (!url) return;
  const grid = $('corso-grid');
  if (grid) grid.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento…</div>';
  try {
    const data = await fetchDatalake(url);
    updateLastRefreshLabel(data);
    renderAll();
  } catch (e) {
    if (grid) grid.innerHTML = `<div class="empty-state"><h3>Errore</h3><p>${e.message}</p></div>`;
  }
}

function saveUrl() {
  const u = $('url-input').value.trim();
  if (!u) return alert('Incolla URL.');
  saveDatalakeUrl(u);
  $('setup').classList.add('hidden');
  refreshData();
}

function initTabs() {
  document.querySelectorAll('.tab[data-tab]').forEach((el) => {
    el.addEventListener('click', () => switchTab(el.dataset.tab, el));
  });
}

function initSetup() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const input = $('url-input');
  // Show default URL in the input but keep setup hidden if we have a working default
  input.value = saved || DEFAULT_DATALAKE_URL;
  $('setup').classList.add('hidden');
  $('btn-save-url').addEventListener('click', saveUrl);
  $('btn-refresh').addEventListener('click', refreshData);
  $('btn-change-url').addEventListener('click', () => {
    $('setup').classList.toggle('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSetup();
  attachPanoramicaHandlers();
  attachProdottoHandlers();
  attachQualitaHandlers();
  attachPLHandlers();
  refreshData();
});
