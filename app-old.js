'use strict';

// ===== STATE =====
let state = {
  progetti: [],
  progettoAttivoId: null,
  lavori: [],
  spese: [],
  fornitori: [],
  scadenze: [],
  computoData: null
};

let lavoriFilter = 'all';
let speseFilter = 'all';
let fornitoriFilter = 'all';
let scadenzeFilter = 'all';
let currentRating = 0;
let chartSpese = null;
let chartAndamento = null;
let confirmCallback = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  setTimeout(() => {
    document.getElementById('splash-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash-screen').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      renderAll();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    }, 400);
  }, 1400);
  setupDragDrop();
});

// ===== DATA PERSISTENCE =====
function saveData() {
  localStorage.setItem('ristrutturaApp_v2', JSON.stringify(state));
}
function loadData() {
  try {
    const raw = localStorage.getItem('ristrutturaApp_v2');
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...state, ...saved };
    }
  } catch (e) {}
}

// ===== GETTERS =====
function getProgetto() {
  return state.progetti.find(p => p.id === state.progettoAttivoId) || null;
}
function getLavori() {
  return state.lavori.filter(l => l.progettoId === state.progettoAttivoId);
}
function getSpese() {
  return state.spese.filter(s => s.progettoId === state.progettoAttivoId);
}
function getFornitori() { return state.fornitori; }
function getScadenze() {
  return state.scadenze.filter(s => s.progettoId === state.progettoAttivoId);
}

// ===== NAVIGATION =====
const sectionTitles = {
  dashboard: 'Dashboard', lavori: 'Lavori', spese: 'Spese',
  computo: 'Computo Metrico', fornitori: 'Fornitori',
  scadenze: 'Scadenze', impostazioni: 'Impostazioni'
};

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  document.getElementById('page-title').textContent = sectionTitles[name] || name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'lavori') renderLavori();
  if (name === 'spese') renderSpese();
  if (name === 'fornitori') renderFornitori();
  if (name === 'scadenze') renderScadenze();
  if (name === 'impostazioni') loadImpostazioni();
}

function handleAddBtn() {
  const active = document.querySelector('.section.active');
  if (!active) return;
  const id = active.id;
  if (!getProgetto() && id !== 'section-impostazioni') {
    showToast('⚠️ Crea prima un progetto');
    showModal('modal-progetto');
    return;
  }
  if (id === 'section-lavori') openModalLavoro();
  else if (id === 'section-spese') openModalSpesa();
  else if (id === 'section-fornitori') openModalFornitore();
  else if (id === 'section-scadenze') openModalScadenza();
  else if (id === 'section-dashboard') showModal('modal-progetto');
  else if (id === 'section-computo') document.getElementById('computo-file-input').click();
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  sb.classList.toggle('hidden');
  ov.classList.toggle('hidden');
  renderSidebar();
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}
function renderSidebar() {
  const list = document.getElementById('progetti-list');
  list.innerHTML = state.progetti.map(p => `
    <li class="${p.id === state.progettoAttivoId ? 'active' : ''}" onclick="selectProgetto('${p.id}')">
      <span>🏗️</span> ${escHtml(p.nome)}
    </li>`).join('') || '<li style="color:var(--text3);font-size:13px">Nessun progetto</li>';
  const prog = getProgetto();
  document.getElementById('progetto-attivo-name').textContent = prog ? prog.nome : 'Nessun progetto';
}
function selectProgetto(id) {
  state.progettoAttivoId = id;
  saveData();
  closeSidebar();
  renderAll();
}

// ===== MODALI =====
function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ===== CONFIRM DIALOG =====
function showConfirm(title, msg, icon, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-icon').textContent = icon || '⚠️';
  confirmCallback = cb;
  document.getElementById('confirm-overlay').classList.remove('hidden');
}
function hideConfirm(confirmed) {
  document.getElementById('confirm-overlay').classList.add('hidden');
  if (confirmed && confirmCallback) confirmCallback();
  confirmCallback = null;
}

// ===== TOAST =====
let toastTimer = null;
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
}

// ===== HELPERS =====
function escHtml(s) {
  return String(s || '').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function fmtEur(n) {
  return '€\u00A0' + Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtData(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

const catIcons = {
  'Muratura':'🧱','Impianti Elettrici':'⚡','Impianti Idraulici':'🔧',
  'Pavimenti e Rivestimenti':'🪵','Serramenti':'🪟','Pittura e Intonaci':'🎨',
  'Strutture':'🏗️','Coperture':'🏠','Altro':'📦'
};
const catColors = {
  'Muratura':'#FF9500','Impianti Elettrici':'#FFCC00','Impianti Idraulici':'#007AFF',
  'Pavimenti e Rivestimenti':'#34C759','Serramenti':'#5AC8FA','Pittura e Intonaci':'#AF52DE',
  'Strutture':'#FF3B30','Coperture':'#FF6B35','Altro':'#8E8E93'
};
const spesaIcons = {
  'Materiali':'🧱','Manodopera':'👷','Noleggio':'🚜',
  'Progettazione':'📐','Permessi':'📋','Altro':'📦'
};
const spesaColors = {
  'Materiali':'rgba(255,149,0,.15)','Manodopera':'rgba(0,122,255,.15)',
  'Noleggio':'rgba(52,199,89,.15)','Progettazione':'rgba(175,82,222,.15)',
  'Permessi':'rgba(255,59,48,.15)','Altro':'rgba(142,142,147,.15)'
};
const statoLabel = { da_fare:'Da fare', in_corso:'In corso', completato:'Completato', sospeso:'Sospeso' };

// ===== RENDER ALL =====
function renderAll() {
  renderSidebar();
  renderDashboard();
}
