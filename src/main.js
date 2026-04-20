import { STORAGE_KEY, DEFAULT_DATALAKE_URL } from './config.js';
import { state } from './state.js';
import { $ } from './utils/dom.js';
import { fetchDatalake, getDatalakeUrl, saveDatalakeUrl, updateLastRefreshLabel } from './data/fetch.js';
import { buildCorsi } from './data/buildCorsi.js';
import {
  renderPanoramica, renderFilters, attachPanoramicaHandlers, setSearch,
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
  updateHeaderSub(c);
  // Re-render anche il tab attivo se non è Panoramica (altrimenti click Aggiorna sembra non fare nulla)
  const activeTab = document.querySelector('.tab.active');
  const name = activeTab ? activeTab.dataset.tab : '';
  if (name === 'prodotto') { populateProdSelect(); renderProdotto(); }
  else if (name === 'pl') renderPL();
  else if (name === 'plop') renderPLOP();
  else if (name === 'marketing') renderMarketing();
}

function updateHeaderSub(corsi) {
  const el = $('header-sub');
  if (!el || !corsi) return;
  const ed = corsi.length;
  const prods = new Set(corsi.map((c) => c.nome)).size;
  const meta = (state.DL && state.DL._metadata) ? state.DL._metadata.length : 0;
  el.textContent = `${ed} edizioni · ${prods} prodotti${meta ? ' · ' + meta + ' fonti integrate' : ''}`;
}

function updateTodayChip() {
  const el = $('today-chip');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.panel, .tab-panel').forEach((p) => p.classList.remove('active'));
  el.classList.add('active');
  const panel = $('p-' + name) || $('tab-' + name);
  if (panel) panel.classList.add('active');
  if (!state.DL) return;
  if (name === 'prodotto') populateProdSelect();
  if (name === 'pl') renderPL();
  if (name === 'plop') renderPLOP();
  if (name === 'marketing') renderMarketing();
}

let refreshing = false;
async function refreshData() {
  if (refreshing) return;
  refreshing = true;
  const url = getDatalakeUrl();
  if (!url) { refreshing = false; return; }
  const grid = $('corso-grid');
  if (grid && !state.DL) grid.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento…</div>';
  const btn = $('btn-refresh');
  const origBtnText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Caricamento…'; btn.disabled = true; btn.style.opacity = '.75'; }
  try {
    const data = await fetchDatalake(url);
    updateLastRefreshLabel(data);
    renderAll();
  } catch (e) {
    if (grid && !state.DL) grid.innerHTML = `<div class="empty-state"><h3>Errore</h3><p>${e.message}</p></div>`;
    else alert('Aggiornamento fallito: ' + e.message);
  } finally {
    if (btn) { btn.textContent = origBtnText || 'Aggiorna'; btn.disabled = false; btn.style.opacity = ''; }
    refreshing = false;
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

function initSearch() {
  const input = $('search-input');
  if (!input) return;
  let timer = null;
  input.addEventListener('input', (e) => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    timer = setTimeout(() => {
      setSearch(q);
      // quando si cerca, torna su Panoramica per vedere i risultati
      const active = document.querySelector('.tab.active');
      if (active && active.dataset.tab !== 'panoramica') {
        const tab = document.querySelector('.tab[data-tab="panoramica"]');
        if (tab) tab.click();
      }
    }, 150);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; setSearch(''); } });
}

function initSetup() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const input = $('url-input');
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
  updateTodayChip();
  attachPanoramicaHandlers();
  attachProdottoHandlers();
  attachQualitaHandlers();
  attachPLHandlers();
  initSearch();
  refreshData();
});
