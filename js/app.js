// ===== MAIN APP ENTRY POINT =====
// Importa tutti i moduli e li espone su window per gli onclick inline HTML

import { APP_CONFIG } from './config/appConfig.js';
import { roleService, createInvitation, getInvitations, deleteInvitation } from './services/roleService.js';
import { clientService } from './services/clientService.js';
import { escHtml, uid, fmtEur, fmtData, daysDiff } from './utils/helpers.js';
import { catIcons, catColors, spesaIcons, spesaColors, statoLabel, sectionTitles, tipoScadenzaIcons } from './utils/constants.js';
import { storageService } from './services/storageService.js';
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
  showAuthUI, showLoginUI, hideLoginUI, showSignUpUI
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

// ===== RENDER PRINCIPALE =====
function renderAll() {
  renderSidebar();
  renderDashboard();
  renderLavori();
  renderSpese();
  renderFornitori();
  renderScadenze();
}

// ===== PULSANTE FAB CONTESTUALE =====
function handleAddBtn() {
  const active = document.querySelector('.section.active');
  if (!active) return;
  const id = active.id;
  if (!storageService.getProgetto() && id !== 'section-impostazioni') {
    showToast('Crea prima un progetto');
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

  document.title = cfg.appName;
  document.documentElement.style.setProperty('--blue', cfg.primaryColor);
  document.documentElement.style.setProperty('--primary', cfg.primaryColor);

  const splashIcon = document.querySelector('.splash-icon');
  const splashTitle = document.querySelector('#splash-screen h1');
  const splashSub = document.querySelector('#splash-screen p');
  if (splashIcon) splashIcon.textContent = cfg.appIcon;
  if (splashTitle) splashTitle.textContent = cfg.appName;
  if (splashSub) splashSub.textContent = cfg.appSubtitle;

  const loginIcon = document.querySelector('.login-icon');
  const loginTitle = document.querySelector('.login-header h1');
  const loginSub = document.querySelector('.login-header p');
  const loginFooter = document.querySelector('.login-footer p');
  if (loginIcon) loginIcon.textContent = cfg.appIcon;
  if (loginTitle) loginTitle.textContent = cfg.appName;
  if (loginSub) loginSub.textContent = cfg.appSubtitle;
  if (loginFooter) loginFooter.textContent = cfg.loginFooterNote;

  const sidebarLogo = document.querySelector('.sidebar-logo');
  const sidebarTitle = document.querySelector('.sidebar-header h2');
  const sidebarSub = document.querySelector('.sidebar-sub');
  if (sidebarLogo) sidebarLogo.textContent = cfg.appIcon;
  if (sidebarTitle) sidebarTitle.textContent = cfg.appName;
  if (sidebarSub) sidebarSub.textContent = cfg.appSubtitle;

  const docNav = document.getElementById('nav-documenti-sidebar');
  if (docNav) docNav.style.display = cfg.showDocumenti ? '' : 'none';

  if (cfg.clientName) {
    const existingBadge = document.getElementById('client-name-badge');
    if (!existingBadge) {
      const sidebarHeader = document.querySelector('.sidebar-header');
      if (sidebarHeader) {
        const badge = document.createElement('div');
        badge.id = 'client-name-badge';
        badge.style.cssText = 'font-size:10px;color:#999;margin-top:2px;font-weight:500;';
        badge.textContent = 'Powered by ' + cfg.clientName;
        sidebarHeader.appendChild(badge);
      }
    }
  }
}

// ===== BACKUP / EXPORT =====

window.exportAllData = function () {
  try {
    const data = storageService.getState();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ristrutturapp_backup_' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup esportato');
  } catch (e) {
    showToast('Errore esportazione: ' + e.message);
  }
};

window.triggerImportBackup = function () {
  document.getElementById('import-backup-input')?.click();
};

