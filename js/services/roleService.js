// ===== ROLE SERVICE =====
// Gestisce i ruoli admin/client e il sistema di inviti

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig.js';

let _supabase = null;
let _currentRole = null;
let _currentProfile = null;

function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof window.supabase !== 'undefined') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ── Recupera il profilo dell'utente ──────────────────────────────────────────
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

// ── Getters ───────────────────────────────────────────────────────────────────
export function getCurrentRole() { return _currentRole; }
export function getCurrentProfile() { return _currentProfile; }
export function isAdmin() { return !_currentRole || _currentRole === 'admin'; }
export function isClient() { return _currentRole === 'client'; }
export function resetRole() { _currentRole = null; _currentProfile = null; }

// ── CSS client-mode ───────────────────────────────────────────────────────────
function injectClientModeStyles() {
  if (document.getElementById('client-mode-css')) return;
  const style = document.createElement('style');
  style.id = 'client-mode-css';
  style.textContent = `
    #fab-add { display: none !important; }
    .sidebar-new-btn { display: none !important; }
    .spesa-card-actions { display: none !important; }
    .forn-actions .action-btn { display: none !important; }
    .action-btn { display: none !important; }
    #det-lav-edit-btn { display: none !important; }
    .danger-zone-card { display: none !important; }
    #section-impostazioni .btn-primary { display: none !important; }
    #section-computo .card-import { display: none !important; }
    #nav-fornitori-sidebar { display: none !important; }
    #nav-computo-sidebar { display: none !important; }
  `;
  document.head.appendChild(style);
}

export function applyClientMode(profile) {
  injectClientModeStyles();

  // Barra sola lettura
  const mainContent = document.querySelector('.main-content');
  if (mainContent && !document.getElementById('client-readonly-bar')) {
    const bar = document.createElement('div');
    bar.id = 'client-readonly-bar';
    bar.style.cssText = 'background:rgba(0,122,255,.08);border-bottom:1px solid rgba(0,122,255,.15);padding:8px 16px;font-size:12px;color:#007AFF;font-weight:600;text-align:center;';
    bar.textContent = '👁 Vista Cliente — sola lettura';
    mainContent.insertBefore(bar, mainContent.firstChild);
  }

  // Badge sidebar
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (sidebarHeader && !document.getElementById('client-mode-badge')) {
    const badge = document.createElement('div');
    badge.id = 'client-mode-badge';
    badge.style.cssText = 'margin-top:8px;background:rgba(0,122,255,.1);border:1px solid rgba(0,122,255,.25);border-radius:8px;padding:6px 10px;font-size:11px;color:#007AFF;font-weight:600;';
    badge.textContent = 'Vista Cliente';
    sidebarHeader.appendChild(badge);
  }

  // Auto-seleziona il progetto collegato
  if (profile?.linked_project_id) {
    setTimeout(() => {
      window.selectProgetto?.(profile.linked_project_id);
    }, 300);
  }
}

export function removeClientMode() {
  document.getElementById('client-mode-css')?.remove();
  document.getElementById('client-mode-badge')?.remove();
  document.getElementById('client-readonly-bar')?.remove();
}

// ── GESTIONE INVITI ───────────────────────────────────────────────────────────

// Crea un nuovo invito per un progetto
export async function createInvitation(projectId, displayName) {
  try {
    const sb = getSupabase();
    if (!sb) return { success: false, error: 'Supabase non disponibile' };
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { success: false, error: 'Non autenticato' };

    const { data, error } = await sb
      .from('invitations')
      .insert([{
        admin_id: user.id,
        project_id: projectId,
        display_name: displayName || ''
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, token: data.token, id: data.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Lista tutti gli inviti dell'admin
export async function getInvitations() {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('invitations')
      .select('*, progetti(nome)')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// Elimina un invito
export async function deleteInvitation(id) {
  try {
    const sb = getSupabase();
    if (!sb) return { success: false };
    const { error } = await sb.from('invitations').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Valida un token di invito (senza consumarlo)
export async function validateInvitation(token) {
  try {
    const sb = getSupabase();
    if (!sb) { console.error('validateInvitation: Supabase non disponibile'); return null; }
    // Query semplice senza join per evitare errori PostgREST
    const { data, error } = await sb
      .from('invitations')
      .select('id, token, admin_id, project_id, display_name, expires_at, used_at')
      .eq('token', token)
      .is('used_at', null)
      .single();
    if (error) { console.error('validateInvitation error:', error.message, error.details); return null; }
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) { console.warn('Invito scaduto'); return null; }
    // Recupera nome progetto separatamente (opzionale)
    try {
      const { data: proj } = await sb.from('progetti').select('nome').eq('id', data.project_id).single();
      if (proj) data.progetti = proj;
    } catch {}
    return data;
  } catch (e) {
    console.error('validateInvitation exception:', e);
    return null;
  }
}

// Processa l'invito dopo la registrazione del cliente
export async function processInvitation(token, userId) {
  try {
    const sb = getSupabase();
    if (!sb) return { success: false, error: 'Supabase non disponibile' };

    const { data, error } = await sb.rpc('process_invitation', {
      p_token: token,
      p_user_id: userId
    });

    if (error) throw error;
    if (!data.success) return { success: false, error: data.error };
    return { success: true, projectId: data.project_id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Recupera lista clienti dell'admin ─────────────────────────────────────────
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

// ── Crea profilo client direttamente (da SQL admin) ───────────────────────────
export async function createClientProfile(userId, adminId, linkedProjectId, displayName) {
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
        display_name: displayName || ''
      }])
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
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
  createInvitation,
  getInvitations,
  deleteInvitation,
  validateInvitation,
  processInvitation,
  getClientiByAdmin,
  createClientProfile,
};
