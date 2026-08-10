// ===== GESTIONE PROGETTI =====

import { uid, escHtml, fmtEur, fmtData } from '../utils/helpers.js';
import { storageService } from '../services/storageService.js';
import { showModal, hideModal, showToast, showConfirm, closeSidebar } from './ui.js';

export function renderSidebar() {
  const list = document.getElementById('progetti-list');
  list.innerHTML = storageService.state.progetti.map(p => `
    <li class="${p.id === storageService.state.progettoAttivoId ? 'active' : ''}" onclick="selectProgetto('${p.id}')">
      <span>🏗️</span> ${escHtml(p.nome)}
    </li>`).join('') || '<li style="color:var(--text3);font-size:13px">Nessun progetto</li>';
  const prog = storageService.getProgetto();
  document.getElementById('progetto-attivo-name').textContent = prog ? prog.nome : 'Nessun progetto';
}

export function selectProgetto(id) {
  storageService.state.progettoAttivoId = id;
  storageService.saveData();
  closeSidebar();
  window.renderAll();
}

export function salvaProgetto() {
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
  storageService.state.progetti.push(obj);
  storageService.state.progettoAttivoId = obj.id;
  storageService.saveData();
  hideModal('modal-progetto');
  window.renderAll();
  showToast('✅ Progetto creato: ' + nome);
}

export function loadImpostazioni() {
  const p = storageService.getProgetto();
  if (!p) return;
  document.getElementById('imp-nome').value = p.nome || '';
  document.getElementById('imp-indirizzo').value = p.indirizzo || '';
  document.getElementById('imp-budget').value = p.budget || '';
  document.getElementById('imp-data-inizio').value = p.dataInizio || '';
  document.getElementById('imp-data-fine').value = p.dataFine || '';
  document.getElementById('imp-note').value = p.note || '';
}

export function salvaImpostazioni() {
  const p = storageService.getProgetto();
  if (!p) { showToast('⚠️ Nessun progetto attivo'); return; }
  p.nome = document.getElementById('imp-nome').value.trim() || p.nome;
  p.indirizzo = document.getElementById('imp-indirizzo').value.trim();
  p.budget = parseFloat(document.getElementById('imp-budget').value) || 0;
  p.dataInizio = document.getElementById('imp-data-inizio').value;
  p.dataFine = document.getElementById('imp-data-fine').value;
  p.note = document.getElementById('imp-note').value.trim();
  storageService.saveData();
  window.renderAll();
  showToast('✅ Impostazioni salvate');
}

export function eliminaProgettoCorrente() {
  const p = storageService.getProgetto();
  if (!p) return;
  showConfirm('Elimina Progetto', `Eliminare "${p.nome}" e tutti i suoi dati?`, '🗑️', () => {
    storageService.state.progetti = storageService.state.progetti.filter(x => x.id !== p.id);
    storageService.state.lavori = storageService.state.lavori.filter(l => l.progettoId !== p.id);
    storageService.state.spese = storageService.state.spese.filter(s => s.progettoId !== p.id);
    storageService.state.scadenze = storageService.state.scadenze.filter(s => s.progettoId !== p.id);
    storageService.state.progettoAttivoId = storageService.state.progetti[0]?.id || null;
    storageService.saveData();
    window.renderAll();
    window.showSection('dashboard');
    showToast('🗑️ Progetto eliminato');
  });
}

export function resetApp() {
  showConfirm('Reset App', 'Eliminare TUTTI i dati? Questa azione è irreversibile!', '⚠️', () => {
    localStorage.removeItem('ristrutturaApp_v2');
    location.reload();
  });
}