window.importBackup = function (event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.progetti) throw new Error('File non valido');
      storageService.setState(data);
      renderAll();
      showToast('Backup importato con successo');
    } catch (err) {
      showToast('Errore importazione: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};

// ===== LEGAL MODAL =====

window.showLegalModal = function (type) {
  const title = document.getElementById('modal-legal-title');
  const body = document.getElementById('modal-legal-body');
  if (!title || !body) return;
  const cfg = APP_CONFIG;
  if (type === 'privacy') {
    title.textContent = 'Privacy Policy';
    body.innerHTML =
      '<h4 style="margin:0 0 8px">Informativa sulla Privacy</h4>' +
      '<p><strong>In vigore dal:</strong> Agosto 2026</p>' +
      '<h4 style="margin:16px 0 6px">Dati che raccogliamo</h4>' +
      '<ul style="padding-left:18px;margin:0">' +
        '<li>Email e password (autenticazione)</li>' +
        '<li>Dati di progetto: nome, indirizzo, budget</li>' +
        '<li>Dati di lavoro, spese, fornitori, scadenze</li>' +
      '</ul>' +
      '<h4 style="margin:16px 0 6px">Come usiamo i dati</h4>' +
      '<ul style="padding-left:18px;margin:0">' +
        '<li>Per fornire e migliorare il servizio</li>' +
        '<li>Per sincronizzare i dati tra dispositivi</li>' +
        '<li>Non vendiamo i tuoi dati a terzi</li>' +
      '</ul>' +
      '<h4 style="margin:16px 0 6px">Archiviazione</h4>' +
      '<p>I dati sono archiviati su <strong>Supabase</strong> (server UE, conforme GDPR).</p>' +
      '<p style="margin-top:12px">Contatti: <strong>' + cfg.privacyEmail + '</strong></p>';
  } else {
    title.textContent = 'Termini di Servizio';
    body.innerHTML =
      '<h4 style="margin:0 0 8px">Termini di Servizio</h4>' +
      '<p><strong>In vigore dal:</strong> Agosto 2026</p>' +
      '<h4 style="margin:16px 0 6px">Il Servizio</h4>' +
      '<p>' + cfg.appName + ' e\' un\'app per la gestione di progetti di ristrutturazione.</p>' +
      '<h4 style="margin:16px 0 6px">Account</h4>' +
      '<ul style="padding-left:18px;margin:0">' +
        '<li>Sei responsabile della sicurezza delle credenziali</li>' +
        '<li>Account inattivi da 12 mesi possono essere rimossi</li>' +
      '</ul>' +
      '<p style="margin-top:12px">Contatti: <strong>' + cfg.contactEmail + '</strong></p>';
  }
  document.getElementById('modal-legal').classList.remove('hidden');
};

// ===== DOCUMENTI =====

async function renderDocumenti() {
  const prog = storageService.getProgetto();
  const el = document.getElementById('documenti-list');
  const uploadArea = document.getElementById('doc-upload-area');
  if (!el) return;

  if (uploadArea) {
    uploadArea.style.display = roleService.isAdmin() ? 'block' : 'none';
  }

  if (!prog) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><h3>Seleziona un progetto</h3></div>';
    return;
  }

  const docs = await clientService.getDocumenti(prog.id);
  if (!docs.length) {
    const msg = roleService.isAdmin() ? 'Carica documenti da condividere con il cliente' : 'Nessun documento disponibile';
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><h3>Nessun documento</h3><p>' + msg + '</p></div>';
    return;
  }

  const tipoIcon = { preventivo: '📋', contratto: '📝', sal: '📊', fattura: '🧾', altro: '📄' };
  const rows = docs.map(function (d) {
    const icon = tipoIcon[d.tipo] || '📄';
    const vis = d.visibile_cliente ? '👁 Visibile al cliente' : '🔒 Solo admin';
    let html = '<div class="doc-card">';
    html += '<div class="doc-icon">' + icon + '</div>';
    html += '<div class="doc-info">';
    html += '<div class="doc-nome">' + escHtml(d.nome) + '</div>';
    html += '<div class="doc-meta">' + escHtml(d.tipo) + ' · ' + vis + '</div>';
    html += '</div>';
    html += '<button class="doc-download" onclick="scaricaDocumento(\'' + escHtml(d.storage_path) + '\',\'' + escHtml(d.nome) + '\')">⬇️</button>';
    if (roleService.isAdmin()) {
      html += '<button onclick="eliminaDocumento(\'' + d.id + '\',\'' + escHtml(d.storage_path) + '\')" style="background:none;border:none;cursor:pointer;font-size:18px;padding:4px 8px;">🗑️</button>';
    }
    html += '</div>';
    return html;
  });
  el.innerHTML = rows.join('');
}

window.handleDocUpload = async function (event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const prog = storageService.getProgetto();
  if (!prog) { showToast('Seleziona prima un progetto'); return; }
  const tipo = document.getElementById('doc-tipo')?.value || 'altro';
  const visibile = document.getElementById('doc-visibile-cliente')?.checked ?? true;
  showToast('Caricamento in corso...');
  const result = await clientService.uploadDocumento(prog.id, file, tipo, visibile);
  if (result.success) { showToast('Documento caricato'); renderDocumenti(); }
  else showToast('Errore: ' + result.error);
  event.target.value = '';
};

window.scaricaDocumento = async function (storagePath, nome) {
  const url = await clientService.getDocumentoUrl(storagePath);
  if (!url) { showToast('Impossibile scaricare il file'); return; }
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.eliminaDocumento = async function (id, storagePath) {
  if (!confirm('Eliminare questo documento?')) return;
  const result = await clientService.deleteDocumento(id, storagePath);
  if (result.success) { showToast('Documento eliminato'); renderDocumenti(); }
  else showToast('Errore: ' + result.error);
};

// ===== APPROVAZIONE LAVORI =====

window.approvaLavoroClient = async function (lavoroId) {
  const result = await clientService.approvaLavoro(lavoroId);
  if (result.success) { showToast('Lavoro approvato'); renderAll(); hideModal('modal-dettaglio-lavoro'); }
  else showToast('Errore: ' + result.error);
};

window.richiediModificaClient = async function (lavoroId) {
  const result = await clientService.richiediModificaLavoro(lavoroId);
  if (result.success) { showToast('Modifica richiesta'); renderAll(); hideModal('modal-dettaglio-lavoro'); }
  else showToast('Errore: ' + result.error);
};

window.richiediApprovazioneAdmin = async function (lavoroId) {
  const result = await clientService.richiediApprovazione(lavoroId);
  if (result.success) { showToast('Inviato al cliente per approvazione'); renderAll(); }
  else showToast('Errore: ' + result.error);
};

// ===== NOTE CLIENTE =====

window.aggiungiNotaCliente = async function (lavoroId) {
  const input = document.getElementById('nota-cliente-input');
  const testo = input?.value?.trim();
  if (!testo) { showToast('Scrivi una nota prima'); return; }
  const result = await clientService.addNotaCliente(lavoroId, testo);
  if (result.success) {
    showToast('Nota aggiunta');
    input.value = '';
    const noteEl = document.getElementById('note-cliente-list');
    if (noteEl) {
      const note = await clientService.getNoteCliente(lavoroId);
      noteEl.innerHTML = renderNoteList(note, lavoroId);
    }
  } else showToast('Errore: ' + result.error);
};

window.eliminaNotaCliente = async function (notaId, lavoroId) {
  const result = await clientService.deleteNotaCliente(notaId);
  if (result.success) {
    const noteEl = document.getElementById('note-cliente-list');
    if (noteEl) {
      const note = await clientService.getNoteCliente(lavoroId);
      noteEl.innerHTML = renderNoteList(note, lavoroId);
    }
  }
};

function renderNoteList(note, lavoroId) {
  if (!note.length) return '<div style="color:#8E8E93;font-size:13px;padding:8px 0;">Nessuna nota</div>';
  return note.map(function (n) {
    let h = '<div class="nota-cliente-item">';
    h += '<div class="nota-cliente-meta">' + new Date(n.created_at).toLocaleString('it-IT') + '</div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
    h += '<div class="nota-cliente-testo">' + escHtml(n.testo) + '</div>';
    h += '<button onclick="eliminaNotaCliente(\'' + n.id + '\',\'' + lavoroId + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;color:#8E8E93;flex-shrink:0;">✕</button>';
    h += '</div></div>';
    return h;
  }).join('');
}

// ===== CARICA FEATURE CLIENT NEL MODAL DETTAGLIO LAVORO =====

window.loadClientFeatures = async function (lavoroId, statoLavoro) {
  const container = document.getElementById('client-features-container');
  if (!container) return;

  const note = await clientService.getNoteCliente(lavoroId);
  const isClient = roleService.isClient();
  const isAdmin = roleService.isAdmin();

  let html = '';

  if (isClient && statoLavoro === 'attesa_approvazione') {
    html += '<div style="margin-top:16px;">';
    html += '<div class="det-section-title">Approvazione</div>';
    html += '<p style="font-size:13px;color:#636366;margin-bottom:10px;">L\'impresa richiede la tua approvazione per questo lavoro.</p>';
    html += '<div class="approval-buttons">';
    html += '<button class="btn-approva" onclick="approvaLavoroClient(\'' + lavoroId + '\')">Approvo</button>';
    html += '<button class="btn-modifica-richiesta" onclick="richiediModificaClient(\'' + lavoroId + '\')">Richiedo modifiche</button>';
    html += '</div></div>';
  }

  if (isAdmin && (statoLavoro === 'da_fare' || statoLavoro === 'in_corso')) {
    html += '<div style="margin-top:16px;">';
    html += '<button onclick="richiediApprovazioneAdmin(\'' + lavoroId + '\')" style="width:100%;padding:10px;background:rgba(175,82,222,.1);color:#AF52DE;border:1.5px solid rgba(175,82,222,.3);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">';
    html += 'Invia al cliente per approvazione</button></div>';
  }

  html += '<div style="margin-top:16px;">';
  html += '<div class="det-section-title">Note Cliente</div>';
  html += '<div id="note-cliente-list">' + renderNoteList(note, lavoroId) + '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:10px;">';
  html += '<input id="nota-cliente-input" type="text" class="form-input" placeholder="Scrivi una nota..." style="flex:1;" />';
  html += '<button onclick="aggiungiNotaCliente(\'' + lavoroId + '\')" style="padding:10px 14px;background:#007AFF;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;white-space:nowrap;">Invia</button>';
  html += '</div></div>';

  container.innerHTML = html;
};

window.renderDocumenti = renderDocumenti;

// ===== GESTIONE CLIENTI E INVITI (solo admin) =====

async function renderGestioneClienti() {
  const el = document.getElementById('gestione-clienti-body');
  if (!el) return;
  if (!roleService.isAdmin()) { el.style.display = 'none'; return; }
  el.style.display = '';
  const prog = storageService.getProgetto();
  const inviti = await getInvitations();
  const pendenti = inviti.filter(function(i) { return !i.used_at && new Date(i.expires_at) > new Date(); });
  let html = '';
  if (prog) {
    html += '<div class="form-group"><label>Nome cliente (opzionale)</label>';
    html += '<input type="text" id="invite-display-name" class="form-input" placeholder="Es. Mario Rossi" /></div>';
    html += '<button class="btn-primary full-btn" style="margin-bottom:8px;" onclick="generaInvito()">🔗 Genera Link di Invito</button>';
    html += '<div id="invite-link-box"></div>';
  } else {
    html += '<p style="color:var(--text3);font-size:13px;">Seleziona un progetto per generare inviti.</p>';
  }
  if (pendenti.length) {
    html += '<div style="margin-top:16px;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Inviti in attesa (' + pendenti.length + ')</div>';
    pendenti.forEach(function(inv) {
      const scade = new Date(inv.expires_at).toLocaleDateString('it-IT');
      const link = window.location.origin + window.location.pathname + '?invite=' + inv.token;
      html += '<div style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:6px;">';
      html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;">' + escHtml(inv.display_name || 'Cliente') + '</div>';
      html += '<div style="font-size:11px;color:var(--text3);">' + escHtml(inv.progetti?.nome || '') + ' · scade ' + scade + '</div></div>';
      html += '<button onclick="copiaLink(\'' + escHtml(link) + '\')" style="padding:6px 10px;background:rgba(0,122,255,.1);color:var(--blue);border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;">📋 Copia</button>';
      html += '<button onclick="eliminaInvito(\'' + inv.id + '\')" style="padding:6px 8px;background:rgba(255,59,48,.1);color:#FF3B30;border:none;border-radius:8px;font-size:12px;cursor:pointer;">✕</button>';
      html += '</div>';
    });
  }
  el.innerHTML = html;
}

window.generaInvito = async function() {
  const prog = storageService.getProgetto();
  if (!prog) { showToast('Seleziona prima un progetto'); return; }
  const displayName = document.getElementById('invite-display-name')?.value?.trim() || '';
  showToast('Generazione link in corso...');
  const result = await createInvitation(prog.id, displayName);
  if (!result.success) { showToast('Errore: ' + result.error); return; }
  const link = window.location.origin + window.location.pathname + '?invite=' + result.token;
  const box = document.getElementById('invite-link-box');
  if (box) {
    box.innerHTML =
      '<div style="background:var(--bg3);border-radius:10px;padding:10px 12px;margin-top:4px;">' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600;">Link di invito (valido 7 giorni):</div>' +
      '<div style="font-size:12px;word-break:break-all;color:var(--blue);margin-bottom:8px;">' + escHtml(link) + '</div>' +
      '<button onclick="copiaLink(\'' + escHtml(link) + '\')" class="btn-primary full-btn" style="font-size:13px;padding:8px;">📋 Copia Link</button>' +
      '</div>';
  }
  renderGestioneClienti();
  showToast('Link generato!');
};

window.copiaLink = async function(link) {
  try {
    await navigator.clipboard.writeText(link);
    showToast('Link copiato negli appunti!');
  } catch(e) {
    showToast('Copia manuale: ' + link);
  }
};

window.eliminaInvito = async function(id) {
  const result = await deleteInvitation(id);
  if (result.success) { showToast('Invito eliminato'); renderGestioneClienti(); }
  else showToast('Errore: ' + result.error);
};

window.renderGestioneClienti = renderGestioneClienti;

// ===== INIT =====

window.addEventListener('DOMContentLoaded', function () {
  try {
    applyAppConfig();
    storageService.loadData();

    // Nascondi splash e mostra app dopo breve ritardo
    setTimeout(function () {
      const splash = document.getElementById('splash-screen');
      const app = document.getElementById('app');
      if (splash) splash.style.display = 'none';
      if (app) app.classList.remove('hidden');
    }, 1200);

    initAuth();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  } catch (e) {
    console.error('Errore init:', e);
  }
});

// ===== ESPONE FUNZIONI SU WINDOW =====

window.APP_CONFIG = APP_CONFIG;
window.roleService = roleService;
window.clientService = clientService;

// Auth
window.initAuth = initAuth;
window.handleSignUp = handleSignUp;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
window.toggleAuthMode = toggleAuthMode;
window.showAuthUI = showAuthUI;
window.showLoginUI = showLoginUI;
window.hideLoginUI = hideLoginUI;
window.showSignUpUI = showSignUpUI;

// UI
window.showModal = showModal;
window.hideModal = hideModal;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.hideConfirm = hideConfirm;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showSection = showSection;

// Render
window.renderAll = renderAll;
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

// Helpers / costanti
window.escHtml = escHtml;
window.uid = uid;
window.fmtEur = fmtEur;
window.fmtData = fmtData;
window.daysDiff = daysDiff;
window.catIcons = catIcons;
window.catColors = catColors;
window.spesaIcons = spesaIcons;
window.spesaColors = spesaColors;
window.statoLabel = statoLabel;
window.tipoScadenzaIcons = tipoScadenzaIcons;

// Storage
window.storageService = storageService;

// FAB
window.handleAddBtn = handleAddBtn;

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
