// ===== ROLE SERVICE =====
// Gestisce i ruoli admin/client nel sistema 1:N (Azienda → Clienti)
//
// RUOLI:
//   admin  → l'impresa/studio tecnico: accesso completo, crea/modifica tutto
//   client → il cliente dell'impresa: accesso in sola lettura al proprio progetto

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig.js';

let _supabase = null;
let _currentRole = null;    // 'admin' | 'client' | null
let _currentProfile = null; // oggetto profilo completo

// ── Inizializza client Supabase (riusa quello di supabaseService se disponibile) ──
function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof window.supabase !== 'undefined') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ── Recupera il profilo dell'utente corrente ──
export async function fetchUserProfile(userId) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    _currentProfile = data;
    _currentRole = data?.role || 'admin';
    return data;
  } catch {
    return null;
  }
}

// ── Getters ──
export function getCurrentRole() { return _currentRole; }
export function getCurrentProfile() { return _currentProfile; }
export function isAdmin() { return !_currentRole || _currentRole === 'admin'; }
export function isClient() { return _currentRole === 'client'; }
export function resetRole() { _currentRole = null; _currentProfile = null; }

// ── Applica modalità CLIENT al DOM ──
// Aggiunge la classe `client-mode` al body (CSS si occupa di nascondere gli elementi)
export function applyClientMode(profile) {
  document.body.classList.add('client-mode');

  // Badge "Vista Cliente" nella sidebar
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (sidebarHeader && !document.getElementById('client-mode-badge')) {
    const badge = document.createElement('div');
    badge.id = 'client-mode-badge';
    badge.innerHTML = `
      <div style="
        margin-top: 10px;
        background: rgba(0,122,255,0.12);
        border: 1px solid rgba(0,122,255,0.3);
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 11px;
        color: var(--blue, #007AFF);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        👁 Vista Cliente — sola lettura
      </div>`;
    sidebarHeader.appendChild(badge);
  }

  // Seleziona automaticamente il progetto del cliente
  if (profile?.linked_project_id) {
    setTimeout(() => {
      window.selectProgetto?.(profile.linked_project_id);
    }, 500);
  }
}

// ── Rimuove modalità CLIENT ──
export function removeClientMode() {
  document.body.classList.remove('client-mode');
  document.getElementById('client-mode-badge')?.remove();
}

// ── Crea un profilo client nel DB ──
// Chiamato dall'admin quando invita un nuovo cliente
export async function createClientProfile(userId, adminId, linkedProjectId, displayName = '') {
  try {
    const sb = getSupabase();
    if (!sb) return { success: false, error: 'Supabase non disponibile' };
    const { data, error } = await sb
      .from('profiles')
      .upsert([{
        user_id: userId,
        role: 'client',
        admin_id: adminId,
        linked_project_id: linkedProjectId,
        display_name: displayName,
      }])
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Recupera tutti i clienti di un admin ──
export async function getClientiByAdmin(adminId) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('profiles')
      .select('*, progetti(nome)')
      .eq('admin_id', adminId)
      .eq('role', 'client');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export const roleService = {
  fetchUserProfile,
  getCurrentRole,
  getCurrentProfile,
  isAdmin,
  isClient,
  resetRole,
  applyClientMode,
  removeClientMode,
  createClientProfile,
  getClientiByAdmin,
};
