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

// ===== DASHBOARD =====
function renderDashboard() {
  const prog = getProgetto();
  const lavori = getLavori();
  const spese = getSpese();
  const scadenze = getScadenze();
  const totSpeso = spese.reduce((s, x) => s + Number(x.importo || 0), 0);
  const budget = prog ? Number(prog.budget || 0) : 0;
  const preventivo = lavori.reduce((s, l) => s + Number(l.preventivo || 0), 0);
  const residuo = budget - totSpeso;
  const pct = budget > 0 ? Math.min(100, (totSpeso / budget) * 100) : 0;

  document.getElementById('dash-budget-totale').textContent = fmtEur(budget);
  document.getElementById('dash-speso').textContent = fmtEur(totSpeso);
  document.getElementById('dash-residuo').textContent = fmtEur(residuo);
  document.getElementById('dash-preventivo').textContent = fmtEur(preventivo);
  document.getElementById('dash-bar-fill').style.width = pct.toFixed(1) + '%';
  document.getElementById('dash-bar-fill').style.background = pct > 90 ? '#FF3B30' : pct > 75 ? '#FFCC00' : '#fff';
  document.getElementById('dash-bar-label').textContent = pct.toFixed(0) + '% del budget utilizzato';

  document.getElementById('kpi-tot').textContent = lavori.length;
  document.getElementById('kpi-corso').textContent = lavori.filter(l => l.stato === 'in_corso').length;
  document.getElementById('kpi-ok').textContent = lavori.filter(l => l.stato === 'completato').length;
  document.getElementById('kpi-spese-n').textContent = spese.length;

  renderCatProgress(lavori);
  renderChartSpese(spese);
  renderChartAndamento(spese);
  renderDashScadenze(scadenze);
  renderDashSpese(spese);
}

