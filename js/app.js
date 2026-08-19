// ===== MAIN APP ENTRY POINT =====
// Importa tutti i moduli e li espone su window

import { APP_CONFIG } from './config/appConfig.js';
import { roleService } from './services/roleService.js';
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
  showAuthUI, showLoginUI, showLandingPage, hideLoginUI, showSignUpUI
} from './components/auth.js';
import {
  importComputo, clearComputo, toggleVoce, toggleSelectAll, importVociSelezionate
} from './components/computo.js';
import {
  renderLavori, setLavoriFilter, openModalLavoro, salvaLavoro, editLavoro,
  deleteLavoroConfirm, openDettaglioLavoro, deleteComputoGroupConfirm,
  setLavoroStato, avanzaLavoro,
  renderSpese, setSpeseFilter, openModalSpesa, salvaSpesa, editSpesa, deleteSpesaConfirm,
  renderFornitori, setFornitoriFilter, openModalFornitore, salvaFornitore, editFornitore,
  deleteFornitoreConfirm, setRating,
  renderScadenze, setScadenzeFilter, openModalScadenza, salvaScadenza, editScadenza,
  deleteScadenzaConfirm
} from './components/list.js';

// State globali
let lavoriFilter = 'all';
let speseFilter = 'all';
let fornitoriFilter = 'all';
let scadenzeFilter = 'all';
let currentRating = 0;

function renderAll() {
  renderSidebar();
  renderDashboard();
  renderLavori();
  renderSpese();
  renderFornitori();
  renderScadenze();
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
  if (id === 'section-lavori') openModalLavoro();
  else if (id === 'section-spese') openModalSpesa();
  else if (id === 'section-fornitori') openModalFornitore();
  else if (id === 'section-scadenze') openModalScadenza();
  else if (id === 'section-computo') document.getElementById('computo-file-input')?.click();
  else showModal('modal-progetto');
}

// ===== APPLICA WHITE-LABEL CONFIG AL DOM =====
function applyAppConfig() {
  const cfg = APP_CONFIG;

  // Titolo browser
  document.title = cfg.appName;

  // Colore primario CSS
  document.documentElement.style.setProperty('--blue', cfg.primaryColor);
  document.documentElement.style.setProperty('--primary', cfg.primaryColor);

  // Splash screen
  const splashIcon = document.querySelector('.splash-icon');
  const splashTitle = document.querySelector('#splash-screen h1');
  const splashSub = document.querySelector('#splash-screen p');
  if (splashIcon) splashIcon.textContent = cfg.appIcon;
  if (splashTitle) splashTitle.textContent = cfg.appName;
  if (splashSub) splashSub.textContent = cfg.appSubtitle;

  // Login header
  const loginIcon = document.querySelector('.login-icon');
  const loginTitle = document.querySelector('.login-header h1');
  const loginSub = document.querySelector('.login-header p');
  const loginFooter = document.querySelector('.login-footer p');
  if (loginIcon) loginIcon.textContent = cfg.appIcon;
  if (loginTitle) loginTitle.textContent = cfg.appName;
  if (loginSub) loginSub.textContent = cfg.appSubtitle;
  if (loginFooter) loginFooter.textContent = cfg.loginFooterNote;

  // Sidebar header
  const sidebarLogo = document.querySelector('.sidebar-logo');
  const sidebarTitle = document.querySelector('.sidebar-header h2');
  const sidebarSub = document.querySelector('.sidebar-sub');
  if (sidebarLogo) sidebarLogo.textContent = cfg.appIcon;
  if (sidebarTitle) sidebarTitle.textContent = cfg.appName;
  if (sidebarSub) sidebarSub.textContent = cfg.appSubtitle;

  // Ads sidebar
  const adsSidebar = document.getElementById('ads-sidebar');
  if (adsSidebar) adsSidebar.style.display = cfg.showAds ? '' : 'none';

  // Premium button
  const premiumSection = document.querySelector('.sidebar-premium');
  if (premiumSection) premiumSection.style.display = cfg.showPremiumBtn ? '' : 'none';

  // Nome cliente nella sidebar (solo white-label)
  if (cfg.clientName) {
    const existingBadge = document.getElementById('client-name-badge');
    if (!existingBadge) {
      const sidebarHeader = document.querySelector('.sidebar-header');
      if (sidebarHeader) {
        const badge = document.createElement('div');
        badge.id = 'client-name-badge';
        badge.style.cssText = 'font-size:10px;color:#999;margin-top:2px;font-weight:500;letter-spacing:0.3px;';
        badge.textContent = `Powered by ${cfg.clientName}`;
        sidebarHeader.appendChild(badge);
      }
    }
  }
}

// Espone la config e roleService globalmente
window.APP_CONFIG = APP_CONFIG;
window.roleService = roleService;

