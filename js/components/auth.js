// ===== AUTENTICAZIONE =====
// Gestisce signup, signin, logout e session

import { supabaseService } from '../services/supabaseService.js';
import { showToast } from './ui.js';

let currentUser = null;

export async function initAuth() {
  try {
    currentUser = await supabaseService.getCurrentUser();
    if (currentUser) {
      console.log('User authenticated:', currentUser.email);
      showAuthUI();
    } else {
      showLoginUI();
    }
  } catch (error) {
    console.error('Auth init error:', error);
    showLoginUI();
  }
}

export function showLoginUI() {
  const app = document.getElementById('app');
  const splash = document.getElementById('splash-screen');
  
  if (splash) splash.style.display = 'none';
  if (app) app.classList.add('hidden');
  
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) {
    loginContainer.classList.remove('hidden');
  }
}

export function showAuthUI() {
  const loginContainer = document.getElementById('login-container');
  const app = document.getElementById('app');
  
  if (loginContainer) loginContainer.classList.add('hidden');
  if (app) {
    app.classList.remove('hidden');
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';
  }
}

export async function handleSignUp() {
  const email = document.getElementById('signup-email')?.value;
  const password = document.getElementById('signup-password')?.value;
  const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
  
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
  
  try {
    const result = await supabaseService.signUp(email, password);
    if (result.success) {
      showToast('✅ Registrazione completata! Controlla la tua email');
      // Reset form
      document.getElementById('signup-email').value = '';
      document.getElementById('signup-password').value = '';
      document.getElementById('signup-password-confirm').value = '';
      // Switch to login
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
      showToast('✅ Benvenuto!');
      showAuthUI();
      // Reload app
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
      showToast('✅ Logout completato');
      showLoginUI();
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
