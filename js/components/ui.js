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
  sb.classList.toggle('open');
  sb.classList.toggle('hidden');
  ov.classList.toggle('hidden');
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}

export function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  document.getElementById('page-title').textContent = sectionTitles[name] || name;
}