// Init
window.addEventListener('DOMContentLoaded', () => {
  try {
    // Applica configurazione white-label
    applyAppConfig();

    // Carica i dati persistenti dal localStorage
    storageService.loadData();

    // Nascondi lo splash e mostra sempre l'app direttamente
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
window.hideLoginUI = hideLoginUI;

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

window.showSignUpUI = showSignUpUI;

window.showPremiumModal = function() {
  window.showToast?.('🌟 Funzionalità Premium - Contatta il supporto per l\'upgrade');
};

// Espone APP_CONFIG
window.APP_CONFIG = APP_CONFIG;

// Modal Privacy Policy e Termini di Servizio
window.showLegalModal = function(type) {
  const title = document.getElementById('modal-legal-title');
  const body = document.getElementById('modal-legal-body');
  if (!title || !body) return;
  const cfg = window.APP_CONFIG || APP_CONFIG;
  if (type === 'privacy') {
    title.textContent = 'Privacy Policy';
    body.innerHTML = `<h4 style="margin:0 0 8px">Informativa sulla Privacy</h4>
      <p><strong>In vigore dal:</strong> 11 Agosto 2026</p>
      <h4 style="margin:16px 0 6px">Dati che raccogliamo</h4>
      <ul style="padding-left:18px;margin:0">
        <li>Email e password (autenticazione)</li>
        <li>Dati di progetto: nome, indirizzo, budget</li>
        <li>Dati di lavoro, spese, fornitori, scadenze</li>
      </ul>
      <h4 style="margin:16px 0 6px">Come usiamo i dati</h4>
      <ul style="padding-left:18px;margin:0">
        <li>Per fornire e migliorare il servizio</li>
        <li>Per sincronizzare i dati tra dispositivi</li>
        <li>Non vendiamo i tuoi dati a terzi</li>
      </ul>
      <h4 style="margin:16px 0 6px">Archiviazione</h4>
      <p>I dati sono archiviati su <strong>Supabase</strong> (server UE, conforme GDPR). La password è sempre crittografata.</p>
      <h4 style="margin:16px 0 6px">I tuoi diritti (GDPR)</h4>
      <ul style="padding-left:18px;margin:0">
        <li>Accesso, rettifica e cancellazione dei dati</li>
        <li>Portabilità dei dati (Esporta Backup)</li>
        <li>Opposizione al trattamento</li>
      </ul>
      <p style="margin-top:12px">Contatti: <strong>${cfg.privacyEmail}</strong></p>`;
  } else {
    title.textContent = 'Termini di Servizio';
    body.innerHTML = `<h4 style="margin:0 0 8px">Termini di Servizio</h4>
      <p><strong>In vigore dal:</strong> 11 Agosto 2026</p>
      <h4 style="margin:16px 0 6px">Il Servizio</h4>
      <p>${cfg.appName} è un'app per la gestione di progetti di ristrutturazione edile: lavori, spese, fornitori e scadenze.</p>
      <h4 style="margin:16px 0 6px">Piano Gratuito</h4>
      <ul style="padding-left:18px;margin:0">
        <li>Fino a 3 progetti attivi</li>
        <li>Fino a 50 lavori per progetto</li>
        <li>Tutte le funzionalità base incluse</li>
      </ul>
      <h4 style="margin:16px 0 6px">Responsabilità</h4>
      <p>Il servizio è fornito "così com'è". Esegui backup regolari tramite "Esporta Backup". Non siamo responsabili per perdita di dati.</p>
      <h4 style="margin:16px 0 6px">Account</h4>
      <ul style="padding-left:18px;margin:0">
        <li>Sei responsabile della sicurezza delle credenziali</li>
        <li>Account inattivi da 12 mesi possono essere rimossi</li>
      </ul>
      <p style="margin-top:12px">Contatti: <strong>${cfg.contactEmail}</strong></p>`;
  }
  document.getElementById('modal-legal').classList.remove('hidden');
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

// Computo
window.importComputo = importComputo;
window.clearComputo = clearComputo;
window.toggleVoce = toggleVoce;
window.toggleSelectAll = toggleSelectAll;
window.importVociSelezionate = importVociSelezionate;

// Lavori
window.renderLavori = renderLavori;
window.setLavoriFilter = setLavoriFilter;
window.openModalLavoro = openModalLavoro;
window.salvaLavoro = salvaLavoro;
window.editLavoro = editLavoro;
window.deleteLavoroConfirm = deleteLavoroConfirm;
window.openDettaglioLavoro = openDettaglioLavoro;
window.deleteComputoGroupConfirm = deleteComputoGroupConfirm;
window.setLavoroStato = setLavoroStato;
window.avanzaLavoro = avanzaLavoro;

// Spese
window.renderSpese = renderSpese;
window.setSpeseFilter = setSpeseFilter;
window.openModalSpesa = openModalSpesa;
window.salvaSpesa = salvaSpesa;
window.editSpesa = editSpesa;
window.deleteSpesaConfirm = deleteSpesaConfirm;

// Fornitori
window.renderFornitori = renderFornitori;
window.setFornitoriFilter = setFornitoriFilter;
window.openModalFornitore = openModalFornitore;
window.salvaFornitore = salvaFornitore;
window.editFornitore = editFornitore;
window.deleteFornitoreConfirm = deleteFornitoreConfirm;
window.setRating = setRating;

// Scadenze
window.renderScadenze = renderScadenze;
window.setScadenzeFilter = setScadenzeFilter;
window.openModalScadenza = openModalScadenza;
window.salvaScadenza = salvaScadenza;
window.editScadenza = editScadenza;
window.deleteScadenzaConfirm = deleteScadenzaConfirm;

// TODO: Aggiungere funzioni degli altri componenti quando creati
// - Lavori: openModalLavoro, salvaLavoro, renderLavori, setLavoriFilter, etc.
// - Spese: openModalSpesa, salvaSpesa, renderSpese, setSpeseFilter, etc.
// - Fornitori: openModalFornitore, salvaFornitore, renderFornitori, etc.
// - Scadenze: openModalScadenza, salvaScadenza, renderScadenze, etc.
// - Computo: setupDragDrop, importComputo, processComputoFile, etc.
// - Backup: exportAllData, triggerImportBackup, importBackup
