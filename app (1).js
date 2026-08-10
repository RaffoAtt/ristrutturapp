// ===== MAIN APP ENTRY POINT =====
// Importa tutti i moduli e li espone su window

import { escHtml, uid, fmtEur, fmtData, daysDiff } from './utils/helpers.js';
import { catIcons, catColors, spesaIcons, spesaColors, statoLabel, sectionTitles } from './utils/constants.js';
import { storageService } from './services/storageService.js';
import { 
  showModal, hideModal, showToast, showConfirm, hideConfirm, 
  toggleSidebar, closeSidebar, showSection 
} from './components/ui.js';
import {
  renderSidebar, selectProgetto, salvaProgetto, loadImpostazioni,
  salvaImpostazioni, eliminaProgettoCorrente, resetApp
} from './components/projects.js';

// State globali
let lavoriFilter = 'all';
let speseFilter = 'all';
let fornitoriFilter = 'all';
let scadenzeFilter = 'all';
let currentRating = 0;

function renderAll() {
  renderSidebar();
  // Altre render functions verranno importate quando creati i componenti
}

function handleAddBtn() {
  const active = document.querySelector('.section.active');
  if (!active) return;
  const id = active.id;
  if (!storageService.getProgetto() && id !== 'section-impostazioni') {
    showToast('⚠️ Crea prima un progetto');
    showModal('modal-progetto');
    return;
  }
  if (id === 'section-lavori') window.openModalLavoro?.();
  else if (id === 'section-spese') window.openModalSpesa?.();
  else if (id === 'section-fornitori') window.openModalFornitore?.();
  else if (id === 'section-scadenze') window.openModalScadenza?.();
  else if (id === 'section-dashboard') showModal('modal-progetto');
  else if (id === 'section-computo') document.getElementById('computo-file-input').click();
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  storageService.loadData();
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
  window.setupDragDrop?.();
});

// ===== ESPONE FUNZIONI SU WINDOW =====
// UI
window.showModal = showModal;
window.hideModal = hideModal;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.hideConfirm = hideConfirm;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showSection = showSection;

// Progetti
window.selectProgetto = selectProgetto;
window.salvaProgetto = salvaProgetto;
window.loadImpostazioni = loadImpostazioni;
window.salvaImpostazioni = salvaImpostazioni;
window.eliminaProgettoCorrente = eliminaProgettoCorrente;
window.resetApp = resetApp;

// Globali
window.renderAll = renderAll;
window.handleAddBtn = handleAddBtn;

// State filters
window.lavoriFilter = lavoriFilter;
window.speseFilter = speseFilter;
window.fornitoriFilter = fornitoriFilter;
window.scadenzeFilter = scadenzeFilter;
window.currentRating = currentRating;

// Helpers
window.escHtml = escHtml;
window.uid = uid;
window.fmtEur = fmtEur;
window.fmtData = fmtData;
window.daysDiff = daysDiff;

// Costanti
window.catIcons = catIcons;
window.catColors = catColors;
window.spesaIcons = spesaIcons;
window.spesaColors = spesaColors;
window.statoLabel = statoLabel;

// Storage
window.storageService = storageService;