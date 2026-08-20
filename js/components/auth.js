// ===== AUTENTICAZIONE + FLUSSO INVITI =====

import { supabaseService } from '../services/supabaseService.js';
import { showToast } from './ui.js';
import { loadFromSupabase } from '../services/syncService.js';
import {
  roleService, fetchUserProfile, isClient,
  applyClientMode, removeClientMode, resetRole,
  validateInvitation, processInvitation
} from '../services/roleService.js';

let currentUser = null;
let _inviteToken = null;   // token letto da ?invite=TOKEN
let _inviteData = null;    // dati invito validati

// ── Rileva token di invito nell'URL ──────────────────────────────────────────
function detectInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('invite');
  if (token) {
    _inviteToken = token;
    // Rimuovi il token dall'URL senza ricaricare la pagina
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
  }
  return token;
}

// ── Init autenticazione ───────────────────────────────────────────────────────
export async function initAuth() {
  try {
    // Nascondi splash, mostra app
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');

    // Controlla se c'è un invite token nell'URL
    const token = detectInviteToken();
    if (token) {
      await handleInviteToken(token);
      return;
    }

    // Controlla sessione esistente
    currentUser = await supabaseService.getCurrentUser();
    updateSidebarAuth();

    if (currentUser) {
      const profile = await fetchUserProfile(currentUser.id);
      if (isClient()) {
        applyClientMode(profile);
      } else {
        removeClientMode();
      }
      const welcomeName = roleService.getCurrentProfile()?.display_name || currentUser.email;
      showToast('Benvenuto, ' + welcomeName + '!');
      await loadFromSupabase();
      window.renderAll?.();
      if (isClient()) window.showSection?.('dashboard');
    } else {
      showGuestWarning();
    }
  } catch (error) {
    console.error('Auth init error:', error);
    updateSidebarAuth();
    showGuestWarning();
  }
}

// ── Gestione token di invito ───────────────────────────────────────────────────
async function handleInviteToken(token) {
  // Valida il token
  _inviteData = await validateInvitation(token);

  if (!_inviteData) {
    showToast('Invito non valido o scaduto');
    showGuestWarning();
    return;
  }

  // Controlla se l'utente è già loggato
  currentUser = await supabaseService.getCurrentUser();
  if (currentUser) {
    // Utente già loggato: processa direttamente l'invito
    const result = await processInvitation(token, currentUser.id);
    if (result.success) {
      showToast('Progetto collegato con successo!');
      const profile = await fetchUserProfile(currentUser.id);
      if (isClient()) applyClientMode(profile);
      await loadFromSupabase();
      window.renderAll?.();
      window.showSection?.('dashboard');
    } else {
      showToast('Errore: ' + result.error);
    }
    updateSidebarAuth();
    return;
  }

  // Utente non loggato: mostra form di registrazione speciale
  updateSidebarAuth();
  showInviteSignupUI(_inviteData);
}

// ── Mostra form signup con messaggio invito ───────────────────────────────────
function showInviteSignupUI(inviteData) {
  const nomeProgetto = inviteData.progetti?.nome || 'un progetto';
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.classList.remove('hidden');

  // Nascondi login, mostra signup
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm) loginForm.classList.add('hidden');
  if (signupForm) signupForm.classList.remove('hidden');

  // Aggiorna header con messaggio invito
  const inviteBanner = document.getElementById('invite-banner');
  if (inviteBanner) {
    inviteBanner.style.display = 'block';
    inviteBanner.innerHTML =
      '<div style="background:rgba(0,122,255,.08);border:1px solid rgba(0,122,255,.2);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#007AFF;text-align:center;">' +
      '<div style="font-size:20px;margin-bottom:4px;">🔗</div>' +
      '<div style="font-weight:700;margin-bottom:2px;">Sei stato invitato!</div>' +
      '<div style="opacity:.85;">Registrati per accedere al progetto<br><strong>' + nomeProgetto + '</strong></div>' +
      '</div>';
  }
}

// ── Signup normale (solo admin) ──────────────────────────────────────────────
export async function handleSignUp() {
  const email = document.getElementById('signup-email')?.value;
  const password = document.getElementById('signup-password')?.value;
  const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
  const consentiCheckbox = document.getElementById('signup-consent');

  if (!email || !password || !passwordConfirm) {
    showToast('Compila tutti i campi');
    return;
  }
  if (password !== passwordConfirm) {
    showToast('Le password non coincidono');
    return;
  }
  if (password.length < 6) {
    showToast('Password deve avere almeno 6 caratteri');
    return;
  }
  if (!consentiCheckbox || !consentiCheckbox.checked) {
    showToast('Devi accettare i Termini e la Privacy Policy');
    return;
  }

  try {
    const result = await supabaseService.signUp(email, password);
    if (result.success) {
      // Se registrazione con invito, processa il token
      if (_inviteToken && result.user) {
        const invResult = await processInvitation(_inviteToken, result.user.id);
        if (invResult.success) {
          showToast('Account creato! Accedi con le tue credenziali.');
          _inviteToken = null;
          _inviteData = null;
        } else {
          showToast('Account creato, ma errore invito: ' + invResult.error);
        }
      } else {
        showToast('Registrazione completata! Controlla la tua email.');
      }
      // Pulisci form e mostra login
      document.getElementById('signup-email').value = '';
      document.getElementById('signup-password').value = '';
      document.getElementById('signup-password-confirm').value = '';
      toggleAuthMode();
    } else {
      showToast('Errore: ' + result.error);
    }
  } catch (error) {
    showToast('Errore: ' + error.message);
  }
}

