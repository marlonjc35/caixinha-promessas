/* app.js - Orquestra a UI e integra os módulos */
import { VERSES } from "./database.js";
import LS from "./storage.js";
import { addToHistory, getHistory, removeFromHistory, clearHistory, searchHistory } from "./history.js";
import { toggleFavorite, getFavorites, removeFavorite, clearFavorites, searchFavorites } from "./favorites.js";
import { loadTheme, applyTheme } from "./theme.js";

const CYCLE_KEY = "cp_cycle";
const CURRENT_KEY = "cp_current";
const STATS_KEY = "cp_stats";

const btnReceber = document.getElementById("btn-receber");
const btnProxima = document.getElementById("btn-proxima");
const btnCopy = document.getElementById("btn-copy");
const btnShare = document.getElementById("btn-share");
const btnFavorite = document.getElementById("btn-favorite");
const btnToggleTheme = document.getElementById("toggle-theme");
const cycleProgress = document.getElementById("cycle-progress");
const cycleMessage = document.getElementById("cycle-message");
const metaEl = document.getElementById("promise-meta");
const textEl = document.getElementById("promise-text");
const categoryEl = document.getElementById("promise-category");
const refEl = document.getElementById("promise-ref");

const verseCount = VERSES.length;
const MODE_KEY = 'cp_mode'; // 'random' | 'daily'

function getMode(){
  return LS.get(MODE_KEY) || 'random';
}

function saveMode(mode){ LS.set(MODE_KEY, mode); }

