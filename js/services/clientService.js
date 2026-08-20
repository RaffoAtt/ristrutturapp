// ===== CLIENT SERVICE =====
// Gestisce le funzionalità collaborative tra admin e cliente:
// - Approvazione lavori
// - Note del cliente
// - Documenti condivisi

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig.js';

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof window.supabase !== 'undefined') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ── APPROVAZIONE LAVORI ──────────────────────────────────────

// Admin: imposta un lavoro come "in attesa di approvazione"
export async function richiediApprovazione(lavoroId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('lavori')
      .update({ stato: 'attesa_approvazione' })
      .eq('id', lavoroId)
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Cliente: approva un lavoro
export async function approvaLavoro(lavoroId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('lavori')
      .update({ stato: 'approvato_cliente' })
      .eq('id', lavoroId)
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Cliente: richiede modifiche su un lavoro
export async function richiediModificaLavoro(lavoroId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('lavori')
      .update({ stato: 'modifica_richiesta' })
      .eq('id', lavoroId)
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── NOTE DEL CLIENTE ─────────────────────────────────────────

export async function getNoteCliente(lavoroId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('note_cliente')
      .select('*')
      .eq('lavoro_id', lavoroId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function addNotaCliente(lavoroId, testo) {
  try {
    const sb = getSupabase();
    if (!window.supabase) throw new Error('Supabase non disponibile');
    // Recupera l'utente corrente
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Non autenticato');
    const { data, error } = await sb
      .from('note_cliente')
      .insert([{ lavoro_id: lavoroId, user_id: user.id, testo }])
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function deleteNotaCliente(notaId) {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('note_cliente')
      .delete()
      .eq('id', notaId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── DOCUMENTI CONDIVISI ──────────────────────────────────────

export async function getDocumenti(progettoId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('documenti')
      .select('*')
      .eq('progetto_id', progettoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function uploadDocumento(progettoId, file, tipo = 'altro', visibileCliente = true) {
  try {
    const sb = getSupabase();
    // Upload del file in Supabase Storage
    const fileName = `${progettoId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await sb.storage
      .from('documenti')
      .upload(fileName, file, { upsert: false });
    if (uploadError) throw uploadError;

    // Salva i metadati nel DB
    const { data, error } = await sb
      .from('documenti')
      .insert([{
        progetto_id: progettoId,
        nome: file.name,
        tipo,
        storage_path: uploadData.path,
        visibile_cliente: visibileCliente,
      }])
      .select();
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getDocumentoUrl(storagePath) {
  try {
    const sb = getSupabase();
    const { data } = sb.storage.from('documenti').getPublicUrl(storagePath);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function deleteDocumento(id, storagePath) {
  try {
    const sb = getSupabase();
    // Elimina il file dallo storage
    await sb.storage.from('documenti').remove([storagePath]);
    // Elimina il record dal DB
    const { error } = await sb.from('documenti').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export const clientService = {
  // Approvazioni
  richiediApprovazione,
  approvaLavoro,
  richiediModificaLavoro,
  // Note
  getNoteCliente,
  addNotaCliente,
  deleteNotaCliente,
  // Documenti
  getDocumenti,
  uploadDocumento,
  getDocumentoUrl,
  deleteDocumento,
};