// ── Sign in ───────────────────────────────────────────────────────────────────
export async function handleSignIn() {
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showToast('Inserisci email e password');
    return;
  }

  try {
    const result = await supabaseService.signIn(email, password);
    if (result.success) {
      currentUser = result.user;
      const profile = await fetchUserProfile(currentUser.id);
      const welcomeName = roleService.getCurrentProfile()?.display_name || currentUser.email;
      showToast('Benvenuto, ' + welcomeName + '!');
      showAuthUI();
      if (isClient()) {
        applyClientMode(profile);
      } else {
        removeClientMode();
      }
      await loadFromSupabase();
      window.renderAll?.();
      if (isClient()) window.showSection?.('dashboard');
      // Rimuovi banner invito se presente
      const inviteBanner = document.getElementById('invite-banner');
      if (inviteBanner) inviteBanner.style.display = 'none';
    } else {
      showToast('Credenziali non valide: ' + result.error);
    }
  } catch (error) {
    showToast('Errore: ' + error.message);
  }
}

// ── Sign out ──────────────────────────────────────────────────────────────────
export async function handleSignOut() {
  try {
    const result = await supabaseService.signOut();
    if (result.success) {
      currentUser = null;
      resetRole();
      removeClientMode();
      localStorage.removeItem('ristrutturaApp_v2');
      if (window.storageService) {
        window.storageService.state = {
          progetti: [], progettoAttivoId: null,
          lavori: [], spese: [], fornitori: [], scadenze: [], computoData: null
        };
      }
      showToast('Logout completato');
      const progettoAttivoEl = document.getElementById('progetto-attivo-name');
      if (progettoAttivoEl) progettoAttivoEl.textContent = 'Nessun progetto';
      const progettiList = document.getElementById('progetti-list');
      if (progettiList) progettiList.innerHTML = '';
      window.renderAll?.();
      updateSidebarAuth();
      sessionStorage.removeItem('guestWarningShown');
      showGuestWarning();
    } else {
      showToast('Errore logout: ' + result.error);
    }
  } catch (error) {
    showToast('Errore: ' + error.message);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
export function toggleAuthMode() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm && signupForm) {
    loginForm.classList.toggle('hidden');
    signupForm.classList.toggle('hidden');
  }
}

export function showLoginUI() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm) loginForm.classList.remove('hidden');
  if (signupForm) signupForm.classList.add('hidden');
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.classList.remove('hidden');
  // Nascondi banner invito
  const inviteBanner = document.getElementById('invite-banner');
  if (inviteBanner) inviteBanner.style.display = 'none';
}

export function showSignUpUI() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm) loginForm.classList.add('hidden');
  if (signupForm) signupForm.classList.remove('hidden');
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.classList.remove('hidden');
}

export function hideLoginUI() {
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.classList.add('hidden');
}

export function showAuthUI() {
  hideLoginUI();
  updateSidebarAuth();
}

export function showLandingPage() {
  updateSidebarAuth();
}

// ── Guest warning ─────────────────────────────────────────────────────────────
function showGuestWarning() {
  if (sessionStorage.getItem('guestWarningShown')) return;
  sessionStorage.setItem('guestWarningShown', '1');

  const banner = document.createElement('div');
  banner.id = 'guest-warning-banner';
  banner.innerHTML =
    '<div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(255,149,0,0.97);color:white;padding:16px 20px;border-radius:16px;z-index:8000;max-width:380px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.3);font-size:14px;animation:toastIn 0.3s ease;">' +
    '<div style="font-size:22px;margin-bottom:8px;">⚠️ Modalità Ospite</div>' +
    '<div style="line-height:1.5;margin-bottom:14px;">Stai usando l\'app <strong>senza accedere</strong>.<br>I dati verranno <strong>persi</strong> al termine della sessione.</div>' +
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
    '<button onclick="window.showLoginUI?.();document.getElementById(\'guest-warning-banner\')?.remove();" style="background:white;color:#FF9500;border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">Accedi ora</button>' +
    '<button onclick="document.getElementById(\'guest-warning-banner\')?.remove();" style="background:transparent;color:white;border:1.5px solid rgba(255,255,255,0.8);padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Continua senza login</button>' +
    '</div></div>';
  document.body.appendChild(banner);
  setTimeout(() => banner?.remove(), 15000);
}

// ── Aggiorna sidebar ──────────────────────────────────────────────────────────
function updateSidebarAuth() {
  const authStatusSidebar = document.getElementById('auth-status-sidebar');
  const authUserInfo = document.getElementById('auth-user-info');
  const sidebarEmail = document.getElementById('sidebar-user-email');

  if (currentUser) {
    if (authStatusSidebar) authStatusSidebar.style.display = 'none';
    if (authUserInfo) authUserInfo.style.display = 'block';
    if (sidebarEmail) sidebarEmail.textContent = currentUser.email;
  } else {
    if (authStatusSidebar) authStatusSidebar.style.display = '';
    if (authUserInfo) authUserInfo.style.display = 'none';
  }
}

export function getCurrentUser() { return currentUser; }
export function setCurrentUser(user) { currentUser = user; }