function renderCatProgress(lavori) {
  const el = document.getElementById('dash-cat-progress');
  const cats = {};
  lavori.forEach(l => {
    if (!cats[l.categoria]) cats[l.categoria] = { tot: 0, done: 0 };
    cats[l.categoria].tot++;
    cats[l.categoria].done += Number(l.avanzamento || 0);
  });
  const keys = Object.keys(cats);
  if (!keys.length) { el.innerHTML = '<div class="empty-state-small">Nessun lavoro presente</div>'; return; }
  el.innerHTML = keys.map(cat => {
    const avg = cats[cat].tot > 0 ? (cats[cat].done / cats[cat].tot).toFixed(0) : 0;
    const color = catColors[cat] || '#007AFF';
    return `<div class="cat-progress-item">
      <div class="cat-progress-top">
        <span class="cat-progress-name">${catIcons[cat] || '📦'} ${escHtml(cat)}</span>
        <span class="cat-progress-pct">${avg}%</span>
      </div>
      <div class="cat-bar-wrap"><div class="cat-bar-fill" style="width:${avg}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

function renderChartSpese(spese) {
  const period = document.getElementById('chart-period')?.value || 'all';
  let filtered = spese;
  const now = new Date();
  if (period === 'month') filtered = spese.filter(s => {
    const d = new Date(s.data); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  if (period === 'week') {
    const weekAgo = new Date(now - 7 * 86400000);
    filtered = spese.filter(s => new Date(s.data) >= weekAgo);
  }
  const cats = {};
  filtered.forEach(s => { cats[s.categoria] = (cats[s.categoria] || 0) + Number(s.importo || 0); });
  const labels = Object.keys(cats);
  const vals = labels.map(k => cats[k]);
  const colors = labels.map(k => Object.keys(spesaColors).includes(k) ? spesaColors[k].replace('.15', '.8') : 'rgba(142,142,147,.8)');
  const canvas = document.getElementById('chart-spese-cat');
  if (!canvas) return;
  if (chartSpese) chartSpese.destroy();
  if (!labels.length) { canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); return; }
  chartSpese = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } } }
    }
  });
}

function renderChartAndamento(spese) {
  const canvas = document.getElementById('chart-andamento');
  if (!canvas) return;
  const sorted = [...spese].sort((a, b) => new Date(a.data) - new Date(b.data));
  const monthly = {};
  sorted.forEach(s => {
    if (!s.data) return;
    const d = new Date(s.data);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    monthly[key] = (monthly[key] || 0) + Number(s.importo || 0);
  });
  const labels = Object.keys(monthly).sort();
  const vals = labels.map(k => monthly[k]);
  if (chartAndamento) chartAndamento.destroy();
  if (!labels.length) { canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); return; }
  chartAndamento = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.map(l => { const [y,m] = l.split('-'); return new Date(y,m-1).toLocaleDateString('it-IT',{month:'short',year:'2-digit'}); }),
      datasets: [{ data: vals, backgroundColor: 'rgba(0,122,255,.7)', borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '€' + v.toLocaleString('it-IT') }, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderDashScadenze(scadenze) {
  const el = document.getElementById('dash-scadenze');
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = scadenze
    .filter(s => s.data)
    .sort((a,b) => new Date(a.data) - new Date(b.data))
    .slice(0, 4);
  if (!upcoming.length) { el.innerHTML = '<div class="empty-state-small">Nessuna scadenza impostata</div>'; return; }
  el.innerHTML = upcoming.map(s => {
    const diff = daysDiff(s.data);
    let cls = 'green', badge = 'Futura';
    if (diff < 0) { cls = 'red'; badge = 'Scaduta'; }
    else if (diff === 0) { cls = 'orange'; badge = 'Oggi!'; }
    else if (diff <= 3) { cls = 'orange'; badge = diff + ' gg'; }
    else { badge = diff + ' gg'; }
    return `<div class="scadenza-mini">
      <div class="scad-dot ${cls}"></div>
      <div class="scad-info">
        <div class="scad-title">${escHtml(s.titolo)}</div>
        <div class="scad-date">${fmtData(s.data)}</div>
      </div>
      <span class="scad-badge ${cls}">${badge}</span>
    </div>`;
  }).join('');
}

function renderDashSpese(spese) {
  const el = document.getElementById('dash-ultime-spese');
  const last = [...spese].sort((a,b) => new Date(b.data) - new Date(a.data)).slice(0,4);
  if (!last.length) { el.innerHTML = '<div class="empty-state-small">Nessuna spesa registrata</div>'; return; }
  el.innerHTML = last.map(s => {
    const bg = spesaColors[s.categoria] || 'rgba(142,142,147,.15)';
    return `<div class="spesa-mini">
      <div class="spesa-cat-dot" style="background:${bg}">${spesaIcons[s.categoria] || '📦'}</div>
      <div class="spesa-info">
        <div class="spesa-desc">${escHtml(s.descrizione)}</div>
        <div class="spesa-meta">${escHtml(s.categoria)} · ${fmtData(s.data)}</div>
      </div>
      <div class="spesa-amount">${fmtEur(s.importo)}</div>
    </div>`;
  }).join('');
}

// ===== LAVORI =====
function openModalLavoro(id) {
  document.getElementById('modal-lavoro-title').textContent = id ? 'Modifica Lavoro' : 'Nuovo Lavoro';
  const forn = getFornitori();
  const sel = document.getElementById('lav-fornitore');
  sel.innerHTML = '<option value="">-- Nessuno --</option>' + forn.map(f => `<option value="${f.id}">${escHtml(f.nome)}</option>`).join('');
  if (id) {
    const l = state.lavori.find(x => x.id === id);
    if (!l) return;
    document.getElementById('lav-id').value = id;
    document.getElementById('lav-nome').value = l.nome;
    document.getElementById('lav-categoria').value = l.categoria;
    document.getElementById('lav-stato').value = l.stato;
    document.getElementById('lav-preventivo').value = l.preventivo || '';
    document.getElementById('lav-avanzamento').value = l.avanzamento || 0;
    document.getElementById('lav-data-inizio').value = l.dataInizio || '';
    document.getElementById('lav-data-fine').value = l.dataFine || '';
    document.getElementById('lav-fornitore').value = l.fornitoreId || '';
    document.getElementById('lav-priorita').value = l.priorita || 'normale';
    document.getElementById('lav-note').value = l.note || '';
  } else {
    document.getElementById('lav-id').value = '';
    document.getElementById('lav-nome').value = '';
    document.getElementById('lav-categoria').value = 'Muratura';
    document.getElementById('lav-stato').value = 'da_fare';
    document.getElementById('lav-preventivo').value = '';
    document.getElementById('lav-avanzamento').value = 0;
    document.getElementById('lav-data-inizio').value = '';
    document.getElementById('lav-data-fine').value = '';
    document.getElementById('lav-fornitore').value = '';
    document.getElementById('lav-priorita').value = 'normale';
    document.getElementById('lav-note').value = '';
  }
  showModal('modal-lavoro');
}

function salvaLavoro() {
  const nome = document.getElementById('lav-nome').value.trim();
  if (!nome) { showToast('⚠️ Inserisci il nome del lavoro'); return; }
  const id = document.getElementById('lav-id').value;
  const obj = {
    id: id || uid(),
    progettoId: state.progettoAttivoId,
    nome,
    categoria: document.getElementById('lav-categoria').value,
    stato: document.getElementById('lav-stato').value,
    preventivo: parseFloat(document.getElementById('lav-preventivo').value) || 0,
    avanzamento: Math.min(100, Math.max(0, parseInt(document.getElementById('lav-avanzamento').value) || 0)),
    dataInizio: document.getElementById('lav-data-inizio').value,
    dataFine: document.getElementById('lav-data-fine').value,
    fornitoreId: document.getElementById('lav-fornitore').value,
    priorita: document.getElementById('lav-priorita').value,
    note: document.getElementById('lav-note').value.trim(),
    createdAt: id ? (state.lavori.find(l => l.id === id)?.createdAt || Date.now()) : Date.now()
  };
  if (obj.stato === 'completato') obj.avanzamento = 100;
  if (id) {
    const i = state.lavori.findIndex(l => l.id === id);
    if (i >= 0) state.lavori[i] = obj;
  } else {
    state.lavori.push(obj);
  }
  saveData();
  hideModal('modal-lavoro');
  renderLavori();
  renderDashboard();
  showToast(id ? '✅ Lavoro aggiornato' : '✅ Lavoro aggiunto');
}

function renderLavori() {
  const lavori = getLavori();
  const q = document.getElementById('lavori-search')?.value.toLowerCase() || '';
  let filtered = lavori;
  if (lavoriFilter !== 'all') filtered = filtered.filter(l => l.stato === lavoriFilter);
  if (q) filtered = filtered.filter(l => l.nome.toLowerCase().includes(q) || l.categoria.toLowerCase().includes(q));
  filtered.sort((a, b) => {
    const pri = { alta: 0, normale: 1, bassa: 2 };
    return (pri[a.priorita] || 1) - (pri[b.priorita] || 1);
  });
  const el = document.getElementById('lavori-list');
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔨</div><h3>Nessun lavoro trovato</h3><p>Tocca + per aggiungere un nuovo lavoro</p></div>`;
    return;
  }
  el.innerHTML = filtered.map(l => {
    const forn = l.fornitoreId ? state.fornitori.find(f => f.id === l.fornitoreId) : null;
    const color = catColors[l.categoria] || '#8E8E93';
    return `<div class="lavoro-card" onclick="showDettaglioLavoro('${l.id}')">
      <div class="lavoro-card-top">
        <div class="lavoro-card-icon" style="background:${color}22">${catIcons[l.categoria] || '📦'}</div>
        <div class="lavoro-card-info">
          <div class="lavoro-card-name">${escHtml(l.nome)}</div>
          <div class="lavoro-card-cat">${escHtml(l.categoria)}${forn ? ' · ' + escHtml(forn.nome) : ''}</div>
        </div>
        <div class="lavoro-card-right">
          <span class="stato-badge ${l.stato}">${statoLabel[l.stato]}</span>
          <div class="priorita-dot ${l.priorita || 'normale'}"></div>
        </div>
      </div>
      <div class="lavoro-progress-row">
        <div class="lavoro-prog-bar"><div class="lavoro-prog-fill" style="width:${l.avanzamento||0}%;background:${color}"></div></div>
        <span class="lavoro-prog-pct">${l.avanzamento||0}%</span>
      </div>
      <div class="lavoro-card-footer">
        <div class="lavoro-preventivo">Preventivo: <strong>${fmtEur(l.preventivo)}</strong></div>
        <div class="lavoro-date">${l.dataFine ? 'Entro: ' + fmtData(l.dataFine) : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function setLavoriFilter(f, btn) {
  lavoriFilter = f;
  document.querySelectorAll('.filter-chips .chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLavori();
}

function showDettaglioLavoro(id) {
  const l = state.lavori.find(x => x.id === id);
  if (!l) return;
  const spese = getSpese().filter(s => s.lavoroId === id);
  const forn = l.fornitoreId ? state.fornitori.find(f => f.id === l.fornitoreId) : null;
  const color = catColors[l.categoria] || '#8E8E93';
  const totSpeso = spese.reduce((s,x) => s + Number(x.importo||0), 0);
  document.getElementById('det-lav-title').textContent = l.nome;
  document.getElementById('det-lav-body').innerHTML = `
    <div class="det-lav-header">
      <div class="det-lav-ico" style="background:${color}22">${catIcons[l.categoria]||'📦'}</div>
      <div>
        <div class="det-lav-name">${escHtml(l.nome)}</div>
        <div class="det-lav-cat">${escHtml(l.categoria)}</div>
        <span class="stato-badge ${l.stato}" style="margin-top:4px;display:inline-block">${statoLabel[l.stato]}</span>
      </div>
    </div>
    <div class="lavoro-progress-row" style="margin-bottom:16px">
      <div class="lavoro-prog-bar"><div class="lavoro-prog-fill" style="width:${l.avanzamento||0}%;background:${color}"></div></div>
      <span class="lavoro-prog-pct">${l.avanzamento||0}%</span>
    </div>
    <div class="det-info-grid">
      <div class="det-info-item"><div class="det-info-label">Preventivo</div><div class="det-info-val">${fmtEur(l.preventivo)}</div></div>
      <div class="det-info-item"><div class="det-info-label">Speso</div><div class="det-info-val" style="color:var(--red)">${fmtEur(totSpeso)}</div></div>
      <div class="det-info-item"><div class="det-info-label">Inizio</div><div class="det-info-val">${fmtData(l.dataInizio)}</div></div>
      <div class="det-info-item"><div class="det-info-label">Fine Prevista</div><div class="det-info-val">${fmtData(l.dataFine)}</div></div>
      <div class="det-info-item"><div class="det-info-label">Priorità</div><div class="det-info-val">${l.priorita||'Normale'}</div></div>
      <div class="det-info-item"><div class="det-info-label">Fornitore</div><div class="det-info-val">${forn ? escHtml(forn.nome) : '—'}</div></div>
    </div>
    ${l.note ? `<div class="det-section-title">Note</div><div class="det-note">${escHtml(l.note)}</div>` : ''}
    ${spese.length ? `<div class="det-section-title">Spese associate (${spese.length})</div><div class="det-spese-list">${spese.map(s=>`<div class="spesa-mini"><div class="spesa-cat-dot" style="background:${spesaColors[s.categoria]||'rgba(142,142,147,.15)'}">${spesaIcons[s.categoria]||'📦'}</div><div class="spesa-info"><div class="spesa-desc">${escHtml(s.descrizione)}</div><div class="spesa-meta">${fmtData(s.data)}</div></div><div class="spesa-amount">${fmtEur(s.importo)}</div></div>`).join('')}</div>` : ''}
  `;
  document.getElementById('det-lav-edit-btn').onclick = () => { hideModal('modal-dettaglio-lavoro'); openModalLavoro(id); };
  showModal('modal-dettaglio-lavoro');
}

function eliminaLavoro(id) {
  showConfirm('Elimina Lavoro', 'Vuoi eliminare questo lavoro? Le spese associate rimarranno.', '🗑️', () => {
    state.lavori = state.lavori.filter(l => l.id !== id);
    saveData(); hideModal('modal-dettaglio-lavoro'); renderLavori(); renderDashboard();
    showToast('🗑️ Lavoro eliminato');
  });
}

// ===== SPESE =====
function openModalSpesa(id) {
  document.getElementById('modal-spesa-title').textContent = id ? 'Modifica Spesa' : 'Nuova Spesa';
  const lavori = getLavori();
  const forn = getFornitori();
  document.getElementById('sp-lavoro').innerHTML = '<option value="">-- Nessuno --</option>' + lavori.map(l=>`<option value="${l.id}">${escHtml(l.nome)}</option>`).join('');
  document.getElementById('sp-fornitore').innerHTML = '<option value="">-- Nessuno --</option>' + forn.map(f=>`<option value="${f.id}">${escHtml(f.nome)}</option>`).join('');
  if (id) {
    const s = state.spese.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sp-id').value = id;
    document.getElementById('sp-desc').value = s.descrizione;
    document.getElementById('sp-importo').value = s.importo;
    document.getElementById('sp-categoria').value = s.categoria;
    document.getElementById('sp-data').value = s.data || '';
    document.getElementById('sp-lavoro').value = s.lavoroId || '';
    document.getElementById('sp-fornitore').value = s.fornitoreId || '';
    document.getElementById('sp-pagamento').value = s.pagamento || 'Bonifico';
    document.getElementById('sp-ricevuta').checked = !!s.ricevuta;
    document.getElementById('sp-note').value = s.note || '';
  } else {
    document.getElementById('sp-id').value = '';
    document.getElementById('sp-desc').value = '';
    document.getElementById('sp-importo').value = '';
    document.getElementById('sp-categoria').value = 'Materiali';
    document.getElementById('sp-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('sp-lavoro').value = '';
    document.getElementById('sp-fornitore').value = '';
    document.getElementById('sp-pagamento').value = 'Bonifico';
    document.getElementById('sp-ricevuta').checked = false;
    document.getElementById('sp-note').value = '';
  }
  showModal('modal-spesa');
}

function salvaSpesa() {
  const desc = document.getElementById('sp-desc').value.trim();
  const importo = parseFloat(document.getElementById('sp-importo').value);
  if (!desc) { showToast('⚠️ Inserisci la descrizione'); return; }
  if (isNaN(importo) || importo <= 0) { showToast('⚠️ Inserisci un importo valido'); return; }
  const id = document.getElementById('sp-id').value;
  const obj = {
    id: id || uid(), progettoId: state.progettoAttivoId,
    descrizione: desc, importo,
    categoria: document.getElementById('sp-categoria').value,
    data: document.getElementById('sp-data').value,
    lavoroId: document.getElementById('sp-lavoro').value,
    fornitoreId: document.getElementById('sp-fornitore').value,
    pagamento: document.getElementById('sp-pagamento').value,
    ricevuta: document.getElementById('sp-ricevuta').checked,
    note: document.getElementById('sp-note').value.trim(),
    createdAt: id ? (state.spese.find(s=>s.id===id)?.createdAt||Date.now()) : Date.now()
  };
  if (id) { const i = state.spese.findIndex(s=>s.id===id); if(i>=0) state.spese[i]=obj; }
  else state.spese.push(obj);
  saveData(); hideModal('modal-spesa'); renderSpese(); renderDashboard();
  showToast(id ? '✅ Spesa aggiornata' : '✅ Spesa aggiunta');
}

function renderSpese() {
  const spese = getSpese();
  const q = document.getElementById('spese-search')?.value.toLowerCase() || '';
  let filtered = spese;
  if (speseFilter !== 'all') filtered = filtered.filter(s => s.categoria === speseFilter);
  if (q) filtered = filtered.filter(s => s.descrizione.toLowerCase().includes(q));
  filtered.sort((a,b) => new Date(b.data) - new Date(a.data));
  const totale = filtered.reduce((s,x) => s+Number(x.importo||0), 0);
  const totTutte = spese.reduce((s,x) => s+Number(x.importo||0), 0);
  document.getElementById('spese-summary').innerHTML = `
    <div class="spese-sum-item"><div class="spese-sum-label">Totale Spese</div><div class="spese-sum-val">${fmtEur(totTutte)}</div></div>
    <div class="spese-sum-item"><div class="spese-sum-label">Filtrate</div><div class="spese-sum-val">${fmtEur(totale)}</div></div>
    <div class="spese-sum-item"><div class="spese-sum-label">N° Spese</div><div class="spese-sum-val">${filtered.length}</div></div>
    <div class="spese-sum-item"><div class="spese-sum-label">Media</div><div class="spese-sum-val">${filtered.length ? fmtEur(totale/filtered.length) : '€ 0,00'}</div></div>
  `;
  const el = document.getElementById('spese-list');
  if (!filtered.length) { el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧾</div><h3>Nessuna spesa trovata</h3><p>Tocca + per registrare una spesa</p></div>`; return; }
  el.innerHTML = filtered.map(s => {
    const bg = spesaColors[s.categoria] || 'rgba(142,142,147,.15)';
    const lav = s.lavoroId ? state.lavori.find(l=>l.id===s.lavoroId) : null;
    return `<div class="spesa-card">
      <div class="spesa-card-top">
        <div class="spesa-card-icon" style="background:${bg}">${spesaIcons[s.categoria]||'📦'}</div>
        <div class="spesa-card-info">
          <div class="spesa-card-desc">${escHtml(s.descrizione)}</div>
          <div class="spesa-card-meta">${escHtml(s.categoria)}${lav?' · '+escHtml(lav.nome):''} · ${fmtData(s.data)}</div>
        </div>
        <div class="spesa-card-amount">${fmtEur(s.importo)}</div>
      </div>
      <div class="spesa-card-footer">
        <div class="spesa-card-tags">
          <span class="tag">${escHtml(s.pagamento||'—')}</span>
          ${s.ricevuta ? '<span class="tag ricevuta">📄 Ricevuta</span>' : ''}
        </div>
        <div class="spesa-card-actions">
          <button class="action-btn" onclick="openModalSpesa('${s.id}');event.stopPropagation()">✏️</button>
          <button class="action-btn" onclick="eliminaSpesa('${s.id}');event.stopPropagation()">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function setSpeseFilter(f, btn) {
  speseFilter = f;
  document.querySelectorAll('#section-spese .filter-chips .chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderSpese();
}

function eliminaSpesa(id) {
  showConfirm('Elimina Spesa', 'Eliminare questa spesa?', '🗑️', () => {
    state.spese = state.spese.filter(s=>s.id!==id);
    saveData(); renderSpese(); renderDashboard(); showToast('🗑️ Spesa eliminata');
  });
}

// ===== FORNITORI =====
function openModalFornitore(id) {
  document.getElementById('modal-fornitore-title').textContent = id ? 'Modifica Fornitore' : 'Nuovo Fornitore';
  currentRating = 0;
  if (id) {
    const f = state.fornitori.find(x=>x.id===id);
    if (!f) return;
    document.getElementById('forn-id').value = id;
    document.getElementById('forn-nome').value = f.nome;
    document.getElementById('forn-tipo').value = f.tipo;
    document.getElementById('forn-tel').value = f.tel || '';
    document.getElementById('forn-email').value = f.email || '';
    document.getElementById('forn-piva').value = f.piva || '';
    document.getElementById('forn-note').value = f.note || '';
    currentRating = f.rating || 0;
  } else {
    document.getElementById('forn-id').value = '';
    document.getElementById('forn-nome').value = '';
    document.getElementById('forn-tipo').value = 'Muratore';
    document.getElementById('forn-tel').value = '';
    document.getElementById('forn-email').value = '';
    document.getElementById('forn-piva').value = '';
    document.getElementById('forn-note').value = '';
    currentRating = 0;
  }
  document.getElementById('forn-rating').value = currentRating;
  updateStars(currentRating);
  showModal('modal-fornitore');
}

function setRating(n) { currentRating = n; document.getElementById('forn-rating').value = n; updateStars(n); }
function updateStars(n) {
  document.querySelectorAll('#forn-rating-wrap .star').forEach((s,i) => s.classList.toggle('on', i < n));
}

function salvaFornitore() {
  const nome = document.getElementById('forn-nome').value.trim();
  if (!nome) { showToast('⚠️ Inserisci il nome'); return; }
  const id = document.getElementById('forn-id').value;
  const obj = {
    id: id || uid(), nome,
    tipo: document.getElementById('forn-tipo').value,
    tel: document.getElementById('forn-tel').value.trim(),
    email: document.getElementById('forn-email').value.trim(),
    piva: document.getElementById('forn-piva').value.trim(),
    rating: currentRating,
    note: document.getElementById('forn-note').value.trim(),
    createdAt: id ? (state.fornitori.find(f=>f.id===id)?.createdAt||Date.now()) : Date.now()
  };
  if (id) { const i = state.fornitori.findIndex(f=>f.id===id); if(i>=0) state.fornitori[i]=obj; }
  else state.fornitori.push(obj);
  saveData(); hideModal('modal-fornitore'); renderFornitori();
  showToast(id ? '✅ Fornitore aggiornato' : '✅ Fornitore aggiunto');
}

function renderFornitori() {
  const q = document.getElementById('fornitori-search')?.value.toLowerCase() || '';
  let list = getFornitori();
  if (fornitoriFilter !== 'all') list = list.filter(f=>f.tipo===fornitoriFilter);
  if (q) list = list.filter(f=>f.nome.toLowerCase().includes(q)||(f.tipo||'').toLowerCase().includes(q));
  const el = document.getElementById('fornitori-list');
  if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👷</div><h3>Nessun fornitore</h3><p>Tocca + per aggiungere un fornitore</p></div>`; return; }
  el.innerHTML = list.map(f => {
    const stars = Array.from({length:5},(_,i)=>`<span class="forn-star${i<f.rating?' on':''}" >★</span>`).join('');
    const lav = state.lavori.filter(l=>l.fornitoreId===f.id && l.progettoId===state.progettoAttivoId).length;
    return `<div class="fornitore-card">
      <div class="forn-top">
        <div class="forn-avatar">${f.nome.charAt(0).toUpperCase()}</div>
        <div class="forn-info">
          <div class="forn-nome">${escHtml(f.nome)}</div>
          <div class="forn-tipo">${escHtml(f.tipo)}</div>
        </div>
        <div class="forn-actions">
          ${f.tel?`<button class="forn-contact-btn" onclick="window.location='tel:${f.tel}'">📞</button>`:''}
          <button class="forn-contact-btn" onclick="openModalFornitore('${f.id}')">✏️</button>
        </div>
      </div>
      <div class="forn-rating">${stars}</div>
      <div class="forn-footer">
        <span>${lav} lavori assegnati</span>
        ${f.email?`<span>${escHtml(f.email)}</span>`:''}
      </div>
    </div>`;
  }).join('');
}

function setFornitoriFilter(f, btn) {
  fornitoriFilter = f;
  document.querySelectorAll('#section-fornitori .filter-chips .chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFornitori();
}

function eliminaFornitore(id) {
  showConfirm('Elimina Fornitore', 'Eliminare questo fornitore?', '🗑️', () => {
    state.fornitori = state.fornitori.filter(f => f.id !== id);
    saveData(); renderFornitori(); showToast('🗑️ Fornitore eliminato');
  });
}

// ===== SCADENZE =====
function openModalScadenza(id) {
  document.getElementById('modal-scadenza-title').textContent = id ? 'Modifica Scadenza' : 'Nuova Scadenza';
  const lavori = getLavori();
  document.getElementById('sc-lavoro').innerHTML = '<option value="">-- Nessuno --</option>' + lavori.map(l => `<option value="${l.id}">${escHtml(l.nome)}</option>`).join('');
  if (id) {
    const s = state.scadenze.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sc-id').value = id;
    document.getElementById('sc-titolo').value = s.titolo;
    document.getElementById('sc-data').value = s.data || '';
    document.getElementById('sc-tipo').value = s.tipo || 'lavoro';
    document.getElementById('sc-lavoro').value = s.lavoroId || '';
    document.getElementById('sc-note').value = s.note || '';
  } else {
    document.getElementById('sc-id').value = '';
    document.getElementById('sc-titolo').value = '';
    document.getElementById('sc-data').value = '';
    document.getElementById('sc-tipo').value = 'lavoro';
    document.getElementById('sc-lavoro').value = '';
    document.getElementById('sc-note').value = '';
  }
  showModal('modal-scadenza');
}

function salvaScadenza() {
  const titolo = document.getElementById('sc-titolo').value.trim();
  const data = document.getElementById('sc-data').value;
  if (!titolo) { showToast('⚠️ Inserisci il titolo'); return; }
  if (!data) { showToast('⚠️ Inserisci la data'); return; }
  const id = document.getElementById('sc-id').value;
  const obj = {
    id: id || uid(), progettoId: state.progettoAttivoId,
    titolo, data,
    tipo: document.getElementById('sc-tipo').value,
    lavoroId: document.getElementById('sc-lavoro').value,
    note: document.getElementById('sc-note').value.trim(),
    createdAt: id ? (state.scadenze.find(s => s.id === id)?.createdAt || Date.now()) : Date.now()
  };
  if (id) { const i = state.scadenze.findIndex(s => s.id === id); if (i >= 0) state.scadenze[i] = obj; }
  else state.scadenze.push(obj);
  saveData(); hideModal('modal-scadenza'); renderScadenze(); renderDashboard();
  showToast(id ? '✅ Scadenza aggiornata' : '✅ Scadenza aggiunta');
}

function renderScadenze() {
  let list = getScadenze().filter(s => s.data).sort((a, b) => new Date(a.data) - new Date(b.data));
  if (scadenzeFilter === 'upcoming') list = list.filter(s => daysDiff(s.data) >= 0 && daysDiff(s.data) <= 7);
  if (scadenzeFilter === 'scaduta') list = list.filter(s => daysDiff(s.data) < 0);
  const el = document.getElementById('scadenze-list');
  if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Nessuna scadenza</h3><p>Tocca + per aggiungere una scadenza</p></div>`; return; }
  el.innerHTML = list.map(s => {
    const diff = daysDiff(s.data);
    let cls = '', daysStr = '';
    if (diff < 0) { cls = 'scaduta'; daysStr = `<span class="scad-days red">Scaduta ${Math.abs(diff)} gg fa</span>`; }
    else if (diff === 0) { cls = 'oggi'; daysStr = `<span class="scad-days orange">Oggi!</span>`; }
    else if (diff <= 3) { daysStr = `<span class="scad-days orange">Tra ${diff} gg</span>`; }
    else { daysStr = `<span class="scad-days green">Tra ${diff} gg</span>`; }
    const lav = s.lavoroId ? state.lavori.find(l => l.id === s.lavoroId) : null;
    const tipoIcons = { lavoro:'🔨', pagamento:'💰', consegna:'📦', collaudo:'🔍', pratica:'📋', altro:'📌' };
    return `<div class="scadenza-card ${cls}">
      <div class="scad-card-top">
        <div class="scad-card-info">
          <div class="scad-card-title">${tipoIcons[s.tipo]||'📌'} ${escHtml(s.titolo)}</div>
          <div class="scad-card-sub">${fmtData(s.data)}${lav ? ' · ' + escHtml(lav.nome) : ''}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="action-btn" onclick="openModalScadenza('${s.id}')">✏️</button>
          <button class="action-btn" onclick="eliminaScadenza('${s.id}')">🗑️</button>
        </div>
      </div>
      <div class="scad-card-footer">
        ${daysStr}
        ${s.note ? `<span style="font-size:12px;color:var(--text3)">${escHtml(s.note)}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function setScadenzeFilter(f, btn) {
  scadenzeFilter = f;
  document.querySelectorAll('#section-scadenze .filter-chips .chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderScadenze();
}

function eliminaScadenza(id) {
  showConfirm('Elimina Scadenza', 'Eliminare questa scadenza?', '🗑️', () => {
    state.scadenze = state.scadenze.filter(s => s.id !== id);
    saveData(); renderScadenze(); renderDashboard(); showToast('🗑️ Scadenza eliminata');
  });
}

// ===== PROGETTI =====
function salvaProgetto() {
  const nome = document.getElementById('prog-nome').value.trim();
  if (!nome) { showToast('⚠️ Inserisci il nome del progetto'); return; }
  const obj = {
    id: uid(), nome,
    indirizzo: document.getElementById('prog-indirizzo').value.trim(),
    budget: parseFloat(document.getElementById('prog-budget').value) || 0,
    dataInizio: document.getElementById('prog-data-inizio').value,
    dataFine: document.getElementById('prog-data-fine').value,
    note: document.getElementById('prog-note').value.trim(),
    createdAt: Date.now()
  };
  state.progetti.push(obj);
  state.progettoAttivoId = obj.id;
  saveData(); hideModal('modal-progetto'); renderAll();
  showToast('✅ Progetto creato: ' + nome);
}

function loadImpostazioni() {
  const p = getProgetto();
  if (!p) return;
  document.getElementById('imp-nome').value = p.nome || '';
  document.getElementById('imp-indirizzo').value = p.indirizzo || '';
  document.getElementById('imp-budget').value = p.budget || '';
  document.getElementById('imp-data-inizio').value = p.dataInizio || '';
  document.getElementById('imp-data-fine').value = p.dataFine || '';
  document.getElementById('imp-note').value = p.note || '';
}

function salvaImpostazioni() {
  const p = getProgetto();
  if (!p) { showToast('⚠️ Nessun progetto attivo'); return; }
  p.nome = document.getElementById('imp-nome').value.trim() || p.nome;
  p.indirizzo = document.getElementById('imp-indirizzo').value.trim();
  p.budget = parseFloat(document.getElementById('imp-budget').value) || 0;
  p.dataInizio = document.getElementById('imp-data-inizio').value;
  p.dataFine = document.getElementById('imp-data-fine').value;
  p.note = document.getElementById('imp-note').value.trim();
  saveData(); renderAll(); showToast('✅ Impostazioni salvate');
}

function eliminaProgettoCorrente() {
  const p = getProgetto();
  if (!p) return;
  showConfirm('Elimina Progetto', `Eliminare "${p.nome}" e tutti i suoi dati?`, '🗑️', () => {
    state.progetti = state.progetti.filter(x => x.id !== p.id);
    state.lavori = state.lavori.filter(l => l.progettoId !== p.id);
    state.spese = state.spese.filter(s => s.progettoId !== p.id);
    state.scadenze = state.scadenze.filter(s => s.progettoId !== p.id);
    state.progettoAttivoId = state.progetti[0]?.id || null;
    saveData(); renderAll(); showSection('dashboard');
    showToast('🗑️ Progetto eliminato');
  });
}

function resetApp() {
  showConfirm('Reset App', 'Eliminare TUTTI i dati? Questa azione è irreversibile!', '⚠️', () => {
    localStorage.removeItem('ristrutturaApp_v2');
    location.reload();
  });
}

// ===== COMPUTO METRICO =====
function setupDragDrop() {
  const zone = document.getElementById('computo-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processComputoFile(file);
  });
}

function importComputo(event) {
  const file = event.target.files[0];
  if (file) processComputoFile(file);
  event.target.value = '';
}

function processComputoFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  document.getElementById('computo-file-name').textContent = file.name;
  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => parseCSV(e.target.result, file.name);
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => parseExcel(e.target.result, file.name);
    reader.readAsArrayBuffer(file);
  } else if (ext === 'pdf') {
    parsePDF(file);
  } else {
    showToast('⚠️ Formato non supportato');
  }
}

// ===== PDF PARSER - Formato Computo Metrico Italiano =====
async function parsePDF(file) {
  showToast('⏳ Lettura PDF in corso...', 5000);
  try {
    // Imposta worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Raccoglie items con posizione Y per ricostruire le righe
      const items = content.items.map(item => ({
        text: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5])
      }));
      // Raggruppa per riga (stessa Y ± 4px)
      const lines = [];
      items.forEach(item => {
        if (!item.text.trim()) return;
        const existing = lines.find(l => Math.abs(l.y - item.y) <= 4);
        if (existing) {
          existing.items.push(item);
        } else {
          lines.push({ y: item.y, items: [item] });
        }
      });
      // Ordina righe per Y decrescente (top -> bottom nel PDF)
      lines.sort((a, b) => b.y - a.y);
      lines.forEach(line => {
        line.items.sort((a, b) => a.x - b.x);
        fullText += line.items.map(i => i.text).join(' ') + '\n';
      });
      fullText += '\n';
    }
    const rows = parsePDFComputoText(fullText, file.name);
    if (rows.length > 0) {
      showComputoPreview(['N.', 'Descrizione', 'Unità', 'Quantità', 'Prezzo Unit.', 'Importo'], rows, file.name);
    } else {
      showToast('⚠️ Nessuna voce trovata nel PDF. Prova con CSV/Excel.');
    }
  } catch(err) {
    console.error('PDF parse error:', err);
    showToast('⚠️ Errore lettura PDF: ' + err.message);
  }
}

function parsePDFComputoText(text, filename) {
  const rows = [];
  const lines = text.split('\n');

  // Regex per trovare importi in euro: € 1.234,00 oppure 1.234,00 oppure 1234,00
  const importoRegex = /€?\s*([\d\.]+,\d{2})/g;
  // Regex per numero di voce all'inizio riga (es: "1", "2", "10", "N. 3")
  const numVoceRegex = /^(\d{1,3})\s+(.+)/;

  let currentVoce = null;
  let currentDesc = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Salta righe di intestazione/footer
    if (/impresa edile|via a\.|afragola|comune di|provincia|computo metrico|preventivo|committente|l.impresa|timbro|firma|pagamento|inizio lavori|durata|oneri/i.test(line)) continue;
    if (/^\s*n\.\s*descrizione/i.test(line)) continue;

    // Cerca riga con numero voce all'inizio
    const numMatch = line.match(numVoceRegex);
    if (numMatch) {
      // Salva voce precedente
      if (currentVoce) {
        const row = buildVoceRow(currentVoce, currentDesc.join(' '));
        if (row) rows.push(row);
      }
      currentVoce = { num: numMatch[1], line: line };
      currentDesc = [numMatch[2]];
    } else if (currentVoce) {
      // Continuazione descrizione o riga con importo
      const importoMatches = [...line.matchAll(importoRegex)];
      if (importoMatches.length > 0) {
        // Questa riga contiene l'importo finale
        const lastImporto = importoMatches[importoMatches.length - 1][1];
        currentVoce.importo = parseImporto(lastImporto);
        // Potrebbe contenere anche unità e prezzo unitario
        if (importoMatches.length >= 2) {
          currentVoce.prezzoUnit = parseImporto(importoMatches[importoMatches.length - 2][1]);
        }
        // Cerca quantità e unità nella riga (es: "Mq. 202,0" o "N. 11" o "A corpo")
        const qtaMatch = line.match(/(Mq\.?|Ml\.?|mc\.?|N\.?|A corpo|corpo)\s*([\d,\.]+)?/i);
        if (qtaMatch) {
          currentVoce.unita = qtaMatch[1].replace('.','');
          currentVoce.qta = qtaMatch[2] ? parseImporto(qtaMatch[2]) : 1;
        }
        // Aggiungi testo prima dell'importo alla descrizione
        const beforeImporto = line.split(importoMatches[0][0])[0].trim();
        if (beforeImporto && !/^[€\s\d,\.]+$/.test(beforeImporto)) {
          currentDesc.push(beforeImporto);
        }
        const row = buildVoceRow(currentVoce, currentDesc.join(' '));
        if (row) rows.push(row);
        currentVoce = null;
        currentDesc = [];
      } else {
        // Riga di continuazione descrizione
        currentDesc.push(line);
        // Cerca unità/quantità nella continuazione
        const qtaMatch = line.match(/(Mq\.?|Ml\.?|mc\.?|N\.?|A corpo|corpo)\s*([\d,\.]+)?/i);
        if (qtaMatch && !currentVoce.unita) {
          currentVoce.unita = qtaMatch[1].replace('.','');
          currentVoce.qta = qtaMatch[2] ? parseImporto(qtaMatch[2]) : 1;
        }
      }
    } else {
      // Cerca righe con solo importo (per totali SAL ecc.)
      if (/TOTALE|IVA|S\.?A\.?L/i.test(line)) {
        const importoMatches = [...line.matchAll(importoRegex)];
        if (importoMatches.length > 0) {
          const imp = parseImporto(importoMatches[importoMatches.length - 1][1]);
          // Aggiunge info SAL come voce speciale
          if (/S\.?A\.?L/i.test(line)) {
            rows.push({
              'N.': 'SAL',
              'Descrizione': line.replace(/€?\s*[\d\.]+,\d{2}/g, '').trim(),
              'Unità': '',
              'Quantità': '',
              'Prezzo Unit.': '',
              'Importo': fmtEur(imp),
              _importo: imp,
              _isSAL: true
            });
          }
        }
      }
    }
  }
  // Ultima voce pendente
  if (currentVoce) {
    const row = buildVoceRow(currentVoce, currentDesc.join(' '));
    if (row) rows.push(row);
  }

  return rows;
}

function buildVoceRow(voce, desc) {
  if (!voce.importo && voce.importo !== 0) return null;
  // Pulisce la descrizione
  const descClean = desc
    .replace(/€?\s*[\d\.]+,\d{2}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,\.]+|[\s,\.]+$/g, '')
    .trim();
  if (!descClean || descClean.length < 3) return null;
  return {
    'N.': voce.num || '',
    'Descrizione': descClean,
    'Unità': voce.unita || 'A corpo',
    'Quantità': voce.qta ? String(voce.qta) : '',
    'Prezzo Unit.': voce.prezzoUnit ? fmtEur(voce.prezzoUnit) : '',
    'Importo': fmtEur(voce.importo),
    _importo: voce.importo,
    _descrizione: descClean
  };
}

function parseImporto(s) {
  if (!s) return 0;
  // Formato italiano: 1.234,56 -> 1234.56
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
}

function parseCSV(text, filename) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) { showToast('⚠️ File vuoto'); return; }
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g,''));
  const rows = lines.slice(1).map(l => {
    const cols = l.split(sep).map(c => c.trim().replace(/"/g,''));
    const obj = {};
    headers.forEach((h,i) => obj[h] = cols[i] || '');
    return obj;
  }).filter(r => Object.values(r).some(v => v));
  showComputoPreview(headers, rows, filename);
}

function parseExcel(buffer, filename) {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const headers = data.length ? Object.keys(data[0]) : [];
    showComputoPreview(headers, data, filename);
  } catch(e) { showToast('⚠️ Errore lettura Excel: ' + e.message); }
}

function parseComputoFallback(filename, rows) {
  showComputoPreview(['Descrizione','Unità','Quantità','Prezzo Unit.','Totale'], rows, filename);
}

function showComputoPreview(headers, rows, filename) {
  state.computoData = { headers, rows, filename };
  document.getElementById('computo-file-name').textContent = filename;
  const totale = rows.reduce((s, r) => {
    const v = Object.values(r).map(x => parseFloat(String(x).replace(',','.')) || 0);
    return s + Math.max(...v.filter(n => n > 0 && n < 9999999));
  }, 0);
  document.getElementById('computo-stats').innerHTML = `
    <div class="computo-stat"><strong>${rows.length}</strong> Voci</div>
    <div class="computo-stat"><strong>${headers.length}</strong> Colonne</div>
    <div class="computo-stat"><strong>${fmtEur(totale)}</strong> Stima Totale</div>
  `;
  const maxCols = Math.min(headers.length, 6);
  const visHeaders = headers.slice(0, maxCols);
  const tableHtml = '<table class="computo-table"><thead><tr>' +
    visHeaders.map(h => '<th>' + escHtml(h) + '</th>').join('') +
    '</tr></thead><tbody>' +
    rows.slice(0, 20).map(r => '<tr>' + visHeaders.map(h => '<td>' + escHtml(String(r[h] || '')) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table>';
  document.getElementById('computo-table-wrap').innerHTML = tableHtml;

  const vociHtml = rows.map((r, idx) => {
    const desc = r[headers[0]] || r['Descrizione'] || r['descrizione'] || Object.values(r)[0] || 'Voce ' + (idx+1);
    const priceVal = Object.values(r).map(x => parseFloat(String(x).replace(',','.'))).filter(n => !isNaN(n) && n > 0);
    const price = priceVal.length ? Math.max(...priceVal) : 0;
    return '<div class="voce-check-item"><input type="checkbox" id="voce-' + idx + '" />' +
      '<div class="voce-check-info"><div class="voce-check-name">' + escHtml(String(desc)) + '</div>' +
      '<div class="voce-check-meta">Voce ' + (idx+1) + '</div></div>' +
      '<div class="voce-check-price">' + (price > 0 ? fmtEur(price) : '') + '</div></div>';
  }).join('');
  document.getElementById('computo-voci-sel').innerHTML = vociHtml || '<div class="empty-state-small">Nessuna voce trovata</div>';
  document.getElementById('computo-preview').classList.remove('hidden');
  showToast('✅ File caricato: ' + rows.length + ' voci');
}

function clearComputo() {
  state.computoData = null;
  document.getElementById('computo-preview').classList.add('hidden');
  document.getElementById('computo-file-input').value = '';
}

function toggleSelectAll() {
  const cbs = document.querySelectorAll('#computo-voci-sel input[type=checkbox]');
  const allChecked = Array.from(cbs).every(c => c.checked);
  cbs.forEach(c => c.checked = !allChecked);
}

function categorizzaAutomatica(desc) {
  const d = desc.toLowerCase();
  if (/elettr|impianto el|quadro|interrutt|prese|cavi|citofon|tv|antenn/i.test(d)) return 'Impianti Elettrici';
  if (/idric|scarico|bagn|sanitari|rubinett|caldaia|riscald|radiator|autoclave|gas|acqua/i.test(d)) return 'Impianti Idraulici';
  if (/paviment|rivestiment|mattonel|piastrelle|battiscopa|gres|ceramica|marmo|parquet|laminato/i.test(d)) return 'Pavimenti e Rivestimenti';
  if (/tintegg|pittura|intonac|rasatura|rete porta|verniciatura|imbian/i.test(d)) return 'Pittura e Intonaci';
  if (/infissi|finestre?|porte?|serrament|scrigno|bussola|controtela|portoncin|tapparell/i.test(d)) return 'Serramenti';
  if (/controsoffit|cartongess|veletta|soffitt/i.test(d)) return 'Strutture';
  if (/muratura|muro|parete|intonaco|demoliz|rimozione|massetto|lapillo|sotto.?masso|tavelle/i.test(d)) return 'Muratura';
  if (/competenze|pratica|tecnic|geometra|architett|progett/i.test(d)) return 'Altro';
  return 'Altro';
}

function importVociSelezionate() {
  if (!getProgetto()) { showToast('⚠️ Seleziona prima un progetto'); return; }
  const data = state.computoData;
  if (!data) return;
  const cbs = document.querySelectorAll('#computo-voci-sel input[type=checkbox]');
  let count = 0;
  cbs.forEach((cb, idx) => {
    if (!cb.checked) return;
    const r = data.rows[idx];
    // Usa metadati PDF se disponibili, altrimenti fallback generico
    const desc = r._descrizione || r[data.headers[0]] || r['Descrizione'] || r['descrizione'] || Object.values(r).find(v => typeof v === 'string' && v.length > 3) || 'Lavoro ' + (idx+1);
    const price = r._importo != null ? r._importo : (() => {
      const vals = Object.values(r).map(x => parseFloat(String(x).replace(/\./g,'').replace(',','.'))).filter(n => !isNaN(n) && n > 0 && n < 9999999);
      return vals.length ? Math.max(...vals) : 0;
    })();
    const categoria = categorizzaAutomatica(String(desc));
    state.lavori.push({
      id: uid(), progettoId: state.progettoAttivoId,
      nome: String(desc).slice(0, 120),
      categoria, stato: 'da_fare',
      preventivo: price, avanzamento: 0,
      dataInizio: '', dataFine: '', fornitoreId: '', priorita: 'normale',
      note: 'Importato da: ' + data.filename + (r['N.'] ? ' · Voce n.' + r['N.'] : ''),
      createdAt: Date.now()
    });
    count++;
  });
  if (!count) { showToast('⚠️ Seleziona almeno una voce'); return; }
  saveData(); clearComputo(); showSection('lavori'); renderLavori(); renderDashboard();
  showToast('✅ Importati ' + count + ' lavori con categoria automatica');
}

// ===== BACKUP / EXPORT =====
function exportAllData() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ristruttura-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Backup esportato');
}

function triggerImportBackup() {
  document.getElementById('import-backup-input').click();
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.progetti) { showToast('⚠️ File non valido'); return; }
      showConfirm('Importa Backup', 'Sovrascrivere tutti i dati attuali?', '📥', () => {
        state = { ...state, ...data };
        saveData(); renderAll(); closeSidebar();
        showToast('✅ Backup importato');
      });
    } catch(err) { showToast('⚠️ Errore lettura file'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}
