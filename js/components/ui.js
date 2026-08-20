// ===== UI COMPONENTS - MODALI, TOAST, SIDEBAR =====

import { sectionTitles } from '../utils/constants.js';

let toastTimer = null;
let confirmCallback = null;

export function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

export function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

export function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
}

export function showToastPersistent(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
}

export function hideToast() {
  const t = document.getElementById('toast');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  t.classList.add('hidden');
}

export function showConfirm(title, msg, icon, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-icon').textContent = icon || '⚠️';
  confirmCallback = cb;
  document.getElementById('confirm-overlay').classList.remove('hidden');
}

export function hideConfirm(confirmed) {
  document.getElementById('confirm-overlay').classList.add('hidden');
  if (confirmed && confirmCallback) confirmCallback();
  confirmCallback = null;
}

export function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (!sb) return;
  const isOpen = sb.classList.contains('open');
  if (isOpen) {
    sb.classList.remove('open');
    ov?.classList.add('hidden');
  } else {
    sb.classList.add('open');
    ov?.classList.remove('hidden');
  }
}

export function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb?.classList.remove('open');
  ov?.classList.add('hidden');
}

export function showSection(name) {
  // Sezioni riservate agli admin: blocca accesso a client e ospiti
  const isClient = window.roleService?.isClient?.();
  const isGuest = !window.roleService?.getCurrentRole?.() && !window.roleService?.getCurrentProfile?.();
  const adminOnly = ['impostazioni', 'computo', 'fornitori'];
  if ((isClient || isGuest) && name === 'impostazioni') { name = 'dashboard'; }
  if (isClient && adminOnly.includes(name)) { name = 'dashboard'; }

  // Nascondi tutte le sezioni
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Rimuovi active da tutti i nav (bottom bar e sidebar)
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  // Mostra la sezione selezionata
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  // Aggiorna nav nella sidebar (ID formato: nav-dashboard-sidebar)
  const navSidebar = document.getElementById('nav-' + name + '-sidebar');
  if (navSidebar) navSidebar.classList.add('active');
  // Aggiorna page title se esiste
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = sectionTitles[name] || name;

  // Azioni specifiche per sezione
  if (name === 'documenti') {
    setTimeout(() => window.renderDocumenti?.(), 100);
  }
  if (name === 'impostazioni') {
    setTimeout(() => {
      window.loadImpostazioni?.();
      window.renderGestioneClienti?.();
    }, 50);
  }
}
