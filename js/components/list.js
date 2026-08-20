// ===== LIST COMPONENTS =====
// Rendering di Lavori, Spese, Fornitori, Scadenze

import { storageService } from '../services/storageService.js';
import { escHtml, fmtEur, fmtData, uid, daysDiff } from '../utils/helpers.js';
import { catIcons, catColors, spesaIcons, spesaColors, statoLabel } from '../utils/constants.js';
import { showToast, showConfirm } from './ui.js';

// ===== LAVORI =====

let lavoriFilter = 'all';

export function setLavoriFilter(val, btn) {
  lavoriFilter = val;
  document.querySelectorAll('#section-lavori .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLavori();
}

export function renderLavori() {
  const search = (document.getElementById('lavori-search')?.value || '').toLowerCase();
  let lavori = storageService.getLavori();
  if (lavoriFilter !== 'all') lavori = lavori.filter(l => l.stato === lavoriFilter);
  if (search) lavori = lavori.filter(l => l.nome.toLowerCase().includes(search));

  const el = document.getElementById('lavori-list');
  if (!el) return;

  if (!lavori.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔨</div><h3>Nessun lavoro</h3><p>Aggiungi il primo lavoro al progetto</p></div>';
    return;
  }

  const renderCard = (l) => {
    const color = catColors[l.categoria] || '#8E8E93';
    const icon = catIcons[l.categoria] || '📦';
    const stato = statoLabel[l.stato] || l.stato;
    const avz = Number(l.avanzamento) || 0;
    return `<div class="lavoro-card" onclick="openDettaglioLavoro('${l.id}')">
      <div class="lavoro-card-top">
        <div class="lavoro-card-icon" style="background:${color}22">${icon}</div>
        <div class="lavoro-card-info">
          <div class="lavoro-card-name">${escHtml(l.nome)}</div>
          <div class="lavoro-card-cat">${escHtml(l.categoria || 'Altro')}</div>
        </div>
        <div class="lavoro-card-right">
          <span class="stato-badge ${l.stato}">${stato}</span>
        </div>
      </div>
      <div class="lavoro-progress-row">
        <div class="lavoro-prog-bar"><div class="lavoro-prog-fill" style="width:${avz}%;background:${color}"></div></div>
        <div class="lavoro-prog-pct">${avz}%</div>
      </div>
      <div class="lavoro-card-footer">
        <div class="lavoro-preventivo">Preventivo: <strong>${fmtEur(l.preventivo)}</strong></div>
        <div style="display:flex;gap:8px">
          <button class="action-btn" onclick="event.stopPropagation();editLavoro('${l.id}')">✏️</button>
          <button class="action-btn" onclick="event.stopPropagation();deleteLavoroConfirm('${l.id}')">🗑️</button>
        </div>
      </div>
      <div style="display:flex;gap:6px;padding:8px 0 2px;border-top:1px solid var(--bg3);margin-top:6px;flex-wrap:wrap;" onclick="event.stopPropagation()">
        ${l.stato !== 'in_corso' && l.stato !== 'completato' ? `<button onclick="event.stopPropagation();setLavoroStato('${l.id}','in_corso')" style="flex:1;padding:7px 8px;font-size:12px;background:rgba(255,149,0,.12);color:#FF9500;border:1px solid #FF9500;border-radius:8px;cursor:pointer;font-weight:600;">🔄 Avvia</button>` : ''}
        ${avz < 100 && l.stato !== 'completato' ? `<button onclick="event.stopPropagation();avanzaLavoro('${l.id}',10)" style="flex:1;padding:7px 8px;font-size:12px;background:rgba(0,122,255,.1);color:var(--blue);border:1px solid var(--blue);border-radius:8px;cursor:pointer;font-weight:600;">+10%</button>` : ''}
        ${l.stato !== 'completato' ? `<button onclick="event.stopPropagation();setLavoroStato('${l.id}','completato')" style="flex:1;padding:7px 8px;font-size:12px;background:rgba(52,199,89,.12);color:#34C759;border:1px solid #34C759;border-radius:8px;cursor:pointer;font-weight:600;">✅ Completa</button>` : `<span style="flex:1;text-align:center;font-size:12px;color:#34C759;font-weight:600;padding:7px 0;">✅ Completato</span>`}
      </div>
    </div>`;
  };

  // Raggruppa per computo
  const lavoriManuali = lavori.filter(l => !l.computoId);
  const gruppiComputo = {};
  lavori.filter(l => l.computoId).forEach(l => {
    if (!gruppiComputo[l.computoId]) gruppiComputo[l.computoId] = { nome: l.computoNome || 'Computo', lavori: [] };
    gruppiComputo[l.computoId].lavori.push(l);
  });

  let html = '';

  Object.entries(gruppiComputo).forEach(([computoId, gruppo]) => {
    const totGruppo = gruppo.lavori.reduce((s, l) => s + (l.preventivo || 0), 0);
    html += `<div class="card" style="margin-bottom:12px;border-left:4px solid var(--blue);">
      <div class="card-header">
        <div>
          <span class="card-title">📄 ${escHtml(gruppo.nome)}</span>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${gruppo.lavori.length} voci · ${fmtEur(totGruppo)}</div>
        </div>
        <button class="btn-danger" style="padding:6px 12px;font-size:12px;"
          onclick="deleteComputoGroupConfirm('${computoId}', '${escHtml(gruppo.nome)}')">
          🗑️ Elimina gruppo
        </button>
      </div>
      ${gruppo.lavori.map(renderCard).join('')}
    </div>`;
  });

  if (lavoriManuali.length) {
    if (Object.keys(gruppiComputo).length) {
      html += `<div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;margin:12px 0 8px;padding:0 4px;">Lavori manuali</div>`;
    }
    html += lavoriManuali.map(renderCard).join('');
  }

  el.innerHTML = html;
}

export function deleteComputoGroupConfirm(computoId, nomeComputo) {
  showConfirm(
    'Elimina gruppo computo',
    'Eliminare tutti i lavori importati da "' + nomeComputo + '"?',
    '📄',
    () => {
      storageService.state.lavori = storageService.state.lavori.filter(l => l.computoId !== computoId);
      storageService.saveData();
      renderLavori();
      window.renderDashboard?.();
      showToast('🗑️ Gruppo lavori eliminato');
    }
  );
}

export function openModalLavoro(id) {
  const l = id ? storageService.state.lavori.find(x => x.id === id) : null;
  document.getElementById('modal-lavoro-title').textContent = l ? 'Modifica Lavoro' : 'Nuovo Lavoro';
  document.getElementById('lav-nome').value = l?.nome || '';
  document.getElementById('lav-categoria').value = l?.categoria || 'Muratura';
  document.getElementById('lav-stato').value = l?.stato || 'da_fare';
  document.getElementById('lav-preventivo').value = l?.preventivo || '';
  document.getElementById('lav-avanzamento').value = l?.avanzamento || '0';
  document.getElementById('lav-data-inizio').value = l?.dataInizio || '';
  document.getElementById('lav-data-fine').value = l?.dataFine || '';
  document.getElementById('lav-priorita').value = l?.priorita || 'normale';
  document.getElementById('lav-note').value = l?.note || '';
  document.getElementById('lav-id').value = l?.id || '';
  const sel = document.getElementById('lav-fornitore');
  if (sel) {
    const forn = storageService.getFornitori();
    sel.innerHTML = '<option value="">-- Nessuno --</option>' + forn.map(f =>
      `<option value="${f.id}" ${l?.fornitoreId === f.id ? 'selected' : ''}>${escHtml(f.nome)}</option>`
    ).join('');
  }
  document.getElementById('modal-lavoro').classList.remove('hidden');
}

export function salvaLavoro() {
  const prog = storageService.getProgetto();
  if (!prog) { showToast('⚠️ Nessun progetto attivo'); return; }
  const id = document.getElementById('lav-id').value;
  const nome = document.getElementById('lav-nome').value.trim();
  if (!nome) { showToast('⚠️ Inserisci il nome del lavoro'); return; }
  const obj = {
    id: id || uid(), progettoId: prog.id, nome,
    categoria: document.getElementById('lav-categoria').value,
    stato: document.getElementById('lav-stato').value,
    preventivo: parseFloat(document.getElementById('lav-preventivo').value) || 0,
    avanzamento: parseInt(document.getElementById('lav-avanzamento').value) || 0,
    dataInizio: document.getElementById('lav-data-inizio').value,
    dataFine: document.getElementById('lav-data-fine').value,
    fornitoreId: document.getElementById('lav-fornitore').value,
    priorita: document.getElementById('lav-priorita').value,
    note: document.getElementById('lav-note').value.trim()
  };
  if (id) {
    const idx = storageService.state.lavori.findIndex(l => l.id === id);
    if (idx >= 0) storageService.state.lavori[idx] = obj;
  } else {
    storageService.state.lavori.push(obj);
  }
  storageService.saveData();
  document.getElementById('modal-lavoro').classList.add('hidden');
  renderLavori();
  window.renderDashboard?.();
  showToast(id ? '✅ Lavoro aggiornato' : '✅ Lavoro aggiunto');
}

export function setLavoroStato(id, stato) {
  const idx = storageService.state.lavori.findIndex(l => l.id === id);
  if (idx < 0) return;
  storageService.state.lavori[idx].stato = stato;
  if (stato === 'completato') storageService.state.lavori[idx].avanzamento = 100;
  if (stato === 'in_corso' && storageService.state.lavori[idx].avanzamento === 0) {
    storageService.state.lavori[idx].avanzamento = 10;
  }
  storageService.saveData();
  renderLavori();
  window.renderDashboard?.();
  const msg = { in_corso: '🔄 Lavoro avviato', completato: '✅ Lavoro completato', sospeso: '⏸️ Lavoro sospeso' };
  showToast(msg[stato] || '✅ Stato aggiornato');
}

export function avanzaLavoro(id, step) {
  const idx = storageService.state.lavori.findIndex(l => l.id === id);
  if (idx < 0) return;
  const nuovoAvz = Math.min(100, (Number(storageService.state.lavori[idx].avanzamento) || 0) + step);
  storageService.state.lavori[idx].avanzamento = nuovoAvz;
  if (nuovoAvz >= 100) {
    storageService.state.lavori[idx].stato = 'completato';
    showToast('✅ Lavoro completato al 100%!');
  } else {
    if (storageService.state.lavori[idx].stato === 'da_fare') storageService.state.lavori[idx].stato = 'in_corso';
    showToast('📈 Avanzamento: ' + nuovoAvz + '%');
  }
  storageService.saveData();
  renderLavori();
  window.renderDashboard?.();
}

export function editLavoro(id) { openModalLavoro(id); }

export function deleteLavoroConfirm(id) {
  showConfirm('Elimina lavoro', 'Eliminare questo lavoro?', '🗑️', () => {
    storageService.state.lavori = storageService.state.lavori.filter(l => l.id !== id);
    storageService.saveData();
    renderLavori();
    window.renderDashboard?.();
    showToast('🗑️ Lavoro eliminato');
  });
}

export function openDettaglioLavoro(id) {
  const l = storageService.state.lavori.find(x => x.id === id);
  if (!l) return;
  document.getElementById('det-lav-title').textContent = escHtml(l.nome);

  // Inietta il contenuto principale nel body (NON sovrascrivere il body intero
  // perché client-features-container è un child che viene gestito da app.js)
  const body = document.getElementById('det-lav-body');
  // Aggiorna solo il contenuto principale lasciando il container delle feature client
  const existingContainer = body.querySelector('#client-features-container');
  const mainContent = `
    <div class="det-lav-header">
      <div class="det-lav-ico" style="background:${catColors[l.categoria] || '#8E8E93'}22">${catIcons[l.categoria] || '📦'}</div>
      <div><div class="det-lav-name">${escHtml(l.nome)}</div><div class="det-lav-cat">${escHtml(l.categoria || '')}</div></div>
    </div>
    <div class="det-info-grid">
      <div class="det-info-item"><div class="det-info-label">Stato</div><div class="det-info-val"><span class="stato-badge ${l.stato}">${statoLabel[l.stato] || l.stato}</span></div></div>
      <div class="det-info-item"><div class="det-info-label">Avanzamento</div><div class="det-info-val">${l.avanzamento || 0}%</div></div>
      <div class="det-info-item"><div class="det-info-label">Preventivo</div><div class="det-info-val">${fmtEur(l.preventivo)}</div></div>
      <div class="det-info-item"><div class="det-info-label">Priorità</div><div class="det-info-val">${l.priorita || 'normale'}</div></div>
      ${l.dataInizio ? `<div class="det-info-item"><div class="det-info-label">Inizio</div><div class="det-info-val">${fmtData(l.dataInizio)}</div></div>` : ''}
      ${l.dataFine ? `<div class="det-info-item"><div class="det-info-label">Fine prevista</div><div class="det-info-val">${fmtData(l.dataFine)}</div></div>` : ''}
    </div>
    ${l.note ? `<div class="det-section-title">Note</div><div class="det-note">${escHtml(l.note)}</div>` : ''}
    <div id="client-features-container"></div>`;

  body.innerHTML = mainContent;

  document.getElementById('det-lav-edit-btn').onclick = () => {
    document.getElementById('modal-dettaglio-lavoro').classList.add('hidden');
    openModalLavoro(id);
  };
  document.getElementById('modal-dettaglio-lavoro').classList.remove('hidden');

  // Carica note e pulsanti approvazione (async, non blocca l'apertura del modal)
  setTimeout(() => {
    window.loadClientFeatures?.(id, l.stato);
  }, 50);
}

// ===== SPESE =====

let speseFilter = 'all';

export function setSpeseFilter(val, btn) {
  speseFilter = val;
  document.querySelectorAll('#section-spese .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderSpese();
}

export function renderSpese() {
  const search = (document.getElementById('spese-search')?.value || '').toLowerCase();
  let spese = storageService.getSpese();
  if (speseFilter !== 'all') spese = spese.filter(s => s.categoria === speseFilter);
  if (search) spese = spese.filter(s => s.descrizione.toLowerCase().includes(search));

  const el = document.getElementById('spese-summary');
  if (el) {
    const tot = spese.reduce((s, x) => s + Number(x.importo || 0), 0);
    el.innerHTML = `
      <div class="spese-sum-item"><div class="spese-sum-label">Totale</div><div class="spese-sum-val">${fmtEur(tot)}</div></div>
      <div class="spese-sum-item"><div class="spese-sum-label">Voci</div><div class="spese-sum-val">${spese.length}</div></div>
    `;
  }

  const list = document.getElementById('spese-list');
  if (!list) return;

  if (!spese.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧾</div><h3>Nessuna spesa</h3><p>Registra la prima spesa del progetto</p></div>';
    return;
  }

  list.innerHTML = spese.map(s => {
    const bg = spesaColors[s.categoria] || 'rgba(142,142,147,.15)';
    return `<div class="spesa-card">
      <div class="spesa-card-top">
        <div class="spesa-card-icon" style="background:${bg}">${spesaIcons[s.categoria] || '📦'}</div>
        <div class="spesa-card-info">
          <div class="spesa-card-desc">${escHtml(s.descrizione)}</div>
          <div class="spesa-card-meta">${escHtml(s.categoria)} · ${fmtData(s.data)}</div>
        </div>
        <div class="spesa-card-amount">${fmtEur(s.importo)}</div>
      </div>
      <div class="spesa-card-footer">
        <div class="spesa-card-tags">
          <span class="tag">${escHtml(s.pagamento || '')}</span>
          ${s.ricevuta ? '<span class="tag ricevuta">✓ Ricevuta</span>' : ''}
        </div>
        <div class="spesa-card-actions">
          <button class="action-btn" onclick="editSpesa('${s.id}')">✏️</button>
          <button class="action-btn" onclick="deleteSpesaConfirm('${s.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function openModalSpesa(id) {
  const s = id ? storageService.state.spese.find(x => x.id === id) : null;
  document.getElementById('modal-spesa-title').textContent = s ? 'Modifica Spesa' : 'Nuova Spesa';
  document.getElementById('sp-desc').value = s?.descrizione || '';
  document.getElementById('sp-importo').value = s?.importo || '';
  document.getElementById('sp-categoria').value = s?.categoria || 'Materiali';
  document.getElementById('sp-data').value = s?.data || new Date().toISOString().split('T')[0];
  document.getElementById('sp-pagamento').value = s?.pagamento || 'Bonifico';
  document.getElementById('sp-ricevuta').checked = s?.ricevuta || false;
  document.getElementById('sp-note').value = s?.note || '';
  document.getElementById('sp-id').value = s?.id || '';
  const lavori = storageService.getLavori();
  const lavSel = document.getElementById('sp-lavoro');
  if (lavSel) lavSel.innerHTML = '<option value="">-- Nessuno --</option>' + lavori.map(l =>
    `<option value="${l.id}" ${s?.lavoroId === l.id ? 'selected' : ''}>${escHtml(l.nome)}</option>`
  ).join('');
  const forn = storageService.getFornitori();
  const fornSel = document.getElementById('sp-fornitore');
  if (fornSel) fornSel.innerHTML = '<option value="">-- Nessuno --</option>' + forn.map(f =>
    `<option value="${f.id}" ${s?.fornitoreId === f.id ? 'selected' : ''}>${escHtml(f.nome)}</option>`
  ).join('');
  document.getElementById('modal-spesa').classList.remove('hidden');
}

export function salvaSpesa() {
  const prog = storageService.getProgetto();
  if (!prog) { showToast('⚠️ Nessun progetto attivo'); return; }
  const id = document.getElementById('sp-id').value;
  const descrizione = document.getElementById('sp-desc').value.trim();
  const importo = parseFloat(document.getElementById('sp-importo').value);
  if (!descrizione) { showToast('⚠️ Inserisci la descrizione'); return; }
  if (!importo) { showToast('⚠️ Inserisci l\'importo'); return; }
  const obj = {
    id: id || uid(), progettoId: prog.id, descrizione, importo,
    categoria: document.getElementById('sp-categoria').value,
    data: document.getElementById('sp-data').value,
    lavoroId: document.getElementById('sp-lavoro').value,
    fornitoreId: document.getElementById('sp-fornitore').value,
    pagamento: document.getElementById('sp-pagamento').value,
    ricevuta: document.getElementById('sp-ricevuta').checked,
    note: document.getElementById('sp-note').value.trim()
  };
  if (id) {
    const idx = storageService.state.spese.findIndex(s => s.id === id);
    if (idx >= 0) storageService.state.spese[idx] = obj;
  } else {
    storageService.state.spese.push(obj);
  }
  storageService.saveData();
  document.getElementById('modal-spesa').classList.add('hidden');
  renderSpese();
  window.renderDashboard?.();
  showToast(id ? '✅ Spesa aggiornata' : '✅ Spesa aggiunta');
}

export function editSpesa(id) { openModalSpesa(id); }

export function deleteSpesaConfirm(id) {
  showConfirm('Elimina spesa', 'Eliminare questa spesa?', '🗑️', () => {
    storageService.state.spese = storageService.state.spese.filter(s => s.id !== id);
    storageService.saveData();
    renderSpese();
    window.renderDashboard?.();
    showToast('🗑️ Spesa eliminata');
  });
}

// ===== FORNITORI =====

let fornitoriFilter = 'all';

export function setFornitoriFilter(val, btn) {
  fornitoriFilter = val;
  document.querySelectorAll('#section-fornitori .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFornitori();
}

export function renderFornitori() {
  const search = (document.getElementById('fornitori-search')?.value || '').toLowerCase();
  let forn = storageService.getFornitori();
  if (fornitoriFilter !== 'all') forn = forn.filter(f => f.tipo === fornitoriFilter);
  if (search) forn = forn.filter(f => f.nome.toLowerCase().includes(search));
  const el = document.getElementById('fornitori-list');
  if (!el) return;
  if (!forn.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👷</div><h3>Nessun fornitore</h3><p>Aggiungi il primo fornitore</p></div>';
    return;
  }
  el.innerHTML = forn.map(f => `
    <div class="fornitore-card">
      <div class="forn-top">
        <div class="forn-avatar">${escHtml(f.nome.charAt(0).toUpperCase())}</div>
        <div class="forn-info"><div class="forn-nome">${escHtml(f.nome)}</div><div class="forn-tipo">${escHtml(f.tipo || '')}</div></div>
        <div class="forn-actions">
          <button class="action-btn" onclick="editFornitore('${f.id}')">✏️</button>
          <button class="action-btn" onclick="deleteFornitoreConfirm('${f.id}')">🗑️</button>
        </div>
      </div>
      <div class="forn-rating">${[1,2,3,4,5].map(n => `<span class="forn-star ${n <= (f.rating || 0) ? 'on' : ''}">★</span>`).join('')}</div>
      <div class="forn-footer">
        ${f.tel ? `<span>📞 ${escHtml(f.tel)}</span>` : ''}
        ${f.email ? `<span>✉️ ${escHtml(f.email)}</span>` : ''}
      </div>
    </div>`).join('');
}

export function openModalFornitore(id) {
  const f = id ? storageService.state.fornitori.find(x => x.id === id) : null;
  document.getElementById('modal-fornitore-title').textContent = f ? 'Modifica Fornitore' : 'Nuovo Fornitore';
  document.getElementById('forn-nome').value = f?.nome || '';
  document.getElementById('forn-tipo').value = f?.tipo || 'Muratore';
  document.getElementById('forn-tel').value = f?.tel || '';
  document.getElementById('forn-email').value = f?.email || '';
  document.getElementById('forn-piva').value = f?.piva || '';
  document.getElementById('forn-note').value = f?.note || '';
  document.getElementById('forn-rating').value = f?.rating || '0';
  document.getElementById('forn-id').value = f?.id || '';
  setRating(f?.rating || 0);
  document.getElementById('modal-fornitore').classList.remove('hidden');
}

export function setRating(val) {
  document.getElementById('forn-rating').value = val;
  document.querySelectorAll('#forn-rating-wrap .star').forEach((s, i) => {
    s.classList.toggle('on', i < val);
  });
}

export function salvaFornitore() {
  const id = document.getElementById('forn-id').value;
  const nome = document.getElementById('forn-nome').value.trim();
  if (!nome) { showToast('⚠️ Inserisci il nome del fornitore'); return; }
  const obj = {
    id: id || uid(), nome,
    tipo: document.getElementById('forn-tipo').value,
    tel: document.getElementById('forn-tel').value.trim(),
    email: document.getElementById('forn-email').value.trim(),
    piva: document.getElementById('forn-piva').value.trim(),
    rating: parseInt(document.getElementById('forn-rating').value) || 0,
    note: document.getElementById('forn-note').value.trim()
  };
  if (id) {
    const idx = storageService.state.fornitori.findIndex(f => f.id === id);
    if (idx >= 0) storageService.state.fornitori[idx] = obj;
  } else {
    storageService.state.fornitori.push(obj);
  }
  storageService.saveData();
  document.getElementById('modal-fornitore').classList.add('hidden');
  renderFornitori();
  showToast(id ? '✅ Fornitore aggiornato' : '✅ Fornitore aggiunto');
}

export function editFornitore(id) { openModalFornitore(id); }

export function deleteFornitoreConfirm(id) {
  showConfirm('Elimina fornitore', 'Eliminare questo fornitore?', '🗑️', () => {
    storageService.state.fornitori = storageService.state.fornitori.filter(f => f.id !== id);
    storageService.saveData();
    renderFornitori();
    showToast('🗑️ Fornitore eliminato');
  });
}

// ===== SCADENZE =====

let scadenzeFilter = 'all';

export function setScadenzeFilter(val, btn) {
  scadenzeFilter = val;
  document.querySelectorAll('#section-scadenze .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderScadenze();
}

export function renderScadenze() {
  let scadenze = storageService.getScadenze();
  if (scadenzeFilter === 'upcoming') scadenze = scadenze.filter(s => { const d = daysDiff(s.data); return d >= 0 && d <= 7; });
  else if (scadenzeFilter === 'scaduta') scadenze = scadenze.filter(s => daysDiff(s.data) < 0);
  scadenze.sort((a, b) => new Date(a.data) - new Date(b.data));
  const el = document.getElementById('scadenze-list');
  if (!el) return;
  if (!scadenze.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Nessuna scadenza</h3><p>Aggiungi la prima scadenza</p></div>';
    return;
  }
  el.innerHTML = scadenze.map(s => {
    const diff = daysDiff(s.data);
    let cls = 'green', badge = diff + ' giorni';
    if (diff < 0) { cls = 'red'; badge = 'Scaduta'; }
    else if (diff === 0) { cls = 'orange'; badge = 'Oggi!'; }
    else if (diff <= 3) { cls = 'orange'; badge = diff + ' gg'; }
    return `<div class="scadenza-card ${diff < 0 ? 'scaduta' : diff === 0 ? 'oggi' : ''}">
      <div class="scad-card-top">
        <div class="scad-card-info">
          <div class="scad-card-title">${escHtml(s.titolo)}</div>
          <div class="scad-card-sub">${fmtData(s.data)} · ${escHtml(s.tipo || '')}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="scad-badge ${cls}">${badge}</span>
          <button class="action-btn" onclick="editScadenza('${s.id}')">✏️</button>
          <button class="action-btn" onclick="deleteScadenzaConfirm('${s.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function openModalScadenza(id) {
  const s = id ? storageService.state.scadenze.find(x => x.id === id) : null;
  document.getElementById('modal-scadenza-title').textContent = s ? 'Modifica Scadenza' : 'Nuova Scadenza';
  document.getElementById('sc-titolo').value = s?.titolo || '';
  document.getElementById('sc-data').value = s?.data || '';
  document.getElementById('sc-tipo').value = s?.tipo || 'lavoro';
  document.getElementById('sc-note').value = s?.note || '';
  document.getElementById('sc-id').value = s?.id || '';
  const lavori = storageService.getLavori();
  const sel = document.getElementById('sc-lavoro');
  if (sel) sel.innerHTML = '<option value="">-- Nessuno --</option>' + lavori.map(l =>
    `<option value="${l.id}" ${s?.lavoroId === l.id ? 'selected' : ''}>${escHtml(l.nome)}</option>`
  ).join('');
  document.getElementById('modal-scadenza').classList.remove('hidden');
}

export function salvaScadenza() {
  const prog = storageService.getProgetto();
  if (!prog) { showToast('⚠️ Nessun progetto attivo'); return; }
  const id = document.getElementById('sc-id').value;
  const titolo = document.getElementById('sc-titolo').value.trim();
  const data = document.getElementById('sc-data').value;
  if (!titolo || !data) { showToast('⚠️ Inserisci titolo e data'); return; }
  const obj = {
    id: id || uid(), progettoId: prog.id, titolo, data,
    tipo: document.getElementById('sc-tipo').value,
    lavoroId: document.getElementById('sc-lavoro').value,
    note: document.getElementById('sc-note').value.trim()
  };
  if (id) {
    const idx = storageService.state.scadenze.findIndex(s => s.id === id);
    if (idx >= 0) storageService.state.scadenze[idx] = obj;
  } else {
    storageService.state.scadenze.push(obj);
  }
  storageService.saveData();
  document.getElementById('modal-scadenza').classList.add('hidden');
  renderScadenze();
  showToast(id ? '✅ Scadenza aggiornata' : '✅ Scadenza aggiunta');
}

export function editScadenza(id) { openModalScadenza(id); }

export function deleteScadenzaConfirm(id) {
  showConfirm('Elimina scadenza', 'Eliminare questa scadenza?', '🗑️', () => {
    storageService.state.scadenze = storageService.state.scadenze.filter(s => s.id !== id);
    storageService.saveData();
    renderScadenze();
    showToast('🗑️ Scadenza eliminata');
  });
}
