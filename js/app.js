// ===== MAIN APP ENTRY POINT =====
// Importa tutti i moduli e li espone su window

import { escHtml, uid, fmtEur, fmtData, daysDiff } from './utils/helpers.js';
import { catIcons, catColors, spesaIcons, spesaColors, statoLabel, sectionTitles, tipoScadenzaIcons } from './utils/constants.js';
import { storageService, setFreemium } from './services/storageService.js';
import { 
  showModal, hideModal, showToast, showConfirm, hideConfirm, 
  toggleSidebar, closeSidebar, showSection 
} from './components/ui.js';
import { 
  renderDashboard, renderCatProgress, renderChartSpese, renderChartAndamento, 
  renderDashScadenze, renderDashSpese 
} from './components/dashboard.js';
import { 
  salvaProgetto, loadImpostazioni, salvaImpostazioni, eliminaProgettoCorrente, 
  resetApp, renderSidebar, selectProgetto 
} from './components/projects.js';
import { 
  initAuth, handleSignUp, handleSignIn, handleSignOut, toggleAuthMode,
  showAuthUI, showLoginUI, showLandingPage
} from './components/auth.js';

// State globali
let lavoriFilter = 'all';
let speseFilter = 'all';
let fornitoriFilter = 'all';
let scadenzeFilter = 'all';
let currentRating = 0;

function renderAll() {
  renderSidebar();
  renderDashboard();
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
  // TODO: Aggiungere funzioni quando componenti saranno creati
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  try {
    // Nascondi splash screen e mostra direttamente l'app
    setTimeout(() => {
      document.getElementById('splash-screen').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
    }, 1500);
    
    initAuth();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (e) {
    console.error('Errore nell\'init:', e);
  }
});

// ===== ESPONE FUNZIONI SU WINDOW PER ONCLICK INLINE =====

// Auth
window.initAuth = initAuth;
window.handleSignUp = handleSignUp;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
window.toggleAuthMode = toggleAuthMode;
window.showAuthUI = showAuthUI;
window.showLoginUI = showLoginUI;
window.showLandingPage = showLandingPage;

// UI
window.showModal = showModal;
window.hideModal = hideModal;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.hideConfirm = hideConfirm;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showSection = showSection;

// Dashboard
window.renderDashboard = renderDashboard;
window.renderCatProgress = renderCatProgress;
window.renderChartSpese = renderChartSpese;

// Progetti
window.salvaProgetto = salvaProgetto;
window.loadImpostazioni = loadImpostazioni;
window.salvaImpostazioni = salvaImpostazioni;
window.eliminaProgettoCorrente = eliminaProgettoCorrente;
window.resetApp = resetApp;
window.selectProgetto = selectProgetto;

// Freemium
window.startFreeMode = function() {
  setFreemium(true);
  storageService.loadData();
  window.showAuthUI();
  window.renderAll?.();
  window.showToast?.('✅ Modalità Free avviata - 1 progetto disponibile');
};

window.showLoginModal = function() {
  window.showLoginUI?.();
};

window.showSignUpUI = function() {
  window.toggleAuthMode?.();
  window.showLoginUI?.();
};

window.showPremiumModal = function() {
  window.showToast?.('🌟 Funzionalità Premium - Contatta il supporto per l\'upgrade');
};

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
window.tipoScadenzaIcons = tipoScadenzaIcons;

// Storage
window.storageService = storageService;

// TODO: Aggiungere funzioni degli altri componenti quando creati
// - Lavori: openModalLavoro, salvaLavoro, renderLavori, setLavoriFilter, etc.
// - Spese: openModalSpesa, salvaSpesa, renderSpese, setSpeseFilter, etc.
// - Fornitori: openModalFornitore, salvaFornitore, renderFornitori, etc.
// - Scadenze: openModalScadenza, salvaScadenza, renderScadenze, etc.
// - Computo: setupDragDrop, importComputo, processComputoFile, etc.
// - Backup: exportAllData, triggerImportBackup, importBackup
