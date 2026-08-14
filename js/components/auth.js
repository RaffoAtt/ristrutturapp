// ===== AUTENTICAZIONE =====
// Gestisce signup, signin, logout e session

import { supabaseService } from '../services/supabaseService.js';
import { showToast } from './ui.js';
import { loadFromSupabase } from '../services/syncService.js';

let currentUser = null;

export async function initAuth() {
  try {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';

    // Mostra sempre l'app - il login è opzionale dalla sidebar
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');

    // Controlla se c'è una sessione attiva e aggiorna la sidebar
    currentUser = await supabaseService.getCurrentUser();
    updateSidebarAuth();

    // Se autenticato, carica i dati da Supabase
    if (currentUser) {
      await loadFromSupabase();
      window.renderAll?.();
    } else {
      showGuestWarning();
    }
  } catch (error) {
    console.error('Auth init error:', error);
    updateSidebarAuth();
    showGuestWarning();
  }
}

function showGuestWarning() {
  if (sessionStorage.getItem('guestWarningShown')) return;
  sessionStorage.setItem('guestWarningShown', '1');

  const banner = document.createElement('div');
  banner.id = 'guest-warning-banner';
  banner.innerHTML = `
    <div style="
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(255,149,0,0.97); color: white;
      padding: 16px 20px; border-radius: 16px; z-index: 8000;
      max-width: 380px; width: 90%; text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3); font-size: 14px;
      animation: toastIn 0.3s ease;
    ">
      <div style="font-size: 22px; margin-bottom: 8px;">⚠️ Modalità Ospite</div>
      <div style="line-height: 1.5; margin-bottom: 14px;">
        Stai usando l&rsquo;app <strong>senza accedere</strong>.<br>
        I dati verranno <strong>persi</strong> al termine della sessione.
      </div>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button onclick="window.showLoginUI?.(); document.getElementById('guest-warning-banner')?.remove();"
          style="background: white; color: #FF9500; border: none; padding: 9px 18px;
          border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;">
          🔓 Accedi ora
        </button>
        <button onclick="document.getElementById('guest-warning-banner')?.remove();"
          style="background: transparent; color: white; border: 1.5px solid rgba(255,255,255,0.8);
          padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
          Continua senza login
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner?.remove(), 15000);
}

// Aggiorna la sidebar in base allo stato di autenticazione
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

export function showLandingPage() {
  updateSidebarAuth();
}

export function showLoginUI() {
  // Resetta sempre al form di login (non registrazione)
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm) loginForm.classList.remove('hidden');
  if (signupForm) signupForm.classList.add('hidden');
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.classList.remove('hidden');
}

export function showSignUpUI() {
  // Mostra direttamente il form di registrazione
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

export async function handleSignUp() {
  const email = document.getElementById('signup-email')?.value;
  const password = document.getElementById('signup-password')?.value;
  const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
  const consentiCheckbox = document.getElementById('signup-consent');

  if (!email || !password || !passwordConfirm) {
    showToast('⚠️ Compila tutti i campi');
    return;
  }
  if (password !== passwordConfirm) {
    showToast('❌ Le password non coincidono');
    return;
  }
  if (password.length < 6) {
    showToast('❌ Password deve avere almeno 6 caratteri');
    return;
  }
  if (!consentiCheckbox || !consentiCheckbox.checked) {
    showToast('❌ Devi accettare i Termini e la Privacy Policy');
    return;
  }

  try {
    const result = await supabaseService.signUp(email, password);
    if (result.success) {
      showToast('✅ Registrazione completata! Controlla la tua email');
      document.getElementById('signup-email').value = '';
      document.getElementById('signup-password').value = '';
      document.getElementById('signup-password-confirm').value = '';
      toggleAuthMode();
    } else {
      showToast('❌ ' + result.error);
    }
  } catch (error) {
    showToast('❌ Errore: ' + error.message);
  }
}

export async function handleSignIn() {
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showToast('⚠️ Inserisci email e password');
    return;
  }

  try {
    const result = await supabaseService.signIn(email, password);
    if (result.success) {
      currentUser = result.user;
      showToast('✅ Benvenuto, ' + currentUser.email + '!');
      showAuthUI();
      await loadFromSupabase();
      window.renderAll?.();
    } else {
      showToast('❌ ' + result.error);
    }
  } catch (error) {
    showToast('❌ Errore: ' + error.message);
  }
}

export async function handleSignOut() {
  try {
    const result = await supabaseService.signOut();
    if (result.success) {
      currentUser = null;
      // Pulisci il localStorage per non lasciare i dati di questo utente visibili
      localStorage.removeItem('ristrutturaApp_v2');
      window.storageService?.loadData?.();
      showToast('✅ Logout completato');
      // Resetta UI sidebar
      const progettoAttivoEl = document.getElementById('progetto-attivo-name');
      if (progettoAttivoEl) progettoAttivoEl.textContent = 'Nessun progetto';
      const progettiList = document.getElementById('progetti-list');
      if (progettiList) progettiList.innerHTML = '<li style="color:var(--text3);font-size:13px">Nessun progetto</li>';
      window.renderAll?.();
      updateSidebarAuth();
      sessionStorage.removeItem('guestWarningShown');
      showGuestWarning();
    } else {
      showToast('❌ ' + result.error);
    }
  } catch (error) {
    showToast('❌ Errore: ' + error.message);
  }
}

export function toggleAuthMode() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm && signupForm) {
    loginForm.classList.toggle('hidden');
    signupForm.classList.toggle('hidden');
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}