// Deterministic daily verse: hash YYYY-MM-DD to index
function hashStringToInt(s){
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function getDailyVerse(dateStr){
  const key = dateStr || new Date().toISOString().slice(0,10);
  const h = hashStringToInt(key);
  const idx = h % VERSES.length;
  return VERSES[idx];
}

function createCycleState() {
  return {
    seen: [],
    completedCycles: 0,
    lastResetAt: new Date().toISOString(),
  };
}

function loadCycleState() {
  const stored = LS.get(CYCLE_KEY);
  if (!stored || !Array.isArray(stored.seen)) return createCycleState();
  return stored;
}

function saveCycleState(state) {
  LS.set(CYCLE_KEY, state);
}

function resetCycle(state) {
  return {
    seen: [],
    completedCycles:
      state.seen?.length === verseCount
        ? state.completedCycles + 1
        : state.completedCycles,
    lastResetAt: new Date().toISOString(),
  };
}

function getAvailableVerses(cycleState) {
  return VERSES.filter((verse) => !cycleState.seen.includes(verse.id));
}

function getCurrentVerse() {
  return LS.get(CURRENT_KEY);
}

function saveCurrentVerse(verse) {
  LS.set(CURRENT_KEY, verse);
}

function getStats() {
  const stats = LS.get(STATS_KEY);
  if (!stats || typeof stats.readCount !== "number") {
    return {
      readCount: 0,
      currentStreak: 0,
      lastUseDate: null,
      firstUsedAt: new Date().toISOString(),
    };
  }
  return stats;
}

function saveStats(stats) {
  LS.set(STATS_KEY, stats);
}

function formatReference(verse) {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function isFavorite(verse) {
  return getFavorites().some((item) => item.id === verse.id);
}

function updateFavoriteButton(verse) {
  if (!verse) return;
  const active = isFavorite(verse);
  btnFavorite.textContent = active ? "Remover favorito" : "Favoritar";
  btnFavorite.setAttribute("aria-pressed", String(active));
}

function updateProgress(cycleState) {
  const seenCount = cycleState.seen.length;
  cycleProgress.textContent = `${seenCount} / ${verseCount} promessas exibidas`;
  if (seenCount === verseCount) {
    cycleMessage.textContent =
      "Todas as promessas foram lidas. O ciclo reiniciará no próximo clique.";
  } else {
    cycleMessage.textContent =
      "Promessas inéditas serão exibidas até completar o ciclo.";
  }
}

function showVerse(verse, cycleState) {
  if (!verse) return;
  metaEl.textContent = `Livro: ${verse.book} • Capítulo ${verse.chapter} • Versículo ${verse.verse}`;
  textEl.textContent = verse.text;
  categoryEl.textContent = verse.category || "Geral";
  refEl.textContent = formatReference(verse);
  updateFavoriteButton(verse);
  updateProgress(cycleState);
}

function updateUsageStats() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const stats = getStats();
  stats.readCount += 1;

  if (stats.lastUseDate === today) {
    // já atualizado hoje
  } else if (stats.lastUseDate && isYesterday(stats.lastUseDate, today)) {
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1;
  }

  stats.lastUseDate = today;
  if (!stats.firstUsedAt) stats.firstUsedAt = new Date().toISOString();
  saveStats(stats);
}

function isYesterday(dateString, todayString) {
  const yesterday = new Date(todayString);
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === yesterday.toISOString().slice(0, 10);
}

function markVerseSeenInCycle(verse, cycleState){
  if (!verse || !cycleState) return cycleState;
  if (!cycleState.seen.includes(verse.id)){
    cycleState.seen = [...cycleState.seen, verse.id];
    saveCycleState(cycleState);
  }
  return cycleState;
}

function pickNextVerse() {
  const mode = getMode();
  let cycleState = loadCycleState();

  if (mode === 'daily') {
    const today = new Date().toISOString().slice(0,10);
    const daily = getDailyVerse(today);
    cycleState = markVerseSeenInCycle(daily, cycleState);
    saveCurrentVerse(daily);
    addToHistory({ ...daily, shownAt: new Date().toISOString(), source: 'daily' });
    updateUsageStats();
    showVerse(daily, cycleState);
    return;
  }

  // default: random non-repeating cycle
  let available = getAvailableVerses(cycleState);

  if (available.length === 0) {
    const newState = resetCycle(cycleState);
    saveCycleState(newState);
    available = getAvailableVerses(newState);
  }

  const nextVerse = available[Math.floor(Math.random() * available.length)];
  cycleState.seen = [...cycleState.seen, nextVerse.id];
  saveCycleState(cycleState);

  saveCurrentVerse(nextVerse);
  addToHistory({ ...nextVerse, shownAt: new Date().toISOString(), source: 'random' });
  updateUsageStats();
  showVerse(nextVerse, cycleState);
}

function copyCurrentPromise() {
  const verse = getCurrentVerse();
  if (!verse) return;
  const text = `${verse.text}\n\n${formatReference(verse)}\nCategoria: ${verse.category}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      alert(
        "Não foi possível copiar automaticamente. Use Ctrl+C para copiar manualmente.",
      );
    });
  } else {
    alert(
      "A área de transferência não está disponível neste navegador. Copie manualmente o texto exibido.",
    );
  }
}

function shareCurrentPromise() {
  const verse = getCurrentVerse();
  if (!verse) return;
  const payload = {
    title: "Caixinha de Promessas",
    text: `${verse.text}\n\n${formatReference(verse)}\nCategoria: ${verse.category}`,
    url: window.location.href,
  };

  if (navigator.share) {
    navigator.share(payload).catch(() => {
      copyCurrentPromise();
    });
  } else {
    copyCurrentPromise();
    alert(
      "Compartilhamento não disponível. O texto foi copiado para a área de transferência.",
    );
  }
}

function toggleCurrentFavorite() {
  const verse = getCurrentVerse();
  if (!verse) return;
  toggleFavorite(verse);
  updateFavoriteButton(verse);
}

function initializeThemeButton() {
  const theme = LS.get("cp_theme") || "light";
  btnToggleTheme.textContent = theme === "dark" ? "Modo Claro" : "Modo Escuro";
}

function applyNextTheme() {
  const current = LS.get("cp_theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  btnToggleTheme.textContent = next === "dark" ? "Modo Claro" : "Modo Escuro";
}

function loadStoredVerse() {
  const mode = getMode();
  let cycleState = loadCycleState();
  if (mode === 'daily') {
    const today = new Date().toISOString().slice(0,10);
    const daily = getDailyVerse(today);
    cycleState = markVerseSeenInCycle(daily, cycleState);
    showVerse(daily, cycleState);
    saveCurrentVerse(daily);
    return;
  }

  const saved = getCurrentVerse();
  if (saved) {
    showVerse(saved, cycleState);
  } else {
    updateProgress(cycleState);
  }
}

loadTheme();
initializeThemeButton();
loadStoredVerse();

btnReceber?.addEventListener("click", pickNextVerse);
btnProxima?.addEventListener("click", pickNextVerse);
btnCopy?.addEventListener("click", copyCurrentPromise);
btnShare?.addEventListener("click", shareCurrentPromise);
btnFavorite?.addEventListener("click", toggleCurrentFavorite);
btnToggleTheme?.addEventListener("click", applyNextTheme);

// Mode toggle (Aleatório / Promessa do Dia)
const modeToggleBtn = document.getElementById('mode-toggle-input');
function updateModeButton(){
  if (!modeToggleBtn) return;
  const mode = getMode();
  modeToggleBtn.textContent = mode === 'daily' ? 'Promessa do Dia' : 'Aleatório';
  modeToggleBtn.setAttribute('aria-pressed', String(mode === 'daily'));
}
modeToggleBtn?.addEventListener('click', ()=>{
  const next = getMode() === 'daily' ? 'random' : 'daily';
  saveMode(next);
  updateModeButton();
  // When switching to daily show today's verse immediately
  if (next === 'daily') pickNextVerse();
});
if (modeToggleBtn) updateModeButton();

// Panel and navigation
const panel = document.getElementById('panel');
const btnHistorico = document.getElementById('btn-historico');
const btnFavoritos = document.getElementById('btn-favoritos');
const btnStats = document.getElementById('btn-stats');
const btnConfig = document.getElementById('btn-config');

function formatDate(iso){ try { const d = new Date(iso); return d.toLocaleString(); } catch(e){ return iso } }

function renderList(items, type){
  const container = document.createElement('div');
  container.className = 'panel-list';
  if (!items || items.length === 0){
    const p = document.createElement('p'); p.textContent = 'Nenhum item encontrado.'; p.className = 'muted'; container.appendChild(p); return container;
  }

  const ul = document.createElement('ul'); ul.className = 'list-unstyled'; ul.setAttribute('role','list');

  items.forEach(it => {
    const li = document.createElement('li');
    li.className = 'panel-item';
    li.tabIndex = 0;
    li.setAttribute('data-id', it.id);
    li.innerHTML = `
      <div class="item-main">
        <div class="item-title">${(it.text || '').slice(0,140)}</div>
        <div class="item-meta">${it.book} ${it.chapter}:${it.verse} • ${it.category || ''} • ${it.shownAt ? formatDate(it.shownAt) : ''}</div>
      </div>
      <div class="item-actions">
        <button class="open-btn" aria-label="Abrir">Abrir</button>
        <button class="del-btn" aria-label="Remover">Remover</button>
      </div>
    `;

    li.querySelector('.open-btn').addEventListener('click', ()=>{
      showVerse(it, loadCycleState());
      panel.hidden = true;
      saveCurrentVerse(it);
    });

    li.querySelector('.del-btn').addEventListener('click', ()=>{
      if (type === 'history') removeFromHistory(it.id);
      else if (type === 'favorites') removeFavorite(it.id);
      renderPanel(type);
    });

    ul.appendChild(li);
  });

  container.appendChild(ul);
  return container;
}

function renderPanel(type){
  panel.innerHTML = '';
  panel.hidden = false;
  panel.setAttribute('aria-hidden','false');
  const header = document.createElement('div'); header.className = 'panel-header';
  const title = document.createElement('h2'); title.className = 'panel-title';
  title.textContent = type === 'history' ? 'Histórico' : (type === 'favorites' ? 'Favoritos' : (type === 'stats' ? 'Estatísticas' : 'Configurações'));
  header.appendChild(title);

  const search = document.createElement('input');
  search.type = 'search'; search.placeholder = 'Pesquisar...'; search.className = 'panel-search';
  header.appendChild(search);

  const close = document.createElement('button'); close.textContent = 'Fechar'; close.className = 'panel-close';
  close.addEventListener('click', ()=>{ panel.hidden = true; panel.setAttribute('aria-hidden','true'); document.querySelector('.card')?.focus(); });
  header.appendChild(close);

  panel.appendChild(header);

  if (type === 'history'){
    const items = getHistory().slice().sort((a,b)=> new Date(b.shownAt) - new Date(a.shownAt));
    panel.appendChild(renderList(items, 'history'));
  } else if (type === 'favorites'){
    const items = getFavorites();
    panel.appendChild(renderList(items, 'favorites'));
  } else if (type === 'stats'){
    // build statistics UI
    const stats = getStats();
    const history = getHistory();
    const favs = getFavorites();

    const countsByCategory = history.reduce((acc, it) => { const c = it.category || 'Geral'; acc[c] = (acc[c]||0)+1; return acc; }, {});
    const topCategories = Object.entries(countsByCategory).sort((a,b)=>b[1]-a[1]).slice(0,6);

    const daysUsed = stats.firstUsedAt ? Math.max(1, Math.floor((Date.now() - new Date(stats.firstUsedAt).getTime()) / (1000*60*60*24))) : 0;

    const grid = document.createElement('div'); grid.className = 'stats-grid';

    const card1 = document.createElement('div'); card1.className = 'stat-card'; card1.innerHTML = `<h3>Total de promessas lidas</h3><p>${stats.readCount}</p>`;
    const card2 = document.createElement('div'); card2.className = 'stat-card'; card2.innerHTML = `<h3>Dias usando</h3><p>${daysUsed}</p>`;
    const card3 = document.createElement('div'); card3.className = 'stat-card'; card3.innerHTML = `<h3>Dias consecutivos</h3><p>${stats.currentStreak}</p>`;
    const card4 = document.createElement('div'); card4.className = 'stat-card'; card4.innerHTML = `<h3>Favoritos</h3><p>${favs.length}</p>`;

    const catCard = document.createElement('div'); catCard.className = 'stat-card';
    const catList = topCategories.map(c => `<div>${c[0]} — ${c[1]}</div>`).join('');
    catCard.innerHTML = `<h3>Categorias mais sorteadas</h3>${catList || '<div>Nenhuma ainda</div>'}`;

    grid.appendChild(card1); grid.appendChild(card2); grid.appendChild(card3); grid.appendChild(card4); grid.appendChild(catCard);
    panel.appendChild(grid);

  } else if (type === 'config'){
    const cfg = document.createElement('div'); cfg.className = 'panel-config';
    cfg.innerHTML = `
      <div class="cfg-row"><button id="clear-history">Limpar histórico</button></div>
      <div class="cfg-row"><button id="clear-favorites">Limpar favoritos</button></div>
      <div class="cfg-row"><button id="reset-cycle">Resetar ciclo de promessas</button></div>
      <div class="cfg-row"><button id="toggle-sounds">Ativar/Desativar sons (em breve)</button></div>
    `;
    panel.appendChild(cfg);
    panel.querySelector('#clear-history').addEventListener('click', ()=>{ clearHistory(); renderPanel('history'); });
    panel.querySelector('#clear-favorites').addEventListener('click', ()=>{ clearFavorites(); renderPanel('favorites'); });
    panel.querySelector('#reset-cycle').addEventListener('click', ()=>{ saveCycleState({seen:[], completedCycles:0, lastResetAt: new Date().toISOString()}); alert('Ciclo resetado.'); renderPanel('history'); });
  }

  // focus management: focus close button for keyboard users
  setTimeout(()=>{ close.focus(); },50);

  // pesquisa reativa
  search.addEventListener('input', (e)=>{
    const q = e.target.value;
    if (type === 'history'){
      const results = searchHistory(q).sort((a,b)=> new Date(b.shownAt)-new Date(a.shownAt));
      const list = panel.querySelector('.panel-list'); if (list) list.remove(); panel.appendChild(renderList(results,'history'));
    } else if (type === 'favorites'){
      const results = searchFavorites(q);
      const list = panel.querySelector('.panel-list'); if (list) list.remove(); panel.appendChild(renderList(results,'favorites'));
    }
  });
}

btnHistorico?.addEventListener('click', ()=> renderPanel('history'));
btnFavoritos?.addEventListener('click', ()=> renderPanel('favorites'));
btnStats?.addEventListener('click', ()=> renderPanel('stats'));
btnConfig?.addEventListener('click', ()=> renderPanel('config'));

// fechar painel com ESC
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') { panel.hidden = true; panel.setAttribute('aria-hidden','true'); } });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}
